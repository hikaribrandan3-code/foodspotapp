import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient.js'
import BackendHeader from '../../components/BackendHeader.jsx'
import BackendNav from '../../components/BackendNav.jsx'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import { formatPrice } from '../../config/menuData.js'
import { logout } from '../../utils/auth.js'
import { useTenant } from '../../contexts/TenantContext.jsx'
import { ORDER_STATUS } from '../../constants/database.js';
import { PAYMENT_METHOD } from '../../constants/database.js';



// ============================================
// 📊 ANALYTICS — REAL SUPABASE DATA (P0 #9)
// ============================================

const DATE_RANGES = (t) => [
    { id: 'today', label: t('analytics_today') },
    { id: 'week', label: t('days_7') },
    { id: 'month', label: t('days_30') },
    { id: 'all', label: t('all_time') }
]

function getDateCutoff(rangeId) {
    const now = new Date()
    switch (rangeId) {
        case 'today': {
            const start = new Date(now)
            start.setHours(0, 0, 0, 0)
            return start.toISOString()
        }
        case 'week': {
            const d = new Date(now)
            d.setDate(d.getDate() - 7)
            return d.toISOString()
        }
        case 'month': {
            const d = new Date(now)
            d.setDate(d.getDate() - 30)
            return d.toISOString()
        }
        default:
            return null
    }
}

