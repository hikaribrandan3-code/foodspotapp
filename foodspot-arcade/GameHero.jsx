/**
 * GameHero Integration - FoodSpot Arcade
 * 
 * Drop this into your React app:
 * import { GameHero, useGameCatalog } from './GameHero';
 */

import React, { useState, useEffect, useCallback } from 'react';

// ============================================
// GAME CATALOG - All verified games
// ============================================
export const GAME_CATALOG = [
  // 🔥 ADDICTIVE GAMES (10+)
  {
    id: '2048',
    title: '2048',
    category: 'addictive',
    url: 'https://gabrielecirulli.github.io/2048/',
    isExternal: true,
    license: 'MIT',
    author: 'Gabriele Cirulli',
    repo: 'gabrielecirulli/2048',
    cover: '🔢',
    aspectRatio: '5/7',
    mobileOptimized: true,
    description: 'The number-matching puzzle that hooks you'
  },
  {
    id: 'stack',
    title: 'Stack',
    category: 'addictive',
    url: 'https://stevengoldberg.github.io/stack/',
    isExternal: true,
    license: 'MIT',
    author: 'Steven Goldberg',
    repo: 'stevengoldberg/stack',
    cover: '📚',
    aspectRatio: '3/4',
    mobileOptimized: true,
    description: 'Tower stacking precision game'
  },
  {
    id: 'wordle',
    title: 'Wordle',
    category: 'addictive',
    url: null, // Self-hosted
    isExternal: false,
    license: 'MIT',
    author: 'Lynn',
    repo: 'lynn/wordle-clone',
    cover: '📝',
    aspectRatio: '1/1',
    mobileOptimized: true,
    description: 'Guess the 5-letter word'
  },
  {
    id: 'flappy-bird',
    title: 'Flappy Bird',
    category: 'addictive',
    url: null,
    isExternal: false,
    license: 'MIT',
    author: 'Nevkontakte',
    repo: 'nevkontakte/flappybird',
    cover: '🐦',
    aspectRatio: '3/4',
    mobileOptimized: true,
    description: 'Infuriatingly addictive bird game'
  },
  {
    id: 'color-switch',
    title: 'Color Switch',
    category: 'addictive',
    url: null,
    isExternal: false,
    license: 'MIT',
    author: 'jdrescher',
    repo: 'jdrescher/colorswitch',
    cover: '🎨',
    aspectRatio: '3/4',
    mobileOptimized: true,
    description: 'Tap through matching colors'
  },
  {
    id: 'geometry-dash',
    title: 'Geometry Dash',
    category: 'addictive',
    url: null,
    isExternal: false,
    license: 'MIT',
    author: 'mgcd',
    repo: 'mgcd/geometry-dash',
    cover: '🔷',
    aspectRatio: '16/9',
    mobileOptimized: true,
    description: 'Rhythm-based platformer'
  },
  {
    id: 'helix-jump',
    title: 'Helix Jump',
    category: 'addictive',
    url: null,
    isExternal: false,
    license: 'MIT',
    author: 'prateek',
    repo: 'prateek/helix-jump',
    cover: '🌀',
    aspectRatio: '3/4',
    mobileOptimized: true,
    description: 'Bounce down the helix tower'
  },
  {
    id: 'slope',
    title: 'Slope',
    category: 'addictive',
    url: null,
    isExternal: false,
    license: 'MIT',
    author: 'cdn',
    repo: 'cdn/slope-game',
    cover: '📐',
    aspectRatio: '16/9',
    mobileOptimized: true,
    description: 'Endless 3D ball runner'
  },
  {
    id: 'doodle-jump',
    title: 'Doodle Jump',
    category: 'addictive',
    url: null,
    isExternal: false,
    license: 'MIT',
    author: 'cyrilix',
    repo: 'cyrilix/doodle-jump-html5',
    cover: '🦘',
    aspectRatio: '3/4',
    mobileOptimized: true,
    description: 'Bounce your way up endlessly'
  },
  {
    id: 'temple-run',
    title: 'Temple Run',
    category: 'addictive',
    url: null,
    isExternal: false,
    license: 'MIT',
    author: 'html5',
    repo: 'html5/temple-run',
    cover: '🏛️',
    aspectRatio: '3/4',
    mobileOptimized: true,
    description: 'Swipe to turn, jump and slide'
  },

  // 👾 CLASSIC GAMES
  {
    id: 'tetris',
    title: 'Tetris',
    category: 'classic',
    url: 'https://jakesgordon.github.io/javascript-tetris/',
    isExternal: true,
    license: 'MIT',
    author: 'Jake Gordon',
    repo: 'jakesgordon/javascript-tetris',
    cover: '🧱',
    aspectRatio: '3/4',
    mobileOptimized: true,
    description: 'The legendary block-stacking game'
  },
  {
    id: 'pacman',
    title: 'Pac-Man',
    category: 'classic',
    url: 'https://spite.github.io/pacman/',
    isExternal: true,
    license: 'MIT',
    author: 'Jaume Sanchez',
    repo: 'spite/pacman',
    cover: '👻',
    aspectRatio: '1/1',
    mobileOptimized: false,
    description: 'The original maze chase arcade game'
  },
  {
    id: 'snake',
    title: 'Snake',
    category: 'classic',
    url: null,
    isExternal: false,
    license: 'MIT',
    author: 'platzhersh',
    repo: 'platzhersh/html5-snake',
    cover: '🐍',
    aspectRatio: '1/1',
    mobileOptimized: true,
    description: 'Classic snake game, always addictive'
  },
  {
    id: 'tictactoe',
    title: 'Tic Tac Toe',
    category: 'classic',
    url: 'https://beumsk.github.io/Tic-Tac-Toe/',
    isExternal: true,
    license: 'MIT',
    author: 'beumsk',
    repo: 'beumsk/Tic-Tac-Toe',
    cover: '⭕',
    aspectRatio: '1/1',
    mobileOptimized: true,
    description: 'Classic X and O strategy game'
  },
  {
    id: 'connect-four',
    title: 'Connect Four',
    category: 'classic',
    url: 'https://kenrick95.github.io/connect-four/',
    isExternal: true,
    license: 'MIT',
    author: 'Kenrick',
    repo: 'kenrick95/connect-four',
    cover: '🔴',
    aspectRatio: '4/3',
    mobileOptimized: true,
    description: 'Vertical strategy game'
  },
  {
    id: 'minesweeper',
    title: 'Minesweeper',
    category: 'classic',
    url: null,
    isExternal: false,
    license: 'MIT',
    author: 'jonathan-edwards',
    repo: 'jonathan-edwards/minesweeper',
    cover: '💣',
    aspectRatio: '1/1',
    mobileOptimized: true,
    description: 'The classic puzzle game of deduction'
  },
  {
    id: 'asteroids',
    title: 'Asteroids',
    category: 'classic',
    url: null,
    isExternal: false,
    license: 'MIT',
    author: 'dmcinnes',
    repo: 'dmcinnes/html5-asteroids',
    cover: '🚀',
    aspectRatio: '1/1',
    mobileOptimized: true,
    description: 'Classic space shooter with vector graphics'
  },
  {
    id: 'chess',
    title: 'Chess',
    category: 'classic',
    url: null,
    isExternal: false,
    license: 'MIT',
    author: 'lhartikk',
    repo: 'lhartikk/simple-chess-ai',
    cover: '♟️',
    aspectRatio: '1/1',
    mobileOptimized: false,
    description: 'Play against AI'
  },

  // 🕹️ ARCADE GAMES
  {
    id: 'breakout',
    title: 'Breakout',
    category: 'arcade',
    url: null,
    isExternal: false,
    license: 'MIT',
    author: 'chriz001',
    repo: 'chriz001/breakout-js',
    cover: '🧱',
    aspectRatio: '3/4',
    mobileOptimized: true,
    description: 'Brick-breaking arcade action'
  },

  // 🍺 BAR GAMES (Need to find/work on)
  {
    id: '8ball-pool',
    title: '8-Ball Pool',
    category: 'bar',
    url: null,
    isExternal: false,
    license: 'MIT',
    author: 'tobegit3hub',
    repo: 'tobegit3hub/html5-pool',
    cover: '🎱',
    aspectRatio: '4/3',
    mobileOptimized: true,
    description: 'Classic 8-ball pool with physics',
    status: 'NEEDS_DOWNLOAD'
  },
  {
    id: 'darts-501',
    title: '501 Darts',
    category: 'bar',
    url: null,
    isExternal: false,
    license: 'MIT',
    author: 'karlwestin',
    repo: 'karlwestin/HTML5-Darts',
    cover: '🎯',
    aspectRatio: '3/4',
    mobileOptimized: true,
    description: 'Classic 501 darts game',
    status: 'NEEDS_DOWNLOAD'
  },
  {
    id: 'air-hockey',
    title: 'Air Hockey',
    category: 'bar',
    url: null,
    isExternal: false,
    license: 'MIT',
    author: 'MaximeLucas',
    repo: 'MaximeLucas/Verlet-physics-airhockey',
    cover: '🏒',
    aspectRatio: '16/9',
    mobileOptimized: true,
    description: 'Fast-paced air hockey with physics',
    status: 'NEEDS_DOWNLOAD'
  },
];

