import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../../utils/auth.js'

function StaffLogin() {
    const navigate = useNavigate()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')

    const handleSubmit = (e) => {
        e.preventDefault()

        const result = login(username, password)

        if (result.success) {
            if (result.role === 'superadmin') {
                navigate('/admin')
            } else if (result.role === 'owner') {
                navigate('/owner/menu')
            } else {
                navigate('/staff/dashboard')
            }
        } else {
            setError('Credenciales incorrectas')
            setTimeout(() => setError(''), 3000)
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
                Ingresá tus credenciales
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 320 }}>
                {/* Username Input */}
                <input
                    type="text"
                    placeholder="Usuario"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoFocus
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
                        boxSizing: 'border-box'
                    }}
                />

                {/* Password Input */}
                <input
                    type="password"
                    placeholder="Contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                        boxSizing: 'border-box'
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
                    style={{
                        width: '100%',
                        padding: '16px 24px',
                        fontSize: 16,
                        fontWeight: 600,
                        color: 'white',
                        background: '#B8956A',
                        border: 'none',
                        borderRadius: 28,
                        cursor: 'pointer',
                        marginBottom: 12
                    }}
                >
                    Ingresar
                </button>

                {/* Secondary Button - Volver */}
                <button
                    type="button"
                    onClick={() => navigate('/')}
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
