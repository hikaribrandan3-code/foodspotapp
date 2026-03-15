import { useState, useEffect, useRef } from 'react'
import { useTenant } from '../../contexts/TenantContext.jsx'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import { supabase } from '../../lib/supabaseClient.js'

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
            const orderSummary = orders.map(o => 
                `- #${o.order_number}: ${o.status} (${o.items?.length || 0} items)`
            ).join('\n')

            const context = `CURRENT ORDERS:\n${orderSummary || 'No active orders'}\n\nBUSINESS: ${tenantData?.business_name || 'Restaurant'}`

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
            })

            const data = await response.json()
            const reply = data.choices?.[0]?.message?.content || (lang === 'en' ? 'Unable to process request' : 'No puedo procesar la solicitud')

            setMessages(prev => [...prev, { role: 'assistant', content: reply }])
        } catch (err) {
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: lang === 'en' ? 'System temporarily unavailable' : 'Sistema temporalmente no disponible'
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
                        lineHeight: 1.4
                    }}>
                        {msg.content}
                    </div>
                ))}
                {loading && (
                    <div style={{ color: '#9CA3AF', fontSize: 12 }}>
                        {lang === 'en' ? 'Thinking...' : 'Pensando...'}
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