import * as React from 'react';

/**
 * EventShareCard — hidden 9:16 story card for Instagram sharing
 *
 * Rendered off-screen at 400×711px, captured by html2canvas at scale 2.7
 * → produces ~1080×1920px (full Instagram Story resolution)
 *
 * Design rules:
 * - Image is TOP HALF only — no text overlapping the photo
 * - Bottom half is a clean solid dark panel — all text lives here
 * - Info rows are pill-style (matching the event detail UI)
 * - businessName from tenant replaces hardcoded "FoodSpot"
 *
 * IMPORTANT: inline styles only — html2canvas does not run Tailwind JIT.
 */
const EventShareCard = React.forwardRef(function EventShareCard({ event, businessName }, ref) {
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
        background: '#111827',
        display: 'flex',
        flexDirection: 'column',
        zIndex: -1,
      }}
    >
      {/* ── TOP HALF: Image only, no text on top of it ── */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '340px',
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
            filter: isExpired ? 'grayscale(0.6) brightness(0.75)' : 'brightness(1)',
          }}
        />
        {/* Only a very subtle bottom fade — just enough to blend into the panel */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '60px',
            background: 'linear-gradient(to bottom, transparent, #111827)',
          }}
        />
        {/* Category pill — top left corner of image */}
        <div
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            display: 'inline-flex',
            alignItems: 'center',
            padding: '5px 12px',
            borderRadius: '999px',
            background: isExpired ? '#ef4444' : 'rgba(16, 185, 129, 0.9)',
            backdropFilter: 'blur(8px)',
            color: '#fff',
            fontSize: '9px',
            fontWeight: '900',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
          }}
        >
          {isExpired ? '● Event Ended' : `● ${event.category || 'Exclusive'}`}
        </div>
      </div>

      {/* ── BOTTOM HALF: Clean solid panel — all text here ── */}
      <div
        style={{
          flex: 1,
          background: '#111827',
          padding: '20px 22px 18px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* Event title — full contrast, nothing hiding it */}
        <div>
          <h1
            style={{
              margin: '0 0 16px 0',
              fontSize: '26px',
              fontWeight: '900',
              color: '#ffffff',
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
            }}
          >
            {event.name}
          </h1>

          {/* Info pills — same style as EventDetail UI */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Date pill */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                background: 'rgba(255,255,255,0.07)',
                borderRadius: '14px',
                padding: '8px 14px',
                alignSelf: 'flex-start',
              }}
            >
              <span style={{ fontSize: '14px' }}>📅</span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: '700',
                  color: 'rgba(255,255,255,0.85)',
                  letterSpacing: '0.01em',
                }}
              >
                {formattedDate}
              </span>
            </div>

            {/* Time pill */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                background: 'rgba(255,255,255,0.07)',
                borderRadius: '14px',
                padding: '8px 14px',
                alignSelf: 'flex-start',
              }}
            >
              <span style={{ fontSize: '14px' }}>🕐</span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: '700',
                  color: 'rgba(255,255,255,0.85)',
                }}
              >
                {event.time}
              </span>
            </div>

            {/* Location pill */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                background: 'rgba(255,255,255,0.07)',
                borderRadius: '14px',
                padding: '8px 14px',
                alignSelf: 'flex-start',
                maxWidth: '100%',
              }}
            >
              <span style={{ fontSize: '14px' }}>📍</span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: '700',
                  color: 'rgba(255,255,255,0.85)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '290px',
                }}
              >
                {event.location}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom row: price + business name */}
        <div>
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
            {/* Price */}
            {!isExpired && lowestPrice != null ? (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  borderRadius: '12px',
                  padding: '6px 14px',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                }}
              >
                <span style={{ fontSize: '13px' }}>🎟</span>
                <span
                  style={{
                    fontSize: '9px',
                    fontWeight: '700',
                    color: 'rgba(255,255,255,0.5)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                  }}
                >
                  From
                </span>
                <span
                  style={{
                    fontSize: '18px',
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

            {/* Tenant business name */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '2px',
              }}
            >
              <span
                style={{
                  fontSize: '13px',
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
                powered by FoodSpot
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default EventShareCard;
