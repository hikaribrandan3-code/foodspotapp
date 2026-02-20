import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient.js'
import { formatPrice } from '../../config/menuData.js'
import { useTenant } from '../../contexts/TenantContext.jsx'
import { formatAddressForDisplay, generateDriverMessage } from '../../utils/logistics.js' // Strike 17 Imports
import { useOrdersRealtime } from '../../hooks/useOrdersRealtime.js'

// ============================================
// 🎯 STAFF MISSION CONTROL v2 — FSM SAFETY CAGE
// ============================================
// Strict state machine: no impossible jumps.
// Row-locked RPC: no double-click race conditions.
// Status-specific action buttons: no ambiguity.
// ============================================

// ============================================
// 🔄 FSM STATUS PIPELINE (Moved inside component)
// ============================================

// ============================================
// 🛡️ SAFETY CAGE: Status-Specific Action Buttons
// ============================================
// Each status has ONE clear action. No ambiguity.
const getActionForStatus = (status, orderType) => {
    switch (status) {
        case 'pending_payment':
            // ❌ NO BUTTON — Only webhook can advance this
            return null

        case 'paid_unreleased':
            return {
                label: '✅ ACEPTAR PEDIDO',
                targetStatus: 'released_to_kitchen',
                color: '#22C55E',
                confirm: false
            }

        case 'released_to_kitchen':
            return {
                label: '👨‍🍳 ENVIAR A COCINA',
                targetStatus: 'preparing',
                color: '#F97316',
                confirm: false
            }

        case 'preparing':
            return {
                label: '✨ MARCAR LISTO',
                targetStatus: 'ready',
                color: '#06B6D4',
                confirm: false
            }

        case 'ready':
            if (orderType === 'delivery') {
                return {
                    label: '🚗 DESPACHAR',
                    targetStatus: 'dispatched',
                    color: '#6366F1',
                    confirm: false
                }
            } else {
                return {
                    label: '🏪 ENTREGAR',
                    targetStatus: 'delivered',
                    color: '#22C55E',
                    confirm: false
                }
            }

        case 'dispatched':
            return {
                label: '✅ CONFIRMAR ENTREGA',
                targetStatus: 'delivered',
                color: '#22C55E',
                confirm: false
            }

        default:
            return null // Terminal states: delivered, cancelled, refunded
    }
}

