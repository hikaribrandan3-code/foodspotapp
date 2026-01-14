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

            // Extract identity from user metadata
            const metadata = data.user?.user_metadata || {}
            const role = metadata.role || 'owner'
            const slug = metadata.slug || metadata.business_name || 'default'

            // 🚀 HARD TELEPORT: Force full page reload to re-evaluate App interceptors
            // navigate() doesn't work because App.jsx checks window.location.pathname at mount
            if (role === 'superadmin') {
                window.location.href = '/admin'
            } else if (role === 'owner') {
                window.location.href = `/${slug}/owner/summary`
            } else {
                window.location.href = `/${slug}/staff/dashboard`
            }
        } catch (err) {
            console.error('Login error:', err)
            setError(err.message || 'Credenciales incorrectas')
            setTimeout(() => setError(''), 5000)
            setLoading(false)
        }
        // Note: Don't setLoading(false) on success - page will reload
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
