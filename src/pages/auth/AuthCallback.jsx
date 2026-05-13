import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient.js'
import BurgerLoader from '../../components/BurgerLoader.jsx'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('Processing login...')

  useEffect(() => {
    let mounted = true

    const handleCallback = async () => {
      // Supabase automatically exchanges the OAuth code in the URL.
      // We just need to wait for the session to be available.
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        console.error('[AuthCallback] Session error:', error)
        if (mounted) setStatus('Login failed. Please try again.')
        return
      }

      if (session?.user) {
        console.log('[AuthCallback] Session found, redirecting...')
        if (mounted) {
          // Small delay so the user sees the loading state
          setTimeout(() => {
            navigate('/', { replace: true })
          }, 800)
        }
      } else {
        // No session yet — wait for INITIAL_SESSION event
        const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
          if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && newSession?.user) {
            console.log('[AuthCallback] Auth event fired, redirecting...')
            if (mounted) {
              setTimeout(() => {
                navigate('/', { replace: true })
              }, 500)
            }
            listener?.subscription?.unsubscribe()
          }
        })
      }
    }

    handleCallback()
    return () => { mounted = false }
  }, [navigate])

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'var(--canvas-bg, #fff)',
      color: 'var(--canvas-text, #000)'
    }}>
      <div style={{ textAlign: 'center' }}>
        <BurgerLoader />
        <p style={{ marginTop: 16, fontSize: 14, fontWeight: 500 }}>{status}</p>
      </div>
    </div>
  )
}
