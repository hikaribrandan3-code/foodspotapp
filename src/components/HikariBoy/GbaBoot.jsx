/**
 * GbaBoot.jsx
 * GBA-style boot sequence with MUNCHBOY branding
 * Exact 1:1 from provided HTML with GBA purple bezel
 */

import React, { useState, useRef, useEffect } from 'react';
import './GbaBoot.css';

export default function GbaBoot({ onComplete }) {
  const [isBooting, setIsBooting] = useState(false);
  const [lettersDropped, setLettersDropped] = useState(false);
  const [showFooter, setShowFooter] = useState(false);
  const [showPressStart, setShowPressStart] = useState(false);
  const [rainbowActive, setRainbowActive] = useState(false);
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

  const startBoot = () => {
    if (isBooting) return;
    setIsBooting(true);
    
    // Drop letters with stagger
    setTimeout(() => setLettersDropped(true), 100);
    
    // After letters drop, play chime and show effects
    setTimeout(() => {
      playGbaChime();
      setRainbowActive(true);
      setShowFooter(true);
      
      setTimeout(() => {
        setShowPressStart(true);
      }, 1500);
    }, 750);
  };

  const handlePressStart = () => {
    if (showPressStart) {
      onComplete?.();
    }
  };

  // Auto-start boot sequence on mount for "wow" effect
  useEffect(() => {
    const timer = setTimeout(() => {
      startBoot();
    }, 300); // Short delay to let screen render
    return () => clearTimeout(timer);
  }, []);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showPressStart && (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyA')) {
        handlePressStart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPressStart]);

  return (
    <div className="gba-boot-overlay">
      <div className="gba-bezel">
        <div className="gba-screen-boot" onClick={showPressStart ? handlePressStart : null}>
          
          <div className="munchboy-logo">
            {'MUNCHBOY'.split('').map((letter, i) => (
              <span
                key={i}
                className={`munch-letter-gba l-${letter} ${lettersDropped ? 'settled' : ''}`}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                {letter}
              </span>
            ))}
            <div className={`rainbow-wave ${rainbowActive ? 'run-wave' : ''}`}>
              MUNCHBOY
            </div>
          </div>
          
          <div className={`gba-footer ${showFooter ? 'visible' : ''}`}>
            foodspot mobile
            <div className={`rainbow-wave-footer ${rainbowActive ? 'run-wave' : ''}`}>
              foodspot mobile
            </div>
          </div>
          
          {showPressStart && (
            <div className="gba-press-start">PRESS START</div>
          )}
        </div>
      </div>
    </div>
  );
}
