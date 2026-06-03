// ============================================================
// TierGuard — Pro Feature Gate
// ============================================================
// Wrap any Pro-only component. Free users see an upgrade screen.
// Usage: <TierGuard feature="analytics"><Analytics /></TierGuard>
// ============================================================

import { useState } from 'react'
import { useTier } from '../hooks/useTier'
import { useTenant } from '../contexts/TenantContext'
import { supabase } from '../lib/supabaseClient'

const FEATURE_LABELS = {
  analytics:  { icon: '📊', name: 'Analytics',      desc: 'Revenue trends, top items, customer insights' },
  ai:         { icon: '✨', name: 'FoodSpot AI',     desc: 'Menu optimization, pricing & smart recommendations' },
  staff:      { icon: '👥', name: 'Staff App',       desc: 'KDS, kitchen display, driver & inventory management' },
  inventory:  { icon: '📦', name: 'Inventory',       desc: 'Stock tracking, suppliers, cost per unit' },
  delivery:   { icon: '🛵', name: 'GPS Delivery',    desc: 'Live driver tracking & route optimization' },
}

const PRO_FEATURES = [
  'Full analytics & revenue reports',
  'FoodSpot AI menu optimization',
  'Staff app (KDS + kitchen display)',
  'Inventory & supplier management',
  'GPS delivery & route tracking',
  'All 6 arcade games unlocked',
  'Remove "Powered by FoodSpot" badge',
  'Unlimited Mercado Pago orders',
]

export function TierGuard({ feature = 'feature', children }) {
  const { isPro, isLoading } = useTier()
  const { businessId, tenantData } = useTenant()
  const [upgrading, setUpgrading] = useState(false)
  const [upgradeError, setUpgradeError] = useState(null)

  if (isLoading) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', color: '#9ca3af', fontSize: 14,
    }}>
      Loading...
    </div>
  )

  if (isPro) return children

  const feat = FEATURE_LABELS[feature] || { icon: '🔒', name: feature, desc: 'This feature requires Pro' }

  const handleUpgrade = async () => {
    setUpgrading(true)
    setUpgradeError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) throw new Error('Could not get user email')

      const { data, error } = await supabase.functions.invoke('create-subscription-preference', {
        body: {
          business_id: businessId,
          email: user.email,
          slug: tenantData?.slug,
        },
      })

      if (error) throw new Error(error.message)
      if (data?.already_pro) {
        window.location.reload()
        return
      }
      if (!data?.init_point) throw new Error('No checkout URL returned')

      // Redirect to MercadoPago subscription checkout
      window.location.href = data.init_point

    } catch (err) {
      console.error('Upgrade error:', err)
      setUpgradeError('Something went wrong. Please try again.')
      setUpgrading(false)
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '70vh',
      padding: '32px 24px',
      textAlign: 'center',
      background: 'var(--canvas-bg, #f9fafb)',
    }}>

      {/* Icon */}
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: 'linear-gradient(135deg, #10b98122, #3b82f622)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 32, marginBottom: 20,
        border: '2px solid #10b98133',
      }}>
        {feat.icon}
      </div>

      {/* Title */}
      <h2 style={{
        fontSize: 22, fontWeight: 800, color: '#111827',
        margin: '0 0 8px', letterSpacing: '-0.02em',
      }}>
        {feat.name} is Pro only
      </h2>

      <p style={{
        fontSize: 14, color: '#6b7280', margin: '0 0 28px',
        maxWidth: 280, lineHeight: 1.5,
      }}>
        {feat.desc}
      </p>

      {/* Pro features list */}
      <div style={{
        background: '#fff', borderRadius: 16, padding: '20px 24px',
        border: '1px solid #e5e7eb', width: '100%', maxWidth: 320,
        marginBottom: 24, textAlign: 'left',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}>
        <p style={{
          fontSize: 11, fontWeight: 800, letterSpacing: '0.1em',
          color: '#10b981', textTransform: 'uppercase', marginBottom: 12,
        }}>
          Everything in Pro
        </p>
        {PRO_FEATURES.map((f, i) => (
          <div key={i} style={{
            fontSize: 13, color: '#374151', padding: '6px 0',
            display: 'flex', alignItems: 'center', gap: 8,
            borderBottom: i < PRO_FEATURES.length - 1 ? '1px solid #f3f4f6' : 'none',
          }}>
            <span style={{ color: '#10b981', fontWeight: 700, fontSize: 12 }}>✓</span>
            {f}
          </div>
        ))}
      </div>

      {/* Price */}
      <div style={{
        background: '#f0fdf4', border: '1px solid #bbf7d0',
        borderRadius: 12, padding: '12px 24px',
        marginBottom: 20, width: '100%', maxWidth: 320,
      }}>
        <span style={{ fontSize: 28, fontWeight: 900, color: '#065f46' }}>$25.99</span>
        <span style={{ fontSize: 14, color: '#6b7280', marginLeft: 6 }}>USD / month</span>
        <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0' }}>
          Billed monthly in ARS · Cancel anytime
        </p>
      </div>

      {/* Upgrade button */}
      {upgradeError && (
        <p style={{ fontSize: 13, color: '#ef4444', marginBottom: 12 }}>
          {upgradeError}
        </p>
      )}

      <button
        onClick={handleUpgrade}
        disabled={upgrading}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: upgrading ? '#9ca3af' : '#10b981',
          color: '#fff',
          padding: '14px 28px', borderRadius: 50,
          fontWeight: 800, fontSize: 15,
          border: 'none', cursor: upgrading ? 'wait' : 'pointer',
          boxShadow: upgrading ? 'none' : '0 4px 16px rgba(16,185,129,0.35)',
          width: '100%', maxWidth: 320,
          marginBottom: 12, fontFamily: 'inherit',
          transition: 'all 0.2s ease',
        }}
      >
        {upgrading ? 'Connecting to checkout...' : 'Upgrade to FoodSpot Pro'}
      </button>

      <p style={{ fontSize: 12, color: '#9ca3af' }}>
        Secure payment via Mercado Pago
      </p>

    </div>
  )
}
