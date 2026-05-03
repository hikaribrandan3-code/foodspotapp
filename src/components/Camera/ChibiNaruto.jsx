import React, { useRef, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { translations } from '../../utils/translations';
import './ChibiNaruto.css';

export default function ChibiNaruto({ onCapture, onDismiss }) {
  const { lang } = useLanguage();
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const stateRef = useRef({
    frame: 0,
    flashIntensity: 0,
    flashTimer: 40,
    state: 'running',
    x: 0,
    targetX: 0,
    y: 0,
    rotation: 0,
    scale: 0.9,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      stateRef.current.targetX = rect.width / 2;
      stateRef.current.y = rect.height * 0.7;
      if (stateRef.current.state === 'running') {
        stateRef.current.x = rect.width + 250;
      }
    };

    const drawRoundedRect = (x, y, w, h, r) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    };

    const drawBurger = (x, y, scale) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);

      ctx.fillStyle = '#E69F52';
      drawRoundedRect(-30, 10, 60, 15, 8);
      ctx.fill();

      ctx.fillStyle = '#4CAF50';
      drawRoundedRect(-32, 5, 64, 6, 3);
      ctx.fill();

      ctx.fillStyle = '#5D4037';
      drawRoundedRect(-31, -2, 62, 10, 4);
      ctx.fill();

      ctx.fillStyle = '#FFD54F';
      ctx.beginPath();
      ctx.moveTo(-30, -2); ctx.lineTo(30, -2); ctx.lineTo(25, 5); ctx.lineTo(-25, 5);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#E53935';
      drawRoundedRect(-25, -6, 50, 5, 2);
      ctx.fill();

      ctx.fillStyle = '#E69F52';
      ctx.beginPath(); ctx.ellipse(0, -10, 32, 22, 0, Math.PI, 0); ctx.fill();

      ctx.fillStyle = '#FFF9C4';
      for (let i = 0; i < 14; i++) {
        const angle = (i / 14) * Math.PI - Math.PI;
        const rx = Math.cos(angle * 5) * 20;
        const ry = -20 + Math.sin(angle * 2) * 5;
        ctx.save();
        ctx.translate(rx, ry);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.ellipse(0, 0, 1.8, 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    };

    const drawNaruto = (x, y, rotation, scale, frame) => {
      const s = stateRef.current;
      ctx.save();
      ctx.translate(x, y);
      const isRunning = s.state === 'running';
      const runLean = isRunning ? -0.5 : 0;
      ctx.rotate(rotation + runLean);
      ctx.scale(scale, scale);

      // Legs
      const legMove = Math.sin(frame * 0.4) * 25;
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#FF9800';

      ctx.beginPath();
      ctx.moveTo(-18, 40);
      ctx.lineTo(-18 - (isRunning ? 40 : 0) + legMove, 80);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(18, 40);
      ctx.lineTo(18 - (isRunning ? 40 : 0) - legMove, 80);
      ctx.stroke();

      // Leg wraps
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(10, 60); ctx.lineTo(26, 60);
      ctx.stroke();
      ctx.fillStyle = '#212121';
      ctx.beginPath(); ctx.roundRect(18, 55, 12, 12, 2); ctx.fill();

      // Torso
      ctx.fillStyle = '#FF9800';
      ctx.beginPath(); ctx.roundRect(-30, -20, 60, 60, 10); ctx.fill();
      ctx.fillStyle = '#212121';
      ctx.beginPath(); ctx.roundRect(-30, -20, 15, 60, [10, 0, 0, 10]); ctx.fill();
      ctx.beginPath(); ctx.roundRect(15, -20, 15, 60, [0, 10, 10, 0]); ctx.fill();

      // Arms
      ctx.strokeStyle = '#ffe0bd';
      ctx.lineWidth = 10;

      if (isRunning) {
        // Ninja run — arms trail behind
        ctx.beginPath();
        ctx.moveTo(-25, -5); ctx.lineTo(-90, 10);
        ctx.stroke();
        drawBurger(-110, 20, 1.0);

        ctx.beginPath();
        ctx.moveTo(25, -5); ctx.lineTo(-80, -5);
        ctx.stroke();
      } else {
        // Standing
        ctx.beginPath();
        ctx.moveTo(-30, -5); ctx.quadraticCurveTo(-70, 0, -80, -20);
        ctx.stroke();
        drawBurger(-90, -40, 1.2);

        const armLift = Math.sin(frame * 0.1) * 15;
        ctx.beginPath();
        ctx.moveTo(30, -5); ctx.lineTo(75, -10 - armLift);
        ctx.stroke();
      }

      // Camera
      ctx.save();
      if (isRunning) {
        ctx.translate(-100, -10);
      } else {
        const armLift = Math.sin(frame * 0.1) * 15;
        ctx.translate(95, -15 - armLift);
      }
      ctx.rotate(0.1 + Math.sin(frame * 0.15) * 0.2);

      const camGrad = ctx.createLinearGradient(-25, -20, 25, 20);
      camGrad.addColorStop(0, '#444');
      camGrad.addColorStop(1, '#1a1a1a');
      ctx.fillStyle = camGrad;
      drawRoundedRect(-25, -18, 55, 36, 6); ctx.fill();

      ctx.fillStyle = '#222';
      drawRoundedRect(-5, -24, 25, 10, 3); ctx.fill();

      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(10, 2, 15, 0, Math.PI * 2); ctx.fill();

      // Flash unit
      ctx.fillStyle = '#555';
      ctx.fillRect(10, -22, 15, 6);
      ctx.fillStyle = '#eee';
      ctx.fillRect(11, -21, 13, 4);

      if (frame % 30 < 15) {
        ctx.fillStyle = isRunning ? '#ff0000' : '#00ff00';
        ctx.beginPath(); ctx.arc(-18, -10, 2, 0, Math.PI * 2); ctx.fill();
      }

      // Anime flash
      if (s.flashIntensity > 0) {
        const op = s.flashIntensity;
        ctx.save();
        ctx.translate(18, -18);
        ctx.strokeStyle = `rgba(255, 255, 255, ${op})`;
        ctx.lineWidth = 10 * op;
        ctx.beginPath(); ctx.arc(0, 0, (1 - op) * 800, 0, Math.PI * 2); ctx.stroke();

        ctx.fillStyle = `rgba(255, 255, 255, ${op})`;
        for (let i = 0; i < 20; i++) {
          ctx.save();
          ctx.rotate((i * Math.PI * 2) / 20);
          ctx.beginPath();
          ctx.moveTo(10, -5);
          ctx.lineTo(600 * op, 0);
          ctx.lineTo(10, 5);
          ctx.fill();
          ctx.restore();
        }
        ctx.beginPath();
        ctx.moveTo(0, -300 * op);
        ctx.lineTo(10, 0);
        ctx.lineTo(0, 300 * op);
        ctx.lineTo(-10, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();

      // Head
      ctx.fillStyle = '#ffe0bd';
      ctx.beginPath(); ctx.arc(0, -50, 45, 0, Math.PI * 2); ctx.fill();

      // Hair
      ctx.save();
      ctx.translate(0, -50);
      ctx.fillStyle = '#FFEB3B';
      for (let i = 0; i < 9; i++) {
        ctx.save();
        ctx.rotate(-1.2 + i * 0.3);
        ctx.beginPath();
        ctx.moveTo(-15, -35); ctx.lineTo(0, -65); ctx.lineTo(15, -35);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();

      // Headband
      ctx.fillStyle = '#212121';
      ctx.beginPath(); ctx.roundRect(-46, -75, 92, 18, 2); ctx.fill();

      // Ties
      ctx.strokeStyle = '#212121';
      ctx.lineWidth = 8;
      const tieWobble = Math.sin(frame * 0.2) * 15;
      ctx.beginPath();
      ctx.moveTo(46, -66);
      ctx.bezierCurveTo(70, -66 + tieWobble, 100, -100, 120, -70 + tieWobble);
      ctx.stroke();

      // Metal plate
      ctx.fillStyle = '#BDBDBD';
      ctx.beginPath(); ctx.roundRect(-22, -73, 44, 14, 2); ctx.fill();

      // Whiskers
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 1.5;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath(); ctx.moveTo(-38, -48 + i * 5); ctx.lineTo(-28, -48 + i * 5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(28, -48 + i * 5); ctx.lineTo(38, -48 + i * 5); ctx.stroke();
      }

      // Anime Eyes
      const drawAnimeEye = (ex, ey) => {
        ctx.save();
        ctx.translate(ex, ey);
        ctx.fillStyle = 'black';
        ctx.beginPath(); ctx.ellipse(0, 0, 12, 16, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'white';
        ctx.beginPath(); ctx.ellipse(-4, -6, 5, 7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(5, 5, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      };
      drawAnimeEye(-22, -55);
      drawAnimeEye(22, -55);

      // Smile
      ctx.strokeStyle = 'black'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, -40, 20, 0.2, Math.PI - 0.2); ctx.stroke();

      ctx.restore();
    };

    const drawSpeechBubble = (x, y, text) => {
      ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
      const metrics = ctx.measureText(text);
      const bw = metrics.width + 40;
      ctx.save();
      ctx.shadowBlur = 20; ctx.shadowColor = 'rgba(0,0,0,0.2)';
      ctx.fillStyle = 'white';
      drawRoundedRect(x - bw / 2, y - 340, bw, 50, 15);
      ctx.fill();
      ctx.beginPath(); ctx.moveTo(x, y - 290); ctx.lineTo(x - 10, y - 275); ctx.lineTo(x + 10, y - 290); ctx.fill();
      ctx.fillStyle = '#333'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(text, x, y - 315);
      ctx.restore();
    };

    const animate = () => {
      const s = stateRef.current;
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, width, height);

      if (s.flashIntensity > 0) {
        const fl = Math.pow(s.flashIntensity, 1.5);
        ctx.fillStyle = `rgba(255, 255, 255, ${fl})`;
        ctx.fillRect(0, 0, width, height);
        s.flashIntensity -= 0.04;
      }

      if (s.state === 'running') {
        s.x -= 8;
        s.rotation = Math.sin(s.frame * 0.2) * 0.05;
        if (s.x <= s.targetX) {
          s.state = 'asking';
          s.flashTimer = 40;
        }
      } else {
        s.rotation = Math.sin(s.frame * 0.05) * 0.05;
        drawSpeechBubble(s.x, s.y, "Ninja Speed Burger Foto? Dattebayo! 🍥📸");
        s.flashTimer--;
        if (s.flashTimer <= 0) {
          s.flashIntensity = 1.0;
          s.flashTimer = 150 + Math.random() * 100;
        }
      }

      s.frame++;
      const bounceY = Math.abs(Math.sin(s.frame * 0.3)) * -20;
      drawNaruto(s.x, s.y + bounceY, s.rotation, s.scale, s.frame);

      animRef.current = requestAnimationFrame(animate);
    };

    resize();
    animate();

    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="chibi-naruto-overlay">
      <canvas ref={canvasRef} className="chibi-naruto-canvas" />
      <div className="chibi-naruto-buttons">
        <button className="naruto-btn naruto-btn-yes" onClick={onCapture}>
          {translations.camera_yes[lang] || 'Yes ✨'}
        </button>
        <button className="naruto-btn naruto-btn-no" onClick={onDismiss}>
          {translations.camera_no[lang] || 'No'}
        </button>
      </div>
    </div>
  );
}
