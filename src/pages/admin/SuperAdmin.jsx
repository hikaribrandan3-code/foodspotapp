import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getOrders } from '../../utils/storage.js'
import { login, logout, getSession } from '../../utils/auth.js'
import { getConfig, updateConfig, CURATED_FONTS, CONFIRMATION_COLORS, FONT_WEIGHTS } from '../../config/appConfig.js'
import { getMenu, saveMenu, updateMenuItem, addMenuItem, removeMenuItem } from '../../config/menuData.js'
import { DIVIDER_PRESETS } from '../../config/dividerPresets.js'
import { processAndStoreImage, formatFileSize } from '../../utils/imageOptimizer.js'
import BrandingColorPicker from '../../components/BrandingColorPicker.jsx'

// Generate seeded demo analytics data (30 days)
function generateDemoData() {
    const data = []
    const today = new Date()
    for (let i = 29; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        const baseValue = 1500 + (29 - i) * 80
        const variation = Math.sin(i * 0.5) * 400 + Math.random() * 300
        data.push({
            date: date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }),
            value: Math.round(baseValue + variation),
            orders: Math.round(8 + (29 - i) * 0.4 + Math.random() * 5)
        })
    }
    return data
}

// User mode storage key
const USER_MODE_KEY = 'grub_user_mode'

// Get/set user mode (owner/staff/customer)
export function getUserMode() {
    try {
        return localStorage.getItem(USER_MODE_KEY) || null
    } catch (e) {
        return null
    }
}

export function setUserMode(mode) {
    try {
        localStorage.setItem(USER_MODE_KEY, mode)
        return true
    } catch (e) {
        return false
    }
}

