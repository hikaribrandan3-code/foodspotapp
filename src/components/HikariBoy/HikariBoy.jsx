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
import GbaBoot from './GbaBoot';

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
  MENU: 'menu',
  L: 'l',
  R: 'r'
};

// 15 GAMES with cover paths (11 food + 4 GBA homebrew)
// PNG covers preferred, SVG fallback for missing PNGs
// 12 GAMES with cover paths (8 food + 4 GBA homebrew)
// PNG covers preferred, SVG fallback for missing PNGs
const GAMES = [
  { id: 'burger-stack', name: 'Burger Stack', cover: '/games/burger-stack/cover.png', fallback: '/games/burger-stack/cover.svg', url: '/games/burger-stack/index.html' },
  { id: 'food-fight', name: 'Food Fight', cover: '/games/food-fight/cover.png', fallback: '/games/food-fight/cover.svg', url: '/games/food-fight/index.html' },
  { id: 'fry-catch', name: 'Fry Catch', cover: '/games/fry-catch/cover.png', fallback: '/games/fry-catch/cover.svg', url: '/games/fry-catch/index.html' },
  { id: 'bubble-tea', name: 'Bubble Tea', cover: '/games/bubble-tea/cover.png', fallback: '/games/bubble-tea/cover.svg', url: '/games/bubble-tea/index.html' },
  { id: 'coffee-pour', name: 'Coffee Pour', cover: '/games/coffee-pour/cover.png', fallback: '/games/coffee-pour/cover.svg', url: '/games/coffee-pour/index.html' },
  { id: 'spice-invaders', name: 'Spice Invaders', cover: '/games/spice-invaders/cover.png', fallback: '/games/spice-invaders/cover.svg', url: '/games/spice-invaders/index.html' },
  { id: 'fruit-slice', name: 'Fruit Slice', cover: '/games/fruit-slice/cover.png', fallback: '/games/fruit-slice/cover.svg', url: '/games/fruit-slice/index.html' },
  { id: 'bento-box', name: 'Bento Box', cover: '/games/bento-box/cover.png', fallback: '/games/bento-box/cover.svg', url: '/games/bento-box/index.html' },
  // GBA Homebrew Games (with music) - SVG only for now
  { id: 'luminesweeper', name: 'Luminesweeper', cover: '/games/luminesweeper/cover.svg', fallback: null, url: '/games/luminesweeper/index.html' },
  { id: 'bulletgba', name: 'BulletGBA', cover: '/games/bulletgba/cover.svg', fallback: null, url: '/games/bulletgba/index.html' },
  { id: 'gorf', name: 'Gorf', cover: '/games/gorf/cover.svg', fallback: null, url: '/games/gorf/index.html' },
  { id: 'ucity', name: 'μCity', cover: '/games/ucity/cover.svg', fallback: null, url: '/games/ucity/index.html' },
];