const Analytics = () => {
    const navigate = useNavigate()
    const { tenantSlug } = useParams()
    const { businessId, tenantData } = useTenant()
    const { t } = useLanguage()
    // 🍃 OVERRIDE: Use Green for analytics as requested
    const primaryColor = '#10B981'

    const handleBack = () => navigate(`/${tenantSlug}/owner/orders`)
    const handleLogout = async () => {
        await supabase.auth.signOut()
        logout()
        window.location.href = `/${tenantSlug}`
    }

    // STATE
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [dateRange, setDateRange] = useState('today')

    // FETCH ORDERS + real-time subscription
    useEffect(() => {
        if (!businessId) return
        let cancelled = false

        const fetchOrders = async () => {
            setLoading(true)
            let query = supabase
                .from('orders')
                .select('id, total, subtotal, delivery_fee, items, status, order_type, payment_method, created_at')
                .eq('business_id', businessId)
                .order('created_at', { ascending: false })

            const cutoff = getDateCutoff(dateRange)
            if (cutoff) query = query.gte('created_at', cutoff)

            const { data, error } = await query

            if (!cancelled && !error && data) {
                setOrders(data)
            }
            if (!cancelled) setLoading(false)
        }

        fetchOrders()

        const subscription = supabase
            .channel(`analytics-orders-${businessId}-${dateRange}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `business_id=eq.${businessId}` },
                () => { if (!cancelled) fetchOrders() })
            .subscribe()

        return () => {
            cancelled = true
            supabase.removeChannel(subscription)
        }
    }, [businessId, dateRange])

    // COMPUTED STATS
    const stats = useMemo(() => {
        const completed = orders.filter(o =>
            [ORDER_STATUS.DELIVERED, ORDER_STATUS.READY, ORDER_STATUS.DISPATCHED, ORDER_STATUS.RELEASED_TO_KITCHEN, ORDER_STATUS.PREPARING].includes(o.status)
        )
        const delivered = orders.filter(o => o.status === ORDER_STATUS.DELIVERED)
        const totalRevenue = completed.reduce((sum, o) => sum + (Number(o.total) || 0), 0)
        const deliveryCount = completed.filter(o => o.order_type === 'delivery').length
        const pickupCount = completed.filter(o => o.order_type === 'pickup').length
        const dineInCount = completed.filter(o => o.order_type === 'dine_in').length
        const avgTicket = completed.length > 0 ? totalRevenue / completed.length : 0
        const mpCount = completed.filter(o => o.payment_method === PAYMENT_METHOD.MERCADO_PAGO).length
        const cashCount = completed.filter(o => o.payment_method === PAYMENT_METHOD.CASH).length

        // Top items
        const itemMap = {}
        completed.forEach(o => {
            (o.items || []).forEach(item => {
                const key = item.name || t('unknown')
                if (!itemMap[key]) itemMap[key] = { name: key, qty: 0, revenue: 0 }
                itemMap[key].qty += item.quantity || 1
                itemMap[key].revenue += (item.price || 0) * (item.quantity || 1)
            })
        })
        const topItems = Object.values(itemMap).sort((a, b) => b.qty - a.qty).slice(0, 5)

        return {
            totalRevenue, orderCount: completed.length, deliveredCount: delivered.length,
            deliveryCount, pickupCount, dineInCount, avgTicket,
            mpCount, cashCount, topItems
        }
    }, [orders])

    // STYLES
    const cardStyle = {
        padding: 20, background: '#FFFFFF', borderRadius: 16,
        border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
    }
    const labelStyle = {
        display: 'block', color: '#6B7280', fontSize: 11, marginBottom: 8,
        textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600
    }
    const valueStyle = { margin: 0, fontSize: 24, fontWeight: 800, color: '#111827' }

    return (
        <div className="page backend-surface" style={{ paddingBottom: 'calc(88px + env(safe-area-inset-bottom, 0px))', background: '#F9FAFB', minHeight: '100vh' }}>
            <BackendHeader
                title={t('analytics')}
                onLogout={handleLogout}
                showDateSelector={false}
                extraActions={
                    <button
                        onClick={handleBack}
                        style={{ background: '#F3F4F6', border: 'none', padding: '8px 14px', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 12, color: '#374151' }}
                    >
                        ← {t('back')}
                    </button>
                }
            />

            <div style={{ padding: 16 }}>
                {/* DATE RANGE TABS */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto' }}>
                    {DATE_RANGES(t).map(range => (
                        <button
                            key={range.id}
                            onClick={() => setDateRange(range.id)}
                            style={{
                                padding: '8px 18px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                                border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                                background: dateRange === range.id ? primaryColor : '#FFFFFF',
                                color: dateRange === range.id ? '#FFFFFF' : '#4B5563',
                                boxShadow: dateRange === range.id ? `0 4px 12px ${primaryColor}40` : '0 1px 2px rgba(0,0,0,0.05)',
                                transition: 'all 0.2s'
                            }}
                        >
                            {range.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>
                        <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
                        <p>{t('loading')}</p>
                    </div>
                ) : (
                    <>
                        {/* KPI GRID */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                            <div style={{ ...cardStyle, borderLeft: `4px solid ${primaryColor}` }}>
                                <span style={labelStyle}>{t('revenue_total')}</span>
                                <h3 style={{ ...valueStyle, color: primaryColor }}>{formatPrice(stats.totalRevenue)}</h3>
                            </div>
                            <div style={cardStyle}>
                                <span style={labelStyle}>{t('orders')}</span>
                                <h3 style={valueStyle}>{stats.orderCount}</h3>
                            </div>
                            <div style={cardStyle}>
                                <span style={labelStyle}>{t('avg_ticket')}</span>
                                <h3 style={valueStyle}>{formatPrice(stats.avgTicket)}</h3>
                            </div>
                            <div style={cardStyle}>
                                <span style={labelStyle}>{t(ORDER_STATUS.DELIVERED)}</span>
                                <h3 style={valueStyle}>{stats.deliveredCount}</h3>
                            </div>
                        </div>

                        {/* ORDER TYPE BREAKDOWN */}
                        <div style={{ ...cardStyle, marginBottom: 20 }}>
                            <span style={{ ...labelStyle, marginBottom: 16 }}>{t('by_order_type')}</span>
                            <div style={{ display: 'flex', gap: 12 }}>
                                {[
                                    { label: t('delivery'), count: stats.deliveryCount, color: '#3B82F6' },
                                    { label: t('pickup'), count: stats.pickupCount, color: '#10B981' },
                                    { label: t('dine_in'), count: stats.dineInCount, color: '#8B5CF6' }
                                ].map(type => (
                                    <div key={type.label} style={{ flex: 1, textAlign: 'center', padding: '12px 0', background: '#F9FAFB', borderRadius: 12 }}>
                                        <div style={{ fontSize: 20, fontWeight: 800, color: type.color }}>{type.count}</div>
                                        <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 500 }}>{type.label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* PAYMENT METHOD SPLIT */}
                        <div style={{ ...cardStyle, marginBottom: 20 }}>
                            <span style={{ ...labelStyle, marginBottom: 16 }}>{t('payment_methods')}</span>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: 12, background: '#EFF6FF', borderRadius: 12 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#2563EB' }}>MP</div>
                                    <div>
                                        <div style={{ fontSize: 18, fontWeight: 800, color: '#2563EB' }}>{stats.mpCount}</div>
                                        <div style={{ fontSize: 11, color: '#6B7280' }}>{t(PAYMENT_METHOD.MERCADO_PAGO)}</div>
                                    </div>
                                </div>
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: 12, background: '#F0FDF4', borderRadius: 12 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#16A34A' }}>$</div>
                                    <div>
                                        <div style={{ fontSize: 18, fontWeight: 800, color: '#16A34A' }}>{stats.cashCount}</div>
                                        <div style={{ fontSize: 11, color: '#6B7280' }}>{t(PAYMENT_METHOD.CASH)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* TOP ITEMS */}
                        <div style={cardStyle}>
                            <span style={{ ...labelStyle, marginBottom: 16 }}>{t('top_products')}</span>
                            {stats.topItems.length === 0 ? (
                                <p style={{ color: '#9CA3AF', fontSize: 14, textAlign: 'center', padding: 20 }}>{t('no_data')}</p>
                            ) : (
                                stats.topItems.map((item, i) => (
                                    <div key={item.name} style={{
                                        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
                                        borderBottom: i < stats.topItems.length - 1 ? '1px solid #F3F4F6' : 'none'
                                    }}>
                                        <div style={{
                                            width: 28, height: 28, borderRadius: 8,
                                            background: primaryColor + '15', color: primaryColor,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontWeight: 800, fontSize: 13
                                        }}>
                                            {i + 1}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{item.name}</div>
                                            <div style={{ fontSize: 12, color: '#6B7280' }}>{item.qty} {t('sold_count')}</div>
                                        </div>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: primaryColor }}>
                                            {formatPrice(item.revenue)}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}
            </div>

            <BackendNav
                role="owner"
                activeTab="analytics"
                onTabChange={(tab) => navigate(`/${tenantSlug}/owner/${tab}`)}
            />
        </div>
    )
}

export default Analytics
