import { motion } from 'framer-motion';
import { LayoutDashboard, ChefHat, ClipboardList, Bike, Package, Ticket } from 'lucide-react';
import { useOrders } from '@/hooks/useOrders';
import type { TabId } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';

function getStaffRole(): string {
  try {
    return (JSON.parse(localStorage.getItem('fs_staff_member') || '{}').role || '').toLowerCase()
  } catch { return '' }
}

export default function BottomNav() {
  const { state, setTab } = useOrders();
  const { t } = useLanguage();
  const role = getStaffRole();
  const isManager = role === 'manager' || role === 'admin';

  const tabs: { id: TabId; icon: React.ReactNode; labelKey: string; label?: string }[] = [
    { id: 'board', icon: <LayoutDashboard size={22} strokeWidth={2.2} />, labelKey: 'board_title' },
    { id: 'prep', icon: <ChefHat size={22} strokeWidth={2.2} />, labelKey: 'kitchen' },
    { id: 'order', icon: <ClipboardList size={22} strokeWidth={2.2} />, labelKey: 'take_order' },
    { id: 'logistics', icon: <Bike size={22} strokeWidth={2.2} />, labelKey: 'logistics_title' },
    ...(isManager
      ? [{ id: 'events' as TabId, icon: <Ticket size={22} strokeWidth={2.2} />, labelKey: '', label: 'Eventos' }]
      : [{ id: 'inventory' as TabId, icon: <Package size={22} strokeWidth={2.2} />, labelKey: 'inventory_title' }]
    ),
  ];

  return (
    <nav
      className="absolute bottom-0 left-0 right-0 h-[72px] backdrop-blur-xl z-50 flex justify-around items-start pt-3 px-2 transition-colors duration-300"
      style={{ backgroundColor: 'var(--nav-bg)', borderTop: '1px solid var(--nav-border)' }}
    >
      {tabs.map((tab) => {
        const isActive = state.currentTab === tab.id;
        const label = tab.label || t(tab.labelKey);
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
              {label}
            </span>
            {isActive && (
              <motion.div
                layoutId="activeTab"
                className="absolute -top-3 w-8 h-1 bg-emerald-600 rounded-full"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
