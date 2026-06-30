import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const CharacterPreview = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const characters = [
    { id: 'cupcake', name: 'Cupcake', emoji: '🧁' },
    { id: 'cookie', name: 'Cookie', emoji: '🍪' },
    { id: 'coffee', name: 'Coffee', emoji: '☕' },
    { id: 'donut', name: 'Donut', emoji: '🍩' },
    { id: 'mintcupcake', name: 'Mint Cupcake', emoji: '🧁' },
    { id: 'icecream', name: 'Ice Cream', emoji: '🍦' },
    { id: 'avocado', name: 'Avocado', emoji: '🥑' },
    { id: 'strawberry', name: 'Strawberry', emoji: '🍓' },
    { id: 'watermelon', name: 'Watermelon', emoji: '🍉' },
    { id: 'tennis', name: 'Tennis', emoji: '🎾' },
    { id: 'lollipop', name: 'Lollipop', emoji: '🍭' },
    { id: 'ugc1', name: 'UGC 1', emoji: '👨‍🍳' },
    { id: 'ugc2', name: 'UGC 2', emoji: '👨‍🍳' },
    { id: 'ugc3', name: 'UGC 3', emoji: '👨‍🍳' },
    { id: 'ugc4', name: 'UGC 4', emoji: '👨‍🍳' },
    { id: 'ugc5', name: 'UGC 5', emoji: '👨‍🍳' },
    { id: 'ugc6', name: 'UGC 6', emoji: '👨‍🍳' },
    { id: 'ugc7', name: 'UGC 7', emoji: '👨‍🍳' },
    { id: 'ugc8', name: 'UGC 8', emoji: '👨‍🍳' },
    { id: 'ugc9', name: 'UGC 9', emoji: '👨‍🍳' },
    { id: 'ugc10', name: 'UGC 10', emoji: '👨‍🍳' },
    { id: 'ugc11', name: 'UGC 11', emoji: '👨‍🍳' },
  ];

  const current = characters[currentIndex];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + characters.length) % characters.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % characters.length);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      {/* Fake Receipt */}
      <div style={{
        background: 'linear-gradient(135deg, #fffbf7 0%, #fef5f0 100%)',
        border: '2px solid #d1c4b8',
        borderRadius: '12px',
        padding: '30px 20px',
        textAlign: 'center',
        minHeight: '400px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '20px',
        marginBottom: '30px',
      }}>
        {/* Character */}
        <div style={{ fontSize: '120px' }}>{current.emoji}</div>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937' }}>{current.name}</div>
      </div>

      {/* Navigation */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '20px',
        alignItems: 'center',
      }}>
        <button
          onClick={handlePrev}
          style={{
            background: '#ec4899',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 16px',
            cursor: 'pointer',
            fontSize: '20px',
          }}
        >
          ← Previous
        </button>

        <div style={{ fontSize: '14px', fontWeight: 'bold', minWidth: '60px', textAlign: 'center' }}>
          {currentIndex + 1} / {characters.length}
        </div>

        <button
          onClick={handleNext}
          style={{
            background: '#ec4899',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 16px',
            cursor: 'pointer',
            fontSize: '20px',
          }}
        >
          Next →
        </button>
      </div>
    </div>
  );
};

export default CharacterPreview;
