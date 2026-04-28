import { OrderProvider } from '@/hooks/useOrders'
import { ThemeProvider } from '@/hooks/useTheme'
import { ToastProvider } from '@/components/ToastContainer'
import MobileFrame from '@/components/MobileFrame'
import { LanguageProvider } from './contexts/LanguageContext'

export default function App() {
  return (
    <LanguageProvider>
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
