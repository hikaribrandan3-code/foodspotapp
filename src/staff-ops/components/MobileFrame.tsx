import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, ChefHat, Bike, User, ClipboardList, Package, CalendarDays, Ticket, X } from 'lucide-react';
import { useOrders } from '@/hooks/useOrders';
import type { TabId } from '@/types';
import BoardView from '@/views/BoardView';
import PrepView from '@/views/PrepView';
import LogisticsView from '@/views/LogisticsView';
import ProfileView from '@/views/ProfileView';
import OrderView from '@/views/OrderView';
import InventoryView from '@/views/InventoryView';
import ReservationsView from '@/views/ReservationsView';
import EventsView from '@/views/EventsView';
import BottomNav from '@/components/BottomNav';
import OrderDetailDrawer from '@/components/OrderDetailDrawer';
import { useLanguage } from '@/contexts/LanguageContext';

function getStaffRole(): string {
  try {
    return (JSON.parse(localStorage.getItem('fs_staff_member') || '{}').role || '').toLowerCase()
  } catch { return '' }
}

const pageVariants = {
  enter: { opacity: 0, y: 8 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};



function DesktopSidebar() {
  const { state, setTab } = useOrders();
  const { t } = useLanguage();
  const role = getStaffRole();
  const isManager = role === 'manager' || role === 'admin';

  const sidebarTabs: { id: TabId; icon: React.ReactNode; label: string }[] = [
    { id: 'board', icon: <LayoutDashboard size={20} strokeWidth={2.2} />, label: t('board_title') },
    { id: 'prep', icon: <ChefHat size={20} strokeWidth={2.2} />, label: t('kitchen') },
    { id: 'order', icon: <ClipboardList size={20} strokeWidth={2.2} />, label: t('take_order') },
    { id: 'logistics', icon: <Bike size={20} strokeWidth={2.2} />, label: t('logistics_title') },
    { id: 'inventory', icon: <Package size={20} strokeWidth={2.2} />, label: t('inventory_title') },
    { id: 'reservations', icon: <CalendarDays size={20} strokeWidth={2.2} />, label: t('reservations_title') },
    ...(isManager ? [{ id: 'events' as TabId, icon: <Ticket size={20} strokeWidth={2.2} />, label: 'Eventos' }] : []),
  ];
  return (
    <aside
      className="hidden md:flex flex-col w-56 shrink-0 h-full border-r transition-colors duration-300"
      style={{ backgroundColor: 'var(--nav-bg)', borderColor: 'var(--nav-border)' }}
    >
      <div className="px-5 py-6 border-b" style={{ borderColor: 'var(--nav-border)' }}>
        <p className="text-xs font-bold tracking-widest mb-2" style={{ color: 'var(--text-primary)' }}>FOODSPOT</p>
        <p className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>{t('staff_ops')}</p>
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
  const [profileOpen, setProfileOpen] = useState(false);

  const renderView = () => {
    switch (state.currentTab) {
      case 'board': return <BoardView />;
      case 'prep': return <PrepView />;
      case 'order': return <OrderView />;
      case 'logistics': return <LogisticsView />;
      case 'inventory': return <InventoryView />;
      case 'reservations': return <ReservationsView />;
      case 'events': return <EventsView />;
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
        {/* Profile icon — hidden on events tab to avoid overlapping event management UI */}
        {state.currentTab !== 'events' && (
          <button
            onClick={() => setProfileOpen(true)}
            className="absolute top-3 right-3 z-40 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
            style={{ backgroundColor: '#EFF6FF', color: '#3B82F6', border: '2px solid #3B82F6' }}
            aria-label="Profile"
          >
            <User size={20} strokeWidth={2.2} />
          </button>
        )}

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

        {/* Profile sheet — slides up from bottom */}
        <AnimatePresence>
          {profileOpen && (
            <>
              <motion.div
                className="absolute inset-0 z-50 bg-black/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setProfileOpen(false)}
              />
              <motion.div
                className="absolute bottom-0 left-0 right-0 z-50 rounded-t-2xl overflow-hidden"
                style={{ backgroundColor: 'var(--app-bg)', maxHeight: '92dvh' }}
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              >
                <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b" style={{ borderColor: 'var(--nav-border)' }}>
                  <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Profile</span>
                  <button onClick={() => setProfileOpen(false)} style={{ color: 'var(--text-tertiary)' }}>
                    <X size={18} />
                  </button>
                </div>
                <div className="overflow-y-auto" style={{ maxHeight: 'calc(92dvh - 56px)' }}>
                  <ProfileView />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
