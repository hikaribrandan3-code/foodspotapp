import { OrderProvider } from '@/hooks/useOrders'
import { ThemeProvider } from '@/hooks/useTheme'
import { ToastProvider } from '@/components/ToastContainer'
import MobileFrame from '@/components/MobileFrame'

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <OrderProvider>
          <MobileFrame />
        </OrderProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}
