import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// @ts-ignore — JS modules without type declarations
import BurgerBoy from '../../components/Camera/BurgerBoy';
// @ts-ignore
import PizzaBoy from '../../components/Camera/PizzaBoy';
// @ts-ignore
import TacoBoy from '../../components/Camera/TacoBoy';
// @ts-ignore
import RamenBowl from '../../components/Camera/RamenBowl';
import '../../components/Camera/CameraActivationBanner.css';
import '../../components/Camera/RamenBowl.css';
import type { Order } from '@/types';

const CHARACTERS = ['ramen', 'burger', 'pizza', 'taco'];

function Character({ name }: { name: string }) {
  switch (name) {
    case 'ramen':
      return (
        <div style={{ transform: 'scale(0.6)', transformOrigin: 'center center' }}>
          <RamenBowl />
        </div>
      );
    case 'burger':
      return <BurgerBoy />;
    case 'pizza':
      return <PizzaBoy />;
    case 'taco':
      return <TacoBoy />;
    default:
      return <BurgerBoy />;
  }
}

interface OrderCelebrationProps {
  order: Order;
  onClose: () => void;
}

export default function OrderCelebration({ order, onClose }: OrderCelebrationProps) {
  const [character] = useState(() => CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)]);

  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        key="celebration"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
        style={{ backgroundColor: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.4, y: 80, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.4, y: 80, opacity: 0 }}
          transition={{ type: 'spring', bounce: 0.35, duration: 0.7 }}
          className="flex flex-col items-center gap-3"
        >
          <div style={{ width: 175, height: 204, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Character name={character} />
          </div>

          <h2
            className="text-2xl font-black tracking-tight text-center"
            style={{ color: '#FFF', textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}
          >
            Order Complete! 🎉
          </h2>
          <p
            className="text-sm font-semibold text-center"
            style={{ color: 'rgba(255,255,255,0.85)' }}
          >
            {order.customerName} — {order.orderNumber || order.id.slice(0, 6)}
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
