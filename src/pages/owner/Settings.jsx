import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getAuth, clearAuth, getOrders, setItem, getItem } from '../../utils/storage.js'
import { updateConfig, CURATED_FONTS, FONT_WEIGHTS, CONFIRMATION_COLORS, HERO_DEFAULT } from '../../config/appConfig.js'
import { DIVIDER_PRESETS } from '../../config/dividerPresets.js'
import { canChangeDeliveryConfig, recordDeliveryConfigChange, getDeliveryChangesThisMonth } from '../../utils/deliveryUtils.js'
import BrandingColorPicker from '../../components/BrandingColorPicker.jsx'
import HeroIconPicker from '../../components/HeroIconPicker.jsx'
import CoverImageEditor from '../../components/CoverImageEditor.jsx'
import BackendHeader from '../../components/BackendHeader.jsx'

// Shared Owner Tab Navigation
function OwnerTabs({ activeTab }) {
    const tabs = [
        { id: 'settings', path: '/owner/settings', label: 'Config' },
        { id: 'menu', path: '/owner/menu', label: 'Menú' },
        { id: 'delivery', path: '/owner/delivery', label: 'Envíos' },
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

// Section Header Component
function SectionHeader({ title }) {
    return (
        <h3 style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#64748B',
            marginBottom: 10,
            marginTop: 0,
            textTransform: 'uppercase',
            letterSpacing: '0.025em'
        }}>{title}</h3>
    )
}

// Card Component
function Card({ children, style = {} }) {
    return (
        <div style={{
            background: '#FFFFFF',
            borderRadius: 10,
            border: '1px solid #E2E8F0',
            padding: 16,
            ...style
        }}>
            {children}
        </div>
    )
}

