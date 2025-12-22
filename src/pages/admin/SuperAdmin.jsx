import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getOrders } from '../../utils/storage.js'
import { login, logout, getSession } from '../../utils/auth.js'

import { updateConfig, CURATED_FONTS, CONFIRMATION_COLORS, FONT_WEIGHTS, HERO_DEFAULT } from '../../config/appConfig.js'
import { getMenu, saveMenu, updateMenuItem, addMenuItem, removeMenuItem } from '../../config/menuData.js'
import { DIVIDER_PRESETS } from '../../config/dividerPresets.js'
import { processAndStoreImage, formatFileSize } from '../../utils/imageOptimizer.js'
import BrandingColorPicker from '../../components/BrandingColorPicker.jsx'
import HeroIconPicker from '../../components/HeroIconPicker.jsx'
import CoverImageEditor from '../../components/CoverImageEditor.jsx'
import { useAdminIntent } from '../../contexts/AdminIntentContext.jsx'

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


// ============================================
// SUPER ADMIN MODE (PATCH 3.9)
// ============================================
const SUPERADMIN_EMAIL = 'superadmin@foodspot.app'
const SUPER_ADMIN_COLOR = '#7C3AED'

function isTrueSuperAdmin() {
    try {
        const session = getSession()
        return session?.email === SUPERADMIN_EMAIL
    } catch (e) {
        return false
    }
}

// ============================================
// LOGO VALIDATION (PATCH 4.1)
// ============================================
function isValidLogoUrl(value) {
    if (!value || value.trim() === '') return true
    const trimmed = value.trim()
    if (trimmed.startsWith('data:')) {
        return { valid: false, error: 'SVG logos must be uploaded as image files (URL-based), not data URIs.' }
    }
    if (trimmed.match(/^[A-Za-z0-9+/=]{50,}$/)) {
        return { valid: false, error: 'SVG logos must be uploaded as image files (URL-based), not base64 content.' }
    }
    if (trimmed.startsWith('<svg') || trimmed.startsWith('<?xml')) {
        return { valid: false, error: 'SVG logos must be uploaded as image files (URL-based), not raw SVG markup.' }
    }
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        return { valid: false, error: 'Logo must be a valid HTTPS URL.' }
    }
    return { valid: true }
}

