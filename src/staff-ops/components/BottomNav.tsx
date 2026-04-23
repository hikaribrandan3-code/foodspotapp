import { motion } from 'framer-motion';
import { LayoutDashboard, ChefHat, Bike, User, ClipboardList } from 'lucide-react';
import { useOrders } from '@/hooks/useOrders';
import type { TabId } from '@/types';

const tabs: { id: TabId; icon: React.ReactNode; label: string }[] = [
  { id: 'board', icon: <LayoutDashboard size={22} strokeWidth={2.2} />, label: 'Board' },
  { id: 'prep', icon: <ChefHat size={22} strokeWidth={2.2} />, label: 'Prep' },
  { id: 'order', icon: <ClipboardList size={22} strokeWidth={2.2} />, label: 'Order' },
  { id: 'logistics', icon: <Bike size={22} strokeWidth={2.2} />, label: 'Logistics' },
  { id: 'profile', icon: <User size={22} strokeWidth={2.2} />, label: 'Profile' },
];

export default function BottomNav() {
  const { state, setTab } = useOrders();

  return (
    <nav
      className="absolute bottom-0 left-0 right-0 h-[72px] backdrop-blur-xl z-50 flex justify-around items-start pt-3 px-2 transition-colors duration-300"
      style={{ backgroundColor: 'var(--nav-bg)', borderTop: '1px solid var(--nav-border)' }}
    >
      {tabs.map((tab) => {
        const isActive = state.currentTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setTab(tab.id)}
            className="relative flex flex-col items-center gap-1 w-16 h-14 tap-highlight-transparent"
          >
            <div
              className="transition-colors duration-200"
              style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
            >
              {tab.icon}
            </div>
            <span
              className="text-[10px] font-semibold tracking-wide transition-colors duration-200"
              style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
            >
              {tab.label}
            </span>
            {isActive && (
              <motion.div
                layoutId="activeTab"
                className="absolute -top-3 w-8 h-1 bg-blue-500 rounded-full"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
