import { useState, useMemo, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useTenant } from '../../contexts/TenantContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { useOrdersPolling } from '../../hooks/useOrdersPolling'
import { useKDSAudio } from '../../hooks/useKDSAudio'
import { VolumeIcon, BellIcon } from '../../components/AudioIcons'
import { formatPrice } from '../../config/menuData'
import { formatAddressForDisplay, generateDriverMessage } from '../../utils/logistics'
import BurgerLoader from '../../components/BurgerLoader'
import BackendNav from '../../components/BackendNav'
import BackendHeader from '../../components/BackendHeader'
import { ORDER_STATUS } from '../../constants/database.js';
import { PAYMENT_METHOD } from '../../constants/database.js';
import { canAdvanceOrder } from '../../utils/orderStateGuard'
import CreateOrderModal from './CreateOrderModal.jsx'

// KDS Grid layout: Desktop/Tablet only. Mobile uses original single-column layout.
const kdsGridStyles = `
  @media (min-width: 768px) {
    .kds-order-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 12px;
    }
    .kds-order-card {
      margin-bottom: 0 !important;
    }
  }
  @media (max-width: 767px) {
    .kds-order-grid {
      display: flex;
      flex-direction: column;
    }
  }
`



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

const OWNER_STATS = (t) => [
  { key: PAYMENT_METHOD.CASH, label: t('cash').toUpperCase(), color: T.statCash, matches: [ORDER_STATUS.PENDING_PAYMENT] },
  { key: 'todo', label: 'TO-DO', color: T.statTodo, matches: [ORDER_STATUS.PAID_UNRELEASED] },
  { key: 'prep', label: 'PREP', color: T.statPrep, matches: [ORDER_STATUS.RELEASED_TO_KITCHEN, ORDER_STATUS.PREPARING] },
  { key: ORDER_STATUS.READY, label: t('ready_status').toUpperCase(), color: T.statReady, matches: [ORDER_STATUS.READY] },
  { key: 'out', label: t('on_way_status').toUpperCase(), color: T.statOut, matches: [ORDER_STATUS.DISPATCHED] },
]

const FLOW_MAP = (t) => ({
  delivery: [
    { from: ORDER_STATUS.PENDING_PAYMENT,  to: ORDER_STATUS.RELEASED_TO_KITCHEN, label: t('confirm_payment'), intent: 'orange', isPaymentConfirm: true },
    { from: ORDER_STATUS.PAID_UNRELEASED,  to: ORDER_STATUS.RELEASED_TO_KITCHEN, label: t('confirm_payment'), intent: 'orange', isPaymentConfirm: true },
    { from: ORDER_STATUS.RELEASED_TO_KITCHEN, to: ORDER_STATUS.PREPARING, label: t('start_prep'), intent: 'blue' },
    { from: ORDER_STATUS.PREPARING,        to: ORDER_STATUS.READY,      label: t('mark_ready'), intent: 'blue' },
    { from: ORDER_STATUS.READY,            to: ORDER_STATUS.DISPATCHED, label: t('dispatch_order'),   intent: 'blue' },
    { from: ORDER_STATUS.DISPATCHED,       to: ORDER_STATUS.DELIVERED,  label: t('mark_delivered'), intent: 'green' },
  ],
  pickup: [
    { from: ORDER_STATUS.PENDING_PAYMENT,  to: ORDER_STATUS.RELEASED_TO_KITCHEN, label: t('confirm_payment'), intent: 'orange', isPaymentConfirm: true },
    { from: ORDER_STATUS.PAID_UNRELEASED,  to: ORDER_STATUS.RELEASED_TO_KITCHEN, label: t('confirm_payment'), intent: 'orange', isPaymentConfirm: true },
    { from: ORDER_STATUS.RELEASED_TO_KITCHEN, to: ORDER_STATUS.PREPARING, label: t('start_prep'), intent: 'blue' },
    { from: ORDER_STATUS.PREPARING,        to: ORDER_STATUS.READY,      label: t('mark_ready'), intent: 'blue' },
    { from: ORDER_STATUS.READY,            to: ORDER_STATUS.DELIVERED,  label: t('hand_over'),  intent: 'green' },
  ],
  dine_in: [
    { from: ORDER_STATUS.PENDING_PAYMENT,  to: ORDER_STATUS.RELEASED_TO_KITCHEN, label: t('confirm_and_start'), intent: 'orange', isPaymentConfirm: true },
    { from: ORDER_STATUS.PAID_UNRELEASED,  to: ORDER_STATUS.RELEASED_TO_KITCHEN, label: t('release_to_kitchen'), intent: 'blue' },
    { from: ORDER_STATUS.RELEASED_TO_KITCHEN, to: ORDER_STATUS.PREPARING, label: t('start_prep'), intent: 'blue' },
    { from: ORDER_STATUS.PREPARING,        to: ORDER_STATUS.READY,      label: t('mark_ready'), intent: 'blue' },
    { from: ORDER_STATUS.READY,            to: ORDER_STATUS.DELIVERED,  label: t('mark_served'), intent: 'green' },
  ],
})

