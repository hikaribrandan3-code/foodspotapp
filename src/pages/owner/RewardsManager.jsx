import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getAuth, clearAuth } from '../../utils/storage.js'
import { getConfig, updateConfig } from '../../config/appConfig.js'

function RewardsManager() {
    const navigate = useNavigate()
    const [config, setConfig] = useState(() => getConfig())
    const [stampsRequired, setStampsRequired] = useState(config.rewards?.stampsRequired || 10)
    const [rewardDescription, setRewardDescription] = useState(config.rewards?.rewardDescription || '')

    // Check auth
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
        setConfig(getConfig())
        alert('¡Cambios guardados!')
    }

    const handleToggleRewards = () => {
        updateConfig({
            features: {
                ...config.features,
                rewardsEnabled: !config.features.rewardsEnabled
            }
        })
        setConfig(getConfig())
    }

    return (
        <div className="page" style={{ paddingBottom: 'var(--space-4)' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--space-4)'
            }}>
                <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)' }}>
                    ⭐ Recompensas
                </h1>
                <button
                    className="btn btn-secondary"
                    onClick={handleLogout}
                    style={{ padding: 'var(--space-2) var(--space-3)' }}
                >
                    Salir
                </button>
            </div>

            {/* Owner Navigation */}
            <div className="tabs" style={{ marginBottom: 'var(--space-4)' }}>
                <Link to="/owner/menu" className="tab">Menú</Link>
                <Link to="/owner/rewards" className="tab active">Recompensas</Link>
                <Link to="/owner/settings" className="tab">Config</Link>
                <Link to="/owner/analytics" className="tab">Stats</Link>
            </div>

            {/* Enable/Disable */}
            <div className="admin-card" style={{ marginBottom: 'var(--space-4)' }}>
                <div className="admin-row" style={{ paddingTop: 0, paddingBottom: 0 }}>
                    <div>
                        <p style={{ fontWeight: 'var(--font-weight-medium)' }}>Recompensas activas</p>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                            {config.features?.rewardsEnabled ? '✅ Activo' : '❌ Inactivo'}
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
            <div className="admin-card">
                <h3 style={{ marginBottom: 'var(--space-4)' }}>Configuración</h3>

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
            <div className="card" style={{ marginTop: 'var(--space-4)', textAlign: 'center' }}>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-2)' }}>
                    Vista previa
                </p>
                <p style={{ fontWeight: 'var(--font-weight-semibold)' }}>
                    🎁 Juntá {stampsRequired} sellos = {rewardDescription || '¡Café gratis!'}
                </p>
            </div>
        </div>
    )
}

export default RewardsManager
