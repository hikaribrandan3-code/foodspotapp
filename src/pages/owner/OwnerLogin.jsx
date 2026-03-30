import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useTenant } from '../../contexts/TenantContext'

function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
}

function OwnerLogin() {
    const navigate = useNavigate()
    const { tenantSlug } = useParams()
    const { tenantData } = useTenant()
    
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [loginMode, setLoginMode] = useState('owner')

    const t = useMemo(() => {
        const lang = tenantData?.language || 'es';
        return (
        <div style={{
            backgroundColor: '#f7f9fb',
            color: '#191c1e',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 'max(884px, 100dvh)',
            fontFamily: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif'
        }}>
            {/* Hero Image Section */}
            <div style={{ position: 'relative', width: '100%', overflow: 'hidden', height: '30vh' }}>
                <img 
                    alt="Gourmet Burger" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuA3kJf4SvwgmpJBEZosFOk5f5jv75s8LYW4Rm2cpJO4sz3Ezljvv7WK-WttaW5gvh_Qfh5X2JG0Kixv35rtEABkGWQgwMCCmi5lmDiAS1_j3lHfjMZKd_92yzqIc7ju5myq-yu4wYEc9yrevO_KFWKvmGOujfykQbVPjgOaNxJfa3US6HOntNFhyHJaTECgciT5m8jZy9EoYR1L6ADtwjIxJ5o51jrUnfW3MGErIYofJdqfdQpdftOd53yE3NqvrN9MlpWjs4FelV0"
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #f7f9fb, transparent, transparent)' }}></div>
            </div>

            {/* Main Content Container */}
            <main style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', padding: '0 24px', marginTop: '-48px', position: 'relative', zIndex: 10 }}>
                {/* Logo Branding */}
                <header style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '40px' }}>
                    <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', marginBottom: '16px' }}>
                        <span className="material-symbols-outlined" style={{ color: '#ff9800', fontSize: '36px' }}>restaurant</span>
                    </div>
                    <h1 style={{ fontSize: '30px', fontWeight: 900, color: '#191c1e', letterSpacing: '-0.05em', margin: 0 }}>FoodSpot OS</h1>
                </header>

                {/* Role Toggle (The Logic Switch) */}
                <div style={{ backgroundColor: '#e6e8ea', borderRadius: '9999px', padding: '4px', display: 'flex', marginBottom: '40px', width: '100%', maxWidth: '384px', margin: '0 auto 40px auto', boxShadow: 'inset 0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                    <button 
                        type="button"
                        onClick={() => { setLoginMode('owner'); setError(''); }}
                        style={{
                            flex: 1, padding: '12px 24px', borderRadius: '9999px', fontSize: '14px', fontWeight: 700, transition: 'all 0.3s ease',
                            backgroundColor: loginMode === 'owner' ? '#8b5000' : 'transparent',
                            color: loginMode === 'owner' ? '#ffffff' : '#554434',
                            boxShadow: loginMode === 'owner' ? '0 10px 15px -3px rgba(139, 80, 0, 0.3)' : 'none',
                            border: 'none', cursor: 'pointer'
                        }}
                    >
                        Owner
                    </button>
                    <button 
                        type="button"
                        onClick={() => { setLoginMode('staff'); setError(''); }}
                        style={{
                            flex: 1, padding: '12px 24px', borderRadius: '9999px', fontSize: '14px', fontWeight: 700, transition: 'all 0.3s ease',
                            backgroundColor: loginMode === 'staff' ? '#8b5000' : 'transparent',
                            color: loginMode === 'staff' ? '#ffffff' : '#554434',
                            boxShadow: loginMode === 'staff' ? '0 10px 15px -3px rgba(139, 80, 0, 0.3)' : 'none',
                            border: 'none', cursor: 'pointer'
                        }}
                    >
                        Staff
                    </button>
                </div>

                {/* Form Section */}
                <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '384px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {/* Dynamic Fields based on Role */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#554434', marginBottom: '8px', marginLeft: '16px' }}>
                            {loginMode === 'staff' ? 'Staff Username' : 'Email Address'}
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#ffffff', border: '1px solid rgba(219, 194, 173, 0.4)', borderRadius: '16px', padding: '16px', transition: 'all 0.2s' }}>
                            <span className="material-symbols-outlined" style={{ color: '#554434', marginRight: '12px', fontSize: '20px' }}>{loginMode === 'staff' ? 'person' : 'mail'}</span>
                            <input 
                                type={loginMode === 'staff' ? 'text' : 'email'}
                                placeholder={loginMode === 'staff' ? 'chef_mario' : 'name@restaurant.com'}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loading}
                                style={{ backgroundColor: 'transparent', border: 'none', outline: 'none', width: '100%', color: '#191c1e', fontWeight: 500, fontSize: '16px' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#554434', marginBottom: '8px', marginLeft: '16px' }}>
                            {loginMode === 'staff' ? 'Station PIN' : 'Password'}
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#ffffff', border: '1px solid rgba(219, 194, 173, 0.4)', borderRadius: '16px', padding: '16px', transition: 'all 0.2s' }}>
                            <span className="material-symbols-outlined" style={{ color: '#554434', marginRight: '12px', fontSize: '20px' }}>{loginMode === 'staff' ? 'dialpad' : 'lock'}</span>
                            <input 
                                type="password"
                                placeholder={loginMode === 'staff' ? '0000' : '••••••••'}
                                maxLength={loginMode === 'staff' ? 4 : undefined}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                                style={{ backgroundColor: 'transparent', border: 'none', outline: 'none', width: '100%', color: '#191c1e', fontWeight: 500, fontSize: '16px', letterSpacing: loginMode === 'staff' ? '0.25em' : 'normal' }}
                            />
                            {loginMode === 'owner' && (
                                <span className="material-symbols-outlined" style={{ color: 'rgba(85, 68, 52, 0.6)', marginLeft: '8px', cursor: 'pointer', fontSize: '20px' }}>visibility</span>
                            )}
                        </div>
                    </div>

                    {error && (
                        <p style={{ color: '#ba1a1a', textAlign: 'center', fontSize: '14px', background: '#ffdad6', padding: '12px', borderRadius: '12px', border: '1px solid rgba(186,26,26,0.2)', margin: 0 }}>{error}</p>
                    )}

                    {/* Primary CTA */}
                    <div style={{ paddingTop: '16px' }}>
                        <button 
                            type="submit" 
                            disabled={loading}
                            style={{ 
                                width: '100%', backgroundColor: loading ? '#8b5000' : '#ff9800', opacity: loading ? 0.7 : 1, color: '#ffffff', borderRadius: '16px', padding: '20px', fontSize: '16px', fontWeight: 900, letterSpacing: '0.1em', boxShadow: loading ? 'none' : '0 15px 30px -10px rgba(255, 152, 0, 0.4)', border: 'none', cursor: loading ? 'wait' : 'pointer', transition: 'all 0.15s ease', textTransform: 'uppercase' 
                            }}
                        >
                            {loading ? t('loading') : 'ENTRAR'}
                        </button>
                    </div>

                    {/* Secondary Action */}
                    <div style={{ textAlign: 'center', paddingTop: '8px' }}>
                        <a href="#" style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(25, 28, 30, 0.6)', textDecoration: 'none' }}>¿Olvidaste tu contraseña?</a>
                    </div>
                </form>
            </main>

            {/* Shared Footer Anchor */}
            <footer style={{ marginTop: 'auto', paddingTop: '40px', paddingBottom: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', gap: '8px', opacity: 0.8 }}>
                <p style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(25, 28, 30, 0.4)', margin: 0 }}>Powered by @foodspotapp</p>
                <div style={{ display: 'flex', gap: '16px' }}>
                    <a href="#" onClick={(e) => { e.preventDefault(); navigate(`/${tenantSlug || ''}`) }} style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(25, 28, 30, 0.4)', textDecoration: 'underline' }}>Privacidad</a>
                    <a href="#" style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(25, 28, 30, 0.4)', textDecoration: 'underline' }}>Términos</a>
                </div>
            </footer>
        </div>
    )
}

export default OwnerLogin