import { useState, useMemo } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useTenant } from '../../contexts/TenantContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { useOrdersPolling } from '../../hooks/useOrdersPolling'
import { formatPrice } from '../../config/menuData'
import { formatAddressForDisplay, generateDriverMessage } from '../../utils/logistics'
import BurgerLoader from '../../components/BurgerLoader'
import BackendNav from '../../components/BackendNav'

const T = {
  bg:       '#F4F6F9',
  card:     '#FFFFFF',
  ink:      '#0F1B2D',
  ink2:     '#1F2A3D',
  body:     '#3D4A5C',
  muted:    '#7A8699',
  muted2:   '#9AA4B5',
  line:     '#E6EAF0',
  line2:    '#EEF1F5',
  blueBg:   '#EAF1FB',
  blueInk:  '#1B4FB1',
  redBg:    '#FBECEC',
  redInk:   '#B33A3A',
  greenBg:  '#E2F5EA',
  greenInk: '#1F7A45',
  online:   '#1F7A45',
  onlineBg: '#E7F6EE',
  statCash: '#D9892F',
  statTodo: '#5E6B7A',
  statPrep: '#2563D9',
  statReady:'#D9892F',
  statOut:  '#2A8B5A',
}

const OWNER_STATS = [
  { key: 'cash', label: 'CASH', color: T.statCash, matches: ['pending_payment'] },
  { key: 'todo', label: 'TO-DO', color: T.statTodo, matches: ['paid_unreleased'] },
  { key: 'prep', label: 'PREP', color: T.statPrep, matches: ['released_to_kitchen', 'preparing'] },
  { key: 'ready', label: 'READY', color: T.statReady, matches: ['ready'] },
  { key: 'out', label: 'OUT', color: T.statOut, matches: ['dispatched'] },
]

const STATUS_FLOW = [
  { key: 'pending_payment', label: 'Verify Payment' },
  { key: 'paid_unreleased', label: 'Send to Kitchen' },
  { key: 'released_to_kitchen', label: 'Mark Ready' },
  { key: 'preparing', label: 'Mark Ready' },
  { key: 'ready', label: 'Hand Off' },
  { key: 'dispatched', label: 'Mark Delivered' },
  { key: 'delivered', label: null },
  { key: 'cancelled', label: null },
]

function statusToBucket(status) {
  for (const s of OWNER_STATS) {
    if (s.matches.includes(status)) return s.key
  }
  return null
}

function nextActionFor(status) {
  const flow = STATUS_FLOW.find(f => f.key === status)
  return flow?.label ? { label: flow.label, intent: 'blue' } : null
}

function Icon({ type, color = T.muted, size = 16 }) {
  const icons = {
    dollar: <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 6.5a4 4 0 0 0-4-2.5h-2a3.5 3.5 0 0 0 0 7h2a3.5 3.5 0 0 1 0 7h-2.5A4 4 0 0 1 6.5 16" /></svg>,
    clock: <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
    chef: <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 14h12v5a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-5z" /><path d="M7 14a4 4 0 1 1 1.5-7.7A3.5 3.5 0 0 1 12 4a3.5 3.5 0 0 1 3.5 2.3A4 4 0 1 1 17 14" /></svg>,
    box: <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7l9-4 9 4v10l-9 4-9-4V7zM3 7l9 4 9-4M12 11v10" /></svg>,
    bike: <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="17" r="3.5" /><circle cx="18" cy="17" r="3.5" /><path d="M6 17l4-9h4l3 9M10 8l-1-3h-2" /></svg>,
    grid: <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.4" /><rect x="14" y="3" width="7" height="7" rx="1.4" /><rect x="3" y="14" width="7" height="7" rx="1.4" /><rect x="14" y="14" width="7" height="7" rx="1.4" /></svg>,
    chevron: <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>,
    x: <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6L6 18" /></svg>,
    trend: <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l6-6 4 4 8-8M14 7h7v7" /></svg>,
    wifi: <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0 1 14 0M2 8.5a16 16 0 0 1 20 0M8.5 16.43a6 6 0 0 1 7 0" /><circle cx="12" cy="20" r="1" /></svg>,
  }
  return icons[type]
}

