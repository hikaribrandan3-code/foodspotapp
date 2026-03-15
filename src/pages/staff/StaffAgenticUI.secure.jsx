import { useState, useEffect, useRef } from 'react'
import { useTenant } from '../../contexts/TenantContext.jsx'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import { supabase } from '../../lib/supabaseClient.js'

/**
 * 🔐 SECURE VERSION: StaffAgenticUI
 * 
 * Changes from original:
 *   - Replaces client-side OpenAI calls with secure Supabase Edge Function
 *   - API keys are now server-side only (no exposure to browser)
 *   - Supports LTM (Long-Term Memory) integration
 *   - Model-agnostic with fallback chain (Groq -> Gemini -> OpenAI)
 * 
 * Migration: Rename this file to StaffAgenticUI.jsx after testing
 */

const SYSTEM_PROMPT = `You are the FoodSpot Prep-Agent. You are a tactical kitchen assistant.

RULES:
- Keep responses under 2 sentences
- Use bullet points for order updates
- Only discuss current active orders and ingredient stock
- If asked to move an order status, say you need to use the staff dashboard buttons
- Be brief and action-oriented
- Respond in the same language as the user's query`

function StaffAgenticUI({ config }) {
    const { businessId, tenantData } = useTenant()
    const { t, lang } = useLanguage()
    const [input, setInput] = useState('')
    const [messages, setMessages] = useState([])
    const [loading, setLoading] = useState(false)
    const [orders, setOrders] = useState([])
    const messagesEndRef = useRef(null)

    useEffect(() => {
        if (businessId) {
            fetchActiveOrders()
        }
    }, [businessId])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const fetchActiveOrders = async () => {
        const { data, error } = await supabase
            .from('orders')
            .select('id, order_number, status, items, created_at')
            .eq('business_id', businessId)
            .in('status', ['pending_payment', 'paid_unreleased', 'released_to_kitchen', 'preparing', 'ready', 'dispatched'])
            .order('created_at', { ascending: false })
            .limit(20)

        if (!error && data) {
            setOrders(data)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!input.trim() || loading) return

        const userMessage = input.trim()
        setInput('')
        setMessages(prev => [...prev, { role: 'user', content: userMessage }])
        setLoading(true)

        try {
            // 🔐 SECURE: Call server-side edge function instead of client-side OpenAI
            const { data, error } = await supabase.functions.invoke('staff-agent', {
                body: {
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        ...messages.slice(-5).map(m => ({ role: m.role, content: m.content })),
                        { role: 'user', content: userMessage }
                    ],
                    businessId,
                    orders,
                    businessName: tenantData?.business_name || 'Restaurant'
                }
            })

            if (error) {
                console.error('[StaffAgenticUI] Edge function error:', error)
                throw new Error('Service temporarily unavailable')
            }

            const reply = data?.reply || (lang === 'en' 
                ? 'Unable to process request' 
                : 'No puedo procesar la solicitud')

            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: reply,
                provider: data?.provider // Track which LLM was used
            }])

            // Refresh orders after each interaction
            await fetchActiveOrders()

        } catch (err) {
            console.error('[StaffAgenticUI] Error:', err)
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: lang === 'en' 
                    ? 'System temporarily unavailable' 
                    : 'Sistema temporalmente no disponible'
            }])
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            background: '#1F2937',
            borderRadius: 16,
            overflow: 'hidden'
        }}>
            <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid #374151',
                background: '#111827'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 20 }}>🤖</span>
                    <span style={{ color: '#FFF', fontWeight: 700, fontSize: 14 }}>
                        {lang === 'en' ? 'Prep-Agent' : 'Agente de Cocina'}
                    </span>
                    {/* LTM indicator */}
                    <span style={{ 
                        fontSize: 10, 
                        color: '#10B981', 
                        background: '#064E3B',
                        padding: '2px 6px',
                        borderRadius: 4,
                        marginLeft: 'auto'
                    }}>
                        🔒 SECURE
                    </span>
                </div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
                    {orders.length} {lang === 'en' ? 'active orders' : 'pedidos activos'}
                </div>
            </div>

            <div style={{
                flex: 1,
                overflow: 'auto',
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 12
            }}>
                {messages.length === 0 && (
                    <div style={{ color: '#6B7280', textAlign: 'center', fontSize: 13, marginTop: 40 }}>
                        {lang === 'en' 
                            ? 'Ask about current orders or kitchen status'
                            : 'Consulta sobre pedidos actuales o estado de cocina'}
                    </div>
                )}
                {messages.map((msg, i) => (
                    <div key={i} style={{
                        padding: '10px 14px',
                        borderRadius: 12,
                        maxWidth: '85%',
                        alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        background: msg.role === 'user' ? '#3B82F6' : '#374151',
                        color: '#FFF',
                        fontSize: 13,
                        lineHeight: 1.4,
                        position: 'relative'
                    }}>
                        {msg.content}
                        {/* Show provider indicator for assistant messages */}
                        {msg.role === 'assistant' && msg.provider && (
                            <span style={{
                                position: 'absolute',
                                bottom: 2,
                                right: 6,
                                fontSize: 8,
                                opacity: 0.5,
                                color: '#9CA3AF'
                            }}>
                                {msg.provider}
                            </span>
                        )}
                    </div>
                ))}
                {loading && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#9CA3AF', fontSize: 12 }}>
                        <div style={{
                            width: 12,
                            height: 12,
                            border: '2px solid #374151',
                            borderTop: '2px solid #3B82F6',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                        }} />
                        {lang === 'en' ? 'Thinking...' : 'Pensando...'}
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} style={{
                padding: 12,
                borderTop: '1px solid #374151',
                display: 'flex',
                gap: 8
            }}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={lang === 'en' ? 'Ask about orders...' : 'Consulta sobre pedidos...'}
                    disabled={loading}
                    style={{
                        flex: 1,
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1px solid #374151',
                        background: '#111827',
                        color: '#FFF',
                        fontSize: 13,
                        outline: 'none'
                    }}
                />
                <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    style={{
                        padding: '10px 16px',
                        borderRadius: 10,
                        border: 'none',
                        background: loading ? '#6B7280' : '#3B82F6',
                        color: '#FFF',
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                >
                    ➜
                </button>
            </form>
        </div>
    )
}

export default StaffAgenticUI