export function HikariBoy({ 
  onClose, 
  foodReady = false
}) {
  const [gbaBootComplete, setGbaBootComplete] = useState(false);
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

  // Boot sequence - MUNCHBOY with START to continue
  const [bootPhase, setBootPhase] = useState('intro'); // 'intro', 'ready', 'done'
  const [lettersDropped, setLettersDropped] = useState(false);
  const [showPressStart, setShowPressStart] = useState(false);
  const audioCtxRef = useRef(null);

  const playGbaChime = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;
    
    const pulse = (freq, start, duration, vol, type = 'square') => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(vol, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };
    
    // GBA "Bling" Sound
    pulse(523.25, now, 0.08, 0.1, 'square');
    setTimeout(() => {
      pulse(1046.50, now + 0.08, 1.2, 0.15, 'square');
      pulse(2093.00, now + 0.08, 0.8, 0.05, 'triangle');
    }, 80);
  };

  const startBootSequence = () => {
    if (bootPhase !== 'intro') return;
    setBootPhase('animating');
    
    // Drop letters with stagger
    setTimeout(() => setLettersDropped(true), 100);
    
    // Play chime and show press start
    setTimeout(() => {
      playGbaChime();
      setShowPressStart(true);
      setBootPhase('ready');
    }, 800);
  };

  const completeBoot = () => {
    if (bootPhase === 'ready') {
      setBootPhase('done');
      setIsBooting(false);
    }
  };

  // Handle button presses during boot
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (bootPhase === 'intro') {
        startBootSequence();
      } else if (bootPhase === 'ready' && (e.code === 'Space' || e.code === 'Enter')) {
        completeBoot();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [bootPhase]);

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
    // ⚡ HEAVY HAPTICS: 50-80ms bursts for retro tactile feel
    if (navigator.vibrate) {
      const isAction = button === BUTTONS.A || button === BUTTONS.B;
      navigator.vibrate(isAction ? 65 : 50);
    }
    
    // Boot sequence handling
    if (isBooting) {
      if (bootPhase === 'intro') {
        startBootSequence();
        return;
      }
      if (bootPhase === 'ready' && (button === BUTTONS.A || button === BUTTONS.START)) {
        completeBoot();
        return;
      }
      return;
    }
    
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
    } else {
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
    <>
      {!gbaBootComplete && (
        <GbaBoot onComplete={() => setGbaBootComplete(true)} />
      )}
      <div className="hikariboy-emulator">
        {/* Screen Container (55%) - FULL WIDTH, NO FRAME */}
        <div className="hb-screen">
          {isBooting ? (
            <div className="munchboy-boot" onClick={startBootSequence}>
              <div className="munchboy-container">
                <span className={`munch-letter l-M ${lettersDropped ? 'dropped' : ''}`}>M</span>
                <span className={`munch-letter l-U ${lettersDropped ? 'dropped' : ''}`}>U</span>
                <span className={`munch-letter l-N ${lettersDropped ? 'dropped' : ''}`}>N</span>
                <span className={`munch-letter l-C ${lettersDropped ? 'dropped' : ''}`}>C</span>
                <span className={`munch-letter l-H ${lettersDropped ? 'dropped' : ''}`}>H</span>
                <span className={`munch-letter l-B ${lettersDropped ? 'dropped' : ''}`}>B</span>
                <span className={`munch-letter l-O ${lettersDropped ? 'dropped' : ''}`}>O</span>
                <span className={`munch-letter l-Y ${lettersDropped ? 'dropped' : ''}`}>Y</span>
              </div>
              <div className={`munch-footer ${lettersDropped ? 'visible' : ''}`}>
                foodspot mobile
              </div>
              {bootPhase === 'intro' && (
                <div className="munch-hint">TAP SCREEN OR PRESS A</div>
              )}
              {showPressStart && (
                <div className="munch-press-start">PRESS START</div>
              )}
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

      {/* Mid Bar — BLACK ZONE */}
      <div className="hb-midbar"></div>

      {/* Controller (45%) — SHELL COLOR */}
      <div className="hb-controller">
        {/* Shoulder Buttons */}
        <div className="hb-shoulders">
          <button 
            className="shoulder-l"
            onTouchStart={(e) => { e.preventDefault(); handleButtonPress(currentGame ? BUTTONS.L : BUTTONS.SELECT); }}
          >L</button>
          <button 
            className="shoulder-r"
            onTouchStart={(e) => { e.preventDefault(); handleButtonPress(currentGame ? BUTTONS.R : BUTTONS.START); }}
          >R</button>
        </div>

        {/* Branding Row - between shoulders and controls */}
        <div className="hb-branding-row">
          <span className="hb-brand-foodspot">foodspot</span>
        </div>

        {/* Main Controls: D-Pad (left) + A/B (right) */}
        <div className="hb-controls-main">
          {/* D-Pad — Cross-Shaped with black outline and center circle */}
          <div className="hb-dpad">
            <div className="dpad-cross">
              {/* Center circle */}
              <div className="dpad-center"></div>
              <button 
                className="dpad-area dpad-up"
                onTouchStart={(e) => { e.preventDefault(); handleButtonPress(BUTTONS.DPAD_UP); }}
              ></button>
              <button 
                className="dpad-area dpad-left"
                onTouchStart={(e) => { e.preventDefault(); handleButtonPress(BUTTONS.DPAD_LEFT); }}
              ></button>
              <button 
                className="dpad-area dpad-right"
                onTouchStart={(e) => { e.preventDefault(); handleButtonPress(BUTTONS.DPAD_RIGHT); }}
              ></button>
              <button 
                className="dpad-area dpad-down"
                onTouchStart={(e) => { e.preventDefault(); handleButtonPress(BUTTONS.DPAD_DOWN); }}
              ></button>
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

          {/* A/B Buttons — Offset: A top-right, B bottom-left */}
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

        {/* System Buttons — 40% of A, labels BELOW */}
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
    </>
  );
}

// Game Selector - Shows ONE large cover image at a time
function GameSelector({ games, selectedIndex }) {
  const selectedGame = games[selectedIndex];
  const [imgSrc, setImgSrc] = useState(selectedGame.cover);
  const [hasError, setHasError] = useState(false);
  
  // Reset image when game changes
  useEffect(() => {
    setImgSrc(selectedGame.cover);
    setHasError(false);
  }, [selectedIndex, selectedGame]);
  
  const handleError = () => {
    if (!hasError && selectedGame.fallback) {
      // Try fallback SVG
      setImgSrc(selectedGame.fallback);
      setHasError(true);
    } else {
      // No fallback, show text
      setHasError(true);
    }
  };
  
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
          {!hasError ? (
            <img 
              src={imgSrc} 
              alt={selectedGame.name}
              className="game-cover-full"
              onError={handleError}
            />
          ) : (
            <div className="cover-fallback-full">
              {selectedGame.name}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HikariBoy;
