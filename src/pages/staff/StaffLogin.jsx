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
                    // Redirect based on role
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
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(180deg, #F8F6F3 0%, #F0EDE8 100%)'
            }}>
                <div style={{
                    width: 32,
                    height: 32,
                    border: '3px solid #E5E7EB',
                    borderTopColor: '#B8A089',
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

            // Get role from user metadata
            const role = data.user?.user_metadata?.role || 'staff'

            // Navigate based on role
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
            minHeight: '100vh',
            background: 'linear-gradient(180deg, #F8F6F3 0%, #F0EDE8 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24
        }}>
            {/* Lock Icon */}
            <div style={{ marginBottom: 24 }}>
                <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    style={{ color: '#B8A089' }}
                >
                    <rect
                        x="5"
                        y="10"
                        width="14"
                        height="11"
                        rx="2"
                        fill="currentColor"
                    />
                    <path
                        d="M8 10V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V10"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        fill="none"
                    />
                </svg>
            </div>

            {/* Title */}
            <h1 style={{
                fontSize: 26,
                fontWeight: 600,
                color: '#4A4340',
                marginBottom: 8,
                letterSpacing: '-0.01em'
            }}>
                Acceso Staff
            </h1>

            {/* Subtitle */}
            <p style={{
                fontSize: 15,
                color: '#8B8580',
                marginBottom: 32
            }}>
                Ingresá tu email y contraseña
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 320 }}>
                {/* Email Input */}
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoFocus
                    disabled={loading}
                    style={{
                        width: '100%',
                        padding: '16px 20px',
                        fontSize: 15,
                        border: '1px solid #E0DCD6',
                        borderRadius: 28,
                        background: 'white',
                        color: '#4A4340',
                        marginBottom: 12,
                        outline: 'none',
                        boxSizing: 'border-box',
                        opacity: loading ? 0.7 : 1
                    }}
                />

                {/* Password Input */}
                <input
                    type="password"
                    placeholder="Contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    style={{
                        width: '100%',
                        padding: '16px 20px',
                        fontSize: 15,
                        border: '1px solid #E0DCD6',
                        borderRadius: 28,
                        background: 'white',
                        color: '#4A4340',
                        marginBottom: 16,
                        outline: 'none',
                        boxSizing: 'border-box',
                        opacity: loading ? 0.7 : 1
                    }}
                />

                {/* Error Message */}
                {error && (
                    <p style={{
                        color: '#B85450',
                        textAlign: 'center',
                        fontSize: 14,
                        marginBottom: 12
                    }}>
                        {error}
                    </p>
                )}

                {/* Primary Button - Ingresar */}
                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        width: '100%',
                        padding: '16px 24px',
                        fontSize: 16,
                        fontWeight: 600,
                        color: 'white',
                        background: '#B8956A',
                        border: 'none',
                        borderRadius: 28,
                        cursor: loading ? 'wait' : 'pointer',
                        marginBottom: 12,
                        opacity: loading ? 0.7 : 1
                    }}
                >
                    {loading ? 'Verificando...' : 'Ingresar'}
                </button>

                {/* Secondary Button - Volver */}
                <button
                    type="button"
                    onClick={() => navigate('/')}
                    disabled={loading}
                    style={{
                        width: '100%',
                        padding: '14px 24px',
                        fontSize: 15,
                        fontWeight: 500,
                        color: '#6B6560',
                        background: 'white',
                        border: '1px solid #E0DCD6',
                        borderRadius: 28,
                        cursor: 'pointer'
                    }}
                >
                    ← Volver
                </button>
            </form>
        </div>
    )
}

export default StaffLogin
