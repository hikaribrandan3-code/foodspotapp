import React, { useState, useEffect, useRef } from 'react';
import { useTenant } from '../contexts/TenantContext';
import '../styles/CharacterAnimationQA.css';

const CharacterAnimationQA = () => {
  const { businessId } = useTenant();
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [kawaiiEnabled, setKawaiiEnabled] = useState(
    localStorage.getItem(`kawaii_enabled_${businessId}`) === 'true'
  );
  const animationTimeout = useRef(null);

  // All 22 characters: 11 Kawaii + 11 UGC
  const characters = [
    // NEW KAWAII CHARACTERS
    { id: 'cupcake', name: 'Cupcake', type: 'kawaii', message: 'Selfie Queen Cupcake! 📸' },
    { id: 'cookie', name: 'Cookie', type: 'kawaii', message: 'Sweet Chocolate Cookie! 🍪' },
    { id: 'coffee', name: 'Coffee', type: 'kawaii', message: 'Morning Brew! ☕' },
    { id: 'donut', name: 'Donut', type: 'kawaii', message: 'Sweet Glazed Donut! 😋' },
    { id: 'mintcupcake', name: 'Mint Cupcake', type: 'kawaii', message: 'Mint Perfection! 🌿' },
    { id: 'icecream', name: 'Ice Cream', type: 'kawaii', message: 'Triple Scoop Delight! 🍦' },
    { id: 'avocado', name: 'Avocado', type: 'kawaii', message: 'Creamy & Green! 🥑' },
    { id: 'strawberry', name: 'Strawberry', type: 'kawaii', message: 'Sweet Berry! 🍓' },
    { id: 'watermelon', name: 'Watermelon', type: 'kawaii', message: 'Refreshing Slice! 🍉' },
    { id: 'tennis', name: 'Tennis Ball', type: 'kawaii', message: 'Game On! 🎾' },
    { id: 'lollipop', name: 'Lollipop', type: 'kawaii', message: 'Rainbow Sweet! 🍭' },

    // EXISTING UGC CHARACTERS (placeholder names)
    { id: 'ugc1', name: 'UGC Character 1', type: 'ugc', message: 'Great Recipe! 👨‍🍳' },
    { id: 'ugc2', name: 'UGC Character 2', type: 'ugc', message: 'Tasty Moment! 😋' },
    { id: 'ugc3', name: 'UGC Character 3', type: 'ugc', message: 'Enjoy It! 🍽️' },
    { id: 'ugc4', name: 'UGC Character 4', type: 'ugc', message: 'Delicious! 😍' },
    { id: 'ugc5', name: 'UGC Character 5', type: 'ugc', message: 'Food Love! ❤️' },
    { id: 'ugc6', name: 'UGC Character 6', type: 'ugc', message: 'Yum Yum! 🤤' },
    { id: 'ugc7', name: 'UGC Character 7', type: 'ugc', message: 'Perfect! ✨' },
    { id: 'ugc8', name: 'UGC Character 8', type: 'ugc', message: 'Sharing Joy! 🎉' },
    { id: 'ugc9', name: 'UGC Character 9', type: 'ugc', message: 'Food Time! ⏰' },
    { id: 'ugc10', name: 'UGC Character 10', type: 'ugc', message: 'Cheers! 🥂' },
    { id: 'ugc11', name: 'UGC Character 11', type: 'ugc', message: 'Thanks! 🙏' },
  ];

  const currentCharacter = characters[currentCharIndex];

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return;

    const duration = 3500 / speed; // 3.5 seconds per character
    animationTimeout.current = setTimeout(() => {
      setCurrentCharIndex((prev) => (prev + 1) % characters.length);
    }, duration);

    return () => clearTimeout(animationTimeout.current);
  }, [isPlaying, currentCharIndex, speed, characters.length]);

  const handleNext = () => {
    setCurrentCharIndex((prev) => (prev + 1) % characters.length);
  };

  const handlePrev = () => {
    setCurrentCharIndex((prev) => (prev - 1 + characters.length) % characters.length);
  };

  const handleToggleKawaii = async () => {
    const newValue = !kawaiiEnabled;
    setKawaiiEnabled(newValue);
    localStorage.setItem(`kawaii_enabled_${businessId}`, newValue ? 'true' : 'false');

    // TODO: Save to database/Supabase
    // await updateBusinessSetting(businessId, 'kawaii_enabled', newValue);
  };

  return (
    <div className="character-animation-qa">
      <div className="qa-header">
        <h3>🎬 Character Animation Preview</h3>
        <p className="qa-subtitle">Quality Control - View all characters on receipt background</p>
      </div>

      {/* Receipt Background Preview */}
      <div className="receipt-preview">
        <div className="receipt-background">
          <div className="receipt-content">
            <div className="character-stage">
              <div className="character-info">
                <span className="char-type" style={{
                  backgroundColor: currentCharacter.type === 'kawaii' ? '#EC4899' : '#8B7355',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  {currentCharacter.type === 'kawaii' ? '✨ NEW' : '📷 UGC'}
                </span>
                <span className="char-name">{currentCharacter.name}</span>
              </div>

              <div className="character-animation">
                <div className="animated-character">
                  {/* Placeholder for character animation */}
                  <div className="char-visual">🎭</div>
                  <div className="char-label">{currentCharacter.name}</div>
                </div>
              </div>

              <div className="message-bubble">
                <p>{currentCharacter.message}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="qa-controls">
        <div className="playback-controls">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="control-btn"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>

          <button
            onClick={handlePrev}
            className="control-btn"
            title="Previous"
          >
            ⏮
          </button>

          <button
            onClick={handleNext}
            className="control-btn"
            title="Next"
          >
            ⏭
          </button>

          <div className="speed-control">
            <label>Speed:</label>
            <select
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="speed-select"
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={1.5}>1.5x</option>
              <option value={2}>2x</option>
            </select>
          </div>
        </div>

        <div className="progress-info">
          <span className="progress-text">
            {currentCharIndex + 1} / {characters.length}
          </span>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${((currentCharIndex + 1) / characters.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Character Status */}
        <div className="character-status">
          <div className="status-item kawaii">
            <span className="status-icon">✅</span>
            <span className="status-text">Kawaii Characters - 11 Ready</span>
          </div>
          <div className="status-item ugc">
            <span className="status-icon">✅</span>
            <span className="status-text">UGC Characters - 11 Existing</span>
          </div>
        </div>

        {/* Enable Toggle */}
        <div className="kawaii-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={kawaiiEnabled}
              onChange={handleToggleKawaii}
              className="toggle-input"
            />
            <span className="toggle-text">
              {kawaiiEnabled ? '✨ Kawaii Characters ENABLED for Customers' : '⭕ Kawaii Characters Disabled'}
            </span>
          </label>
          <p className="toggle-hint">
            {kawaiiEnabled
              ? 'Customers will see kawaii characters on their receipts'
              : 'Existing UGC characters will appear on receipts'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CharacterAnimationQA;
