import { useState, useEffect } from 'react';

export function LoadingScreen() {
  const [dots, setDots] = useState('.');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        const count = (prev.length % 3) + 1;
        return '.'.repeat(count);
      });
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
      <p className="text-lg font-medium text-primary tracking-wide">
        Loading<span className="inline-block w-6 text-left">{dots}</span>
      </p>
    </div>
  );
}