// INVARIANT: Settings receives config via prop from App.jsx (single source of truth)
// Do NOT call getConfig() locally - breaks invariant during saves
function Settings({ config }) {
    const navigate = useNavigate()
    // Local form state for editable messages (initialized from prop)
    const [maintenanceMessage, setMaintenanceMessage] = useState(config?.maintenanceMessage || '')
    const [pauseMessage, setPauseMessage] = useState(config?.pauseOrdersMessage || '')
    const [businessInfo, setBusinessInfo] = useState(config?.businessInfo || {})
    const [showCoverEditor, setShowCoverEditor] = useState(false)

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
        window.dispatchEvent(new CustomEvent('frontendSync'))
    }

    const handleTogglePause = () => {
        updateConfig({ pauseOrders: !config.pauseOrders })
        window.dispatchEvent(new CustomEvent('frontendSync'))
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

    return (
        <div className="backend-surface" style={{ minHeight: '100vh', background: '#F8FAFC' }}>
            <BackendHeader
                title="Config"
                onLogout={handleLogout}
            />
            {/* Sync Button - Settings specific */}
            <div style={{ padding: '12px 16px', background: '#FFFFFF', borderBottom: '1px solid #E5E7EB' }}>
                <button
                    onClick={() => {
                        window.dispatchEvent(new CustomEvent('frontendSync'))
                        alert('✅ Frontend synced!')
                    }}
                    style={{
                        width: '100%',
                        padding: '10px 16px',
                        fontSize: 13,
                        fontWeight: 600,
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        background: '#3B82F6',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8
                    }}
                >
                    🔄 Refresh Frontend
                </button>
            </div>
            <OwnerTabs activeTab="settings" />

            <div style={{ padding: 16 }}>
                {/* Status Controls */}
                <div style={{ marginBottom: 20 }}>
                    <SectionHeader title="Estado del local" />
                    <Card>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingBottom: 12,
                            borderBottom: '1px solid #F1F5F9'
                        }}>
                            <div>
                                <p style={{ fontWeight: 500, fontSize: 14, color: '#1E293B', margin: 0 }}>Modo mantenimiento</p>
                                <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0' }}>Cierra todo el local</p>
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
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingTop: 12
                        }}>
                            <div>
                                <p style={{ fontWeight: 500, fontSize: 14, color: '#1E293B', margin: 0 }}>Pausar pedidos</p>
                                <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0' }}>Solo desactiva pedidos</p>
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
                    </Card>
                </div>

                {/* Order Archive Info */}
                <div style={{ marginBottom: 20 }}>
                    <SectionHeader title="Archivo de pedidos" />
                    <Card>
                        <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
                            ✓ Los pedidos se archivan automáticamente al marcarlos como entregados.
                        </p>
                    </Card>
                </div>

                {/* Delivery Configuration */}
                <div style={{ marginBottom: 20 }}>
                    <SectionHeader title="Configuración de Envíos" />
                    <Card>
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
                                        {message}
                                    </p>
                                </div>
                            )
                        })()}

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
                                    window.dispatchEvent(new CustomEvent('frontendSync'))
                                }}
                                placeholder="Usar dirección del local"
                            />
                            <p style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                                Si está vacío, se usa la dirección del Info del local
                            </p>
                        </div>

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
                                    window.dispatchEvent(new CustomEvent('frontendSync'))
                                }}
                                style={{ width: '100%' }}
                            />
                        </div>

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
                                    window.dispatchEvent(new CustomEvent('frontendSync'))
                                }}
                                placeholder="0 = gratis"
                            />
                        </div>

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
                                    window.dispatchEvent(new CustomEvent('frontendSync'))
                                }}
                                placeholder="0 = sin umbral"
                            />
                            <p style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                                Si el pedido supera este monto, el envío es gratis
                            </p>
                        </div>
                    </Card>
                </div>

                {/* Messages */}
                <div style={{ marginBottom: 20 }}>
                    <SectionHeader title="Mensajes" />
                    <Card>
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
                    </Card>
                </div>

                {/* Business Info */}
                <div style={{ marginBottom: 20 }}>
                    <SectionHeader title="Info del local" />
                    <Card>
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
                    </Card>
                </div>

                {/* Branding Customization */}
                <div style={{ marginBottom: 20 }}>
                    <SectionHeader title="Personalización de marca" />
                    <Card>
                        {/* Edit Cover Button (Parity with Super Admin) */}
                        <div className="form-group">
                            <label className="form-label">Imagen de portada</label>
                            <button
                                onClick={() => setShowCoverEditor(true)}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    background: '#3B82F6',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    borderRadius: 8,
                                    fontSize: 14,
                                    fontWeight: 500,
                                    cursor: 'pointer'
                                }}
                            >
                                Editar Portada
                            </button>
                            <p style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                                Configura la imagen de cabecera del negocio
                            </p>
                        </div>

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
                                    window.dispatchEvent(new CustomEvent('frontendSync'))
                                }}
                                style={{ fontFamily: config.branding?.fontFamily || 'Inter' }}
                            >
                                {CURATED_FONTS.map(font => (
                                    <option key={font.name} value={font.name} style={{ fontFamily: font.name }}>
                                        {font.label}
                                    </option>
                                ))}
                            </select>
                            <p style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                                Aplicado a todo el texto del negocio
                            </p>
                        </div>

                        {/* Font Weight Selector (Parity with Super Admin) */}
                        <div className="form-group">
                            <label className="form-label">Peso de fuente</label>
                            <select
                                className="form-input"
                                value={config.branding?.fontWeight || '400'}
                                onChange={(e) => {
                                    updateConfig({
                                        branding: {
                                            ...config.branding,
                                            fontWeight: e.target.value
                                        }
                                    })
                                    window.dispatchEvent(new CustomEvent('frontendSync'))
                                }}
                                style={{ fontWeight: config.branding?.fontWeight || '400' }}
                            >
                                {FONT_WEIGHTS.map(weight => (
                                    <option key={weight.value} value={weight.value}>
                                        {weight.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Color Pickers (Parity with Super Admin) */}
                        <div className="form-group">
                            <label className="form-label">Colores del tema</label>
                            <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                                <div>
                                    <p style={{ fontSize: 10, color: '#64748B', marginBottom: 4 }}>Primario</p>
                                    <input
                                        type="color"
                                        value={config.colors?.primary || '#B8956A'}
                                        onChange={(e) => {
                                            updateConfig({ colors: { ...config.colors, primary: e.target.value } })
                                            window.dispatchEvent(new CustomEvent('frontendSync'))
                                        }}
                                        style={{ width: 50, height: 40, border: 'none', borderRadius: 8, cursor: 'pointer' }}
                                    />
                                </div>
                                <div>
                                    <p style={{ fontSize: 10, color: '#64748B', marginBottom: 4 }}>Secundario</p>
                                    <input
                                        type="color"
                                        value={config.colors?.primaryLight || '#A89070'}
                                        onChange={(e) => {
                                            updateConfig({ colors: { ...config.colors, primaryLight: e.target.value } })
                                            window.dispatchEvent(new CustomEvent('frontendSync'))
                                        }}
                                        style={{ width: 50, height: 40, border: 'none', borderRadius: 8, cursor: 'pointer' }}
                                    />
                                </div>
                                <div>
                                    <p style={{ fontSize: 10, color: '#64748B', marginBottom: 4 }}>Confirmación</p>
                                    <input
                                        type="color"
                                        value={config.colors?.confirmation || '#22C55E'}
                                        onChange={(e) => {
                                            updateConfig({ colors: { ...config.colors, confirmation: e.target.value } })
                                            window.dispatchEvent(new CustomEvent('frontendSync'))
                                        }}
                                        style={{ width: 50, height: 40, border: 'none', borderRadius: 8, cursor: 'pointer' }}
                                    />
                                </div>
                                <div>
                                    <p style={{ fontSize: 10, color: '#64748B', marginBottom: 4 }}>Powered by</p>
                                    <input
                                        type="color"
                                        value={config.branding?.poweredByColor || '#C4856A'}
                                        onChange={(e) => {
                                            updateConfig({ branding: { ...config.branding, poweredByColor: e.target.value } })
                                            window.dispatchEvent(new CustomEvent('frontendSync'))
                                        }}
                                        style={{ width: 50, height: 40, border: 'none', borderRadius: 8, cursor: 'pointer' }}
                                    />
                                </div>
                            </div>
                        </div>

                        <BrandingColorPicker
                            primaryColor={config.branding?.primaryColor || '#8B7355'}
                            iconColorMode={config.branding?.iconColorMode || 'white'}
                            onColorChange={(color) => {
                                updateConfig({ branding: { ...config.branding, primaryColor: color } })
                                window.dispatchEvent(new CustomEvent('frontendSync'))
                            }}
                            onIconModeChange={(mode) => {
                                updateConfig({ branding: { ...config.branding, iconColorMode: mode } })
                                window.dispatchEvent(new CustomEvent('frontendSync'))
                            }}
                        />

                        <div className="form-group">
                            <label className="form-label">Hero Icons (Inicio)</label>
                            <p style={{ fontSize: 11, color: '#64748B', marginBottom: 12 }}>
                                Color de fondo e ícono para cada tile
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                {['menu', 'delivery', 'rewards', 'game'].map(iconId => {
                                    const iconConfig = config.heroIcons?.[iconId] || HERO_DEFAULT
                                    const labels = { menu: 'Menú', delivery: 'Envíos', rewards: 'Rewards', game: 'Juego' }
                                    return (
                                        <HeroIconPicker
                                            key={iconId}
                                            label={labels[iconId]}
                                            iconId={iconId}
                                            color={iconConfig.color}
                                            iconColorMode={iconConfig.iconColorMode}
                                            onColorChange={(newColor) => {
                                                updateConfig({
                                                    heroIcons: {
                                                        ...config.heroIcons,
                                                        [iconId]: { ...iconConfig, color: newColor }
                                                    }
                                                })
                                                window.dispatchEvent(new CustomEvent('frontendSync'))
                                            }}
                                            onIconModeChange={(mode) => {
                                                updateConfig({
                                                    heroIcons: {
                                                        ...config.heroIcons,
                                                        [iconId]: { ...iconConfig, iconColorMode: mode }
                                                    }
                                                })
                                                window.dispatchEvent(new CustomEvent('frontendSync'))
                                            }}
                                        />
                                    )
                                })}
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">🌙 Modo Oscuro</label>
                            <p style={{ fontSize: 11, color: '#64748B', marginBottom: 12 }}>
                                Tema de la aplicación
                            </p>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                    onClick={() => {
                                        updateConfig({ canvasMode: 'light' })
                                        window.dispatchEvent(new CustomEvent('frontendSync'))
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: '12px 16px',
                                        borderRadius: 8,
                                        border: config.canvasMode === 'light' || !config.canvasMode ? '2px solid #3B82F6' : '1px solid #E2E8F0',
                                        background: '#FFFFFF',
                                        color: '#1E293B',
                                        fontSize: 13,
                                        fontWeight: 500,
                                        cursor: 'pointer'
                                    }}
                                >
                                    ☀️ Claro
                                </button>
                                <button
                                    onClick={() => {
                                        updateConfig({ canvasMode: 'dark' })
                                        window.dispatchEvent(new CustomEvent('frontendSync'))
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: '12px 16px',
                                        borderRadius: 8,
                                        border: config.canvasMode === 'dark' ? '2px solid #3B82F6' : '1px solid #E2E8F0',
                                        background: '#1E293B',
                                        color: '#FFFFFF',
                                        fontSize: 13,
                                        fontWeight: 500,
                                        cursor: 'pointer'
                                    }}
                                >
                                    🌙 Oscuro
                                </button>
                            </div>
                        </div>

                        {/* INFO PILL COLORS — Pill customization */}
                        <div className="form-group">
                            <label className="form-label">🔘 Info Pill Colors</label>
                            <p style={{ fontSize: 11, color: '#64748B', marginBottom: 12 }}>
                                Personaliza los colores de los botones en la página Info
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                {[
                                    { id: 'whatsapp', label: 'WhatsApp', icon: '💬' },
                                    { id: 'mercadoPago', label: 'Mercado Pago', icon: '💳' },
                                    { id: 'rappi', label: 'Rappi', icon: '🛵' },
                                    { id: 'pedidosYa', label: 'PedidosYa', icon: '🍕' },
                                    { id: 'demo', label: 'Demo', icon: '🎮' },
                                    { id: 'adminAccess', label: 'Admin', icon: '🔒' },
                                ].map(pill => {
                                    const pillConfig = config.infoPills?.[pill.id] || {}
                                    const bgColor = pillConfig.bgColor || (pill.id === 'whatsapp' ? '#C4856A' : pill.id === 'mercadoPago' ? '#FFE600' : pill.id === 'rappi' ? '#FF5A00' : pill.id === 'pedidosYa' ? '#E31837' : pill.id === 'demo' ? '#84CC16' : '#FFFFFF')
                                    const textColor = pillConfig.textColor || (pill.id === 'mercadoPago' ? '#009EE3' : pill.id === 'adminAccess' ? '#9CA3AF' : '#FFFFFF')
                                    return (
                                        <button
                                            key={pill.id}
                                            onClick={() => {
                                                const input = document.getElementById(`owner-pill-color-${pill.id}`)
                                                if (input) input.click()
                                            }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 6,
                                                padding: '10px 12px',
                                                backgroundColor: bgColor,
                                                color: textColor,
                                                borderRadius: 20,
                                                border: pill.id === 'adminAccess' ? '1px solid #E5E7EB' : 'none',
                                                fontSize: 12,
                                                fontWeight: 500,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <span>{pill.icon}</span>
                                            <span>{pill.label}</span>
                                            <input
                                                id={`owner-pill-color-${pill.id}`}
                                                type="color"
                                                value={bgColor}
                                                onChange={(e) => {
                                                    updateConfig({
                                                        infoPills: {
                                                            ...config.infoPills,
                                                            [pill.id]: { ...pillConfig, bgColor: e.target.value }
                                                        }
                                                    })
                                                    window.dispatchEvent(new CustomEvent('frontendSync'))
                                                }}
                                                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                                            />
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* CAMERA BRANDING — Icon and color customization */}
                        <div className="form-group">
                            <label className="form-label">📷 Camera Button</label>
                            <p style={{ fontSize: 11, color: '#64748B', marginBottom: 12 }}>
                                Personaliza el botón de cámara en la navegación
                            </p>

                            {/* Enable toggle */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                                <span style={{ fontSize: 13, fontWeight: 500, color: '#1E293B' }}>Estilo personalizado</span>
                                <button
                                    onClick={() => {
                                        updateConfig({ camera: { ...config.camera, enabled: !config.camera?.enabled } })
                                        window.dispatchEvent(new CustomEvent('frontendSync'))
                                    }}
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: 16,
                                        border: 'none',
                                        backgroundColor: config.camera?.enabled ? '#22C55E' : '#E2E8F0',
                                        color: config.camera?.enabled ? 'white' : '#64748B',
                                        fontSize: 12,
                                        fontWeight: 500,
                                        cursor: 'pointer'
                                    }}
                                >
                                    {config.camera?.enabled ? 'ON' : 'OFF'}
                                </button>
                            </div>

                            {/* Icon selector (only when enabled) */}
                            {config.camera?.enabled && (
                                <>
                                    <p style={{ fontSize: 11, color: '#64748B', marginBottom: 8 }}>Ícono de cámara</p>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
                                        {[
                                            { id: 'default', label: 'Default' },
                                            { id: 'camera', label: 'Camera' },
                                            { id: 'aperture', label: 'Aperture' },
                                            { id: 'webcam', label: 'Webcam' }
                                        ].map(icon => {
                                            const isSelected = (config.camera?.icon || 'default') === icon.id
                                            return (
                                                <button
                                                    key={icon.id}
                                                    onClick={() => {
                                                        updateConfig({ camera: { ...config.camera, icon: icon.id } })
                                                        window.dispatchEvent(new CustomEvent('frontendSync'))
                                                    }}
                                                    style={{
                                                        padding: '12px 8px',
                                                        borderRadius: 12,
                                                        border: isSelected ? '2px solid #3B82F6' : '1px solid #E2E8F0',
                                                        backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        gap: 4
                                                    }}
                                                >
                                                    <span style={{ fontSize: 20 }}>
                                                        {icon.id === 'default' ? '📷' : icon.id === 'camera' ? '📸' : icon.id === 'aperture' ? '🎯' : '🖥️'}
                                                    </span>
                                                    <span style={{ fontSize: 10, color: '#64748B' }}>{icon.label}</span>
                                                </button>
                                            )
                                        })}
                                    </div>

                                    {/* Color picker */}
                                    <p style={{ fontSize: 11, color: '#64748B', marginBottom: 8 }}>Color del botón</p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                        <input
                                            type="color"
                                            value={config.camera?.color || '#8B7355'}
                                            onChange={(e) => {
                                                updateConfig({ camera: { ...config.camera, color: e.target.value } })
                                                window.dispatchEvent(new CustomEvent('frontendSync'))
                                            }}
                                            style={{ width: 48, height: 48, border: 'none', borderRadius: 8, cursor: 'pointer' }}
                                        />
                                        <div style={{
                                            width: 48, height: 48, borderRadius: '50%',
                                            backgroundColor: config.camera?.color || '#8B7355',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                                        }}>
                                            <span style={{ fontSize: 20 }}>📷</span>
                                        </div>
                                        <span style={{ fontSize: 11, color: '#64748B', fontFamily: 'monospace' }}>
                                            {(config.camera?.color || '#8B7355').toUpperCase()}
                                        </span>
                                    </div>

                                    {/* Text color toggle */}
                                    <p style={{ fontSize: 11, color: '#64748B', marginBottom: 8 }}>Color del ícono</p>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        {['auto', 'white', 'black'].map(mode => {
                                            const isSelected = (config.camera?.textColor || 'auto') === mode
                                            return (
                                                <button
                                                    key={mode}
                                                    onClick={() => {
                                                        updateConfig({ camera: { ...config.camera, textColor: mode } })
                                                        window.dispatchEvent(new CustomEvent('frontendSync'))
                                                    }}
                                                    style={{
                                                        flex: 1,
                                                        padding: '8px 12px',
                                                        borderRadius: 8,
                                                        border: isSelected ? '2px solid #3B82F6' : '1px solid #E2E8F0',
                                                        backgroundColor: mode === 'black' ? '#1E293B' : mode === 'white' ? '#FFFFFF' : '#F1F5F9',
                                                        color: mode === 'black' ? '#FFFFFF' : mode === 'white' ? '#1E293B' : '#64748B',
                                                        fontSize: 12,
                                                        fontWeight: 500,
                                                        cursor: 'pointer',
                                                        textTransform: 'capitalize'
                                                    }}
                                                >
                                                    {mode}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </>
                            )}
                        </div>

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
                                            window.dispatchEvent(new CustomEvent('frontendSync'))
                                        }}
                                        style={{
                                            width: 36,
                                            height: 36,
                                            borderRadius: 8,
                                            backgroundColor: color.value,
                                            border: config.colors?.confirmation === color.value ? '3px solid #1E293B' : '2px solid #E2E8F0',
                                            cursor: 'pointer'
                                        }}
                                        title={color.label}
                                    />
                                ))}
                            </div>
                            <p style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                                Para botones de confirmar pedido y acciones positivas
                            </p>
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Color "Powered by"</label>
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
                                    window.dispatchEvent(new CustomEvent('frontendSync'))
                                }}
                                style={{
                                    width: 60,
                                    height: 36,
                                    border: '2px solid #E2E8F0',
                                    borderRadius: 8,
                                    cursor: 'pointer',
                                    padding: 2
                                }}
                            />
                        </div>

                        <div className="form-group" style={{ marginTop: 16 }}>
                            <label className="form-label">Imagen decorativa (Menú/Pedido)</label>
                            <p style={{ fontSize: 11, color: '#64748B', marginBottom: 8 }}>
                                Aparece debajo del nombre del negocio
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                                {DIVIDER_PRESETS.map(preset => (
                                    <div
                                        key={preset.id}
                                        onClick={() => {
                                            updateConfig({ dividerPresetId: preset.id })
                                            window.dispatchEvent(new CustomEvent('frontendSync'))
                                        }}
                                        style={{
                                            cursor: 'pointer',
                                            borderRadius: 8,
                                            overflow: 'hidden',
                                            border: config.dividerPresetId === preset.id ? '3px solid #3B82F6' : '2px solid #E2E8F0',
                                            opacity: config.dividerPresetId === preset.id ? 1 : 0.7
                                        }}
                                    >
                                        <img src={preset.url} alt={preset.name} style={{ width: '100%', height: 40, objectFit: 'cover' }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>
                </div>

                {/* External Ordering Links */}
                <div style={{ marginBottom: 20 }}>
                    <SectionHeader title="Pedidos externos" />
                    <Card>
                        <p style={{ fontSize: 12, color: '#64748B', marginBottom: 16, marginTop: 0 }}>
                            Links externos para delivery. Aparecen en la pestaña Info.
                        </p>

                        {/* Rappi */}
                        <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #F1F5F9' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <span style={{ fontWeight: 500, fontSize: 14, color: '#1E293B' }}>Rappi</span>
                                <button
                                    onClick={() => {
                                        const current = config.externalOrdering || {}
                                        updateConfig({
                                            externalOrdering: {
                                                ...current,
                                                rappiEnabled: !current.rappiEnabled
                                            }
                                        })
                                        window.dispatchEvent(new CustomEvent('frontendSync'))
                                    }}
                                    style={{
                                        padding: '4px 12px',
                                        borderRadius: 12,
                                        border: 'none',
                                        background: config.externalOrdering?.rappiEnabled ? '#22C55E' : '#E2E8F0',
                                        color: config.externalOrdering?.rappiEnabled ? 'white' : '#64748B',
                                        fontSize: 11,
                                        fontWeight: 500,
                                        cursor: 'pointer'
                                    }}
                                >
                                    {config.externalOrdering?.rappiEnabled ? 'ON' : 'OFF'}
                                </button>
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
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
                                        window.dispatchEvent(new CustomEvent('frontendSync'))
                                    }}
                                    placeholder="https://..."
                                />
                            </div>
                        </div>

                        {/* PedidosYa */}
                        <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #F1F5F9' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <span style={{ fontWeight: 500, fontSize: 14, color: '#1E293B' }}>PedidosYa</span>
                                <button
                                    onClick={() => {
                                        const current = config.externalOrdering || {}
                                        updateConfig({
                                            externalOrdering: {
                                                ...current,
                                                pedidosYaEnabled: !current.pedidosYaEnabled
                                            }
                                        })
                                        window.dispatchEvent(new CustomEvent('frontendSync'))
                                    }}
                                    style={{
                                        padding: '4px 12px',
                                        borderRadius: 12,
                                        border: 'none',
                                        background: config.externalOrdering?.pedidosYaEnabled ? '#22C55E' : '#E2E8F0',
                                        color: config.externalOrdering?.pedidosYaEnabled ? 'white' : '#64748B',
                                        fontSize: 11,
                                        fontWeight: 500,
                                        cursor: 'pointer'
                                    }}
                                >
                                    {config.externalOrdering?.pedidosYaEnabled ? 'ON' : 'OFF'}
                                </button>
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
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
                                        window.dispatchEvent(new CustomEvent('frontendSync'))
                                    }}
                                    placeholder="https://..."
                                />
                            </div>
                        </div>

                        {/* Mercado Pago Alias */}
                        <div>
                            <span style={{ fontWeight: 500, fontSize: 14, color: '#1E293B', display: 'block', marginBottom: 8 }}>Mercado Pago</span>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Alias (para copiar)</label>
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
                                        window.dispatchEvent(new CustomEvent('frontendSync'))
                                    }}
                                    placeholder="ej: grubclub.mp"
                                />
                                <p style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                                    Si está vacío, no aparece el botón en Info
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Cover Image Editor Modal (Parity with Super Admin) */}
            <CoverImageEditor
                isOpen={showCoverEditor}
                onClose={() => setShowCoverEditor(false)}
                onSave={(coverData) => {
                    updateConfig({ headerCover: coverData })
                    window.dispatchEvent(new CustomEvent('frontendSync'))
                    setShowCoverEditor(false)
                }}
                initialData={config.headerCover}
                config={config}
            />
        </div>
    )
}

export default Settings
