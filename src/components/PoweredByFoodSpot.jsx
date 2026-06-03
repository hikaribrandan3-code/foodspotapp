// ============================================================
// PoweredByFoodSpot — Free Tier Viral Badge
// ============================================================
// Shows on ALL customer-facing pages for free tier.
// Non-removable on Free. Disappears on Pro.
// This is the growth engine — every customer sees it.
// ============================================================

import { useTier } from '../hooks/useTier'

export function PoweredByFoodSpot() {
  const { isPro, isLoading } = useTier()

  // Pro = no badge. Loading = no badge (avoid flicker).
  if (isLoading || isPro) return null

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '10px 16px',
      paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
      background: 'transparent',
    }}>
      <a
        href="https://foodspot.app"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          textDecoration: 'none',
          opacity: 0.65,
          transition: 'opacity 0.2s ease',
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
        onMouseLeave={e => e.currentTarget.style.opacity = '0.65'}
      >
        {/* FoodSpot logomark */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
            fill="#10b981"
            opacity="0.9"
          />
          <path
            d="M8 12h8M12 8v8"
            stroke="#fff"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>

        <span style={{
          fontSize: 11,
          fontWeight: 600,
          color: '#6b7280',
          letterSpacing: '0.01em',
          whiteSpace: 'nowrap',
        }}>
          Powered by{' '}
          <span style={{ color: '#10b981', fontWeight: 800 }}>FoodSpot</span>
        </span>
      </a>
    </div>
  )
}
