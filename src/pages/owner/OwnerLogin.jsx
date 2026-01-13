import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

/**
 * Owner/Super Admin Login
 * Uses Supabase Auth for secure authentication
 */
function OwnerLogin() {
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            // Authenticate with Supabase
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password
            })

            if (authError) throw authError

            // Get role from user metadata
            const role = data.user?.user_metadata?.role || 'owner'

            // Navigate based on role
            if (role === 'superadmin') {
                navigate('/admin')
            } else if (role === 'owner') {
                navigate('/owner/summary')
            } else {
                // Fallback for staff (shouldn't use this login page)
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
        <div className="page" style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            minHeight: '80vh'
        }}>
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
                <div style={{ fontSize: '3rem', marginBottom: 'var(--space-3)' }}>🔐</div>
                <h1 className="page-title">Acceso Admin</h1>
                <p className="page-subtitle">Ingresá tu email y contraseña</p>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <input
                        type="email"
                        className="form-input"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoFocus
                        disabled={loading}
                    />
                </div>
                <div className="form-group">
                    <input
                        type="password"
                        className="form-input"
                        placeholder="Contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                    />
                </div>

                {error && (
                    <p style={{
                        color: 'var(--color-error)',
                        textAlign: 'center',
                        marginBottom: 'var(--space-3)',
                        fontSize: '14px'
                    }}>
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    className="btn btn-primary btn-block btn-lg"
                    disabled={loading}
                    style={{ opacity: loading ? 0.7 : 1 }}
                >
                    {loading ? 'Verificando...' : 'Ingresar'}
                </button>
            </form>

            <button
                className="btn btn-secondary btn-block"
                style={{ marginTop: 'var(--space-4)' }}
                onClick={() => navigate('/')}
                disabled={loading}
            >
                ← Volver
            </button>
        </div>
    )
}

export default OwnerLogin
