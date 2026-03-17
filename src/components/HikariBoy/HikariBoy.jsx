/**
 * HikariBoy Emulator Shell
 * Delta GBA-style layout for FoodSpot Arcade
 * 
 * Structure:
 * - Top: Game Screen (iframe or canvas)
 * - Bottom: Purple Controller (D-pad + A/B + Select/Start/Menu)
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
  gameUrl = null, // URL to HTML5 game
  onClose, 
  onGameSelect,
  foodReady = false, // Notification trigger
  controllerColor = '#8B5CF6' // FoodSpot purple default
}) {
  const [isBooting, setIsBooting] = useState(true);
  const [showSelector, setShowSelector] = useState(false);
  const [currentGame, setCurrentGame] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const gameFrameRef = useRef(null);

  // Boot sequence (2 seconds)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsBooting(false);
      setShowSelector(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Food ready notification
  useEffect(() => {
    if (foodReady && currentGame) {
      // Send message to game frame
      gameFrameRef.current?.contentWindow?.postMessage({
        type: 'FOOD_READY',
        message: 'Your food is ready! 🍔'
      }, '*');
    }
  }, [foodReady, currentGame]);

  // Handle controller input
  const handleButtonPress = (button) => {
    if (!currentGame) return;
    
    // Send to game iframe
    gameFrameRef.current?.contentWindow?.postMessage({
      type: 'BUTTON_PRESS',
      button
    }, '*');

    // Handle system buttons
    switch(button) {
      case BUTTONS.START:
        setIsPaused(!isPaused);
        break;
      case BUTTONS.MENU:
        onClose?.();
        break;
      case BUTTONS.SELECT:
        // Back to selector confirmation
        if (window.confirm('Go back to Game Selector?')) {
          setCurrentGame(null);
          setShowSelector(true);
        }
        break;
    }
  };

  const launchGame = (game) => {
    setCurrentGame(game);
    setShowSelector(false);
    setIsPaused(false);
  };

  // Boot screen
  if (isBooting) {
    return (
      <div className="hikariboy-boot">
        <div className="boot-backlight"></div>
        <div className="boot-logo">
          <span className="pixel-text">HIKARIBOY</span>
        </div>
        <div className="boot-tagline">Food coming. Game on.</div>
      </div>
    );
  }

  // Game selector carousel
  if (showSelector) {
    return (
      <div className="hikariboy-selector">
        <GameSelector onSelect={launchGame} onClose={onClose} />
      </div>
    );
  }

  // Main emulator with game
  return (
    <div className="hikariboy-emulator" style={{ '--controller-color': controllerColor }}>
      {/* Game Screen */}
      <div className="game-screen">
        {currentGame && (
          <iframe
            ref={gameFrameRef}
            src={currentGame.url}
            title={currentGame.name}
            className="game-frame"
            sandbox="allow-scripts allow-same-origin"
          />
        )}
        
        {/* Pause Overlay */}
        {isPaused && (
          <div className="pause-overlay">
            <div className="pause-icon">II</div>
            <div className="pause-title">{currentGame?.name}</div>
            <div className="pause-options">
              <button onClick={() => setIsPaused(false)}>Resume</button>
              <button>Save State</button>
              <button>Load State</button>
            </div>
          </div>
        )}

        {/* Food Ready Notification */}
        {foodReady && (
          <div className="food-ready-banner">
            🍔 Your food is ready!
          </div>
        )}
      </div>

      {/* Purple Controller */}
      <div className="controller" style={{ backgroundColor: controllerColor }}>
        {/* L/R Shoulder buttons */}
        <div className="shoulder-buttons">
          <div className="shoulder-l">L</div>
          <div className="delta-brand">HIKARIBOY</div>
          <div className="shoulder-r">R</div>
        </div>

        {/* Main controls row */}
        <div className="controls-row">
          {/* D-Pad */}
          <div className="dpad">
            <button 
              className="dpad-btn dpad-up"
              onTouchStart={() => handleButtonPress(BUTTONS.DPAD_UP)}
              onMouseDown={() => handleButtonPress(BUTTONS.DPAD_UP)}
            >
              ▲
            </button>
            <button 
              className="dpad-btn dpad-left"
              onTouchStart={() => handleButtonPress(BUTTONS.DPAD_LEFT)}
              onMouseDown={() => handleButtonPress(BUTTONS.DPAD_LEFT)}
            >
              ◀
            </button>
            <div className="dpad-center"></div>
            <button 
              className="dpad-btn dpad-right"
              onTouchStart={() => handleButtonPress(BUTTONS.DPAD_RIGHT)}
              onMouseDown={() => handleButtonPress(BUTTONS.DPAD_RIGHT)}
            >
              ▶
            </button>
            <button 
              className="dpad-btn dpad-down"
              onTouchStart={() => handleButtonPress(BUTTONS.DPAD_DOWN)}
              onMouseDown={() => handleButtonPress(BUTTONS.DPAD_DOWN)}
            >
              ▼
            </button>
          </div>

          {/* A/B Buttons */}
          <div className="action-buttons">
            <button 
              className="btn-b"
              onTouchStart={() => handleButtonPress(BUTTONS.B)}
              onMouseDown={() => handleButtonPress(BUTTONS.B)}
            >
              B
            </button>
            <button 
              className="btn-a"
              onTouchStart={() => handleButtonPress(BUTTONS.A)}
              onMouseDown={() => handleButtonPress(BUTTONS.A)}
            >
              A
            </button>
          </div>
        </div>

        {/* Bottom row: Menu, Select, Start */}
        <div className="system-buttons">
          <button 
            className="sys-btn menu-btn"
            onClick={() => handleButtonPress(BUTTONS.MENU)}
          >
            MENU
          </button>
          <button 
            className="sys-btn select-btn"
            onClick={() => handleButtonPress(BUTTONS.SELECT)}
          >
            SELECT
          </button>
          <button 
            className="sys-btn start-btn"
            onClick={() => handleButtonPress(BUTTONS.START)}
          >
            START
          </button>
        </div>
      </div>
    </div>
  );
}

