/**
 * TrialSignup.jsx
 * 
 * 14-Day Free Trial Funnel Entry Point
 * 
 * Flow:
 * 1. Capture business name, email, password
 * 2. Create Supabase Auth user with metadata
 * 3. INSERT branding row with 14-day trial
 * 4. Initialize tenant storage
 * 5. Redirect to owner dashboard
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient.js'
import { setTenantStoragePrefix } from '../../utils/storage.js'

function TrialSignup() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    // Form state
    const [businessName, setBusinessName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    // Pre-fill business name from URL param
    useEffect(() => {
        const nameParam = searchParams.get('name')
        if (nameParam) {
            setBusinessName(decodeURIComponent(nameParam))
        }
    }, [searchParams])

    // Generate URL-safe slug from business name
    const generateSlug = (name) => {
        return name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .substring(0, 50)
    }

    // Handle trial signup
    const handleSignup = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const slug = generateSlug(businessName)

            if (!slug) {
                throw new Error('Por favor ingresá un nombre de negocio válido')
            }

            // 1. CREATE USER with Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        business_name: businessName,
                        slug: slug,
                        role: 'owner'
                    }
                }
            })

            if (authError) throw authError
            if (!authData.user) throw new Error('No se pudo crear el usuario')

            const userId = authData.user.id

            // 2. CREATE TENANT SILO (branding row)
            const trialEndsAt = new Date()
            trialEndsAt.setDate(trialEndsAt.getDate() + 14) // 14-day trial

            const { error: siloError } = await supabase
                .from('branding')
                .insert({
                    business_id: userId,
                    business_name: businessName,
                    slug: slug,
                    is_paid: false,
                    trial_ends_at: trialEndsAt.toISOString(),
                    primary_color: '#8B7355', // Default warm brown
                    created_at: new Date().toISOString()
                })

            if (siloError) {
                // If silo creation fails, delete the auth user to prevent orphans
                console.error('[TRIAL] Silo creation failed:', siloError)
                throw new Error('Error creando tu espacio. Por favor intentá de nuevo.')
            }

            // 3. INITIALIZE TENANT STORAGE
            setTenantStoragePrefix(userId)

            // 4. INSTANT REDIRECT TO OWNER DASHBOARD
            // Email confirmation is OFF - redirect immediately
            navigate(`/${slug}/owner`, { replace: true })

        } catch (err) {
            console.error('[TRIAL] Signup error:', err)
            setError(err.message || 'Error al crear la cuenta')
            setLoading(false)
        }
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#FFFFFF',
            padding: '24px',
            fontFamily: 'Inter, system-ui, sans-serif'
        }}>
            {/* Logo/Brand */}
            <div style={{
                marginBottom: '32px',
                textAlign: 'center'
            }}>
                <h1 style={{
                    fontSize: '32px',
                    fontWeight: 700,
                    color: '#1a1a2e',
                    margin: 0,
                    marginBottom: '8px'
                }}>
                    🍔 FoodSpot
                </h1>
                <p style={{
                    color: '#6B7280',
                    fontSize: '14px',
                    margin: 0
                }}>
                    Tu app de pedidos en 5 minutos
                </p>
            </div>

            {/* Signup Card */}
            <div style={{
                width: '100%',
                maxWidth: '400px',
                background: '#F9FAFB',
                borderRadius: '16px',
                padding: '32px',
                border: '1px solid #E5E7EB',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
            }}>
                <h2 style={{
                    color: '#1a1a2e',
                    fontSize: '24px',
                    fontWeight: 600,
                    marginTop: 0,
                    marginBottom: '8px',
                    textAlign: 'center'
                }}>
                    Comenzá tu prueba gratis
                </h2>
                <p style={{
                    color: '#6B7280',
                    fontSize: '14px',
                    textAlign: 'center',
                    marginBottom: '24px'
                }}>
                    14 días gratis • Sin tarjeta de crédito
                </p>

                {/* Error Message */}
                {error && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        borderRadius: '8px',
                        padding: '12px',
                        marginBottom: '16px',
                        color: '#fca5a5',
                        fontSize: '14px',
                        textAlign: 'center'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSignup}>
                    {/* Business Name */}
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{
                            display: 'block',
                            color: '#374151',
                            fontSize: '13px',
                            fontWeight: 500,
                            marginBottom: '6px'
                        }}>
                            Nombre de tu negocio
                        </label>
                        <input
                            type="text"
                            value={businessName}
                            onChange={(e) => setBusinessName(e.target.value)}
                            placeholder="Ej: Burger Palace"
                            required
                            style={{
                                width: '100%',
                                padding: '14px 16px',
                                fontSize: '16px',
                                borderRadius: '10px',
                                border: '1px solid #D1D5DB',
                                background: '#FFFFFF',
                                color: '#1a1a2e',
                                outline: 'none',
                                boxSizing: 'border-box',
                                transition: 'border-color 0.2s'
                            }}
                        />
                        {businessName && (
                            <p style={{
                                color: '#6B7280',
                                fontSize: '12px',
                                marginTop: '4px',
                                marginBottom: 0
                            }}>
                                Tu URL: foodspot.app/<strong>{generateSlug(businessName)}</strong>
                            </p>
                        )}
                    </div>

                    {/* Email */}
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{
                            display: 'block',
                            color: '#374151',
                            fontSize: '13px',
                            fontWeight: 500,
                            marginBottom: '6px'
                        }}>
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="tu@email.com"
                            required
                            style={{
                                width: '100%',
                                padding: '14px 16px',
                                fontSize: '16px',
                                borderRadius: '10px',
                                border: '1px solid #D1D5DB',
                                background: '#FFFFFF',
                                color: '#1a1a2e',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {/* Password */}
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{
                            display: 'block',
                            color: '#374151',
                            fontSize: '13px',
                            fontWeight: 500,
                            marginBottom: '6px'
                        }}>
                            Contraseña
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Mínimo 6 caracteres"
                            required
                            minLength={6}
                            style={{
                                width: '100%',
                                padding: '14px 16px',
                                fontSize: '16px',
                                borderRadius: '10px',
                                border: '1px solid #D1D5DB',
                                background: '#FFFFFF',
                                color: '#1a1a2e',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '16px',
                            fontSize: '16px',
                            fontWeight: 600,
                            borderRadius: '10px',
                            border: 'none',
                            background: loading
                                ? 'rgba(139, 115, 85, 0.5)'
                                : 'linear-gradient(135deg, #8B7355 0%, #6d5a45 100%)',
                            color: '#fff',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            boxShadow: loading ? 'none' : '0 4px 20px rgba(139, 115, 85, 0.4)'
                        }}
                    >
                        {loading ? (
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                <span style={{
                                    width: '16px',
                                    height: '16px',
                                    border: '2px solid rgba(255,255,255,0.3)',
                                    borderTopColor: '#fff',
                                    borderRadius: '50%',
                                    animation: 'spin 0.8s linear infinite'
                                }} />
                                Creando tu espacio...
                            </span>
                        ) : (
                            'Comenzar prueba gratis →'
                        )}
                    </button>
                </form>

                {/* Terms */}
                <p style={{
                    color: '#9CA3AF',
                    fontSize: '11px',
                    textAlign: 'center',
                    marginTop: '16px',
                    marginBottom: 0,
                    lineHeight: 1.5
                }}>
                    Al registrarte aceptás los términos de servicio
                    y la política de privacidad de FoodSpot.
                </p>
            </div>

            {/* Login Link */}
            <p style={{
                color: '#6B7280',
                fontSize: '14px',
                marginTop: '24px'
            }}>
                ¿Ya tenés cuenta?{' '}
                <a
                    href="/login"
                    style={{ color: '#8B7355', textDecoration: 'none', fontWeight: 500 }}
                >
                    Iniciá sesión
                </a>
            </p>

            {/* Spinner Animation */}
            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                input::placeholder {
                    color: #9CA3AF;
                }
                input:focus {
                    border-color: #8B7355 !important;
                }
            `}</style>
        </div>
    )
}

export default TrialSignup