function statusToBucket(status, t) {
  for (const s of OWNER_STATS(t)) {
    if (s.matches.includes(status)) return s.key
  }
  return null
}

function nextActionFor(status, orderType, paymentStatus, t) {
  // 🛡️ DINE-IN PAY-AFTER: Delivered + unpaid = show payment button
  if (status === ORDER_STATUS.DELIVERED && orderType === 'dine_in' && paymentStatus === 'unpaid') {
    return { label: '💳 ' + t('confirm_payment'), intent: 'orange', isPaymentConfirm: true }
  }

  const typeKey = orderType === 'takeout' ? 'pickup' : orderType || 'pickup'
  const flow = FLOW_MAP(t)[typeKey]
  if (!flow) return null

  const step = flow.find(f => f.from === status)
  if (!step) return null
  if (step.condition && !step.condition({ paymentStatus })) return null

  return { label: step.label, intent: step.intent || 'blue', isPaymentConfirm: step.isPaymentConfirm }
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
    green: { bg: T.greenBg, fg: T.greenInk },
    red: { bg: T.redBg, fg: T.redInk },
    orange: { bg: '#FBECEC', fg: '#D9892F' },
  }
  const s = styles[intent] || styles.blue
  return (
    <button onClick={onClick} style={{
      width: '100%', border: 'none', background: s.bg, color: s.fg, fontSize: 14.5,
      fontWeight: 600, padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
      fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 7, letterSpacing: '-0.005em', minHeight: 52,
    }}>
      {icon}{children}
    </button>
  )
}

