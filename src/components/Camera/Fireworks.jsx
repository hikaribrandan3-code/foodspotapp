import React, { useEffect, useRef } from 'react';

export default function Fireworks({ trigger = false }) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationRef = useRef(null);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    if (!trigger || isPlayingRef.current) return;
    isPlayingRef.current = true;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const colors = [
      'hsl(0, 100%, 50%)',     // red
      'hsl(45, 100%, 50%)',    // yellow
      'hsl(120, 100%, 50%)',   // green
      'hsl(240, 100%, 50%)',   // blue
      'hsl(280, 100%, 50%)',   // purple
      'hsl(340, 100%, 60%)',   // pink
    ];

    const createParticles = () => {
      const centerX = width / 2;
      const centerY = height / 2;
      const particleCount = 80;

      for (let i = 0; i < particleCount; i++) {
        const angle = (Math.random() * Math.PI * 2);
        const velocity = 4 + Math.random() * 6;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const size = Math.random() * 4 + 2;

        particlesRef.current.push({
          x: centerX,
          y: centerY,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity,
          gravity: 0.15,
          color,
          size,
          alpha: 1,
          life: 1500, // 1.5 seconds in ms
          maxLife: 1500,
        });
      }
    };

    const updateParticles = (deltaTime) => {
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);

      particlesRef.current.forEach(p => {
        // Physics
        p.vy += p.gravity;
        p.x += p.vx;
        p.y += p.vy;

        // Bounce off nav bar (assume nav is ~60px from bottom)
        const navBarY = height - 60;
        if (p.y > navBarY && p.vy > 0) {
          p.vy *= -0.5; // Bounce with energy loss
          p.y = navBarY;
        }

        // Fade out
        p.life -= deltaTime;
        p.alpha = Math.max(0, p.life / p.maxLife);
      });
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      particlesRef.current.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    };

    const animate = (now) => {
      if (!isPlayingRef.current) return;

      const deltaTime = 16; // Approximate 60fps
      updateParticles(deltaTime);
      draw();

      if (particlesRef.current.length > 0) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        isPlayingRef.current = false;
      }
    };

    createParticles();
    animationRef.current = requestAnimationFrame(animate);

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [trigger]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 10000,
      }}
    />
  );
}