function SuperAdmin() {
    const navigate = useNavigate()
    const [config, setConfig] = useState(() => getConfig())
    const [menu, setMenu] = useState(() => getMenu())
    const [orders, setOrders] = useState(() => getOrders())
    const [activeTab, setActiveTab] = useState('resumen')
    const [demoAnalytics, setDemoAnalytics] = useState(true)
    const [demoData] = useState(() => generateDemoData())
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [userRole, setUserRole] = useState('superadmin')
    const [error, setError] = useState('')
    const [editingItem, setEditingItem] = useState(null)

    // Mode selector state
    const [selectedMode, setSelectedMode] = useState(() => getUserMode() || 'owner')

    // Image upload state
    const [uploadingItemId, setUploadingItemId] = useState(null)
    const [uploadStatus, setUploadStatus] = useState(null)
    const [uploadingFeaturedSlot, setUploadingFeaturedSlot] = useState(null)
    const menuImageInputRef = useRef(null)
    const featuredImageInputRef = useRef(null)

    useEffect(() => {
        const session = getSession()
        if (session && (session.role === 'superadmin' || session.role === 'owner' || session.role === 'staff')) {
            setIsAuthenticated(true)
            setUserRole(session.role)
            // Default to owner mode for superadmin if not set
            if (session.role === 'superadmin' && !getUserMode()) {
                setUserMode('owner')
                setSelectedMode('owner')
            }
        }
    }, [])

    useEffect(() => {
        const interval = setInterval(() => {
            setConfig(getConfig())
            setOrders(getOrders())
            setMenu(getMenu())
        }, 2000)
        return () => clearInterval(interval)
    }, [])

    const handleLogin = (e) => {
        e.preventDefault()
        const result = login(username, password)
        if (result.success) {
            setIsAuthenticated(true)
            setUserRole(result.role)
            setError('')
        } else {
            setError('Credenciales incorrectas')
        }
    }

    const handleLogout = () => {
        logout()
        setIsAuthenticated(false)
        navigate('/')
    }

    // Stats calculations
    const today = new Date().toDateString()
    const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === today)
    const mpOrders = todayOrders.filter(o => o.paymentMethod === 'mercadopago')
    const cashOrders = todayOrders.filter(o => o.paymentMethod === 'efectivo' || !o.paymentMethod)
    const mpTotal = mpOrders.reduce((sum, o) => sum + (o.total || 0), 0)
    const cashTotal = cashOrders.reduce((sum, o) => sum + (o.total || 0), 0)
    const totalToday = mpTotal + cashTotal

    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
    const monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth() - 1)
    const weekOrders = orders.filter(o => new Date(o.createdAt) >= weekAgo)
    const monthOrders = orders.filter(o => new Date(o.createdAt) >= monthAgo)
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0)

    const demoTotalSales = demoData.reduce((sum, d) => sum + d.value, 0)
    const demoTotalOrders = demoData.reduce((sum, d) => sum + d.orders, 0)

    // Update business info
    const updateBusinessInfo = (field, value) => {
        const newInfo = { ...config.businessInfo, [field]: value }
        updateConfig({ businessInfo: newInfo })
        setConfig(getConfig())
    }

    // Update menu item
    const handleUpdateMenuItem = (categoryId, itemId, updates) => {
        updateMenuItem(categoryId, itemId, updates)
        setMenu(getMenu())
    }

    // Add new menu item
    const handleAddMenuItem = (categoryId) => {
        addMenuItem(categoryId, { name: 'Nuevo item', price: 0 })
        setMenu(getMenu())
    }

    // Remove menu item
    const handleRemoveMenuItem = (categoryId, itemId) => {
        if (confirm('¿Eliminar este item?')) {
            removeMenuItem(categoryId, itemId)
            setMenu(getMenu())
        }
    }

    // Menu item image upload handler
    const handleMenuImageUpload = async (e, categoryId, itemId) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploadingItemId(`${categoryId}-${itemId}`)
        setUploadStatus(null)

        try {
            const result = await processAndStoreImage(file)
            handleUpdateMenuItem(categoryId, itemId, { image: result.dataURI })
            setUploadStatus({
                success: true,
                message: `✔ ${formatFileSize(result.originalSize)} → ${formatFileSize(result.optimizedSize)}`
            })
        } catch (error) {
            setUploadStatus({ success: false, message: error.message })
        } finally {
            setUploadingItemId(null)
        }
    }

    // Featured image upload handler
    const handleFeaturedImageUpload = async (e, slotIndex) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploadingFeaturedSlot(slotIndex)
        setUploadStatus(null)

        try {
            const result = await processAndStoreImage(file)
            const newPhotos = [...(config.featuredPhotos || [
                { slot: 1, image: null },
                { slot: 2, image: null },
                { slot: 3, image: null },
                { slot: 4, image: null },
            ])]
            newPhotos[slotIndex] = { ...newPhotos[slotIndex], image: result.dataURI }
            updateConfig({ featuredPhotos: newPhotos })
            setConfig(getConfig())
            setUploadStatus({
                success: true,
                message: `✔ ${formatFileSize(result.originalSize)} → ${formatFileSize(result.optimizedSize)}`
            })
        } catch (error) {
            setUploadStatus({ success: false, message: error.message })
        } finally {
            setUploadingFeaturedSlot(null)
        }
    }

    // Login screen
    if (!isAuthenticated) {
        return (
            <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #F8F6F3 0%, #F0EDE8 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                <div style={{ marginBottom: 24 }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ color: '#B8A089' }}>
                        <rect x="5" y="10" width="14" height="11" rx="2" fill="currentColor" />
                        <path d="M8 10V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
                    </svg>
                </div>
                <h1 style={{ fontSize: 24, fontWeight: 600, color: '#4A4340', marginBottom: 8 }}>Panel Admin</h1>
                <p style={{ fontSize: 14, color: '#8B8580', marginBottom: 28 }}>Ingresá tus credenciales</p>
                <form onSubmit={handleLogin} style={{ width: '100%', maxWidth: 300 }}>
                    <input type="text" placeholder="Usuario" value={username} onChange={(e) => setUsername(e.target.value)} style={{ width: '100%', padding: '14px 18px', fontSize: 15, border: '1px solid #E0DCD6', borderRadius: 24, background: 'white', marginBottom: 10, boxSizing: 'border-box' }} />
                    <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '14px 18px', fontSize: 15, border: '1px solid #E0DCD6', borderRadius: 24, background: 'white', marginBottom: 14, boxSizing: 'border-box' }} />
                    {error && <p style={{ color: '#B85450', textAlign: 'center', fontSize: 13, marginBottom: 10 }}>{error}</p>}
                    <button type="submit" style={{ width: '100%', padding: '14px', fontSize: 15, fontWeight: 600, color: 'white', background: '#B8956A', border: 'none', borderRadius: 24, cursor: 'pointer', marginBottom: 10 }}>Ingresar</button>
                    <button type="button" onClick={() => navigate('/')} style={{ width: '100%', padding: '12px', fontSize: 14, color: '#6B6560', background: 'white', border: '1px solid #E0DCD6', borderRadius: 24, cursor: 'pointer' }}>← Volver</button>
                </form>
            </div>
        )
    }
    // Mode options for dropdown (superadmin only)
    const modeOptions = [
        { value: 'owner', label: '👑 Owner', color: '#22C55E' },
        { value: 'staff', label: '👤 Staff', color: '#6366F1' },
        { value: 'customer', label: '🛒 Customer', color: '#F59E0B' }
    ]

    // Handle mode change from dropdown
    const handleModeChange = (mode) => {
        setUserMode(mode)
        setSelectedMode(mode)
    }

    const tabs = [
        { id: 'resumen', label: 'Resumen' },
        { id: 'info', label: 'Info' },
        { id: 'menu', label: 'Menú' },
        { id: 'branding', label: 'Branding' },
        { id: 'pedidos', label: 'Pedidos' },
        { id: 'analytics', label: 'Analytics' },
        { id: 'historial', label: 'Historial' },
    ]

    const roleLabel = userRole === 'superadmin' ? 'Super Admin' : userRole === 'owner' ? 'Owner' : 'Staff'
    const canEdit = userRole === 'superadmin' || userRole === 'owner'

    // Card style helper
    const cardStyle = { background: 'white', borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }
    const labelStyle = { fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }
    const inputStyle = { width: '100%', padding: '12px 14px', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 14, boxSizing: 'border-box', marginBottom: 12 }

    return (
        <div style={{ minHeight: '100vh', background: '#F5F2EE', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            {/* Dark Header */}
            <div style={{ background: '#1F2937', padding: '16px 16px 14px', color: 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'white', fontSize: 20, cursor: 'pointer', padding: 0 }}>←</button>
                        <div>
                            <h1 style={{ fontSize: 17, fontWeight: 600, margin: 0 }}>Panel de Administración</h1>
                            <p style={{ fontSize: 12, color: '#9CA3AF', margin: '2px 0 0' }}>{roleLabel} · Gestión del local</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {userRole === 'superadmin' && <span style={{ padding: '4px 8px', background: '#22C55E', borderRadius: 5, fontSize: 9, fontWeight: 700, color: 'white' }}>SUPER ADMIN</span>}
                        {demoAnalytics && userRole === 'superadmin' && <span style={{ padding: '4px 6px', background: '#EAB308', borderRadius: 5, fontSize: 9, fontWeight: 600, color: 'white' }}>DEMO</span>}
                        {/* Mode Switcher Dropdown (superadmin only) */}
                        {userRole === 'superadmin' && (
                            <select
                                value={selectedMode || 'owner'}
                                onChange={(e) => handleModeChange(e.target.value)}
                                style={{
                                    padding: '4px 20px 4px 8px',
                                    fontSize: 10,
                                    fontWeight: 600,
                                    border: 'none',
                                    borderRadius: 5,
                                    cursor: 'pointer',
                                    background: `${modeOptions.find(m => m.value === selectedMode)?.color || '#22C55E'} url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'%3E%3Cpath fill='white' d='M0 2l4 4 4-4z'/%3E%3C/svg%3E") no-repeat right 6px center`,
                                    color: 'white',
                                    position: 'relative',
                                    zIndex: 10,
                                    pointerEvents: 'auto',
                                    WebkitTapHighlightColor: 'transparent',
                                    minWidth: 70
                                }}
                            >
                                {modeOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div style={{ background: 'white', borderBottom: '1px solid #E5E7EB', display: 'flex', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ flex: 'none', padding: '12px 14px', background: 'none', border: 'none', borderBottom: activeTab === tab.id ? '3px solid #22C55E' : '3px solid transparent', fontSize: 13, fontWeight: activeTab === tab.id ? 600 : 400, color: activeTab === tab.id ? '#1F2937' : '#6B7280', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div style={{ padding: 16 }}>

                {/* ==================== RESUMEN TAB ==================== */}
                {activeTab === 'resumen' && (
                    <>
                        <h3 style={labelStyle}>💳 PAGOS DEL DÍA</h3>
                        <div style={cardStyle}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid #F3F4F6' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#E0F2F1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>💳</div>
                                    <div><p style={{ fontSize: 14, fontWeight: 500, color: '#1F2937', margin: 0 }}>Mercado Pago</p><p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>{mpOrders.length} sesiones</p></div>
                                </div>
                                <span style={{ fontSize: 16, fontWeight: 600, color: '#22C55E' }}>${mpTotal.toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #F3F4F6' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>💵</div>
                                    <div><p style={{ fontSize: 14, fontWeight: 500, color: '#1F2937', margin: 0 }}>Efectivo</p><p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>{cashOrders.length} sesiones</p></div>
                                </div>
                                <span style={{ fontSize: 16, fontWeight: 600, color: '#22C55E' }}>${cashTotal.toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12 }}>
                                <div><p style={{ fontSize: 14, fontWeight: 600, color: '#1F2937', margin: 0 }}>Total del día</p><p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>{todayOrders.length} sesiones</p></div>
                                <span style={{ fontSize: 18, fontWeight: 700, color: '#1F2937' }}>${totalToday.toLocaleString()}</span>
                            </div>
                        </div>

                        <h3 style={labelStyle}>SESIONES</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                            <div style={cardStyle}><p style={{ fontSize: 24, fontWeight: 700, color: '#22C55E', margin: 0 }}>{weekOrders.length}</p><p style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 0' }}>Esta semana</p></div>
                            <div style={cardStyle}><p style={{ fontSize: 24, fontWeight: 700, color: '#22C55E', margin: 0 }}>{monthOrders.length}</p><p style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 0' }}>Este mes</p></div>
                        </div>

                        <button style={{ width: '100%', padding: '14px', background: '#22C55E', color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>📄 Exportar PDF del mes</button>
                    </>
                )}

                {/* ==================== INFO TAB ==================== */}
                {activeTab === 'info' && canEdit && (
                    <>
                        <h3 style={labelStyle}>📍 INFORMACIÓN DEL LOCAL</h3>
                        <div style={cardStyle}>
                            <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>WhatsApp (contacto principal)</label>
                            <input type="text" placeholder="+54 11 1234-5678" value={config.businessInfo?.whatsapp || ''} onChange={(e) => updateBusinessInfo('whatsapp', e.target.value)} style={inputStyle} />

                            <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>Dirección</label>
                            <input type="text" placeholder="Av. Corrientes 1234" value={config.businessInfo?.address || ''} onChange={(e) => updateBusinessInfo('address', e.target.value)} style={inputStyle} />

                            <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>Horarios</label>
                            <input type="text" placeholder="Lun-Vie 9-21, Sab 10-18" value={config.businessInfo?.hours || ''} onChange={(e) => updateBusinessInfo('hours', e.target.value)} style={inputStyle} />

                            <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>Google Maps (reseñas)</label>
                            <input type="text" placeholder="https://maps.google.com/..." value={config.businessInfo?.googleMapsLink || ''} onChange={(e) => updateBusinessInfo('googleMapsLink', e.target.value)} style={inputStyle} />

                            <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>Indicaciones / Notas</label>
                            <input type="text" placeholder="Timbre 2A, subir escaleras" value={config.businessInfo?.directions || ''} onChange={(e) => updateBusinessInfo('directions', e.target.value)} style={inputStyle} />
                        </div>

                        <h3 style={labelStyle}>🔗 LINKS EXTERNOS</h3>
                        <div style={cardStyle}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <span style={{ fontSize: 13, color: '#374151' }}>🧡 Rappi</span>
                                <label className="toggle"><input type="checkbox" checked={config.externalOrdering?.rappiEnabled ?? false} onChange={() => { const c = config.externalOrdering || {}; updateConfig({ externalOrdering: { ...c, rappiEnabled: !c.rappiEnabled } }); setConfig(getConfig()) }} /><span className="toggle-slider"></span></label>
                            </div>
                            <input type="text" placeholder="Link de Rappi" value={config.externalOrdering?.rappiUrl || ''} onChange={(e) => { const c = config.externalOrdering || {}; updateConfig({ externalOrdering: { ...c, rappiUrl: e.target.value } }); setConfig(getConfig()) }} style={{ ...inputStyle, marginBottom: 14 }} />

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <span style={{ fontSize: 13, color: '#374151' }}>❤️ PedidosYa</span>
                                <label className="toggle"><input type="checkbox" checked={config.externalOrdering?.pedidosYaEnabled ?? false} onChange={() => { const c = config.externalOrdering || {}; updateConfig({ externalOrdering: { ...c, pedidosYaEnabled: !c.pedidosYaEnabled } }); setConfig(getConfig()) }} /><span className="toggle-slider"></span></label>
                            </div>
                            <input type="text" placeholder="Link de PedidosYa" value={config.externalOrdering?.pedidosYaUrl || ''} onChange={(e) => { const c = config.externalOrdering || {}; updateConfig({ externalOrdering: { ...c, pedidosYaUrl: e.target.value } }); setConfig(getConfig()) }} style={{ ...inputStyle, marginBottom: 14 }} />

                            {/* Mercado Pago Alias */}
                            <div style={{ paddingTop: 10, borderTop: '1px solid #F3F4F6' }}>
                                <span style={{ fontSize: 13, color: '#374151', display: 'block', marginBottom: 6 }}>💳 Mercado Pago (Alias)</span>
                                <input
                                    type="text"
                                    placeholder="ej: grubclub.mp"
                                    value={config.payments?.mercadoPagoAlias || ''}
                                    onChange={(e) => {
                                        const c = config.payments || {};
                                        updateConfig({ payments: { ...c, mercadoPagoAlias: e.target.value } });
                                        setConfig(getConfig())
                                    }}
                                    style={inputStyle}
                                />
                                <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4 }}>Si está vacío, no aparece en Info</p>
                            </div>
                        </div>
                    </>
                )}

                {/* ==================== MENU TAB ==================== */}
                {activeTab === 'menu' && canEdit && (
                    <>
                        <h3 style={labelStyle}>🍽️ GESTIÓN DE MENÚ</h3>
                        {menu.categories?.map(category => (
                            <div key={category.id} style={{ marginBottom: 20 }}>
                                <h4 style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 10 }}>{category.name}</h4>
                                {category.items?.map(item => (
                                    <div key={item.id} style={{ ...cardStyle, marginBottom: 10 }}>
                                        <div style={{ display: 'flex', gap: 10 }}>
                                            {/* Image Preview/Upload */}
                                            <div style={{ width: 60, flexShrink: 0 }}>
                                                <div
                                                    onClick={() => {
                                                        setUploadingItemId(`${category.id}-${item.id}`)
                                                        document.getElementById(`menu-img-${category.id}-${item.id}`)?.click()
                                                    }}
                                                    style={{
                                                        width: 60,
                                                        height: 60,
                                                        borderRadius: 8,
                                                        background: item.image ? 'none' : '#F3F4F6',
                                                        border: '2px dashed #D1D5DB',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        overflow: 'hidden'
                                                    }}
                                                >
                                                    {item.image ? (
                                                        <img src={item.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <span style={{ fontSize: 20, color: '#9CA3AF' }}>📷</span>
                                                    )}
                                                </div>
                                                <input
                                                    id={`menu-img-${category.id}-${item.id}`}
                                                    type="file"
                                                    accept="image/jpeg,image/png"
                                                    onChange={(e) => handleMenuImageUpload(e, category.id, item.id)}
                                                    style={{ display: 'none' }}
                                                />
                                                {uploadingItemId === `${category.id}-${item.id}` && (
                                                    <p style={{ fontSize: 9, color: '#6B7280', marginTop: 4, textAlign: 'center' }}>...</p>
                                                )}
                                            </div>

                                            {/* Item Details */}
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <input type="text" value={item.name} onChange={(e) => handleUpdateMenuItem(category.id, item.id, { name: e.target.value })} style={{ fontSize: 14, fontWeight: 500, border: 'none', padding: 0, width: '100%', marginBottom: 4 }} />
                                                        <input type="number" value={item.price} onChange={(e) => handleUpdateMenuItem(category.id, item.id, { price: parseFloat(e.target.value) || 0 })} style={{ fontSize: 13, color: '#22C55E', fontWeight: 600, border: 'none', padding: 0, width: 80 }} />
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                                                        <label style={{ fontSize: 11, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            Agotado
                                                            <input type="checkbox" checked={item.outOfStock ?? false} onChange={(e) => handleUpdateMenuItem(category.id, item.id, { outOfStock: e.target.checked })} style={{ accentColor: '#EF4444' }} />
                                                        </label>
                                                        <label style={{ fontSize: 11, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            Promo
                                                            <input type="checkbox" checked={item.isPromo ?? false} onChange={(e) => handleUpdateMenuItem(category.id, item.id, { isPromo: e.target.checked })} style={{ accentColor: '#22C55E' }} />
                                                        </label>
                                                    </div>
                                                </div>
                                                {item.isPromo && (
                                                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #F3F4F6' }}>
                                                        <div style={{ display: 'flex', gap: 10 }}>
                                                            <div style={{ flex: 1 }}>
                                                                <label style={{ fontSize: 10, color: '#9CA3AF' }}>Precio promo</label>
                                                                <input type="number" placeholder="Precio" value={item.promoPrice || ''} onChange={(e) => handleUpdateMenuItem(category.id, item.id, { promoPrice: parseFloat(e.target.value) || 0 })} style={{ width: '100%', padding: '6px 8px', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 12 }} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            {/* Remove Button */}
                                            <button
                                                onClick={() => handleRemoveMenuItem(category.id, item.id)}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: '#EF4444',
                                                    fontSize: 18,
                                                    cursor: 'pointer',
                                                    padding: 4,
                                                    alignSelf: 'flex-start'
                                                }}
                                                title="Eliminar item"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {/* Add Item Button */}
                                <button
                                    onClick={() => handleAddMenuItem(category.id)}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        background: '#F3F4F6',
                                        border: '2px dashed #D1D5DB',
                                        borderRadius: 10,
                                        fontSize: 13,
                                        color: '#6B7280',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 6
                                    }}
                                >
                                    <span style={{ fontSize: 16 }}>+</span> Agregar ítem
                                </button>
                            </div>
                        ))}
                    </>
                )}

                {/* ==================== BRANDING TAB ==================== */}
                {activeTab === 'branding' && canEdit && (
                    <>
                        <h3 style={labelStyle}>🎨 BRANDING</h3>
                        <div style={cardStyle}>
                            <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>Nombre del negocio</label>
                            <input type="text" value={config.businessName || ''} onChange={(e) => { updateConfig({ businessName: e.target.value }); setConfig(getConfig()) }} style={inputStyle} />

                            {/* Font Selector */}
                            <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>Tipografía</label>
                            <select
                                value={config.branding?.fontFamily || 'Inter'}
                                onChange={(e) => { updateConfig({ branding: { ...config.branding, fontFamily: e.target.value } }); setConfig(getConfig()) }}
                                style={{ ...inputStyle, fontFamily: config.branding?.fontFamily || 'Inter' }}
                            >
                                {CURATED_FONTS.map(font => (
                                    <option key={font.name} value={font.name}>{font.label}</option>
                                ))}
                            </select>

                            {/* Font Weight Selector */}
                            <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4, marginTop: 12 }}>Peso de fuente</label>
                            <select
                                value={config.branding?.fontWeight || '400'}
                                onChange={(e) => { updateConfig({ branding: { ...config.branding, fontWeight: e.target.value } }); setConfig(getConfig()) }}
                                style={{ ...inputStyle, fontWeight: config.branding?.fontWeight || '400' }}
                            >
                                {FONT_WEIGHTS.map(weight => (
                                    <option key={weight.value} value={weight.value}>{weight.label}</option>
                                ))}
                            </select>

                            <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 8, marginTop: 16 }}>Colores</label>
                            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                                <div>
                                    <p style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 4 }}>Primario</p>
                                    <input type="color" value={config.colors?.primary || '#B8956A'} onChange={(e) => { updateConfig({ colors: { ...config.colors, primary: e.target.value } }); setConfig(getConfig()) }} style={{ width: 50, height: 40, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
                                </div>
                                <div>
                                    <p style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 4 }}>Secundario</p>
                                    <input type="color" value={config.colors?.primaryLight || '#A89070'} onChange={(e) => { updateConfig({ colors: { ...config.colors, primaryLight: e.target.value } }); setConfig(getConfig()) }} style={{ width: 50, height: 40, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
                                </div>
                                <div>
                                    <p style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 4 }}>Confirmación</p>
                                    <input type="color" value={config.colors?.confirmation || '#22C55E'} onChange={(e) => { updateConfig({ colors: { ...config.colors, confirmation: e.target.value } }); setConfig(getConfig()) }} style={{ width: 50, height: 40, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
                                </div>
                                <div>
                                    <p style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 4 }}>Powered by</p>
                                    <input type="color" value={config.branding?.poweredByColor || '#C4856A'} onChange={(e) => { updateConfig({ branding: { ...config.branding, poweredByColor: e.target.value } }); setConfig(getConfig()) }} style={{ width: 50, height: 40, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
                                </div>
                            </div>
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

                        {/* Hero Icons Customization */}
                        <h3 style={labelStyle}>🎯 HERO ICONS (INICIO)</h3>
                        <div style={cardStyle}>
                            <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12 }}>Color de fondo e ícono para cada tile</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                {['menu', 'envios', 'rewards', 'game'].map(iconId => {
                                    const iconConfig = config.heroIcons?.[iconId] || { bgColor: '#FFFFFF', iconColorMode: 'dark' }
                                    const labels = { menu: 'Menu', envios: 'Envíos', rewards: 'Rewards', game: 'Game' }
                                    return (
                                        <div key={iconId} style={{
                                            background: '#F9FAFB',
                                            borderRadius: 8,
                                            padding: 10
                                        }}>
                                            <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#374151' }}>
                                                {labels[iconId]}
                                            </p>
                                            {/* Color Preview */}
                                            <div style={{
                                                width: '100%',
                                                height: 32,
                                                borderRadius: 6,
                                                backgroundColor: iconConfig.bgColor,
                                                marginBottom: 6,
                                                border: '1px solid #E5E7EB',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: iconConfig.iconColorMode === 'light' ? '#FFFFFF' : '#4A4036',
                                                fontSize: 16
                                            }}>
                                                ●
                                            </div>
                                            {/* Color Input */}
                                            <input
                                                type="color"
                                                value={iconConfig.bgColor}
                                                onChange={(e) => {
                                                    updateConfig({
                                                        heroIcons: {
                                                            ...config.heroIcons,
                                                            [iconId]: { ...iconConfig, bgColor: e.target.value }
                                                        }
                                                    })
                                                    setConfig(getConfig())
                                                }}
                                                style={{ width: '100%', height: 28, border: 'none', cursor: 'pointer', marginBottom: 6 }}
                                            />
                                            {/* Icon Mode Toggle */}
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                <button
                                                    onClick={() => {
                                                        updateConfig({
                                                            heroIcons: {
                                                                ...config.heroIcons,
                                                                [iconId]: { ...iconConfig, iconColorMode: 'dark' }
                                                            }
                                                        })
                                                        setConfig(getConfig())
                                                    }}
                                                    style={{
                                                        flex: 1,
                                                        padding: '4px 6px',
                                                        borderRadius: 4,
                                                        border: iconConfig.iconColorMode === 'dark' ? '2px solid #22C55E' : '1px solid #E5E7EB',
                                                        background: '#FFFFFF',
                                                        color: '#1F2937',
                                                        fontSize: 10,
                                                        fontWeight: 500,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Oscuro
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        updateConfig({
                                                            heroIcons: {
                                                                ...config.heroIcons,
                                                                [iconId]: { ...iconConfig, iconColorMode: 'light' }
                                                            }
                                                        })
                                                        setConfig(getConfig())
                                                    }}
                                                    style={{
                                                        flex: 1,
                                                        padding: '4px 6px',
                                                        borderRadius: 4,
                                                        border: iconConfig.iconColorMode === 'light' ? '2px solid #22C55E' : '1px solid #E5E7EB',
                                                        background: '#1F2937',
                                                        color: '#FFFFFF',
                                                        fontSize: 10,
                                                        fontWeight: 500,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Claro
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Divider Preset Selector */}
                        <h3 style={labelStyle}>🖼️ IMAGEN DECORATIVA (Menú/Pedido)</h3>
                        <div style={cardStyle}>
                            <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12 }}>Imagen que aparece debajo del nombre en Menú y Pedido</p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                                {DIVIDER_PRESETS.map(preset => (
                                    <div
                                        key={preset.id}
                                        onClick={() => { updateConfig({ dividerPresetId: preset.id }); setConfig(getConfig()) }}
                                        style={{
                                            cursor: 'pointer',
                                            borderRadius: 8,
                                            overflow: 'hidden',
                                            border: config.dividerPresetId === preset.id ? '3px solid #22C55E' : '2px solid #E5E7EB',
                                            opacity: config.dividerPresetId === preset.id ? 1 : 0.7
                                        }}
                                    >
                                        <img src={preset.url} alt={preset.name} style={{ width: '100%', height: 40, objectFit: 'cover' }} />
                                    </div>
                                ))}
                            </div>
                            <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 8 }}>
                                Actual: {DIVIDER_PRESETS.find(p => p.id === config.dividerPresetId)?.name || 'Ninguna'}
                            </p>
                        </div>

                        {/* Featured Photos Controls - Standalone System */}
                        <h3 style={labelStyle}>📸 FOTOS DESTACADAS (Home) - 4 slots fijos</h3>
                        <div style={cardStyle}>
                            <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12 }}>Estos 4 items aparecen en la página de inicio</p>
                            {[0, 1, 2, 3].map(slotIndex => {
                                const currentSlot = config.featuredPhotos?.[slotIndex] || {}

                                return (
                                    <div key={slotIndex} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: slotIndex < 3 ? '1px solid #F3F4F6' : 'none' }}>
                                        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                            {/* Image Preview/Upload */}
                                            <div
                                                onClick={() => document.getElementById(`featured-img-${slotIndex}`)?.click()}
                                                style={{
                                                    width: 80,
                                                    height: 80,
                                                    borderRadius: 12,
                                                    background: currentSlot.image ? 'none' : '#F3F4F6',
                                                    border: '2px dashed #D1D5DB',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    overflow: 'hidden',
                                                    flexShrink: 0
                                                }}
                                            >
                                                {currentSlot.image ? (
                                                    <img src={currentSlot.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <span style={{ fontSize: 24, color: '#9CA3AF' }}>📷</span>
                                                )}
                                            </div>
                                            <input
                                                id={`featured-img-${slotIndex}`}
                                                type="file"
                                                accept="image/jpeg,image/png"
                                                onChange={(e) => handleFeaturedImageUpload(e, slotIndex)}
                                                style={{ display: 'none' }}
                                            />

                                            {/* Slot Controls - Name & Price */}
                                            <div style={{ flex: 1 }}>
                                                <input
                                                    type="text"
                                                    placeholder="Nombre del item"
                                                    value={currentSlot.name || ''}
                                                    onChange={(e) => {
                                                        const newPhotos = [...(config.featuredPhotos || [{}, {}, {}, {}])]
                                                        newPhotos[slotIndex] = { ...newPhotos[slotIndex], name: e.target.value }
                                                        updateConfig({ featuredPhotos: newPhotos })
                                                        setConfig(getConfig())
                                                    }}
                                                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, marginBottom: 6 }}
                                                />
                                                <input
                                                    type="number"
                                                    placeholder="Precio"
                                                    value={currentSlot.price || ''}
                                                    onChange={(e) => {
                                                        const newPhotos = [...(config.featuredPhotos || [{}, {}, {}, {}])]
                                                        newPhotos[slotIndex] = { ...newPhotos[slotIndex], price: parseFloat(e.target.value) || 0 }
                                                        updateConfig({ featuredPhotos: newPhotos })
                                                        setConfig(getConfig())
                                                    }}
                                                    style={{ width: 100, padding: '6px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12 }}
                                                />
                                                {uploadingFeaturedSlot === slotIndex && (
                                                    <p style={{ fontSize: 10, color: '#6B7280', marginTop: 4 }}>Optimizando...</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </>
                )}

                {/* ==================== PEDIDOS TAB ==================== */}
                {activeTab === 'pedidos' && (
                    <>
                        <h3 style={labelStyle}>⚙️ CONFIGURACIÓN DE PEDIDOS</h3>
                        <div style={cardStyle}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <span style={{ fontSize: 14, color: '#374151' }}>Pedidos activos</span>
                                <label className="toggle"><input type="checkbox" checked={config.features?.ordersEnabled ?? true} onChange={() => { updateConfig({ features: { ...config.features, ordersEnabled: !config.features?.ordersEnabled } }); setConfig(getConfig()) }} /><span className="toggle-slider"></span></label>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 14, color: '#374151' }}>Pausar pedidos</span>
                                <label className="toggle"><input type="checkbox" checked={config.pauseOrders ?? false} onChange={() => { updateConfig({ pauseOrders: !config.pauseOrders }); setConfig(getConfig()) }} /><span className="toggle-slider"></span></label>
                            </div>
                        </div>

                        <h3 style={labelStyle}>📋 MODO DE OPERACIÓN</h3>
                        <div style={cardStyle}>
                            <select value={config.orderMode || 'A1'} onChange={(e) => { updateConfig({ orderMode: e.target.value }); setConfig(getConfig()) }} style={{ width: '100%', padding: '12px 14px', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 14, background: 'white' }}>
                                <option value="A1">A1: Budoni / Pickup rápido</option>
                                <option value="A2">A2: Café / Pago antes de preparar</option>
                                <option value="B">B: Restaurante / Pago al final</option>
                            </select>
                        </div>
                    </>
                )}

                {/* ==================== ANALYTICS TAB ==================== */}
                {activeTab === 'analytics' && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <h3 style={{ ...labelStyle, marginBottom: 0 }}>📊 ANALYTICS</h3>
                            {userRole === 'superadmin' && (
                                <label style={{ fontSize: 11, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    Demo <input type="checkbox" checked={demoAnalytics} onChange={() => setDemoAnalytics(!demoAnalytics)} style={{ accentColor: '#22C55E' }} />
                                </label>
                            )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                            <div style={cardStyle}><p style={{ fontSize: 10, color: '#9CA3AF', margin: 0 }}>Hoy</p><p style={{ fontSize: 22, fontWeight: 700, color: '#1F2937', margin: '4px 0 0' }}>{todayOrders.length}</p></div>
                            <div style={cardStyle}><p style={{ fontSize: 10, color: '#9CA3AF', margin: 0 }}>Semana</p><p style={{ fontSize: 22, fontWeight: 700, color: '#1F2937', margin: '4px 0 0' }}>{weekOrders.length}</p></div>
                            <div style={cardStyle}><p style={{ fontSize: 10, color: '#9CA3AF', margin: 0 }}>Mes</p><p style={{ fontSize: 22, fontWeight: 700, color: '#1F2937', margin: '4px 0 0' }}>{monthOrders.length}</p></div>
                            <div style={cardStyle}><p style={{ fontSize: 10, color: '#9CA3AF', margin: 0 }}>Total</p><p style={{ fontSize: 22, fontWeight: 700, color: '#1F2937', margin: '4px 0 0' }}>{orders.length}</p></div>
                        </div>

                        <div style={cardStyle}>
                            <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>Ingresos totales</p>
                            <p style={{ fontSize: 28, fontWeight: 700, color: '#22C55E', margin: '4px 0 0' }}>${(demoAnalytics ? demoTotalSales : totalRevenue).toLocaleString()}</p>
                        </div>

                        {demoAnalytics && (
                            <div style={cardStyle}>
                                <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 12 }}>Últimos 15 días</p>
                                <div style={{ height: 60, display: 'flex', alignItems: 'flex-end', gap: 3 }}>
                                    {demoData.slice(-15).map((d, i) => (
                                        <div key={i} style={{ flex: 1, height: `${(d.value / Math.max(...demoData.map(x => x.value))) * 100}%`, background: i % 2 === 0 ? '#B8A089' : '#C9B89A', borderRadius: '3px 3px 0 0', minHeight: 6 }} />
                                    ))}
                                </div>
                                <p style={{ fontSize: 9, color: '#9CA3AF', textAlign: 'center', marginTop: 8 }}>⚠️ Datos de demostración</p>
                            </div>
                        )}
                    </>
                )}

                {/* ==================== HISTORIAL TAB ==================== */}
                {activeTab === 'historial' && (
                    <>
                        <div style={{ background: '#FEF3C7', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                            <p style={{ fontSize: 12, color: '#92400E', margin: 0 }}>⚠️ Los registros son de solo lectura. No se pueden modificar pagos confirmados.</p>
                        </div>

                        <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                            {orders.length === 0 ? (
                                <div style={{ padding: 24, textAlign: 'center', color: '#9CA3AF' }}><p style={{ fontSize: 14 }}>No hay registros aún</p></div>
                            ) : (
                                orders.slice(0, 15).map((order, i) => (
                                    <div key={order.orderNumber || i} style={{ padding: '12px 14px', borderBottom: i < Math.min(orders.length, 15) - 1 ? '1px solid #F3F4F6' : 'none' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                <p style={{ fontSize: 13, fontWeight: 500, color: '#1F2937', margin: 0 }}>Pedido #{order.orderNumber || i + 1}</p>
                                                <p style={{ fontSize: 11, color: '#9CA3AF', margin: '2px 0 0' }}>Confirmado por: {order.confirmedBy || 'staff'}</p>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <span style={{ display: 'inline-block', padding: '2px 6px', background: order.paymentMethod === 'mercadopago' ? '#E0F2F1' : '#FEF3C7', borderRadius: 4, fontSize: 9, color: order.paymentMethod === 'mercadopago' ? '#0D9488' : '#92400E', fontWeight: 500 }}>
                                                    {order.paymentMethod === 'mercadopago' ? 'MP' : 'Efectivo'}
                                                </span>
                                                <p style={{ fontSize: 13, fontWeight: 600, color: '#1F2937', margin: '4px 0 0' }}>${(order.total || 0).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}

            </div>
        </div >
    )
}

export default SuperAdmin
