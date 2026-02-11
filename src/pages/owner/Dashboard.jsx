import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useTenant } from '../../contexts/TenantContext'
import { subscribeToOrders, updateOrderCloud } from '../../lib/supabaseClient'
import ItemCard from '../../components/ItemCard'

// 🔔 NOTIFICATION SOUND (Simple Beep)
const playNotificationSound = () => {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.type = 'sine'
        osc.frequency.setValueAtTime(500, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.1)

        gain.gain.setValueAtTime(0.1, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)

        osc.start()
        osc.stop(ctx.currentTime + 0.5)
    } catch (e) {
        console.error('Audio play failed', e)
    }
}

// STATUS CONFIG
const KITCHEN_STAGES = ['confirmado', 'en_cocina', 'en_camino'] // 'entregado' disappears
const STAGE_LABELS = {
    'confirmado': '🔥 Nuevo Pedido',
    'en_cocina': '👨‍🍳 En Cocina',
    'en_camino': '🚀 En Camino'
}

const NEXT_STEP = {
    'confirmado': { next: 'en_cocina', label: 'Empezar a Cocinar' },
    'en_cocina': { next: 'en_camino', label: 'Despachar / Enviar' },
    'en_camino': { next: 'entregado', label: 'Marcar Entregado' }
}

export default function Dashboard() {
    const { businessId, tenantData } = useTenant()
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)

    // 🔐 AUTH SYNC: Ensure Global Client sends x-business-id for RLS
    useEffect(() => {
        if (businessId) {
            localStorage.setItem('fs_business_id', businessId)
        }
    }, [businessId])

    // ============================================
    // 1. FETCH INITIAL ORDERS
    // ============================================
    useEffect(() => {
        if (!businessId) return

        const fetchOrders = async () => {
            setLoading(true)
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .eq('business_id', businessId)
                .in('status', KITCHEN_STAGES)
                .order('created_at', { ascending: true }) // Oldest first (FIFO)

            if (!error && data) {
                setOrders(data)
            }
            setLoading(false)
        }

        fetchOrders()
    }, [businessId])

    // ============================================
    // 2. REAL-TIME SUBSCRIPTION
    // ============================================
    useEffect(() => {
        if (!businessId) return

        console.log('📡 Connecting to Live Kitchen Feed...')

        // Use existing client subscription helper
        const sub = subscribeToOrders(businessId,
            (newOrder) => {
                // INSERT handler
                if (KITCHEN_STAGES.includes(newOrder.status)) {
                    console.log('🔔 NEW ORDER:', newOrder.id)
                    playNotificationSound()
                    setOrders(prev => [...prev, newOrder])
                }
            },
            (orderId, updatedOrder) => {
                // UPDATE handler
                setOrders(prev => {
                    // Check if it's still in kitchen stages
                    if (!KITCHEN_STAGES.includes(updatedOrder.status)) {
                        // Remove it (e.g. marked 'entregado')
                        return prev.filter(o => o.id !== orderId)
                    }
                    // Update field
                    return prev.map(o => o.id === orderId ? updatedOrder : o)
                })
            }
        )

        return () => {
            sub.unsubscribe()
        }
    }, [businessId])

    // ============================================
    // 3. ACTIONS
    // ============================================
    const advanceOrder = async (orderId, currentStatus) => {
        const next = NEXT_STEP[currentStatus]
        if (!next) return

        // Optimistic UI Update
        setOrders(prev => prev.map(o => {
            if (o.id === orderId) {
                return { ...o, status: next.next }
            }
            return o
        }).filter(o => KITCHEN_STAGES.includes(o.status))) // Filter out if moved to 'entregado'

        // Cloud Update
        await updateOrderCloud(orderId, { status: next.next }, businessId)
    }

    // Helpers
    const formatTime = (isoString) => {
        const date = new Date(isoString)
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    if (loading) return <div style={{ padding: 20, color: 'white' }}>Cargando cocina...</div>

    return (
        <div style={{
            padding: 20,
            background: '#111827', // Dark Mode for Kitchen
            minHeight: '100vh',
            color: 'white',
            fontFamily: 'Inter, system-ui, sans-serif'
        }}>
            <header style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>👩‍🍳 Cocina en Vivo</h1>
                <div style={{ display: 'flex', gap: 10 }}>
                    <span style={{
                        background: '#059669', padding: '4px 12px', borderRadius: 20,
                        fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6
                    }}>
                        <span style={{ width: 8, height: 8, background: '#34D399', borderRadius: '50%', animation: 'pulse 1s infinite' }} />
                        ONLINE
                    </span>
                </div>
            </header>

            {orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#6B7280' }}>
                    <h2>Todo tranquilo por ahora... 😴</h2>
                    <p>Los pedidos aparecerán aquí automáticamente.</p>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: 16
                }}>
                    {orders.map(order => {
                        const stepConfig = NEXT_STEP[order.status]
                        const isUrgent = order.status === 'confirmado'

                        return (
                            <div key={order.id} style={{
                                background: '#1F2937',
                                borderRadius: 12,
                                border: isUrgent ? '2px solid #EF4444' : '1px solid #374151',
                                overflow: 'hidden',
                                display: 'flex', flexDirection: 'column'
                            }}>
                                {/* Header */}
                                <div style={{
                                    padding: 16, borderBottom: '1px solid #374151',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                                    background: isUrgent ? 'rgba(239, 68, 68, 0.1)' : 'transparent'
                                }}>
                                    <div>
                                        <div style={{ fontSize: 18, fontWeight: 700 }}>#{String(order.order_number).padStart(3, '0')}</div>
                                        <div style={{ fontSize: 13, color: '#9CA3AF' }}>{formatTime(order.created_at)}</div>
                                    </div>
                                    <div style={{
                                        padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                                        background: isUrgent ? '#EF4444' : '#3B82F6', color: 'white'
                                    }}>
                                        {STAGE_LABELS[order.status]}
                                    </div>
                                </div>

                                {/* Items */}
                                <div style={{ padding: 16, flex: 1 }}>
                                    {order.items.map((item, idx) => (
                                        <div key={idx} style={{ display: 'flex', marginBottom: 8, fontSize: 15 }}>
                                            <span style={{ fontWeight: 700, marginRight: 8, color: '#FCD34D' }}>{item.quantity}x</span>
                                            <span style={{ flex: 1 }}>{item.name}</span>
                                        </div>
                                    ))}
                                    {order.notes && (
                                        <div style={{ marginTop: 12, padding: 8, background: '#374151', borderRadius: 6, fontSize: 13, color: '#F3F4F6' }}>
                                            📝 {order.notes}
                                        </div>
                                    )}
                                </div>

                                {/* Footer Actions */}
                                <div style={{ padding: 16, paddingTop: 0 }}>
                                    <button
                                        onClick={() => advanceOrder(order.id, order.status)}
                                        style={{
                                            width: '100%',
                                            padding: 14,
                                            borderRadius: 8,
                                            border: 'none',
                                            background: isUrgent ? '#EF4444' : '#3B82F6',
                                            color: 'white',
                                            fontWeight: 700,
                                            fontSize: 15,
                                            cursor: 'pointer',
                                            transition: 'transform 0.1s'
                                        }}
                                        onMouseDown={e => e.target.style.transform = 'scale(0.98)'}
                                        onMouseUp={e => e.target.style.transform = 'scale(1)'}
                                    >
                                        {stepConfig?.label || 'Avanzar'} →
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            <style>{`
                @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
            `}</style>
        </div>
    )
}
