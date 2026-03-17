/**
 * HikariBoy Emulator Shell - Delta 1:1
 * Deep purple GBA-style layout for FoodSpot Arcade
 * 
 * Visual reference: Delta emulator iOS
 * Responsive: iPhone Regular / Pro / Pro Max
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

// 16 NEW GAMES (Agent Swarm)
const GAMES = [
  { id: 'burger-stack', name: 'Burger Stack', emoji: '🍔', url: '/games/burger-stack/index.html' },
  { id: 'food-fight', name: 'Food Fight', emoji: '👊', url: '/games/food-fight/index.html' },
  { id: 'pizza-slice', name: 'Pizza Slice', emoji: '🍕', url: '/games/pizza-slice/index.html' },
  { id: 'sushi-roll', name: 'Sushi Roll', emoji: '🍣', url: '/games/sushi-roll/index.html' },
  { id: 'fry-catch', name: 'Fry Catch', emoji: '🍟', url: '/games/fry-catch/index.html' },
  { id: 'taco-tower', name: 'Taco Tower', emoji: '🌮', url: '/games/taco-tower/index.html' },
  { id: 'condiment-blast', name: 'Condiment Blast', emoji: '🥫', url: '/games/condiment-blast/index.html' },
  { id: 'bubble-tea', name: 'Bubble Tea', emoji: '🧋', url: '/games/bubble-tea/index.html' },
  { id: 'donut-roll', name: 'Donut Roll', emoji: '🍩', url: '/games/donut-roll/index.html' },
  { id: 'hotdog-dash', name: 'Hotdog Dash', emoji: '🌭', url: '/games/hotdog-dash/index.html' },
  { id: 'coffee-pour', name: 'Coffee Pour', emoji: '☕', url: '/games/coffee-pour/index.html' },
  { id: 'steak-flip', name: 'Steak Flip', emoji: '🥩', url: '/games/steak-flip/index.html' },
  { id: 'ice-cream', name: 'Ice Cream', emoji: '🍦', url: '/games/ice-cream/index.html' },
  { id: 'spice-invaders', name: 'Spice Invaders', emoji: '🌶️', url: '/games/spice-invaders/index.html' },
  { id: 'fruit-slice', name: 'Fruit Slice', emoji: '🥝', url: '/games/fruit-slice/index.html' },
  { id: 'bento-box', name: 'Bento Box', emoji: '🍱', url: '/games/bento-box/index.html' },
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

  useEffect(() => {
    const timer = setTimeout(() => setIsBooting(false), 2000);
    return () => clearTimeout(timer);
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
      // Selector controls
      if (button === BUTTONS.DPAD_LEFT) {
        setSelectedIndex(prev => prev > 0 ? prev - 1 : GAMES.length - 1);
      }
      if (button === BUTTONS.DPAD_RIGHT) {
        setSelectedIndex(prev => prev < GAMES.length - 1 ? prev + 1 : 0);
      }
      if (button === BUTTONS.A) {
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
          {/* D-Pad - Single Cross Piece */}
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

          {/* A/B Buttons - A larger & higher */}
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

        {/* System Buttons - Circles with labels below */}
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

// Game Selector Component
function GameSelector({ games, selectedIndex }) {
  return (
    <div className="hb-selector">
      <div className="selector-games">
        {games.map((game, idx) => (
          <div 
            key={game.id}
            className={`game-thumb ${idx === selectedIndex ? 'active' : ''}`}
          >
            <div className="thumb-emoji">{game.emoji}</div>
            <div className="thumb-name">{game.name}</div>
          </div>
        ))}
      </div>
      <div className="selector-hint">
        ◀ ▶ to browse  ●  A to play
      </div>
    </div>
  );
}

export default HikariBoy;