// Game Selector Component
function GameSelector({ onSelect, onClose }) {
  const games = [
    { id: '2048', name: '2048', cover: 'https://gabrielecirulli.github.io/2048/meta/apple-touch-icon.png', url: 'https://gabrielecirulli.github.io/2048/' },
    { id: 'tetris', name: 'Tetris', cover: '/games/tetris/cover.jpg', url: 'https://jakesgordon.github.io/javascript-tetris/' },
    { id: 'pacman', name: 'Pac-Man', cover: 'https://spite.github.io/pacman/icon.png', url: 'https://spite.github.io/pacman/' },
    { id: 'snake', name: 'Snake', cover: '/games/snake/cover.png', url: '/games/snake/index.html' },
    { id: 'tictactoe', name: 'Tic Tac Toe', cover: 'https://beumsk.github.io/Tic-Tac-Toe/icon.png', url: 'https://beumsk.github.io/Tic-Tac-Toe/' },
    { id: 'connect-four', name: 'Connect Four', cover: 'https://kenrick95.github.io/connect-four/icon.png', url: 'https://kenrick95.github.io/connect-four/' },
    { id: 'stack', name: 'Stack', cover: 'https://stevengoldberg.github.io/stack/icon.png', url: 'https://stevengoldberg.github.io/stack/' },
    { id: 'doodle-jump', name: 'Doodle Jump', cover: '/games/doodle-jump/cover.png', url: '/games/doodle-jump/index.html' },
    { id: 'asteroids', name: 'Asteroids', cover: '/games/asteroids/cover.png', url: '/games/asteroids/index.html' },
    { id: 'breakout', name: 'Breakout', cover: '/games/breakout/cover.png', url: '/games/breakout/index.html' },
    { id: 'minesweeper', name: 'Minesweeper', cover: '/games/minesweeper/cover.png', url: '/games/minesweeper/index.html' },
    { id: 'sudoku', name: 'Sudoku', cover: '/games/sudoku/cover.png', url: '/games/sudoku/index.html' },
    { id: 'wordle', name: 'Wordle', cover: '/games/wordle/cover.png', url: '/games/wordle/index.html' },
    { id: 'chess', name: 'Chess', cover: '/games/chess/cover.png', url: '/games/chess/index.html' },
    { id: 'slope', name: 'Slope', cover: '/games/slope/cover.png', url: '/games/slope/index.html' },
    { id: 'color-switch', name: 'Color Switch', cover: '/games/color-switch/cover.png', url: '/games/color-switch/index.html' },
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
    <div className="selector-container">
      <h2>Select Game</h2>
      <div className="carousel">
        <button className="arrow left" onClick={() => scroll('left')}>◀</button>
        
        <div className="game-card">
          <img src={games[selectedIndex].cover} alt={games[selectedIndex].name} />
          <div className="game-title">{games[selectedIndex].name}</div>
        </div>
        
        <button className="arrow right" onClick={() => scroll('right')}>▶</button>
      </div>
      
      <div className="selector-controls">
        <button className="launch-btn" onClick={() => onSelect(games[selectedIndex])}>
          A Button: LAUNCH
        </button>
        <button className="back-btn" onClick={onClose}>
          MENU: BACK
        </button>
      </div>
      
      <div className="game-count">
        {selectedIndex + 1} / {games.length}
      </div>
    </div>
  );
}

export default HikariBoy;