function StatTile({ statKey, label, count, accent }) {
  const iconMap = { cash: 'dollar', todo: 'clock', prep: 'chef', ready: 'box', out: 'bike' }
  return (
    <button style={{
      flex: 1, minWidth: 56, background: T.card, border: `1px solid ${T.line}`,
      borderRadius: 12, padding: '10px 6px', display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: 4, boxShadow: '0 1px 0 rgba(15,27,45,0.02)',
      cursor: 'pointer', fontFamily: 'inherit',
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 999, background: accent + '1A',
        display: 'grid', placeItems: 'center',
      }}>
        <Icon type={iconMap[statKey]} color={accent} size={16} />
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: T.ink, letterSpacing: '-0.02em', lineHeight: 1 }}>
        {count}
      </div>
      <div style={{ fontSize: 10, color: T.muted, fontWeight: 600, letterSpacing: '0.08em' }}>
        {label}
      </div>
    </button>
  )
}

function TagPill({ children, tone = 'green' }) {
  const tones = {
    green: { bg: T.greenBg, fg: T.greenInk },
    blue: { bg: T.blueBg, fg: T.blueInk },
  }
  const t = tones[tone]
  return (
    <span style={{
      background: t.bg, color: t.fg, fontSize: 11.5, fontWeight: 600,
      padding: '3px 9px', borderRadius: 6, letterSpacing: '-0.005em',
    }}>
      {children}
    </span>
  )
}

function ActionButton({ intent = 'blue', icon, children, onClick }) {
  const styles = {
    blue: { bg: T.blueBg, fg: T.blueInk },
    red: { bg: T.redBg, fg: T.redInk },
  }
  const s = styles[intent]
  return (
    <button onClick={onClick} style={{
      width: '100%', border: 'none', background: s.bg, color: s.fg, fontSize: 14.5,
      fontWeight: 600, padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
      fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 7, letterSpacing: '-0.005em',
    }}>
      {icon}{children}
    </button>
  )
}

function OrderCard({ order, onAdvance, onCancel }) {
  const next = nextActionFor(order.status)
  const isDelivery = order.order_type === 'delivery'
  const bucket = statusToBucket(order.status)
  const bucketLabel = OWNER_STATS.find(s => s.key === bucket)?.label || order.status.toUpperCase()
  const placedTime = new Date(order.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const minsAgo = Math.max(0, Math.round((Date.now() - new Date(order.created_at)) / 60000))
  const timeStr = minsAgo < 1 ? 'just now' : minsAgo < 60 ? `${minsAgo}m` : `${Math.floor(minsAgo / 60)}h`

  return (
    <div style={{
      background: T.card, borderRadius: 14, boxShadow: '0 1px 2px rgba(15,27,45,0.04), 0 4px 12px rgba(15,27,45,0.04)',
      padding: 16, marginBottom: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: T.ink, letterSpacing: '-0.02em' }}>
          #{String(order.order_number).padStart(3, '0')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: T.muted, fontSize: 13, fontWeight: 500 }}>
          <Icon type="clock" color={T.muted} size={14} />
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{timeStr}</span>
        </div>
      </div>

      <div style={{
        width: 18, height: 18, borderRadius: 999, border: `1.5px solid ${T.muted2}`,
        marginBottom: 10,
      }} />

      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 17, fontWeight: 700, color: T.ink, letterSpacing: '-0.015em' }}>
          {order.customer_name || 'Guest'}
        </span>
        <TagPill tone="green">{isDelivery ? 'DELIVERY' : 'PICKUP'}</TagPill>
        {order.delivery_address && typeof order.delivery_address === 'string' && (
          <TagPill tone="green">{order.delivery_address.split(' ').slice(0, 2).join(' ')}</TagPill>
        )}
      </div>

      <div style={{ color: T.muted, fontSize: 14, marginBottom: 12 }}>
        {(order.items || []).length} {(order.items || []).length === 1 ? 'item' : 'items'}
        <span style={{ margin: '0 6px', color: T.muted2 }}>·</span>
        <span style={{ fontWeight: 700, color: T.ink2, fontVariantNumeric: 'tabular-nums' }}>
          {formatPrice(order.total)}
        </span>
      </div>

      <div style={{ borderTop: `1px solid ${T.line2}`, margin: '0 -16px 12px' }} />

      {next && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ActionButton
            intent="blue"
            icon={<Icon type="chevron" color={T.blueInk} size={14} />}
            onClick={() => onAdvance(order)}
          >
            {next.label}
          </ActionButton>
          <ActionButton
            intent="red"
            icon={<Icon type="x" color={T.redInk} size={14} />}
            onClick={() => onCancel(order)}
          >
            Cancel Order
          </ActionButton>
        </div>
      )}
      {order.status === 'delivered' && (
        <div style={{
          textAlign: 'center', color: T.greenInk, fontWeight: 600, padding: '10px 0',
          background: T.greenBg, borderRadius: 10, fontSize: 14,
        }}>
          ✓ Delivered
        </div>
      )}
      {order.status === 'cancelled' && (
        <div style={{
          textAlign: 'center', color: T.redInk, fontWeight: 600, padding: '10px 0',
          background: T.redBg, borderRadius: 10, fontSize: 14,
        }}>
          Cancelled
        </div>
      )}

      <div style={{
        display: 'flex', justifyContent: 'space-between', marginTop: 12,
        fontSize: 11, color: T.muted2, fontWeight: 600, letterSpacing: '0.06em',
      }}>
        <span>{bucketLabel}</span>
        <span style={{ color: T.muted }}>Tap for details</span>
      </div>
    </div>
  )
}

