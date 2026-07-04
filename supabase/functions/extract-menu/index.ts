/**
 * extract-menu: AI Menu Import — PDF → text → Groq → structured JSON proposal.
 *
 * ROUTING:
 *   - PDF → extract text with unpdf (serverless-native, no worker) → Groq (Llama 3.3 70B)
 *   - Image fallback (Gemini vision) is deferred to v2 — most owners have a PDF.
 *
 * CONTRACT:
 *   This function only PROPOSES items. It never writes to menu_items.
 *   The client reviews the payload in a modal, then commits rows using the
 *   same RLS-protected insert path as the manual "nueva receta" form.
 *
 * GUARDRAILS:
 *   - Rate limit: 3 imports / business / 24h (reads menu_import_jobs)
 *   - Dedup: sha256 file hash — a re-uploaded identical file skips Groq entirely
 *   - Prices returned in MAJOR units (what's printed on the menu); the client
 *     multiplies by 100 at commit time, matching handleAddRecipe. The prompt
 *     explicitly handles Argentine "$1.500 = 1500" dot-as-thousands notation.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.11.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RATE_LIMIT_PER_24H = 3;
const MAX_FILE_BYTES = 6 * 1024 * 1024; // 6MB — Supabase edge body cap headroom
const MIN_TEXT_CHARS = 40;              // below this, the PDF is likely scanned/image-only

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// ─── SHA-256 of the raw file bytes (dedup key) ───────────────────────────
async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─── PDF → plain text (unpdf: zero native deps, built for serverless) ─────
async function pdfToText(bytes: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  return (typeof text === "string" ? text : text.join("\n")).trim();
}

// ─── Groq: menu text → structured JSON proposal ──────────────────────────
const SYSTEM_PROMPT = `You extract structured menu data from the raw text of a restaurant menu PDF.

Output ONLY valid JSON (no prose, no markdown fences) matching exactly:
{
  "items": [
    { "name": string, "description": string|null, "price": number, "category": string, "confidence": "high"|"medium"|"low" }
  ],
  "categories": [ { "name": string, "count": number } ],
  "detected_language": string,
  "currency_hint": string,
  "warnings": string[]
}

RULES:
- "price" is the number PRINTED on the menu, in MAJOR currency units (e.g. a $12.50 item → 12.5; a $1.500 ARS item → 1500). Do NOT convert to cents.
- ARGENTINE / LATAM PRICE FORMAT: if prices look like "$1.500" or "$2.990" (dot with exactly 3 trailing digits), the dot is a THOUSANDS separator — "$1.500" means 1500, not 1.5. A comma is the decimal separator ("$1.250,50" → 1250.5). Never confuse these — this is the #1 source of silent 1000x errors.
- Infer a category for every item even if the menu has no section headers (group burgers together, drinks together, etc.). Use the menu's own section names when present, in the menu's original language.
- Return item names and descriptions in the menu's ORIGINAL language — do not translate.
- Mark "confidence":"low" for any item where the price or name is ambiguous, garbled, or looks like OCR noise. Do not silently guess.
- Omit items that have no discernible price.
- "categories" must list each distinct category with its item count. Counts must sum to items.length.
- If the text contains no recognizable menu, return items:[] with a warning explaining why.`;

async function callGroq(
  menuText: string,
  apiKey: string,
): Promise<{ payload: any; tokens: number } | { error: string; detail?: string }> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Menu PDF text:\n\n${menuText}` },
      ],
      temperature: 0.2,          // low — extraction, not creativity
      max_tokens: 4000,
      response_format: { type: "json_object" }, // force valid JSON
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    return { error: res.status === 429 ? "RATE_LIMIT" : "API_ERROR", detail };
  }

  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content ?? "";
  const tokens = data?.usage?.total_tokens ?? 0;

  try {
    return { payload: JSON.parse(raw), tokens };
  } catch {
    return { error: "PARSE_ERROR", detail: raw.slice(0, 500) };
  }
}

// ─── Shape validation on the Groq payload before we trust it ─────────────
function validatePayload(p: any): { ok: true; value: any } | { ok: false; reason: string } {
  if (!p || typeof p !== "object") return { ok: false, reason: "not an object" };
  if (!Array.isArray(p.items)) return { ok: false, reason: "items is not an array" };

  const items = p.items
    .filter((it: any) => it && typeof it.name === "string" && typeof it.price === "number" && it.price > 0)
    .map((it: any, i: number) => ({
      temp_id: String(i + 1),
      name: String(it.name).trim().slice(0, 200),
      description: it.description ? String(it.description).trim().slice(0, 500) : null,
      price: it.price,                              // major units — client multiplies ×100
      category: (it.category ? String(it.category) : "General").trim().slice(0, 100),
      confidence: ["high", "medium", "low"].includes(it.confidence) ? it.confidence : "medium",
    }));

  // Rebuild category counts from the validated items so counts always match.
  const counts = new Map<string, number>();
  for (const it of items) counts.set(it.category, (counts.get(it.category) ?? 0) + 1);
  const categories = [...counts.entries()].map(([name, count]) => ({ name, count }));

  return {
    ok: true,
    value: {
      items,
      categories,
      detected_language: typeof p.detected_language === "string" ? p.detected_language : "es",
      currency_hint: typeof p.currency_hint === "string" ? p.currency_hint : "ARS",
      warnings: Array.isArray(p.warnings) ? p.warnings.map(String).slice(0, 10) : [],
    },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

  if (!GROQ_API_KEY) {
    return json({ error: "MISSING_SECRET", detail: "Configure GROQ_API_KEY." }, 500);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "BAD_REQUEST", detail: "Invalid JSON body." }, 400);
  }

  const { business_id, file_base64, source_type = "pdf" } = body ?? {};
  if (!business_id || !file_base64) {
    return json({ error: "BAD_REQUEST", detail: "business_id and file_base64 are required." }, 400);
  }
  if (source_type !== "pdf") {
    return json({ error: "UNSUPPORTED", detail: "Only PDF is supported in v1." }, 400);
  }

  // Decode base64 → bytes
  let bytes: Uint8Array;
  try {
    const b64 = String(file_base64).includes(",") ? String(file_base64).split(",")[1] : String(file_base64);
    const bin = atob(b64);
    bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  } catch {
    return json({ error: "BAD_REQUEST", detail: "file_base64 is not valid base64." }, 400);
  }
  if (bytes.byteLength > MAX_FILE_BYTES) {
    return json({ error: "FILE_TOO_LARGE", detail: "Max 6MB." }, 413);
  }

  // ── Rate limit: 3 imports / business / 24h ──────────────────────────
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: recentCount } = await supabase
    .from("menu_import_jobs")
    .select("id", { count: "exact", head: true })
    .eq("business_id", business_id)
    .gte("created_at", since);

  if ((recentCount ?? 0) >= RATE_LIMIT_PER_24H) {
    return json({ error: "RATE_LIMIT", detail: "Daily import limit reached. Try again tomorrow." }, 429);
  }

  // ── Dedup: identical file already committed? Serve cached payload ────
  const fileHash = await sha256(bytes);
  const { data: cached } = await supabase
    .from("menu_import_jobs")
    .select("id, extracted_payload")
    .eq("business_id", business_id)
    .eq("file_hash", fileHash)
    .eq("status", "committed")
    .not("extracted_payload", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cached?.extracted_payload) {
    return json({ job_id: cached.id, cached: true, ...cached.extracted_payload });
  }

  // ── Open a job row ──────────────────────────────────────────────────
  const { data: job, error: jobErr } = await supabase
    .from("menu_import_jobs")
    .insert({ business_id, file_hash: fileHash, source_type: "pdf", status: "processing" })
    .select("id")
    .single();

  if (jobErr || !job) {
    return json({ error: "DB_ERROR", detail: jobErr?.message ?? "Could not create job." }, 500);
  }

  const fail = async (message: string, code: string, http = 422) => {
    await supabase
      .from("menu_import_jobs")
      .update({ status: "failed", error_message: message, completed_at: new Date().toISOString() })
      .eq("id", job.id);
    return json({ job_id: job.id, error: code, detail: message }, http);
  };

  // ── Extract text ────────────────────────────────────────────────────
  let menuText = "";
  try {
    menuText = await pdfToText(bytes);
  } catch (e) {
    return fail(`PDF text extraction failed: ${e instanceof Error ? e.message : String(e)}`, "PDF_PARSE_ERROR");
  }

  if (menuText.length < MIN_TEXT_CHARS) {
    // Likely a scanned/image-only PDF — vision fallback is a v2 feature.
    return fail(
      "This looks like a scanned/image PDF with no selectable text. Try a text-based PDF, or add items manually.",
      "NO_TEXT_LAYER",
    );
  }

  // Cap the text we send to Groq (very long menus) to bound cost/latency.
  const trimmed = menuText.slice(0, 24000);

  // ── Groq extraction (retry once on parse failure) ───────────────────
  let result = await callGroq(trimmed, GROQ_API_KEY);
  if ("error" in result && result.error === "PARSE_ERROR") {
    result = await callGroq(trimmed, GROQ_API_KEY);
  }
  if ("error" in result) {
    const http = result.error === "RATE_LIMIT" ? 429 : 502;
    return fail(`Groq ${result.error}: ${result.detail ?? ""}`.trim(), result.error, http);
  }

  const validated = validatePayload(result.payload);
  if (!validated.ok) {
    return fail(`Extraction returned an unexpected shape: ${validated.reason}`, "INVALID_SHAPE");
  }
  if (validated.value.items.length === 0) {
    await supabase
      .from("menu_import_jobs")
      .update({
        status: "ready_for_review",
        extracted_payload: validated.value,
        model_tokens_used: result.tokens,
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);
    return json({
      job_id: job.id,
      ...validated.value,
      warnings: [...validated.value.warnings, "No menu items were found in this PDF."],
    });
  }

  // ── Store the proposal, mark ready for review ───────────────────────
  await supabase
    .from("menu_import_jobs")
    .update({
      status: "ready_for_review",
      extracted_payload: validated.value,
      model_tokens_used: result.tokens,
      completed_at: new Date().toISOString(),
    })
    .eq("id", job.id);

  return json({ job_id: job.id, cached: false, ...validated.value });
});
