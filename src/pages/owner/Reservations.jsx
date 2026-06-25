import { useState, useEffect, useCallback } from 'react'
import { CalendarDays, Clock, Users, Phone, MessageSquare, Check, X, RefreshCw, Package, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient.js'
import { useTenant } from '../../contexts/TenantContext.jsx'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import BackendNav from '../../components/BackendNav.jsx'

const TABLE_STATUS = {
    pending:   { bg: '#FEF3C7', text: '#92400E', label: { en: 'Pending', es: 'Pendiente', pt: 'Pendente' } },
    approved:  { bg: '#D1FAE5', text: '#065F46', label: { en: 'Approved', es: 'Aprobada', pt: 'Aprovada' } },
    rejected:  { bg: '#FEE2E2', text: '#991B1B', label: { en: 'Rejected', es: 'Rechazada', pt: 'Rejeitada' } },
    no_show:   { bg: '#F3F4F6', text: '#6B7280', label: { en: 'No Show', es: 'No apareció', pt: 'Não compareceu' } },
    completed: { bg: '#EDE9FE', text: '#5B21B6', label: { en: 'Done', es: 'Completada', pt: 'Concluída' } },
}

const CUSTOM_STATUS = {
    pending:          { bg: '#FEF3C7', text: '#92400E', label: { en: 'New Request', es: 'Nueva Solicitud', pt: 'Nova Solicitação' } },
    price_set:        { bg: '#DBEAFE', text: '#1E40AF', label: { en: 'Price Set', es: 'Precio Fijado', pt: 'Preço Definido' } },
    awaiting_deposit: { bg: '#FEF9C3', text: '#854D0E', label: { en: 'Awaiting Deposit', es: 'Esperando Seña', pt: 'Aguardando Sinal' } },
    deposit_paid:     { bg: '#D1FAE5', text: '#065F46', label: { en: 'Deposit Paid ✓', es: 'Seña Pagada ✓', pt: 'Sinal Pago ✓' } },
    ready:            { bg: '#EDE9FE', text: '#5B21B6', label: { en: 'Ready', es: 'Listo', pt: 'Pronto' } },
    completed:        { bg: '#F3F4F6', text: '#374151', label: { en: 'Completed', es: 'Completado', pt: 'Concluído' } },
    cancelled:        { bg: '#FEE2E2', text: '#991B1B', label: { en: 'Cancelled', es: 'Cancelado', pt: 'Cancelado' } },
}

function formatDate(dateStr, lang = 'es') {
    const d = new Date(dateStr + 'T00:00:00')
    const today = new Date(); const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
    if (d.toDateString() === today.toDateString()) return lang === 'en' ? 'Today' : lang === 'pt' ? 'Hoje' : 'Hoy'
    if (d.toDateString() === tomorrow.toDateString()) return lang === 'en' ? 'Tomorrow' : lang === 'pt' ? 'Amanhã' : 'Mañana'
    const locale = lang === 'pt' ? 'pt-BR' : lang === 'en' ? 'en-US' : 'es-AR'
    return d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })
}

function formatTime(t) { return t?.slice(0, 5) || '' }

function formatCents(cents) {
    if (!cents) return ''
    return '$' + (cents / 100).toLocaleString('es-AR', { minimumFractionDigits: 0 })
}