function ActiveTabPills({ tab, setTab, counts }) {
  return (
    <div style={{ display: 'flex', gap: 10, padding: '0 16px 14px' }}>
      {[['active', 'Active', counts.active], ['completed', 'Completed', counts.completed]].map(([k, label, n]) => {
        const on = tab === k
        return (
          <button key={k} onClick={() => setTab(k)} style={{
            flex: 1, border: on ? `1.5px solid ${T.statPrep}` : `1px solid ${T.line}`,
            background: T.card, color: on ? T.statPrep : T.muted, fontWeight: 600,
            fontSize: 14, padding: '11px 0', borderRadius: 12, cursor: 'pointer',
            fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 7, letterSpacing: '-0.005em',
          }}>
            <Icon type="clock" color={on ? T.statPrep : T.muted} size={14} />
            {label}
            <span style={{ color: on ? T.statPrep : T.muted2, fontWeight: 600, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
              {n}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function OnlinePill() {
  return (
    <div style={{
      background: T.onlineBg, padding: '7px 14px', display: 'flex', alignItems: 'center',
      borderBottom: `1px solid ${T.line2}`,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7, color: T.online, fontWeight: 600,
        fontSize: 11, letterSpacing: '0.06em',
      }}>
        <Icon type="wifi" color={T.online} size={13} />
        ONLINE
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { businessId, tenantData } = useTenant()
  const { orders, loading, refreshOrders } = useOrdersPolling(businessId)
  const [tab, setTab] = useState('active')
  const [filterBucket, setFilterBucket] = useState(null)
  const [processingOrderId, setProcessingOrderId] = useState(null)

  const counts = useMemo(() => {
    const bucket = {}
    OWNER_STATS.forEach(s => bucket[s.key] = 0)
    orders.forEach(o => {
      const b = statusToBucket(o.status)
      if (b) bucket[b]++
    })
    return {
      ...bucket,
      active: orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length,
      completed: orders.filter(o => ['delivered', 'cancelled'].includes(o.status)).length,
      delivered: orders.filter(o => o.status === 'delivered').length,
    }
  }, [orders])

  const filtered = useMemo(() => {
    return orders.filter(o => {
      const completed = ['delivered', 'cancelled'].includes(o.status)
      if (tab === 'active' ? completed : !completed) return false
      if (filterBucket) return statusToBucket(o.status) === filterBucket
      return true
    })
  }, [orders, tab, filterBucket])

  const advance = async (order) => {
    const flowIdx = STATUS_FLOW.findIndex(f => f.key === order.status)
    const next = STATUS_FLOW[flowIdx + 1]
    if (!next) return

    setProcessingOrderId(order.id)
    try {
      await supabase.rpc('advance_order_status', {
        p_order_id: order.id,
        p_target_status: next.key,
      })
      refreshOrders()
    } finally {
      setProcessingOrderId(null)
    }
  }

  const cancel = async (order) => {
    setProcessingOrderId(order.id)
    try {
      await supabase.from('orders').update({ status: 'cancelled' }).eq('id', order.id)
      refreshOrders()
    } finally {
      setProcessingOrderId(null)
    }
  }

  const todayRev = orders.filter(o => o.status !== 'cancelled').reduce((a, o) => a + o.total, 0)

  if (loading) return <BurgerLoader />

  return (
    <div style={{
      width: '100%', height: '100vh', background: T.bg, color: T.ink,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      display: 'grid', gridTemplateRows: 'auto 1fr auto', overflow: 'hidden',
    }}>
      <OnlinePill />

      <div style={{ overflowY: 'auto' }}>
        <div style={{ padding: '16px 16px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: T.statPrep, marginBottom: 4 }}>
            <Icon type="grid" color={T.statPrep} size={22} />
            <h1 style={{ margin: 0, color: T.ink, fontSize: 28, fontWeight: 800, letterSpacing: '-0.025em' }}>
              Owner HQ
            </h1>
          </div>
          <div style={{ color: T.muted, fontSize: 14, marginTop: 4 }}>
            {counts.active} active · {counts.cash} cash pending · {counts.delivered} delivered today
          </div>

          <div style={{
            marginTop: 14, background: T.card, borderRadius: 14, border: `1px solid ${T.line}`,
            padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, letterSpacing: '0.08em', marginBottom: 4 }}>
                TODAY
              </div>
              <div style={{
                fontSize: 26, fontWeight: 800, color: T.ink, letterSpacing: '-0.025em', lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {formatPrice(todayRev)}
              </div>
              <div style={{ color: T.muted, fontSize: 12.5, marginTop: 4 }}>
                across {orders.filter(o => o.status !== 'cancelled').length} orders
              </div>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, background: T.greenBg, color: T.greenInk,
              padding: '7px 11px', borderRadius: 999, fontSize: 12.5, fontWeight: 600,
            }}>
              <Icon type="trend" color={T.greenInk} size={16} /> +18% vs yest
            </div>
          </div>
        </div>

        <div style={{ padding: '0 16px 16px', display: 'flex', gap: 8 }}>
          {OWNER_STATS.map(s => (
            <button key={s.key}
              onClick={() => setFilterBucket(filterBucket === s.key ? null : s.key)}
              style={{
                flex: 1, padding: 0, background: 'transparent', border: 'none', cursor: 'pointer',
                opacity: !filterBucket || filterBucket === s.key ? 1 : 0.45, transition: 'opacity 160ms',
              }}>
              <StatTile statKey={s.key} label={s.label} count={counts[s.key] || 0} accent={s.color} />
            </button>
          ))}
        </div>

        <ActiveTabPills tab={tab} setTab={setTab} counts={counts} />

        <div style={{ padding: '0 16px 24px' }}>
          {filterBucket && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px 12px',
            }}>
              <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, letterSpacing: '0.06em' }}>
                FILTERED · {OWNER_STATS.find(s => s.key === filterBucket).label}
              </div>
              <button onClick={() => setFilterBucket(null)} style={{
                border: 'none', background: 'transparent', color: T.statPrep, fontSize: 12.5, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                Clear ×
              </button>
            </div>
          )}

          {filtered.length === 0 ? (
            <div style={{
              background: T.card, borderRadius: 14, border: `1px dashed ${T.line}`,
              padding: '40px 20px', textAlign: 'center', color: T.muted,
            }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: T.ink2, marginBottom: 4 }}>
                Nothing here.
              </div>
              <div style={{ fontSize: 13 }}>New {tab} orders will appear here.</div>
            </div>
          ) : (
            filtered.map(o => (
              <OrderCard
                key={o.id}
                order={o}
                onAdvance={() => advance(o)}
                onCancel={() => cancel(o)}
              />
            ))
          )}
        </div>
      </div>

      <BackendNav />
    </div>
  )
}
