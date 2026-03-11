import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient.js'
import { formatPrice } from '../../config/menuData.js'
import { useTenant } from '../../contexts/TenantContext.jsx'
import { logout } from '../../utils/auth.js'
import BackendHeader from '../../components/BackendHeader.jsx'
import BackendNav from '../../components/BackendNav.jsx'

// ─── Creative Director OS: Composite Canvas Image ───
const LazyImage = ({ src, alt, style, className }) => {
    const [status, setStatus] = useState('loading') // 'loading', 'loaded', 'error'
    const [activeSrc, setActiveSrc] = useState(null)
    const [compositeDataUrl, setCompositeDataUrl] = useState(null)
    const [downloading, setDownloading] = useState(false)
    const canvasRef = useRef(null)

    // Parse Open Claw v4 payload from PROXY:// URI (Pipe Format)
    const parsedPayload = useMemo(() => {
        if (!src || !src.startsWith('PROXY://')) return null;
        try {
            const rawStr = src.replace('PROXY://', '');

            // PIPE PROTOCOL: prompt|headline|price|footer
            if (rawStr.includes('|')) {
                const parts = rawStr.split('|');
                return {
                    image_prompt: parts[0] ? decodeURIComponent(parts[0]).trim() : '',
                    headline: parts[1] ? decodeURIComponent(parts[1]).trim().replace(/_/g, ' ') : '',
                    price_tag: parts[2] ? decodeURIComponent(parts[2]).trim() : '',
                    footer_text: parts[3] ? decodeURIComponent(parts[3]).trim() : ''
                }
            }

            // Fallback for older plaintext PROXY:// links
            return { image_prompt: decodeURIComponent(rawStr).trim() };
        } catch (e) {
            console.error("[LazyImage] Failed to parse PROXY payload:", e);
            return { image_prompt: src.replace('PROXY://', '') };
        }
    }, [src])

    useEffect(() => {
        if (!src) return;
        setStatus('loading')

        if (src.startsWith('PROXY://')) {
            if (!parsedPayload) { setStatus('error'); return; }

            supabase.functions.invoke('foodspot-image', {
                body: { prompt: parsedPayload.image_prompt }
            }).then(({ data, error }) => {
                if (error || !data?.image) {
                    console.error('[LazyImage] HF Proxy Error, falling back:', error)
                    const keywords = parsedPayload.image_prompt.replace(/_/g, ',').replace(/\s+/g, ',').split('?')[0]
                    setActiveSrc(`https://loremflickr.com/800/1400/${keywords}`)
                } else {
                    setActiveSrc(data.image) // Base64 from HF
                }
            }).catch(err => {
                console.error('[LazyImage] Invoke Error:', err)
                // Fallback to Pollinations or LoremFlickr
                const keywords = parsedPayload.image_prompt.replace(/ /g, '_')
                setActiveSrc(`https://image.pollinations.ai/prompt/${keywords}?width=800&height=1400&nologo=true`)
            })
        } else {
            setActiveSrc(src)
        }
    }, [src, parsedPayload])

    // ─── Composite Stencil Render ───
    useEffect(() => {
        if (!activeSrc) return;
        setStatus('loading');

        const img = new window.Image();
        img.crossOrigin = "Anonymous"; // Required for canvas export
        img.src = activeSrc;

        img.onload = () => {
            // If not a PROXY:// request with text overlays, just display raw
            if (!parsedPayload?.headline && !parsedPayload?.price_tag) {
                setCompositeDataUrl(activeSrc);
                setStatus('loaded');
                return;
            }

            // Draw to Canvas
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');

            canvas.width = 800;
            canvas.height = 1200; // IG Story aspect ratio

            // 1. Draw Background
            // Maintain aspect ratio cover
            const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
            const x = (canvas.width / 2) - (img.width / 2) * scale;
            const y = (canvas.height / 2) - (img.height / 2) * scale;
            ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

            // 2. Cinematic Spotlight Vignette (BAM OS v18.0)
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const radius = Math.max(canvas.width, canvas.height) / 1.5;
            const vignette = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
            vignette.addColorStop(0, 'transparent');
            vignette.addColorStop(1, 'rgba(0,0,0,0.4)');
            ctx.fillStyle = vignette;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Keep Dual Gradients for Edge Legibility
            // Top Gradient
            const gradTop = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.50);
            gradTop.addColorStop(0, 'rgba(0,0,0,0.85)');
            gradTop.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = gradTop;
            ctx.fillRect(0, 0, canvas.width, canvas.height * 0.50);

            // Bottom Gradient
            const gradBottom = ctx.createLinearGradient(0, canvas.height * 0.50, 0, canvas.height);
            gradBottom.addColorStop(0, 'rgba(0,0,0,0)');
            gradBottom.addColorStop(1, 'rgba(0,0,0,0.85)');
            ctx.fillStyle = gradBottom;
            ctx.fillRect(0, canvas.height * 0.50, canvas.width, canvas.height * 0.50);

            // 3. Cinematic Typography (BAM OS v18.0)
            ctx.textAlign = 'center';
            ctx.fillStyle = '#FFFFFF';

            // Headline (Luxury Kerning)
            if (parsedPayload.headline) {
                ctx.font = '900 60px Inter, sans-serif';
                ctx.shadowColor = 'rgba(0,0,0,0.7)';
                ctx.shadowBlur = 15;
                const text = parsedPayload.headline.toUpperCase();
                const letterSpacing = 14;

                let totalWidth = 0;
                for (let i = 0; i < text.length; i++) {
                    totalWidth += ctx.measureText(text[i]).width;
                    if (i < text.length - 1) totalWidth += letterSpacing;
                }

                let startX = (canvas.width / 2) - (totalWidth / 2);
                for (let i = 0; i < text.length; i++) {
                    const charWidth = ctx.measureText(text[i]).width;
                    ctx.fillText(text[i], startX + (charWidth / 2), 220);
                    startX += charWidth + letterSpacing;
                }
            }

            // Price Tag (Heavy-Weight Layered Shadow)
            if (parsedPayload.price_tag) {
                ctx.font = '900 150px Inter, sans-serif';
                ctx.fillStyle = '#FFFFFF';

                // Shadow Layer 1 (Wide glow)
                ctx.shadowColor = 'rgba(0,0,0,0.6)';
                ctx.shadowBlur = 45;
                ctx.fillText(parsedPayload.price_tag, canvas.width / 2, canvas.height - 180);

                // Shadow Layer 2 (Sharp core drop)
                ctx.shadowColor = 'rgba(0,0,0,0.9)';
                ctx.shadowBlur = 5;
                ctx.fillText(parsedPayload.price_tag, canvas.width / 2, canvas.height - 180);
            }

            // Footer Text (Validity/Payment)
            if (parsedPayload.footer_text) {
                ctx.font = '700 36px sans-serif';
                ctx.fillStyle = 'rgba(255,255,255,0.8)';
                ctx.shadowColor = 'rgba(0,0,0,0.6)';
                ctx.shadowBlur = 6;
                ctx.fillText(parsedPayload.footer_text, canvas.width / 2, canvas.height - 50);
            }

            // Flatten
            const dataUrl = canvas.toDataURL("image/png");
            setCompositeDataUrl(dataUrl);
            setStatus('loaded');
        };

        img.onerror = () => {
            console.error("Image failed to load for canvas");
            setStatus('error');
        };
    }, [activeSrc, parsedPayload]);

    const handleDownload = async () => {
        if (!compositeDataUrl) return;
        setDownloading(true);
        try {
            const response = await fetch(compositeDataUrl);
            const blob = await response.blob();
            const file = new File([blob], `Promo_${Date.now()}.png`, { type: 'image/png' });

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'FoodSpot Promo'
                });
            } else {
                const link = document.createElement('a');
                link.download = `Promo_${Date.now()}.png`;
                link.href = compositeDataUrl;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (error) {
            console.error("Error sharing:", error);
        } finally {
            setTimeout(() => setDownloading(false), 500);
        }
    };

    return (
        <div className={className} style={{ position: 'relative', width: '100%', minHeight: '150px', background: '#F3F4F6', ...style, border: 'none', borderRadius: 12, overflow: 'hidden' }}>
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {status === 'loading' && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 12, color: '#9CA3AF'
                }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin" style={{ animation: 'spin 1s linear infinite' }}>
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    <span style={{ fontSize: 12, fontWeight: 500, textAlign: 'center' }}>
                        Diseñando flyer visual...<br />(Puede tardar unos segundos)
                    </span>
                    <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
                </div>
            )}

            {status === 'error' && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 8, color: '#EF4444', textAlign: 'center', padding: 16
                }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                        <path d="M12 9v4" /><path d="M12 17h.01" />
                    </svg>
                    <span style={{ fontSize: 12, fontWeight: 500 }}>
                        El servidor de imágenes está ocupado.
                    </span>
                </div>
            )}

            {status === 'loaded' && compositeDataUrl && (
                <div style={{ position: 'relative' }}>
                    <img
                        src={compositeDataUrl}
                        alt={alt}
                        style={{ width: '100%', display: 'block', objectFit: 'cover' }}
                    />

                    {/* Native Download Overlay */}
                    <button
                        onClick={handleDownload}
                        disabled={downloading}
                        style={{
                            position: 'absolute', top: 12, right: 12,
                            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                            border: 'none', borderRadius: '50%', width: 40, height: 40,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: 'white', transition: 'all 0.2s',
                            opacity: downloading ? 0.5 : 1
                        }}
                    >
                        {downloading ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                        )}
                    </button>
                </div>
            )}
        </div>
    )
}