// INVARIANT: SuperAdmin receives config via prop from App.jsx (single source of truth)
// Do NOT call getConfig() locally - breaks invariant during saves
function SuperAdmin({ config }) {
    const navigate = useNavigate()
    const location = useLocation()
    // NOTE: config comes from props, not local state
    const [menu, setMenu] = useState(() => getMenu())
    const [orders, setOrders] = useState(() => getOrders())
    // PATCH: Restore active tab from navigation state if present
    const [activeTab, setActiveTab] = useState(() => location.state?.activeTab || 'resumen')
    const [demoAnalytics, setDemoAnalytics] = useState(true)
    const [demoData] = useState(() => generateDemoData())
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [userRole, setUserRole] = useState('superadmin')
    const [error, setError] = useState('')
    const [editingItem, setEditingItem] = useState(null)
    // PATCH: Restore editor modal state from navigation state if present
    const [showCoverEditor, setShowCoverEditor] = useState(() => location.state?.returnToEditor || false)

    // Mode is derived from context, not local state
    // Simulation is ephemeral - dies on refresh

    // Image upload state
    const [uploadingItemId, setUploadingItemId] = useState(null)
    const [uploadStatus, setUploadStatus] = useState(null)
    const [uploadingFeaturedSlot, setUploadingFeaturedSlot] = useState(null)
    const menuImageInputRef = useRef(null)
    const featuredImageInputRef = useRef(null)

    // Role Lens Hooks - activeRoleView is the source of truth for simulation
    const { activeRoleView, enterOwnerView, enterStaffView, exitSimulation } = useAdminIntent()

    // Derive current mode from context (defaults to 'superadmin' when not simulating)
    const currentMode = activeRoleView || 'superadmin'

    useEffect(() => {
        const session = getSession()
        if (session && (session.role === 'superadmin' || session.role === 'owner' || session.role === 'staff')) {
            setIsAuthenticated(true)
            setUserRole(session.role)
            // No mode restoration - simulation dies on refresh
            // selectedMode defaults to 'superadmin', no persistence
        }
    }, [])

    useEffect(() => {
        const interval = setInterval(() => {
            window.dispatchEvent(new CustomEvent('frontendSync'))
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
        window.dispatchEvent(new CustomEvent('frontendSync'))
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
            window.dispatchEvent(new CustomEvent('frontendSync'))
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
                {/* ============================================
                    DEV-ONLY BYPASS - REMOVE BEFORE PRODUCTION
                    Temporary scaffolding for verification testing
                    ============================================ */}
                {import.meta.env.DEV && (
                    <button
                        type="button"
                        onClick={() => {
                            // Bypass auth - directly set authenticated state
                            setIsAuthenticated(true)
                            setUserRole('superadmin')
                        }}
                        style={{
                            marginTop: 20,
                            padding: '10px 20px',
                            fontSize: 12,
                            fontWeight: 600,
                            color: 'white',
                            background: '#7C3AED',
                            border: '2px dashed #A855F7',
                            borderRadius: 8,
                            cursor: 'pointer',
                            opacity: 0.8
                        }}
                    >
                        🔧 DEV: Enter Super Admin (No Auth)
                    </button>
                )}
            </div>
        )
    }
    // Mode options for dropdown (superadmin only)
    const modeOptions = [
        { value: 'superadmin', label: '👑 Super Admin', color: '#7C3AED' },
        { value: 'owner', label: 'Owner', color: '#22C55E' },
        { value: 'staff', label: 'Staff', color: '#6366F1' },
        { value: 'customer', label: 'Customer', color: '#F59E0B' }
    ]

    // Handle mode change - IDEMPOTENT
    const handleModeChange = (nextMode) => {
        // Idempotency: same mode = no-op
        if (nextMode === currentMode) return

        // Exit simulation -> return to superadmin
        if (nextMode === 'superadmin') {
            exitSimulation()
            navigate('/admin')
            return
        }

        // Enter owner simulation
        if (nextMode === 'owner') {
            enterOwnerView('business-001')
            navigate('/owner/menu')
            return
        }

        // Enter staff simulation
        if (nextMode === 'staff') {
            enterStaffView('staff-user-001', 'business-001')
            navigate('/staff/dashboard')
            return
        }

        // Customer preview (frontend only, no simulation)
        if (nextMode === 'customer') {
            navigate('/')
        }
    }

    // Full Super Admin Navigation (No Filtering) - ENGLISH ONLY
    const tabs = [
        { id: 'resumen', label: 'Summary' },
        { id: 'info', label: 'Info' },
        { id: 'menu', label: 'Menu' },
        { id: 'branding', label: 'Branding' },
        { id: 'pedidos', label: 'Orders' },
        { id: 'analytics', label: 'Analytics' },
        { id: 'historial', label: 'History' },
        { id: 'tenants', label: 'Tenants' },
        { id: 'system', label: 'System' },
    ]

    const roleLabel = 'Super Admin'
    const canEdit = true

    // Card style helper
    const cardStyle = { background: 'white', borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }
    const labelStyle = { fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }
    const inputStyle = { width: '100%', padding: '12px 14px', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 14, boxSizing: 'border-box', marginBottom: 12 }

    return (
        <>
            <div className="backend-surface" style={{ minHeight: '100vh', background: '#F5F2EE', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                {/* Light Neutral Header - BLACK/WHITE ONLY */}
                <div style={{ background: '#FFFFFF', padding: '16px 16px 12px', borderBottom: '1px solid #E5E7EB' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#1F2937', fontSize: 20, cursor: 'pointer', padding: 0 }}>←</button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                {/* Neutral Logo */}
                                <div style={{ width: 36, height: 36, background: '#1F2937', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span style={{ color: '#FFFFFF', fontSize: 14, fontWeight: 700 }}>FS</span>
                                </div>
                                <span style={{ fontSize: 20, fontWeight: 700, color: '#1F2937' }}>FoodSpot</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {demoAnalytics && userRole === 'superadmin' && <span style={{ padding: '4px 8px', background: '#EF4444', borderRadius: 5, fontSize: 10, fontWeight: 600, color: 'white' }}>DEMO</span>}
                            {/* Mode Switcher Dropdown (superadmin only) */}
                            {userRole === 'superadmin' && (
                                <select
                                    value={currentMode}
                                    onChange={(e) => handleModeChange(e.target.value)}
                                    style={{
                                        padding: '6px 24px 6px 10px',
                                        fontSize: 11,
                                        fontWeight: 600,
                                        border: 'none',
                                        borderRadius: 5,
                                        cursor: 'pointer',
                                        background: `${modeOptions.find(m => m.value === currentMode)?.color || '#7C3AED'} url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'%3E%3Cpath fill='white' d='M0 2l4 4 4-4z'/%3E%3C/svg%3E") no-repeat right 8px center`,
                                        color: 'white',
                                        minWidth: 80
                                    }}
                                >
                                    {modeOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>

                    {/* Refresh Frontend Button - FULL WIDTH UNDER HEADER */}
                    <button
                        onClick={() => {
                            // Dispatch global sync event
                            window.dispatchEvent(new CustomEvent('frontendSync'))
                            // Also refresh local state
                            window.dispatchEvent(new CustomEvent('frontendSync'))
                            setMenu(getMenu())
                            setOrders(getOrders())
                            // Visual feedback
                            alert('✅ Frontend synced!')
                        }}
                        style={{
                            width: '100%',
                            marginTop: 12,
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

                            {/* PDF Export disabled for v1 — pushing to v2 */}
                            {/* <button style={{ width: '100%', padding: '14px', background: '#22C55E', color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>📄 Exportar PDF del mes</button> */}
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
                                    <label className="toggle"><input type="checkbox" checked={config.externalOrdering?.rappiEnabled ?? false} onChange={() => { const c = config.externalOrdering || {}; updateConfig({ externalOrdering: { ...c, rappiEnabled: !c.rappiEnabled } }); window.dispatchEvent(new CustomEvent('frontendSync')) }} /><span className="toggle-slider"></span></label>
                                </div>
                                <input type="text" placeholder="Link de Rappi" value={config.externalOrdering?.rappiUrl || ''} onChange={(e) => { const c = config.externalOrdering || {}; updateConfig({ externalOrdering: { ...c, rappiUrl: e.target.value } }); window.dispatchEvent(new CustomEvent('frontendSync')) }} style={{ ...inputStyle, marginBottom: 14 }} />

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <span style={{ fontSize: 13, color: '#374151' }}>❤️ PedidosYa</span>
                                    <label className="toggle"><input type="checkbox" checked={config.externalOrdering?.pedidosYaEnabled ?? false} onChange={() => { const c = config.externalOrdering || {}; updateConfig({ externalOrdering: { ...c, pedidosYaEnabled: !c.pedidosYaEnabled } }); window.dispatchEvent(new CustomEvent('frontendSync')) }} /><span className="toggle-slider"></span></label>
                                </div>
                                <input type="text" placeholder="Link de PedidosYa" value={config.externalOrdering?.pedidosYaUrl || ''} onChange={(e) => { const c = config.externalOrdering || {}; updateConfig({ externalOrdering: { ...c, pedidosYaUrl: e.target.value } }); window.dispatchEvent(new CustomEvent('frontendSync')) }} style={{ ...inputStyle, marginBottom: 14 }} />

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
                                            window.dispatchEvent(new CustomEvent('frontendSync'))
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
                                <input type="text" value={config.businessName || ''} onChange={(e) => { updateConfig({ businessName: e.target.value }); window.dispatchEvent(new CustomEvent('frontendSync')) }} style={inputStyle} />

                                {/* Font Selector */}
                                <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>Tipografía</label>
                                <select
                                    value={config.branding?.fontFamily || 'Inter'}
                                    onChange={(e) => { updateConfig({ branding: { ...config.branding, fontFamily: e.target.value } }); window.dispatchEvent(new CustomEvent('frontendSync')) }}
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
                                    onChange={(e) => { updateConfig({ branding: { ...config.branding, fontWeight: e.target.value } }); window.dispatchEvent(new CustomEvent('frontendSync')) }}
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
                                        <input type="color" value={config.colors?.primary || '#B8956A'} onChange={(e) => { updateConfig({ colors: { ...config.colors, primary: e.target.value } }); window.dispatchEvent(new CustomEvent('frontendSync')) }} style={{ width: 50, height: 40, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
                                    </div>
                                    <div>
                                        <p style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 4 }}>Secundario</p>
                                        <input type="color" value={config.colors?.primaryLight || '#A89070'} onChange={(e) => { updateConfig({ colors: { ...config.colors, primaryLight: e.target.value } }); window.dispatchEvent(new CustomEvent('frontendSync')) }} style={{ width: 50, height: 40, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
                                    </div>
                                    <div>
                                        <p style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 4 }}>Confirmación</p>
                                        <input type="color" value={config.colors?.confirmation || '#22C55E'} onChange={(e) => { updateConfig({ colors: { ...config.colors, confirmation: e.target.value } }); window.dispatchEvent(new CustomEvent('frontendSync')) }} style={{ width: 50, height: 40, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
                                    </div>
                                    <div>
                                        <p style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 4 }}>Powered by</p>
                                        <input type="color" value={config.branding?.poweredByColor || '#C4856A'} onChange={(e) => { updateConfig({ branding: { ...config.branding, poweredByColor: e.target.value } }); window.dispatchEvent(new CustomEvent('frontendSync')) }} style={{ width: 50, height: 40, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
                                    </div>
                                </div>
                            </div>

                            {/* Phase 1 Navbar Branding - Color Picker Component */}
                            <div>
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
                            </div>

                            {/* Hero Icons Customization (v2 - Fully Isolated) */}
                            <h3 style={labelStyle}>🎯 HERO ICONS (INICIO)</h3>
                            <div>
                                <div style={cardStyle}>
                                    <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12 }}>Color de fondo e ícono para cada tile (Independiente de la navegación)</p>
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
                            </div>

                            {/* ============================================ */}
                            {/* SYSTEM / SUPER ADMIN (PATCH 3.9) */}
                            {/* ============================================ */}
                            {isTrueSuperAdmin() && (
                                <>
                                    <h3 style={{
                                        ...labelStyle,
                                        color: SUPER_ADMIN_COLOR,
                                        borderLeft: `3px solid ${SUPER_ADMIN_COLOR}`,
                                        paddingLeft: 8,
                                        marginLeft: -8
                                    }}>🔒 SYSTEM / SUPER ADMIN</h3>
                                    <div style={{
                                        ...cardStyle,
                                        border: `2px solid ${SUPER_ADMIN_COLOR}`,
                                        background: '#FAF5FF'
                                    }}>
                                        <p style={{ fontSize: 12, color: '#7C3AED', marginBottom: 16, fontWeight: 500 }}>
                                            ⚠️ System-level controls. Changes affect all instances.
                                        </p>

                                        {/* Header Branding Mode Toggle */}
                                        <div style={{ marginBottom: 16 }}>
                                            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>
                                                Header Branding
                                            </label>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button
                                                    onClick={() => {
                                                        updateConfig({ headerBranding: { mode: 'cover' } })
                                                        window.dispatchEvent(new CustomEvent('frontendSync'))
                                                    }}
                                                    style={{
                                                        flex: 1, padding: '10px 12px', borderRadius: 8,
                                                        border: (config.headerBranding?.mode || 'cover') === 'cover' ? `2px solid ${SUPER_ADMIN_COLOR}` : '1px solid #E5E7EB',
                                                        background: (config.headerBranding?.mode || 'cover') === 'cover' ? '#FAF5FF' : 'white',
                                                        color: '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer'
                                                    }}
                                                >
                                                    🖼️ Cover
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        updateConfig({ headerBranding: { mode: 'text' } })
                                                        window.dispatchEvent(new CustomEvent('frontendSync'))
                                                    }}
                                                    style={{
                                                        flex: 1, padding: '10px 12px', borderRadius: 8,
                                                        border: config.headerBranding?.mode === 'text' ? `2px solid ${SUPER_ADMIN_COLOR}` : '1px solid #E5E7EB',
                                                        background: config.headerBranding?.mode === 'text' ? '#FAF5FF' : 'white',
                                                        color: '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer'
                                                    }}
                                                >
                                                    📝 Text
                                                </button>
                                                {/* Logo mode hidden — using Cover/Text only
                                                <button
                                                    onClick={() => {
                                                        if (!config.logoLight && !config.logoDark) {
                                                            alert('Please configure logos first before switching to logo mode.')
                                                            return
                                                        }
                                                        updateConfig({ headerBranding: { mode: 'logo' } })
                                                        window.dispatchEvent(new CustomEvent('frontendSync'))
                                                    }}
                                                    style={{
                                                        flex: 1, padding: '10px 12px', borderRadius: 8,
                                                        border: config.headerBranding?.mode === 'logo' ? `2px solid ${SUPER_ADMIN_COLOR}` : '1px solid #E5E7EB',
                                                        background: config.headerBranding?.mode === 'logo' ? '#FAF5FF' : 'white',
                                                        color: '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer'
                                                    }}
                                                >
                                                    🏷️ Logo
                                                </button>
                                                */}
                                            </div>
                                        </div>

                                        {/* Cover Editor - only show when mode is "cover" */}
                                        {(config.headerBranding?.mode === 'cover' || !config.headerBranding?.mode) && (
                                            <div style={{ marginBottom: 16 }}>
                                                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>
                                                    Cover Image
                                                </label>
                                                <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 12 }}>Facebook-style header with drag and zoom</p>

                                                {/* Cover Preview (Read-Only) */}
                                                <div style={{
                                                    background: '#111827',
                                                    borderRadius: 12,
                                                    padding: 12,
                                                    marginBottom: 4
                                                }}>
                                                    <p style={{ fontSize: 10, color: '#6B7280', marginBottom: 8, textAlign: 'center' }}>
                                                        📱 HEADER PREVIEW — {config.headerCover?.image ? 'Cover Mode' : 'No cover set'}
                                                    </p>
                                                    <div
                                                        style={{
                                                            width: '100%',
                                                            height: 64,
                                                            border: '2px solid #374151',
                                                            borderRadius: 4,
                                                            overflow: 'hidden',
                                                            background: '#1F2937',
                                                            position: 'relative'
                                                        }}
                                                    >
                                                        {config.headerCover?.image ? (
                                                            <div style={{
                                                                position: 'absolute',
                                                                inset: 0,
                                                                backgroundImage: `url(${config.headerCover.image})`,
                                                                backgroundSize: `${(config.headerCover?.scale || 1) * 100}%`,
                                                                backgroundPosition: `${50 + (config.headerCover?.offsetX || 0)}% ${50 + (config.headerCover?.offsetY || 0)}%`,
                                                                backgroundRepeat: 'no-repeat'
                                                            }} />
                                                        ) : (
                                                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <span style={{ color: '#9CA3AF', fontSize: 13 }}>No cover image</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Single Add/Edit Cover Button */}
                                                <button
                                                    onClick={() => setShowCoverEditor(true)}
                                                    onTouchEnd={(e) => { e.preventDefault(); setShowCoverEditor(true); }}
                                                    style={{
                                                        width: '100%',
                                                        padding: '14px 16px',
                                                        background: SUPER_ADMIN_COLOR,
                                                        color: '#fff',
                                                        border: 'none',
                                                        borderRadius: 8,
                                                        fontSize: 13,
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                        marginTop: 8,
                                                        touchAction: 'manipulation'
                                                    }}
                                                >
                                                    {config.headerCover?.image ? '✏️ Edit Cover' : '📷 Add Cover Photo'}
                                                </button>

                                                {/* Controls - only show when image exists */}
                                                {config.headerCover?.image && (
                                                    <>
                                                        {/* Scale Slider */}
                                                        <div style={{ marginTop: 12 }}>
                                                            <label style={{ fontSize: 11, color: '#6B7280', display: 'block', marginBottom: 4 }}>
                                                                Scale: {Math.round((config.headerCover?.scale || 1) * 100)}%
                                                            </label>
                                                            <input
                                                                type="range"
                                                                min="50"
                                                                max="300"
                                                                value={(config.headerCover?.scale || 1) * 100}
                                                                onChange={(e) => {
                                                                    updateConfig({
                                                                        headerCover: {
                                                                            ...config.headerCover,
                                                                            scale: parseInt(e.target.value) / 100
                                                                        }
                                                                    })
                                                                    window.dispatchEvent(new CustomEvent('frontendSync'))
                                                                }}
                                                                style={{ width: '100%' }}
                                                            />
                                                        </div>

                                                        {/* X Offset Slider */}
                                                        <div style={{ marginTop: 8 }}>
                                                            <label style={{ fontSize: 11, color: '#6B7280', display: 'block', marginBottom: 4 }}>
                                                                X Offset: {config.headerCover?.offsetX || 0}%
                                                            </label>
                                                            <input
                                                                type="range"
                                                                min="-50"
                                                                max="50"
                                                                value={config.headerCover?.offsetX || 0}
                                                                onChange={(e) => {
                                                                    updateConfig({
                                                                        headerCover: {
                                                                            ...config.headerCover,
                                                                            offsetX: parseInt(e.target.value)
                                                                        }
                                                                    })
                                                                    window.dispatchEvent(new CustomEvent('frontendSync'))
                                                                }}
                                                                style={{ width: '100%' }}
                                                            />
                                                        </div>

                                                        {/* Y Offset Slider */}
                                                        <div style={{ marginTop: 8 }}>
                                                            <label style={{ fontSize: 11, color: '#6B7280', display: 'block', marginBottom: 4 }}>
                                                                Y Offset: {config.headerCover?.offsetY || 0}%
                                                            </label>
                                                            <input
                                                                type="range"
                                                                min="-50"
                                                                max="50"
                                                                value={config.headerCover?.offsetY || 0}
                                                                onChange={(e) => {
                                                                    updateConfig({
                                                                        headerCover: {
                                                                            ...config.headerCover,
                                                                            offsetY: parseInt(e.target.value)
                                                                        }
                                                                    })
                                                                    window.dispatchEvent(new CustomEvent('frontendSync'))
                                                                }}
                                                                style={{ width: '100%' }}
                                                            />
                                                        </div>

                                                        {/* Action Buttons */}
                                                        {/* Remove Cover Button */}
                                                        <div style={{ marginTop: 12 }}>
                                                            <button
                                                                onClick={() => {
                                                                    updateConfig({ headerCover: { image: null, scale: 1, offsetX: 0, offsetY: 0 } })
                                                                    window.dispatchEvent(new CustomEvent('frontendSync'))
                                                                }}
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '10px 14px',
                                                                    background: 'none',
                                                                    color: '#DC2626',
                                                                    border: '1px solid #DC2626',
                                                                    borderRadius: 8,
                                                                    fontSize: 12,
                                                                    fontWeight: 600,
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                ✕ Remove Cover
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}

                                        {/* Logo inputs only show when mode is "logo" */}
                                        {config.headerBranding?.mode === 'logo' && (
                                            <>
                                                {/* Logo Light Upload */}
                                                <div style={{ marginBottom: 16 }}>
                                                    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>
                                                        Logo (Light Mode)
                                                    </label>
                                                    <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 8 }}>Dark logo for white/light backgrounds</p>
                                                    <div
                                                        onClick={() => document.getElementById('logo-light-upload')?.click()}
                                                        style={{
                                                            border: '2px dashed #D1D5DB',
                                                            borderRadius: 8,
                                                            padding: 20,
                                                            textAlign: 'center',
                                                            cursor: 'pointer',
                                                            background: '#FAFAFA'
                                                        }}
                                                    >
                                                        {config.logoLight ? (
                                                            <img src={config.logoLight} alt="Logo Light" style={{ maxHeight: 48, width: 'auto' }} />
                                                        ) : (
                                                            <span style={{ color: '#9CA3AF', fontSize: 13 }}>📷 Click to upload PNG/JPG</span>
                                                        )}
                                                    </div>
                                                    <input
                                                        id="logo-light-upload"
                                                        type="file"
                                                        accept="image/png,image/jpeg"
                                                        style={{ display: 'none' }}
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0]
                                                            if (!file) return
                                                            const reader = new FileReader()
                                                            reader.onload = (ev) => {
                                                                updateConfig({ logoLight: ev.target.result })
                                                                window.dispatchEvent(new CustomEvent('frontendSync'))
                                                            }
                                                            reader.readAsDataURL(file)
                                                        }}
                                                    />
                                                    {config.logoLight && (
                                                        <button
                                                            onClick={() => { updateConfig({ logoLight: null }); window.dispatchEvent(new CustomEvent('frontendSync')) }}
                                                            style={{ marginTop: 8, fontSize: 11, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer' }}
                                                        >
                                                            ✕ Remove
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Logo Dark Upload */}
                                                <div>
                                                    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>
                                                        Logo (Dark Mode)
                                                    </label>
                                                    <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 8 }}>Light/white logo for dark backgrounds</p>
                                                    <div
                                                        onClick={() => document.getElementById('logo-dark-upload')?.click()}
                                                        style={{
                                                            border: '2px dashed #D1D5DB',
                                                            borderRadius: 8,
                                                            padding: 20,
                                                            textAlign: 'center',
                                                            cursor: 'pointer',
                                                            background: '#1F2937'
                                                        }}
                                                    >
                                                        {config.logoDark ? (
                                                            <img src={config.logoDark} alt="Logo Dark" style={{ maxHeight: 48, width: 'auto' }} />
                                                        ) : (
                                                            <span style={{ color: '#9CA3AF', fontSize: 13 }}>📷 Click to upload PNG/JPG</span>
                                                        )}
                                                    </div>
                                                    <input
                                                        id="logo-dark-upload"
                                                        type="file"
                                                        accept="image/png,image/jpeg"
                                                        style={{ display: 'none' }}
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0]
                                                            if (!file) return
                                                            const reader = new FileReader()
                                                            reader.onload = (ev) => {
                                                                updateConfig({ logoDark: ev.target.result })
                                                                window.dispatchEvent(new CustomEvent('frontendSync'))
                                                            }
                                                            reader.readAsDataURL(file)
                                                        }}
                                                    />
                                                    {config.logoDark && (
                                                        <button
                                                            onClick={() => { updateConfig({ logoDark: null }); window.dispatchEvent(new CustomEvent('frontendSync')) }}
                                                            style={{ marginTop: 8, fontSize: 11, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer' }}
                                                        >
                                                            ✕ Remove
                                                        </button>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </>
                            )}



                            {/* Modo Oscuro - Light/Dark Toggle */}
                            <h3 style={labelStyle}>🌙 MODO OSCURO</h3>
                            <div style={cardStyle}>
                                <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12 }}>Tema de la aplicación</p>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                        onClick={() => {
                                            updateConfig({ canvasMode: 'light' })
                                            window.dispatchEvent(new CustomEvent('frontendSync'))
                                        }}
                                        style={{
                                            flex: 1,
                                            padding: '12px 16px',
                                            borderRadius: 10,
                                            border: config.canvasMode === 'light' || !config.canvasMode ? '2px solid #22C55E' : '1px solid #E5E7EB',
                                            background: '#FFFFFF',
                                            color: '#1F2937',
                                            fontSize: 14,
                                            fontWeight: 600,
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
                                            borderRadius: 10,
                                            border: config.canvasMode === 'dark' ? '2px solid #22C55E' : '1px solid #E5E7EB',
                                            background: '#1F2937',
                                            color: '#FFFFFF',
                                            fontSize: 14,
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        🌙 Oscuro
                                    </button>
                                </div>
                            </div>

                            {/* INFO PILL COLORS — Pill customization */}
                            <h3 style={labelStyle}>🔘 INFO PILL COLORS</h3>
                            <div style={cardStyle}>
                                <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12 }}>Personaliza los colores de los botones en la página Info. Toca un pill para editar.</p>
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
                                                    const input = document.getElementById(`sa-pill-color-${pill.id}`)
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
                                                    id={`sa-pill-color-${pill.id}`}
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
                                <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 8 }}>Toca cualquier pill para cambiar su color de fondo</p>
                            </div>

                            {/* CAMERA BRANDING — Icon and color customization */}
                            <h3 style={labelStyle}>📷 CAMERA BUTTON</h3>
                            <div style={cardStyle}>
                                <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12 }}>Personaliza el botón de cámara en la barra de navegación</p>

                                {/* Enable toggle */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                                    <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Estilo personalizado</label>
                                    <button
                                        onClick={() => {
                                            updateConfig({ camera: { ...config.camera, enabled: !config.camera?.enabled } })
                                            window.dispatchEvent(new CustomEvent('frontendSync'))
                                        }}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: 16,
                                            border: 'none',
                                            backgroundColor: config.camera?.enabled ? '#22C55E' : '#E5E7EB',
                                            color: config.camera?.enabled ? 'white' : '#6B7280',
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
                                        <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 8 }}>Ícono de cámara</label>
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
                                                            border: isSelected ? '2px solid #22C55E' : '1px solid #E5E7EB',
                                                            backgroundColor: isSelected ? '#F0FDF4' : '#FFFFFF',
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
                                                        <span style={{ fontSize: 10, color: '#6B7280' }}>{icon.label}</span>
                                                    </button>
                                                )
                                            })}
                                        </div>

                                        {/* Color picker */}
                                        <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 8 }}>Color del botón</label>
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
                                            <span style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace' }}>
                                                {(config.camera?.color || '#8B7355').toUpperCase()}
                                            </span>
                                        </div>

                                        {/* Text color toggle */}
                                        <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 8 }}>Color del ícono</label>
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
                                                            border: isSelected ? '2px solid #22C55E' : '1px solid #E5E7EB',
                                                            backgroundColor: mode === 'black' ? '#1F2937' : mode === 'white' ? '#FFFFFF' : '#F3F4F6',
                                                            color: mode === 'black' ? '#FFFFFF' : mode === 'white' ? '#1F2937' : '#6B7280',
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

                            {/* Divider Preset Selector */}
                            <h3 style={labelStyle}>🖼️ IMAGEN DECORATIVA (Menú/Pedido)</h3>
                            <div style={cardStyle}>
                                <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12 }}>Imagen que aparece debajo del nombre en Menú y Pedido</p>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                                    {DIVIDER_PRESETS.map(preset => (
                                        <div
                                            key={preset.id}
                                            onClick={() => { updateConfig({ dividerPresetId: preset.id }); window.dispatchEvent(new CustomEvent('frontendSync')) }}
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
                                                            window.dispatchEvent(new CustomEvent('frontendSync'))
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
                                                            window.dispatchEvent(new CustomEvent('frontendSync'))
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
                                    <label className="toggle"><input type="checkbox" checked={config.features?.ordersEnabled ?? true} onChange={() => { updateConfig({ features: { ...config.features, ordersEnabled: !config.features?.ordersEnabled } }); window.dispatchEvent(new CustomEvent('frontendSync')) }} /><span className="toggle-slider"></span></label>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 14, color: '#374151' }}>Pausar pedidos</span>
                                    <label className="toggle"><input type="checkbox" checked={config.pauseOrders ?? false} onChange={() => { updateConfig({ pauseOrders: !config.pauseOrders }); window.dispatchEvent(new CustomEvent('frontendSync')) }} /><span className="toggle-slider"></span></label>
                                </div>
                            </div>

                            <h3 style={labelStyle}>📋 MODO DE OPERACIÓN</h3>
                            <div style={cardStyle}>
                                <select value={config.orderMode || 'A1'} onChange={(e) => { updateConfig({ orderMode: e.target.value }); window.dispatchEvent(new CustomEvent('frontendSync')) }} style={{ width: '100%', padding: '12px 14px', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 14, background: 'white' }}>
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

            {/* Cover Image Editor Modal */}
            <CoverImageEditor
                isOpen={showCoverEditor}
                onClose={() => setShowCoverEditor(false)}
                onSave={(data) => {
                    updateConfig({ headerCover: data })
                    window.dispatchEvent(new CustomEvent('frontendSync'))
                }}
                initialData={{ ...config.headerCover, returnState: { activeTab: 'branding' } }}
                config={config}
            />
        </>
    )
}

export default SuperAdmin
