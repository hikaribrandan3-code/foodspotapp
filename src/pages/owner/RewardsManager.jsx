import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getAuth, clearAuth } from '../../utils/storage.js'
import { updateConfig } from '../../config/appConfig.js'

// Shared Owner Header Component
function OwnerHeader({ title, subtitle, onLogout }) {
    return (
        <div style={{
            background: '#1E293B',
            padding: '14px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        }}>
            <div>
                <h1 style={{
                    fontSize: 17,
                    fontWeight: 600,
                    color: '#FFFFFF',
                    margin: 0,
                    letterSpacing: '-0.01em'
                }}>{title}</h1>
                {subtitle && (
                    <p style={{
                        fontSize: 12,
                        color: '#94A3B8',
                        margin: '2px 0 0'
                    }}>{subtitle}</p>
                )}
            </div>
            <button
                onClick={onLogout}
                style={{
                    padding: '6px 14px',
                    fontSize: 12,
                    fontWeight: 500,
                    color: '#94A3B8',
                    background: 'transparent',
                    border: '1px solid #475569',
                    borderRadius: 6,
                    cursor: 'pointer'
                }}
            >
                Salir
            </button>
        </div>
    )
}

// Shared Owner Tab Navigation
function OwnerTabs({ activeTab }) {
    const tabs = [
        { id: 'settings', path: '/owner/settings', label: 'Config' },
        { id: 'menu', path: '/owner/menu', label: 'Menú' },
        { id: 'analytics', path: '/owner/analytics', label: 'Stats' },
        { id: 'rewards', path: '/owner/rewards', label: 'Recompensas' }
    ]

    return (
        <div style={{
            background: '#FFFFFF',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch'
        }}>
            {tabs.map(tab => (
                <Link
                    key={tab.id}
                    to={tab.path}
                    style={{
                        flex: 1,
                        padding: '12px 16px',
                        fontSize: 13,
                        fontWeight: activeTab === tab.id ? 600 : 500,
                        color: activeTab === tab.id ? '#1E293B' : '#64748B',
                        textDecoration: 'none',
                        textAlign: 'center',
                        borderBottom: activeTab === tab.id ? '2px solid #3B82F6' : '2px solid transparent',
                        background: 'transparent',
                        whiteSpace: 'nowrap'
                    }}
                >
                    {tab.label}
                </Link>
            ))}
        </div>
    )
}

// INVARIANT: config must come from prop (App.jsx safeConfig)
function RewardsManager({ config }) {
    const navigate = useNavigate()
    const [stampsRequired, setStampsRequired] = useState(config?.rewards?.stampsRequired || 10)
    const [rewardDescription, setRewardDescription] = useState(config?.rewards?.rewardDescription || '')

    useEffect(() => {
        const auth = getAuth()
        if (!auth.authenticated || (auth.role !== 'owner' && auth.role !== 'superadmin')) {
            navigate('/owner')
        }
    }, [navigate])

    const handleLogout = () => {
        clearAuth()
        navigate('/')
    }

    const handleSave = () => {
        updateConfig({
            rewards: {
                stampsRequired: parseInt(stampsRequired) || 10,
                rewardDescription: rewardDescription || '¡Café gratis!'
            }
        })
        window.dispatchEvent(new CustomEvent('frontendSync'))
        alert('¡Cambios guardados!')
    }

    const handleToggleRewards = () => {
        updateConfig({
            features: {
                ...config?.features,
                rewardsEnabled: !config?.features?.rewardsEnabled
            }
        })
        window.dispatchEvent(new CustomEvent('frontendSync'))
    }

    return (
        <div className="backend-surface" style={{ minHeight: '100vh', background: '#F8FAFC' }}>
            <OwnerHeader
                title="Recompensas"
                subtitle="Programa de fidelidad"
                onLogout={handleLogout}
            />
            <OwnerTabs activeTab="rewards" />

            <div style={{ padding: 16 }}>
                {/* Enable/Disable */}
                <div style={{
                    background: '#FFFFFF',
                    borderRadius: 10,
                    border: '1px solid #E2E8F0',
                    padding: 16,
                    marginBottom: 16
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div>
                            <p style={{ fontWeight: 500, fontSize: 14, color: '#1E293B', margin: 0 }}>Recompensas activas</p>
                            <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0' }}>
                                {config.features?.rewardsEnabled ? '✓ Activo' : '✗ Inactivo'}
                            </p>
                        </div>
                        <label className="toggle">
                            <input
                                type="checkbox"
                                checked={config.features?.rewardsEnabled}
                                onChange={handleToggleRewards}
                            />
                            <span className="toggle-slider"></span>
                        </label>
                    </div>
                </div>

                {/* Configuration */}
                <div style={{
                    background: '#FFFFFF',
                    borderRadius: 10,
                    border: '1px solid #E2E8F0',
                    padding: 16
                }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 16, marginTop: 0 }}>Configuración</h3>

                    <div className="form-group">
                        <label className="form-label">Sellos necesarios</label>
                        <input
                            type="number"
                            className="form-input"
                            value={stampsRequired}
                            onChange={(e) => setStampsRequired(e.target.value)}
                            min="1"
                            max="20"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Descripción del premio</label>
                        <input
                            type="text"
                            className="form-input"
                            value={rewardDescription}
                            onChange={(e) => setRewardDescription(e.target.value)}
                            placeholder="Ej: ¡Café gratis!"
                        />
                    </div>

                    <button
                        className="btn btn-primary btn-block"
                        onClick={handleSave}
                    >
                        Guardar cambios
                    </button>
                </div>

                {/* Preview */}
                <div style={{
                    background: '#FFFFFF',
                    borderRadius: 10,
                    border: '1px solid #E2E8F0',
                    padding: 16,
                    marginTop: 16,
                    textAlign: 'center'
                }}>
                    <p style={{ color: '#64748B', fontSize: 12, marginBottom: 8, marginTop: 0 }}>
                        Vista previa
                    </p>
                    <p style={{ fontWeight: 600, fontSize: 14, color: '#1E293B', margin: 0 }}>
                        Juntá {stampsRequired} sellos = {rewardDescription || '¡Café gratis!'}
                    </p>
                </div>
            </div>
        </div>
    )
}

export default RewardsManager
