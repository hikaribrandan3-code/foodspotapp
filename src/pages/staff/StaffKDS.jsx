// src/pages/staff/StaffKDS.jsx
import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient.js'
import { useTenant } from '../../contexts/TenantContext.jsx'
import { useLanguage } from '../../contexts/LanguageContext.jsx'

const STATUS_CONFIG = {
    paid: { label: 'PAID', color: '#8B5CF6', bg: '#EDE9FE' },
    cooking: { label: 'COOKING', color: '#F97316', bg: '#FFF7ED' },
    ready: { label: 'READY', color: '#06B6D4', bg: '#CFFAFE' },
    delivered: { label: 'DELIVERED', color: '#22C55E', bg: '#DCFCE7' }
}

function StaffKDS({ config }) {
    const { tenantSlug } = useParams()
    const navigate = useNavigate()
    const { businessId, tenantData } = useTenant()
    const { t, lang } = useLanguage()
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedOrder, setSelectedOrder] = useState(null)

    useEffect(() => {
        if (businessId) {
            fetchKitchenOrders()
            const interval = setInterval(fetchKitchenOrders, 5000)
            return () => clearInterval(interval)
        }
    }, [businessId])

    const fetchKitchenOrders = async () => {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('business_id', businessId)
            .in('status', ['paid', 'cooking', 'ready', 'delivered'])
            .order('created_at', { ascending: true })

        if (!error && data) {
            setOrders(data)
        }
        setLoading(false)
    }

    const handleStatusChange = async (orderId, newStatus) => {
        try {
            const { data, error } = await supabase.rpc('transition_order_state', {
                p_order_id: orderId,
                p_new_status: newStatus
            })

            if (!error && data?.[0]?.success) {
                fetchKitchenOrders()
            }
        } catch (e) {
            console.error('Status change failed:', e)
        }
    }

    const getNextStatus = (currentStatus) => {
        const flow = {
            'paid': 'cooking',
            'cooking': 'ready', 
            'ready': 'delivered'
        }
        return flow[currentStatus]
    }

    const getItemsSummary = (items) => {
        if (!items || items.length === 0) return '—'
        return items.map(item => `${item.quantity}x ${item.name}`).join(', ')
    }

    const formatTime = (dateStr) => {
        if (!dateStr) return ''
        const date = new Date(dateStr)
        const now = new Date()
        const diff = Math.floor((now - date) / 1000 / 60)
        if (diff < 1) return 'now'
        if (diff < 60) return `${diff}m`
        return `${Math.floor(diff / 60)}h ${diff % 60}m`
    }

    if (loading) {
        return (
            <div style={{ 
                minHeight: '100vh', 
                background: '#1F2937', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
            }}>
                <div style={{ color: '#9CA3AF', fontSize: 18 }}>Loading KDS...</div>
            </div>
        )
    }

    const paidOrders = orders.filter(o => o.status === 'paid')
    const cookingOrders = orders.filter(o => o.status === 'cooking')
    const readyOrders = orders.filter(o => o.status === 'ready')

    return (
        <div style={{ 
            minHeight: '100vh', 
            background: '#111827',
            color: '#FFF',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
            {/* Header */}
            <header style={{
                padding: '16px 20px',
                background: '#1F2937',
                borderBottom: '1px solid #374151',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: '#FFF' }}>
                        🍳 KITCHEN DISPLAY
                    </h1>
                    <div style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>
                        {tenantData?.business_name || 'Restaurant'}
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 32, fontWeight: 800, color: '#8B5CF6' }}>{paidOrders.length}</div>
                        <div style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase' }}>Paid</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 32, fontWeight: 800, color: '#F97316' }}>{cookingOrders.length}</div>
                        <div style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase' }}>Cooking</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 32, fontWeight: 800, color: '#06B6D4' }}>{readyOrders.length}</div>
                        <div style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase' }}>Ready</div>
                    </div>
                    <button
                        onClick={() => navigate(`/${tenantSlug}/staff/dashboard`)}
                        style={{
                            padding: '10px 20px',
                            background: '#374151',
                            border: 'none',
                            borderRadius: 8,
                            color: '#FFF',
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        ← {lang === 'en' ? 'Back' : 'Volver'}
                    </button>
                </div>
            </header>

            {/* Kanban Board */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(3, 1fr)', 
                gap: 16, 
                padding: 16,
                height: 'calc(100vh - 100px)'
            }}>
                {/* PAID Column */}
                <KDSColumn 
                    title="PAID"
                    orders={paidOrders}
                    color="#8B5CF6"
                    bg="#EDE9FE"
                    onAction={(order) => handleStatusChange(order.id, 'cooking')}
                    actionLabel={lang === 'en' ? 'START →' : 'INICIAR →'}
                    getItemsSummary={getItemsSummary}
                    formatTime={formatTime}
                />

                {/* COOKING Column */}
                <KDSColumn 
                    title="COOKING"
                    orders={cookingOrders}
                    color="#F97316"
                    bg="#FFF7ED"
                    onAction={(order) => handleStatusChange(order.id, 'ready')}
                    actionLabel={lang === 'en' ? 'READY →' : 'LISTO →'}
                    getItemsSummary={getItemsSummary}
                    formatTime={formatTime}
                />

                {/* READY Column */}
                <KDSColumn 
                    title="READY"
                    orders={readyOrders}
                    color="#06B6D4"
                    bg="#CFFAFE"
                    onAction={(order) => handleStatusChange(order.id, 'delivered')}
                    actionLabel={lang === 'en' ? 'SERVED →' : 'SERVIDO →'}
                    getItemsSummary={getItemsSummary}
                    formatTime={formatTime}
                />
            </div>
        </div>
    )
}

