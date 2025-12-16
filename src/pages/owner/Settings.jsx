import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getAuth, clearAuth, getOrders, setItem, getItem } from '../../utils/storage.js'
import { getConfig, updateConfig, CURATED_FONTS, CONFIRMATION_COLORS } from '../../config/appConfig.js'

function Settings() {
    const navigate = useNavigate()
    const [config, setConfig] = useState(() => getConfig())
    const [maintenanceMessage, setMaintenanceMessage] = useState(config.maintenanceMessage || '')
    const [pauseMessage, setPauseMessage] = useState(config.pauseOrdersMessage || '')
    const [businessInfo, setBusinessInfo] = useState(config.businessInfo || {})

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

    const handleToggleMaintenance = () => {
        updateConfig({ maintenanceMode: !config.maintenanceMode })
        setConfig(getConfig())
    }

    const handleTogglePause = () => {
        updateConfig({ pauseOrders: !config.pauseOrders })
        setConfig(getConfig())
    }

    const handleSaveMessages = () => {
        updateConfig({
            maintenanceMessage,
            pauseOrdersMessage: pauseMessage
        })
        alert('¡Mensajes guardados!')
    }

    const handleSaveBusinessInfo = () => {
        updateConfig({ businessInfo })
        alert('¡Info guardada!')
    }

    const handleArchiveOrders = () => {
        const orders = getOrders()
        const completedOrders = orders.filter(o => o.status === 'entregado')
        const activeOrders = orders.filter(o => o.status !== 'entregado')

        if (completedOrders.length === 0) {
            alert('No hay pedidos completados para archivar.')
            return
        }

        if (!confirm(`¿Archivar ${completedOrders.length} pedidos completados? Esto los moverá al archivo.`)) {
            return
        }

        // Get existing archive
        const existingArchive = getItem('orders_archive') || []

        // Add timestamp to archived orders
        const archivedOrders = completedOrders.map(o => ({
            ...o,
            archivedAt: new Date().toISOString()
        }))

        // Save to archive
        setItem('orders_archive', [...existingArchive, ...archivedOrders])

        // Keep only active orders
        setItem('orders', activeOrders)

        alert(`✅ ${completedOrders.length} pedidos archivados.`)
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
                    ⚙️ Configuración
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
                <Link to="/owner/rewards" className="tab">Recompensas</Link>
                <Link to="/owner/settings" className="tab active">Config</Link>
                <Link to="/owner/analytics" className="tab">Stats</Link>
            </div>

            {/* Status Controls */}
            <div className="admin-section">
                <h3 className="admin-section-title">🔧 Estado del local</h3>
                <div className="admin-card">
                    <div className="admin-row">
                        <div>
                            <p style={{ fontWeight: 'var(--font-weight-medium)' }}>Modo mantenimiento</p>
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                                Cierra todo el local
                            </p>
                        </div>
                        <label className="toggle">
                            <input
                                type="checkbox"
                                checked={config.maintenanceMode}
                                onChange={handleToggleMaintenance}
                            />
                            <span className="toggle-slider"></span>
                        </label>
                    </div>
                    <div className="admin-row">
                        <div>
                            <p style={{ fontWeight: 'var(--font-weight-medium)' }}>Pausar pedidos</p>
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                                Solo desactiva pedidos
                            </p>
                        </div>
                        <label className="toggle">
                            <input
                                type="checkbox"
                                checked={config.pauseOrders}
                                onChange={handleTogglePause}
                            />
                            <span className="toggle-slider"></span>
                        </label>
                    </div>
                </div>
            </div>

            {/* Order Archive */}
            <div className="admin-section">
                <h3 className="admin-section-title">🗂️ Archivo de pedidos</h3>
                <div className="admin-card">
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)' }}>
                        Mover pedidos completados al archivo para limpiar la lista activa.
                    </p>
                    <button
                        className="btn btn-secondary btn-block"
                        onClick={handleArchiveOrders}
                    >
                        🗂️ Archivar pedidos del mes
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="admin-section">
                <h3 className="admin-section-title">💬 Mensajes</h3>
                <div className="admin-card">
                    <div className="form-group">
                        <label className="form-label">Mensaje de mantenimiento</label>
                        <input
                            type="text"
                            className="form-input"
                            value={maintenanceMessage}
                            onChange={(e) => setMaintenanceMessage(e.target.value)}
                            placeholder="Ej: Volvemos a las 17:00"
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Mensaje de pausa</label>
                        <input
                            type="text"
                            className="form-input"
                            value={pauseMessage}
                            onChange={(e) => setPauseMessage(e.target.value)}
                            placeholder="Ej: Estamos con muchos pedidos"
                        />
                    </div>
                    <button
                        className="btn btn-primary btn-block"
                        onClick={handleSaveMessages}
                    >
                        Guardar mensajes
                    </button>
                </div>
            </div>

            {/* Business Info */}
            <div className="admin-section">
                <h3 className="admin-section-title">📍 Info del local</h3>
                <div className="admin-card">
                    <div className="form-group">
                        <label className="form-label">Dirección</label>
                        <input
                            type="text"
                            className="form-input"
                            value={businessInfo.address || ''}
                            onChange={(e) => setBusinessInfo({ ...businessInfo, address: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Teléfono</label>
                        <input
                            type="text"
                            className="form-input"
                            value={businessInfo.phone || ''}
                            onChange={(e) => setBusinessInfo({ ...businessInfo, phone: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Instagram</label>
                        <input
                            type="text"
                            className="form-input"
                            value={businessInfo.instagram || ''}
                            onChange={(e) => setBusinessInfo({ ...businessInfo, instagram: e.target.value })}
                            placeholder="@usuario"
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Descripción</label>
                        <input
                            type="text"
                            className="form-input"
                            value={businessInfo.description || ''}
                            onChange={(e) => setBusinessInfo({ ...businessInfo, description: e.target.value })}
                        />
                    </div>
                    <button
                        className="btn btn-primary btn-block"
                        onClick={handleSaveBusinessInfo}
                    >
                        Guardar info
                    </button>
                </div>
            </div>

            {/* Branding Customization */}
            <div className="admin-section">
                <h3 className="admin-section-title">🎨 Personalización de marca</h3>
                <div className="admin-card">
                    {/* Font Selector */}
                    <div className="form-group">
                        <label className="form-label">Tipografía</label>
                        <select
                            className="form-input"
                            value={config.branding?.fontFamily || 'Inter'}
                            onChange={(e) => {
                                updateConfig({
                                    branding: {
                                        ...config.branding,
                                        fontFamily: e.target.value
                                    }
                                })
                                setConfig(getConfig())
                            }}
                            style={{ fontFamily: config.branding?.fontFamily || 'Inter' }}
                        >
                            {CURATED_FONTS.map(font => (
                                <option key={font.name} value={font.name} style={{ fontFamily: font.name }}>
                                    {font.label}
                                </option>
                            ))}
                        </select>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginTop: 4 }}>
                            Aplicado a todo el texto del negocio
                        </p>
                    </div>

                    {/* Confirmation Color */}
                    <div className="form-group">
                        <label className="form-label">Color de confirmación</label>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {CONFIRMATION_COLORS.map(color => (
                                <button
                                    key={color.value}
                                    onClick={() => {
                                        updateConfig({
                                            colors: {
                                                ...config.colors,
                                                confirmation: color.value
                                            }
                                        })
                                        setConfig(getConfig())
                                    }}
                                    style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 8,
                                        backgroundColor: color.value,
                                        border: config.colors?.confirmation === color.value ? '3px solid #1F2937' : '2px solid #E5E7EB',
                                        cursor: 'pointer'
                                    }}
                                    title={color.label}
                                />
                            ))}
                        </div>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginTop: 4 }}>
                            Para botones de confirmar pedido y acciones positivas
                        </p>
                    </div>

                    {/* Powered By Color */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Color "Powered by @foodspotapp"</label>
                        <input
                            type="color"
                            value={config.branding?.poweredByColor || '#C4856A'}
                            onChange={(e) => {
                                updateConfig({
                                    branding: {
                                        ...config.branding,
                                        poweredByColor: e.target.value
                                    }
                                })
                                setConfig(getConfig())
                            }}
                            style={{
                                width: 60,
                                height: 36,
                                border: '2px solid #E5E7EB',
                                borderRadius: 8,
                                cursor: 'pointer',
                                padding: 2
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* External Ordering Links */}
            <div className="admin-section">
                <h3 className="admin-section-title">🔗 Pedidos externos</h3>
                <div className="admin-card">
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)' }}>
                        Links externos para delivery. Aparecen en la pestaña Info.
                    </p>

                    {/* Rappi */}
                    <div style={{ marginBottom: 'var(--space-4)', paddingBottom: 'var(--space-3)', borderBottom: '1px solid var(--color-card)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                            <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>Rappi</span>
                            <button
                                onClick={() => {
                                    const current = config.externalOrdering || {}
                                    updateConfig({
                                        externalOrdering: {
                                            ...current,
                                            rappiEnabled: !current.rappiEnabled
                                        }
                                    })
                                    setConfig(getConfig())
                                }}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: 16,
                                    border: 'none',
                                    background: config.externalOrdering?.rappiEnabled ? 'var(--color-success)' : 'var(--color-card)',
                                    color: config.externalOrdering?.rappiEnabled ? 'white' : 'var(--color-text-muted)',
                                    fontSize: 'var(--font-size-sm)',
                                    cursor: 'pointer'
                                }}
                            >
                                {config.externalOrdering?.rappiEnabled ? 'ON' : 'OFF'}
                            </button>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Rappi link (external)</label>
                            <input
                                type="text"
                                className="form-input"
                                value={config.externalOrdering?.rappiUrl || ''}
                                onChange={(e) => {
                                    const current = config.externalOrdering || {}
                                    updateConfig({
                                        externalOrdering: {
                                            ...current,
                                            rappiUrl: e.target.value
                                        }
                                    })
                                    setConfig(getConfig())
                                }}
                                placeholder="https://..."
                            />
                        </div>
                    </div>

                    {/* PedidosYa */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                            <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>PedidosYa</span>
                            <button
                                onClick={() => {
                                    const current = config.externalOrdering || {}
                                    updateConfig({
                                        externalOrdering: {
                                            ...current,
                                            pedidosYaEnabled: !current.pedidosYaEnabled
                                        }
                                    })
                                    setConfig(getConfig())
                                }}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: 16,
                                    border: 'none',
                                    background: config.externalOrdering?.pedidosYaEnabled ? 'var(--color-success)' : 'var(--color-card)',
                                    color: config.externalOrdering?.pedidosYaEnabled ? 'white' : 'var(--color-text-muted)',
                                    fontSize: 'var(--font-size-sm)',
                                    cursor: 'pointer'
                                }}
                            >
                                {config.externalOrdering?.pedidosYaEnabled ? 'ON' : 'OFF'}
                            </button>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">PedidosYa link (external)</label>
                            <input
                                type="text"
                                className="form-input"
                                value={config.externalOrdering?.pedidosYaUrl || ''}
                                onChange={(e) => {
                                    const current = config.externalOrdering || {}
                                    updateConfig({
                                        externalOrdering: {
                                            ...current,
                                            pedidosYaUrl: e.target.value
                                        }
                                    })
                                    setConfig(getConfig())
                                }}
                                placeholder="https://..."
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Settings
