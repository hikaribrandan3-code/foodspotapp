/**
 * GameHero-EASY.jsx
 * 
 * EASIEST integration — uses live GitHub Pages URLs
 * No downloads, no hosting, just copy and use
 */

import React, { useState, useEffect } from 'react';

// ✅ MOBILE-OPTIMIZED games — verified touch-friendly
const LIVE_GAMES = [
  { 
    id: '2048', 
    title: '2048', 
    url: 'https://gabrielecirulli.github.io/2048/', 
    cover: '🔢',
    mobile: true 
  },
  { 
    id: 'hextris', 
    title: 'Hextris', 
    url: 'https://hextris.github.io/hextris/', 
    cover: '🔷',
    mobile: true 
  },
  { 
    id: 'stack', 
    title: 'Stack', 
    url: 'https://stevengoldberg.github.io/stack/', 
    cover: '📚',
    mobile: true 
  },
  { 
    id: 'clumsybird', 
    title: 'Clumsy Bird', 
    url: 'https://ellisonleao.github.io/clumsy-bird/', 
    cover: '🐤',
    mobile: true 
  },
  { 
    id: 'tictactoe', 
    title: 'Tic Tac Toe', 
    url: 'https://beumsk.github.io/Tic-Tac-Toe/', 
    cover: '⭕',
    mobile: true 
  },
  { 
    id: 'connect4', 
    title: 'Connect Four', 
    url: 'https://kenrick95.github.io/connect-four/', 
    cover: '🔴',
    mobile: true 
  },
];

export default function GameHeroEasy() {
  const [playing, setPlaying] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePlay = (game) => {
    setLoading(true);
    setError(null);
    setPlaying(game);
    setTimeout(() => setLoading(false), 1500);
  };

  const handleClose = () => {
    setPlaying(null);
    setLoading(false);
    setError(null);
  };

  if (playing) {
    return (
      <div style={{ 
        position: 'fixed', 
        inset: 0, 
        background: '#000',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {loading && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'white',
            fontSize: 18,
            zIndex: 50
          }}>
            Loading {playing.title}...
          </div>
        )}
        
        <div style={{ flex: 1, position: 'relative', opacity: loading ? 0 : 1 }}>
          <iframe 
            src={playing.url} 
            style={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%', 
              height: '100%', 
              border: 'none',
              touchAction: 'manipulation',
              pointerEvents: 'auto',
              zIndex: 1
            }}
            allow="fullscreen; autoplay; pointer-lock"
            sandbox="allow-scripts allow-same-origin allow-popups allow-pointer-lock"
            scrolling="auto"
            title={playing.title}
            onError={() => setError('Failed to load game')}
          />
        </div>
        
        <button 
          onClick={handleClose}
          onTouchStart={handleClose}
          style={{
            position: 'fixed', 
            top: 10, 
            right: 10, 
            zIndex: 100,
            width: 44, 
            height: 44, 
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.8)', 
            border: '2px solid rgba(255,255,255,0.8)',
            color: 'white', 
            fontSize: 20, 
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            touchAction: 'manipulation'
          }}
        >
          ✕
        </button>
        
        <div style={{
          position: 'fixed',
          bottom: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '8px 16px',
          borderRadius: 20,
          fontSize: 12,
          zIndex: 100
        }}>
          Tap ✕ to exit
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, background: '#0f172a', minHeight: '100vh' }}>
      <h2 style={{ color: 'white', marginBottom: 20 }}>Quick Games</h2>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(2, 1fr)', 
        gap: 16 
      }}>
        {LIVE_GAMES.map((game) => (
          <button
            key={game.id}
            onClick={() => handlePlay(game)}
            onTouchStart={() => handlePlay(game)}
            style={{
              aspectRatio: '1',
              borderRadius: 16,
              border: '2px solid #334155',
              background: '#1e293b',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 16,
              touchAction: 'manipulation'
            }}
          >
            <span style={{ fontSize: 48, marginBottom: 8 }}>{game.cover}</span>
            <span style={{ color: 'white', fontWeight: 600 }}>{game.title}</span>
            {game.mobile && (
              <span style={{ 
                color: '#22c55e', 
                fontSize: 10, 
                marginTop: 4 
              }}>
                📱 Mobile
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
