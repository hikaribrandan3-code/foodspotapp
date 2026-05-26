import * as React from 'react';

/**
 * EventShareCard — hidden 9:16 story card for Instagram sharing
 *
 * Rendered off-screen at 400×711px, then captured by html2canvas at scale 2.7
 * → produces ~1080×1920px output (full Instagram Story resolution)
 *
 * IMPORTANT: Uses only inline styles — html2canvas does not run Tailwind JIT.
 * No className, no CSS imports, no dynamic classes.
 */
const EventShareCard = React.forwardRef(function EventShareCard({ event }, ref) {
  if (!event) return null;

  const lowestPrice = event.tiers
    ? Math.min(...event.tiers.filter(t => !t.forced_sold_out).map(t => t.price))
    : null;

  const formattedDate = new Date(event.date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
  });

  const isExpired = new Date(event.date) < new Date();

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left: '-9999px',
        top: '-9999px',
        width: '400px',
        height: '711px',
        borderRadius: '0px',
        overflow: 'hidden',
        fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
        background: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        zIndex: -1,
      }}
    >
      {/* Hero Image — top 55% */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '390px',
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
            filter: isExpired ? 'grayscale(0.5) brightness(0.7)' : 'brightness(0.85)',
          }}
        />
        {/* Bottom fade into card body */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, transparent 30%, #0f172a 100%)',
          }}
        />
        {/* Badge pill */}
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '24px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            borderRadius: '999px',
            background: isExpired ? '#ef4444' : '#10b981',
            color: '#fff',
            fontSize: '9px',
            fontWeight: '900',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
          }}
        >
          {isExpired ? 'Event Ended' : event.category || 'Exclusive'}
        </div>
      </div>

      {/* Card Body — bottom 45% */}
      <div
        style={{
          flex: 1,
          background: '#0f172a',
          padding: '20px 24px 16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* Event Name */}
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: '28px',
              fontWeight: '900',
              color: '#ffffff',
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              marginBottom: '16px',
            }}
          >
            {event.name}
          </h1>

          {/* Info Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Date */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  flexShrink: 0,
                }}
              >
                📅
              </div>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: '700',
                  color: 'rgba(255,255,255,0.75)',
                }}
              >
                {formattedDate}
              </span>
            </div>

            {/* Time */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  flexShrink: 0,
                }}
              >
                🕐
              </div>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: '700',
                  color: 'rgba(255,255,255,0.75)',
                }}
              >
                {event.time}
              </span>
            </div>

            {/* Location */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  flexShrink: 0,
                }}
              >
                📍
              </div>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: '700',
                  color: 'rgba(255,255,255,0.75)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '300px',
                }}
              >
                {event.location}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom row: price + branding */}
        <div>
          {/* Divider */}
          <div
            style={{
              width: '100%',
              height: '1px',
              background: 'rgba(255,255,255,0.08)',
              margin: '14px 0',
            }}
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {/* Ticket price */}
            {!isExpired && lowestPrice != null ? (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span
                  style={{
                    fontSize: '9px',
                    fontWeight: '700',
                    color: 'rgba(255,255,255,0.4)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                  }}
                >
                  🎟 From
                </span>
                <span
                  style={{
                    fontSize: '20px',
                    fontWeight: '900',
                    color: '#10b981',
                    letterSpacing: '-0.02em',
                  }}
                >
                  ${lowestPrice}
                </span>
              </div>
            ) : (
              <div />
            )}

            {/* FoodSpot branding */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '1px',
              }}
            >
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: '900',
                  color: '#ffffff',
                  letterSpacing: '-0.01em',
                }}
              >
                FoodSpot
              </span>
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: '600',
                  color: 'rgba(255,255,255,0.35)',
                  letterSpacing: '0.05em',
                }}
              >
                foodspot.app
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default EventShareCard;
