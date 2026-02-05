import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient.js'
import { formatPrice } from '../../config/menuData.js'
import { useTenant } from '../../contexts/TenantContext.jsx'

// ============================================
// 🎯 STAFF MISSION CONTROL - TABLET VIEW
// ============================================
// High-concurrency dashboard for kitchen/delivery staff
// Real-Time Queue via Supabase Channels
// One-tap status progression
// ============================================

// Status Pipeline (linear progression)
const STATUS_PIPELINE = [
    { id: 'pendiente_confirmacion', label: 'Pago Manual', color: '#F59E0B', bg: '#FEF3C7', icon: '💰' },
    { id: 'confirmado', label: 'Recibido', color: '#3B82F6', bg: '#DBEAFE', icon: '📋' },
    { id: 'en_cocina', label: 'En Cocina', color: '#8B5CF6', bg: '#EDE9FE', icon: '👨‍🍳' },
    { id: 'en_camino', label: 'En Camino', color: '#6366F1', bg: '#E0E7FF', icon: '🚗' },
    { id: 'entregado', label: 'Entregado', color: '#22C55E', bg: '#DCFCE7', icon: '✅' }
]

// Get next status in pipeline
const getNextStatus = (currentStatus) => {
    const currentIndex = STATUS_PIPELINE.findIndex(s => s.id === currentStatus)
    if (currentIndex === -1 || currentIndex >= STATUS_PIPELINE.length - 1) return null
    return STATUS_PIPELINE[currentIndex + 1].id
}

// Get status config
const getStatusConfig = (status) => {
    return STATUS_PIPELINE.find(s => s.id === status) || { label: 'Desconocido', color: '#9CA3AF', bg: '#F3F4F6', icon: '❓' }
}

