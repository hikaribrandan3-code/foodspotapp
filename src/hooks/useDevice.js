import { useState, useEffect } from 'react'

export function useDevice() {
  const [device, setDevice] = useState(null)

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      
      // Mobile: < 768px OR mobile user agent on small screen
      // Tablet/Desktop: >= 768px OR large screen
      if (width < 768 || (isMobileUA && width < 1024)) {
        return 'mobile'
      }
      return 'tablet'
    }

    setDevice(checkDevice())
    const handleResize = () => setDevice(checkDevice())
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return device
}