export function ReservationsContent() {
    const { businessId, tenantData } = useTenant()
    const { t, language } = useLanguage()
    const [tab, setTab] = useState('table')
    const [reservations, setReservations] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('pending')
    const [actioning, setActioning] = useState(null)
    const [expandedId, setExpandedId] = useState(null)
    const [priceInputs, setPriceInputs] = useState({})

    const ownerPhone = tenantData?.whatsapp_number || tenantData?.app_config?.businessInfo?.whatsapp || tenantData?.phone || null

    const fetchReservations = useCallback(async () => {
        if (!businessId) return
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('reservations')
                .select('*')
                .eq('business_id', businessId)
                .order('reservation_date', { ascending: true })
                .order('reservation_time', { ascending: true })
            if (!error && data) setReservations(data)
        } finally { setLoading(false) }
    }, [businessId])

    useEffect(() => { fetchReservations() }, [fetchReservations])

    useEffect(() => {
        if (!businessId) return
        const ch = supabase
            .channel(`owner-res-${businessId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations', filter: `business_id=eq.${businessId}` }, fetchReservations)
            .subscribe()
        return () => supabase.removeChannel(ch)
    }, [businessId, fetchReservations])

    const updateStatus = async (id, status, extra = {}) => {
        setActioning(id + status)
        try {
            await supabase.from('reservations').update({ status, ...extra }).eq('id', id).eq('business_id', businessId)
            setReservations(prev => prev.map(r => r.id === id ? { ...r, status, ...extra } : r))
        } finally { setActioning(null) }
    }

    const setPrice = async (r) => {
        const raw = priceInputs[r.id] || ''
        const parsed = Math.round(parseFloat(raw.replace(',', '.')) * 100)
        if (!parsed || isNaN(parsed) || parsed <= 0) return
        setActioning(r.id + 'price')
        const deposit = Math.round(parsed / 2)
        try {
            await supabase.from('reservations').update({ total_price_cents: parsed, deposit_cents: deposit, status: 'price_set' })
                .eq('id', r.id).eq('business_id', businessId)
            setReservations(prev => prev.map(x => x.id === r.id ? { ...x, total_price_cents: parsed, deposit_cents: deposit, status: 'price_set' } : x))
        } finally { setActioning(null) }
    }

    const sendDepositLink = (r) => {
        if (!ownerPhone || !r.customer_phone) return
        const deposit = formatCents(r.deposit_cents)
        const total = formatCents(r.total_price_cents)
        const msg =
            `💰 *${t('res_owner_deposit')} - ${r.custom_item_description || ''}*\n\n` +
            `👤 ${r.customer_name}\n` +
            `📦 *${t('res_owner_total')}:* ${total}\n` +
            `💳 *${t('res_owner_deposit')}:* ${deposit}\n` +
            `📆 ${formatDate(r.reservation_date, language)}\n` +
            `\n✅ Enviame el comprobante por este chat para confirmar.`
        const custPhone = r.customer_phone.replace(/\D/g, '')
        window.open(`https://wa.me/${custPhone}?text=${encodeURIComponent(msg)}`, '_blank')
        updateStatus(r.id, 'awaiting_deposit')
    }

    // Split by type
    const tableRes = reservations.filter(r => !r.reservation_type || r.reservation_type === 'table')
    const customRes = reservations.filter(r => r.reservation_type === 'custom')

    const tableFiltered = tableRes.filter(r => {
        if (filter === 'pending') return r.status === 'pending'
        if (filter === 'approved') return r.status === 'approved'
        if (filter === 'rejected') return r.status === 'rejected'
        return true
    })

    const customFiltered = customRes.filter(r => {
        if (filter === 'pending') return r.status === 'pending'
        if (filter === 'active') return ['price_set', 'awaiting_deposit', 'deposit_paid', 'ready'].includes(r.status)
        if (filter === 'done') return ['completed', 'cancelled'].includes(r.status)
        return true
    })

    const pendingTable = tableRes.filter(r => r.status === 'pending').length
    const pendingCustom = customRes.filter(r => r.status === 'pending').length
    const totalPending = pendingTable + pendingCustom

    return (
        <div>
            {/* Header */}
            <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '20px 20px 0', position: 'sticky', top: 0, zIndex: 10 }}>
                <div style={{ maxWidth: 800, margin: '0 auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                        <div>
                            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: 0 }}>{t('reservations_title')}</h1>
                            {totalPending > 0 && (
                                <p style={{ fontSize: 13, color: '#F59E0B', fontWeight: 600, margin: '2px 0 0' }}>
                                    {totalPending} {language === 'en' ? 'pending' : language === 'pt' ? 'pendentes' : 'pendientes'}
                                </p>
                            )}
                        </div>
                        <button onClick={fetchReservations}
                            style={{ width: 36, height: 36, borderRadius: 20, border: '1px solid #E5E7EB', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <RefreshCw size={15} color="#6B7280" />
                        </button>
                    </div>

                    {/* Type tabs */}
                    <div style={{ display: 'flex', background: '#F3F4F6', borderRadius: 12, padding: 3, marginBottom: 12 }}>
                        {[
                            { id: 'table', label: t('res_owner_table_tab'), icon: '🍽️', count: pendingTable },
                            { id: 'custom', label: t('res_owner_custom_tab'), icon: '🎂', count: pendingCustom }
                        ].map(x => (
                            <button key={x.id} onClick={() => { setTab(x.id); setFilter(x.id === 'table' ? 'pending' : 'pending') }}
                                style={{
                                    flex: 1, padding: '9px 8px', borderRadius: 9, border: 'none',
                                    background: tab === x.id ? '#fff' : 'transparent',
                                    color: tab === x.id ? '#111827' : '#9CA3AF',
                                    fontWeight: 700, fontSize: 13, cursor: 'pointer',
                                    boxShadow: tab === x.id ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                                    transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                                }}>
                                {x.icon} {x.label}
                                {x.count > 0 && (
                                    <span style={{ background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 20 }}>{x.count}</span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Status filter tabs */}
                    <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 0 }}>
                        {tab === 'table' ? (
                            [
                                { id: 'pending', label: `${language === 'en' ? 'Pending' : language === 'pt' ? 'Pendentes' : 'Pendientes'}${pendingTable > 0 ? ` (${pendingTable})` : ''}` },
                                { id: 'approved', label: language === 'en' ? 'Approved' : language === 'pt' ? 'Aprovadas' : 'Aprobadas' },
                                { id: 'rejected', label: language === 'en' ? 'Rejected' : language === 'pt' ? 'Rejeitadas' : 'Rechazadas' },
                                { id: 'all', label: t('reservations_all') },
                            ]
                        ) : (
                            [
                                { id: 'pending', label: `${language === 'en' ? 'New' : language === 'pt' ? 'Novos' : 'Nuevos'}${pendingCustom > 0 ? ` (${pendingCustom})` : ''}` },
                                { id: 'active', label: language === 'en' ? 'In Progress' : language === 'pt' ? 'Em Andamento' : 'En Proceso' },
                                { id: 'done', label: language === 'en' ? 'Done' : language === 'pt' ? 'Prontos' : 'Listos' },
                                { id: 'all', label: t('reservations_all') },
                            ]
                        )}.map(f => (
                            <button key={f.id} onClick={() => setFilter(f.id)}
                                style={{
                                    padding: '8px 14px', borderRadius: 20, border: 'none', whiteSpace: 'nowrap',
                                    background: filter === f.id ? '#111827' : 'transparent',
                                    color: filter === f.id ? '#fff' : '#6B7280',
                                    fontWeight: 600, fontSize: 13, cursor: 'pointer',
                                    transition: 'all 0.15s'
                                }}>
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Cards */}
            <div style={{ maxWidth: 800, margin: '20px auto', padding: '0 16px' }}>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                        <div style={{ width: 32, height: 32, border: '3px solid #10B981', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                    </div>
                ) : (tab === 'table' ? tableFiltered : customFiltered).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                        <CalendarDays size={40} color="#D1D5DB" style={{ margin: '0 auto 12px' }} />
                        <p style={{ color: '#9CA3AF', fontSize: 15 }}>{t('reservation_empty')}</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                        {/* ── TABLE CARDS ── */}
                        {tab === 'table' && tableFiltered.map(r => {
                            const sc = TABLE_STATUS[r.status] || TABLE_STATUS.pending
                            const isPending = r.status === 'pending'
                            return (
                                <div key={r.id} style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: isPending ? '2px solid #FCD34D' : '1px solid #E5E7EB' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                <CalendarDays size={14} color="#6B7280" />
                                                <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{formatDate(r.reservation_date, language)}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Clock size={13} color="#9CA3AF" />
                                                <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{formatTime(r.reservation_time)}</span>
                                            </div>
                                        </div>
                                        <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: sc.bg, color: sc.text }}>
                                            {sc.label[language] || sc.label.es}
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <span style={{ fontSize: 16, fontWeight: 800, color: '#111827' }}>{r.customer_name}</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <Users size={13} color="#6B7280" />
                                            <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{r.party_size} {t('reservation_people')}</span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: r.notes ? 8 : 0 }}>
                                        <Phone size={13} color="#9CA3AF" />
                                        <a href={`https://wa.me/${r.customer_phone?.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                                            style={{ fontSize: 14, fontWeight: 600, color: '#3B82F6', textDecoration: 'none' }}>
                                            {r.customer_phone}
                                        </a>
                                    </div>

                                    {r.notes && (
                                        <div style={{ display: 'flex', gap: 6, padding: '8px 12px', background: '#F9FAFB', borderRadius: 10, marginTop: 8 }}>
                                            <MessageSquare size={13} color="#9CA3AF" style={{ marginTop: 2, flexShrink: 0 }} />
                                            <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>{r.notes}</p>
                                        </div>
                                    )}

                                    {isPending && (
                                        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                                            <button onClick={() => updateStatus(r.id, 'rejected')} disabled={!!actioning}
                                                style={{ flex: 1, padding: '10px 0', borderRadius: 20, border: 'none', background: '#FEE2E2', color: '#DC2626', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                                <X size={14} /> {t('reservation_reject')}
                                            </button>
                                            <button onClick={() => updateStatus(r.id, 'approved')} disabled={!!actioning}
                                                style={{ flex: 2, padding: '10px 0', borderRadius: 20, border: 'none', background: '#D1FAE5', color: '#065F46', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                                <Check size={14} /> {t('reservation_approve')}
                                            </button>
                                        </div>
                                    )}

                                    {r.status === 'approved' && (
                                        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                                            <button onClick={() => updateStatus(r.id, 'no_show')} disabled={!!actioning}
                                                style={{ flex: 1, padding: '8px 0', borderRadius: 20, border: '1px solid #E5E7EB', background: '#fff', color: '#6B7280', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                                                {t('reservation_no_show')}
                                            </button>
                                            <button onClick={() => updateStatus(r.id, 'completed')} disabled={!!actioning}
                                                style={{ flex: 1, padding: '8px 0', borderRadius: 20, border: 'none', background: '#EDE9FE', color: '#5B21B6', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                                                ✓ {language === 'en' ? 'Arrived' : language === 'pt' ? 'Chegou' : 'Se presentó'}
                                            </button>
                                        </div>
                                    )}

                                    <p style={{ fontSize: 11, color: '#D1D5DB', margin: '10px 0 0', textAlign: 'right' }}>
                                        {new Date(r.created_at).toLocaleDateString(language === 'pt' ? 'pt-BR' : language === 'en' ? 'en-US' : 'es-AR')}
                                    </p>
                                </div>
                            )
                        })}

                        {/* ── CUSTOM ORDER CARDS ── */}
                        {tab === 'custom' && customFiltered.map(r => {
                            const sc = CUSTOM_STATUS[r.status] || CUSTOM_STATUS.pending
                            const isExpanded = expandedId === r.id
                            const isPending = r.status === 'pending'
                            const isPriceSet = r.status === 'price_set'
                            const isDepositPaid = r.status === 'deposit_paid'
                            return (
                                <div key={r.id} style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: isPending ? '2px solid #FCD34D' : '1px solid #E5E7EB', overflow: 'hidden' }}>
                                    {/* Card header — always visible */}
                                    <button onClick={() => setExpandedId(isExpanded ? null : r.id)}
                                        style={{ width: '100%', padding: 20, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                    <Package size={14} color="#6B7280" />
                                                    <span style={{ fontSize: 15, fontWeight: 800, color: '#111827' }}>{r.customer_name}</span>
                                                </div>
                                                <p style={{ fontSize: 13, color: '#6B7280', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {r.custom_item_description}
                                                </p>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, marginLeft: 12 }}>
                                                <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: sc.bg, color: sc.text, whiteSpace: 'nowrap' }}>
                                                    {sc.label[language] || sc.label.es}
                                                </span>
                                                {isExpanded ? <ChevronUp size={16} color="#9CA3AF" /> : <ChevronDown size={16} color="#9CA3AF" />}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <CalendarDays size={12} color="#9CA3AF" />
                                                <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>{formatDate(r.reservation_date, language)}</span>
                                            </div>
                                            {r.reservation_time && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <Clock size={12} color="#9CA3AF" />
                                                    <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>{formatTime(r.reservation_time)}</span>
                                                </div>
                                            )}
                                            {r.total_price_cents && (
                                                <span style={{ fontSize: 12, fontWeight: 700, color: '#10B981' }}>
                                                    {t('res_owner_total')}: {formatCents(r.total_price_cents)}
                                                </span>
                                            )}
                                        </div>
                                    </button>

                                    {/* Expanded details */}
                                    {isExpanded && (
                                        <div style={{ padding: '0 20px 20px', borderTop: '1px solid #F3F4F6' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>

                                                {/* Full description */}
                                                <div style={{ background: '#F9FAFB', borderRadius: 10, padding: '10px 14px' }}>
                                                    <p style={{ fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>{t('res_what_you_need')}</p>
                                                    <p style={{ fontSize: 14, color: '#374151', margin: 0 }}>{r.custom_item_description}</p>
                                                </div>

                                                {/* Occasion */}
                                                {r.occasion && (
                                                    <div style={{ background: '#F9FAFB', borderRadius: 10, padding: '10px 14px' }}>
                                                        <p style={{ fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>{t('res_occasion')}</p>
                                                        <p style={{ fontSize: 14, color: '#374151', margin: 0 }}>{r.occasion}</p>
                                                    </div>
                                                )}

                                                {/* Contact + type row */}
                                                <div style={{ display: 'flex', gap: 10 }}>
                                                    <a href={`https://wa.me/${r.customer_phone?.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                                                        style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', background: '#F0FDF4', borderRadius: 10, textDecoration: 'none' }}>
                                                        <Phone size={14} color="#10B981" />
                                                        <span style={{ fontSize: 13, fontWeight: 700, color: '#065F46' }}>{r.customer_phone}</span>
                                                    </a>
                                                    <div style={{ padding: '10px 14px', background: '#EFF6FF', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <span style={{ fontSize: 13, fontWeight: 700, color: '#1E40AF' }}>
                                                            {r.pickup_or_delivery === 'delivery' ? `🚗 ${t('res_delivery')}` : `🏠 ${t('res_pickup')}`}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Notes */}
                                                {r.notes && (
                                                    <div style={{ display: 'flex', gap: 6, padding: '8px 12px', background: '#F9FAFB', borderRadius: 10 }}>
                                                        <MessageSquare size={13} color="#9CA3AF" style={{ marginTop: 2, flexShrink: 0 }} />
                                                        <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>{r.notes}</p>
                                                    </div>
                                                )}

                                                {/* Price setter — only on pending/price_set */}
                                                {(isPending || isPriceSet) && !isDepositPaid && (
                                                    <div style={{ background: '#F8FAFF', borderRadius: 12, padding: 14, border: '1px solid #DBEAFE' }}>
                                                        <p style={{ fontSize: 12, fontWeight: 700, color: '#1E40AF', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>
                                                            {t('res_owner_set_price')}
                                                        </p>
                                                        <div style={{ display: 'flex', gap: 8 }}>
                                                            <div style={{ flex: 1, position: 'relative' }}>
                                                                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: '#9CA3AF', fontWeight: 700 }}>$</span>
                                                                <input
                                                                    type="number"
                                                                    value={priceInputs[r.id] || ''}
                                                                    onChange={e => setPriceInputs(p => ({ ...p, [r.id]: e.target.value }))}
                                                                    placeholder="0"
                                                                    style={{ width: '100%', padding: '12px 12px 12px 28px', borderRadius: 10, border: '1.5px solid #DBEAFE', fontSize: 16, fontWeight: 700, outline: 'none', boxSizing: 'border-box' }}
                                                                />
                                                            </div>
                                                            <button onClick={() => setPrice(r)} disabled={actioning === r.id + 'price'}
                                                                style={{ padding: '12px 18px', borderRadius: 10, border: 'none', background: '#3B82F6', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                                                                ✓
                                                            </button>
                                                        </div>
                                                        {r.total_price_cents && (
                                                            <p style={{ fontSize: 12, color: '#6B7280', margin: '8px 0 0' }}>
                                                                {t('res_owner_deposit')}: <strong style={{ color: '#10B981' }}>{formatCents(r.deposit_cents)}</strong>
                                                            </p>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Deposit link button */}
                                                {isPriceSet && r.total_price_cents && (
                                                    <button onClick={() => sendDepositLink(r)}
                                                        style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: '#25D366', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                                        📲 {t('res_owner_send_link')} ({formatCents(r.deposit_cents)})
                                                    </button>
                                                )}

                                                {/* Deposit paid — mark actions */}
                                                {isDepositPaid && (
                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <button onClick={() => updateStatus(r.id, 'ready')} disabled={!!actioning}
                                                            style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: '#EDE9FE', color: '#5B21B6', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                                                            🎯 {t('res_owner_mark_ready')}
                                                        </button>
                                                    </div>
                                                )}

                                                {r.status === 'ready' && (
                                                    <button onClick={() => updateStatus(r.id, 'completed')}
                                                        style={{ width: '100%', padding: 12, borderRadius: 12, border: 'none', background: '#D1FAE5', color: '#065F46', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                                                        ✓ {language === 'en' ? 'Mark Completed' : language === 'pt' ? 'Marcar Concluído' : 'Marcar Completado'}
                                                    </button>
                                                )}

                                                {/* Cancel option */}
                                                {!['completed', 'cancelled'].includes(r.status) && (
                                                    <button onClick={() => updateStatus(r.id, 'cancelled')} disabled={!!actioning}
                                                        style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid #FEE2E2', background: '#fff', color: '#DC2626', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                                                        {language === 'en' ? 'Cancel Order' : language === 'pt' ? 'Cancelar Pedido' : 'Cancelar Pedido'}
                                                    </button>
                                                )}
                                            </div>
                                            <p style={{ fontSize: 11, color: '#D1D5DB', margin: '12px 0 0', textAlign: 'right' }}>
                                                ID: {r.id.slice(0, 8)} · {new Date(r.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

export default function Reservations() {
    return (
        <div style={{ minHeight: '100vh', background: '#F8F9FA', paddingBottom: 100 }}>
            <ReservationsContent />
            <BackendNav useRoutes={true} role="owner" />
        </div>
    )
}
