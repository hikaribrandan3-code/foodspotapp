import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../../utils/auth.js'

function OwnerLogin() {
    const navigate = useNavigate()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')

    const handleSubmit = (e) => {
        e.preventDefault()

        const result = login(username, password)

        if (result.success) {
            // Route based on role
            if (result.role === 'superadmin') {
                navigate('/admin')
            } else if (result.role === 'owner' || result.role === 'staff') {
                navigate('/owner/menu')
            } else {
                setError('Solo acceso para owner o superior')
                setTimeout(() => setError(''), 3000)
            }
        } else {
            setError('Credenciales incorrectas')
            setTimeout(() => setError(''), 3000)
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
                <div style={{ fontSize: '3rem', marginBottom: 'var(--space-3)' }}></div>
                <h1 className="page-title">Acceso Owner</h1>
                <p className="page-subtitle">Ingresá tus credenciales</p>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Usuario"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        autoFocus
                    />
                </div>
                <div className="form-group">
                    <input
                        type="password"
                        className="form-input"
                        placeholder="Contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>

                {error && (
                    <p style={{
                        color: 'var(--color-error)',
                        textAlign: 'center',
                        marginBottom: 'var(--space-3)'
                    }}>
                        {error}
                    </p>
                )}

                <button type="submit" className="btn btn-primary btn-block btn-lg">
                    Ingresar
                </button>
            </form>

            <button
                className="btn btn-secondary btn-block"
                style={{ marginTop: 'var(--space-4)' }}
                onClick={() => navigate('/')}
            >
                ← Volver
            </button>
        </div>
    )
}

export default OwnerLogin