function KDSColumn({ title, orders, color, bg, onAction, actionLabel, getItemsSummary, formatTime }) {
    return (
        <div style={{ 
            background: '#1F2937', 
            borderRadius: 16, 
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
        }}>
            <div style={{ 
                padding: '12px 16px', 
                background: color, 
                borderRadius: 12,
                marginBottom: 12,
                textAlign: 'center'
            }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#FFF' }}>{title}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{orders.length} orders</div>
            </div>

            <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {orders.length === 0 && (
                    <div style={{ 
                        textAlign: 'center', 
                        padding: 40, 
                        color: '#4B5563',
                        fontSize: 14 
                    }}>
                        {title === 'PAID' ? 'Waiting for orders...' : 'No orders'}
                    </div>
                )}
                {orders.map(order => (
                    <KDSOrderCard 
                        key={order.id} 
                        order={order} 
                        color={color}
                        onAction={onAction}
                        actionLabel={actionLabel}
                        getItemsSummary={getItemsSummary}
                        formatTime={formatTime}
                    />
                ))}
            </div>
        </div>
    )
}

function KDSOrderCard({ order, color, onAction, actionLabel, getItemsSummary, formatTime }) {
    const [showItems, setShowItems] = useState(false)

    return (
        <div style={{ 
            background: '#374151', 
            borderRadius: 12, 
            padding: 14,
            borderLeft: `4px solid ${color}`
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#FFF' }}>
                        #{order.order_number}
                    </div>
                    <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                        {order.table_number ? `Table ${order.table_number}` : order.customer_name || 'Takeout'}
                    </div>
                </div>
                <div style={{ 
                    background: color, 
                    color: '#FFF', 
                    padding: '4px 8px', 
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700
                }}>
                    {formatTime(order.created_at)}
                </div>
            </div>

            <div 
                onClick={() => setShowItems(!showItems)}
                style={{ 
                    fontSize: 13, 
                    color: '#D1D5DB', 
                    cursor: 'pointer',
                    marginBottom: 10
                }}
            >
                {showItems ? getItemsSummary(order.items) : `📋 ${order.items?.length || 0} items (tap to view)`}
            </div>

            <button
                onClick={() => onAction(order)}
                style={{
                    width: '100%',
                    padding: '12px',
                    background: color,
                    border: 'none',
                    borderRadius: 8,
                    color: '#FFF',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                    textTransform: 'uppercase'
                }}
            >
                {actionLabel}
            </button>
        </div>
    )
}

export default StaffKDS