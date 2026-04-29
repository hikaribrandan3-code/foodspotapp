import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, ChefHat, Bike, User, ClipboardList } from 'lucide-react';
import { useOrders } from '@/hooks/useOrders';
import type { TabId } from '@/types';
import BoardView from '@/views/BoardView';
import PrepView from '@/views/PrepView';
import LogisticsView from '@/views/LogisticsView';
import ProfileView from '@/views/ProfileView';
import OrderView from '@/views/OrderView';
import BottomNav from '@/components/BottomNav';
import OrderDetailDrawer from '@/components/OrderDetailDrawer';
import { useLanguage } from '@/contexts/LanguageContext';

const pageVariants = {
  enter: { opacity: 0, y: 8 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};



function DesktopSidebar() {
  const { state, setTab } = useOrders();
  const { t } = useLanguage();

  const sidebarTabs: { id: TabId; icon: React.ReactNode; label: string }[] = [
    { id: 'board', icon: <LayoutDashboard size={20} strokeWidth={2.2} />, label: t('board_title') },
    { id: 'prep', icon: <ChefHat size={20} strokeWidth={2.2} />, label: t('kitchen') },
    { id: 'order', icon: <ClipboardList size={20} strokeWidth={2.2} />, label: t('take_order') },
    { id: 'logistics', icon: <Bike size={20} strokeWidth={2.2} />, label: t('logistics_title') },
    { id: 'profile', icon: <User size={20} strokeWidth={2.2} />, label: t('profile_title') },
  ];
  return (
    <aside
      className="hidden md:flex flex-col w-56 shrink-0 h-full border-r transition-colors duration-300"
      style={{ backgroundColor: 'var(--nav-bg)', borderColor: 'var(--nav-border)' }}
    >
      <div className="px-5 py-6 border-b" style={{ borderColor: 'var(--nav-border)' }}>
        <p className="text-xs font-bold tracking-widest mb-2" style={{ color: 'var(--text-primary)' }}>FOODSPOT</p>
        <p className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>{t('staff_ops')}</p>
      </div>
      <nav className="flex-1 py-4 space-y-1 px-3">
        {sidebarTabs.map((tab) => {
          const isActive = state.currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150"
              style={{
                backgroundColor: isActive ? 'var(--filter-active-bg)' : 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

export default function MobileFrame() {
  const { state } = useOrders();

  const renderView = () => {
    switch (state.currentTab) {
      case 'board': return <BoardView />;
      case 'prep': return <PrepView />;
      case 'order': return <OrderView />;
      case 'logistics': return <LogisticsView />;
      case 'profile': return <ProfileView />;
      default: return <BoardView />;
    }
  };

  return (
    <div
      className="w-full h-[100dvh] flex flex-row transition-colors duration-300"
      style={{ backgroundColor: 'var(--app-bg)' }}
    >
      {/* Desktop sidebar nav — hidden on mobile */}
      <DesktopSidebar />

      {/* Main content */}
      <div className="relative flex-1 overflow-hidden" style={{ backgroundColor: 'var(--app-frame)' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={state.currentTab}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute inset-0 overflow-hidden"
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>

        {/* Mobile-only bottom nav */}
        <div className="md:hidden">
          <BottomNav />
        </div>

        <OrderDetailDrawer />
      </div>
    </div>
  );
}
