import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getAuth, clearAuth } from '../../utils/storage.js'
import { updateConfig } from '../../config/appConfig.js'
import BackendHeader from '../../components/BackendHeader.jsx'

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
            <BackendHeader
                title="Recompensas"
                onLogout={handleLogout}
            />

            <div style={{ padding: 16, paddingBottom: 100 }}>
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
