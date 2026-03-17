/**
 * HikariBoy Emulator Shell - Delta 1:1 (Updated)
 * Full-screen game display, foodspot branding
 * 
 * Features:
 * - Game fills entire top screen (no frame)
 * - foodspot logo in mid bar
 * - Labels below system buttons (MENU/SELECT/START)
 * - Responsive: iPhone Regular / Pro / Pro Max
 */

import React, { useState, useRef, useEffect } from 'react';
import './HikariBoy.css';

const BUTTONS = {
  DPAD_UP: 'dpad-up',
  DPAD_DOWN: 'dpad-down', 
  DPAD_LEFT: 'dpad-left',
  DPAD_RIGHT: 'dpad-right',
  DPAD_UP_LEFT: 'dpad-up-left',
  DPAD_UP_RIGHT: 'dpad-up-right',
  DPAD_DOWN_LEFT: 'dpad-down-left',
  DPAD_DOWN_RIGHT: 'dpad-down-right',
  A: 'a',
  B: 'b',
  SELECT: 'select',
  START: 'start',
  MENU: 'menu'
};

// 16 GAMES with cover.png paths
const GAMES = [
  { id: 'burger-stack', name: 'Burger Stack', cover: '/games/burger-stack/cover.png', url: '/games/burger-stack/index.html' },
  { id: 'food-fight', name: 'Food Fight', cover: '/games/food-fight/cover.png', url: '/games/food-fight/index.html' },
  { id: 'pizza-slice', name: 'Pizza Slice', cover: '/games/pizza-slice/cover.png', url: '/games/pizza-slice/index.html' },
  { id: 'sushi-roll', name: 'Sushi Roll', cover: '/games/sushi-roll/cover.png', url: '/games/sushi-roll/index.html' },
  { id: 'fry-catch', name: 'Fry Catch', cover: '/games/fry-catch/cover.png', url: '/games/fry-catch/index.html' },
  { id: 'taco-tower', name: 'Taco Tower', cover: '/games/taco-tower/cover.png', url: '/games/taco-tower/index.html' },
  { id: 'condiment-blast', name: 'Condiment Blast', cover: '/games/condiment-blast/cover.png', url: '/games/condiment-blast/index.html' },
  { id: 'bubble-tea', name: 'Bubble Tea', cover: '/games/bubble-tea/cover.png', url: '/games/bubble-tea/index.html' },
  { id: 'donut-roll', name: 'Donut Roll', cover: '/games/donut-roll/cover.png', url: '/games/donut-roll/index.html' },
  { id: 'hotdog-dash', name: 'Hotdog Dash', cover: '/games/hotdog-dash/cover.png', url: '/games/hotdog-dash/index.html' },
  { id: 'coffee-pour', name: 'Coffee Pour', cover: '/games/coffee-pour/cover.png', url: '/games/coffee-pour/index.html' },
  { id: 'steak-flip', name: 'Steak Flip', cover: '/games/steak-flip/cover.png', url: '/games/steak-flip/index.html' },
  { id: 'ice-cream', name: 'Ice Cream', cover: '/games/ice-cream/cover.png', url: '/games/ice-cream/index.html' },
  { id: 'spice-invaders', name: 'Spice Invaders', cover: '/games/spice-invaders/cover.png', url: '/games/spice-invaders/index.html' },
  { id: 'fruit-slice', name: 'Fruit Slice', cover: '/games/fruit-slice/cover.png', url: '/games/fruit-slice/index.html' },
  { id: 'bento-box', name: 'Bento Box', cover: '/games/bento-box/cover.png', url: '/games/bento-box/index.html' },
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
    document.body.classList.add('hikariboy-active');
    
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

    document.body.style.overflow = 'hidden';

    return () => {
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
      if (button === BUTTONS.MENU) {
        onClose?.();
        return;
      }
      if (button === BUTTONS.SELECT) {
        setCurrentGame(null);
        return;
      }
    } else if (!isBooting) {
      if (button === BUTTONS.DPAD_LEFT) {
        setSelectedIndex(prev => prev > 0 ? prev - 1 : GAMES.length - 1);
      }
      if (button === BUTTONS.DPAD_RIGHT) {
        setSelectedIndex(prev => prev < GAMES.length - 1 ? prev + 1 : 0);
      }
      if (button === BUTTONS.A || button === BUTTONS.START) {
        setCurrentGame(GAMES[selectedIndex]);
      }
      if (button === BUTTONS.MENU) {
        onClose?.();
      }
    }
  };

  return (
    <div className="hikariboy-emulator">
      {/* Screen Container (55%) - FULL WIDTH, NO FRAME */}
      <div className="hb-screen">
        {isBooting ? (
          <div className="hb-boot">
            <div className="boot-logo">foodspot</div>
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

      {/* Mid Bar with foodspot logo */}
      <div className="hb-midbar">
        <span className="midbar-logo">foodspot</span>
      </div>

      {/* Controller (45%) */}
      <div className="hb-controller">
        {/* Shoulder Buttons */}
        <div className="hb-shoulders">
          <button 
            className="shoulder-l"
            onTouchStart={(e) => { e.preventDefault(); handleButtonPress(BUTTONS.SELECT); }}
          >L</button>
          <button 
            className="shoulder-r"
            onTouchStart={(e) => { e.preventDefault(); handleButtonPress(BUTTONS.START); }}
          >R</button>
        </div>

        {/* Main Controls */}
        <div className="hb-controls-main">
          {/* D-Pad with diagonal zones */}
          <div className="hb-dpad">
            <div className="dpad-cross">
              <button 
                className="dpad-area dpad-up"
                onTouchStart={(e) => { e.preventDefault(); handleButtonPress(BUTTONS.DPAD_UP); }}
              >▲</button>
              <button 
                className="dpad-area dpad-left"
                onTouchStart={(e) => { e.preventDefault(); handleButtonPress(BUTTONS.DPAD_LEFT); }}
              >◀</button>
              <div className="dpad-center-indent"></div>
              <button 
                className="dpad-area dpad-right"
                onTouchStart={(e) => { e.preventDefault(); handleButtonPress(BUTTONS.DPAD_RIGHT); }}
              >▶</button>
              <button 
                className="dpad-area dpad-down"
                onTouchStart={(e) => { e.preventDefault(); handleButtonPress(BUTTONS.DPAD_DOWN); }}
              >▼</button>
              <button 
                className="dpad-diagonal dpad-up-left"
                onTouchStart={(e) => { e.preventDefault(); handleButtonPress(BUTTONS.DPAD_UP_LEFT); }}
                aria-label="up-left"
              />
              <button 
                className="dpad-diagonal dpad-up-right"
                onTouchStart={(e) => { e.preventDefault(); handleButtonPress(BUTTONS.DPAD_UP_RIGHT); }}
                aria-label="up-right"
              />
              <button 
                className="dpad-diagonal dpad-down-left"
                onTouchStart={(e) => { e.preventDefault(); handleButtonPress(BUTTONS.DPAD_DOWN_LEFT); }}
                aria-label="down-left"
              />
              <button 
                className="dpad-diagonal dpad-down-right"
                onTouchStart={(e) => { e.preventDefault(); handleButtonPress(BUTTONS.DPAD_DOWN_RIGHT); }}
                aria-label="down-right"
              />
            </div>
          </div>

          {/* A/B Buttons */}
          <div className="hb-action-btns">
            <button 
              className="action-btn btn-b"
              onTouchStart={(e) => { e.preventDefault(); handleButtonPress(BUTTONS.B); }}
            >B</button>
            <button 
              className="action-btn btn-a"
              onTouchStart={(e) => { e.preventDefault(); handleButtonPress(BUTTONS.A); }}
            >A</button>
          </div>
        </div>

        {/* System Buttons with labels BELOW */}
        <div className="hb-system-btns">
          <div className="sys-btn-wrap menu-wrap">
            <button 
              className="sys-circle menu-btn"
              onTouchStart={(e) => { e.preventDefault(); onClose?.(); }}
            ></button>
            <span className="sys-label">MENU</span>
          </div>
          <div className="sys-btn-wrap select-wrap">
            <button 
              className="sys-circle select-btn"
              onTouchStart={(e) => { e.preventDefault(); handleButtonPress(BUTTONS.SELECT); }}
            ></button>
            <span className="sys-label">SELECT</span>
          </div>
          <div className="sys-btn-wrap start-wrap">
            <button 
              className="sys-circle start-btn"
              onTouchStart={(e) => { e.preventDefault(); handleButtonPress(BUTTONS.START); }}
            ></button>
            <span className="sys-label">START</span>
          </div>
        </div>

        {/* Sparkle decoration */}
        <div className="hb-sparkle">✦</div>
      </div>
    </div>
  );
}

// Game Selector - Shows ONE large cover image at a time
function GameSelector({ games, selectedIndex }) {
  const selectedGame = games[selectedIndex];
  
  return (
    <div className="hb-selector">
      {/* Arrow indicators at top */}
      <div className="selector-arrows">
        {selectedIndex > 0 && <span className="arrow-left">◀</span>}
        <span className="game-counter">{selectedIndex + 1} / {games.length}</span>
        {selectedIndex < games.length - 1 && <span className="arrow-right">▶</span>}
      </div>
      
      {/* Large Cover Image - FULL SIZE */}
      <div className="game-showcase">
        <div className="cover-container-full">
          <img 
            src={selectedGame.cover} 
            alt={selectedGame.name}
            className="game-cover-full"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div className="cover-fallback-full" style={{display: 'none'}}>
            {selectedGame.name}
          </div>
        </div>
      </div>
    </div>
  );
}

export default HikariBoy;
