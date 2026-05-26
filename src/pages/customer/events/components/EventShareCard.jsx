import * as React from 'react';

/**
 * EventShareCard — premium Instagram story card
 *
 * Design system:
 * - Left border accent (emerald, 12px) — brand presence
 * - Large typography hierarchy (title 36px)
 * - Ticket-stub design language (dashed dividers, corner fold)
 * - Color-blocking with brand accent (emerald 5% bg on bottom section)
 * - Icons elevated (20px) with subtle backgrounds
 * - Badges for price/availability (emerald backgrounds)
 * - Generous spacing, breathing room
 * - Professional, share-worthy appearance
 *
 * Rendered off-screen at 400×711px, captured at scale 2.7 → ~1080×1920px
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
  const spotsPercentage = totalCapacity > 0 ? Math.round((availableSpots / totalCapacity) * 100) : 0;

  const formattedDate = new Date(event.date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const isExpired = new Date(event.date) < new Date();
  const isFree = lowestPrice === 0 || lowestPrice == null;
  const isLimited = availableSpots > 0 && spotsPercentage <= 25;
  const displayBusiness = businessName || 'FoodSpot';

  const ACCENT_COLOR = '#10b981'; // emerald brand color

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
          TOP HALF: Image with overlay
          ═══════════════════════════════════════════════════════════ */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '320px',
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
            filter: isExpired ? 'grayscale(0.6) brightness(0.7)' : 'brightness(0.95)',
          }}
        />
        {/* Minimal overlay — no green tint */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `
              radial-gradient(ellipse at 70% 20%, transparent 0%, rgba(15, 23, 42, 0.15) 60%, rgba(15, 23, 42, 0.3) 100%)
            `,
          }}
        />
        {/* Fade to solid at bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '100px',
            background: `linear-gradient(to bottom, transparent 0%, rgba(15, 23, 42, 0.95) 100%)`,
          }}
        />
        {/* Ticket stub fold effect (top-right corner) */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 0,
            height: 0,
            borderStyle: 'solid',
            borderWidth: `0 20px 20px 0`,
            borderColor: `transparent ${ACCENT_COLOR} transparent transparent`,
            opacity: 0.8,
          }}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════
          BOTTOM HALF: Content with color-blocking
          ═══════════════════════════════════════════════════════════ */}
      <div
        style={{
          flex: 1,
          background: `linear-gradient(135deg, #0f172a 0%, rgba(16, 185, 129, 0.02) 100%)`,
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          justifyContent: 'space-between',
        }}
      >
        {/* Category pill — left-aligned, centered text inside */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '7px 14px',
            borderRadius: '999px',
            background: isExpired
              ? 'rgba(239, 68, 68, 0.15)'
              : 'rgba(16, 185, 129, 0.15)',
            border: `1.5px solid ${isExpired ? 'rgba(239, 68, 68, 0.5)' : ACCENT_COLOR}`,
            color: isExpired ? '#fca5a5' : ACCENT_COLOR,
            fontSize: '11px',
            fontWeight: '900',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            alignSelf: 'flex-start',
            width: 'auto',
          }}
        >
          {isExpired ? 'Event Ended' : event.category || 'Exclusive'}
        </div>

        {/* Title — LARGE, bold, dominant, pure white */}
        <div>
          <h1
            style={{
              margin: '0',
              fontSize: '36px',
              fontWeight: '900',
              color: 'rgb(255, 255, 255)',
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)',
            }}
          >
            {event.name}
          </h1>
        </div>

        {/* Info rows — generous spacing, elevated icons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Date */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '12px',
              color: 'rgba(255,255,255,0.75)',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                flexShrink: 0,
              }}
            >
              📅
            </div>
            <span style={{ fontWeight: '700' }}>{formattedDate}</span>
          </div>

          {/* Time */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '12px',
              color: 'rgba(255,255,255,0.75)',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                flexShrink: 0,
              }}
            >
              🕐
            </div>
            <span style={{ fontWeight: '700' }}>{event.time}</span>
          </div>

          {/* Location — prominent, 14px */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              fontSize: '14px',
              color: 'rgba(255,255,255,0.75)',
              paddingRight: '8px',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                flexShrink: 0,
              }}
            >
              📍
            </div>
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

        {/* Dashed divider (ticket stub style) */}
        <div
          style={{
            width: '100%',
            height: '1px',
            background: 'transparent',
            borderTop: '2px dashed rgba(16, 185, 129, 0.3)',
            margin: '4px 0',
          }}
        />

        {/* Bottom row: Price badge + Availability badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
          }}
        >
          {/* Price badge */}
          {!isExpired ? (
            <div
              style={{
                display: 'inline-flex',
                flexDirection: 'column',
                gap: '4px',
                padding: '10px 14px',
                borderRadius: '12px',
                background: isFree
                  ? 'rgba(34, 197, 94, 0.2)'
                  : 'rgba(16, 185, 129, 0.2)',
                border: `1.5px solid ${isFree ? '#22c55e' : ACCENT_COLOR}`,
              }}
            >
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: '700',
                  color: '#ffffff',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                🎟 {isFree ? 'Free Entry' : 'Tickets From'}
              </span>
              <span
                style={{
                  fontSize: isFree ? '22px' : '20px',
                  fontWeight: '900',
                  color: '#ffffff',
                  letterSpacing: '-0.02em',
                }}
              >
                {isFree ? 'FREE' : `$${lowestPrice}`}
              </span>
            </div>
          ) : (
            <div />
          )}

          {/* Availability badge */}
          {availableSpots > 0 && !isExpired ? (
            <div
              style={{
                display: 'inline-flex',
                flexDirection: 'column',
                gap: '4px',
                padding: '10px 14px',
                borderRadius: '12px',
                background: isLimited
                  ? 'rgba(239, 68, 68, 0.2)'
                  : 'rgba(34, 197, 94, 0.2)',
                border: `1.5px solid ${isLimited ? '#ef4444' : '#22c55e'}`,
              }}
            >
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: '700',
                  color: '#ffffff',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                {isLimited ? '⚡ Limited' : '✓ Available'}
              </span>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '4px',
                }}
              >
                <span
                  style={{
                    fontSize: '20px',
                    fontWeight: '900',
                    color: '#ffffff',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {availableSpots}
                </span>
                <span
                  style={{
                    fontSize: '9px',
                    color: 'rgba(255,255,255,0.4)',
                    fontWeight: '700',
                  }}
                >
                  spots
                </span>
              </div>
            </div>
          ) : (
            <div />
          )}
        </div>

        {/* Business name — premium footer with separator */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '2px',
            borderTop: `1px dashed rgba(16, 185, 129, 0.3)`,
            paddingTop: '10px',
          }}
        >
          <span
            style={{
              fontSize: '8px',
              fontWeight: '700',
              color: 'rgba(16, 185, 129, 0.6)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            Powered by
          </span>
          <span
            style={{
              fontSize: '12px',
              fontWeight: '900',
              color: '#ffffff',
              letterSpacing: '-0.01em',
            }}
          >
            {displayBusiness}
          </span>
        </div>
      </div>
    </div>
  );
});

export default EventShareCard;