// ============================================
// 🧠 FOODSPOT AI — STRIKE 3
// Gemini-powered business partner chatbox
// ============================================

// Quick-action suggestion chips
const SUGGESTIONS = [
    { label: '📊 ¿Cómo va el mes?', prompt: '¿Cómo van las ventas este mes? Dámelo resumido.' },
    { label: '🎯 Idea de promo', prompt: 'Sugerime una idea de promoción para esta semana basada en mis productos más vendidos.' },
    { label: '📈 Top productos', prompt: '¿Cuáles son mis 5 productos más vendidos y cuánto facturaron?' },
    { label: '🎨 Crear flyer', prompt: 'Generame el texto para un flyer de evento para este fin de semana.' },
]

export default function FoodSpotAI() {
    const navigate = useNavigate()
    const { tenantSlug } = useParams()
    const { businessId, tenantData } = useTenant()

    // BLUE OVERRIDE: Lock AI UI to Admin Blue instead of tenant branding
    const adminBlue = '#2563EB'
    const businessName = tenantData?.business_name || 'Mi Negocio'

    // Chat state
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [salesSummary, setSalesSummary] = useState(null)
    const [summaryLoading, setSummaryLoading] = useState(true)
    const chatEndRef = useRef(null)
    const inputRef = useRef(null)

    // Scroll to bottom on new messages
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // Fetch sales summary for AI context
    useEffect(() => {
        if (!businessId) return
        let cancelled = false

        const fetchSalesSummary = async () => {
            setSummaryLoading(true)
            // Last 30 days
            const cutoff = new Date()
            cutoff.setDate(cutoff.getDate() - 30)

            const { data, error } = await supabase
                .from('orders')
                .select('id, total, items, status, payment_method, order_type, created_at')
                .eq('business_id', businessId)
                .gte('created_at', cutoff.toISOString())
                .order('created_at', { ascending: false })

            if (!cancelled && !error && data) {
                const completed = data.filter(o =>
                    ['delivered', 'ready', 'dispatched', 'released_to_kitchen', 'preparing'].includes(o.status)
                )
                const totalRevenue = completed.reduce((sum, o) => sum + (Number(o.total) || 0), 0)
                const avgTicket = completed.length > 0 ? totalRevenue / completed.length : 0

                // Top items
                const itemMap = {}
                completed.forEach(o => {
                    (o.items || []).forEach(item => {
                        const key = item.name || 'Desconocido'
                        if (!itemMap[key]) itemMap[key] = { name: key, qty: 0, revenue: 0 }
                        itemMap[key].qty += item.quantity || 1
                        itemMap[key].revenue += (item.price || 0) * (item.quantity || 1)
                    })
                })
                const topItems = Object.values(itemMap).sort((a, b) => b.qty - a.qty).slice(0, 5)

                // This week vs last week
                const weekAgo = new Date()
                weekAgo.setDate(weekAgo.getDate() - 7)
                const twoWeeksAgo = new Date()
                twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

                const thisWeek = completed.filter(o => new Date(o.created_at) >= weekAgo)
                const lastWeek = completed.filter(o => {
                    const d = new Date(o.created_at)
                    return d >= twoWeeksAgo && d < weekAgo
                })

                const thisWeekRevenue = thisWeek.reduce((s, o) => s + (Number(o.total) || 0), 0)
                const lastWeekRevenue = lastWeek.reduce((s, o) => s + (Number(o.total) || 0), 0)

                const deliveryCount = completed.filter(o => o.order_type === 'delivery').length
                const pickupCount = completed.filter(o => o.order_type === 'pickup').length

                setSalesSummary({
                    totalRevenue, orderCount: completed.length, avgTicket,
                    topItems, thisWeekRevenue, lastWeekRevenue,
                    thisWeekOrders: thisWeek.length, lastWeekOrders: lastWeek.length,
                    deliveryCount, pickupCount
                })
            }
            if (!cancelled) setSummaryLoading(false)
        }

        fetchSalesSummary()
        return () => { cancelled = true }
    }, [businessId])

    // Build system prompt with real data
    const systemPrompt = useMemo(() => {
        const menuCategories = tenantData?.menu_data?.categories?.map(c =>
            `${c.name}: ${c.items?.map(i => `${i.name} ($${i.price})`).join(', ') || 'sin items'}`
        ).join('\n') || 'Menú no disponible'

        const salesContext = salesSummary
            ? `
VENTAS (últimos 30 días):
- Ingresos totales: $${salesSummary.totalRevenue.toLocaleString()}
- Pedidos totales: ${salesSummary.orderCount}
- Ticket promedio: $${Math.round(salesSummary.avgTicket).toLocaleString()}
- Esta semana: $${salesSummary.thisWeekRevenue.toLocaleString()} (${salesSummary.thisWeekOrders} pedidos)
- Semana pasada: $${salesSummary.lastWeekRevenue.toLocaleString()} (${salesSummary.lastWeekOrders} pedidos)
- Delivery: ${salesSummary.deliveryCount} | Pickup: ${salesSummary.pickupCount}

TOP 5 PRODUCTOS:
${salesSummary.topItems.map((item, i) => `${i + 1}. ${item.name} — ${item.qty} vendidos — $${item.revenue.toLocaleString()}`).join('\n')}
`
            : 'Datos de ventas cargando...'

        return `Sos FoodSpot AI, el socio estratégico de "${businessName}".

REGLAS:
REGLAS:
1. THE POLYGLOT MIRROR: You are a linguistic mirror. Detect the user's input language. If input is [ENGLISH], response MUST be [ENGLISH]. If input is [SPANISH], response MUST be [SPANISH]. NEVER use Spanish labels (📊 Idea de promo) in an English conversation. Instantly adapt.
2. NO YAPPING: NEVER output URLs, technical terms, or code in the visible chat. The user sees ONLY natural language.
3. STRICT INTERVIEW: If the user asks for a "flyer", "promo", or "image", you MUST NOT generate it immediately.
   - You MUST ask the user for 3 things: Price, Validity Period, and Payment Terms.
   - DO NOT OUTPUT THE ||| JSON ||| BLOCK until the user provides all 3 variables. DO NOT hallucinate a price.
   - Example response: "¡Me encanta la idea! Para que salga perfecto, decime: ¿Qué precio le ponemos? ¿Hasta cuándo es válida? y pedimos efectivo o tarjetas?"
4. THE REVENUE ORACLE (AUTONOMOUS MANAGER):
   - AI oracle training is engaged. Use 'Sales Context' to calculate predictive trends.
   - If sales for a specific product are down, proactively suggest: "Che, veo que las ventas de [Product] bajaron. ¿Querés que armemos un flyer de 2x1 para levantar hoy?"
   - If the current day is historically slow (e.g. Monday/Tuesday), suggest a "Flash Promo" to drive traffic: "Hoy suele ser un día tranquilo. ¿Armamos una promo flash para mover el local?"
   - If a specific genre of food (e.g., sushi, burgers, pizza) is underperforming, match your flyer suggestion to that genre's visual style.
5. Once you have all 3 variables from the user, you MUST use the Open Claw v4 protocol below.

OPEN CLAW PROTOCOL v4 (MANDATORY FOR FLYERS/PROMOS AFTER INTERVIEW):
When creating a flyer or promo, output your friendly text FIRST, then on a new line output the JSON wrapped EXACTLY in triple pipes ||| like this:

EXAMPLE (copy this structure exactly):
¡Listo! Acá tenés tu flyer. ¡Va a quedar increíble!

||| { "action": "SYNC_CONFIG", "patch": { "promos.items": { "id": "gen-${Date.now()}", "title": "Double Smash", "subtitle": "Con cheddar y bacon", "image": "PROXY://double_smash_burger_moody_lighting|2x1 FINDE|$5999|Válido Viernes y Sábado - Efectivo", "color": "#FFFFFF", "textShadow": "0 4px 15px rgba(0,0,0,1)" } } } |||

RULES FOR THE IMAGE URL (CRITICAL):
- ALWAYS use the exact format: PROXY://[english_prompt]|[HEADLINE_IN_CAPS]|[price]|[validity_and_terms]
- You MUST use the "|" character to separate the 4 variables.
- "image_prompt": English keywords, max 8 words, underscores. NO logos or text in the prompt. We focus on high fidelity food photography.
- "HEADLINE_IN_CAPS": The promo title. Send with SPACES, not underscores (e.g. "DOUBLE SMASH", not "DOUBLE_SMASH").
- The image URL goes INSIDE the JSON "image" field, NEVER in the chat text.

VISION GUARD:
If the user uploads an image, analyze it and create a promo using Open Claw.

WHEN USER ASKS FOR IDEAS OR ANALYSIS (NOT A FLYER):
Respond naturally. Do NOT include ||| blocks unless creating a promo.

DATOS DEL NEGOCIO:
- Nombre: ${businessName}
- Color de marca: ${tenantData?.primary_color || '#C4856A'}
- Categoría: ${tenantData?.business_category || 'Gastronomía'}
- Delivery habilitado: ${tenantData?.delivery_enabled ? 'Sí' : 'No'}

MENÚ:
${menuCategories}

${salesContext}`
    }, [tenantData, salesSummary, businessName])

    // State for Image Attachments
    const [attachment, setAttachment] = useState(null)
    const fileInputRef = useRef(null)

    const handleFileChange = (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onloadend = () => {
            const base64Data = reader.result.split(',')[1]
            setAttachment({
                mimeType: file.type,
                data: base64Data,
                preview: URL.createObjectURL(file)
            })
        }
        reader.readAsDataURL(file)
    }

    // Open Claw Logic
    const { refreshTenantData } = useTenant()

    const executeOpenClaw = async (actionStr) => {
        try {
            const action = JSON.parse(actionStr)
            console.log('[OpenClaw] Executing:', action)

            if (action.action === 'SYNC_CONFIG' && action.patch) {
                showToast('🤖 AI Sincronizando Sistema...')

                let dbUpdates = { updated_at: new Date().toISOString() }

                // Handle complex deep merges (like promos.items)
                if (action.patch['promos.items']) {
                    const currentAppConfig = tenantData?.app_config || {}
                    const currentPromos = currentAppConfig.promos || { style: 'magazine', items: [] }

                    // DEFENSIVE: Ensure items is an iterable array
                    const currentItems = Array.isArray(currentPromos.items) ? currentPromos.items : []
                    const incoming = action.patch['promos.items']
                    const newItems = Array.isArray(incoming) ? incoming : [incoming]

                    dbUpdates.app_config = {
                        ...currentAppConfig,
                        promos: {
                            ...currentPromos,
                            items: [...currentItems, ...newItems]
                        }
                    }
                } else {
                    // Flat merges
                    Object.entries(action.patch).forEach(([k, v]) => {
                        dbUpdates[k] = v
                    })
                }

                const { error } = await supabase.from('branding').update(dbUpdates).eq('business_id', businessId)
                if (error) throw error

                await refreshTenantData()
                showToast('✅ Cambios aplicados')
                return "SUCCESS"
            }

            if (action.action === 'READ_DATA') {
                showToast('🔍 AI Analizando Datos...')
                if (action.query === 'event_leads') {
                    const { data, error } = await supabase.from('event_leads').select('*').eq('business_id', businessId).order('created_at', { ascending: false }).limit(20)
                    if (error) throw error
                    return JSON.stringify(data)
                } else if (action.query === 'orders') {
                    const { data, error } = await supabase.from('orders').select('id, total, status, created_at').eq('business_id', businessId).order('created_at', { ascending: false }).limit(50)
                    if (error) throw error
                    return JSON.stringify(data)
                }
            }
        } catch (err) {
            console.error('[OpenClaw] Parse Error:', err)
            showToast('❌ Error de sincronización AI')
            return "ERROR"
        }
    }

    // ─── Pollinations URL Sanitizer ───
    const sanitizePollinationsUrl = (rawUrl) => {
        if (!rawUrl) return rawUrl;
        if (rawUrl.startsWith('PROXY://')) return rawUrl; // DO NOT double-encode PROXY JSON payloads

        if (rawUrl.includes('pollinations.ai/prompt/')) {
            const [baseUrl, queryParams] = rawUrl.split('?')
            const promptPart = baseUrl.split('prompt/')[1] || ''

            // Strip everything except letters, numbers, spaces, and underscores
            const cleanPrompt = promptPart
                .replace(/[^a-zA-Z0-9 _]/g, '')
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 200)

            let sanitized = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}`
            if (queryParams) sanitized += `?${queryParams}`

            console.log('[Sanitizer] Clean URL:', sanitized)
            return sanitized
        }
        return encodeURI(rawUrl)
    }

    // Send message
    const handleSend = async (text, hiddenSystemFeedback = null) => {
        const userText = text || input.trim()
        if (!userText && !attachment && !hiddenSystemFeedback) return

        // Prevent double submit if already loading manually, 
        // but allow hidden system feedback (from READ_DATA loop) to proceed
        if (isLoading && !hiddenSystemFeedback) return

        let newMessages = [...messages]

        let msgPayload = { role: 'user', content: userText }
        /* VAULTED MULTIMODAL FEATURE
        if (attachment && !hiddenSystemFeedback) {
            msgPayload.image = { mimeType: attachment.mimeType, data: attachment.data }
            // UI only needs preview
            msgPayload.clientPreview = attachment.preview
        }
        */

        if (hiddenSystemFeedback) {
            newMessages = [...messages, { role: 'user', content: `[DATA RETURNED FROM READ_DATA QUERY]: ${hiddenSystemFeedback}` }]
        } else {
            newMessages = [...messages, msgPayload]
            setMessages(newMessages)
            setInput('')
            setAttachment(null)
            setIsLoading(true)
        }

        try {
            const { data, error } = await supabase.functions.invoke('foodspot-ai', {
                body: {
                    messages: newMessages.map(m => {
                        const out = { role: m.role, content: m.content }
                        if (m.image) out.image = m.image
                        return out
                    }),
                    systemPrompt
                }
            })

            if (error) {
                const isAuthError = error.message?.includes('401') || error.status === 401 || error.message?.toLowerCase().includes('jwt');

                setMessages([...newMessages, {
                    role: 'assistant',
                    content: isAuthError
                        ? '⚠️ Error de Conexión: Re-iniciá sesión o revisá los permisos de la función.'
                        : `ℹ️ Info: ${error.message}. Asegurate de que GEMINI_API_KEY esté configurada en Supabase secrets.`
                }])
            } else if (data?.error) {
                const isRateLimit = data.error === 'RATE_LIMIT';
                const isMissingSecret = data.error === 'MISSING_SECRET';

                setMessages([...newMessages, {
                    role: 'assistant',
                    content: isRateLimit
                        ? `⏳ Sobrecarga: ${data.detail}`
                        : isMissingSecret
                            ? `ℹ️ Info: ${data.detail}. Asegurate de que GEMINI_API_KEY esté configurada en Supabase secrets.`
                            : `ℹ️ Error Interno: ${data.detail || data.error}.`
                }])
            } else {
                let aiResponse = data.reply

                // ─── Open Claw Interceptor ───
                // Strip markdown code blocks before parsing (Llama 3 sometimes wraps the JSON)
                let cleanedAiResponse = aiResponse.replace(/```(json)?([\s\S]*?)```/gi, '$2').trim()
                const clawMatch = cleanedAiResponse.match(/\|\|\|([\s\S]*?)\|\|\|/)
                let generatedImage = null

                if (clawMatch) {
                    const clawJson = clawMatch[1].trim()

                    // Strip the JSON from the UI (handles both the raw text and the markdown wrapped version)
                    aiResponse = aiResponse
                        .replace(/```(json)?[\s\S]*?```/gi, '')
                        .replace(/\|\|\|[\s\S]*?\|\|\|/g, '')
                        .trim()

                    // Extract image preview from JSON
                    try {
                        const parsed = JSON.parse(clawJson)
                        const items = parsed.patch?.['promos.items']
                        let rawImage = null
                        if (items?.image) rawImage = items.image
                        else if (Array.isArray(items) && items[0]?.image) rawImage = items[0].image

                        if (rawImage) {
                            generatedImage = sanitizePollinationsUrl(rawImage)
                        }
                    } catch (e) {
                        console.error('Failed to parse generated image:', e)
                    }

                    const clawResult = await executeOpenClaw(clawJson)
                    if (clawJson.includes('READ_DATA') && clawResult && clawResult !== 'ERROR') {
                        setMessages([...newMessages, { role: 'assistant', content: aiResponse }])
                        return handleSend(null, clawResult)
                    }
                }

                // ─── UI SHIELD: Scavenger Regex ───
                // If AI yapped a raw Pollinations URL outside JSON, catch it and render it
                if (!generatedImage && aiResponse.includes('pollinations.ai')) {
                    // Match URLs even if they are wrapped in markdown asterisks **url**
                    const urlMatch = aiResponse.match(/https:\/\/image\.pollinations\.ai\/prompt\/[^\s)"'*]*/)
                    if (urlMatch) {
                        generatedImage = sanitizePollinationsUrl(urlMatch[0])
                        // Strip the matched URL, plus any surrounding asterisks from the UI text
                        aiResponse = aiResponse.replace(/\*?https:\/\/image\.pollinations\.ai\/prompt\/[^\s)"'*]*\*/gi, '').trim()
                        console.log('[UI Shield] Scavenged leaked URL:', generatedImage)
                    }
                }

                // ─── UI SHIELD: Strip raw technical yapping ───
                // Remove leftover markdown-style technical labels the AI might have leaked
                aiResponse = aiResponse
                    .replace(/\*\*IMAGE:\*\*[^\n]*/gi, '')
                    .replace(/\*\*COLOR:\*\*[^\n]*/gi, '')
                    .replace(/\*\*TEXT SHADOW:\*\*[^\n]*/gi, '')
                    .replace(/\*\*OPEN CLAW ACTION:\*\*/gi, '')
                    .replace(/\*\*Acción en Open Claw:\*\*/gi, '')
                    .replace(/\n{3,}/g, '\n\n') // Collapse excess newlines
                    .trim()

                setMessages([...newMessages, { role: 'assistant', content: aiResponse, generatedImage }])
            }
        } catch (err) {
            console.error('AI Comms Error:', err)
            setMessages([...newMessages, {
                role: 'assistant',
                content: 'ℹ️ No pude conectar con el servidor. Verificá tu conexión.'
            }])
        } finally {
            setIsLoading(false)
        }
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        logout()
        window.location.href = `/${tenantSlug}`
    }

    // ── Styles ──
    const containerStyle = {
        display: 'flex', flexDirection: 'column',
        minHeight: '100vh', background: '#F9FAFB',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }

    // Temporary toast state for AI
    const [toastMsg, setToastMsg] = useState('')
    const showToast = (msg) => {
        setToastMsg(msg)
        setTimeout(() => setToastMsg(''), 3000)
    }

    return (
        <div style={containerStyle}>
            {toastMsg && (
                <div style={{
                    position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
                    background: adminBlue, color: '#FFF', padding: '12px 24px', borderRadius: 30,
                    zIndex: 99999, fontSize: 14, fontWeight: 500, boxShadow: '0 4px 15px rgba(37,99,235,0.3)',
                    animation: 'slideDown 0.3s ease-out'
                }}>
                    {toastMsg}
                </div>
            )}

            <BackendHeader
                title="FoodSpot AI"
                onLogout={handleLogout}
                showDateSelector={false}
                extraActions={
                    <button
                        onClick={() => navigate(`/${tenantSlug}/owner/summary`)}
                        style={{ background: '#F3F4F6', border: 'none', padding: '8px 14px', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 12, color: '#374151' }}
                    >
                        ← Volver
                    </button>
                }
            />

            {/* ── Chat Area ── */}
            <div style={{
                flex: 1, overflowY: 'auto',
                padding: '16px 16px 160px',
                display: 'flex', flexDirection: 'column', gap: 12
            }}>
                {/* Welcome Card */}
                {messages.length === 0 && (
                    <div style={{
                        textAlign: 'center', padding: '40px 20px',
                        background: '#FFFFFF', borderRadius: 20,
                        border: '1px solid #E5E7EB',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                    }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>🧠</div>
                        <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: '#111827' }}>
                            Hola, {businessName}
                        </h2>
                        <p style={{ margin: '0 0 20px', fontSize: 14, color: '#6B7280', lineHeight: 1.5 }}>
                            Soy tu socio estratégico. Preguntame sobre ventas, pedí ideas de promos, o diseñemos un flyer juntos.
                        </p>

                        {/* Status pill */}
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '6px 14px', borderRadius: 20,
                            background: summaryLoading ? '#FEF3C7' : '#D1FAE5',
                            fontSize: 12, fontWeight: 600,
                            color: summaryLoading ? '#92400E' : '#065F46'
                        }}>
                            <div style={{
                                width: 6, height: 6, borderRadius: '50%',
                                background: summaryLoading ? '#F59E0B' : '#10B981'
                            }} />
                            {summaryLoading ? 'Cargando datos...' : `${salesSummary?.orderCount || 0} pedidos analizados`}
                        </div>

                        {/* Suggestion chips */}
                        <div style={{
                            display: 'flex', flexWrap: 'wrap', gap: 8,
                            justifyContent: 'center', marginTop: 20
                        }}>
                            {SUGGESTIONS.map(s => (
                                <button
                                    key={s.label}
                                    onClick={() => handleSend(s.prompt)}
                                    disabled={isLoading || summaryLoading}
                                    style={{
                                        padding: '10px 16px', borderRadius: 20,
                                        border: '1px solid #E5E7EB', background: '#FFFFFF',
                                        fontSize: 13, fontWeight: 500, color: '#374151',
                                        cursor: 'pointer', transition: 'all 0.2s',
                                        opacity: (isLoading || summaryLoading) ? 0.5 : 1
                                    }}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Messages */}
                {messages.map((msg, i) => (
                    <div
                        key={i}
                        style={{
                            display: 'flex',
                            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                        }}
                    >
                        <div style={{
                            maxWidth: '85%',
                            padding: '12px 16px',
                            borderRadius: msg.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                            background: msg.role === 'user' ? adminBlue : '#FFFFFF',
                            color: msg.role === 'user' ? '#FFFFFF' : '#111827',
                            border: msg.role === 'assistant' ? '1px solid #E5E7EB' : 'none',
                            boxShadow: msg.role === 'user' ? `0 4px 12px ${adminBlue}40` : '0 1px 2px rgba(0,0,0,0.04)',
                            whiteSpace: 'pre-wrap', wordBreak: 'break-word'
                        }}>
                            {msg.content}

                            {/* Multimodal Preview UI */}
                            {msg.clientPreview && (
                                <div style={{ marginTop: 8 }}>
                                    <img src={msg.clientPreview} alt="Attached" style={{ maxWidth: '100%', borderRadius: 8, maxHeight: 150, objectFit: 'cover' }} />
                                </div>
                            )}

                            {/* AI Generated Flyer Preview */}
                            {msg.generatedImage && (
                                <div style={{ marginTop: 12, overflow: 'hidden', borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)' }}>
                                    <LazyImage
                                        src={msg.generatedImage}
                                        alt="AI Generated Flyer"
                                        style={{ width: '100%', minHeight: '200px' }}
                                    />
                                </div>
                            )}

                            {/* Action buttons for AI responses (disabled since Open Claw automates this now, but leaving UI hooks for future) */}
                            {msg.role === 'assistant' && (msg.content || '').toLowerCase().includes('flyer') && (
                                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F3F4F6' }}>
                                    <button
                                        onClick={() => navigate(`/${tenantSlug}/owner/branding`)}
                                        style={{
                                            padding: '8px 16px', borderRadius: 12,
                                            background: adminBlue, color: '#FFF',
                                            border: 'none', fontSize: 12, fontWeight: 700,
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                                        }}
                                    >
                                        📝 Ver en Branding
                                    </button>
                                </div>
                            )}

                            {msg.role === 'assistant' && ((msg.content || '').toLowerCase().includes('promo') || (msg.content || '').toLowerCase().includes('promoción')) && !(msg.content || '').toLowerCase().includes('flyer') && (
                                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F3F4F6' }}>
                                    <button
                                        onClick={() => navigate(`/${tenantSlug}/owner/branding`)}
                                        style={{
                                            padding: '8px 16px', borderRadius: 12,
                                            background: '#10B981', color: '#FFF',
                                            border: 'none', fontSize: 12, fontWeight: 700,
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                                        }}
                                    >
                                        ⚡ Configurar Promo
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {/* Loading indicator */}
                {isLoading && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                        <div style={{
                            padding: '14px 20px', borderRadius: '20px 20px 20px 4px',
                            background: '#FFFFFF', border: '1px solid #E5E7EB',
                            display: 'flex', alignItems: 'center', gap: 6
                        }}>
                            <div style={{ display: 'flex', gap: 4 }}>
                                {[0, 1, 2].map(i => (
                                    <div key={i} style={{
                                        width: 8, height: 8, borderRadius: '50%',
                                        background: adminBlue, opacity: 0.4,
                                        animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite`
                                    }} />
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div ref={chatEndRef} />
            </div>

            {/* ── Input Bar (fixed bottom) ── */}
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                padding: '12px 16px calc(88px + env(safe-area-inset-bottom, 0px))',
                background: 'rgba(249,250,251,0.95)',
                backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                borderTop: '1px solid #E5E7EB'
            }}>
                {/* Inline suggestion chips when conversation is active */}
                {messages.length > 0 && messages.length < 6 && (
                    <div style={{ display: 'flex', gap: 6, marginBottom: 10, overflowX: 'auto', paddingBottom: 2 }}>
                        {SUGGESTIONS.slice(0, 2).map(s => (
                            <button
                                key={s.label}
                                onClick={() => handleSend(s.prompt)}
                                disabled={isLoading}
                                style={{
                                    padding: '6px 12px', borderRadius: 16,
                                    border: '1px solid #E5E7EB', background: '#FFF',
                                    fontSize: 12, fontWeight: 500, color: '#6B7280',
                                    cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0
                                }}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                )}

                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexDirection: 'column' }}>
                    {/* Image Attachment Preview */}
                    {attachment?.preview && (
                        <div style={{ alignSelf: 'flex-start', position: 'relative', marginBottom: 8, padding: 4, background: '#FFF', borderRadius: 8, border: '1px solid #E5E7EB' }}>
                            <img src={attachment.preview} alt="Upload" style={{ height: 60, borderRadius: 4 }} />
                            <button
                                onClick={() => setAttachment(null)}
                                style={{ position: 'absolute', top: -5, right: -5, background: '#EF4444', color: '#FFF', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}
                            >✕</button>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 8, width: '100%', alignItems: 'flex-end' }}>
                        {/* VAULTED MULTIMODAL UPLOAD BUTTON
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                width: 44, height: 44, borderRadius: '50%',
                                border: '1px solid #D1D5DB', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: '#FFFFFF', color: '#6B7280', transition: 'all 0.2s', flexShrink: 0
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <polyline points="21 15 16 10 5 21" />
                            </svg>
                        </button>
                        <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                        />
                        */}

                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Preguntale algo a tu AI..."
                            rows={1}
                            style={{
                                flex: 1, padding: '12px 16px',
                                borderRadius: 20, border: '1px solid #D1D5DB',
                                fontSize: 14, fontFamily: 'inherit',
                                resize: 'none', outline: 'none',
                                background: '#FFFFFF',
                                maxHeight: 100, overflowY: 'auto',
                                transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = adminBlue}
                            onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                        />
                        <button
                            onClick={() => handleSend()}
                            disabled={(!input.trim() && !attachment) || isLoading}
                            style={{
                                width: 44, height: 44, borderRadius: '50%',
                                border: 'none', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: (!input.trim() && !attachment) || isLoading ? '#E5E7EB' : adminBlue,
                                color: '#FFF', transition: 'all 0.2s',
                                flexShrink: 0
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Bounce animation for typing indicator */}
                <style>{`
                @keyframes slideDown {
                    from { transform: translate(-50%, -20px); opacity: 0; }
                    to { transform: translate(-50%, 0); opacity: 1; }
                }
                @keyframes bounce {
                    0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
                    40% { transform: translateY(-6px); opacity: 1; }
                }
            `}</style>

                <BackendNav
                    role="owner"
                    activeTab="ai"
                    onTabChange={(tab) => navigate(`/${tenantSlug}/owner/${tab}`)}
                />
            </div>
        </div>
    )
}
