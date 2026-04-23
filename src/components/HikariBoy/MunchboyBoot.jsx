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
  const audioCtxRef = useRef(null);

  const playGbaChime = async () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    
    // Auto-resume if browser started suspended
    if (ctx.state === 'suspended') {
      await ctx.resume().catch(console.warn);
    }
    
    const now = ctx.currentTime;
    
    // Frequency constants
    const f1 = 523.25; // C5
    const f2 = 1046.50; // C6
    const f3 = 2093.00; // C7
    
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
    
    // 1. Initial blips
    pulse(f1, now, 0.08, 0.1, 'square');
    // 2. High dual-tone
    setTimeout(() => {
      pulse(f2, now + 0.08, 1.2, 0.15, 'square');
      pulse(f3, now + 0.08, 0.8, 0.05, 'triangle');
    }, 80);
  };

  const [shake, setShake] = useState(false);

  // Auto-start on mount following the exact original logic
  useEffect(() => {
    // 1. Start letter drops immediately
    setLettersDropped(true);

    // Hardcode: 8 letters * 110ms = 770ms total drop time for last letter
    const SHAKE_DELAY = 770;
    const FOOTER_DELAY = SHAKE_DELAY + 400; // 1170ms
    const FINISH_DELAY = FOOTER_DELAY + 750; // "PRESS START" appears

    const shakeTimer = setTimeout(() => {
      setShake(true);
      setTimeout(() => setShake(false), 200);
    }, SHAKE_DELAY);

    const footerTimer = setTimeout(() => {
      setShowFooter(true);
    }, FOOTER_DELAY);

    const finishTimer = setTimeout(() => {
      setShowPressStart(true);
    }, FINISH_DELAY);

    return () => {
      clearTimeout(shakeTimer);
      clearTimeout(footerTimer);
      clearTimeout(finishTimer);
    };
  }, [onComplete]);

  const handleClick = async () => {
    if (showPressStart) {
      // Play chime on user interaction (fixes mobile autoplay restriction)
      await playGbaChime();
      onComplete?.();
    }
  };

  return (
    <div className={`munchboy-boot-screen ${shake ? 'shake' : ''}`} onClick={handleClick}>
      <div className="munchboy-logo-container">
        {'MUNCHBOY'.split('').map((letter, i) => (
          <span
            key={i}
            className={`munch-letter l-${letter} ${lettersDropped ? 'dropped' : ''}`}
            style={{ transitionDelay: `${i * 110}ms` }}
          >
            {letter}
          </span>
        ))}
      </div>
      
      <div className={`munchboy-footer ${showFooter ? 'visible' : ''}`}>
        foodspot mobile
      </div>
      
      {showPressStart && (
        <div className="press-start-text">PRESS START</div>
      )}
    </div>
  );
}
