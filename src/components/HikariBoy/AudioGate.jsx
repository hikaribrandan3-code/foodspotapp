/**
 * AudioGate.jsx
 * Pre-boot audio permission screen — styled like a GBA startup
 * Tap A to enable sound, B to play silently
 */

import React, { useState, useRef } from 'react';
import './AudioGate.css';

export default function AudioGate({ onEnableAudio, onDisableAudio }) {
  const [status, setStatus] = useState('');
  const [transitioning, setTransitioning] = useState(false);
  const respondedRef = useRef(false);

  const playSuccessBloop = (ctx) => {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) {
      // ignore
    }
  };

  const handleResponse = (enabled) => {
    // Prevent double-fire from touch + click or rapid taps
    if (respondedRef.current) return;
    respondedRef.current = true;

    setTransitioning(true);

    if (enabled) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();

      // Resume synchronously inside user gesture (iOS Safari requirement)
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      playSuccessBloop(ctx);
      setStatus('Audio activado! Iniciando...');

      // Small delay so user sees/hears feedback before boot
      setTimeout(() => {
        onEnableAudio?.(ctx);
      }, 500);
    } else {
      setStatus('Modo silencio. Iniciando...');
      setTimeout(() => {
        onDisableAudio?.();
      }, 300);
    }
  };

  return (
    <div className="ag-screen">
      <div className={`ag-container ${transitioning ? 'ag-transitioning' : ''}`}>
        <div className="ag-header">Configuracion</div>

        {/* Pixel Burger Mascot */}
        <div className="ag-mascot ag-animate-bounce">
          <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
            {/* Bun Top */}
            <rect x="3" y="2" width="10" height="4" fill="#d97706" />
            <rect x="4" y="1" width="8" height="1" fill="#d97706" />
            {/* Seeds */}
            <rect x="5" y="2" width="1" height="1" fill="#fde68a" />
            <rect x="9" y="3" width="1" height="1" fill="#fde68a" />
            {/* Cheese */}
            <rect x="2" y="6" width="12" height="1" fill="#facc15" />
            {/* Patty */}
            <rect x="2" y="7" width="12" height="2" fill="#451a03" />
            {/* Lettuce */}
            <rect x="2" y="9" width="12" height="1" fill="#22c55e" />
            {/* Bun Bottom */}
            <rect x="3" y="10" width="10" height="2" fill="#d97706" />
            {/* Eyes */}
            <rect x="5" y="4" width="1" height="1" fill="#000" />
            <rect x="10" y="4" width="1" height="1" fill="#000" />
            {/* Arms */}
            <rect x="1" y="8" width="2" height="1" fill="#d97706" />
            <rect x="13" y="8" width="2" height="1" fill="#d97706" />
          </svg>
        </div>

        <div className="ag-dialogue">
          ACTIVAR AUDIO PARA UNA MEJOR EXPERIENCIA?
        </div>

        <div className="ag-controls">
          <div className="ag-hint">
            <button
              className="ag-btn ag-btn-a"
              onTouchStart={(e) => { e.preventDefault(); handleResponse(true); }}
              onClick={() => handleResponse(true)}
            >
              A
            </button>
            <span>SI</span>
          </div>
          <div className="ag-hint">
            <button
              className="ag-btn ag-btn-b"
              onTouchStart={(e) => { e.preventDefault(); handleResponse(false); }}
              onClick={() => handleResponse(false)}
            >
              B
            </button>
            <span>NO</span>
          </div>
        </div>

        <div className="ag-footer-hint">Presiona las teclas A o B</div>

        {status && <div className="ag-status">{status}</div>}
      </div>
    </div>
  );
}
