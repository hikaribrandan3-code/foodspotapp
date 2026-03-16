import React, { useState } from 'react';

const LIVE_GAMES = [
  { id: '2048', title: '2048', url: 'https://gabrielecirulli.github.io/2048/', cover: '🔢' },
  { id: 'tetris', title: 'Tetris', url: 'https://jakesgordon.github.io/javascript-tetris/', cover: '🧱' },
  { id: 'stack', title: 'Stack', url: 'https://stevengoldberg.github.io/stack/', cover: '📚' },
  { id: 'tictactoe', title: 'Tic Tac Toe', url: 'https://beumsk.github.io/Tic-Tac-Toe/', cover: '⭕' },
  { id: 'connect4', title: 'Connect Four', url: 'https://kenrick95.github.io/connect-four/', cover: '🔴' },
  { id: 'pacman', title: 'Pac-Man', url: 'https://spite.github.io/pacman/', cover: '👻' },
];

export default function GameHeroEasy() {
  const [playing, setPlaying] = useState(null);

  const handleGameClick = (game) => {
    console.log('🎮 Opening game:', game.title, game.url);
    setPlaying(game);
  };

  if (playing) {
    return (
      <div style={{ 
        position: 'fixed', 
        inset: 0, 
        background: '#000', 
        zIndex: 99999,
        touchAction: 'none'
      }}>
        <button 
          type="button"
          onClick={() => setPlaying(null)}
          style={{
            position: 'fixed', 
            top: 20, 
            right: 20, 
            zIndex: 999999,
            width: 50, 
            height: 50, 
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.8)', 
            border: '2px solid white',
            color: 'white', 
            fontSize: 24, 
            cursor: 'pointer',
            touchAction: 'manipulation'
          }}
        >
          ✕
        </button>
        <iframe 
          src={playing.url} 
          style={{ width: '100%', height: '100%', border: 'none' }}
          allow="fullscreen"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        />
      </div>
    );
  }

  return (
    <div style={{ 
      padding: 20, 
      position: 'relative',
      zIndex: 90,
      touchAction: 'pan-y'
    }}>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 15 
      }}>
        {LIVE_GAMES.map(game => (
          <button
            type="button"
            key={game.id}
            onClick={() => handleGameClick(game)}
            onTouchStart={(e) => {
              e.preventDefault();
              handleGameClick(game);
            }}
            style={{
              aspectRatio: '1',
              borderRadius: 16,
              border: 'none',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
              userSelect: 'none',
              WebkitUserSelect: 'none'
            }}
          >
            <span style={{ fontSize: 40, pointerEvents: 'none' }}>{game.cover}</span>
            <span style={{ color: 'white', fontWeight: 'bold', fontSize: 14, pointerEvents: 'none' }}>
              {game.title}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
