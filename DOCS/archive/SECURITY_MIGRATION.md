# 🔐 SECURITY MIGRATION: OpenAI Key Leak Fix

## CRITICAL VULNERABILITY IDENTIFIED

**File:** `src/pages/staff/StaffAgenticUI.jsx`  
**Line:** 69  
**Severity:** CRITICAL  
**Risk:** API Key Exposed to Client

### Vulnerable Code
```javascript
// ❌ VULNERABLE: API key exposed in client-side code
const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_KEY || ''}`  // 🔴 EXPOSED!
    },
    // ...
});
```

### Attack Vectors
1. **Browser DevTools:** Anyone can inspect Network tab and see the API key
2. **Build Inspection:** `VITE_OPENAI_KEY` is embedded in the built JavaScript bundle
3. **Git Leaks:** Environment files may be accidentally committed
4. **Rate Limit Theft:** Attackers can steal and abuse your API quota

---

## SECURE MIGRATION

### Step 1: Deploy Secure Edge Function

**File:** `supabase/functions/staff-agent/index.ts`

```bash
# Deploy the secure edge function
supabase functions deploy staff-agent

# Set your API keys as secrets (server-side only)
supabase secrets set GROQ_API_KEY=your-groq-key
supabase secrets set GEMINI_API_KEY=your-gemini-key
supabase secrets set OPENAI_API_KEY=your-openai-key  # Optional fallback
```

### Step 2: Update Frontend Component

**File:** `src/pages/staff/StaffAgenticUI.jsx` (lines 65-79)

Replace the vulnerable direct API call with secure edge function invocation:

```javascript
// ❌ REMOVE THIS VULNERABLE CODE (lines 65-79):
const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_KEY || ''}`
    },
    body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `${context}\n\nUSER QUESTION: ${userMessage}` }
        ],
        max_tokens: 150
    })
});

// ✅ USE THIS SECURE CODE INSTEAD:
const { data, error } = await supabase.functions.invoke('staff-agent', {
    body: {
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userMessage }
        ],
        businessId,
        orders,
        businessName: tenantData?.business_name
    }
});

if (error) throw error;
const reply = data?.reply || (lang === 'en' ? 'Unable to process' : 'No puedo procesar');
```

### Step 3: Remove Environment Variable

```bash
# Remove from .env files (all environments)
# VITE_OPENAI_KEY=sk-...  ❌ DELETE THIS LINE

# If using GitHub Actions or CI/CD, remove from secrets:
# Settings -> Secrets -> Remove VITE_OPENAI_KEY
```

### Step 4: Rotate Compromised Key

```bash
# 1. Generate new API key at https://platform.openai.com/api-keys
# 2. Update Supabase secret:
supabase secrets set OPENAI_API_KEY=sk-new-key

# 3. Revoke old key immediately at OpenAI dashboard
# 4. Monitor for any unauthorized usage in OpenAI dashboard
```

---

## SECURITY IMPROVEMENTS IN SECURE VERSION

| Aspect | Vulnerable | Secure |
|--------|-----------|--------|
| **API Key Location** | Client bundle | Server-side (Deno) |
| **Extraction Risk** | Trivial (DevTools) | Impossible |
| **Model Routing** | Fixed (OpenAI) | Multi-provider fallback |
| **LTM Integration** | None | Built-in |
| **Rate Limit Control** | Per-client | Global server-side |
| **Cost Tracking** | None | Per-request logging |

---

## VERIFICATION

### Test Secure Endpoint
```bash
curl -X POST https://your-project.supabase.co/functions/v1/staff-agent \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "How many active orders?"}],
    "businessId": "test-business",
    "orders": [],
    "businessName": "Test Restaurant"
  }'
```

### Verify No Key in Build
```bash
# Build the project
npm run build

# Search for key in dist (should return nothing)
grep -r "sk-" dist/ || echo "✅ No API keys found in build"
```

---

## POST-MIGRATION CHECKLIST

- [ ] Edge function deployed successfully
- [ ] Frontend updated to use `supabase.functions.invoke()`
- [ ] `VITE_OPENAI_KEY` removed from all .env files
- [ ] Old OpenAI key revoked
- [ ] New key stored only in Supabase secrets
- [ ] Build verified to contain no API keys
- [ ] StaffAgenticUI tested and working
- [ ] Security audit completed

---

**Status:** 🔒 SECURE MIGRATION READY  
**Deploy Priority:** CRITICAL - Immediate action required
