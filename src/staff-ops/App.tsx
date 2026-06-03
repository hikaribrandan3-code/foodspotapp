import { OrderProvider } from '@/hooks/useOrders'
import { ThemeProvider } from '@/hooks/useTheme'
import { ToastProvider } from '@/components/ToastContainer'
import MobileFrame from '@/components/MobileFrame'
import { LanguageProvider } from './contexts/LanguageContext'
import { useBusiness } from './contexts/BusinessContext'

function AppContent() {
  const { businessId } = useBusiness();

  return (
    <LanguageProvider businessId={businessId}>
      <ThemeProvider>
        <ToastProvider>
          <OrderProvider>
            <MobileFrame />
          </OrderProvider>
        </ToastProvider>
      </ThemeProvider>
    </LanguageProvider>
  )
}

export default function App() {
  return <AppContent />
}
