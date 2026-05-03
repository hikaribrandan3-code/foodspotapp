import React, { useRef, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { translations } from '../../utils/translations';
import './BurgerChar.css';

export default function BurgerChar({ onCapture, onDismiss }) {
  const { lang } = useLanguage();
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const stateRef = useRef({
    frame: 0,
    flashIntensity: 0,
    flashTimer: 0,
    state: 'entering',
    x: -250,
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
      stateRef.current.y = rect.height * 0.65;
      if (stateRef.current.state === 'entering') {
        stateRef.current.x = -250;
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

    const drawBurgerChar = (x, y, rotation, scale, frame) => {
      const s = stateRef.current;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.scale(scale, scale);

      // Legs
      const legMove = Math.sin(frame * 0.3) * 15;
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#5D4037';

      ctx.beginPath();
      ctx.moveTo(-25, 40);
      ctx.lineTo(-25 + Math.min(0, legMove), 80 + Math.abs(legMove / 2));
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(25, 40);
      ctx.lineTo(25 + Math.max(0, -legMove), 80 + Math.abs(legMove / 2));
      ctx.stroke();

      // Bottom Bun
      ctx.fillStyle = '#E69F52';
      drawRoundedRect(-80, 20, 160, 30, [5, 5, 20, 20]);
      ctx.fill();

      // Lettuce
      ctx.fillStyle = '#4CAF50';
      ctx.beginPath();
      ctx.moveTo(-85, 20);
      for (let i = -85; i <= 85; i += 10) {
        const wave = Math.sin(i * 0.4 + frame * 0.1) * 4;
        ctx.lineTo(i, 15 + wave);
      }
      ctx.lineTo(88, 25);
      ctx.lineTo(-88, 25);
      ctx.closePath();
      ctx.fill();

      // Patty
      ctx.fillStyle = '#5D4037';
      drawRoundedRect(-82, 0, 164, 25, 10);
      ctx.fill();

      // Cheese
      ctx.fillStyle = '#FFD54F';
      ctx.beginPath();
      ctx.moveTo(-80, 0);
      ctx.lineTo(80, 0);
      ctx.lineTo(70, 15);
      ctx.lineTo(-70, 15);
      ctx.closePath();
      ctx.fill();

      // Tomatoes
      ctx.fillStyle = '#E53935';
      ctx.beginPath(); ctx.roundRect(-65, -10, 55, 12, 5); ctx.fill();
      ctx.beginPath(); ctx.roundRect(10, -10, 55, 12, 5); ctx.fill();

      // Top Bun
      ctx.fillStyle = '#E69F52';
      ctx.beginPath();
      ctx.ellipse(0, -10, 85, 60, 0, Math.PI, 0);
      ctx.fill();

      // Sesame Seeds (sprinkles)
      ctx.fillStyle = '#FFF9C4';
      const seedCount = 18;
      for (let i = 0; i < seedCount; i++) {
        const sx = -60 + (i % 6) * 24;
        const sy = -35 - (i > 5 ? (i > 11 ? 25 : 15) : 0);
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(i);
        ctx.beginPath();
        ctx.ellipse(0, 0, 2.5, 1.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Face (Anime Eyes)
      const drawAnimeEye = (ex, ey) => {
        ctx.save();
        ctx.translate(ex, ey);
        ctx.fillStyle = 'black';
        ctx.beginPath(); ctx.ellipse(0, 0, 14, 18, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'white';
        ctx.beginPath(); ctx.ellipse(-5, -7, 6, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(6, 6, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(-3, 10, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      };
      drawAnimeEye(-30, -25);
      drawAnimeEye(30, -25);

      // Big Smile
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, -12, 18, 0.2, Math.PI - 0.2);
      ctx.stroke();

      // Pink Cheeks
      ctx.fillStyle = 'rgba(255, 138, 128, 0.4)';
      ctx.beginPath(); ctx.arc(-55, -15, 12, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(55, -15, 12, 0, Math.PI * 2); ctx.fill();

      // Arms
      ctx.strokeStyle = '#5D4037';
      ctx.lineWidth = 10;

      // Left Arm
      const armSwing = Math.sin(frame * 0.2) * 0.3;
      ctx.beginPath();
      ctx.moveTo(-80, 10);
      ctx.quadraticCurveTo(-110, 10 + armSwing * 20, -100, 40);
      ctx.stroke();

      // Right Arm (Camera)
      const armLift = (s.state === 'asking') ? Math.sin(frame * 0.1) * 15 : 0;
      ctx.beginPath();
      ctx.moveTo(80, 10);
      ctx.lineTo(115, 0 - armLift);
      ctx.stroke();

      // Camera
      ctx.save();
      ctx.translate(130, -5 - armLift);
      ctx.rotate(0.1 + Math.sin(frame * 0.15) * 0.2);

      const camGrad = ctx.createLinearGradient(-25, -20, 25, 20);
      camGrad.addColorStop(0, '#444');
      camGrad.addColorStop(1, '#1a1a1a');
      ctx.fillStyle = camGrad;
      drawRoundedRect(-25, -18, 55, 36, 6);
      ctx.fill();

      ctx.fillStyle = '#222';
      drawRoundedRect(-5, -24, 25, 10, 3);
      ctx.fill();

      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(10, 2, 15, 0, Math.PI * 2); ctx.fill();

      // Flash Housing
      ctx.fillStyle = '#555';
      ctx.fillRect(10, -22, 15, 6);
      ctx.fillStyle = '#eee';
      ctx.fillRect(11, -21, 13, 4);

      // Status Light
      if (frame % 30 < 15) {
        ctx.fillStyle = (s.state === 'entering') ? '#ffeb3b' : '#00e676';
        ctx.beginPath(); ctx.arc(-18, -10, 2, 0, Math.PI * 2); ctx.fill();
      }

      // Big Anime Flash
      if (s.flashIntensity > 0) {
        const op = s.flashIntensity;
        ctx.save();
        ctx.translate(18, -18);

        // Shockwave
        ctx.strokeStyle = `rgba(255, 255, 255, ${op})`;
        ctx.lineWidth = 12 * op;
        ctx.beginPath(); ctx.arc(0, 0, (1 - op) * 800, 0, Math.PI * 2); ctx.stroke();

        // Explosive Rays
        ctx.fillStyle = `rgba(255, 255, 255, ${op})`;
        for (let i = 0; i < 24; i++) {
          ctx.save();
          ctx.rotate((i * Math.PI * 2) / 24);
          ctx.beginPath();
          ctx.moveTo(10, -4); ctx.lineTo(700 * op, 0); ctx.lineTo(10, 4);
          ctx.fill();
          ctx.restore();
        }
        ctx.restore();
      }
      ctx.restore();

      ctx.restore();
    };

    const drawSpeechBubble = (x, y, text) => {
      ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
      const metrics = ctx.measureText(text);
      const bw = metrics.width + 40;
      ctx.save();
      ctx.shadowBlur = 20; ctx.shadowColor = 'rgba(0,0,0,0.1)';
      ctx.fillStyle = 'white';
      drawRoundedRect(x - bw / 2, y - 240, bw, 50, 15);
      ctx.fill();
      ctx.beginPath(); ctx.moveTo(x, y - 190); ctx.lineTo(x - 10, y - 175); ctx.lineTo(x + 10, y - 190); ctx.fill();
      ctx.fillStyle = '#333'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(text, x, y - 215);
      ctx.restore();
    };

    const animate = () => {
      const s = stateRef.current;
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, width, height);

      if (s.flashIntensity > 0) {
        const fl = Math.pow(s.flashIntensity, 1.8);
        ctx.fillStyle = `rgba(255, 255, 255, ${fl})`;
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
        s.rotation = Math.sin(s.frame * 0.05) * 0.04;
        drawSpeechBubble(s.x, s.y, "Burger time! Want to take a foto? 🍔📸");
        s.flashTimer--;
        if (s.flashTimer <= 0) {
          s.flashIntensity = 1.0;
          s.flashTimer = 180 + Math.random() * 100;
        }
      }

      s.frame++;
      const bounceY = Math.abs(Math.sin(s.frame * 0.2)) * -12;
      drawBurgerChar(s.x, s.y + bounceY, s.rotation, s.scale, s.frame);

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
    <div className="burger-char-overlay">
      <canvas ref={canvasRef} className="burger-char-canvas" />
      <div className="burger-char-buttons">
        <button className="burger-btn burger-btn-yes" onClick={onCapture}>
          {translations.camera_yes[lang] || 'Yes ✨'}
        </button>
        <button className="burger-btn burger-btn-no" onClick={onDismiss}>
          {translations.camera_no[lang] || 'No'}
        </button>
      </div>
    </div>
  );
}
