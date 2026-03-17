/**
 * HikariBoy Emulator Shell
 * Delta GBA-style layout for FoodSpot Arcade
 * 
 * Structure:
 * - Top: Game Screen (Boot -> Selector -> Game)
 * - Bottom: Purple Controller (Always Visible)
 * 
 * Visual reference: Delta emulator screenshots
 */

import React, { useState, useRef, useEffect } from 'react';
import './HikariBoy.css';

// Controller button handlers
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

export function HikariBoy({ 
  onClose, 
  foodReady = false, 
  controllerColor = '#8B5CF6' 
}) {
  const [isBooting, setIsBooting] = useState(true);
  const [currentGame, setCurrentGame] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const gameFrameRef = useRef(null);

  // Boot sequence (2 seconds)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsBooting(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Handle controller input
  const handleButtonPress = (button) => {
    // 1. If paused, system handle
    if (isPaused && button === BUTTONS.START) {
      setIsPaused(false);
      return;
    }

    // 2. If in game, send to frame
    if (currentGame) {
      gameFrameRef.current?.contentWindow?.postMessage({
        type: 'BUTTON_PRESS',
        button
      }, '*');

      // System buttons
      if (button === BUTTONS.START) setIsPaused(true);
      if (button === BUTTONS.MENU) onClose?.();
      if (button === BUTTONS.SELECT) {
        if (window.confirm('Go back to Game Selector?')) {
          setCurrentGame(null);
        }
      }
    } else if (!isBooting) {
      // 3. If in selector, limited controls could map to carousel later
      if (button === BUTTONS.MENU) onClose?.();
    }
  };

  const launchGame = (game) => {
    setCurrentGame(game);
    setIsPaused(false);
  };

  return (
    <div className="hikariboy-emulator" style={{ '--controller-color': controllerColor }}>
      {/* Game Screen Container (Top Half) */}
      <div className="game-screen">
        {isBooting ? (
          <div className="hikariboy-boot">
            <div className="boot-backlight"></div>
            <div className="boot-logo">
              <span className="pixel-text">HIKARIBOY</span>
            </div>
            <div className="boot-tagline">Food coming. Game on.</div>
          </div>
        ) : !currentGame ? (
          <GameSelector onSelect={launchGame} onClose={onClose} />
        ) : (
          <>
            <iframe
              ref={gameFrameRef}
              src={currentGame.url}
              title={currentGame.name}
              className="game-frame"
              sandbox="allow-scripts allow-same-origin"
            />
            
            {isPaused && (
              <div className="pause-overlay">
                <div className="pause-icon">II</div>
                <div className="pause-title">{currentGame.name}</div>
                <div className="pause-options">
                  <button onClick={() => setIsPaused(false)}>Resume</button>
                  <button onClick={() => setCurrentGame(null)}>Quit Game</button>
                </div>
              </div>
            )}

            {foodReady && (
              <div className="food-ready-banner">
                🍔 Your food is ready!
              </div>
            )}
          </>
        )}
      </div>

      {/* Purple Controller (Bottom Half - ALWAYS VISIBLE) */}
      <div className="controller" style={{ backgroundColor: controllerColor }}>
        <div className="shoulder-buttons">
          <div className="shoulder-l">L</div>
          <div className="delta-brand">HIKARIBOY</div>
          <div className="shoulder-r">R</div>
        </div>

        <div className="controls-row">
          {/* D-Pad */}
          <div className="dpad">
            <button className="dpad-btn dpad-up" onMouseDown={() => handleButtonPress(BUTTONS.DPAD_UP)}>▲</button>
            <button className="dpad-btn dpad-left" onMouseDown={() => handleButtonPress(BUTTONS.DPAD_LEFT)}>◀</button>
            <div className="dpad-center"></div>
            <button className="dpad-btn dpad-right" onMouseDown={() => handleButtonPress(BUTTONS.DPAD_RIGHT)}>▶</button>
            <button className="dpad-btn dpad-down" onMouseDown={() => handleButtonPress(BUTTONS.DPAD_DOWN)}>▼</button>
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            <button className="btn-b" onMouseDown={() => handleButtonPress(BUTTONS.B)}>B</button>
            <button className="btn-a" onMouseDown={() => handleButtonPress(BUTTONS.A)}>A</button>
          </div>
        </div>

        <div className="system-buttons">
          <button className="sys-btn menu-btn" onClick={() => onClose?.()}>MENU</button>
          <button className="sys-btn select-btn" onClick={() => handleButtonPress(BUTTONS.SELECT)}>SELECT</button>
          <button className="sys-btn start-btn" onClick={() => handleButtonPress(BUTTONS.START)}>START</button>
        </div>
      </div>
    </div>
  );
}

