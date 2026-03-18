/**
 * MunchboyBoot.jsx
 * Animated boot sequence with MUNCHBOY letters
 * Auto-plays then transitions to game selector
 */

import React, { useState, useRef, useEffect } from 'react';
import './MunchboyBoot.css';

export default function MunchboyBoot({ onComplete }) {
  const [lettersDropped, setLettersDropped] = useState(false);
  const [showFooter, setShowFooter] = useState(false);
  const [showPressStart, setShowPressStart] = useState(false);
  const [rainbowActive, setRainbowActive] = useState(false);
  const audioCtxRef = useRef(null);

  const playGbaChime = async () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    
    // Resume context if suspended (browser auto-play policy)
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    
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

  // Auto-start on mount
  useEffect(() => {
    const dropTimer = setTimeout(() => {
      setLettersDropped(true);
    }, 300);

    const footerTimer = setTimeout(() => {
      setShowFooter(true);
    }, 1000); // Appear sooner as letters settle
    
    const chimeTimer = setTimeout(() => {
      playGbaChime();
      setRainbowActive(true);
    }, 1800);
    
    const pressStartTimer = setTimeout(() => {
      setShowPressStart(true);
    }, 3500);
    
    const autoContinueTimer = setTimeout(() => {
      onComplete?.();
    }, 6500); // Auto-continue after 6.5 seconds
    
    return () => {
      clearTimeout(dropTimer);
      clearTimeout(footerTimer);
      clearTimeout(chimeTimer);
      clearTimeout(pressStartTimer);
      clearTimeout(autoContinueTimer);
    };
  }, [onComplete]);

  const handleClick = () => {
    if (showPressStart) {
      onComplete?.();
    }
  };

  return (
    <div className="munchboy-boot-screen" onClick={handleClick}>
      <div className="munchboy-logo-container">
        {'MUNCHBOY'.split('').map((letter, i) => (
          <span
            key={i}
            className={`munch-letter l-${letter} ${lettersDropped ? 'dropped' : ''}`}
            style={{ transitionDelay: `${i * 150}ms` }}
          >
            {letter}
          </span>
        ))}
        <div className={`rainbow-sweep ${rainbowActive ? 'active' : ''}`}>
          MUNCHBOY
        </div>
      </div>
      
      <div className={`munchboy-footer ${showFooter ? 'visible' : ''}`}>
        foodspot mobile
        <div className={`rainbow-sweep-footer ${rainbowActive ? 'active' : ''}`}>
          foodspot mobile
        </div>
      </div>
      
      {showPressStart && (
        <div className="press-start-text">PRESS START</div>
      )}
    </div>
  );
}
