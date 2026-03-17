/**
 * HikariBoy Emulator Shell - Delta 1:1
 * Deep purple GBA-style layout for FoodSpot Arcade
 * 
 * Features:
 * - Full-screen game showcase with cover images
 * - Left/Right to browse, A/Start to play
 * - Leak fix: hides background auth elements
 * - Responsive: iPhone Regular / Pro / Pro Max
 */

import React, { useState, useRef, useEffect } from 'react';
import './HikariBoy.css';

const BUTTONS = {
  DPAD_UP: 'dpad-up',
  DPAD_DOWN: 'dpad-down', 
  DPAD_LEFT: 'dpad-left',
  DPAD_RIGHT: 'dpad-right',
  A: 'a',
  B: 'b',
  SELECT: 'select',
  START: 'start',
  MENU: 'menu'
};

// 16 GAMES with cover.svg paths (replace with .png when available)
const GAMES = [
  { id: 'burger-stack', name: 'Burger Stack', cover: '/games/burger-stack/cover.svg', url: '/games/burger-stack/index.html' },
  { id: 'food-fight', name: 'Food Fight', cover: '/games/food-fight/cover.svg', url: '/games/food-fight/index.html' },
  { id: 'pizza-slice', name: 'Pizza Slice', cover: '/games/pizza-slice/cover.svg', url: '/games/pizza-slice/index.html' },
  { id: 'sushi-roll', name: 'Sushi Roll', cover: '/games/sushi-roll/cover.svg', url: '/games/sushi-roll/index.html' },
  { id: 'fry-catch', name: 'Fry Catch', cover: '/games/fry-catch/cover.svg', url: '/games/fry-catch/index.html' },
  { id: 'taco-tower', name: 'Taco Tower', cover: '/games/taco-tower/cover.svg', url: '/games/taco-tower/index.html' },
  { id: 'condiment-blast', name: 'Condiment Blast', cover: '/games/condiment-blast/cover.svg', url: '/games/condiment-blast/index.html' },
  { id: 'bubble-tea', name: 'Bubble Tea', cover: '/games/bubble-tea/cover.svg', url: '/games/bubble-tea/index.html' },
  { id: 'donut-roll', name: 'Donut Roll', cover: '/games/donut-roll/cover.svg', url: '/games/donut-roll/index.html' },
  { id: 'hotdog-dash', name: 'Hotdog Dash', cover: '/games/hotdog-dash/cover.svg', url: '/games/hotdog-dash/index.html' },
  { id: 'coffee-pour', name: 'Coffee Pour', cover: '/games/coffee-pour/cover.svg', url: '/games/coffee-pour/index.html' },
  { id: 'steak-flip', name: 'Steak Flip', cover: '/games/steak-flip/cover.svg', url: '/games/steak-flip/index.html' },
  { id: 'ice-cream', name: 'Ice Cream', cover: '/games/ice-cream/cover.svg', url: '/games/ice-cream/index.html' },
  { id: 'spice-invaders', name: 'Spice Invaders', cover: '/games/spice-invaders/cover.svg', url: '/games/spice-invaders/index.html' },
  { id: 'fruit-slice', name: 'Fruit Slice', cover: '/games/fruit-slice/cover.svg', url: '/games/fruit-slice/index.html' },
  { id: 'bento-box', name: 'Bento Box', cover: '/games/bento-box/cover.svg', url: '/games/bento-box/index.html' },
];

