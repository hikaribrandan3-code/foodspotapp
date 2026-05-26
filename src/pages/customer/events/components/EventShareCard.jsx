import * as React from 'react';

/**
 * EventShareCard — redesigned story card for Instagram sharing
 *
 * Layout inspired by EventDetail countdown timer style:
 * - Image: top 50%
 * - Content: bottom 50%, spread out cleanly (not bunched)
 * - Category pill: prominent, above title
 * - Info rows: readable, with good spacing
 * - Price/capacity: clear, white text for stand-out
 *
 * Rendered off-screen at 400×711px, captured at scale 2.7 → ~1080×1920px
 * inline styles only — html2canvas does not run Tailwind JIT.
 */
const EventShareCard = React.forwardRef(function EventShareCard({ event, businessName }, ref) {
  if (!event) return null;

  const lowestPrice = event.tiers
    ? Math.min(...event.tiers.filter(t => !t.forced_sold_out).map(t => t.price))
    : null;

  const totalCapacity = event.tiers
    ? event.tiers.reduce((sum, t) => sum + (t.qty || t.capacity || 0), 0)
    : 0;

  const totalSold = event.tiers
    ? event.tiers.reduce((sum, t) => sum + (t.sold || 0), 0)
    : 0;

  const availableSpots = Math.max(0, totalCapacity - totalSold);

  const formattedDate = new Date(event.date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const isExpired = new Date(event.date) < new Date();
  const isFree = lowestPrice === 0 || lowestPrice == null;
  const displayBusiness = businessName || 'FoodSpot';

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left: '-9999px',
        top: '-9999px',
        width: '400px',
        height: '711px',
        overflow: 'hidden',
        fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
        background: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        zIndex: -1,
      }}
    >
      {/* ═══════════════════════════════════════════════════════════
          TOP HALF: Image (full bleed)
          ═══════════════════════════════════════════════════════════ */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '355px',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        <img
          src={event.image}
          alt={event.name}
          crossOrigin="anonymous"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            filter: isExpired ? 'grayscale(0.5) brightness(0.7)' : 'brightness(0.95)',
          }}
        />
        {/* Fade to solid at bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '80px',
            background: 'linear-gradient(to bottom, transparent 0%, #0f172a 100%)',
          }}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════
          BOTTOM HALF: Content (timer/countdown style — spread out)
          ═══════════════════════════════════════════════════════════ */}
      <div
        style={{
          flex: 1,
          background: '#0f172a',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          justifyContent: 'space-between',
        }}
      >
        {/* Category pill — big, prominent, overlays image slightly */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '999px',
            background: isExpired ? 'rgba(239, 68, 68, 0.9)' : 'rgba(16, 185, 129, 0.9)',
            backdropFilter: 'blur(8px)',
            color: '#fff',
            fontSize: '10px',
            fontWeight: '900',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            alignSelf: 'flex-start',
            marginTop: '-8px',
          }}
        >
          ●{' '}
          {isExpired
            ? 'Event Ended'
            : event.category
              ? `${event.category} Exclusive`
              : 'Exclusive'}
        </div>

        {/* Title */}
        <div>
          <h1
            style={{
              margin: '0',
              fontSize: '22px',
              fontWeight: '900',
              color: '#ffffff',
              lineHeight: 1.25,
              letterSpacing: '-0.02em',
            }}
          >
            {event.name}
          </h1>
        </div>

        {/* Info rows — clean, readable, like timer blocks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Date */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '11px',
              color: 'rgba(255,255,255,0.65)',
            }}
          >
            <span style={{ fontSize: '13px' }}>📅</span>
            <span style={{ fontWeight: '700' }}>{formattedDate}</span>
          </div>

          {/* Time */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '11px',
              color: 'rgba(255,255,255,0.65)',
            }}
          >
            <span style={{ fontSize: '13px' }}>🕐</span>
            <span style={{ fontWeight: '700' }}>{event.time}</span>
          </div>

          {/* Location — with padding to prevent cut-off */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              fontSize: '11px',
              color: 'rgba(255,255,255,0.65)',
              paddingRight: '8px',
            }}
          >
            <span style={{ fontSize: '13px', flexShrink: 0 }}>📍</span>
            <span
              style={{
                fontWeight: '700',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
              }}
            >
              {event.location}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            width: '100%',
            height: '1px',
            background: 'rgba(255,255,255,0.1)',
          }}
        />

        {/* Bottom row: Price + Capacity */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: '10px',
          }}
        >
          {/* Price / Free indicator */}
          {!isExpired ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: '700',
                  color: 'rgba(255,255,255,0.4)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                🎟 Tickets
              </span>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '4px',
                }}
              >
                {isFree ? (
                  <span
                    style={{
                      fontSize: '18px',
                      fontWeight: '900',
                      color: '#ffffff',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    FREE
                  </span>
                ) : (
                  <>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: '700',
                        color: 'rgba(255,255,255,0.5)',
                      }}
                    >
                      from
                    </span>
                    <span
                      style={{
                        fontSize: '20px',
                        fontWeight: '900',
                        color: '#ffffff',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      ${lowestPrice}
                    </span>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div />
          )}

          {/* Available spots */}
          {availableSpots > 0 && !isExpired ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end' }}>
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: '700',
                  color: 'rgba(255,255,255,0.4)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                Available
              </span>
              <span
                style={{
                  fontSize: '16px',
                  fontWeight: '900',
                  color: '#ffffff',
                  letterSpacing: '-0.02em',
                }}
              >
                {availableSpots}
              </span>
            </div>
          ) : (
            <div />
          )}
        </div>

        {/* Business name — bottom right */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '1px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            paddingTop: '8px',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontWeight: '900',
              color: '#ffffff',
              letterSpacing: '-0.01em',
            }}
          >
            {displayBusiness}
          </span>
          <span
            style={{
              fontSize: '8px',
              fontWeight: '600',
              color: 'rgba(255,255,255,0.3)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            by FoodSpot
          </span>
        </div>
      </div>
    </div>
  );
});

export default EventShareCard;
