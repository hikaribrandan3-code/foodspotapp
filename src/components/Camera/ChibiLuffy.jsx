import React, { useRef, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { translations } from '../../utils/translations';
import './ChibiLuffy.css';

export default function ChibiLuffy({ onCapture, onDismiss }) {
  const { lang } = useLanguage();
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const stateRef = useRef({
    frame: 0,
    flashIntensity: 0,
    flashTimer: 50,
    state: 'entering',
    x: -200,
    targetX: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      stateRef.current.targetX = rect.width / 2;
      stateRef.current.y = rect.height / 2 + 50;
    };

    const drawBurger = (x, y, scale) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);

      // Bottom Bun
      ctx.fillStyle = '#E69F52';
      ctx.beginPath();
      ctx.roundRect(-30, 10, 60, 15, [2, 2, 8, 8]);
      ctx.fill();

      // Lettuce
      ctx.fillStyle = '#4CAF50';
      ctx.beginPath();
      ctx.roundRect(-32, 5, 64, 6, 3);
      ctx.fill();

      // Patty
      ctx.fillStyle = '#5D4037';
      ctx.beginPath();
      ctx.roundRect(-31, -2, 62, 10, 4);
      ctx.fill();

      // Cheese
      ctx.fillStyle = '#FFD54F';
      ctx.beginPath();
      ctx.moveTo(-30, -2); ctx.lineTo(30, -2); ctx.lineTo(25, 5); ctx.lineTo(-25, 5);
      ctx.closePath();
      ctx.fill();

      // Tomato
      ctx.fillStyle = '#E53935';
      ctx.beginPath();
      ctx.roundRect(-25, -6, 50, 5, 2);
      ctx.fill();

      // Top Bun
      ctx.fillStyle = '#E69F52';
      ctx.beginPath();
      ctx.ellipse(0, -10, 32, 22, 0, Math.PI, 0);
      ctx.fill();

      // Sesame Seeds
      ctx.fillStyle = '#FFF9C4';
      const seedCount = 14;
      for (let i = 0; i < seedCount; i++) {
        const angle = (i / seedCount) * Math.PI - Math.PI;
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

    const drawLuffy = (x, y, rotation, scale, frame) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.scale(scale, scale);

      // Legs (Chibi Waddle)
      const legMove = Math.sin(frame * 0.3) * 15;
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#ffe0bd';

      ctx.beginPath();
      ctx.moveTo(-20, 40);
      ctx.lineTo(-20 + Math.min(0, legMove), 80 + Math.abs(legMove / 2));
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(20, 40);
      ctx.lineTo(20 + Math.max(0, -legMove), 80 + Math.abs(legMove / 2));
      ctx.stroke();

      // Shorts
      ctx.fillStyle = '#1976D2';
      ctx.beginPath();
      ctx.roundRect(-30, 30, 60, 20, 5);
      ctx.fill();

      // Body
      ctx.fillStyle = '#E53935';
      ctx.beginPath();
      ctx.roundRect(-30, -20, 60, 55, 10);
      ctx.fill();

      ctx.fillStyle = '#ffe0bd';
      ctx.beginPath();
      ctx.moveTo(-5, -20); ctx.lineTo(5, -20); ctx.lineTo(0, 20); ctx.closePath();
      ctx.fill();

      // Arms
      ctx.strokeStyle = '#ffe0bd';
      ctx.lineWidth = 10;

      // Left Arm (Burger)
      ctx.beginPath();
      ctx.moveTo(-30, -5); ctx.quadraticCurveTo(-70, 0, -80, -20);
      ctx.stroke();
      drawBurger(-90, -40, 1.2);

      // Right Arm (Camera)
      const armLift = (stateRef.current.state === 'asking') ? Math.sin(frame * 0.1) * 15 : 0;
      ctx.beginPath();
      ctx.moveTo(30, -5); ctx.lineTo(70, -10 - armLift);
      ctx.stroke();

      // Camera
      ctx.save();
      ctx.translate(90, -15 - armLift);
      ctx.rotate(0.1 + Math.sin(frame * 0.15) * 0.2);

      const camGrad = ctx.createLinearGradient(-25, -20, 25, 20);
      camGrad.addColorStop(0, '#444');
      camGrad.addColorStop(1, '#1a1a1a');
      ctx.fillStyle = camGrad;
      ctx.beginPath(); ctx.roundRect(-25, -18, 55, 36, 6); ctx.fill();

      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.roundRect(-5, -24, 25, 10, 3); ctx.fill();

      ctx.fillStyle = '#555';
      ctx.beginPath(); ctx.roundRect(-15, -22, 10, 6, 2); ctx.fill();
      ctx.fillStyle = '#999';
      ctx.beginPath(); ctx.roundRect(-13, -24, 6, 4, 1); ctx.fill();

      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(10, 2, 15, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.stroke();

      const lensGrad = ctx.createRadialGradient(10, 2, 2, 10, 2, 12);
      lensGrad.addColorStop(0, '#112233');
      lensGrad.addColorStop(0.7, '#000');
      lensGrad.addColorStop(1, '#444');
      ctx.fillStyle = lensGrad;
      ctx.beginPath(); ctx.arc(10, 2, 11, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.ellipse(7, -1, 5, 2, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();

      if (frame % 60 < 30) {
        ctx.fillStyle = '#ff0000';
        ctx.beginPath(); ctx.arc(22, -10, 2, 0, Math.PI * 2); ctx.fill();
      }

      // Flash
      if (stateRef.current.flashIntensity > 0) {
        const op = stateRef.current.flashIntensity;
        ctx.save();
        ctx.translate(10, 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${op})`;
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(0, 0, (1 - op) * 500, 0, Math.PI * 2); ctx.stroke();

        ctx.fillStyle = `rgba(255, 255, 255, ${op})`;
        for (let i = 0; i < 16; i++) {
          ctx.save();
          ctx.rotate((i * Math.PI * 2) / 16);
          ctx.beginPath();
          ctx.moveTo(10, -2);
          ctx.lineTo(400 * op, 0);
          ctx.lineTo(10, 2);
          ctx.fill();
          ctx.restore();
        }
        ctx.restore();
      }
      ctx.restore();

      // Head (Chibi)
      ctx.fillStyle = '#ffe0bd';
      ctx.beginPath(); ctx.arc(0, -50, 45, 0, Math.PI * 2); ctx.fill();

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

      // Grin
      ctx.strokeStyle = 'black'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, -40, 20, 0.2, Math.PI - 0.2); ctx.stroke();

      // Straw Hat
      ctx.fillStyle = '#fbc02d';
      ctx.beginPath(); ctx.ellipse(0, -85, 80, 25, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#d32f2f'; ctx.fillRect(-45, -105, 90, 15);
      ctx.fillStyle = '#fbc02d';
      ctx.beginPath(); ctx.arc(0, -100, 45, Math.PI, 0); ctx.fill();

      ctx.restore();
    };

    const drawSpeechBubble = (x, y, text) => {
      ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
      const metrics = ctx.measureText(text);
      const bw = metrics.width + 40;
      ctx.save();
      ctx.shadowBlur = 10; ctx.shadowColor = 'rgba(0,0,0,0.1)';
      ctx.fillStyle = 'white';
      ctx.beginPath(); ctx.roundRect(x - bw / 2, y - 280, bw, 50, 15); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x, y - 230); ctx.lineTo(x - 10, y - 215); ctx.lineTo(x + 10, y - 230); ctx.fill();
      ctx.fillStyle = '#333'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(text, x, y - 255);
      ctx.restore();
    };

    const animate = () => {
      const s = stateRef.current;
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (s.flashIntensity > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.pow(s.flashIntensity, 2)})`;
        ctx.fillRect(0, 0, width, height);
        s.flashIntensity -= 0.05;
      }

      if (s.state === 'entering') {
        s.x += (s.targetX - s.x) * 0.03;
        s.rotation = Math.sin(s.frame * 0.15) * 0.1;
        if (Math.abs(s.targetX - s.x) < 2) {
          s.state = 'asking';
          s.flashTimer = 50;
        }
      } else {
        s.rotation = Math.sin(s.frame * 0.05) * 0.05;
        drawSpeechBubble(s.x, s.y, "Meat Burger Foto? 🍖📸");
        s.flashTimer--;
        if (s.flashTimer <= 0) {
          s.flashIntensity = 1.0;
          s.flashTimer = 180 + Math.random() * 100;
        }
      }

      s.frame++;
      const bounceY = Math.abs(Math.sin(s.frame * 0.2)) * -10;
      drawLuffy(s.x, s.y + bounceY, s.rotation, 0.9, s.frame);

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
    <div className="chibi-luffy-overlay">
      <canvas ref={canvasRef} className="chibi-luffy-canvas" />
      <div className="chibi-luffy-buttons">
        <button className="luffy-btn luffy-btn-yes" onClick={onCapture}>
          {translations.camera_yes[lang] || 'Yes ✨'}
        </button>
        <button className="luffy-btn luffy-btn-no" onClick={onDismiss}>
          {translations.camera_no[lang] || 'No'}
        </button>
      </div>
    </div>
  );
}
