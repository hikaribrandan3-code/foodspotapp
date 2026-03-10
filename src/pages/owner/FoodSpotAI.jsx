import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient.js'
import { formatPrice } from '../../config/menuData.js'
import { useTenant } from '../../contexts/TenantContext.jsx'
import { logout } from '../../utils/auth.js'
import BackendHeader from '../../components/BackendHeader.jsx'
import BackendHeader from '../../components/BackendHeader.jsx'
import BackendNav from '../../components/BackendNav.jsx'

// ─── Native Preloader Image Component ───
const LazyImage = ({ src, alt, style, className }) => {
    const [status, setStatus] = useState('loading') // 'loading', 'loaded', 'error'

    useEffect(() => {
        setStatus('loading')
        const img = new window.Image()
        img.src = src
        img.onload = () => setStatus('loaded')
        img.onerror = () => setStatus('error')
    }, [src])

    return (
        <div className={className} style={{ position: 'relative', width: '100%', minHeight: '150px', background: '#F3F4F6', ...style, border: 'none' }}>
            {status === 'loading' && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 12, color: '#9CA3AF'
                }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse">
                        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                        <path d="M5 3v4" /><path d="M19 17v4" /><path d="M3 5h4" /><path d="M17 19h4" />
                    </svg>
                    <span style={{ fontSize: 12, fontWeight: 500, animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite', textAlign: 'center' }}>
                        Generando flyer visual...<br />(Puede tardar unos segundos)
                    </span>
                </div>
            )}

            {status === 'error' && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 8, color: '#EF4444', textAlign: 'center', padding: 16
                }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                        <path d="M12 9v4" /><path d="M12 17h.01" />
                    </svg>
                    <span style={{ fontSize: 12, fontWeight: 500 }}>
                        El servidor de imágenes está ocupado.
                    </span>
                </div>
            )}

            {status === 'loaded' && (
                <img
                    src={src}
                    alt={alt}
                    style={{
                        width: '100%',
                        display: 'block',
                        objectFit: 'cover',
                        animation: 'fadeIn 0.4s ease-in'
                    }}
                />
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

IMAGE PROTOCOL (TRIPLE-ENGINE):
1. PRIMARY (Hugging Face): Generate high-fidelity food photography using SDXL.
2. SECONDARY (Pollinations): Use if primary fails.
3. FINAL FALLBACK (Unsplash): Use if all AI engines are busy.

OPEN CLAW ACTION:
Everything technical MUST be in ||| JSON |||.
Image URL Format (Preferred): https://image.pollinations.ai/prompt/[ENGLISH_PROMPT]?width=800&height=1400&nologo=true
Safety Fallback URL: https://source.unsplash.com/featured/800x1400?food,[KEYWORDS]

FLYER GENERATION (CRITICAL):
- DETECT user language (ES/EN/PT).
- NO YAPPING: Never show URLs or technical jargon in the chat.
- If user asks for a flyer, YOU MUST output the JSON block with a descriptive English prompt.

VISION GUARD:
If the user uploads an image, treat it as a Creative Brief. Suggest an action using Open Claw.

WHEN USER ASKS FOR IDEAS OR ANALYSIS (NO FLYER/PROMO REQUESTED):
Respond naturally with insights, suggestions, and data analysis. Do NOT include ||| blocks unless you are explicitly creating or modifying a promo config.

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
        if (attachment && !hiddenSystemFeedback) {
            msgPayload.image = { mimeType: attachment.mimeType, data: attachment.data }
            // UI only needs preview
            msgPayload.clientPreview = attachment.preview
        }

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
                const clawMatch = aiResponse.match(/\|\|\|([\s\S]*?)\|\|\|/)
                let generatedImage = null

                if (clawMatch) {
                    const clawJson = clawMatch[1].trim()
                    aiResponse = aiResponse.replace(clawMatch[0], '').trim() // Strip JSON from UI

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
                    const urlMatch = aiResponse.match(/https:\/\/image\.pollinations\.ai\/prompt\/[^\s)"']*/)
                    if (urlMatch) {
                        generatedImage = sanitizePollinationsUrl(urlMatch[0])
                        aiResponse = aiResponse.replace(urlMatch[0], '').trim()
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
                        {/* 📎 Attachment Button */}
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
