import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useLanguage } from '../contexts/LanguageContext'

export default function TabletStaffApp() {
  const { t } = useLanguage()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  useEffect(() => {
    // Check if already logged in
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
      setLoading(false)
    }
    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
    })

    return () => subscription?.unsubscribe()
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError(null)
    setIsLoggingIn(true)

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) throw signInError
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setEmail('')
    setPassword('')
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F8FAFC' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#1F2937', marginBottom: 16 }}>FoodSpot Staff</div>
          <div style={{ fontSize: 14, color: '#6B7280' }}>Loading...</div>
        </div>
      </div>
    )
  }

  // Logged in — show staff dashboard placeholder
  if (user) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#F8FAFC' }}>
        {/* Header */}
        <div style={{
          background: '#FFF',
          borderBottom: '1px solid #E5E7EB',
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1F2937' }}>FoodSpot Staff</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>{user.email}</div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: '1px solid #E5E7EB',
              background: '#FFF',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              color: '#EF4444',
            }}
          >
            Logout
          </button>
        </div>

        {/* Placeholder Dashboard */}
        <div style={{ flex: 1, padding: '40px 24px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
          <div style={{
            background: '#FFF',
            borderRadius: 16,
            padding: '40px',
            textAlign: 'center',
            boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
            border: '2px dashed #CBD5E1',
          }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>📋</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#1F2937', marginBottom: 8 }}>
              Staff Dashboard Coming Soon
            </div>
            <div style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6, marginBottom: 24 }}>
              Kitchen Display System (KDS), order management, and analytics <br />
              will be available in the next update.
            </div>
            <div style={{
              display: 'flex',
              gap: 12,
              justifyContent: 'center',
              flexWrap: 'wrap',
              fontSize: 12,
              color: '#9CA3AF',
            }}>
              <span style={{ padding: '8px 12px', background: '#F3F4F6', borderRadius: 6 }}>🎯 KDS (In Progress)</span>
              <span style={{ padding: '8px 12px', background: '#F3F4F6', borderRadius: 6 }}>📊 Analytics (Planned)</span>
              <span style={{ padding: '8px 12px', background: '#F3F4F6', borderRadius: 6 }}>⚙️ Settings (Planned)</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Not logged in — show login form
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 420,
        padding: '40px 32px',
        background: '#FFF',
        borderRadius: 16,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Logo/Title */}
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#1F2937', marginBottom: 8 }}>
            FoodSpot
          </div>
          <div style={{ fontSize: 14, color: '#6B7280' }}>Staff Portal</div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin}>
          {error && (
            <div style={{
              padding: '12px 16px',
              borderRadius: 8,
              background: '#FEE2E2',
              color: '#DC2626',
              fontSize: 13,
              marginBottom: 16,
              border: '1px solid #FECACA',
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="staff@restaurant.com"
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 8,
                border: '1px solid #D1D5DB',
                fontSize: 14,
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 8,
                border: '1px solid #D1D5DB',
                fontSize: 14,
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoggingIn}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: 8,
              border: 'none',
              background: '#667eea',
              color: '#FFF',
              fontSize: 14,
              fontWeight: 700,
              cursor: isLoggingIn ? 'not-allowed' : 'pointer',
              opacity: isLoggingIn ? 0.7 : 1,
            }}
          >
            {isLoggingIn ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Footer */}
        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 12, color: '#9CA3AF' }}>
          <div>📞 Need help? Contact support@foodspot.com</div>
        </div>
      </div>
    </div>
  )
}
