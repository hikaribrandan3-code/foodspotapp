import React, { useRef, useEffect } from 'react';
import './RamenBowl.css';

export default function RamenBowl() {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const stateRef = useRef({
    x: -250,
    y: 0,
    targetX: 0,
    rotation: 0,
    scale: 0.9,
    phase: 'entering',
    frame: 0,
    flashIntensity: 0,
    flashTimer: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const W = 300;
    const H = 350;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr);

    const s = stateRef.current;
    s.y = H * 0.65;
    s.targetX = W / 2;

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

    const drawAnimeEye = (ex, ey) => {
      ctx.save();
      ctx.translate(ex, ey);
      ctx.fillStyle = 'black';
      ctx.beginPath();
      ctx.ellipse(0, 0, 14, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.ellipse(-5, -7, 6, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(6, 6, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-3, 10, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const drawChar = () => {
      const { x, y, rotation, scale, frame, phase } = s;
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

      // Bowl base (red ramen bowl)
      ctx.fillStyle = '#e53935';
      ctx.beginPath();
      ctx.moveTo(-90, -20);
      ctx.lineTo(90, -20);
      ctx.lineTo(60, 60);
      ctx.lineTo(-60, 60);
      ctx.closePath();
      ctx.fill();

      // Bowl rim
      ctx.strokeStyle = '#ffb300';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-90, -20);
      ctx.lineTo(90, -20);
      ctx.stroke();

      // Noodles
      ctx.fillStyle = '#fff176';
      ctx.beginPath();
      ctx.ellipse(0, -25, 85, 25, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#fdd835';
      ctx.lineWidth = 3;
      for (let i = -60; i <= 60; i += 15) {
        ctx.beginPath();
        ctx.moveTo(i, -35);
        ctx.quadraticCurveTo(i + 5, -25, i, -15);
        ctx.stroke();
      }

      // Nori
      ctx.fillStyle = '#1b1b1b';
      drawRoundedRect(-70, -60, 30, 50, 4);
      ctx.fill();

      // Egg
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.ellipse(40, -35, 20, 25, Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffb300';
      ctx.beginPath();
      ctx.ellipse(40, -35, 10, 14, Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();

      // Narutomaki
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(-20, -45, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f06292';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(-20, -45, 10, 0, Math.PI * 1.5);
      ctx.stroke();

      // Anime eyes on bowl body
      drawAnimeEye(-30, 15);
      drawAnimeEye(30, 15);

      // Smile
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 25, 18, 0.2, Math.PI - 0.2);
      ctx.stroke();

      // Pink cheeks
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.arc(-55, 20, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(55, 20, 12, 0, Math.PI * 2);
      ctx.fill();

      // Left arm
      ctx.strokeStyle = '#e53935';
      ctx.lineWidth = 10;
      const armSwing = Math.sin(frame * 0.2) * 0.3;
      ctx.beginPath();
      ctx.moveTo(-80, 10);
      ctx.quadraticCurveTo(-110, 10 + armSwing * 20, -100, 40);
      ctx.stroke();

      // Right arm (camera)
      const armLift = phase === 'asking' ? Math.sin(frame * 0.1) * 15 : 0;
      ctx.beginPath();
      ctx.moveTo(80, 10);
      ctx.lineTo(115, 0 - armLift);
      ctx.stroke();

      // DSLR camera
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
      ctx.beginPath();
      ctx.arc(10, 2, 15, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#555';
      ctx.fillRect(10, -22, 15, 6);
      ctx.fillStyle = '#eee';
      ctx.fillRect(11, -21, 13, 4);

      // Status light
      if (frame % 30 < 15) {
        ctx.fillStyle = phase === 'entering' ? '#ffeb3b' : '#00e676';
        ctx.beginPath();
        ctx.arc(-18, -10, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Anime flash
      if (s.flashIntensity > 0) {
        const op = s.flashIntensity;
        ctx.save();
        ctx.translate(18, -18);
        ctx.strokeStyle = `rgba(255,255,255,${op})`;
        ctx.lineWidth = 12 * op;
        ctx.beginPath();
        ctx.arc(0, 0, (1 - op) * 800, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = `rgba(255,255,255,${op})`;
        for (let i = 0; i < 24; i++) {
          ctx.save();
          ctx.rotate((i * Math.PI * 2) / 24);
          ctx.beginPath();
          ctx.moveTo(10, -4);
          ctx.lineTo(700 * op, 0);
          ctx.lineTo(10, 4);
          ctx.fill();
          ctx.restore();
        }
        ctx.restore();
      }
      ctx.restore(); // camera
      ctx.restore(); // char
    };

    const loop = () => {
      const { width: cw, height: ch } = canvas;
      ctx.clearRect(0, 0, cw / dpr, ch / dpr);

      // Full-screen white flash overlay
      if (s.flashIntensity > 0) {
        const screenFlash = Math.pow(s.flashIntensity, 1.8);
        ctx.fillStyle = `rgba(255,255,255,${screenFlash})`;
        ctx.fillRect(0, 0, W, H);
        s.flashIntensity -= 0.05;
      }

      if (s.phase === 'entering') {
        s.x += (s.targetX - s.x) * 0.03;
        s.rotation = Math.sin(s.frame * 0.15) * 0.1;
        if (Math.abs(s.targetX - s.x) < 2) {
          s.phase = 'asking';
          s.flashTimer = 50;
        }
      } else {
        s.rotation = Math.sin(s.frame * 0.05) * 0.04;
        s.flashTimer--;
        if (s.flashTimer <= 0) {
          s.flashIntensity = 1.0;
          s.flashTimer = 180 + Math.random() * 100;
        }
      }

      s.frame++;
      const bounceY = Math.abs(Math.sin(s.frame * 0.2)) * -12;
      drawChar(s.x, s.y + bounceY, s.rotation, s.scale, s.frame);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="ramen-bowl-wrapper">
      <canvas ref={canvasRef} className="ramen-canvas" />
    </div>
  );
}
