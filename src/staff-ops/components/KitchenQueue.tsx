import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient.js'
import { Badge } from './Badge.jsx'
import { Button } from './Button.jsx'
import { ChefHat, Clock, Package } from 'lucide-react'

interface Order {
  id: string
  status: string
  payment_method: string
  total: number
  items: any[]
  created_at: string
  delivery_address?: {
    street?: string
    number?: string
  }
}

const statusLabels: Record<string, string> = {
  RELEASED_TO_KITCHEN: 'In Kitchen',
  PREP: 'Preparing',
  READY: 'Ready for Hand Off',
}

const statusColors: Record<string, string> = {
  RELEASED_TO_KITCHEN: 'bg-emerald-600',
  PREP: 'bg-orange-500',
  READY: 'bg-green-500',
}

const statusIcons: Record<string, React.ReactNode> = {
  RELEASED_TO_KITCHEN: <ChefHat size={16} />,
  PREP: <Clock size={16} />,
  READY: <Package size={16} />,
}

export const KitchenQueue: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const fetchKitchenOrders = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .in('status', ['RELEASED_TO_KITCHEN', 'PREP', 'READY'])
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching kitchen orders:', error)
    } else {
      setOrders(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchKitchenOrders()

    const channel = supabase
      .channel('kitchen-queue')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          fetchKitchenOrders()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const advanceStatus = async (order: Order) => {
    setUpdatingId(order.id)
    const transitions: Record<string, string> = {
      RELEASED_TO_KITCHEN: 'PREP',
      PREP: 'READY',
      READY: 'DISPATCH',
    }
    const next = transitions[order.status]
    if (!next) {
      setUpdatingId(null)
      return
    }

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: next, updated_at: new Date().toISOString() })
        .eq('id', order.id)

      if (error) throw error
    } catch (err) {
      console.error('Failed to advance status:', err)
    } finally {
      setUpdatingId(null)
    }
  }

  const actionLabels: Record<string, string> = {
    RELEASED_TO_KITCHEN: 'Start Preparation',
    PREP: 'Mark Ready',
    READY: 'Dispatch Order',
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <ChefHat size={22} />
        Kitchen Queue
      </h2>

      {loading && <p className="text-gray-500">Loading orders...</p>}

      {!loading && orders.length === 0 && (
        <p className="text-gray-500">No orders in the kitchen queue.</p>
      )}

      <div className="space-y-3">
        {orders.map((order) => (
          <div
            key={order.id}
            className="border rounded-lg p-4 bg-white shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold">Order #{order.id.slice(0, 8)}</span>
                <Badge className={`${statusColors[order.status] || 'bg-gray-500'} flex items-center gap-1`}>
                  {statusIcons[order.status]}
                  {statusLabels[order.status] || order.status}
                </Badge>
                {order.payment_method === 'cash' && (
                  <Badge className="bg-amber-500">Cash</Badge>
                )}
                {order.payment_method === 'mercado_pago' && (
                  <Badge className="bg-blue-400">MP</Badge>
                )}
              </div>

              <div className="text-sm text-gray-600 space-y-1">
                <p>
                  {order.items?.map((item: any, i: number) => (
                    <span key={i}>
                      {item.name} x{item.quantity}
                      {i < (order.items?.length || 0) - 1 ? ', ' : ''}
                    </span>
                  ))}
                </p>
                <p className="font-medium text-gray-800">Total: ${(order.total ?? 0).toFixed(2)}</p>
                <p>
                  {order.delivery_address?.street} {order.delivery_address?.number}
                </p>
              </div>
            </div>

            <Button
              onClick={() => advanceStatus(order)}
              disabled={updatingId === order.id}
              className="w-full md:w-auto whitespace-nowrap"
            >
              {updatingId === order.id ? 'Updating...' : actionLabels[order.status]}
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default KitchenQueue
