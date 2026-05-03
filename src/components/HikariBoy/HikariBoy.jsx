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
import MunchboyBoot from './MunchboyBoot';

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

// Curated game library - 5 games
const GAMES = [
  { id: 'burger-stack', name: 'Burger Stack', cover: '/games/burger-stack/cover.webp', url: '/games/burger-stack/index.html' },
  { id: 'spice-invaders', name: 'Spice Invaders', cover: '/games/spice-invaders/cover.webp', url: '/games/spice-invaders/index.html' },
  { id: 'bubble-tea', name: 'Bubble Tea', cover: '/games/bubble-tea/cover.webp', url: '/games/bubble-tea/index.html' },
  { id: 'candylandflip', name: 'Candyland Flip', cover: '/games/candylandflip/cover.webp', url: '/games/candylandflip/index.html' },
  { id: 'pool', name: 'Hikari Billiards', cover: '/games/pool/cover.png', url: '/games/pool/index.html' },
];

export function HikariBoy({ 
  onClose, 
  foodReady = false,
  munchboyShellColor,
  munchboyAColor,
  munchboyBColor
}) {
  const [isBooting, setIsBooting] = useState(true);
  const [currentGame, setCurrentGame] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showLoader, setShowLoader] = useState(false);
  const gameFrameRef = useRef(null);
  const loaderStartRef = useRef(0);

  // LEAK FIX: Hide background signup/auth when HikariBoy opens
  useEffect(() => {
    document.body.classList.add('hikariboy-active');
    
    // Apply tenant Munchboy colors from props (passed from parent)
    if (munchboyShellColor) {
      document.documentElement.style.setProperty('--shell-color', munchboyShellColor);
    }
    if (munchboyAColor) {
      document.documentElement.style.setProperty('--button-a-color', munchboyAColor);
      // If color is custom (not default gray), use white labels for premium contrast
      const aLabelColor = munchboyAColor.toLowerCase() === '#d1d5db' ? 'var(--button-gray-dark)' : '#FFFFFF';
      document.documentElement.style.setProperty('--button-a-label-color', aLabelColor);
    }
    if (munchboyBColor) {
      document.documentElement.style.setProperty('--button-b-color', munchboyBColor);
      const bLabelColor = munchboyBColor.toLowerCase() === '#d1d5db' ? 'var(--button-gray-dark)' : '#FFFFFF';
      document.documentElement.style.setProperty('--button-b-label-color', bLabelColor);
    }
    
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
      
      // Reset CSS variables
      document.documentElement.style.removeProperty('--shell-color');
      document.documentElement.style.removeProperty('--button-a-color');
      document.documentElement.style.removeProperty('--button-b-color');
      
      authSelectors.forEach(selector => {
        const el = document.querySelector(selector);
        if (el && el.getAttribute('data-hikariboy-hidden') === 'true') {
          el.style.display = '';
          el.removeAttribute('data-hikariboy-hidden');
        }
      });
    };
  }, []);

  // Boot sequence - controlled by MunchboyBoot now
  useEffect(() => {
    // Initial state is booting: true
    // We only set it to false when the boot component tells us via onComplete
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

  // Launch game with instant loader overlay
  const launchGame = (game) => {
    // INSTANT: Show loader overlay on this frame
    setShowLoader(true);
    loaderStartRef.current = Date.now();

    // Small delay so loader renders before heavy iframe work
    setTimeout(() => {
      setCurrentGame(game);
    }, 50);
  };

  // Hide loader when game iframe loads (minimum 2500ms to let animation play)
  const handleGameLoad = () => {
    const elapsed = Date.now() - loaderStartRef.current;
    const remaining = Math.max(0, 2500 - elapsed);
    setTimeout(() => setShowLoader(false), remaining);
  };

  // Fallback: hide loader after 3 seconds max
  useEffect(() => {
    if (showLoader) {
      const timer = setTimeout(() => setShowLoader(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showLoader]);

  const handleButtonPress = (button) => {
    // ⚡ AUDIO UNLOCK: Send resume before button press so iframe games can unlock Web Audio
    if (currentGame && gameFrameRef.current) {
      gameFrameRef.current.contentWindow?.postMessage({ type: 'AUDIO_RESUME' }, '*');
    }
    
    // ⚡ HEAVY HAPTICS: 50-80ms bursts for retro tactile feel
    if (navigator.vibrate) {
      const isAction = button === BUTTONS.A || button === BUTTONS.B;
      navigator.vibrate(isAction ? 65 : 50); // Heavy profile
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
    } else if (isBooting) {
      if (button === BUTTONS.START || button === BUTTONS.A) {
        setIsBooting(false);
      }
    } else {
      if (button === BUTTONS.DPAD_LEFT) {
        setSelectedIndex(prev => prev > 0 ? prev - 1 : GAMES.length - 1);
      }
      if (button === BUTTONS.DPAD_RIGHT) {
        setSelectedIndex(prev => prev < GAMES.length - 1 ? prev + 1 : 0);
      }
      if (button === BUTTONS.A || button === BUTTONS.START) {
        launchGame(GAMES[selectedIndex]);
      }
      if (button === BUTTONS.MENU) {
        onClose?.();
      }
    }
  };

  const handleButtonRelease = (button) => {
    if (currentGame) {
      gameFrameRef.current?.contentWindow?.postMessage({
        type: 'BUTTON_RELEASE',
        button
      }, '*');
    }
  };

  const handleBootComplete = () => {
    setIsBooting(false);
  };

  return (
    <div className="hikariboy-emulator">
      {/* Screen Container (55%) - FULL WIDTH, NO FRAME */}
      <div className="hb-screen">
        {isBooting ? (
          <MunchboyBoot onComplete={handleBootComplete} />
        ) : !currentGame ? (
          <GameSelector 
            games={GAMES} 
            selectedIndex={selectedIndex}
          />
        ) : (
          <>
            {showLoader && (
              <iframe
                src="/games/loading.html"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  zIndex: 1000,
                  background: '#fff'
                }}
                title="Loading"
              />
            )}
            <iframe
              ref={gameFrameRef}
              src={currentGame.url}
              title={currentGame.name}
              className="hb-game-frame"
              sandbox="allow-scripts allow-same-origin"
              onLoad={handleGameLoad}
              style={{ opacity: showLoader ? 0 : 1 }}
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

        {/* Brand Mark — MUNCH BOY */}
        <div className="hb-brand-mark">
          <span className="hb-brand-text-layer">MUNCH BOY</span>
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
                onTouchEnd={(e) => { e.preventDefault(); handleButtonRelease(BUTTONS.DPAD_UP); }}
                onMouseDown={(e) => { e.preventDefault(); handleButtonPress(BUTTONS.DPAD_UP); }}
                onMouseUp={(e) => { e.preventDefault(); handleButtonRelease(BUTTONS.DPAD_UP); }}
                onMouseLeave={(e) => { e.preventDefault(); handleButtonRelease(BUTTONS.DPAD_UP); }}
              ></button>
              <button 
                className="dpad-area dpad-left"
                onTouchStart={(e) => { e.preventDefault(); handleButtonPress(BUTTONS.DPAD_LEFT); }}
                onTouchEnd={(e) => { e.preventDefault(); handleButtonRelease(BUTTONS.DPAD_LEFT); }}
                onMouseDown={(e) => { e.preventDefault(); handleButtonPress(BUTTONS.DPAD_LEFT); }}
                onMouseUp={(e) => { e.preventDefault(); handleButtonRelease(BUTTONS.DPAD_LEFT); }}
                onMouseLeave={(e) => { e.preventDefault(); handleButtonRelease(BUTTONS.DPAD_LEFT); }}
              ></button>
              <button 
                className="dpad-area dpad-right"
                onTouchStart={(e) => { e.preventDefault(); handleButtonPress(BUTTONS.DPAD_RIGHT); }}
                onTouchEnd={(e) => { e.preventDefault(); handleButtonRelease(BUTTONS.DPAD_RIGHT); }}
                onMouseDown={(e) => { e.preventDefault(); handleButtonPress(BUTTONS.DPAD_RIGHT); }}
                onMouseUp={(e) => { e.preventDefault(); handleButtonRelease(BUTTONS.DPAD_RIGHT); }}
                onMouseLeave={(e) => { e.preventDefault(); handleButtonRelease(BUTTONS.DPAD_RIGHT); }}
              ></button>
              <button 
                className="dpad-area dpad-down"
                onTouchStart={(e) => { e.preventDefault(); handleButtonPress(BUTTONS.DPAD_DOWN); }}
                onTouchEnd={(e) => { e.preventDefault(); handleButtonRelease(BUTTONS.DPAD_DOWN); }}
                onMouseDown={(e) => { e.preventDefault(); handleButtonPress(BUTTONS.DPAD_DOWN); }}
                onMouseUp={(e) => { e.preventDefault(); handleButtonRelease(BUTTONS.DPAD_DOWN); }}
                onMouseLeave={(e) => { e.preventDefault(); handleButtonRelease(BUTTONS.DPAD_DOWN); }}
              ></button>
              <button 
                className="dpad-diagonal dpad-up-left"
                onTouchStart={(e) => { e.preventDefault(); handleButtonPress(BUTTONS.DPAD_UP_LEFT); }}
                onTouchEnd={(e) => { e.preventDefault(); handleButtonRelease(BUTTONS.DPAD_UP_LEFT); }}
                aria-label="up-left"
              />
              <button 
                className="dpad-diagonal dpad-up-right"
                onTouchStart={(e) => { e.preventDefault(); handleButtonPress(BUTTONS.DPAD_UP_RIGHT); }}
                onTouchEnd={(e) => { e.preventDefault(); handleButtonRelease(BUTTONS.DPAD_UP_RIGHT); }}
                aria-label="up-right"
              />
              <button 
                className="dpad-diagonal dpad-down-left"
                onTouchStart={(e) => { e.preventDefault(); handleButtonPress(BUTTONS.DPAD_DOWN_LEFT); }}
                onTouchEnd={(e) => { e.preventDefault(); handleButtonRelease(BUTTONS.DPAD_DOWN_LEFT); }}
                aria-label="down-left"
              />
              <button 
                className="dpad-diagonal dpad-down-right"
                onTouchStart={(e) => { e.preventDefault(); handleButtonPress(BUTTONS.DPAD_DOWN_RIGHT); }}
                onTouchEnd={(e) => { e.preventDefault(); handleButtonRelease(BUTTONS.DPAD_DOWN_RIGHT); }}
                aria-label="down-right"
              />
            </div>
          </div>

          {/* A/B Buttons — Offset: A top-right, B bottom-left */}
          <div className="hb-action-btns">
            <button 
              className="action-btn btn-b"
              onTouchStart={(e) => { e.preventDefault(); handleButtonPress(BUTTONS.B); }}
              onTouchEnd={(e) => { e.preventDefault(); handleButtonRelease(BUTTONS.B); }}
              onMouseDown={(e) => { e.preventDefault(); handleButtonPress(BUTTONS.B); }}
              onMouseUp={(e) => { e.preventDefault(); handleButtonRelease(BUTTONS.B); }}
              onMouseLeave={(e) => { e.preventDefault(); handleButtonRelease(BUTTONS.B); }}
            >B</button>
            <button 
              className="action-btn btn-a"
              onTouchStart={(e) => { e.preventDefault(); handleButtonPress(BUTTONS.A); }}
              onTouchEnd={(e) => { e.preventDefault(); handleButtonRelease(BUTTONS.A); }}
              onMouseDown={(e) => { e.preventDefault(); handleButtonPress(BUTTONS.A); }}
              onMouseUp={(e) => { e.preventDefault(); handleButtonRelease(BUTTONS.A); }}
              onMouseLeave={(e) => { e.preventDefault(); handleButtonRelease(BUTTONS.A); }}
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
  
  // Preload adjacent game covers for smoother navigation
  useEffect(() => {
    const nextIdx = (selectedIndex + 1) % games.length;
    const prevIdx = (selectedIndex - 1 + games.length) % games.length;
    
    [nextIdx, prevIdx].forEach(idx => {
      const img = new Image();
      img.src = games[idx].cover;
    });
  }, [selectedIndex, games]);
  
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
