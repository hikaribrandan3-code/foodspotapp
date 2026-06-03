// ============================================================
// LockedGameCard — Games 3-6 for Free Tier
// ============================================================
// Shows a darkened game card with a ? overlay.
// Classic locked game feel — visible but unplayable.
// Clicking anywhere on it opens the upgrade CTA.
// ============================================================

export function LockedGameCard({ game, onUpgradeClick }) {
  return (
    <div
      onClick={onUpgradeClick}
      className="relative rounded-xl overflow-hidden cursor-pointer select-none"
      style={{ userSelect: 'none' }}
      title="Upgrade to Pro to unlock"
    >
      {/* Game thumbnail — still visible underneath */}
      {game?.thumbnail ? (
        <img
          src={game.thumbnail}
          alt={game.name}
          className="w-full h-32 object-cover"
          draggable={false}
        />
      ) : (
        <div
          className="w-full h-32"
          style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}
        />
      )}

      {/* Dark overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: 'rgba(0, 0, 0, 0.68)',
          backdropFilter: 'blur(1.5px)',
          WebkitBackdropFilter: 'blur(1.5px)',
        }}
      />

      {/* ? SVG + label — centered over overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 z-10">
        {/* Question mark circle */}
        <svg
          width="44"
          height="44"
          viewBox="0 0 44 44"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))' }}
        >
          <circle cx="22" cy="22" r="20" stroke="rgba(255,255,255,0.85)" strokeWidth="2" />
          <text
            x="22"
            y="30"
            textAnchor="middle"
            fontSize="22"
            fontWeight="bold"
            fontFamily="system-ui, sans-serif"
            fill="rgba(255,255,255,0.9)"
          >
            ?
          </text>
        </svg>

        {/* Game name (visible but dimmed) */}
        {game?.name && (
          <span
            className="text-xs font-semibold text-center px-2"
            style={{ color: 'rgba(255,255,255,0.75)', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}
          >
            {game.name}
          </span>
        )}

        {/* Upgrade pill */}
        <span
          className="text-xs font-bold px-3 py-1 rounded-full mt-0.5"
          style={{
            background: 'var(--color-primary, #10b981)',
            color: '#fff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}
        >
          Pro
        </span>
      </div>
    </div>
  );
}
