import { useState, useEffect } from 'react';

export default function EventCountdown({ startDate, className = "" }) {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    const target = new Date(startDate).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const distance = target - now;

      if (distance < 0) {
        setTimeLeft(null);
        return;
      }

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);

    return () => clearInterval(interval);
  }, [startDate]);

  if (!timeLeft) return null;

  const { days, hours, minutes } = timeLeft;

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div className="bg-[#ff6b35] text-white px-2 py-1 rounded-lg shadow-sm flex flex-col items-center min-w-[32px]">
        <span className="text-[10px] font-black leading-none">{days}</span>
        <span className="text-[6px] font-bold uppercase opacity-80">Days</span>
      </div>
      <span className="text-[#ff6b35] font-black">:</span>
      <div className="bg-[#ff6b35] text-white px-2 py-1 rounded-lg shadow-sm flex flex-col items-center min-w-[32px]">
        <span className="text-[10px] font-black leading-none">{hours}</span>
        <span className="text-[6px] font-bold uppercase opacity-80">Hrs</span>
      </div>
      <span className="text-[#ff6b35] font-black">:</span>
      <div className="bg-[#ff6b35] text-white px-2 py-1 rounded-lg shadow-sm flex flex-col items-center min-w-[32px]">
        <span className="text-[10px] font-black leading-none">{minutes}</span>
        <span className="text-[6px] font-bold uppercase opacity-80">Min</span>
      </div>
    </div>
  );
}
