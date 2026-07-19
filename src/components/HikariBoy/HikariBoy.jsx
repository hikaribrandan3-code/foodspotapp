/**
 * HikariBoy Emulator Shell - Delta 1:1 (Updated)
 * Full-screen game display, foodspot branding
 *
 * Features:
 * - Game fills entire top screen (no frame)
 * - foodspot logo in mid bar
 * - Labels below system buttons (MENU/SELECT/START)
 * - Responsive: iPhone Regular / Pro / Pro Max
 * - FoodKart GP integrated as game #10
 * - Graveyard Shift (voxel FPS zombie survival) integrated as game #11
 * - Food Wheel (Simon-style memory game) integrated as game #14
 * - FoodStack (Tetris-style block stacking) integrated as game #15
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

// Curated game library - 15 games
// ALL GAMES UNLOCKED FOR NOW
const GAMES = [
  { id: 'burger-stack',   name: 'Burger Stack',       cover: '/games/burger-stack/cover.webp',     url: '/games/burger-stack/index.html',     proOnly: false },
  { id: 'spice-invaders', name: 'Spice Invaders',      cover: '/games/spice-invaders/cover.webp',   url: '/games/spice-invaders/index.html',   proOnly: false },
  { id: 'kanzo',          name: 'Kanzo',              cover: '/games/kanzo/cover.png',             url: '/games/kanzo/index.html',            proOnly: false },
  { id: 'bubble-tea',     name: 'Bubble Tea',          cover: '/games/bubble-tea/cover.webp',       url: '/games/bubble-tea/index.html',       proOnly: false },
  { id: 'candylandflip',  name: 'Candyland Flip',      cover: '/games/candylandflip/cover.webp',    url: '/games/candylandflip/index.html',    proOnly: false },
  { id: 'pool',           name: 'Munchboy Billiards',  cover: '/games/pool/cover.png',              url: '/games/pool/index.html',             proOnly: false, shellPause: false },
  { id: 'golden-crust',   name: 'Golden Crust',       cover: '/games/bakery-timer/assets/game-chip.png', url: '/games/bakery-timer/index.html',     proOnly: false },
  { id: 'brick-breaker',  name: 'Block Smash',        cover: '/games/brick-breaker/cover.png',      url: '/games/brick-breaker/index.html',    proOnly: false, shellPause: false },
  { id: 'pocket-tanks',   name: 'Pocket Tanks',       cover: '/games/pocket-tanks/cover.webp',      url: '/games/pocket-tanks/index.html',     proOnly: false, shellPause: false },
  { id: 'food-kart',      name: 'FoodKart GP',        cover: '/games/food-kart/cover.webp',        url: '/games/food-kart/index.html',        proOnly: false, shellPause: false },
  { id: 'graveyard-shift', name: 'Graveyard Shift',   cover: '/games/graveyard-shift/cover.webp',  url: '/games/graveyard-shift/index.html',  proOnly: false, shellPause: false },
  { id: 'light-cycles',   name: 'Daisuke Racer',       cover: '/games/light-cycles/cover.webp',     url: '/games/light-cycles/index.html',     proOnly: false, shellPause: false },
  { id: 'rush-hour',      name: 'Rush Hour',          cover: '/games/rush-hour/cover.webp',        url: '/games/rush-hour/index.html',        proOnly: false, shellPause: false },
  { id: 'food-wheel',     name: 'Food Wheel',         cover: '/games/food-wheel/cover.svg',        url: '/games/food-wheel/index.html',       proOnly: false },
  { id: 'foodstack',      name: 'FoodStack',          cover: '/games/foodstack/cover.svg',         url: '/games/foodstack/index.html',        proOnly: false },
];

export function HikariBoy({
  onClose,
  onUpgradeClick,
  isPro = false,
  munchboyShellColor,
  munchboyAColor,
  munchboyBColor,
  foodReady = false,
  readyOrderId = null,
  foodReadyTexts = {},
  onViewReceipt,
  onDismissFoodReady,
}) {
  const [isBooting, setIsBooting] = useState(true);
  const [currentGame, setCurrentGame] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showLoader, setShowLoader] = useState(false);
  const [resumeCountdown, setResumeCountdown] = useState(30);
  const countdownRef = useRef(null);
  const gameFrameRef = useRef(null);
  const loaderStartRef = useRef(0);
  const gameStartedRef = useRef(false);
  const dpadCrossRef = useRef(null);
  const dpadDir = useRef({ up: false, down: false, left: false, right: false });
  const currentDpadBtnRef = useRef(null);
  const dpadTouchIdRef = useRef(null);

  // LEAK FIX: Hide background signup/auth when HikariBoy opens
  useEffect(() => {
    document.body.classList.add('hikariboy-active');
    
    // Apply tenant Munchboy colors from props (passed from parent)
    const shellColor = munchboyShellColor || '#6B0FCC';
    const aColor = munchboyAColor || '#D1D5DB';
    const bColor = munchboyBColor || '#D1D5DB';

    document.documentElement.style.setProperty('--shell-color', shellColor);
    document.documentElement.style.setProperty('--button-a-color', aColor);
    document.documentElement.style.setProperty('--button-b-color', bColor);

    const aLabelColor = aColor.toLowerCase() === '#d1d5db' ? 'var(--button-gray-dark)' : '#FFFFFF';
    document.documentElement.style.setProperty('--button-a-label-color', aLabelColor);
    const bLabelColor = bColor.toLowerCase() === '#d1d5db' ? 'var(--button-gray-dark)' : '#FFFFFF';
    document.documentElement.style.setProperty('--button-b-label-color', bLabelColor);
    
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
      document.documentElement.style.removeProperty('--button-a-label-color');
      document.documentElement.style.removeProperty('--button-b-label-color');
      
      authSelectors.forEach(selector => {
        const el = document.querySelector(selector);
        if (el && el.getAttribute('data-hikariboy-hidden') === 'true') {
          el.style.display = '';
          el.removeAttribute('data-hikariboy-hidden');
        }
      });
    };
  }, [munchboyShellColor, munchboyAColor, munchboyBColor]);

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

  // Food ready: pause game + start 30s auto-dismiss countdown
  useEffect(() => {
    if (!foodReady) {
      clearInterval(countdownRef.current);
      setResumeCountdown(30);
      return;
    }
    // Pause the active game
    if (currentGame && gameFrameRef.current) {
      gameFrameRef.current.contentWindow?.postMessage({ type: 'BUTTON_PRESS', button: 'start' }, '*');
    }
    // Start countdown
    setResumeCountdown(30);
    countdownRef.current = setInterval(() => {
      setResumeCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          onDismissFoodReady?.();
          // Resume game
          if (currentGame && gameFrameRef.current) {
            gameFrameRef.current.contentWindow?.postMessage({ type: 'BUTTON_PRESS', button: 'start' }, '*');
          }
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [foodReady]);

  // Launch game with instant loader overlay
  const launchGame = (game) => {
    // Guard: locked game for free tier
    if (game.proOnly && !isPro) {
      onUpgradeClick?.();
      return;
    }

    // INSTANT: Show loader overlay on this frame
    setShowLoader(true);
    loaderStartRef.current = Date.now();

    // Small delay so loader renders before heavy iframe work
    setTimeout(() => {
      setCurrentGame(game);
      gameStartedRef.current = false;
    }, 50);
  };

  // Hide loader when game iframe loads (minimum 2500ms to let animation play)
  const handleGameLoad = () => {
    // ⚡ AUDIO UNLOCK: Send signal to game iframe (audio unlocked by arcade icon click)
    if (gameFrameRef.current) {
      console.log('[HikariBoy] Game iframe loaded, sending AUDIO_UNLOCK...');
      gameFrameRef.current.contentWindow?.postMessage({ type: 'AUDIO_UNLOCK' }, '*');
      console.log('[HikariBoy] AUDIO_UNLOCK message sent');
    } else {
      console.warn('[HikariBoy] gameFrameRef not ready');
    }

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

  const mapButtonToDirs = (button) => {
    switch (button) {
      case BUTTONS.DPAD_UP:        return ['up'];
      case BUTTONS.DPAD_DOWN:      return ['down'];
      case BUTTONS.DPAD_LEFT:      return ['left'];
      case BUTTONS.DPAD_RIGHT:     return ['right'];
      case BUTTONS.DPAD_UP_LEFT:   return ['up', 'left'];
      case BUTTONS.DPAD_UP_RIGHT:  return ['up', 'right'];
      case BUTTONS.DPAD_DOWN_LEFT: return ['down', 'left'];
      case BUTTONS.DPAD_DOWN_RIGHT:return ['down', 'right'];
      default: return [];
    }
  };

  const updateDpadTransform = () => {
    const { up, down, left, right } = dpadDir.current;
    let x = 0, y = 0, rotX = 0, rotY = 0;
    if (up)    { y -= 5; rotX = -8; }
    if (down)  { y += 5; rotX = 8; }
    if (left)  { x -= 5; rotY = 8; }
    if (right) { x += 5; rotY = -8; }
    if (dpadCrossRef.current) {
      if (x === 0 && y === 0) {
        dpadCrossRef.current.style.transform = '';
        dpadCrossRef.current.style.filter = '';
      } else {
        dpadCrossRef.current.style.transform =
          `translate3d(${x}px, ${y}px, 0) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(0.97)`;
        dpadCrossRef.current.style.filter = 'none';
      }
    }
  };

  const pressDpad = (button) => {
    mapButtonToDirs(button).forEach(d => dpadDir.current[d] = true);
    updateDpadTransform();
    handleButtonPress(button);
  };

  const releaseDpad = (button) => {
    mapButtonToDirs(button).forEach(d => dpadDir.current[d] = false);
    updateDpadTransform();
    handleButtonRelease(button);
  };

  const handleDpadTouch = (e) => {
    e.preventDefault();

    // Multiple fingers can be on screen at once (steer + A/B). Track the
    // specific touch that started on the D-pad by identifier — grabbing
    // touches[0] blindly picks up whichever finger touched down first,
    // which could be the A/B thumb and would peg the angle to that side.
    if (e.type === 'touchstart') {
      const startTouch = e.changedTouches[0];
      if (startTouch) dpadTouchIdRef.current = startTouch.identifier;
    }
    if (dpadTouchIdRef.current === null) return;
    let touch = null;
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === dpadTouchIdRef.current) { touch = e.touches[i]; break; }
    }
    if (!touch) return;

    const dpadEl = e.currentTarget;
    const rect = dpadEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = touch.clientX - cx;
    const dy = touch.clientY - cy;
    const dist = Math.hypot(dx, dy);

    // Deadzone: if touch is too close to center, treat it as no direction
    const deadzone = rect.width * 0.15; // 15% of width
    let newBtn = null;

    if (dist >= deadzone) {
      // Calculate angle in degrees [0, 360)
      let angle = Math.atan2(dy, dx) * (180 / Math.PI);
      if (angle < 0) angle += 360;

      if (angle >= 337.5 || angle < 22.5) {
        newBtn = BUTTONS.DPAD_RIGHT;
      } else if (angle >= 22.5 && angle < 67.5) {
        newBtn = BUTTONS.DPAD_DOWN_RIGHT;
      } else if (angle >= 67.5 && angle < 112.5) {
        newBtn = BUTTONS.DPAD_DOWN;
      } else if (angle >= 112.5 && angle < 157.5) {
        newBtn = BUTTONS.DPAD_DOWN_LEFT;
      } else if (angle >= 157.5 && angle < 202.5) {
        newBtn = BUTTONS.DPAD_LEFT;
      } else if (angle >= 202.5 && angle < 247.5) {
        newBtn = BUTTONS.DPAD_UP_LEFT;
      } else if (angle >= 247.5 && angle < 292.5) {
        newBtn = BUTTONS.DPAD_UP;
      } else if (angle >= 292.5 && angle < 337.5) {
        newBtn = BUTTONS.DPAD_UP_RIGHT;
      }
    }

    if (newBtn !== currentDpadBtnRef.current) {
      if (currentDpadBtnRef.current) {
        releaseDpad(currentDpadBtnRef.current);
      }
      if (newBtn) {
        pressDpad(newBtn);
      }
      currentDpadBtnRef.current = newBtn;
    }
  };

  const handleDpadTouchEnd = (e) => {
    e.preventDefault();
    // Only release if the finger that lifted is the one we were tracking —
    // lifting an unrelated finger (e.g. the A/B thumb) must not cancel steering.
    const ended = Array.from(e.changedTouches).some(t => t.identifier === dpadTouchIdRef.current);
    if (!ended) return;
    dpadTouchIdRef.current = null;
    if (currentDpadBtnRef.current) {
      releaseDpad(currentDpadBtnRef.current);
      currentDpadBtnRef.current = null;
    }
  };

  const handleButtonPress = (button) => {
    // ⚡ HEAVY HAPTICS: 50-80ms bursts for retro tactile feel
    if (navigator.vibrate) {
      const isAction = button === BUTTONS.A || button === BUTTONS.B;
      navigator.vibrate(isAction ? 65 : 50); // Heavy profile
    }

    // Restore focus to game iframe to ensure keyboard works
    if (currentGame && gameFrameRef.current) {
      gameFrameRef.current.focus();
    }
    
    if (isPaused && button === BUTTONS.START) {
      setIsPaused(false);
      gameFrameRef.current?.contentWindow?.postMessage({ type: 'BUTTON_PRESS', button }, '*');
      return;
    }

    if (currentGame) {
      console.log('[HikariBoy] Sending button to game:', button);
      gameFrameRef.current?.contentWindow?.postMessage({
        type: 'BUTTON_PRESS',
        button
      }, '*');

      if (button === BUTTONS.START) {
        if (!gameStartedRef.current) {
          gameStartedRef.current = true;
        } else if (currentGame?.shellPause !== false) {
          setIsPaused(true);
        }
      }
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
    // Restore focus to game iframe to ensure keyboard works
    if (currentGame && gameFrameRef.current) {
      gameFrameRef.current.focus();
    }

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
            isPro={isPro}
            onUpgradeClick={onUpgradeClick}
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
              onLoad={handleGameLoad}
              style={{ opacity: showLoader ? 0 : 1 }}
            />
            {isPaused && (
              <div className="hb-pause-overlay">
                <div className="pause-icon">PAUSED</div>
                <button onClick={() => {
                  setIsPaused(false);
                  gameFrameRef.current?.contentWindow?.postMessage({ type: 'BUTTON_PRESS', button: BUTTONS.START }, '*');
                }}>Resume</button>
                <button onClick={() => setCurrentGame(null)}>Quit</button>
              </div>
            )}
            {foodReady && (
              <div className="hb-food-notification">
                <div className="hfn-card">
                  <div className="hfn-header">
                    <span className="hfn-blink">▐</span>
                    <span className="hfn-paused-text">⏸ GAME PAUSED ⏸</span>
                    <span className="hfn-blink">▌</span>
                  </div>
                  <div className="hfn-icon">🍔</div>
                  <div className="hfn-title">
                    {foodReadyTexts.title || 'YOUR FOOD IS READY!'}
                  </div>
                  <div className="hfn-sub">
                    {foodReadyTexts.sub || 'Pick up at the counter'}
                  </div>
                  <div className="hfn-divider">· · · · · · · · · · · · ·</div>
                  <button
                    className="hfn-btn-primary"
                    onTouchStart={(e) => { e.preventDefault(); clearInterval(countdownRef.current); onViewReceipt?.(readyOrderId); }}
                    onClick={() => { clearInterval(countdownRef.current); onViewReceipt?.(readyOrderId); }}
                  >
                    <span className="hfn-btn-icon">🧾</span>
                    {foodReadyTexts.view || 'VIEW RECEIPT'}
                  </button>
                  <button
                    className="hfn-btn-secondary"
                    onTouchStart={(e) => {
                      e.preventDefault();
                      clearInterval(countdownRef.current);
                      onDismissFoodReady?.();
                      if (currentGame && gameFrameRef.current) {
                        gameFrameRef.current.contentWindow?.postMessage({ type: 'BUTTON_PRESS', button: 'start' }, '*');
                      }
                    }}
                    onClick={() => {
                      clearInterval(countdownRef.current);
                      onDismissFoodReady?.();
                      if (currentGame && gameFrameRef.current) {
                        gameFrameRef.current.contentWindow?.postMessage({ type: 'BUTTON_PRESS', button: 'start' }, '*');
                      }
                    }}
                  >
                    {foodReadyTexts.keep || 'KEEP PLAYING'}
                  </button>
                  <div className="hfn-countdown">
                    <span className="hfn-dot">◉</span>
                    {foodReadyTexts.resume || 'RESUMES IN'} 0:{String(resumeCountdown).padStart(2, '0')}
                  </div>
                </div>
              </div>
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
            onTouchEnd={(e) => { e.preventDefault(); handleButtonRelease(currentGame ? BUTTONS.L : BUTTONS.SELECT); }}
            onMouseDown={(e) => { e.preventDefault(); handleButtonPress(currentGame ? BUTTONS.L : BUTTONS.SELECT); }}
            onMouseUp={(e) => { e.preventDefault(); handleButtonRelease(currentGame ? BUTTONS.L : BUTTONS.SELECT); }}
            onMouseLeave={(e) => { e.preventDefault(); handleButtonRelease(currentGame ? BUTTONS.L : BUTTONS.SELECT); }}
          >L</button>
          <button
            className="shoulder-r"
            onTouchStart={(e) => { e.preventDefault(); handleButtonPress(currentGame ? BUTTONS.R : BUTTONS.START); }}
            onTouchEnd={(e) => { e.preventDefault(); handleButtonRelease(currentGame ? BUTTONS.R : BUTTONS.START); }}
            onMouseDown={(e) => { e.preventDefault(); handleButtonPress(currentGame ? BUTTONS.R : BUTTONS.START); }}
            onMouseUp={(e) => { e.preventDefault(); handleButtonRelease(currentGame ? BUTTONS.R : BUTTONS.START); }}
            onMouseLeave={(e) => { e.preventDefault(); handleButtonRelease(currentGame ? BUTTONS.R : BUTTONS.START); }}
          >R</button>
        </div>

        {/* Brand Mark — MUNCH BOY */}
        <div className="hb-brand-mark">
          <span className="hb-brand-text-layer">MUNCH BOY</span>
        </div>

        {/* Main Controls: D-Pad (left) + A/B (right) */}
        <div className="hb-controls-main">
          {/* D-Pad — Cross-Shaped with black outline and center circle */}
          <div 
            className="hb-dpad"
            onTouchStart={handleDpadTouch}
            onTouchMove={handleDpadTouch}
            onTouchEnd={handleDpadTouchEnd}
            onTouchCancel={handleDpadTouchEnd}
          >
            <div className="dpad-cross" ref={dpadCrossRef}>
              {/* Center circle */}
              <div className="dpad-center"></div>
              <button 
                className="dpad-area dpad-up"
                onMouseDown={(e) => { e.preventDefault(); pressDpad(BUTTONS.DPAD_UP); }}
                onMouseUp={(e) => { e.preventDefault(); releaseDpad(BUTTONS.DPAD_UP); }}
                onMouseLeave={(e) => { e.preventDefault(); releaseDpad(BUTTONS.DPAD_UP); }}
              ></button>
              <button 
                className="dpad-area dpad-left"
                onMouseDown={(e) => { e.preventDefault(); pressDpad(BUTTONS.DPAD_LEFT); }}
                onMouseUp={(e) => { e.preventDefault(); releaseDpad(BUTTONS.DPAD_LEFT); }}
                onMouseLeave={(e) => { e.preventDefault(); releaseDpad(BUTTONS.DPAD_LEFT); }}
              ></button>
              <button 
                className="dpad-area dpad-right"
                onMouseDown={(e) => { e.preventDefault(); pressDpad(BUTTONS.DPAD_RIGHT); }}
                onMouseUp={(e) => { e.preventDefault(); releaseDpad(BUTTONS.DPAD_RIGHT); }}
                onMouseLeave={(e) => { e.preventDefault(); releaseDpad(BUTTONS.DPAD_RIGHT); }}
              ></button>
              <button 
                className="dpad-area dpad-down"
                onMouseDown={(e) => { e.preventDefault(); pressDpad(BUTTONS.DPAD_DOWN); }}
                onMouseUp={(e) => { e.preventDefault(); releaseDpad(BUTTONS.DPAD_DOWN); }}
                onMouseLeave={(e) => { e.preventDefault(); releaseDpad(BUTTONS.DPAD_DOWN); }}
              ></button>
              <button 
                className="dpad-diagonal dpad-up-left"
                aria-label="up-left"
              />
              <button 
                className="dpad-diagonal dpad-up-right"
                aria-label="up-right"
              />
              <button 
                className="dpad-diagonal dpad-down-left"
                aria-label="down-left"
              />
              <button 
                className="dpad-diagonal dpad-down-right"
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
function GameSelector({ games, selectedIndex, isPro = false, onUpgradeClick }) {
  const selectedGame = games[selectedIndex];
  const [imgSrc, setImgSrc] = useState(selectedGame.cover);
  const [hasError, setHasError] = useState(false);

  const isLocked = selectedGame.proOnly && !isPro;

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
      setImgSrc(selectedGame.fallback);
      setHasError(true);
    } else {
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
        <div className="cover-container-full" style={{ position: 'relative' }}>

          {/* Cover image (always rendered — visible under lock overlay) */}
          {!hasError ? (
            <img
              src={imgSrc}
              alt={selectedGame.name}
              className="game-cover-full"
              onError={handleError}
              style={isLocked ? { filter: 'brightness(0.35) blur(1px)', userSelect: 'none' } : {}}
            />
          ) : (
            <div
              className="cover-fallback-full"
              style={isLocked ? { filter: 'brightness(0.35)', userSelect: 'none' } : {}}
            >
              {selectedGame.name}
            </div>
          )}

          {/* Locked overlay — darkened + ? SVG + Pro pill */}
          {isLocked && (
            <div
              onClick={onUpgradeClick}
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer',
                zIndex: 10,
              }}
            >
              {/* ? circle */}
              <svg
                width="52"
                height="52"
                viewBox="0 0 52 52"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.7))' }}
              >
                <circle cx="26" cy="26" r="24" stroke="rgba(255,255,255,0.9)" strokeWidth="2.5" />
                <text
                  x="26"
                  y="35"
                  textAnchor="middle"
                  fontSize="26"
                  fontWeight="bold"
                  fontFamily="system-ui, sans-serif"
                  fill="rgba(255,255,255,0.95)"
                >
                  ?
                </text>
              </svg>

              {/* Game name */}
              <span style={{
                color: 'rgba(255,255,255,0.85)',
                fontSize: '11px',
                fontWeight: '700',
                letterSpacing: '0.05em',
                textShadow: '0 1px 6px rgba(0,0,0,0.9)',
                textTransform: 'uppercase',
              }}>
                {selectedGame.name}
              </span>

              {/* Pro badge */}
              <span style={{
                background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                color: '#fff',
                fontSize: '10px',
                fontWeight: '800',
                padding: '3px 10px',
                borderRadius: '999px',
                letterSpacing: '0.08em',
                boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                marginTop: '2px',
              }}>
                PRO ONLY
              </span>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default HikariBoy;
