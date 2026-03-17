import React from 'react';
import { useNavigate } from 'react-router-dom';

const Promos = () => {
  const navigate = useNavigate();

  return (
    <div className="promos-page fixed inset-0 bg-black flex flex-col items-center justify-center text-white p-6 overflow-hidden">
      
      {/* Back Button */}
      <button 
        onClick={() => navigate(-1)}
        className="absolute top-8 left-8 p-2 rounded-full hover:bg-white/10 transition-colors"
        aria-label="Volver"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
      </button>

      {/* Main Content */}
      <div className="flex flex-col items-center animate-fade-in">
        <h1 className="text-6xl md:text-8xl font-[900] tracking-tighter leading-none mb-4 text-center">
          COMING<br />SOON
        </h1>
        
        <div className="w-12 h-[1px] bg-white/30 mb-6"></div>
        
        <p className="text-lg md:text-xl font-medium tracking-wide opacity-80">
          Stay Tuned
        </p>
      </div>

      <style>{`
        .promos-page {
          font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
          user-select: none;
        }

        .animate-fade-in {
          animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        h1 {
          font-stretch: extra-condensed;
        }
      `}</style>
    </div>
  );
};

export default Promos;