function StaffDashboard() {
    const { businessId, tenantData } = useTenant()
    const navigate = useNavigate()
    const primaryColor = tenantData?.primary_color || '#C4856A'
    const businessName = tenantData?.business_name || 'Dashboard'

    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('active') // 'active' | 'completed'
    const [processingOrderId, setProcessingOrderId] = useState(null)

    // ============================================
    // 📡 FETCH ORDERS
    // ============================================
    const fetchOrders = async () => {
        if (!businessId) return

        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .eq('business_id', businessId)
                .neq('status', 'awaiting_payment') // 💎 INVISIBLE until payment
                .order('created_at', { ascending: false })
                .limit(50)

            if (error) throw error
            setOrders(data || [])
        } catch (err) {
            console.error('Fetch Orders Error:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchOrders()
    }, [businessId])

    // ============================================
    // ⚡ REAL-TIME SUBSCRIPTION
    // ============================================
    useEffect(() => {
        if (!businessId) return

        const channel = supabase
            .channel(`staff-orders-${businessId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'orders',
                    filter: `business_id=eq.${businessId}`
                },
                (payload) => {
                    console.log('🔔 Order Change:', payload.eventType, payload.new?.id)

                    if (payload.eventType === 'INSERT') {
                        // Only add if not awaiting_payment
                        if (payload.new.status !== 'awaiting_payment') {
                            setOrders(prev => [payload.new, ...prev])
                        }
                    } else if (payload.eventType === 'UPDATE') {
                        setOrders(prev => prev.map(o =>
                            o.id === payload.new.id ? payload.new : o
                        ))
                    } else if (payload.eventType === 'DELETE') {
                        setOrders(prev => prev.filter(o => o.id !== payload.old.id))
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [businessId])

    // ============================================
    // 🔄 STATUS PROGRESSION
    // ============================================
    const advanceStatus = async (order) => {
        const nextStatus = getNextStatus(order.status)
        if (!nextStatus) return

        setProcessingOrderId(order.id)

        try {
            const updates = { status: nextStatus }

            // If confirming manual payment, add paid_at
            if (order.status === 'pendiente_confirmacion' && nextStatus === 'confirmado') {
                updates.paid_at = new Date().toISOString()
            }

            const { error } = await supabase
                .from('orders')
                .update(updates)
                .eq('id', order.id)

            if (error) throw error
        } catch (err) {
            console.error('Status Update Error:', err)
            alert('Error actualizando estado: ' + err.message)
        } finally {
            setProcessingOrderId(null)
        }
    }

    // ============================================
    // 🗂️ FILTER ORDERS
    // ============================================
    const filteredOrders = useMemo(() => {
        if (activeTab === 'active') {
            return orders.filter(o => o.status !== 'entregado' && o.status !== 'awaiting_payment')
        } else {
            return orders.filter(o => o.status === 'entregado')
        }
    }, [orders, activeTab])

    // Group by status for Kanban view
    const ordersByStatus = useMemo(() => {
        const groups = {}
        STATUS_PIPELINE.slice(0, -1).forEach(s => { groups[s.id] = [] })
        filteredOrders.forEach(order => {
            if (groups[order.status]) {
                groups[order.status].push(order)
            }
        })
        return groups
    }, [filteredOrders])

    // Stats
    const stats = useMemo(() => ({
        pending: orders.filter(o => o.status === 'pendiente_confirmacion').length,
        active: orders.filter(o => !['entregado', 'awaiting_payment'].includes(o.status)).length,
        completed: orders.filter(o => o.status === 'entregado').length
    }), [orders])

    // ============================================
    // RENDER: LOADING
    // ============================================
    if (loading) {
        return (
            <div style={{
                minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#1F2937'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🍳</div>
                    <p style={{ color: '#9CA3AF' }}>Cargando pedidos...</p>
                </div>
            </div>
        )
    }

    // ============================================
    // RENDER: MAIN DASHBOARD
    // ============================================
    return (
        <div style={{
            minHeight: '100vh',
            background: '#111827',
            color: 'white',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
            {/* Header */}
            <header style={{
                background: '#1F2937',
                padding: '16px 24px',
                borderBottom: '1px solid #374151',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'sticky',
                top: 0,
                zIndex: 100
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontSize: 32 }}>🎯</span>
                    <div>
                        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Mission Control</h1>
                        <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>{businessName}</p>
                    </div>
                </div>

                {/* Stats Pills */}
                <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ background: '#FEF3C7', color: '#92400E', padding: '8px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
                        💰 {stats.pending} Pendientes
                    </div>
                    <div style={{ background: '#DBEAFE', color: '#1E40AF', padding: '8px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
                        🔥 {stats.active} Activos
                    </div>
                    <div style={{ background: '#DCFCE7', color: '#166534', padding: '8px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
                        ✅ {stats.completed} Hoy
                    </div>
                </div>

                {/* Real-time indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                        width: 10, height: 10, borderRadius: '50%', background: '#22C55E',
                        animation: 'pulse 2s infinite'
                    }} />
                    <span style={{ fontSize: 12, color: '#9CA3AF' }}>En vivo</span>
                </div>
            </header>

            {/* Tabs */}
            <div style={{ padding: '16px 24px 0', display: 'flex', gap: 8 }}>
                <button
                    onClick={() => setActiveTab('active')}
                    style={{
                        padding: '10px 20px',
                        background: activeTab === 'active' ? primaryColor : '#374151',
                        color: 'white',
                        border: 'none',
                        borderRadius: 10,
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: 14
                    }}
                >
                    🔥 Activos ({stats.active})
                </button>
                <button
                    onClick={() => setActiveTab('completed')}
                    style={{
                        padding: '10px 20px',
                        background: activeTab === 'completed' ? primaryColor : '#374151',
                        color: 'white',
                        border: 'none',
                        borderRadius: 10,
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: 14
                    }}
                >
                    ✅ Completados ({stats.completed})
                </button>
            </div>

            {/* Kanban Columns */}
            {activeTab === 'active' && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 16,
                    padding: 24,
                    minHeight: 'calc(100vh - 160px)'
                }}>
                    {STATUS_PIPELINE.slice(0, 4).map(status => (
                        <div key={status.id} style={{
                            background: '#1F2937',
                            borderRadius: 16,
                            padding: 16,
                            display: 'flex',
                            flexDirection: 'column'
                        }}>
                            {/* Column Header */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                marginBottom: 16,
                                paddingBottom: 12,
                                borderBottom: `2px solid ${status.color}`
                            }}>
                                <span style={{ fontSize: 20 }}>{status.icon}</span>
                                <span style={{ fontWeight: 700, fontSize: 16, color: status.color }}>{status.label}</span>
                                <span style={{
                                    marginLeft: 'auto',
                                    background: status.bg,
                                    color: status.color,
                                    padding: '4px 10px',
                                    borderRadius: 12,
                                    fontSize: 12,
                                    fontWeight: 700
                                }}>
                                    {ordersByStatus[status.id]?.length || 0}
                                </span>
                            </div>

                            {/* Order Cards */}
                            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {(ordersByStatus[status.id] || []).map(order => {
                                    const nextStatus = getNextStatus(order.status)
                                    const nextConfig = nextStatus ? getStatusConfig(nextStatus) : null
                                    const isProcessing = processingOrderId === order.id

                                    return (
                                        <div key={order.id} style={{
                                            background: '#374151',
                                            borderRadius: 12,
                                            padding: 16,
                                            borderLeft: `4px solid ${status.color}`
                                        }}>
                                            {/* Order Header */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                                <span style={{ fontWeight: 700, fontSize: 16 }}>
                                                    #{String(order.order_number).padStart(3, '0')}
                                                </span>
                                                <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                                                    {new Date(order.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>

                                            {/* Items Summary */}
                                            <div style={{ fontSize: 13, color: '#D1D5DB', marginBottom: 12 }}>
                                                {(order.items || []).slice(0, 3).map((item, i) => (
                                                    <div key={i}>{item.quantity}x {item.name}</div>
                                                ))}
                                                {(order.items?.length || 0) > 3 && (
                                                    <div style={{ color: '#9CA3AF', fontStyle: 'italic' }}>+{order.items.length - 3} más...</div>
                                                )}
                                            </div>

                                            {/* Customer Info */}
                                            {order.customer_name && (
                                                <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 8 }}>
                                                    👤 {order.customer_name}
                                                </div>
                                            )}

                                            {/* Order Type Badge */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                                <span style={{
                                                    background: order.order_type === 'delivery' ? '#3B82F6' : '#10B981',
                                                    color: 'white',
                                                    padding: '2px 8px',
                                                    borderRadius: 6,
                                                    fontSize: 11,
                                                    fontWeight: 600
                                                }}>
                                                    {order.order_type === 'delivery' ? '🚗 Delivery' : '🏪 Pickup'}
                                                </span>
                                                <span style={{ fontSize: 14, fontWeight: 700, color: status.color }}>
                                                    {formatPrice(order.total)}
                                                </span>
                                            </div>

                                            {/* Advance Button */}
                                            {nextStatus && (
                                                <button
                                                    onClick={() => advanceStatus(order)}
                                                    disabled={isProcessing}
                                                    style={{
                                                        width: '100%',
                                                        padding: '10px 14px',
                                                        background: nextConfig?.color || '#22C55E',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: 8,
                                                        fontWeight: 600,
                                                        cursor: isProcessing ? 'wait' : 'pointer',
                                                        opacity: isProcessing ? 0.6 : 1,
                                                        fontSize: 13,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: 8
                                                    }}
                                                >
                                                    {isProcessing ? '...' : (
                                                        <>
                                                            {status.id === 'pendiente_confirmacion' ? '💰 Confirmar Pago' : `${nextConfig?.icon} → ${nextConfig?.label}`}
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    )
                                })}

                                {/* Empty State */}
                                {(!ordersByStatus[status.id] || ordersByStatus[status.id].length === 0) && (
                                    <div style={{
                                        textAlign: 'center',
                                        padding: 32,
                                        color: '#6B7280',
                                        fontSize: 14
                                    }}>
                                        <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.5 }}>{status.icon}</div>
                                        Sin pedidos
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Completed List */}
            {activeTab === 'completed' && (
                <div style={{ padding: 24 }}>
                    <div style={{ display: 'grid', gap: 12 }}>
                        {filteredOrders.map(order => (
                            <div key={order.id} style={{
                                background: '#1F2937',
                                borderRadius: 12,
                                padding: 16,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 16
                            }}>
                                <span style={{ fontSize: 24 }}>✅</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600 }}>#{String(order.order_number).padStart(3, '0')}</div>
                                    <div style={{ fontSize: 12, color: '#9CA3AF' }}>
                                        {new Date(order.created_at).toLocaleString('es-AR')}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: 700, color: '#22C55E' }}>{formatPrice(order.total)}</div>
                                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>{order.items?.length} items</div>
                                </div>
                            </div>
                        ))}

                        {filteredOrders.length === 0 && (
                            <div style={{ textAlign: 'center', padding: 48, color: '#6B7280' }}>
                                <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
                                <p>No hay pedidos completados hoy</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(0.9); }
                }
            `}</style>
        </div>
    )
}

export default StaffDashboard
