/**
 * HikariBoy Digital Handheld Console - Main Component
 * FoodSpot OS Arcade Module
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import './HikariBoy.css';

// Mock sub-components for now (as I'll create them or keep them simple)
// If the user didn't provide GameCarousel, etc., I'll need to handle that.
// BUT the user said "PASTE THE JSX CONTENT I PROVIDED ABOVE" and provided placeholders for index.js
// and HikariBoy.jsx. 
// I will adapt the FoodBoyConsole.tsx content to HikariBoy.jsx.

const GameCarousel = ({ games, selectedIndex, userScores, onSelect, onStart }) => (
  <div className="game-carousel">
    <div className="carousel-header">
      <span>SELECT GAME</span>
      <span className="swipe-hint">↔ SWIPE</span>
    </div>
    <div className="carousel-container">
      <div className="carousel-track" style={{ transform: `translateX(${-selectedIndex * 220}px)` }}>
        {games.map((game, i) => (
          <div key={game.id} className={`game-card ${i === selectedIndex ? 'active' : ''}`} onClick={() => onSelect(i)}>
            <div className="game-icon">{game.icon}</div>
            <div className="game-name">{game.name}</div>
            <div className="game-stats">HI-SCORE: {userScores[game.id]?.highScore || 0}</div>
          </div>
        ))}
      </div>
    </div>
    <div className="play-hint">TAP [A] TO START</div>
  </div>
);

const GameScreen = ({ game, onGameEnd, onPause }) => (
  <div className="game-screen" style={{ background: game.color }}>
    <div style={{ padding: 20, textAlign: 'center' }}>
      <h2>{game.name}</h2>
      <p>Playing...</p>
      <button onClick={() => onGameEnd(Math.floor(Math.random() * 1000))}>END GAME</button>
      <button onClick={onPause}>PAUSE</button>
    </div>
  </div>
);

const RewardsScreen = ({ coupons, onRedeem, onBack }) => (
  <div className="rewards-screen">
    <h3>MY REWARDS</h3>
    {coupons.length === 0 ? <p>No coupons yet!</p> : (
      <ul>
        {coupons.map(c => (
          <li key={c.id}>
            {c.rewardDescription} - {c.code}
            <button onClick={() => onRedeem(c)}>REDEEM</button>
          </li>
        ))}
      </ul>
    )}
    <button onClick={onBack}>BACK</button>
  </div>
);

// Basic SoundEngine stub
class SoundEngine {
  play(type) { console.log('Playing sound:', type); }
  cleanup() { }
}

const GAMES = [
  {
    id: 'burger-builder',
    code: 'BURG',
    name: 'Burger Builder',
    icon: '🍔',
    description: 'Stack ingredients in the perfect order!',
    color: '#F59E0B',
    thresholds: [
      { score: 500, discount: 5, reward: '5% OFF' },
      { score: 1000, discount: 10, reward: '10% OFF' },
      { score: 2000, discount: 15, reward: '15% OFF' },
      { score: 5000, discount: 100, reward: 'FREE SIDE', type: 'free_item' }
    ]
  },
  {
    id: 'slice-stacker',
    code: 'PIZZ',
    name: 'Slice Stacker',
    icon: '🍕',
    description: 'Stack pizza slices without toppling!',
    color: '#EF4444',
    thresholds: [
      { score: 300, discount: 3, reward: '3% OFF' },
      { score: 600, discount: 6, reward: '6% OFF' },
      { score: 1200, discount: 12, reward: '12% OFF' },
      { score: 2500, discount: 100, reward: 'FREE DRINK', type: 'free_item' }
    ]
  }
];

export const HikariBoy = ({ 
  userId = 'guest', 
  onCouponRedeemed,
  onClose,
  controllerColor = '#8B5CF6' 
}) => {
  const [screenState, setScreenState] = useState('carousel');
  const [selectedGameIndex, setSelectedGameIndex] = useState(0);
  const [currentScore, setCurrentScore] = useState(0);
  const [userScores, setUserScores] = useState({});
  const [coupons, setCoupons] = useState([]);
  const [earnedCoupon, setEarnedCoupon] = useState(null);
  const [showCRT, setShowCRT] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  const soundEngine = useRef(null);

  useEffect(() => {
    soundEngine.current = new SoundEngine();
    return () => {
      soundEngine.current?.cleanup();
    };
  }, []);

  const playSound = (soundType) => {
    if (soundEnabled && soundEngine.current) {
      soundEngine.current.play(soundType);
    }
  };

  const handleGameSelect = (index) => {
    setSelectedGameIndex(index);
    playSound('select');
  };

  const handleStartGame = () => {
    playSound('start');
    setScreenState('playing');
    setCurrentScore(0);
  };

  const handleGameEnd = (finalScore) => {
    setCurrentScore(finalScore);
    setScreenState('gameover');
    playSound('gameover');
    
    // Simple mock logic for thresholds
    const game = GAMES[selectedGameIndex];
    const threshold = game.thresholds.find(t => finalScore >= t.score);
    if (threshold) {
      const coupon = {
        id: `coupon-${Date.now()}`,
        code: `HIKARI-${game.code}-${threshold.score}-${Math.random().toString(36).substr(2,4).toUpperCase()}`,
        rewardDescription: threshold.reward
      };
      setEarnedCoupon(coupon);
      setCoupons(prev => [...prev, coupon]);
    }
  };

  const handleButtonPress = (button) => {
    playSound('button');
    if (button === 'b' && screenState === 'carousel') {
      onClose?.();
    } else if (button === 'a' && screenState === 'carousel') {
      handleStartGame();
    } else if (button === 'left') {
      setSelectedGameIndex(prev => Math.max(0, prev - 1));
    } else if (button === 'right') {
      setSelectedGameIndex(prev => Math.min(GAMES.length - 1, prev + 1));
    }
  };

  const renderScreen = () => {
    switch (screenState) {
      case 'carousel':
        return (
          <GameCarousel
            games={GAMES}
            selectedIndex={selectedGameIndex}
            userScores={userScores}
            onSelect={handleGameSelect}
            onStart={handleStartGame}
          />
        );
      case 'playing':
        return (
          <GameScreen
            game={GAMES[selectedGameIndex]}
            onGameEnd={handleGameEnd}
            onPause={() => setScreenState('carousel')}
          />
        );
      case 'gameover':
        return (
          <div className="gameover-screen">
            <div className="gameover-title">GAME OVER</div>
            <div className="final-score">{currentScore}</div>
            {earnedCoupon && (
              <div className="coupon-earned">
                <div className="coupon-badge">🎁 COUPON!</div>
                <div className="coupon-reward">{earnedCoupon.rewardDescription}</div>
              </div>
            )}
            <button onClick={() => setScreenState('carousel')}>CONTINUE</button>
          </div>
        );
      case 'rewards':
        return (
          <RewardsScreen
            coupons={coupons}
            onRedeem={(c) => { onCouponRedeemed?.(c); setScreenState('carousel'); }}
            onBack={() => setScreenState('carousel')}
          />
        );
      default: return null;
    }
  };

  return (
    <div className="hikariboy-overlay" style={{ '--controller-color': controllerColor }}>
      <div className="hikariboy-console">
        <div className="console-header">
          <div className="console-branding">
            <span className="brand-dots">▓▓</span>
            <span className="brand-name">HIKARIBOY</span>
            <span className="brand-dots">▓▓</span>
          </div>
          <div className="console-indicators">
            <span className="indicator" title="Battery">🔋</span>
            <span className="indicator" onClick={() => setSoundEnabled(!soundEnabled)}>
              {soundEnabled ? '🔊' : '🔇'}
            </span>
            <span className="indicator" onClick={() => setShowCRT(!showCRT)}>📺</span>
          </div>
        </div>
        
        <div className="screen-bezel">
          <div className={`screen-display ${showCRT ? 'crt-effect' : ''}`}>
            {renderScreen()}
            {showCRT && <div className="scanlines" />}
          </div>
        </div>
        
        <div className="control-labels">
          <span className="label">🎮 SELECT</span>
          <span className="label" onClick={handleStartGame}>START ▶️</span>
          <span className="label" onClick={() => setScreenState('rewards')}>🎁 REWARDS</span>
        </div>
        
        <div className="d-pad">
          <button className="dpad-btn up" onClick={() => handleButtonPress('up')}>▲</button>
          <button className="dpad-btn left" onClick={() => handleButtonPress('left')}>◀</button>
          <div className="dpad-center">●</div>
          <button className="dpad-btn right" onClick={() => handleButtonPress('right')}>▶</button>
          <button className="dpad-btn down" onClick={() => handleButtonPress('down')}>▼</button>
        </div>
        
        <div className="action-buttons">
          <button className="action-btn btn-a" onClick={() => handleButtonPress('a')}>
            <span className="btn-label">A</span>
          </button>
          <button className="action-btn btn-b" onClick={() => handleButtonPress('b')}>
            <span className="btn-label">B</span>
          </button>
        </div>
        
        <div className="speaker-grille">
          <span className="speaker-line">🔊</span>
          {[...Array(5)].map((_, i) => <div key={i} className="grille-line" />)}
        </div>
        
        <div className="console-footer">
          <span>POWERED BY HIKARI OS</span>
        </div>
      </div>
      
      <button className="hikariboy-close" onClick={onClose}>✕ CLOSE</button>
    </div>
  );
};

export default HikariBoy;
