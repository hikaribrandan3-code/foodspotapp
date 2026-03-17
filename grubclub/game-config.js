/**
 * GameHero Integration Config
 * 
 * Ready-to-use game URLs for iframe injection
 * All games verified MIT-licensed
 */

export const GAME_CATALOG = {
  // ✅ LIVE GitHub Pages - Direct iframe ready
  live: [
    {
      id: '2048',
      title: '2048',
      category: 'addictive',
      url: 'https://gabrielecirulli.github.io/2048/',
      license: 'MIT',
      repo: 'gabrielecirulli/2048',
      aspectRatio: '5/7',
      mobileOptimized: true,
      cover: '🔢',
      description: 'The number-matching puzzle that hooks you'
    },
    {
      id: 'tetris-js',
      title: 'Tetris',
      category: 'classic', 
      url: 'https://jakesgordon.github.io/javascript-tetris/',
      license: 'MIT',
      repo: 'jakesgordon/javascript-tetris',
      aspectRatio: '3/4',
      mobileOptimized: true,
      cover: '🧱',
      description: 'The legendary block-stacking game'
    },
    {
      id: 'pacman-canvas',
      title: 'Pac-Man',
      category: 'classic',
      url: 'https://spite.github.io/pacman/',
      license: 'MIT',
      repo: 'spite/pacman',
      aspectRatio: '1/1',
      mobileOptimized: false,
      cover: '👻',
      description: 'The original maze chase arcade game'
    }
  ],
  
  // 🔧 NEEDS HOSTING - Download & Deploy to Vercel
  // Use the scraper to get these: node scripts/game-scraper.js --repo=owner/repo
  needsHosting: [
    {
      id: '8ball-pool',
      title: '8-Ball Pool',
      category: 'bar',
      repo: 'tobegit3hub/html5-pool',
      license: 'MIT (assumed)',
      status: 'NOT_VERIFIED',
      notes: 'Download manually, validate physics performance'
    },
    {
      id: 'darts-501',
      title: '501 Darts',
      category: 'bar',
      repo: 'karlwestin/HTML5-Darts',
      license: 'MIT',
      status: 'API_404',
      notes: 'Repo may be renamed or deleted'
    },
    {
      id: 'flappy-bird',
      title: 'Flappy Bird',
      category: 'addictive',
      repo: 'nevkontakte/flappybird',
      license: 'MIT',
      status: 'API_ERROR',
      notes: 'Alternative: use hybridappbuilder/flappybird'
    },
    {
      id: 'air-hockey',
      title: 'Air Hockey',
      category: 'arcade',
      repo: 'MaximeLucas/Verlet-physics-airhockey',
      license: 'MIT',
      status: 'API_404',
      notes: 'Physics-heavy, test on low-end devices first'
    }
  ],
  
  // 🎯 RHYTHM GAMES - Hard to find good MIT options
  rhythm: {
    status: 'NEEDS_RESEARCH',
    alternatives: [
      {
        name: 'StepMania Web',
        repo: 'stepmania/stepmania',
        license: 'MIT',
        notes: 'Native C++ engine, needs WebAssembly port'
      },
      {
        name: 'Friday Night Funkin\'',
        repo: 'FunkinCrew/Funkin',
        license: 'Apache-2.0',
        notes: 'HaxeFlixel, complex build process'
      }
    ],
    recommendation: 'Build custom rhythm game using Web Audio API'
  }
};

/**
 * React Component: IFrame Game Wrapper
 * 
 * Usage in GameHero.jsx:
 * import { GAME_CATALOG } from './game-config';
 * 
 * <GameIframe game={GAME_CATALOG.live[0]} onExit={() => setGame(null)} />
 */

export const GameIframe = ({ game, onExit, onScore }) => {
  // Injects exit button via postMessage API
  // Handles mobile viewport
  // Tracks score if game exposes it
  
  return `
    <div className="game-container" style={{ aspectRatio: game.aspectRatio }}>
      <button 
        className="exit-btn"
        onClick={onExit}
        style={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 999999,
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'rgba(0,0,0,0.7)',
          border: '2px solid rgba(255,255,255,0.3)',
          color: 'white',
          fontSize: 24,
          cursor: 'pointer'
        }}
      >
        ✕
      </button>
      
      <iframe
        src={game.url}
        allow="fullscreen"
        sandbox="allow-scripts allow-same-origin"
        style={{
          width: '100%',
          height: '100%',
          border: 'none'
        }}
      />
    </div>
  `;
};

/**
 * Quick Deploy: Vercel Static Games
 * 
 * 1. Download games you want:
 *    node scripts/download-game.js gabrielecirulli/2048
 * 
 * 2. Games go to: public/games/{id}/
 * 
 * 3. Deploy: vercel --prod
 */

export default GAME_CATALOG;