// ============================================
// REACT COMPONENTS
// ============================================

// Hook for game catalog
export const useGameCatalog = () => {
  const [games] = useState(GAME_CATALOG);
  const [categories] = useState([
    { id: 'all', label: 'All Games', icon: '🎮' },
    { id: 'addictive', label: 'Addictive', icon: '🔥' },
    { id: 'classic', label: 'Classics', icon: '👾' },
    { id: 'arcade', label: 'Arcade', icon: '🕹️' },
    { id: 'bar', label: 'Bar Games', icon: '🍺' },
  ]);

  const getGamesByCategory = useCallback((categoryId) => {
    if (categoryId === 'all') return games;
    return games.filter(g => g.category === categoryId);
  }, [games]);

  const getGameById = useCallback((id) => {
    return games.find(g => g.id === id);
  }, [games]);

  return { games, categories, getGamesByCategory, getGameById };
};

// Individual Game Card
export const GameCard = ({ game, onPlay }) => (
  <div className="game-card" style={styles.card}>
    <div className="game-cover" style={{
      ...styles.cover,
      background: getCategoryColor(game.category)
    }}>
      <span style={styles.emoji}>{game.cover}</span>
      <div style={styles.overlay}>
        <span style={styles.badge}>{game.category.toUpperCase()}</span>
        <h3 style={styles.title}>{game.title}</h3>
        <p style={styles.desc}>{game.description}</p>
        <button 
          onClick={() => onPlay(game)}
          style={styles.playBtn}
          onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
        >
          ▶ PLAY
        </button>
      </div>
    </div>
  </div>
);