function OrderCard({ order, onAdvance, onCancel, expanded, onToggle, t }) {
  const isDelivery = order.order_type === 'delivery'
  const isDineIn = order.order_type === 'dine_in'
  const next = nextActionFor(order.status, order.order_type, order.payment_status, t)
  const typeLabel = isDelivery ? t('order_type_delivery') : isDineIn ? t('order_type_dine_in') : t('order_type_takeout')
  const bucket = statusToBucket(order.status, t)
  const minsAgo = Math.max(0, Math.round((Date.now() - new Date(order.created_at)) / 60000))
  const timeStr = minsAgo < 1 ? t('just_now') : minsAgo < 60 ? `${minsAgo}m` : `${Math.floor(minsAgo / 60)}h`

  // KDS stripe color based on order type
  const stripeColor = isDelivery ? '#3B82F6' : isDineIn ? '#10B981' : '#F97316'

  return (
    <div className="kds-order-card" style={{
      background: T.card, borderRadius: 14, boxShadow: '0 1px 2px rgba(15,27,45,0.04), 0 4px 12px rgba(15,27,45,0.04)',
      marginBottom: 14, overflow: 'hidden', borderLeft: `5px solid ${stripeColor}`,
    }}>
      {/* Tappable header */}
      <button onClick={onToggle} style={{
        width: '100%', background: 'none', border: 'none', cursor: 'pointer',
        padding: 16, textAlign: 'left', fontFamily: 'inherit',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: T.ink, letterSpacing: '-0.02em', lineHeight: 1 }}>
            #{String(order.order_number).padStart(3, '0')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: T.muted, fontSize: 13, fontWeight: 500 }}>
            <Icon type="clock" color={T.muted} size={14} />
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{timeStr}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: T.ink, letterSpacing: '-0.015em' }}>
            {order.customer_name || 'Guest'}
          </span>
          <TagPill tone={isDelivery ? 'blue' : 'green'}>{typeLabel}</TagPill>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ color: T.muted, fontSize: 14 }}>
            {(order.items || []).length} {(order.items || []).length === 1 ? t('item_short') : t('items_short')}
            <span style={{ margin: '0 6px', color: T.muted2 }}>·</span>
            <span style={{ fontWeight: 700, color: T.ink2, fontVariantNumeric: 'tabular-nums' }}>
              {formatPrice(order.total)}
            </span>
          </div>
          <span style={{ fontSize: 11, color: T.statPrep, fontWeight: 600 }}>
            {expanded ? '▲ ' + t('less') : '▼ ' + t('details')}
          </span>
        </div>
      </button>

      {/* Expanded detail panel */}
      {expanded && (
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{ borderTop: `1px solid ${T.line2}`, marginBottom: 12 }} />

          {/* Items list */}
          <div style={{ marginBottom: 12 }}>
            {(order.items || []).map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: T.body, padding: '3px 0' }}>
                <span>{item.quantity}× {item.name}</span>
                <span style={{ color: T.muted, fontVariantNumeric: 'tabular-nums' }}>{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          {/* Customer info */}
          {order.customer_phone && (
            <div style={{ fontSize: 13, color: T.body, marginBottom: 6 }}>
              📞 <a href={`tel:${order.customer_phone}`} style={{ color: T.blueInk, fontWeight: 600, textDecoration: 'none' }}>{order.customer_phone}</a>
            </div>
          )}
          {/* Payment status */}
          {(() => {
            const isPaid = order.payment_status === 'paid'
            const isCash = order.payment_method === PAYMENT_METHOD.CASH
            const isWhatsApp = order.payment_method === PAYMENT_METHOD.WHATSAPP
            const isAlias = order.payment_method === PAYMENT_METHOD.ALIAS
            const isAwaitingPayment = !isPaid && (isCash || isWhatsApp || isAlias) && order.status === ORDER_STATUS.PENDING_PAYMENT

            let text = t('payment_pending')
            let bg = T.blueBg
            let color = T.blueInk

            if (isPaid) {
              text = t('paid_label')
              bg = T.greenBg
              color = T.greenInk
            } else if (isAwaitingPayment) {
              text = '⏳ ' + t('status_awaiting_payment')
              bg = '#FEF3C7'
              color = '#92400E'
            } else if (isCash) {
              text = order.order_type === 'delivery' ? t('pay_on_delivery') : order.order_type === 'dine_in' ? t('pay_at_table') : t('cash_delivery')
            } else if (isWhatsApp) {
              text = t('whatsapp_payment')
            } else if (isAlias) {
              text = t('mp_alias_short')
            }

            return (
              <div style={{ fontSize: 13, color, marginBottom: 6, padding: '6px 8px', background: bg, borderRadius: 6, fontWeight: 600 }}>
                {text}
              </div>
            )
          })()}
          {isDineIn && order.table_number && (
            <div style={{ fontSize: 13, color: T.body, marginBottom: 6 }}>
              {t('table')} {order.table_number}
            </div>
          )}
          {order.notes && (
            <div style={{ fontSize: 13, color: T.body, marginBottom: 6, padding: '6px 8px', background: T.blueBg, borderRadius: 6 }}>
              📝 {order.notes}
            </div>
          )}
          {isDelivery && order.delivery_address && (
            <div style={{ fontSize: 13, color: T.body, marginBottom: 12 }}>
              📍 {formatAddressForDisplay(order.delivery_address)}
            </div>
          )}
          {isDelivery && (
            <button
              onClick={() => {
                const msg = generateDriverMessage(order)
                window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
              }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                width: '100%', background: '#25D366', color: 'white', border: 'none',
                padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', marginBottom: 12,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" /></svg>
              {t('send_to_driver')}
            </button>
          )}

          <div style={{ borderTop: `1px solid ${T.line2}`, marginBottom: 12 }} />

          {next && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <ActionButton intent={next.intent || 'blue'} icon={<Icon type="chevron" color={next.intent === 'green' ? T.greenInk : next.intent === 'orange' ? '#D9892F' : T.blueInk} size={14} />} onClick={() => onAdvance(order)}>
                {next.label}
              </ActionButton>
              {!(order.status === ORDER_STATUS.DELIVERED && isDineIn) && (
                <ActionButton intent="red" icon={<Icon type="x" color={T.redInk} size={14} />} onClick={() => onCancel(order)}>
                  {t('cancel_order')}
                </ActionButton>
              )}
            </div>
          )}
          {order.status === ORDER_STATUS.DELIVERED && (
            <div style={{ textAlign: 'center', color: T.greenInk, fontWeight: 600, padding: '10px 0', background: T.greenBg, borderRadius: 10, fontSize: 14 }}>
              ✓ {t('delivered_status')}
            </div>
          )}
          {order.status === ORDER_STATUS.CANCELLED && (
            <div style={{ textAlign: 'center', color: T.redInk, fontWeight: 600, padding: '10px 0', background: T.redBg, borderRadius: 10, fontSize: 14 }}>
              {t('status_cancelled')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ActiveTabPills({ tab, setTab, counts }) {
  const { t } = useLanguage()
  return (
    <div style={{ display: 'flex', gap: 10, padding: '0 0 14px', flex: 1, minWidth: 0 }}>
      {[['active', t('active'), counts.active], ['completed', t('completed'), counts.completed]].map(([k, label, n]) => {
        const on = tab === k
        return (
          <button key={k} onClick={() => setTab(k)} style={{
            flex: 1, border: on ? `1.5px solid ${T.statPrep}` : `1px solid ${T.line}`,
            background: T.card, color: on ? T.statPrep : T.muted, fontWeight: 600,
            fontSize: 13, padding: '11px 8px', borderRadius: 12, cursor: 'pointer',
            fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 5, letterSpacing: '-0.005em',
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

export default function Dashboard() {
  const { businessId, tenantData } = useTenant()
  const { orders: fetchedOrders, loading, refreshOrders } = useOrdersPolling(businessId)
  const { t } = useLanguage()
  const { isMuted, volume, isUnlocked, toggleMute, cycleVolume, playChime } = useKDSAudio()
  const [tab, setTab] = useState('active')
  const [filterBucket, setFilterBucket] = useState(null)
  const [processingOrderId, setProcessingOrderId] = useState(null)
  const [expandedOrderId, setExpandedOrderId] = useState(null)
  const [paymentModalOrder, setPaymentModalOrder] = useState(null)
  const [paymentModalProcessing, setPaymentModalProcessing] = useState(false)
  const [showingMpAlias, setShowingMpAlias] = useState(false)
  const [showCreateOrder, setShowCreateOrder] = useState(false)
  const [lastOrderCount, setLastOrderCount] = useState(0)

  // 🚀 OPTIMISTIC STATE: Mirrors fetched orders but allows instant local updates
  const [displayOrders, setDisplayOrders] = useState([])
  useEffect(() => {
    setDisplayOrders(fetchedOrders)
  }, [fetchedOrders])

  const counts = useMemo(() => {
    const bucket = {}
    OWNER_STATS(t).forEach(s => bucket[s.key] = 0)
    displayOrders.forEach(o => {
      const b = statusToBucket(o.status, t)
      if (b) bucket[b]++
    })
    return {
      ...bucket,
      active: displayOrders.filter(o => ![ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED].includes(o.status)).length,
      completed: displayOrders.filter(o => [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED].includes(o.status)).length,
      delivered: displayOrders.filter(o => o.status === ORDER_STATUS.DELIVERED).length,
    }
  }, [displayOrders, t])

  const filtered = useMemo(() => {
    return displayOrders.filter(o => {
      const isUnpaidDineInDone = o.order_type === 'dine_in' && o.status === ORDER_STATUS.DELIVERED && o.payment_status !== 'paid'
      const completed = [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED].includes(o.status) && !isUnpaidDineInDone
      
      if (tab === 'active' ? completed : !completed) return false
      if (filterBucket) return statusToBucket(o.status, t) === filterBucket
      return true
    })
  }, [displayOrders, tab, filterBucket, t])

  const advance = async (order) => {
    // 🛡️ DINE-IN PAY-AFTER: Show payment method modal on a delivered order
    const isDineInPayAfterConfirm = order.status === ORDER_STATUS.DELIVERED && order.order_type === 'dine_in' && order.payment_status === 'unpaid'
    if (isDineInPayAfterConfirm) {
      setPaymentModalOrder(order)
      return
    }

    const typeKey = order.order_type === 'takeout' ? 'pickup' : order.order_type || 'pickup'
    const flow = FLOW_MAP(t)[typeKey]
    if (!flow) {
      console.error('Unknown order type:', typeKey)
      return
    }

    const step = flow.find(f => f.from === order.status)
    if (!step) return
    if (step.condition && !step.condition(order)) return

    const targetStatus = step.to

    const validation = canAdvanceOrder(order, targetStatus, { orderMode: 'A1' })
    if (!validation.allowed) {
      alert(validation.reason)
      return
    }

    // ⚡ INSTANT MOVE: Update UI immediately
    const prevOrders = [...displayOrders]
    setDisplayOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: targetStatus } : o))

    setProcessingOrderId(order.id)
    try {
      // If payment confirmation is part of this step, update payment fields first
      if (step.isPaymentConfirm) {
        const { error: payError } = await supabase
          .from('orders')
          .update({ payment_confirmed: true, payment_status: 'paid' })
          .eq('id', order.id)
        if (payError) {
          console.error('Payment confirm failed:', payError)
          setDisplayOrders(prevOrders)
          alert('Error: ' + payError.message)
          setProcessingOrderId(null)
          return
        }
      }

      // Use RPC for status transition (FSM-enforced, same as staff)
      const { data, error } = await supabase.rpc('advance_order_status', {
        p_order_id: order.id,
        p_target_status: targetStatus,
      })

      if (error) {
        console.error('Advance RPC failed:', error)
        setDisplayOrders(prevOrders)
        alert('Error: ' + error.message)
        setProcessingOrderId(null)
        return
      }

      if (data && !data.success) {
        console.warn('FSM Rejection:', data.error, data.message)
        setDisplayOrders(prevOrders)
        alert(data.message || 'Transition not allowed')
        setProcessingOrderId(null)
        return
      }

      refreshOrders()
    } catch (err) {
      console.error('Advance exception:', err)
      setDisplayOrders(prevOrders)
    } finally {
      setProcessingOrderId(null)
    }
  }

  const cancel = async (order) => {
    const prevOrders = [...displayOrders]
    setDisplayOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: ORDER_STATUS.CANCELLED } : o))

    setProcessingOrderId(order.id)
    try {
      const { data, error } = await supabase.rpc('advance_order_status', {
        p_order_id: order.id,
        p_target_status: ORDER_STATUS.CANCELLED,
      })

      if (error) {
        console.error('Cancel RPC failed:', error)
        setDisplayOrders(prevOrders)
        alert('Error: ' + error.message)
        setProcessingOrderId(null)
        return
      }

      if (data && !data.success) {
        console.warn('FSM Rejection:', data.error, data.message)
        setDisplayOrders(prevOrders)
        alert(data.message || 'Cannot cancel this order')
        setProcessingOrderId(null)
        return
      }

      refreshOrders()
    } catch (err) {
      console.error('Cancel exception:', err)
      setDisplayOrders(prevOrders)
    } finally {
      setProcessingOrderId(null)
    }
  }

  const handlePaymentMethodSelect = async (method) => {
    if (!paymentModalOrder) return
    setPaymentModalProcessing(true)
    try {
      const now = new Date().toISOString()

      // Write to transaction_ledger for analytics
      const { error: ledgerError } = await supabase
        .from('transaction_ledger')
        .insert({
          order_id: paymentModalOrder.id,
          business_id: paymentModalOrder.business_id || businessId,
          transaction_type: 'payment',
          status: 'completed',
          amount_gross_cents: Math.round((Number(paymentModalOrder.total) || 0) * 100),
          currency: 'ARS',
          payment_method: method,
          external_reference: `${method.toUpperCase()}-${paymentModalOrder.id}`,
          processed_at: now,
          offline_sync: false,
        })
      if (ledgerError) {
        console.error('[Owner] Ledger insert failed:', ledgerError)
      }

      const updates = {
        payment_confirmed: true,
        payment_status: 'paid',
        payment_method: method,
        paid_at: now,
      }
      if (paymentModalOrder.status === ORDER_STATUS.PENDING_PAYMENT || paymentModalOrder.status === ORDER_STATUS.PAID_UNRELEASED) {
        updates.status = ORDER_STATUS.RELEASED_TO_KITCHEN
        updates.owner_status = ORDER_STATUS.RELEASED_TO_KITCHEN
      }

      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', paymentModalOrder.id)
      if (error) {
        console.error('Payment confirm failed:', error)
        alert('Error: ' + error.message)
      } else {
        await new Promise(resolve => setTimeout(resolve, 1200))
        setPaymentModalOrder(null)
        setShowingMpAlias(false)
        refreshOrders()
      }
    } catch (err) {
      console.error('Payment confirm exception:', err)
      alert('Error confirming payment')
    } finally {
      setPaymentModalProcessing(false)
    }
  }

  const nukeAllOrders = async () => {
    if (!confirm('⚠️ DELETE ALL ORDERS? This cannot be undone. Type "DELETE" to confirm.')) return
    const response = prompt('Type DELETE to confirm:')
    if (response !== 'DELETE') return

    try {
      console.log('[Nuke] Calling edge function for business_id:', businessId)
      const { data, error } = await supabase.functions.invoke('nuke-orders', {
        body: { business_id: businessId }
      })

      console.log('[Nuke] Response:', { error, data })

      if (error) {
        alert('❌ Error: ' + error)
        return
      }

      alert('✅ All orders deleted')
      await new Promise(r => setTimeout(r, 800))
      setDisplayOrders([])
      await refreshOrders()
    } catch (err) {
      console.error('[Nuke] Exception:', err)
      alert('❌ Error: ' + err.message)
    }
  }

  const todayRev = displayOrders.filter(o => o.status !== ORDER_STATUS.CANCELLED).reduce((a, o) => a + o.total, 0)

  // 🔔 Browser notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
  }, [])

  // 🔔 Audio alert + browser notification for new orders
  useEffect(() => {
    if (displayOrders.length > lastOrderCount && lastOrderCount > 0) {
      playChime()

      const latestOrder = displayOrders[0]
      // Browser push notification (works even when tab is backgrounded)
      if ('Notification' in window && Notification.permission === 'granted' && latestOrder) {
        try {
          new Notification(`New Order #${String(latestOrder.order_number).padStart(3, '0')}`, {
            body: `${latestOrder.customer_name || 'Guest'} — ${(latestOrder.items || []).length} item${(latestOrder.items || []).length !== 1 ? 's' : ''} · ${formatPrice(latestOrder.total)}`,
            icon: '/pwa-icons/icon-192x192.png',
            tag: latestOrder.id,
            requireInteraction: true,
          })
        } catch { /* noop */ }
      }
    }
    setLastOrderCount(displayOrders.length)
  }, [displayOrders.length, lastOrderCount, playChime])

  if (loading) return <BurgerLoader />

  return (
    <div style={{
      width: '100%', height: '100vh', background: T.bg, color: T.ink,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      display: 'grid', gridTemplateRows: 'auto auto 1fr auto', overflow: 'hidden',
    }}>
      <style>{kdsGridStyles}</style>
      {/* Unlock banner */}
      {!isUnlocked && (
        <div style={{
          background: '#FEF3C7', color: '#92400E', padding: '10px 16px',
          fontSize: 13, fontWeight: 600, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          borderBottom: '1px solid #FDE68A', cursor: 'pointer'
        }}>
          <BellIcon muted={false} size={16} color="#92400E" />
          {t('tap_to_enable_alerts')}
        </div>
      )}

      <BackendHeader title={t('orders')} />

      <div style={{ overflowY: 'auto' }}>
        <div style={{ padding: '16px 16px 14px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
          {/* Audio controls */}
          <button
            onClick={cycleVolume}
            title={`Volume: ${volume}`}
            style={{
              background: '#F3F4F6', border: 'none', borderRadius: 8,
              padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center',
              opacity: isMuted ? 0.4 : 1, color: '#0F1B2D'
            }}
          ><VolumeIcon level={volume} size={18} /></button>
          <button
            onClick={toggleMute}
            title={isMuted ? 'Unmute' : 'Mute'}
            style={{
              background: isMuted ? '#FEE2E2' : '#F3F4F6',
              border: 'none', borderRadius: 8,
              padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center',
              color: isMuted ? '#B33A3A' : '#0F1B2D'
            }}
          ><BellIcon muted={isMuted} size={18} /></button>
          {/* New Order button */}
          <button
            onClick={() => setShowCreateOrder(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: 'none', backgroundColor: T.blueBg, color: T.blueInk, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            {t('new_order')}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '0 16px 12px', gap: 8, flexWrap: 'wrap' }}>
          <ActiveTabPills tab={tab} setTab={setTab} counts={counts} />
          <button onClick={nukeAllOrders} style={{
            padding: '11px 14px',
            fontSize: 12,
            fontWeight: 600,
            background: '#EF4444',
            color: '#FFF',
            border: 'none',
            borderRadius: 10,
            cursor: 'pointer',
            letterSpacing: '0.02em',
          }}>
            {t('delete_label')}
          </button>
        </div>

        <div style={{ padding: '0 16px 24px' }}>
          {filterBucket && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px 12px',
            }}>
              <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, letterSpacing: '0.06em' }}>
                FILTERED · {OWNER_STATS(t).find(s => s.key === filterBucket).label}
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
                {t('nothing_here')}
              </div>
              <div style={{ fontSize: 13 }}>Los nuevos pedidos {tab === 'active' ? 'activos' : 'completados'} aparecerán aquí.</div>
            </div>
          ) : (
            <div className="kds-order-grid">
              {filtered.map(o => (
                <OrderCard
                  key={o.id}
                  order={o}
                  onAdvance={() => advance(o)}
                  onCancel={() => cancel(o)}
                  expanded={expandedOrderId === o.id}
                  onToggle={() => setExpandedOrderId(expandedOrderId === o.id ? null : o.id)}
                  t={t}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Payment Method Modal for Dine-In */}
      {paymentModalOrder && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 27, 45, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, pointerEvents: 'auto' }} onClick={() => !paymentModalProcessing && !showingMpAlias && setPaymentModalOrder(null)}>
          <div style={{ backgroundColor: T.card, borderRadius: 16, padding: 32, maxWidth: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', border: `1px solid ${T.line2}`, pointerEvents: 'auto' }} onClick={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}>
            {!showingMpAlias ? (
              <>
                <h2 style={{ margin: '0 0 12px 0', color: T.ink, fontSize: 18, fontWeight: 700 }}>{t('how_did_they_pay')}</h2>
                <p style={{ margin: '0 0 24px 0', color: T.muted, fontSize: 14 }}>Pedido #{paymentModalOrder.order_number}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <button
                    onClick={() => handlePaymentMethodSelect('cash')}
                    onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); handlePaymentMethodSelect('cash'); }}
                    disabled={paymentModalProcessing}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 10,
                      border: 'none',
                      backgroundColor: '#f3f4f6',
                      color: T.ink,
                      fontWeight: 600,
                      fontSize: 15,
                      cursor: paymentModalProcessing ? 'not-allowed' : 'pointer',
                      opacity: paymentModalProcessing ? 0.6 : 1,
                      transition: 'all 0.2s',
                      touchAction: 'manipulation',
                      WebkitTouchCallout: 'none',
                      WebkitUserSelect: 'none',
                    }}
                    onMouseEnter={(e) => !paymentModalProcessing && (e.target.style.backgroundColor = '#e5e7eb')}
                    onMouseLeave={(e) => (e.target.style.backgroundColor = '#f3f4f6')}
                  >
                    {paymentModalProcessing ? t('processing') : t('cash')}
                  </button>
                  <button
                    onClick={() => setShowingMpAlias(true)}
                    onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); setShowingMpAlias(true); }}
                    disabled={paymentModalProcessing}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 10,
                      border: 'none',
                      backgroundColor: '#f3f4f6',
                      color: T.ink,
                      fontWeight: 600,
                      fontSize: 15,
                      cursor: paymentModalProcessing ? 'not-allowed' : 'pointer',
                      opacity: paymentModalProcessing ? 0.6 : 1,
                      transition: 'all 0.2s',
                      touchAction: 'manipulation',
                      WebkitTouchCallout: 'none',
                      WebkitUserSelect: 'none',
                    }}
                    onMouseEnter={(e) => !paymentModalProcessing && (e.target.style.backgroundColor = '#e5e7eb')}
                    onMouseLeave={(e) => (e.target.style.backgroundColor = '#f3f4f6')}
                  >
                    {t('mp_alias_short')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 style={{ margin: '0 0 12px 0', color: T.ink, fontSize: 18, fontWeight: 700 }}>{t('customer_scans_to_pay')}</h2>
                <div style={{ margin: '0 0 24px 0', padding: 20, backgroundColor: '#fed7aa', borderRadius: 12, textAlign: 'center', border: '2px solid #f97316' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#92400e', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('mp_alias_short')}</p>
                  <p style={{ fontSize: 28, fontWeight: 800, color: '#b45309', margin: 0, fontFamily: 'monospace' }}>{tenantData?.app_config?.payments?.mercadoPagoAlias || 'N/A'}</p>
                </div>
                <button
                  onClick={() => handlePaymentMethodSelect('mercado_pago')}
                  onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); handlePaymentMethodSelect('mercado_pago'); }}
                  disabled={paymentModalProcessing}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    backgroundColor: '#f3f4f6',
                    color: T.ink,
                    fontWeight: 600,
                    fontSize: 14,
                    border: 'none',
                    borderRadius: 10,
                    cursor: paymentModalProcessing ? 'not-allowed' : 'pointer',
                    opacity: paymentModalProcessing ? 0.6 : 1,
                    marginBottom: 8,
                    transition: 'all 0.2s',
                    touchAction: 'manipulation',
                    WebkitTouchCallout: 'none',
                    WebkitUserSelect: 'none',
                  }}
                  onMouseEnter={(e) => !paymentModalProcessing && (e.target.style.backgroundColor = '#e5e7eb')}
                  onMouseLeave={(e) => (e.target.style.backgroundColor = '#f3f4f6')}
                >
                  {paymentModalProcessing ? t('processing') : t('verified_payment')}
                </button>
                <button
                  onClick={() => setShowingMpAlias(false)}
                  onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); setShowingMpAlias(false); }}
                  disabled={paymentModalProcessing}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    backgroundColor: '#f3f4f6',
                    color: T.ink,
                    fontWeight: 600,
                    fontSize: 14,
                    border: `1px solid ${T.line2}`,
                    borderRadius: 10,
                    cursor: paymentModalProcessing ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    touchAction: 'manipulation',
                    WebkitTouchCallout: 'none',
                    WebkitUserSelect: 'none',
                  }}
                  onMouseEnter={(e) => !paymentModalProcessing && (e.target.style.backgroundColor = '#e5e7eb')}
                  onMouseLeave={(e) => (e.target.style.backgroundColor = '#f3f4f6')}
                >
                  {t('back_label')}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <BackendNav useRoutes={true} role="owner" />

      {showCreateOrder && (
        <CreateOrderModal
          businessId={businessId}
          onClose={() => { setShowCreateOrder(false); refreshOrders() }}
        />
      )}
    </div>
  )
}
