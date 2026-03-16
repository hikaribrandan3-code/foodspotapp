import React, { useState, useCallback } from 'react';

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

  const handleGameClick = useCallback((game, e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🎮 Game clicked:', game.title);
    setPlaying(game);
  }, []);

  const handleClose = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setPlaying(null);
  }, []);

  if (playing) {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          inset: 0,
          background: '#000',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <button
          type="button"
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 999999,
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            border: '2px solid white',
            color: 'white',
            fontSize: 20,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ✕
        </button>
        <iframe
          src={playing.url}
          title={playing.title}
          style={{ width: '100%', height: '100%', border: 'none', flex: 1 }}
          allow="fullscreen; pointer-lock"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-pointer-lock"
        />
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '0 20px 100px 20px'
      }}
    >
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 12,
        maxWidth: 600,
        margin: '0 auto'
      }}>
        {LIVE_GAMES.map(game => (
          <div
            key={game.id}
            onClick={(e) => handleGameClick(game, e)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleGameClick(game, e);
              }
            }}
            style={{
              aspectRatio: '1',
              borderRadius: 16,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
              transition: 'transform 0.1s ease'
            }}
          >
            <span style={{ fontSize: 36 }}>{game.cover}</span>
            <span style={{ color: 'white', fontWeight: 'bold', fontSize: 12, textAlign: 'center', padding: '0 4px' }}>
              {game.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
