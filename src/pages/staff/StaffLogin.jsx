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
                background: 'radial-gradient(circle at 50% 50%, #2a2218 0%, #131313 70%)'
            }}>
                <div style={{
                    width: 32,
                    height: 32,
                    border: '3px solid #353534',
                    borderTopColor: '#dfc29f',
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

    return (
        <div style={{
            minHeight: '100dvh',
            background: 'radial-gradient(circle at 50% 50%, #2a2218 0%, #131313 70%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
            color: '#e5e2e1',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Fixed Header */}
            <header style={{
                position: 'fixed',
                top: 0,
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '0 24px',
                height: 80,
                zIndex: 50
            }}>
                <h1 style={{
                    fontFamily: '"Manrope", sans-serif',
                    fontWeight: 900,
                    fontSize: 24,
                    color: '#dfc29f',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    margin: 0
                }}>FoodSpot</h1>
            </header>

            {/* Main Content */}
            <main style={{ width: '100%', maxWidth: 448, padding: '48px 24px', zIndex: 10 }}>
                <div style={{
                    background: 'rgba(28, 27, 27, 0.65)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    borderRadius: 40,
                    padding: 32,
                    boxShadow: '0 -4px 40px rgba(0,0,0,0.12)',
                    border: '1px solid rgba(77, 69, 60, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                }}>
                    {/* Context Header */}
                    <div style={{ textAlign: 'center', marginBottom: 32 }}>
                        <h2 style={{
                            fontFamily: '"Manrope", sans-serif',
                            fontSize: 30,
                            fontWeight: 700,
                            letterSpacing: '-0.025em',
                            color: '#e5e2e1',
                            margin: '0 0 8px 0'
                        }}>Staff Access</h2>
                        <p style={{
                            color: '#d1c4b9',
                            fontWeight: 500,
                            opacity: 0.8,
                            margin: 0,
                            fontSize: 14
                        }}>Enter your credentials to continue</p>
                    </div>

                    {/* Staff Badge */}
                    <div style={{
                        width: '100%',
                        background: 'rgba(14, 14, 14, 0.5)',
                        padding: 6,
                        borderRadius: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 40,
                        position: 'relative'
                    }}>
                        <div style={{
                            position: 'absolute',
                            left: 6,
                            right: 6,
                            height: 'calc(100% - 12px)',
                            background: '#353534',
                            borderRadius: 9999,
                            boxShadow: '0 0 15px rgba(223, 194, 159, 0.1)',
                            top: 6
                        }} />
                        <span style={{
                            position: 'relative',
                            zIndex: 10,
                            padding: '12px 0',
                            fontSize: 13,
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            color: '#dfc29f',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                        }}>
                            <span style={{ fontSize: 18 }}>🪪</span>
                            Staff Login
                        </span>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                        {/* Email Input */}
                        <div style={{ marginBottom: 24 }}>
                            <label style={{
                                display: 'block',
                                fontSize: 10,
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.15em',
                                color: '#d1c4b9',
                                marginLeft: 4,
                                marginBottom: 8
                            }}>Email Address</label>
                            <input
                                type="email"
                                placeholder="staff@foodspot.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoFocus
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    height: 64,
                                    background: '#0e0e0e',
                                    border: 'none',
                                    borderRadius: 16,
                                    padding: '0 24px',
                                    color: '#e5e2e1',
                                    fontWeight: 500,
                                    fontSize: 15,
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    transition: 'box-shadow 0.2s ease'
                                }}
                                onFocus={(e) => e.target.style.boxShadow = '0 0 0 1px rgba(223,194,159,0.4)'}
                                onBlur={(e) => e.target.style.boxShadow = 'none'}
                            />
                        </div>

                        {/* Password Input */}
                        <div style={{ marginBottom: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px', marginBottom: 8 }}>
                                <label style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.15em',
                                    color: '#d1c4b9'
                                }}>Security Key</label>
                            </div>
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    height: 64,
                                    background: '#0e0e0e',
                                    border: 'none',
                                    borderRadius: 16,
                                    padding: '0 24px',
                                    color: '#e5e2e1',
                                    fontWeight: 500,
                                    fontSize: 15,
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    transition: 'box-shadow 0.2s ease'
                                }}
                                onFocus={(e) => e.target.style.boxShadow = '0 0 0 1px rgba(223,194,159,0.4)'}
                                onBlur={(e) => e.target.style.boxShadow = 'none'}
                            />
                        </div>

                        {/* Error Message */}
                        {error && (
                            <p style={{
                                color: '#ffb4ab',
                                textAlign: 'center',
                                fontSize: 13,
                                marginBottom: 10,
                                background: 'rgba(147, 0, 10, 0.2)',
                                padding: '10px 16px',
                                borderRadius: 12,
                                border: '1px solid rgba(255, 180, 171, 0.2)'
                            }}>{error}</p>
                        )}

                        {/* Password Strength Meter */}
                        <div style={{ marginBottom: 24, paddingTop: 8 }}>
                            <div style={{ display: 'flex', gap: 6, height: 6, width: '100%' }}>
                                <div style={{ flex: 1, borderRadius: 9999, background: '#8b7355' }} />
                                <div style={{ flex: 1, borderRadius: 9999, background: '#8b7355' }} />
                                <div style={{ flex: 1, borderRadius: 9999, background: password.length > 4 ? '#8b7355' : '#353534' }} />
                                <div style={{ flex: 1, borderRadius: 9999, background: password.length > 8 ? '#8b7355' : '#353534' }} />
                            </div>
                            <p style={{
                                fontSize: 10,
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.15em',
                                color: '#d1c4b9',
                                textAlign: 'center',
                                marginTop: 12
                            }}>
                                {password.length === 0 ? 'Enter credentials' : password.length <= 4 ? 'Weak' : password.length <= 8 ? 'Strong Access Level' : 'Maximum Security'}
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    height: 64,
                                    background: loading
                                        ? '#4d453c'
                                        : 'linear-gradient(135deg, #dfc29f 0%, #8b7355 100%)',
                                    color: loading ? '#9a8f84' : '#3f2d15',
                                    fontFamily: '"Manrope", sans-serif',
                                    fontWeight: 700,
                                    fontSize: 18,
                                    borderRadius: 16,
                                    border: 'none',
                                    boxShadow: loading ? 'none' : '0 4px 20px rgba(223, 194, 159, 0.2)',
                                    cursor: loading ? 'wait' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                    transition: 'opacity 0.2s ease, transform 0.1s ease'
                                }}
                                onMouseDown={(e) => !loading && (e.currentTarget.style.transform = 'scale(0.98)')}
                                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                {loading ? 'Verificando...' : 'Login'}
                                {!loading && <span style={{ fontSize: 20 }}>→</span>}
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/')}
                                style={{
                                    width: '100%',
                                    height: 64,
                                    background: 'transparent',
                                    border: '1px solid rgba(77, 69, 60, 0.3)',
                                    color: '#d1c4b9',
                                    fontFamily: '"Manrope", sans-serif',
                                    fontWeight: 700,
                                    fontSize: 18,
                                    borderRadius: 16,
                                    cursor: 'pointer',
                                    transition: 'background 0.2s ease, transform 0.1s ease'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#1c1b1b'}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'scale(1)'; }}
                                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                Back
                            </button>
                        </div>
                    </form>
                </div>
            </main>

            {/* Background Decorative Blur Orbs */}
            <div style={{
                position: 'absolute',
                top: '25%',
                left: -80,
                width: 320,
                height: 320,
                background: 'rgba(223, 194, 159, 0.05)',
                filter: 'blur(120px)',
                borderRadius: '50%',
                pointerEvents: 'none'
            }} />
            <div style={{
                position: 'absolute',
                bottom: '25%',
                right: -80,
                width: 384,
                height: 384,
                background: 'rgba(139, 115, 85, 0.1)',
                filter: 'blur(150px)',
                borderRadius: '50%',
                pointerEvents: 'none'
            }} />

            {/* Background Hero Image */}
            <div style={{
                position: 'fixed',
                inset: 0,
                zIndex: -1,
                opacity: 0.1
            }}>
                <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBQMD1WWzULK-OYupbPZxeSzfpVJoZEnHhlAXCvT_lzZPs3W9mO4Mjhge_MHdrREJacVpXTHgo3a8vXkU06xML-SjlIIayDirdcBsZuVFTfSPhp2HhQSMbb0UoI8Ui6dQD8SM2WW5rD79R1ZvvbVyAwcls9Kn_pAL9UltGVwEvesdQXHMxE7po2xNtRtlBzYM8zFgSuQEIGYhb5TXRTU4tYkWS6OAtTwAS3biEAqvQ-9mzpYP3QGqJK-4Sd7m0TQ4yHFoG0bCVow00"
                    alt=""
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        filter: 'grayscale(100%)'
                    }}
                />
            </div>
        </div>
    )
}

export default StaffLogin
