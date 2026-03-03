import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient.js'
import { formatPrice } from '../../config/menuData.js'
import { useTenant } from '../../contexts/TenantContext.jsx'
import { logout } from '../../utils/auth.js'
import BackendHeader from '../../components/BackendHeader.jsx'
import BackendNav from '../../components/BackendNav.jsx'

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
    const primaryColor = tenantData?.primary_color || '#C4856A'
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
1. Respondé SIEMPRE en español rioplatense (vos, tenés, querés).
2. Sé directo, conciso, y estratégico. No des vueltas.
3. Usá emojis con moderación para dar energía.
4. Si te piden un flyer o imagen, describí exactamente qué debería tener (título, subtítulo, colores, estilo visual). No generes la imagen vos, solo el concepto creativo.
5. Si sugerís una promo, incluí: nombre, descripción corta, precio sugerido, y duración.
6. Basate en los datos REALES de ventas para dar insights. No inventes números.

DATOS DEL NEGOCIO:
- Nombre: ${businessName}
- Color de marca: ${tenantData?.primary_color || '#C4856A'}
- Categoría: ${tenantData?.business_category || 'Gastronomía'}
- Delivery habilitado: ${tenantData?.delivery_enabled ? 'Sí' : 'No'}

MENÚ:
${menuCategories}

${salesContext}`
    }, [tenantData, salesSummary, businessName])

    // Send message
    const handleSend = async (text) => {
        const userMsg = text || input.trim()
        if (!userMsg || isLoading) return

        const newMessages = [...messages, { role: 'user', content: userMsg }]
        setMessages(newMessages)
        setInput('')
        setIsLoading(true)

        try {
            const { data, error } = await supabase.functions.invoke('foodspot-ai', {
                body: {
                    messages: newMessages.map(m => ({ role: m.role, content: m.content })),
                    systemPrompt
                }
            })

            if (error) {
                setMessages([...newMessages, {
                    role: 'assistant',
                    content: `ℹ️ Info: ${error.message}. Asegurate de que GEMINI_API_KEY esté configurada en Supabase secrets.`
                }])
            } else if (data?.error) {
                setMessages([...newMessages, {
                    role: 'assistant',
                    content: `ℹ️ Info: ${data.error}. Asegurate de que GEMINI_API_KEY esté configurada en Supabase secrets.`
                }])
            } else {
                setMessages([...newMessages, { role: 'assistant', content: data.reply }])
            }
        } catch (err) {
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

    return (
        <div style={containerStyle}>
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
                            background: msg.role === 'user' ? primaryColor : '#FFFFFF',
                            color: msg.role === 'user' ? '#FFFFFF' : '#111827',
                            fontSize: 14, lineHeight: 1.6,
                            border: msg.role === 'user' ? 'none' : '1px solid #E5E7EB',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                            whiteSpace: 'pre-wrap', wordBreak: 'break-word'
                        }}>
                            {msg.content}

                            {/* Action buttons for AI responses */}
                            {msg.role === 'assistant' && (msg.content || '').toLowerCase().includes('flyer') && (
                                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F3F4F6' }}>
                                    <button
                                        onClick={() => navigate(`/${tenantSlug}/owner/summary`)}
                                        style={{
                                            padding: '8px 16px', borderRadius: 12,
                                            background: primaryColor, color: '#FFF',
                                            border: 'none', fontSize: 12, fontWeight: 700,
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                                        }}
                                    >
                                        📝 Publicar en Hub
                                    </button>
                                </div>
                            )}

                            {msg.role === 'assistant' && ((msg.content || '').toLowerCase().includes('promo') || (msg.content || '').toLowerCase().includes('promoción')) && !(msg.content || '').toLowerCase().includes('flyer') && (
                                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F3F4F6' }}>
                                    <button
                                        onClick={() => navigate(`/${tenantSlug}/owner/summary`)}
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
                                        background: primaryColor, opacity: 0.4,
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

                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
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
                        onFocus={(e) => e.target.style.borderColor = primaryColor}
                        onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                    />
                    <button
                        onClick={() => handleSend()}
                        disabled={!input.trim() || isLoading}
                        style={{
                            width: 44, height: 44, borderRadius: '50%',
                            border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: (!input.trim() || isLoading) ? '#E5E7EB' : primaryColor,
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
    )
}