export function HikariBoy({ 
  onClose, 
  foodReady = false
}) {
  const [isBooting, setIsBooting] = useState(true);
  const [currentGame, setCurrentGame] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const gameFrameRef = useRef(null);

  // LEAK FIX: Hide background signup/auth when HikariBoy opens
  useEffect(() => {
    // Add class to body to hide auth elements
    document.body.classList.add('hikariboy-active');
    
    // Find and hide common auth container classes
    const authSelectors = [
      '.signup-container',
      '.auth-container', 
      '.login-container',
      '[class*="signup"]',
      '[class*="auth"]',
      '.modal-overlay',
      '.sign-up-modal'
    ];
    
    authSelectors.forEach(selector => {
      const el = document.querySelector(selector);
      if (el) {
        el.style.display = 'none';
        el.setAttribute('data-hikariboy-hidden', 'true');
      }
    });

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    return () => {
      // Cleanup: restore everything when HikariBoy closes
      document.body.classList.remove('hikariboy-active');
      document.body.style.overflow = '';
      
      authSelectors.forEach(selector => {
        const el = document.querySelector(selector);
        if (el && el.getAttribute('data-hikariboy-hidden') === 'true') {
          el.style.display = '';
          el.removeAttribute('data-hikariboy-hidden');
        }
      });
    };
  }, []);

  // Boot sequence
  useEffect(() => {
    const timer = setTimeout(() => setIsBooting(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Listen for GAME_EXIT from child games
  useEffect(() => {
    const handleMessage = (e) => {
      if (e.data.type === 'GAME_EXIT') {
        setCurrentGame(null);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleButtonPress = (button) => {
    if (isPaused && button === BUTTONS.START) {
      setIsPaused(false);
      return;
    }

    if (currentGame) {
      gameFrameRef.current?.contentWindow?.postMessage({
        type: 'BUTTON_PRESS',
        button
      }, '*');

      if (button === BUTTONS.START) setIsPaused(true);
      if (button === BUTTONS.MENU) onClose?.();
      if (button === BUTTONS.SELECT) {
        if (window.confirm('Back to Game Selector?')) {
          setCurrentGame(null);
        }
      }
    } else if (!isBooting) {
      // SELECTOR CONTROLS
      if (button === BUTTONS.DPAD_LEFT) {
        setSelectedIndex(prev => prev > 0 ? prev - 1 : GAMES.length - 1);
      }
      if (button === BUTTONS.DPAD_RIGHT) {
        setSelectedIndex(prev => prev < GAMES.length - 1 ? prev + 1 : 0);
      }
      if (button === BUTTONS.A || button === BUTTONS.START) {
        setCurrentGame(GAMES[selectedIndex]);
      }
      if (button === BUTTONS.MENU) onClose?.();
    }
  };

  return (
    <div className="hikariboy-emulator">
      {/* Screen Container (55%) */}
      <div className="hb-screen">
        {isBooting ? (
          <div className="hb-boot">
            <div className="boot-logo">HIKARIBOY</div>
            <div className="boot-tagline">Food coming. Game on.</div>
          </div>
        ) : !currentGame ? (
          <GameSelector 
            games={GAMES} 
            selectedIndex={selectedIndex}
          />
        ) : (
          <>
            <iframe
              ref={gameFrameRef}
              src={currentGame.url}
              title={currentGame.name}
              className="hb-game-frame"
              sandbox="allow-scripts allow-same-origin"
            />
            {isPaused && (
              <div className="hb-pause-overlay">
                <div className="pause-icon">PAUSED</div>
                <button onClick={() => setIsPaused(false)}>Resume</button>
                <button onClick={() => setCurrentGame(null)}>Quit</button>
              </div>
            )}
            {foodReady && (
              <div className="hb-food-banner">🍔 Your food is ready!</div>
            )}
          </>
        )}
      </div>

      {/* Mid Bar with Logo */}
      <div className="hb-midbar">
        <span className="midbar-logo">HIKARIBOY</span>
      </div>

      {/* Controller (45%) */}
      <div className="hb-controller">
        {/* Shoulder Buttons */}
        <div className="hb-shoulders">
          <button 
            className="shoulder-l"
            onClick={() => handleButtonPress(BUTTONS.SELECT)}
          >L</button>
          <button 
            className="shoulder-r"
            onClick={() => handleButtonPress(BUTTONS.START)}
          >R</button>
        </div>

        {/* Main Controls */}
        <div className="hb-controls-main">
          {/* D-Pad */}
          <div className="hb-dpad">
            <div className="dpad-cross">
              <button 
                className="dpad-area dpad-up"
                onClick={() => handleButtonPress(BUTTONS.DPAD_UP)}
              >▲</button>
              <button 
                className="dpad-area dpad-left"
                onClick={() => handleButtonPress(BUTTONS.DPAD_LEFT)}
              >◀</button>
              <div className="dpad-center-indent"></div>
              <button 
                className="dpad-area dpad-right"
                onClick={() => handleButtonPress(BUTTONS.DPAD_RIGHT)}
              >▶</button>
              <button 
                className="dpad-area dpad-down"
                onClick={() => handleButtonPress(BUTTONS.DPAD_DOWN)}
              >▼</button>
            </div>
          </div>

          {/* A/B Buttons */}
          <div className="hb-action-btns">
            <button 
              className="action-btn btn-b"
              onClick={() => handleButtonPress(BUTTONS.B)}
            >B</button>
            <button 
              className="action-btn btn-a"
              onClick={() => handleButtonPress(BUTTONS.A)}
            >A</button>
          </div>
        </div>

        {/* System Buttons */}
        <div className="hb-system-btns">
          <div className="sys-btn-wrap menu-wrap">
            <button 
              className="sys-circle menu-btn"
              onClick={() => onClose?.()}
            ></button>
            <span className="sys-label">MENU</span>
          </div>
          <div className="sys-btn-wrap select-wrap">
            <button 
              className="sys-circle select-btn"
              onClick={() => handleButtonPress(BUTTONS.SELECT)}
            ></button>
            <span className="sys-label">SELECT</span>
          </div>
          <div className="sys-btn-wrap start-wrap">
            <button 
              className="sys-circle start-btn"
              onClick={() => handleButtonPress(BUTTONS.START)}
            ></button>
            <span className="sys-label">START</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Game Selector - Shows ONE large cover image at a time
function GameSelector({ games, selectedIndex }) {
  const selectedGame = games[selectedIndex];
  
  return (
    <div className="hb-selector">
      {/* Arrow indicators */}
      <div className="selector-arrows">
        {selectedIndex > 0 && <span className="arrow-left">◀</span>}
        <span className="game-counter">{selectedIndex + 1} / {games.length}</span>
        {selectedIndex < games.length - 1 && <span className="arrow-right">▶</span>}
      </div>
      
      {/* Large Cover Image */}
      <div className="game-showcase">
        <div className="cover-container">
          <img 
            src={selectedGame.cover} 
            alt={selectedGame.name}
            className="game-cover"
            onError={(e) => {
              // Fallback if cover.png doesn't exist yet
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div className="cover-fallback" style={{display: 'none'}}>
            {selectedGame.name}
          </div>
        </div>
        <div className="game-title">{selectedGame.name}</div>
      </div>
      
      {/* Instructions */}
      <div className="selector-hint">
        ◀ ▶ Browse  ●  A or START to Play
      </div>
    </div>
  );
}

export default HikariBoy;