function StaffDashboard() {
    const { businessId, tenantData } = useTenant()
    const navigate = useNavigate()
    const primaryColor = tenantData?.primary_color || '#C4856A'
    const businessName = tenantData?.business_name || 'Dashboard'
    const tenantSlug = tenantData?.slug || ''

    // ============================================
    // 🔄 FSM STATUS PIPELINE (Professional)
    // ============================================
    const STATUS_PIPELINE = [
        { id: 'pending_payment', label: 'Esperando Pago', color: '#F59E0B', bg: '#FEF3C7' },
        { id: 'paid_unreleased', label: 'Pago Recibido', color: '#8B5CF6', bg: '#EDE9FE' },
        { id: 'released_to_kitchen', label: 'Recibido', color: primaryColor, bg: `${primaryColor}22` }, // 🚀 BRAND SYNC
        { id: 'preparing', label: 'En Cocina', color: '#F97316', bg: '#FFF7ED' },
        { id: 'ready', label: 'Listo', color: '#06B6D4', bg: '#CFFAFE' },
        { id: 'dispatched', label: 'En Camino', color: '#6366F1', bg: '#E0E7FF' },
        { id: 'delivered', label: 'Entregado', color: '#22C55E', bg: '#DCFCE7' }
    ];

    // Get status config by id
    const getStatusConfig = (status) => {
        return STATUS_PIPELINE.find(s => s.id === status) || { label: status, color: '#9CA3AF', bg: '#F3F4F6' }
    }

    // 🛡️ HOOK INJECTION: SILO-HARDENED REALTIME DATA
    const { orders, loading, refreshOrders: fetchOrders } = useOrdersRealtime(businessId)

    // const [orders, setOrders] = useState([]) // Removed local state
    // const [loading, setLoading] = useState(true) // Removed local loading
    const [activeTab, setActiveTab] = useState('active') // 'active' | 'completed'
    const [processingOrderId, setProcessingOrderId] = useState(null)
    const [errorMessage, setErrorMessage] = useState(null)
    const [userRole, setUserRole] = useState(null)

    // ============================================
    // 🔐 AUTH (ROLE DETECTION FOR NAV)
    // ============================================
    useEffect(() => {
        const fetchRole = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.user) {
                setUserRole(session.user.user_metadata?.role || null)
            }
        }
        fetchRole()
    }, [])

    const isOwner = userRole === 'owner' || userRole === 'superadmin'

    // ============================================
    // 📡 FETCH & REAL-TIME (Handled by Hook)
    // ============================================
    // Logic extracted to useOrdersRealtime.js hook
    // for security and cleaner architecture.

    // ============================================
    // 🔄 FSM STATUS ADVANCE (via RPC)
    // ============================================
    const advanceStatus = async (order, targetStatus) => {
        if (processingOrderId) return // Prevent double-clicks

        setProcessingOrderId(order.id)
        setErrorMessage(null)

        try {
            const { data, error } = await supabase.rpc('advance_order_status', {
                p_order_id: order.id,
                p_target_status: targetStatus
            })

            if (error) throw error

            // Handle RPC response
            if (data && !data.success) {
                // RPC returned a controlled error
                console.warn('⚠️ FSM Rejection:', data.error, data.message)

                if (data.error === 'INVALID_TRANSITION') {
                    setErrorMessage(`⚠️ ${data.message}`)
                    // Refresh to get current state
                    fetchOrders()
                } else if (data.error === 'PAYMENT_PENDING') {
                    setErrorMessage('⏳ Esperando confirmación de pago automática')
                } else {
                    setErrorMessage(data.message || 'Error desconocido')
                }

                setTimeout(() => setErrorMessage(null), 4000)
            } else {
                console.log('✅ FSM Transition:', data?.from_status, '→', data?.to_status)
            }
        } catch (err) {
            console.error('Status Update Error:', err)
            setErrorMessage('❌ Error: ' + err.message)
            setTimeout(() => setErrorMessage(null), 4000)
        } finally {
            setProcessingOrderId(null)
        }
    }

    // ============================================
    // 🗂️ FILTER ORDERS
    // ============================================
    // Active statuses for the kanban view (excludes terminal + cart)
    const ACTIVE_STATUSES = ['pending_payment', 'paid_unreleased', 'released_to_kitchen', 'preparing', 'ready', 'dispatched']
    const TERMINAL_STATUSES = ['delivered', 'cancelled', 'refunded']

    const filteredOrders = useMemo(() => {
        if (activeTab === 'active') {
            return orders.filter(o => ACTIVE_STATUSES.includes(o.status))
        } else {
            return orders.filter(o => TERMINAL_STATUSES.includes(o.status))
        }
    }, [orders, activeTab])

    // Group by status for Kanban view
    const ordersByStatus = useMemo(() => {
        const groups = {}
        ACTIVE_STATUSES.forEach(s => { groups[s] = [] })
        filteredOrders.forEach(order => {
            if (groups[order.status]) {
                groups[order.status].push(order)
            }
        })
        return groups
    }, [filteredOrders])

    // The columns to show in the kanban (only active pipeline statuses)
    const kanbanColumns = STATUS_PIPELINE.filter(s => ACTIVE_STATUSES.includes(s.id))

    // Stats
    const stats = useMemo(() => ({
        pending: orders.filter(o => ['pending_payment', 'paid_unreleased'].includes(o.status)).length,
        active: orders.filter(o => ACTIVE_STATUSES.includes(o.status)).length,
        completed: orders.filter(o => o.status === 'delivered').length
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
            background: '#F9FAFB', // Light Theme Base
            color: '#111827', // Dark text
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
            {/* Header: Pro-Grade White Scheme */}
            <header style={{
                background: '#FFFFFF', // Clean White Professional Surface
                padding: '12px 16px',
                borderBottom: '1px solid #E5E7EB',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                position: 'sticky',
                top: 0,
                zIndex: 100
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {isOwner && (
                            <button
                                onClick={() => {
                                    // Robust navigation fallback: If slug is missing, parse current URL
                                    const currentSlug = tenantSlug || window.location.pathname.split('/')[1];
                                    navigate(`/${currentSlug}/owner`);
                                }}
                                style={{
                                    background: '#FFFFFF',
                                    border: '1px solid #D1D5DB',
                                    color: '#374151',
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                ← Volver
                            </button>
                        )}
                        <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#111827', marginLeft: isOwner ? 0 : 8 }}>
                            Mission Control
                        </h1>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                            width: 8, height: 8, borderRadius: '50%', background: '#22C55E',
                            boxShadow: '0 0 8px #22C55E'
                        }} />
                        <span style={{ fontSize: 11, color: '#6B7280', fontWeight: '600', textTransform: 'uppercase' }}>
                            En Vivo
                        </span>
                    </div>
                </div>
            </header>

            {/* Error Toast */}
            {errorMessage && (
                <div style={{
                    position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)',
                    background: '#DC2626', color: 'white', padding: '12px 24px', borderRadius: 12,
                    fontWeight: 600, fontSize: 14, zIndex: 999,
                    boxShadow: '0 8px 25px rgba(220,38,38,0.4)',
                    animation: 'slideDown 0.3s ease'
                }}>
                    {errorMessage}
                </div>
            )}

            {/* Tabs */}
            <div style={{ padding: '16px 24px 0', display: 'flex', gap: 8 }}>
                <button
                    onClick={() => setActiveTab('active')}
                    style={{
                        padding: '10px 20px',
                        background: activeTab === 'active' ? primaryColor : '#FFFFFF',
                        color: activeTab === 'active' ? 'white' : '#4B5563',
                        border: activeTab === 'active' ? '1px solid transparent' : '1px solid #E5E7EB',
                        borderRadius: 10,
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: 14,
                        transition: 'all 0.2s ease',
                        boxShadow: activeTab === 'active' ? `0 4px 12px ${primaryColor}40` : '0 1px 2px rgba(0,0,0,0.05)'
                    }}
                >
                    🔥 Activos ({stats.active})
                </button>
                <button
                    onClick={() => setActiveTab('completed')}
                    style={{
                        padding: '10px 20px',
                        background: activeTab === 'completed' ? primaryColor : '#FFFFFF',
                        color: activeTab === 'completed' ? 'white' : '#4B5563',
                        border: activeTab === 'completed' ? '1px solid transparent' : '1px solid #E5E7EB',
                        borderRadius: 10,
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: 14,
                        transition: 'all 0.2s ease',
                        boxShadow: activeTab === 'completed' ? `0 4px 12px ${primaryColor}40` : '0 1px 2px rgba(0,0,0,0.05)'
                    }}
                >
                    ✅ Completados ({stats.completed})
                </button>
            </div>

            {/* Kanban Columns */}
            {activeTab === 'active' && (
                <div className="kanban-grid" style={{
                    display: 'grid',
                    // Stacks columns on phone, grids on desktop
                    gridTemplateColumns: window.innerWidth < 768 ? '1fr' : `repeat(${kanbanColumns.length}, 1fr)`,
                    gap: 16,
                    padding: '16px 24px',
                    minHeight: 'calc(100vh - 160px)',
                    overflowX: 'auto'
                }}>
                    {kanbanColumns.map(status => (
                        <div key={status.id} style={{
                            background: '#F3F4F6', // Light gray column background
                            borderRadius: 16,
                            padding: 16,
                            display: 'flex',
                            flexDirection: 'column',
                            minWidth: 240,
                            borderTop: `4px solid ${status.color}`, // Visual indicator moved to top for pro look
                            border: '1px solid #E5E7EB' // Subtle border outline
                        }}>
                            {/* Column Header */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 16
                            }}>
                                <span style={{ fontWeight: 700, fontSize: 13, color: status.color, textTransform: 'uppercase' }}>
                                    {status.label}
                                </span>
                                <span style={{
                                    background: status.bg,
                                    color: status.color,
                                    padding: '2px 8px',
                                    borderRadius: 6,
                                    fontSize: 11,
                                    fontWeight: 700
                                }}>
                                    {ordersByStatus[status.id]?.length || 0}
                                </span>
                            </div>

                            {/* Order Cards */}
                            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {(ordersByStatus[status.id] || []).map(order => {
                                    const action = getActionForStatus(order.status, order.order_type)
                                    const isProcessing = processingOrderId === order.id

                                    return (
                                        <div key={order.id} style={{
                                            background: '#FFFFFF', // White cards
                                            borderRadius: 12,
                                            padding: 16,
                                            borderLeft: `4px solid ${status.color}`,
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)' // Soft shadow
                                        }}>
                                            {/* Order Header */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                                <span style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>
                                                    #{String(order.order_number).padStart(3, '0')}
                                                </span>
                                                <span style={{ fontSize: 12, color: '#6B7280' }}>
                                                    {new Date(order.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>

                                            {/* Items Summary */}
                                            <div style={{ fontSize: 13, color: '#4B5563', marginBottom: 12 }}>
                                                {(order.items || []).slice(0, 3).map((item, i) => (
                                                    <div key={i}>{item.quantity}x {item.name}</div>
                                                ))}
                                                {(order.items?.length || 0) > 3 && (
                                                    <div style={{ color: '#9CA3AF', fontStyle: 'italic' }}>+{order.items.length - 3} más...</div>
                                                )}
                                            </div>

                                            {/* Customer Info */}
                                            {order.customer_name && (
                                                <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
                                                    👤 <span style={{ fontWeight: 500, color: '#374151' }}>{order.customer_name}</span>
                                                </div>
                                            )}

                                            {/* Order Type Badge + Total */}
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

                                            {/* 🚚 DELIVERY DETAILS (Strike 17) */}
                                            {order.order_type === 'delivery' && (
                                                <div style={{ marginBottom: 16, paddingTop: 12, borderTop: '1px solid #4B5563' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                                        <span style={{ fontSize: 16 }}>📍</span>
                                                        <span style={{ fontSize: 13, color: '#E5E7EB' }}>
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
                                                            padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                                                            cursor: 'pointer', width: '100%', justifyContent: 'center',
                                                            marginBottom: 8
                                                        }}
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                                                        </svg>
                                                        Enviar a Repartidor
                                                    </button>
                                                </div>
                                            )}

                                            {/* 🛡️ SAFETY CAGE: Status-Specific Action Button */}
                                            {action ? (
                                                <button
                                                    onClick={() => advanceStatus(order, action.targetStatus)}
                                                    disabled={isProcessing}
                                                    style={{
                                                        width: '100%',
                                                        padding: '10px 14px',
                                                        background: isProcessing ? '#4B5563' : action.color,
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: 8,
                                                        fontWeight: 700,
                                                        cursor: isProcessing ? 'wait' : 'pointer',
                                                        opacity: isProcessing ? 0.6 : 1,
                                                        fontSize: 13,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: 8,
                                                        transition: 'all 0.2s ease',
                                                        boxShadow: `0 2px 12px ${action.color}33`
                                                    }}
                                                >
                                                    {isProcessing ? '⏳ Procesando...' : action.label}
                                                </button>
                                            ) : (
                                                // No action = pending payment or terminal state
                                                status.id === 'pending_payment' && (
                                                    <div style={{
                                                        width: '100%',
                                                        padding: '10px 14px',
                                                        background: '#F9FAFB',
                                                        border: '1px dashed #D1D5DB',
                                                        borderRadius: 8,
                                                        fontSize: 12,
                                                        color: '#6B7280',
                                                        textAlign: 'center',
                                                        fontWeight: 500
                                                    }}>
                                                        ⏳ Esperando confimación
                                                    </div>
                                                )
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
                        {filteredOrders.map(order => {
                            const statusConf = getStatusConfig(order.status)
                            return (
                                <div key={order.id} style={{
                                    background: '#FFFFFF',
                                    borderRadius: 12,
                                    padding: 16,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 16,
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                    border: '1px solid #E5E7EB'
                                }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, color: '#111827' }}>#{String(order.order_number).padStart(3, '0')}</div>
                                        <div style={{ fontSize: 12, color: '#6B7280' }}>
                                            {new Date(order.created_at).toLocaleString('es-AR')}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 700, color: statusConf.color }}>{formatPrice(order.total)}</div>
                                        <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                                            <span style={{
                                                background: statusConf.bg.replace(')', ', 0.3)').replace('rgb', 'rgba'),
                                                color: statusConf.color,
                                                padding: '2px 8px',
                                                borderRadius: 6,
                                                fontSize: 10,
                                                fontWeight: 600
                                            }}>{statusConf.label}</span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}

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
                @keyframes slideDown {
                    from { transform: translate(-50%, -20px); opacity: 0; }
                    to { transform: translate(-50%, 0); opacity: 1; }
                }
            `}</style>
        </div>
    )
}

export default StaffDashboard
