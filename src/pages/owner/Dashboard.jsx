import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useTenant } from '../../contexts/TenantContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { subscribeToOrders, updateOrderCloud } from '../../lib/supabaseClient'
import ItemCard from '../../components/ItemCard'
import { formatAddressForDisplay, generateDriverMessage } from '../../utils/logistics' // Strike 17 Imports
import BurgerLoader from '../../components/BurgerLoader'

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

// STATUS CONFIG (FSM Values)
const KITCHEN_STAGES = ['released_to_kitchen', 'preparing', 'ready', 'dispatched'] // 'delivered' disappears
const STAGE_LABELS = {
    'released_to_kitchen': '🔥 Nuevo Pedido',
    'preparing': '👨‍🍳 En Cocina',
    'ready': '✨ Listo',
    'dispatched': '🚀 En Camino'
}

const NEXT_STEP = {
    'released_to_kitchen': { next: 'preparing', label: 'Empezar a Cocinar' },
    'preparing': { next: 'ready', label: 'Marcar Listo' },
    'ready': { next: 'dispatched', label: 'Despachar / Enviar' },
    'dispatched': { next: 'delivered', label: 'Marcar Entregado' }
}

export default function Dashboard() {
    const { businessId, tenantData } = useTenant()
    const { t } = useLanguage()
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)

    // 🔊 P0 #3: Audio unlock state (iOS/Safari blocks audio without user gesture)
    const [audioUnlocked, setAudioUnlocked] = useState(false)
    const [flashActive, setFlashActive] = useState(false)
    const flashTimerRef = useRef(null)

    const unlockAudio = () => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)()
            // Play a silent buffer to unlock
            const buffer = ctx.createBuffer(1, 1, 22050)
            const source = ctx.createBufferSource()
            source.buffer = buffer
            source.connect(ctx.destination)
            source.start(0)
            setAudioUnlocked(true)
            console.log('🔊 Audio unlocked by user gesture')
        } catch (e) {
            // Fallback: mark as unlocked anyway so banner disappears
            setAudioUnlocked(true)
        }
    }

    // Visual flash trigger
    const triggerFlash = () => {
        setFlashActive(true)
        if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
        flashTimerRef.current = setTimeout(() => setFlashActive(false), 3000)
    }

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
                    triggerFlash() // 🚨 P0 #3: Visual flash for muted screens
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
        }).filter(o => KITCHEN_STAGES.includes(o.status))) // Filter out if moved to 'delivered'

        // 🛡️ FSM RPC Call (replaces direct DB update)
        const { data, error } = await supabase.rpc('advance_order_status', {
            p_order_id: orderId,
            p_target_status: next.next
        })

        if (error || (data && !data.success)) {
            console.error('FSM Error:', error || data)
            // Revert on failure
            const { data: freshOrders } = await supabase
                .from('orders')
                .select('*')
                .eq('business_id', businessId)
                .in('status', KITCHEN_STAGES)
                .order('created_at', { ascending: true })
            if (freshOrders) setOrders(freshOrders)
        }
    }

    // Helpers
    const formatTime = (isoString) => {
        const date = new Date(isoString)
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    if (loading) return <BurgerLoader />

    return (
        <div style={{
            padding: 20,
            background: '#111827',
            minHeight: '100vh',
            color: 'white',
            fontFamily: 'Inter, system-ui, sans-serif',
            // 🚨 P0 #3: Visual flash border when new order arrives
            boxShadow: flashActive ? 'inset 0 0 0 6px #EF4444' : 'none',
            animation: flashActive ? 'kitchenFlash 0.5s ease-in-out 6' : 'none',
            transition: 'box-shadow 0.3s'
        }}>
            {/* 🔊 P0 #3: Audio Unlock Banner */}
            {!audioUnlocked && (
                <div
                    onClick={unlockAudio}
                    style={{
                        background: '#FBBF24', color: '#78350F',
                        padding: '14px 20px', borderRadius: 12, marginBottom: 16,
                        textAlign: 'center', cursor: 'pointer', fontWeight: 700, fontSize: 15,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                        animation: 'pulse 1.5s infinite',
                        boxShadow: '0 4px 12px rgba(251, 191, 36, 0.4)'
                    }}
                >
                    🔔 Toca aquí para activar las alertas de sonido
                </div>
            )}
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
                    <h2>{t('dashboard_empty_title')}</h2>
                    <p>{t('dashboard_empty_desc')}</p>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: 16
                }}>
                    {orders.map(order => {
                        const stepConfig = NEXT_STEP[order.status]
                        const isUrgent = order.status === 'released_to_kitchen'

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

                                    {/* 🚚 DELIVERY DETAILS (Strike 17) */}
                                    {order.order_type === 'delivery' && (
                                        <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #374151' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                                <span style={{ fontSize: 16 }}>📍</span>
                                                <span style={{ fontSize: 14, color: '#E5E7EB' }}>
                                                    {formatAddressForDisplay(order.delivery_address)}
                                                </span>
                                            </div>

                                            {/* Driver WhatsApp Button */}
                                            <button
                                                onClick={() => {
                                                    const msg = generateDriverMessage(order)
                                                    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`
                                                    window.open(url, '_blank')
                                                }}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: 8,
                                                    background: '#25D366', color: 'white', border: 'none',
                                                    padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                                                    cursor: 'pointer', width: '100%', justifyContent: 'center'
                                                }}
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                                                </svg>
                                                Enviar a Repartidor
                                            </button>
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
                @keyframes kitchenFlash {
                    0%, 100% { box-shadow: inset 0 0 0 6px #EF4444; }
                    50% { box-shadow: inset 0 0 0 6px transparent; }
                }
            `}</style>
        </div>
    )
}