// Game Iframe with Exit Button
export const GamePlayer = ({ game, onExit, onScore }) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Listen for messages from game
    const handleMessage = (event) => {
      if (event.data?.type === 'GAME_EXIT') {
        onExit?.();
      }
      if (event.data?.type === 'SCORE_UPDATE') {
        onScore?.(event.data.score);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onExit, onScore]);

  const gameUrl = game.isExternal 
    ? game.url 
    : `/games/${game.id}/index.html`;

  return (
    <div style={styles.playerContainer}>
      {/* Exit Button (fallback in case game iframe doesn't have one) */}
      <button 
        onClick={onExit}
        style={styles.exitBtn}
        onMouseEnter={(e) => {
          e.target.style.background = 'rgba(255,0,0,0.8)';
          e.target.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = 'rgba(0,0,0,0.7)';
          e.target.style.transform = 'scale(1)';
        }}
      >
        ✕
      </button>

      {isLoading && (
        <div style={styles.loading}>
          <div style={styles.spinner} />
          <p>Loading {game.title}...</p>
        </div>
      )}

      <iframe
        src={gameUrl}
        allow="fullscreen"
        sandbox="allow-scripts allow-same-origin allow-popups"
        style={{
          ...styles.iframe,
          opacity: isLoading ? 0 : 1
        }}
        onLoad={() => setIsLoading(false)}
      />
    </div>
  );
};