// Game Selector Component (Renders INSIDE the screen)
function GameSelector({ onSelect, onClose }) {
  const games = [
    { id: 'empanada-dash', name: 'Empanada Dash', cover: '/games/empanada-dash.jpg', url: '/games/empanada-dash/index.html' },
    { id: 'triple-snap-slots', name: 'Triple Snap', cover: '/games/triplesnapslots.jpg', url: '/games/triple-snap-slots/index.html' },
    { id: 'sushi-slice', name: 'Sushi Slice', cover: '/games/sushislicernew.jpg', url: '/games/sushi-slice/index.html' },
    { id: 'gravity-flip', name: 'Gravity Flip', cover: '/games/gravityflip.jpg', url: '/games/gravity-flip/index.html' },
    { id: 'pegfall-panic', name: 'Peg Stack', cover: '/games/pegstacker.png', url: '/games/peg-stack/index.html' },
    { id: 'box-runner', name: 'Box Runner', cover: '/games/siderunnergamecover.png', url: '/games/box-runner/index.html' },
    { id: 'false-hold', name: 'False Hold', cover: '/games/falsehold.jpg', url: '/games/false-hold/index.html' },
    { id: 'escapa-del-turno', name: 'Escapa del Turno', cover: '/games/escapadelturno.jpg', url: '/games/escapa-del-turno/index.html' },
    { id: 'avoid-zone', name: 'Cuidado con la Grasa', cover: '/games/avoid-zone-engine.png', url: '/games/avoid-grasa/index.html' },
    { id: 'collapse-stack', name: 'Burger Stacker', cover: '/games/collapse-stack.jpg', url: '/games/burger-stacker/index.html' },
    { id: '2048', name: '2048 📱', cover: '🔢', url: 'https://gabrielecirulli.github.io/2048/' },
    { id: 'hextris', name: 'Hextris 📱', cover: '🔷', url: 'https://hextris.github.io/hextris/' },
    { id: 'stack', name: 'Stack 📱', cover: '📚', url: 'https://stevengoldberg.github.io/stack/' },
    { id: 'clumsybird', name: 'Clumsy Bird 📱', cover: '🐤', url: 'https://ellisonleao.github.io/clumsy-bird/' },
    { id: 'tictactoe', name: 'Tic Tac Toe 📱', cover: '⭕', url: 'https://beumsk.github.io/Tic-Tac-Toe/' },
    { id: 'connect4', name: 'Connect Four 📱', cover: '🔴', url: 'https://kenrick95.github.io/connect-four/' },
  ];

  const [selectedIndex, setSelectedIndex] = useState(0);

  const scroll = (direction) => {
    if (direction === 'left') {
      setSelectedIndex(prev => prev > 0 ? prev - 1 : games.length - 1);
    } else {
      setSelectedIndex(prev => prev < games.length - 1 ? prev + 1 : 0);
    }
  };

  return (
    <div className="selector-embedded">
      <div className="carousel-mini">
        <button className="mini-arrow" onClick={() => scroll('left')}>◀</button>
        <div className="mini-card" onClick={() => onSelect(games[selectedIndex])}>
          {games[selectedIndex].cover.length < 5 ? (
            <div className="emoji-cover">{games[selectedIndex].cover}</div>
          ) : (
            <img src={games[selectedIndex].cover} alt={games[selectedIndex].name} />
          )}
          <div className="mini-title">{games[selectedIndex].name}</div>
        </div>
        <button className="mini-arrow" onClick={() => scroll('right')}>▶</button>
      </div>
      <div className="mini-hint">Press A or Tap to Start</div>
    </div>
  );
}

export default HikariBoy;
