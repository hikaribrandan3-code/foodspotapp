import { Home, Truck } from 'lucide-react'

export const ReservationIcon = ({ name, size = 16, color = 'currentColor' }) => {
  const icons = {
    plate: '/src/assets/icons/plate.svg',
    cake: '/src/assets/icons/cake.svg',
    delivery: '/src/assets/icons/delivery.svg',
    message: '/src/assets/icons/message.svg',
    done: '/src/assets/icons/done.svg',
  }

  if (name === 'home') return <Home size={size} color={color} />
  if (name === 'truck') return <Truck size={size} color={color} />

  const src = icons[name]
  if (!src) return null

  return <img src={src} alt={name} width={size} height={size} style={{ display: 'inline-block' }} />
}

export default ReservationIcon