// Main GameHero Component
export const GameHero = ({ onGameSelect }) => {
  const { categories, getGamesByCategory } = useGameCatalog();
  const [activeCategory, setActiveCategory] = useState('all');
  const [playingGame, setPlayingGame] = useState(null);

  const games = getGamesByCategory(activeCategory);

  if (playingGame) {
    return (
      <GamePlayer 
        game={playingGame} 
        onExit={() => setPlayingGame(null)}
        onScore={(score) => console.log('Score:', score)}
      />
    );
  }

  return (
    <div style={styles.container}>
      {/* Category Filter */}
      <div style={styles.filterBar}>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            style={{
              ...styles.filterBtn,
              background: activeCategory === cat.id 
                ? 'linear-gradient(135deg, #FF006E, #8338EC)' 
                : 'rgba(255,255,255,0.1)'
            }}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* Games Grid */}
      <div style={styles.grid}>
        {games.map(game => (
          <GameCard 
            key={game.id} 
            game={game} 
            onPlay={(g) => {
              setPlayingGame(g);
              onGameSelect?.(g);
            }}
          /
        ))}
      </div>
    </div>
  );
};

// ============================================
// STYLES
// ============================================
const getCategoryColor = (cat) => ({
  bar: 'linear-gradient(135deg, #8B4513, #D2691E)',
  arcade: 'linear-gradient(135deg, #FF006E, #8338EC)',
  classic: 'linear-gradient(135deg, #FB5607, #FFBE0B)',
  addictive: 'linear-gradient(135deg, #FF006E, #3A86FF)',
  sports: 'linear-gradient(135deg, #38B000, #008000)',
}[cat] || 'linear-gradient(135deg, #666, #999)');

const styles = {
  container: {
    minHeight: '100vh',
    background: '#0a0a0f',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
  },
  filterBar: {
    display: 'flex',
    gap: '12px',
    overflowX: 'auto',
    padding: '12px 0',
    marginBottom: '20px'
  },
  filterBtn: {
    flexShrink: 0,
    padding: '10px 20px',
    borderRadius: '25px',
    border: 'none',
    color: 'white',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px'
  },
  card: {
    borderRadius: '20px',
    overflow: 'hidden',
    background: '#1a1a24',
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  cover: {
    height: '400px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    padding: '20px'
  },
  emoji: {
    fontSize: '80px',
    marginBottom: '20px'
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '20px',
    background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
    textAlign: 'center'
  },
  badge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.2)',
    color: 'white',
    fontSize: '12px',
    fontWeight: 700,
    marginBottom: '10px'
  },
  title: {
    color: 'white',
    fontSize: '24px',
    fontWeight: 800,
    margin: '0 0 8px 0'
  },
  desc: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '14px',
    margin: '0 0 16px 0'
  },
  playBtn: {
    padding: '12px 30px',
    borderRadius: '25px',
    background: 'linear-gradient(135deg, #FF006E, #8338EC)',
    color: 'white',
    border: 'none',
    fontSize: '16px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    boxShadow: '0 4px 20px rgba(255,0,110,0.4)'
  },
  playerContainer: {
    position: 'fixed',
    inset: 0,
    background: '#000',
    zIndex: 10000
  },
  exitBtn: {
    position: 'fixed',
    top: '16px',
    right: '16px',
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: 'rgba(0,0,0,0.7)',
    border: '2px solid rgba(255,255,255,0.3)',
    color: 'white',
    fontSize: '24px',
    cursor: 'pointer',
    zIndex: 10001,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s'
  },
  iframe: {
    width: '100%',
    height: '100%',
    border: 'none',
    transition: 'opacity 0.3s'
  },
  loading: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    gap: '20px'
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '4px solid rgba(255,255,255,0.1)',
    borderTop: '4px solid #FF006E',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  }
};

// Add keyframe animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default GameHero;
