import React, { useState, useEffect } from 'react';

const LIVE_GAMES = [
  { id: '2048', title: '2048', url: 'https://gabrielecirulli.github.io/2048/', cover: '🔢', mobile: true },
  { id: 'hextris', title: 'Hextris', url: 'https://hextris.github.io/hextris/', cover: '🔷', mobile: true },
  { id: 'stack', title: 'Stack', url: 'https://stevengoldberg.github.io/stack/', cover: '📚', mobile: true },
  { id: 'clumsybird', title: 'Clumsy Bird', url: 'https://ellisonleao.github.io/clumsy-bird/', cover: '🐤', mobile: true },
  { id: 'tictactoe', title: 'Tic Tac Toe', url: 'https://beumsk.github.io/Tic-Tac-Toe/', cover: '⭕', mobile: true },
  { id: 'connect4', title: 'Connect Four', url: 'https://kenrick95.github.io/connect-four/', cover: '🔴', mobile: true },
];

export default function GameHeroEasy() {
  const [playing, setPlaying] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePlay = (game) => {
    setLoading(true);
    setPlaying(game);
    setTimeout(() => setLoading(false), 1000);
  };

  const handleClose = () => {
    setPlaying(null);
    setLoading(false);
  };

  if (playing) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 99999 }}>
        {loading && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'white' }}>
            Loading {playing.title}...
          </div>
        )}

        <iframe
          src={playing.url}
          style={{ width: '100%', height: '100%', border: 'none', opacity: loading ? 0 : 1 }}
          allow="fullscreen"
          sandbox="allow-scripts allow-same-origin"
        />

        <button
          onClick={handleClose}
          style={{
            position: 'fixed',
            top: 10,
            right: 10,
            zIndex: 100000,
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.8)',
            border: '2px solid white',
            color: 'white',
            fontSize: 20
          }}
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {LIVE_GAMES.map(game => (
          <button
            key={game.id}
            onClick={() => handlePlay(game)}
            style={{
              aspectRatio: '1',
              borderRadius: 16,
              background: 'linear-gradient(135deg, #1E293B, #0F172A)',
              border: '1px solid rgba(255,255,255,0.1)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
          >
            <span style={{ fontSize: 32 }}>{game.cover}</span>
            <span style={{ color: 'white', fontWeight: 'bold', fontSize: 11 }}>{game.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
