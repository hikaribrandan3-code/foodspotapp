import { motion, AnimatePresence } from 'framer-motion';
import { useOrders } from '@/hooks/useOrders';
import BoardView from '@/views/BoardView';
import PrepView from '@/views/PrepView';
import LogisticsView from '@/views/LogisticsView';
import ProfileView from '@/views/ProfileView';
import BottomNav from '@/components/BottomNav';
import OrderDetailDrawer from '@/components/OrderDetailDrawer';

const pageVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? '-100%' : '100%',
    opacity: 0,
  }),
};

const tabOrder: Record<string, number> = {
  board: 0, prep: 1, logistics: 2, profile: 3,
};

export default function MobileFrame() {
  const { state } = useOrders();
  const currentIndex = tabOrder[state.currentTab];

  const getDirection = (tab: string) => {
    return tabOrder[tab] > currentIndex ? 1 : -1;
  };

  const renderView = () => {
    switch (state.currentTab) {
      case 'board': return <BoardView />;
      case 'prep': return <PrepView />;
      case 'logistics': return <LogisticsView />;
      case 'profile': return <ProfileView />;
      default: return <BoardView />;
    }
  };

  return (
    <div className="min-h-screen w-full flex justify-center items-start pt-0 md:pt-8 transition-colors duration-300" style={{ backgroundColor: 'var(--app-bg)' }}>
      <div
        className="w-full max-w-[430px] h-[100dvh] md:h-[850px] relative overflow-hidden shadow-2xl md:rounded-[32px] border-0 md:border-[6px] transition-colors duration-300"
        style={{ backgroundColor: 'var(--app-frame)', borderColor: 'var(--app-frame-border)' }}
      >
        <AnimatePresence mode="wait" custom={getDirection(state.currentTab)}>
          <motion.div
            key={state.currentTab}
            custom={getDirection(state.currentTab)}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30,
            }}
            className="absolute inset-0 overflow-hidden"
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>

        <BottomNav />
        <OrderDetailDrawer />
      </div>
    </div>
  );
}
