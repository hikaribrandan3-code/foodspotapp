import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getAuth, clearAuth, getOrders, setItem, getItem } from '../../utils/storage.js'
import { getConfig, updateConfig, CURATED_FONTS, CONFIRMATION_COLORS } from '../../config/appConfig.js'
import { DIVIDER_PRESETS } from '../../config/dividerPresets.js'
import { canChangeDeliveryConfig, recordDeliveryConfigChange, getDeliveryChangesThisMonth } from '../../utils/deliveryUtils.js'
import BrandingColorPicker from '../../components/BrandingColorPicker.jsx'

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

    // NOTE: Orders are now auto-archived on 'entregado' status (Order Lifecycle V1)
    // See storage.js updateOrder()

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

            {/* Order Archive Info */}
            <div className="admin-section">
                <h3 className="admin-section-title">🗂️ Archivo de pedidos</h3>
                <div className="admin-card">
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                        ✅ Los pedidos se archivan automáticamente al marcarlos como entregados.
                    </p>
                </div>
            </div>

            {/* Delivery Configuration (v1 Minimal) */}
            <div className="admin-section">
                <h3 className="admin-section-title">🚴 Configuración de Envíos</h3>
                <div className="admin-card">
                    {/* Change Limit Status */}
                    {(() => {
                        const { allowed, remaining, message } = canChangeDeliveryConfig()
                        return (
                            <div style={{
                                background: allowed ? '#ECFDF5' : '#FEF2F2',
                                padding: 10,
                                borderRadius: 8,
                                marginBottom: 16,
                                fontSize: 12
                            }}>
                                <p style={{
                                    color: allowed ? '#065F46' : '#991B1B',
                                    margin: 0,
                                    fontWeight: 500
                                }}>
                                    📊 {message}
                                </p>
                            </div>
                        )
                    })()}

                    {/* Origin Address */}
                    <div className="form-group">
                        <label className="form-label">Dirección de origen (para radio)</label>
                        <input
                            type="text"
                            className="form-input"
                            value={config.delivery?.originAddress || config.businessInfo?.address || ''}
                            onChange={(e) => {
                                const { allowed } = canChangeDeliveryConfig()
                                if (!allowed) {
                                    alert('❌ Límite de cambios alcanzado (2 por mes)')
                                    return
                                }
                                if (!confirm('¿Confirmar cambio de dirección de origen? (Cuenta como 1 de 2 cambios mensuales)')) {
                                    return
                                }
                                const oldValue = config.delivery?.originAddress || ''
                                recordDeliveryConfigChange('originAddress', oldValue, e.target.value)
                                updateConfig({
                                    delivery: {
                                        ...config.delivery,
                                        originAddress: e.target.value
                                    }
                                })
                                setConfig(getConfig())
                            }}
                            placeholder="Usar dirección del local"
                        />
                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>
                            Si está vacío, se usa la dirección del Info del local
                        </p>
                    </div>

                    {/* Radius Slider */}
                    <div className="form-group">
                        <label className="form-label">Radio de entrega: {config.delivery?.radiusKm || 5} km</label>
                        <input
                            type="range"
                            min="1"
                            max="15"
                            value={config.delivery?.radiusKm || 5}
                            onChange={(e) => {
                                const { allowed } = canChangeDeliveryConfig()
                                if (!allowed) {
                                    alert('❌ Límite de cambios alcanzado (2 por mes)')
                                    return
                                }
                                const newValue = parseInt(e.target.value)
                                const oldValue = config.delivery?.radiusKm || 5
                                if (newValue !== oldValue) {
                                    if (!confirm(`¿Cambiar radio a ${newValue} km? (Cuenta como 1 de 2 cambios mensuales)`)) {
                                        return
                                    }
                                    recordDeliveryConfigChange('radiusKm', oldValue, newValue)
                                }
                                updateConfig({
                                    delivery: {
                                        ...config.delivery,
                                        radiusKm: newValue
                                    }
                                })
                                setConfig(getConfig())
                            }}
                            style={{ width: '100%' }}
                        />
                    </div>

                    {/* Flat Delivery Fee */}
                    <div className="form-group">
                        <label className="form-label">Tarifa de envío fija ($)</label>
                        <input
                            type="number"
                            className="form-input"
                            min="0"
                            step="50"
                            value={config.delivery?.flatFee || 0}
                            onChange={(e) => {
                                updateConfig({
                                    delivery: {
                                        ...config.delivery,
                                        flatFee: parseInt(e.target.value) || 0
                                    }
                                })
                                setConfig(getConfig())
                            }}
                            placeholder="0 = gratis"
                        />
                    </div>

                    {/* Free Delivery Threshold */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Envío gratis desde ($)</label>
                        <input
                            type="number"
                            className="form-input"
                            min="0"
                            step="100"
                            value={config.delivery?.freeDeliveryThreshold || 0}
                            onChange={(e) => {
                                updateConfig({
                                    delivery: {
                                        ...config.delivery,
                                        freeDeliveryThreshold: parseInt(e.target.value) || 0
                                    }
                                })
                                setConfig(getConfig())
                            }}
                            placeholder="0 = sin umbral"
                        />
                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>
                            Si el pedido supera este monto, el envío es gratis
                        </p>
                    </div>
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

                    {/* Phase 1 Navbar Branding - Color Picker Component */}
                    <BrandingColorPicker
                        primaryColor={config.branding?.primaryColor || '#8B7355'}
                        iconColorMode={config.branding?.iconColorMode || 'white'}
                        onColorChange={(color) => {
                            updateConfig({ branding: { ...config.branding, primaryColor: color } })
                            setConfig(getConfig())
                        }}
                        onIconModeChange={(mode) => {
                            updateConfig({ branding: { ...config.branding, iconColorMode: mode } })
                            setConfig(getConfig())
                        }}
                    />

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

                    {/* Divider Preset Selector */}
                    <div className="form-group" style={{ marginTop: 16 }}>
                        <label className="form-label">Imagen decorativa (Menú/Pedido)</label>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 8 }}>
                            Aparece debajo del nombre del negocio
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                            {DIVIDER_PRESETS.map(preset => (
                                <div
                                    key={preset.id}
                                    onClick={() => {
                                        updateConfig({ dividerPresetId: preset.id })
                                        setConfig(getConfig())
                                    }}
                                    style={{
                                        cursor: 'pointer',
                                        borderRadius: 8,
                                        overflow: 'hidden',
                                        border: config.dividerPresetId === preset.id ? '3px solid var(--color-success)' : '2px solid var(--color-card)',
                                        opacity: config.dividerPresetId === preset.id ? 1 : 0.7
                                    }}
                                >
                                    <img src={preset.url} alt={preset.name} style={{ width: '100%', height: 40, objectFit: 'cover' }} />
                                </div>
                            ))}
                        </div>
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

                    {/* Mercado Pago Alias */}
                    <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--color-card)' }}>
                        <span style={{ fontWeight: 'var(--font-weight-semibold)', display: 'block', marginBottom: 'var(--space-2)' }}>💳 Mercado Pago</span>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Alias Mercado Pago (para copiar)</label>
                            <input
                                type="text"
                                className="form-input"
                                value={config.payments?.mercadoPagoAlias || ''}
                                onChange={(e) => {
                                    const current = config.payments || {}
                                    updateConfig({
                                        payments: {
                                            ...current,
                                            mercadoPagoAlias: e.target.value
                                        }
                                    })
                                    setConfig(getConfig())
                                }}
                                placeholder="ej: grubclub.mp"
                            />
                            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>
                                Si está vacío, no aparece el botón en Info
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Settings
