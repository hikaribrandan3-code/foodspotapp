import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { useTenant } from '../../../contexts/TenantContext'
import { useCurrency } from '../../../hooks/useCurrency'
import { getScopedGuestToken } from '../../../utils/storage.js'
import { ORDER_STATUS } from '../../../constants/database.js'
import { Copy, ChevronRight } from 'lucide-react'

const STATUS_STEPS = ['Preparing', 'Ready', 'Out for Delivery', 'Delivered']
const STATUS_MAP = {
  [ORDER_STATUS.PENDING_PAYMENT]: 0,
  [ORDER_STATUS.PAID_UNRELEASED]: 0,
  [ORDER_STATUS.RELEASED_TO_KITCHEN]: 0,
  [ORDER_STATUS.PREPARING]: 0,
  [ORDER_STATUS.READY]: 1,
  [ORDER_STATUS.DISPATCHED]: 2,
  [ORDER_STATUS.DELIVERED]: 3,
  [ORDER_STATUS.CANCELLED]: -1,
}

export default function DesktopStatusTab() {
  const { businessId } = useTenant()
  const fmt = useCurrency()

  const [currentOrder, setCurrentOrder] = useState(null)
  const [pastOrders, setPastOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const guestToken = getScopedGuestToken()
        const storedPhone = localStorage.getItem('fs_customer_phone')

        if (!guestToken && !storedPhone && !businessId) {
          setCurrentOrder(null)
          setPastOrders([])
          setLoading(false)
          return
        }

        // Fetch current order (most recent)
        let currentQuery = supabase
          .from('orders')
          .select('*')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false })
          .limit(1)

        if (guestToken) {
          currentQuery = currentQuery.eq('guest_token', guestToken)
        } else if (storedPhone) {
          currentQuery = currentQuery.eq('customer_phone', storedPhone)
        }

        const { data: currentData } = await currentQuery
        const current = currentData?.[0] || null
        setCurrentOrder(current)

        // Fetch past orders (limit 5, excluding current)
        let pastQuery = supabase
          .from('orders')
          .select('*')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false })
          .limit(6)

        if (guestToken) {
          pastQuery = pastQuery.eq('guest_token', guestToken)
        } else if (storedPhone) {
          pastQuery = pastQuery.eq('customer_phone', storedPhone)
        }

        const { data: allOrders } = await pastQuery
        const past = (allOrders || []).filter(o => !current || o.id !== current.id).slice(0, 5)
        setPastOrders(past)
      } catch (err) {
        console.error('Fetch orders error:', err)
        setCurrentOrder(null)
        setPastOrders([])
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()

    // Subscribe to current order updates
    if (currentOrder?.id) {
      const channel = supabase
        .channel(`order-${currentOrder.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${currentOrder.id}` },
          (payload) => setCurrentOrder(payload.new)
        )
        .subscribe()

      return () => {
        channel.unsubscribe()
      }
    }
  }, [businessId])

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  if (!currentOrder) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-full text-center text-gray-400">
        <p className="text-lg mb-2">No active orders</p>
        <p className="text-sm">Your orders will appear here</p>
      </div>
    )
  }

  const stepIndex = STATUS_MAP[currentOrder.status] ?? 0
  const isCancelled = currentOrder.status === ORDER_STATUS.CANCELLED
  const isDelivered = currentOrder.status === ORDER_STATUS.DELIVERED

  // Calculate item count
  const itemCount = (currentOrder.items || []).reduce((sum, i) => sum + i.quantity, 0)

  return (
    <div className="p-4 lg:p-6 space-y-8 max-w-4xl mx-auto">

      {/* CURRENT ORDER SECTION */}
      <div>
        <h2 className="text-2xl font-bold text-[var(--canvas-text)] mb-4">Current Order</h2>

        {/* Order ID */}
        <div className="flex items-center gap-2 mb-6">
          <p className="text-xs text-gray-500">Order ID:</p>
          <code className="text-sm font-mono text-[var(--canvas-text)]">{currentOrder.id}</code>
          <button
            onClick={() => navigator.clipboard.writeText(currentOrder.id)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="Copy order ID"
          >
            <Copy size={14} className="text-gray-400" />
          </button>
        </div>

        {/* Timeline Card */}
        <div className="mb-6 bg-[var(--canvas-surface)] p-6 rounded-lg" style={{ borderRadius: 'var(--radius-card)' }}>
          <div className="flex items-center justify-between mb-4">
            {STATUS_STEPS.map((step, idx) => (
              <div key={idx} className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                    idx <= stepIndex && !isCancelled
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {idx <= stepIndex && !isCancelled ? '✓' : idx + 1}
                </div>
                <p className={`text-xs mt-2 text-center font-medium ${idx <= stepIndex && !isCancelled ? 'text-[var(--canvas-text)]' : 'text-gray-400'}`}>
                  {step}
                </p>
              </div>
            ))}
          </div>
          <div className="h-0.5 bg-gray-200 rounded mb-4"></div>
          <p className="text-xs text-gray-500 text-center">
            {isCancelled ? 'Order Cancelled' : isDelivered ? '✓ Order Delivered' : `Step ${stepIndex + 1} of 4: ${STATUS_STEPS[stepIndex]}`}
          </p>
        </div>

        {/* ETA + Summary + Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* ETA Card */}
          <div className="bg-[var(--canvas-surface)] p-5 rounded-lg text-center" style={{ borderRadius: 'var(--radius-card)' }}>
            <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide font-semibold">ETA</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>
              {isCancelled ? '—' : isDelivered ? '✓' : `~${15 + Math.floor(Math.random() * 10)}m`}
            </p>
          </div>

          {/* Order Summary Card */}
          <div className="bg-[var(--canvas-surface)] p-5 rounded-lg" style={{ borderRadius: 'var(--radius-card)' }}>
            <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide font-semibold">Summary</p>
            <p className="text-lg font-bold text-[var(--canvas-text)]">{itemCount} {itemCount === 1 ? 'item' : 'items'}</p>
            <p className="text-sm text-gray-500 mt-1">Total: {fmt(currentOrder.total_price)}</p>
          </div>

          {/* Action Buttons Card */}
          <div className="flex flex-col gap-2">
            <button className="flex-1 py-2.5 rounded-lg text-white font-semibold text-sm transition-opacity hover:opacity-90" style={{ background: 'var(--color-primary)' }}>
              Live Tracking
            </button>
            <button className="flex-1 py-2.5 rounded-lg border-2 text-[var(--canvas-text)] font-semibold text-sm transition-colors" style={{ borderColor: 'var(--color-primary)' }}>
              View Details
            </button>
          </div>

        </div>
      </div>

      {/* PAST ORDERS SECTION */}
      {pastOrders.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-[var(--canvas-text)] mb-4">Recent Orders</h2>
          <div className="space-y-3">
            {pastOrders.map((order) => {
              const orderDate = new Date(order.created_at)
              const dateStr = orderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              const timeStr = orderDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
              const itemCount = (order.items || []).reduce((sum, i) => sum + i.quantity, 0)

              return (
                <div
                  key={order.id}
                  className="bg-[var(--canvas-surface)] p-4 rounded-lg flex items-center justify-between hover:shadow-md transition-shadow"
                  style={{ borderRadius: 'var(--radius-card)' }}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm text-[var(--canvas-text)]">{dateStr}</p>
                      <span className="text-xs text-green-600 font-bold">✓ {order.status === ORDER_STATUS.DELIVERED ? 'Delivered' : 'Completed'}</span>
                    </div>
                    <p className="text-xs text-gray-500">{timeStr} • {itemCount} {itemCount === 1 ? 'item' : 'items'}</p>
                  </div>
                  <div className="text-right mr-4">
                    <p className="font-bold text-[var(--canvas-text)]">{fmt(order.total_price)}</p>
                  </div>
                  <button
                    className="px-4 py-2 rounded-lg text-white font-semibold text-sm transition-opacity hover:opacity-90 flex items-center gap-1"
                    style={{ background: 'var(--color-primary)' }}
                  >
                    Reorder
                    <ChevronRight size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}
