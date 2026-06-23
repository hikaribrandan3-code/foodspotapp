import { ChevronRight, MapPin } from 'lucide-react'

export default function LocationsHub({ locations, parentBrand }) {
  const brandName = parentBrand?.name || locations?.[0]?.parent_brand_name || 'Our Locations'
  // Parent brand logo (hub header) — falls back to first location's logo if not set
  const brandLogo = parentBrand?.logo || locations?.[0]?.parent_brand_logo || locations?.[0]?.logo_url

  const goToLocation = (slug) => {
    // Hard redirect so TenantContext fully re-resolves for the new slug
    window.location.href = `/${slug}`
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 16px',
      background: '#FAFAF9',
      fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif",
    }}>
      {/* Receipt container */}
      <div style={{
        width: '100%',
        maxWidth: 420,
        background: '#FFFFFF',
        borderRadius: 24,
        boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Torn top edge */}
        <div style={{
          height: 16,
          background: '#FAFAF9',
          clipPath: 'polygon(0% 0%, 5% 100%, 10% 0%, 15% 100%, 20% 0%, 25% 100%, 30% 0%, 35% 100%, 40% 0%, 45% 100%, 50% 0%, 55% 100%, 60% 0%, 65% 100%, 70% 0%, 75% 100%, 80% 0%, 85% 100%, 90% 0%, 95% 100%, 100% 0%)',
        }} />

        {/* Brand header — full-width banner logo */}
        {brandLogo ? (
          <img
            src={brandLogo}
            alt={brandName}
            style={{
              width: '100%',
              height: 120,
              objectFit: 'cover',
              objectPosition: 'center',
              display: 'block',
            }}
          />
        ) : (
          <div style={{
            width: '100%',
            height: 120,
            background: '#F3F4F6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <MapPin size={40} color="#9CA3AF" />
          </div>
        )}

        {/* Title + subtitle */}
        <div style={{
          textAlign: 'center',
          padding: '24px 24px 16px',
        }}>
          <h1 style={{
            fontSize: 24,
            fontWeight: 800,
            color: '#1F2937',
            margin: '0 0 4px',
            letterSpacing: '-0.02em',
          }}>
            {brandName}
          </h1>
          <p style={{
            fontSize: 14,
            color: '#6B7280',
            margin: 0,
          }}>
            Select a location
          </p>
        </div>

        {/* Dashed separator */}
        <div style={{
          borderTop: '2px dashed #E5E7EB',
          margin: '0 24px',
        }} />

        {/* Location cards */}
        <div style={{ padding: '20px 24px' }}>
          {(locations || []).map((loc, i) => (
            <button
              key={loc.slug || i}
              onClick={() => goToLocation(loc.slug)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '16px 14px',
                marginBottom: i < locations.length - 1 ? 12 : 0,
                background: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: 16,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'left',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#F0FDF4'
                e.currentTarget.style.borderColor = '#10B981'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(16,185,129,0.12)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#F9FAFB'
                e.currentTarget.style.borderColor = '#E5E7EB'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              {/* Status dot + text */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                flexShrink: 0,
              }}>
                <div style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: loc.is_paused ? '#EF4444' : '#10B981',
                  boxShadow: loc.is_paused
                    ? '0 0 6px rgba(239,68,68,0.4)'
                    : '0 0 6px rgba(16,185,129,0.4)',
                }} />
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: loc.is_paused ? '#EF4444' : '#10B981',
                }}>
                  {loc.is_paused ? 'CLOSED' : 'OPEN'}
                </span>
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#1F2937',
                  marginBottom: 2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {loc.name}
                </div>
                {loc.address && (
                  <div style={{
                    fontSize: 13,
                    color: '#6B7280',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {loc.address}
                  </div>
                )}
                {loc.location_label && (
                  <span style={{
                    display: 'inline-block',
                    marginTop: 4,
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: '#6B7280',
                    background: '#F3F4F6',
                    padding: '2px 8px',
                    borderRadius: 6,
                  }}>
                    {loc.location_label}
                  </span>
                )}
              </div>

              {/* Chevron */}
              <ChevronRight size={20} color="#9CA3AF" style={{ flexShrink: 0 }} />
            </button>
          ))}
        </div>

        {/* Dashed separator */}
        <div style={{
          borderTop: '2px dashed #E5E7EB',
          margin: '0 24px',
        }} />

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          padding: '20px 24px 28px',
        }}>
          <a
            href="https://www.instagram.com/foodspotmobile/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              color: '#9CA3AF',
              textDecoration: 'none',
            }}
          >
            Powered by FoodSpot Mobile
          </a>
        </div>

        {/* Torn bottom edge */}
        <div style={{
          height: 16,
          background: '#FAFAF9',
          clipPath: 'polygon(0% 100%, 5% 0%, 10% 100%, 15% 0%, 20% 100%, 25% 0%, 30% 100%, 35% 0%, 40% 100%, 45% 0%, 50% 100%, 55% 0%, 60% 100%, 65% 0%, 70% 100%, 75% 0%, 80% 100%, 85% 0%, 90% 100%, 95% 0%, 100% 100%)',
        }} />
      </div>
    </div>
  )
}
