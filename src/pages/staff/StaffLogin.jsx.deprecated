import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient.js'
import { getSession } from '../../utils/auth.js'

function StaffLogin() {
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [checkingSession, setCheckingSession] = useState(true)

    // BYPASS: If already authenticated, skip login UI
    useEffect(() => {
        const checkExistingSession = async () => {
            try {
                const session = await getSession()
                if (session?.authenticated) {
                    if (session.role === 'superadmin') {
                        navigate('/admin', { replace: true })
                    } else if (session.role === 'owner') {
                        navigate('/owner/summary', { replace: true })
                    } else if (session.role === 'staff') {
                        navigate('/staff/dashboard', { replace: true })
                    }
                    return
                }
            } catch {
                // No session, show login form
            }
            setCheckingSession(false)
        }
        checkExistingSession()
    }, [navigate])

    // Show loading while checking session
    if (checkingSession) {
        return (
            <div style={{
                minHeight: '100dvh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'radial-gradient(circle at top left, #e0eaff 0%, #f7f9fb 100%)'
            }}>
                <div style={{
                    width: 32,
                    height: 32,
                    border: '3px solid #e0eaff',
                    borderTopColor: '#0058bc',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        )
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password
            })

            if (authError) throw authError

            const role = data.user?.user_metadata?.role || 'staff'

            if (role === 'superadmin') {
                navigate('/admin')
            } else if (role === 'owner') {
                navigate('/owner/summary')
            } else {
                navigate('/staff/dashboard')
            }
        } catch (err) {
            console.error('Login error:', err)
            setError(err.message || 'Credenciales incorrectas')
            setTimeout(() => setError(''), 5000)
        } finally {
            setLoading(false)
        }
    }

    // ============================
    // PREMIUM LIGHT LOGIN UI
    // ============================
    return (
        <div style={{
            background: 'radial-gradient(circle at top left, #e0eaff 0%, #f7f9fb 100%)',
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: '"Montserrat", sans-serif',
            color: '#191c1e',
            padding: 24,
            position: 'relative'
        }}>
            {/* TopAppBar */}
            <header style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: '100%',
                padding: '16px 24px',
                background: '#ffffff',
                boxShadow: '0 4px 20px rgba(0, 88, 188, 0.05)',
                zIndex: 50
            }}>
                <h1 style={{
                    fontFamily: '"Montserrat", sans-serif',
                    fontWeight: 700,
                    fontSize: 24,
                    letterSpacing: '-0.025em',
                    color: '#0058bc',
                    margin: 0
                }}>FoodSpot Staff</h1>
            </header>

            <main style={{ width: '100%', maxWidth: 448, marginTop: 80, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {/* Auth Card */}
                <div style={{
                    width: '100%',
                    background: '#ffffff',
                    padding: 32,
                    borderRadius: 12,
                    boxShadow: '0 40px 80px -20px rgba(0, 88, 188, 0.08), 0 0 40px rgba(0, 88, 188, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.5)',
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)'
                }}>
                    <h2 style={{ fontSize: 24, fontWeight: 700, color: '#191c1e', marginBottom: 32, textAlign: 'center', margin: '0 0 32px 0' }}>Staff Access</h2>

                    {/* Staff Badge */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '12px',
                        background: '#f2f4f6',
                        borderRadius: 12,
                        marginBottom: 32,
                        border: '1px solid rgba(193, 198, 215, 0.2)'
                    }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#414755', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 20 }}>🪪</span>
                            Authorized Personnel Only
                        </span>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        {/* Email Field */}
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: 12,
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                color: '#414755',
                                marginLeft: 4,
                                marginBottom: 8
                            }}>Email Address</label>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <span style={{ position: 'absolute', left: 16, color: '#414755', fontSize: 20 }}>✉️</span>
                                <input
                                    type="email"
                                    placeholder="staff@foodspot.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoFocus
                                    disabled={loading}
                                    style={{
                                        width: '100%',
                                        padding: '16px 16px 16px 48px',
                                        background: '#f2f4f6',
                                        border: '1px solid rgba(193, 198, 215, 0.15)',
                                        borderRadius: 8,
                                        fontSize: 16,
                                        color: '#191c1e',
                                        outline: 'none',
                                        transition: 'all 0.3s ease',
                                        boxSizing: 'border-box'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.background = '#ffffff'
                                        e.target.style.borderColor = '#0058bc'
                                        e.target.style.boxShadow = '0 0 0 4px rgba(0, 88, 188, 0.1)'
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.background = '#f2f4f6'
                                        e.target.style.borderColor = 'rgba(193, 198, 215, 0.15)'
                                        e.target.style.boxShadow = 'none'
                                    }}
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
                                <label style={{
                                    display: 'block',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    color: '#414755',
                                    marginLeft: 4,
                                    margin: 0
                                }}>Password</label>
                            </div>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <span style={{ position: 'absolute', left: 16, color: '#414755', fontSize: 20 }}>🔒</span>
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                    style={{
                                        width: '100%',
                                        padding: '16px 16px 16px 48px',
                                        background: '#f2f4f6',
                                        border: '1px solid rgba(193, 198, 215, 0.15)',
                                        borderRadius: 8,
                                        fontSize: 16,
                                        color: '#191c1e',
                                        outline: 'none',
                                        transition: 'all 0.3s ease',
                                        boxSizing: 'border-box'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.background = '#ffffff'
                                        e.target.style.borderColor = '#0058bc'
                                        e.target.style.boxShadow = '0 0 0 4px rgba(0, 88, 188, 0.1)'
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.background = '#f2f4f6'
                                        e.target.style.borderColor = 'rgba(193, 198, 215, 0.15)'
                                        e.target.style.boxShadow = 'none'
                                    }}
                                />
                            </div>
                            
                            {/* Error Message */}
                            {error && (
                                <p style={{
                                    color: '#ba1a1a',
                                    textAlign: 'center',
                                    fontSize: 13,
                                    marginTop: 12,
                                    background: 'rgba(186, 26, 26, 0.1)',
                                    padding: '10px 16px',
                                    borderRadius: 12,
                                    border: '1px solid rgba(186, 26, 26, 0.2)'
                                }}>{error}</p>
                            )}
                        </div>

                        {/* Login Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '16px 0',
                                background: loading ? '#e0e3e5' : 'linear-gradient(to right, #0058bc, #0070eb)',
                                color: loading ? '#717786' : '#ffffff',
                                fontWeight: 700,
                                borderRadius: 8,
                                border: 'none',
                                boxShadow: loading ? 'none' : '0 10px 15px -3px rgba(0, 88, 188, 0.25)',
                                cursor: loading ? 'wait' : 'pointer',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                marginTop: 16
                            }}
                            onMouseDown={(e) => !loading && (e.currentTarget.style.transform = 'scale(0.98)')}
                            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            {loading ? 'Verificando...' : 'Login'}
                            {!loading && <span style={{ fontSize: 18 }}>→</span>}
                        </button>
                    </form>
                </div>

                {/* Secondary Action */}
                <a 
                    href="#" 
                    onClick={(e) => { e.preventDefault(); navigate('/'); }}
                    style={{
                        marginTop: 40,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        color: '#414755',
                        fontWeight: 700,
                        textDecoration: 'none',
                        transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#0058bc'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#414755'}
                >
                    <span style={{ fontSize: 18 }}>←</span>
                    Back to Public Portal
                </a>
            </main>

            {/* Footer Semantic Shell */}
            <footer style={{
                position: 'fixed',
                bottom: 0,
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: 16,
                paddingBottom: 32,
                fontFamily: '"Montserrat", sans-serif',
                fontSize: 14,
                color: '#717786'
            }}>
                <span style={{ color: '#414755', opacity: 0.6 }}>© 2026 FoodSpot Systems</span>
                <div style={{ display: 'flex', gap: 24 }}>
                    <a href="#" style={{ color: '#717786', textDecoration: 'none', transition: 'color 0.2s ease' }} onMouseEnter={(e)=>e.currentTarget.style.color='#0058bc'} onMouseLeave={(e)=>e.currentTarget.style.color='#717786'}>Privacy Policy</a>
                    <a href="#" style={{ color: '#717786', textDecoration: 'none', transition: 'color 0.2s ease' }} onMouseEnter={(e)=>e.currentTarget.style.color='#0058bc'} onMouseLeave={(e)=>e.currentTarget.style.color='#717786'}>Terms of Service</a>
                    <a href="#" style={{ color: '#717786', textDecoration: 'none', transition: 'color 0.2s ease' }} onMouseEnter={(e)=>e.currentTarget.style.color='#0058bc'} onMouseLeave={(e)=>e.currentTarget.style.color='#717786'}>Help Center</a>
                </div>
            </footer>
        </div>
    )
}

export default StaffLogin
