import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient.js'
import BackendHeader from '../../components/BackendHeader.jsx'
import BackendNav from '../../components/BackendNav.jsx'
import { TierGuard } from '../../components/TierGuard.jsx'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import { useCurrency } from '../../hooks/useCurrency.js'
import { logout } from '../../utils/auth.js'
import { useTenant } from '../../contexts/TenantContext.jsx'
import { ORDER_STATUS } from '../../constants/database.js';
import { PAYMENT_METHOD } from '../../constants/database.js';
import FinancialTrackerDashboard from '../../components/FinancialTrackerDashboard.jsx'
import OwnerEventsView from '../../components/owner/OwnerEventsView.jsx'
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
    const { t, lang } = useLanguage()
    const fmt = useCurrency()
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
    const [ledgerEntries, setLedgerEntries] = useState([])
    const [loading, setLoading] = useState(true)
    const [fetchError, setFetchError] = useState(null)
    const [dateRange, setDateRange] = useState('today')
    const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches)
    const [activeTab, setActiveTab] = useState(() => {
        const saved = localStorage.getItem('owner_analytics_tab')
        return saved || 'analytics'
    })

    // Track mobile/desktop viewport
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 767px)')
        const handler = (e) => {
            setIsMobile(e.matches)
            // If switching to desktop and on events tab, reset to analytics
            if (!e.matches && activeTab === 'events') {
                setActiveTab('analytics')
            }
        }
        mq.addEventListener('change', handler)
        return () => mq.removeEventListener('change', handler)
    }, [activeTab])

    // Save active tab to localStorage when it changes
    useEffect(() => {
        localStorage.setItem('owner_analytics_tab', activeTab)
    }, [activeTab])

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
            query = query.limit(500)

            const { data, error } = await query

            if (!cancelled) {
                if (error) {
                    setFetchError(error.message)
                } else {
                    setFetchError(null)
                    setOrders(data || [])
                }
                setLoading(false)
            }
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

    // FETCH LEDGER — permanent revenue source (survives order deletion)
    useEffect(() => {
        if (!businessId) return
        let cancelled = false

        const fetchLedger = async () => {
            let query = supabase
                .from('transaction_ledger')
                .select('amount_gross_cents, payment_method, processed_at')
                .eq('business_id', businessId)
                .eq('transaction_type', 'payment')
                .eq('status', 'completed')
                .order('processed_at', { ascending: false })

            const cutoff = getDateCutoff(dateRange)
            if (cutoff) query = query.gte('processed_at', cutoff)

            const { data, error } = await query
            if (!cancelled && !error) setLedgerEntries(data || [])
        }

        fetchLedger()

        const subscription = supabase
            .channel(`analytics-ledger-${businessId}-${dateRange}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transaction_ledger', filter: `business_id=eq.${businessId}` },
                () => { if (!cancelled) fetchLedger() })
            .subscribe()

        return () => {
            cancelled = true
            supabase.removeChannel(subscription)
        }
    }, [businessId, dateRange])

    // COMPUTED STATS
    const stats = useMemo(() => {
        // Revenue from transaction_ledger (permanent, survives order deletion)
        const totalRevenue = ledgerEntries.reduce((sum, l) => sum + (l.amount_gross_cents || 0), 0) / 100
        const mpRevenue = ledgerEntries.filter(l => l.payment_method !== 'cash').reduce((sum, l) => sum + (l.amount_gross_cents || 0), 0) / 100
        const cashRevenue = ledgerEntries.filter(l => l.payment_method === 'cash').reduce((sum, l) => sum + (l.amount_gross_cents || 0), 0) / 100
        const mpCount = ledgerEntries.filter(l => l.payment_method !== 'cash').length
        const cashCount = ledgerEntries.filter(l => l.payment_method === 'cash').length
        const avgTicket = ledgerEntries.length > 0 ? totalRevenue / ledgerEntries.length : 0

        // Operational stats from orders (item breakdown, order types)
        const EXCLUDED = ['pending', 'pending_payment', 'cancelled', 'refunded']
        const completed = orders.filter(o => !EXCLUDED.includes(o.status))
        const delivered = orders.filter(o => o.status === ORDER_STATUS.DELIVERED)
        const deliveryCount = completed.filter(o => o.order_type === 'delivery').length
        const pickupCount = completed.filter(o => o.order_type === 'pickup').length
        const dineInCount = completed.filter(o => o.order_type === 'dine_in').length

        const itemMap = {}
        completed.forEach(o => {
            (o.items || []).forEach(item => {
                const key = item.name || t('unknown')
                if (!itemMap[key]) itemMap[key] = { name: key, qty: 0, revenue: 0 }
                itemMap[key].qty += item.quantity || 1
                itemMap[key].revenue += (item.price || 0) * (item.quantity || 1)
            })
        })
        const topItems = Object.values(itemMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5)

        return {
            totalRevenue, orderCount: ledgerEntries.length, deliveredCount: delivered.length,
            deliveryCount, pickupCount, dineInCount, avgTicket,
            mpCount, cashCount, mpRevenue, cashRevenue, topItems,
            isAtLimit: orders.length >= 500
        }
    }, [orders, ledgerEntries])

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
                        style={{ background: '#F3F4F6', border: 'none', padding: '8px 14px', borderRadius: 20, cursor: 'pointer', fontWeight: 600, fontSize: 12, color: '#374151' }}
                    >
                        ← {t('back')}
                    </button>
                }
            />

            <div style={{ padding: isMobile ? 16 : '24px 32px', maxWidth: isMobile ? undefined : 1200, margin: isMobile ? undefined : '0 auto' }}>

                {/* MAIN TABS + DATE RANGE — single row on desktop */}
                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: 12, marginBottom: 24 }}>
                    <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
                        {[
                            { id: 'analytics', label: t('analytics') },
                            { id: 'financials', label: t('expenses') },
                            ...(isMobile ? [{ id: 'events', label: t('events') }] : []),
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    padding: '10px 20px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                                    border: '1px solid',
                                    cursor: 'pointer', whiteSpace: 'nowrap',
                                    background: activeTab === tab.id ? primaryColor : '#FFFFFF',
                                    color: activeTab === tab.id ? '#FFFFFF' : '#4B5563',
                                    borderColor: activeTab === tab.id ? primaryColor : '#E5E7EB',
                                    boxShadow: activeTab === tab.id ? `0 4px 12px ${primaryColor}40` : '0 1px 2px rgba(0,0,0,0.05)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Date range only visible on analytics tab */}
                    {activeTab === 'analytics' && (
                        <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
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
                    )}
                </div>

                {activeTab === 'analytics' && (
                <div>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>
                        <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
                        <p>{t('loading')}</p>
                    </div>
                ) : fetchError ? (
                    <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: 16, color: '#DC2626', fontSize: 14 }}>
                        {t('error_loading_data') || 'Error loading analytics data. Please refresh.'}
                    </div>
                ) : (
                    <>
                        {/* KPI GRID — 4 columns on desktop, 2x2 on mobile */}
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                            <div style={{ ...cardStyle, borderLeft: `4px solid ${primaryColor}` }}>
                                <span style={labelStyle}>{t('revenue_total')}</span>
                                <h3 style={{ ...valueStyle, color: primaryColor }}>{fmt(stats.totalRevenue)}</h3>
                            </div>
                            <div style={cardStyle}>
                                <span style={labelStyle}>{t('orders')}</span>
                                <h3 style={valueStyle}>{stats.orderCount}</h3>
                            </div>
                            <div style={cardStyle}>
                                <span style={labelStyle}>{t('avg_ticket')}</span>
                                <h3 style={valueStyle}>{fmt(stats.avgTicket)}</h3>
                            </div>
                            <div style={cardStyle}>
                                <span style={labelStyle}>{t(ORDER_STATUS.DELIVERED)}</span>
                                <h3 style={valueStyle}>{stats.deliveredCount}</h3>
                            </div>
                        </div>

                        {stats.isAtLimit && (
                            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#92400E' }}>
                                ⚠️ Showing first 500 orders. Switch to a shorter date range for full accuracy.
                            </div>
                        )}

                        {/* BOTTOM SECTION — 2 columns on desktop */}
                        <div style={{ display: isMobile ? 'block' : 'grid', gridTemplateColumns: isMobile ? undefined : '1fr 1fr', gap: 24 }}>

                            {/* LEFT COL: order types + payment */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                {/* ORDER TYPE BREAKDOWN */}
                                <div style={cardStyle}>
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
                                <div style={{ ...cardStyle, marginBottom: isMobile ? 20 : 0 }}>
                                    <span style={{ ...labelStyle, marginBottom: 16 }}>{t('payment_methods')}</span>
                                    <div style={{ display: 'flex', gap: 12 }}>
                                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: 12, background: '#EFF6FF', borderRadius: 12 }}>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: '#2563EB' }}>{lang === 'en' ? 'Debit Card' : 'MP'}</div>
                                            <div>
                                                <div style={{ fontSize: 18, fontWeight: 800, color: '#2563EB' }}>{stats.mpCount}</div>
                                                <div style={{ fontSize: 11, color: '#6B7280' }}>{fmt(stats.mpRevenue)}</div>
                                            </div>
                                        </div>
                                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: 12, background: '#F0FDF4', borderRadius: 12 }}>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: '#16A34A' }}>$</div>
                                            <div>
                                                <div style={{ fontSize: 18, fontWeight: 800, color: '#16A34A' }}>{stats.cashCount}</div>
                                                <div style={{ fontSize: 11, color: '#6B7280' }}>{fmt(stats.cashRevenue)}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT COL: top products */}
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
                                                {fmt(item.revenue)}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                        </div>
                    </>
                )}
                </div>
                )}

                {activeTab === 'financials' && (
                  <div>
                    <FinancialTrackerDashboard />
                  </div>
                )}

                {activeTab === 'events' && (
                  <div>
                    <OwnerEventsView
                      businessId={businessId}
                      tenantSlug={tenantSlug}
                      lang={lang}
                      onBack={() => setActiveTab('analytics')}
                    />
                  </div>
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

function AnalyticsGated(props) {
  return (
    <TierGuard feature="analytics">
      <Analytics {...props} />
    </TierGuard>
  )
}

export default AnalyticsGated
