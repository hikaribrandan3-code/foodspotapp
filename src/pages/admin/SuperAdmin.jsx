import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getOrders, updateOrder } from '../../utils/storage.js'
import { getSession } from '../../utils/auth.js'
import { verifyDeliveryCode, getPhoneLast4 } from '../../utils/deliveryUtils.js'
import { canAdvanceOrder, getOrderStatusInfo } from '../../utils/orderStateGuard.js' // Shared Logic Gate
import { supabase, signOut, getCurrentUser, updateBranding, updateMenuItemCloud, addMenuItemCloud, getOrdersCloud, subscribeToOrders } from '../../lib/supabaseClient.js'

import { updateConfig, CURATED_FONTS, CONFIRMATION_COLORS, FONT_WEIGHTS, HERO_DEFAULT } from '../../config/appConfig.v2.js'
import { getMenu, saveMenu, updateMenuItem, addMenuItem, removeMenuItem, addCategory } from '../../config/menuData.js'
import { DIVIDER_PRESETS } from '../../config/dividerPresets.js'
import { processAndStoreImage, formatFileSize } from '../../utils/imageOptimizer.js'
import BrandingColorPicker from '../../components/BrandingColorPicker.jsx'
import HeroIconPicker from '../../components/HeroIconPicker.jsx'
import CoverImageEditor from '../../components/CoverImageEditor.jsx'
import BackendHeader from '../../components/BackendHeader.jsx'
import BackendNav from '../../components/BackendNav.jsx'
import { useAdminIntent } from '../../contexts/AdminIntentContext.jsx'
import { useBusinessId } from '../../contexts/TenantContext.jsx'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import { ORDER_STATUS } from '../../constants/database.js';
import { PAYMENT_METHOD } from '../../constants/database.js';



const formatAddress = (addr) => {
    if (!addr) return '';
    if (typeof addr === 'string') return addr;
    const parts = [];
    if (addr.street) parts.push(addr.street);
    if (addr.number) parts.push(addr.number);
    if (addr.floor) parts.push(`Piso ${addr.floor}`);
    if (addr.notes) parts.push(`(${addr.notes})`);
    return parts.join(', ');
};

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

async function isTrueSuperAdmin() {
    try {
        const session = await getSession()
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
function SuperAdmin({ config: configProp }) {
    // 🛡️ NULL GUARD: Ensure config is always an object (prevents f[b] crash)
    const config = configProp || {};

    const navigate = useNavigate()
    const location = useLocation()
    const businessId = useBusinessId() // 🏢 PHASE 3: Dynamic tenant identity
    const { t } = useLanguage()
    // NOTE: config comes from props, not local state
    const [menu, setMenu] = useState(() => getMenu())
    const [orders, setOrders] = useState(() => getOrders())
    // PATCH: Restore active tab from navigation state if present
    // New 5-tab structure: summary, menu, branding, orders, analytics
    const [activeTab, setActiveTab] = useState(() => location.state?.activeTab || 'summary')
    const [demoAnalytics, setDemoAnalytics] = useState(true)
    const [demoData] = useState(() => generateDemoData())
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [authLoading, setAuthLoading] = useState(true)
    const [userRole, setUserRole] = useState('superadmin')
    const [error, setError] = useState('')
    const [editingItem, setEditingItem] = useState(null)
    // PATCH: Restore editor modal state from navigation state if present
    const [showCoverEditor, setShowCoverEditor] = useState(() => location.state?.returnToEditor || false)

    // 🛡️ CLOUD WRITE FEEDBACK: Shows "Saved" toast after successful cloud writes
    const [saveStatus, setSaveStatus] = useState(null) // null | 'saving' | 'saved' | 'error'

    // Mode is derived from context, not local state
    // Simulation is ephemeral - dies on refresh

    // Image upload state
    const [uploadingItemId, setUploadingItemId] = useState(null)
    const [uploadStatus, setUploadStatus] = useState(null)
    // State for granular editing (Moved from invalid location)
    const [editingPillId, setEditingPillId] = useState(null)
    const [uploadingFeaturedSlot, setUploadingFeaturedSlot] = useState(null)
    const menuImageInputRef = useRef(null)
    const featuredImageInputRef = useRef(null)

    // Delivery management state
    const [deliveryConfirmCode, setDeliveryConfirmCode] = useState({})
    const [paymentMethodSelect, setPaymentMethodSelect] = useState({})

    // Category creation state
    const [showAddCategory, setShowAddCategory] = useState(false)
    const [newCategoryName, setNewCategoryName] = useState('')
    const [newCategoryIcon, setNewCategoryIcon] = useState('📦')

    // Role Lens Hooks - activeRoleView is the source of truth for simulation
    const { activeRoleView, isSimulated, enterOwnerView, enterStaffView, exitSimulation } = useAdminIntent()

    // Derive current mode from context (defaults to 'superadmin' when not simulating)
    const currentMode = activeRoleView || 'superadmin'

    // 🛡️ SUPABASE AUTH: Check session on mount
    useEffect(() => {
        const checkAuth = async () => {
            setAuthLoading(true)
            const { user } = await getCurrentUser()
            if (user) {
                setIsAuthenticated(true)
                setUserRole('superadmin') // You're the boss
            }
            setAuthLoading(false)
        }
        checkAuth()
    }, [])

    // 🛡️ SUPABASE: Cloud-first orders fetch with realtime subscription
    useEffect(() => {
        // 🏢 PHASE 3: Using dynamic businessId from TenantContext
        // 🛡️ NULL GUARD: Super Admin may not have tenant context
        if (!businessId) {
            console.log('[SuperAdmin] No businessId, skipping cloud order fetch')
            return
        }

        const loadCloudOrders = async () => {
            try {
                const { data: cloudOrders, error } = await getOrdersCloud(businessId)
                if (!error && cloudOrders?.length > 0) {
                    setOrders(cloudOrders)
                }
            } catch {
                // Silent fallback to localStorage
            }
        }
        loadCloudOrders()

        // Realtime subscription for live order updates
        const subscription = subscribeToOrders(
            businessId, // 🏢 Dynamic from TenantContext
            // onInsert: New order arrives
            (newOrder) => {
                setOrders(prev => [newOrder, ...prev])
            },
            // onUpdate: Order status changed
            (orderId, updatedOrder) => {
                setOrders(prev => prev.map(o =>
                    o.id === orderId ? { ...o, status: updatedOrder.status } : o
                ))
            }
        )

        return () => {
            subscription.unsubscribe()
        }
    }, [businessId]) // 🛡️ Add businessId to dependency array

    // 🛡️ FIX: Update activeTab when returning from CoverPreview (navigation state change)
    // This fixes the "white void" where the branding tab content doesn't render after returning
    useEffect(() => {
        if (location.state?.activeTab && location.state.activeTab !== activeTab) {
            setActiveTab(location.state.activeTab)
        }
        // Also re-open cover editor if coming back for more edits
        if (location.state?.returnToEditor) {
            setShowCoverEditor(true)
        }
    }, [location.state])

    useEffect(() => {
        const interval = setInterval(() => {
            window.dispatchEvent(new CustomEvent('frontendSync'))
            setOrders(getOrders())
            setMenu(getMenu())
        }, 2000)
        return () => clearInterval(interval)
    }, [])

    // 🛡️ SUPABASE AUTH: Login with email/password
    const handleLogin = async (e) => {
        e.preventDefault()
        setAuthLoading(true)
        setError('')

        // 🛡️ MISSION PROTOCOL: STRICT HARD-SEAL ENTRANCE
        if (email.toLowerCase() !== 'superadmin@foodspot.app') {
            setAuthLoading(false)
            setError('Acceso denegado: Email no autorizado para la Bóveda de Sistema.')
            return
        }

        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password
            })

            if (authError) throw authError

            // Double lock validation
            if (data?.user?.email?.toLowerCase() !== 'superadmin@foodspot.app') {
                await supabase.auth.signOut()
                throw new Error('Unauthorized Identity')
            }

            setIsAuthenticated(true)
            setUserRole('superadmin')
        } catch (err) {
            console.error('Login error:', err)
            setError(err.message || 'Credenciales incorrectas')
        } finally {
            setAuthLoading(false)
        }
    }

    // 🛡️ SUPABASE AUTH: Logout
    const handleLogout = async () => {
        await signOut()
        setIsAuthenticated(false)
        navigate('/')
    }

    // Stats calculations
    const today = new Date().toDateString()
    const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === today)
    const mpOrders = todayOrders.filter(o => o.paymentMethod === PAYMENT_METHOD.MERCADO_PAGO)
    const cashOrders = todayOrders.filter(o => o.paymentMethod === PAYMENT_METHOD.CASH || !o.paymentMethod)
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

    // Update business info (LOCAL ONLY - DEPRECATED, use updateBusinessInfoCloud)
    const updateBusinessInfo = (field, value) => {
        const newInfo = { ...config.businessInfo, [field]: value }
        updateConfig({ businessInfo: newInfo })
        window.dispatchEvent(new CustomEvent('frontendSync'))
    }

    // =========================================================
    // CLOUD-FIRST WRITE HANDLERS (Safe Config Protocol)
    // =========================================================

    // Cloud-first write for Business Info fields
    const updateBusinessInfoCloud = async (field, value) => {
        // Map local field names to Supabase column names
        const columnMap = {
            whatsapp: 'whatsapp',
            address: 'address',
            hours: 'hours',
            googleMapsLink: 'google_maps_link',
            directions: 'directions'
        }
        const column = columnMap[field]
        if (!column) return

        // 🏢 PHASE 3: Using dynamic businessId from TenantContext
        // 🛡️ NULL GUARD: Skip cloud write if no businessId (super admin mode)
        if (!businessId) {
            // Local-only update for super admin
            const newInfo = { ...config.businessInfo, [field]: value }
            updateConfig({ businessInfo: newInfo })
            window.dispatchEvent(new CustomEvent('frontendSync'))
            return
        }

        setSaveStatus('saving')

        // 1. Write to cloud first
        const { error } = await updateBranding({ [column]: value }, businessId)

        // 2. Only update local on success
        if (!error) {
            const newInfo = { ...config.businessInfo, [field]: value }
            updateConfig({ businessInfo: newInfo })
            window.dispatchEvent(new CustomEvent('frontendSync'))
            setSaveStatus('saved')
            setTimeout(() => setSaveStatus(null), 1500)
        } else {
            setSaveStatus('error')
            setTimeout(() => setSaveStatus(null), 2000)
        }
    }

    // Cloud-first write for Branding fields
    const updateBrandingCloud = async (field, value) => {
        // Map local field names to Supabase column names
        const columnMap = {
            businessName: 'business_name',
            primaryColor: 'confirmation_color',
            fontFamily: 'font_family',
            fontWeight: 'font_weight',
            mercadoPagoAccessToken: 'mp_access_token'
        }
        const column = columnMap[field]
        if (!column) return

        // 🏢 PHASE 3: Using dynamic businessId from TenantContext
        // 🛡️ NULL GUARD: Skip cloud write if no businessId (super admin mode)
        if (!businessId) {
            // Local-only update for super admin
            if (field === 'businessName') {
                updateConfig({ businessName: value })
            } else if (field === 'primaryColor') {
                updateConfig({
                    branding: { ...config.branding, primaryColor: value },
                    colors: { ...config.colors, primary: value }
                })
            } else {
                updateConfig({ branding: { ...config.branding, [field]: value } })
            }
            window.dispatchEvent(new CustomEvent('frontendSync'))
            return
        }

        setSaveStatus('saving')

        // 1. Write to cloud first
        const { error } = await updateBranding({ [column]: value }, businessId)

        // 2. Only update local on success
        if (!error) {
            if (field === 'businessName') {
                updateConfig({ businessName: value })
            } else if (field === 'primaryColor') {
                // DUAL-PATH UPDATE: Sync both branding.primaryColor AND colors.primary
                updateConfig({
                    branding: { ...config.branding, primaryColor: value },
                    colors: { ...config.colors, primary: value }
                })
            } else {
                updateConfig({ branding: { ...config.branding, [field]: value } })
            }
            window.dispatchEvent(new CustomEvent('frontendSync'))
            setSaveStatus('saved')
            setTimeout(() => setSaveStatus(null), 1500)
        } else {
            setSaveStatus('error')
            setTimeout(() => setSaveStatus(null), 2000)
        }
    }

    // Update menu item (CLOUD-FIRST: Safe Config Protocol)
    const handleUpdateMenuItem = async (categoryId, itemId, updates) => {
        // 🏢 PHASE 3: Using dynamic businessId from TenantContext
        // 🛡️ NULL GUARD: Skip cloud write if no businessId
        if (!businessId) {
            // Local-only update
            updateMenuItem(categoryId, itemId, updates)
            setMenu(getMenu())
            return
        }

        // 1. Write to cloud first
        const { error } = await updateMenuItemCloud(itemId, updates, businessId)

        // 2. Only update local on success
        if (!error) {
            updateMenuItem(categoryId, itemId, updates)
            setMenu(getMenu())
            setSaveStatus('saved')
            setTimeout(() => setSaveStatus(null), 1500)
        } else {
            setSaveStatus('error')
            setTimeout(() => setSaveStatus(null), 2000)
        }
    }

    // Add new menu item (CLOUD-FIRST: Safe Config Protocol)
    const handleAddMenuItem = async (categoryId) => {
        const newId = `item-${Date.now()}`
        const newItem = {
            id: newId,
            categoryId: categoryId,
            name: 'Nuevo item',
            price: 0,
            available: true,
            featured: false,
            displayOrder: menu.categories.find(c => c.id === categoryId)?.items?.length || 0
        }

        // 🏢 PHASE 3: Using dynamic businessId from TenantContext
        // 🛡️ NULL GUARD: Skip cloud write if no businessId
        if (!businessId) {
            // Local-only update
            addMenuItem(categoryId, { name: 'Nuevo item', price: 0 })
            setMenu(getMenu())
            return
        }

        setSaveStatus('saving')

        // 1. Write to cloud first
        const { error } = await addMenuItemCloud(newItem, businessId)

        // 2. Only update local on success
        if (!error) {
            addMenuItem(categoryId, { name: 'Nuevo item', price: 0 })
            setMenu(getMenu())
            setSaveStatus('saved')
            setTimeout(() => setSaveStatus(null), 1500)
        } else {
            setSaveStatus('error')
            setTimeout(() => setSaveStatus(null), 2000)
        }
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
        // Toggle between Owner and S        // ============================
        // PREMIUM LIGHT LOGIN UI
        // ============================
        return (
            <div style={{
                background: 'radial-gradient(circle at top left, #e0eaff 0%, #f7f9fb 100%)',
                minHeight: '100dvh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: '"Montserrat", sans-serif',
                color: '#191c1e',
                padding: 24,
                position: 'relative'
            }}>
            {/* TopAppBar */}
            <header style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: '100%',
                padding: '16px 24px',
                background: '#ffffff',
                boxShadow: '0 4px 20px rgba(0, 88, 188, 0.05)',
                zIndex: 50
            }}>
                <h1 style={{
                    fontFamily: '"Montserrat", sans-serif',
                    fontWeight: 700,
                    fontSize: 24,
                    letterSpacing: '-0.025em',
                    color: '#0058bc',
                    margin: 0
                }}>FoodSpot Admin</h1>
            </header>

            <main style={{ width: '100%', maxWidth: 448, marginTop: 80, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {/* Auth Card */}
                    <div style={{
                        width: '100%',
                        background: '#ffffff',
                        padding: 32,
                        borderRadius: 12,
                        boxShadow: '0 40px 80px -20px rgba(0, 88, 188, 0.08), 0 0 40px rgba(0, 88, 188, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.5)',
                        backdropFilter: 'blur(4px)',
                        WebkitBackdropFilter: 'blur(4px)'
                    }}>
                        <h2 style={{ fontSize: 24, fontWeight: 700, color: '#191c1e', marginBottom: 32, textAlign: 'center', margin: '0 0 32px 0' }}>Super Admin Access</h2>

                        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            {/* Email Field */}
                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    color: '#414755',
                                    marginLeft: 4,
                                    marginBottom: 8
                                }}>Email Address</label>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <span style={{ position: 'absolute', left: 16, color: '#414755', fontSize: 20 }}>✉️</span>
                                    <input
                                        type="email"
                                        placeholder="admin@foodspot.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        autoFocus
                                        disabled={authLoading}
                                        style={{
                                            width: '100%',
                                            padding: '16px 16px 16px 48px',
                                            background: '#f2f4f6',
                                            border: '1px solid rgba(193, 198, 215, 0.15)',
                                            borderRadius: 8,
                                            fontSize: 16,
                                            color: '#191c1e',
                                            outline: 'none',
                                            transition: 'all 0.3s ease',
                                            boxSizing: 'border-box'
                                        }}
                                        onFocus={(e) => {
                                            e.target.style.background = '#ffffff'
                                            e.target.style.borderColor = '#0058bc'
                                            e.target.style.boxShadow = '0 0 0 4px rgba(0, 88, 188, 0.1)'
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.background = '#f2f4f6'
                                            e.target.style.borderColor = 'rgba(193, 198, 215, 0.15)'
                                            e.target.style.boxShadow = 'none'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Password Field */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
                                    <label style={{
                                        display: 'block',
                                        fontSize: 12,
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        color: '#414755',
                                        marginLeft: 4,
                                        margin: 0
                                    }}>Security Key</label>
                                    <a href="#" style={{ fontSize: 12, fontWeight: 700, color: '#0058bc', textDecoration: 'none' }}>Forgot Password?</a>
                                </div>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <span style={{ position: 'absolute', left: 16, color: '#414755', fontSize: 20 }}>🔒</span>
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={authLoading}
                                        style={{
                                            width: '100%',
                                            padding: '16px 16px 16px 48px',
                                            background: '#f2f4f6',
                                            border: '1px solid rgba(193, 198, 215, 0.15)',
                                            borderRadius: 8,
                                            fontSize: 16,
                                            color: '#191c1e',
                                            outline: 'none',
                                            transition: 'all 0.3s ease',
                                            boxSizing: 'border-box'
                                        }}
                                        onFocus={(e) => {
                                            e.target.style.background = '#ffffff'
                                            e.target.style.borderColor = '#0058bc'
                                            e.target.style.boxShadow = '0 0 0 4px rgba(0, 88, 188, 0.1)'
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.background = '#f2f4f6'
                                            e.target.style.borderColor = 'rgba(193, 198, 215, 0.15)'
                                            e.target.style.boxShadow = 'none'
                                        }}
                                    />
                                </div>
                                
                                {/* Error Message */}
                                {error && (
                                    <p style={{
                                        color: '#ba1a1a',
                                        textAlign: 'center',
                                        fontSize: 13,
                                        marginTop: 12,
                                        background: 'rgba(186, 26, 26, 0.1)',
                                        padding: '10px 16px',
                                        borderRadius: 12,
                                        border: '1px solid rgba(186, 26, 26, 0.2)'
                                    }}>{error}</p>
                                )}

                                {/* Access Strength Meter */}
                                <div style={{ paddingTop: 8, paddingLeft: 4, paddingRight: 4, marginTop: 8 }}>
                                    <div style={{ display: 'flex', gap: 6, height: 4, width: '100%' }}>
                                        <div style={{ flex: 1, backgroundColor: '#0058bc', borderRadius: 9999 }} />
                                        <div style={{ flex: 1, backgroundColor: '#0058bc', borderRadius: 9999 }} />
                                        <div style={{ flex: 1, backgroundColor: password.length > 4 ? '#0058bc' : '#e0e3e5', borderRadius: 9999 }} />
                                        <div style={{ flex: 1, backgroundColor: password.length > 6 ? '#0058bc' : '#e0e3e5', borderRadius: 9999 }} />
                                        <div style={{ flex: 1, backgroundColor: password.length > 8 ? '#0058bc' : '#e0e3e5', borderRadius: 9999 }} />
                                    </div>
                                    <p style={{ fontSize: 10, marginTop: 8, fontWeight: 500, color: '#414755' }}>
                                        Access Strength: <span style={{ color: '#0058bc', fontWeight: 700 }}>
                                        {password.length === 0 ? 'None' : password.length <= 4 ? 'Standard' : password.length <= 8 ? 'Strong' : 'Maximum'}
                                        </span>
                                    </p>
                                </div>
                            </div>

                            {/* Login Button */}
                            <button
                                type="submit"
                                disabled={authLoading}
                                style={{
                                    width: '100%',
                                    padding: '16px 0',
                                    background: authLoading ? '#e0e3e5' : 'linear-gradient(to right, #0058bc, #0070eb)',
                                    color: authLoading ? '#717786' : '#ffffff',
                                    fontWeight: 700,
                                    borderRadius: 8,
                                    border: 'none',
                                    boxShadow: authLoading ? 'none' : '0 10px 15px -3px rgba(0, 88, 188, 0.25)',
                                    cursor: authLoading ? 'wait' : 'pointer',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                    marginTop: 16
                                }}
                                onMouseDown={(e) => !authLoading && (e.currentTarget.style.transform = 'scale(0.98)')}
                                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                {authLoading ? 'Verificando...' : 'Login'}
                                {!authLoading && <span style={{ fontSize: 18 }}>→</span>}
                            </button>
                        </form>
                    </div>
                </main>

                {/* Secondary Action */}
                <div style={{ width: '100%', maxWidth: 448, display: 'flex', justifyContent: 'center' }}>
                    <a 
                        href="#" 
                        onClick={(e) => { e.preventDefault(); window.location.href = '/'; }}
                        style={{
                            marginTop: 40,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            color: '#414755',
                            fontWeight: 700,
                            textDecoration: 'none',
                            transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#0058bc'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#414755'}
                    >
                        <span style={{ fontSize: 18 }}>←</span>
                        Back to Public Portal
                    </a>
                </div>

                {/* Footer Semantic Shell */}
                <footer style={{
                    position: 'fixed',
                    bottom: 0,
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                    gap: 16,
                    paddingBottom: 32,
                    fontFamily: '"Montserrat", sans-serif',
                    fontSize: 14,
                    color: '#717786'
                }}>
                    <span style={{ color: '#414755', opacity: 0.6 }}>© 2026 FoodSpot Systems</span>
                    <div style={{ display: 'flex', gap: 24 }}>
                        <a href="#" style={{ color: '#717786', textDecoration: 'none', transition: 'color 0.2s ease' }} onMouseEnter={(e)=>e.currentTarget.style.color='#0058bc'} onMouseLeave={(e)=>e.currentTarget.style.color='#717786'}>Privacy Policy</a>
                        <a href="#" style={{ color: '#717786', textDecoration: 'none', transition: 'color 0.2s ease' }} onMouseEnter={(e)=>e.currentTarget.style.color='#0058bc'} onMouseLeave={(e)=>e.currentTarget.style.color='#717786'}>Terms of Service</a>
                        <a href="#" style={{ color: '#717786', textDecoration: 'none', transition: 'color 0.2s ease' }} onMouseEnter={(e)=>e.currentTarget.style.color='#0058bc'} onMouseLeave={(e)=>e.currentTarget.style.color='#717786'}>Help Center</a>
                    </div>
                </footer>
            </div>
        )
    }
    // Badge counts for bottom nav
    const activeOrders = orders.filter(o => o.status !== ORDER_STATUS.DELIVERED)
    const pendingDeliveries = orders.filter(o => o.order_type === 'delivery' && o.status !== ORDER_STATUS.DELIVERED && o.status !== ORDER_STATUS.CANCELLED)
    const navBadges = {
        orders: activeOrders.length,
        delivery: pendingDeliveries.length
    }

    // Mode options for dropdown (superadmin only)
    const modeOptions = [
        { value: 'superadmin', label: '👑 Super Admin', color: '#7C3AED' },
        { value: 'owner', label: 'Owner', color: '#22C55E' },
        { value: 'staff', label: 'Staff', color: '#6366F1' },
        { value: 'customer', label: 'Customer', color: '#F59E0B' }
    ]

    // Handle mode change - PURE NAVIGATION (no simulation state)
    // SuperAdmin role hierarchy already grants access to all routes
    const handleModeChange = (nextMode) => {
        // Idempotency: same mode = no-op
        if (nextMode === currentMode) return

        // Navigate to the target dashboard - ProtectedRoute will handle access
        switch (nextMode) {
            case 'superadmin':
                exitSimulation() // Clear any lingering simulation state
                navigate('/admin', { replace: true })
                break
            case 'owner':
                navigate('/owner/summary', { replace: true })
                break
            case 'staff':
                navigate('/staff/dashboard', { replace: true })
                break
            case 'customer':
                navigate('/', { replace: true })
                break
            default:
                break
        }
    }

    // Sub-tab removed - using flat bottom nav structure

    const roleLabel = 'Super Admin'
    const canEdit = true

    // Card style helper
    const cardStyle = { background: 'white', borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }
    const labelStyle = { fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }
    const inputStyle = { width: '100%', padding: '12px 14px', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 14, boxSizing: 'border-box', marginBottom: 12 }

    return (
        <>
            <div className="backend-surface" style={{ minHeight: '100vh', background: '#F5F2EE', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                <BackendHeader
                    title={<>Modo: Super Admin <span style={{ fontSize: 10, background: '#DC2626', color: 'white', padding: '2px 6px', borderRadius: 10, marginLeft: 6, fontWeight: 700 }}>v2.0 LIVE</span></>}
                    onLogout={handleLogout}
                    showDateSelector={false}
                    showNotifications={false}
                    showAvatar={false}
                    extraActions={
                        <>
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
                            {userRole === 'superadmin' && isSimulated && (
                                <button
                                    onClick={() => exitSimulation()}
                                    style={{
                                        padding: '6px 12px',
                                        fontSize: 11,
                                        fontWeight: 600,
                                        border: 'none',
                                        borderRadius: 5,
                                        cursor: 'pointer',
                                        background: '#EF4444',
                                        color: 'white'
                                    }}
                                >
                                    Salir de Simulación
                                </button>
                            )}
                            {/* Vista Cliente - Navigate to frontend without logout */}
                            <button
                                onClick={() => navigate('/')}
                                style={{
                                    padding: '6px 12px',
                                    fontSize: 11,
                                    fontWeight: 600,
                                    border: 'none',
                                    borderRadius: 5,
                                    cursor: 'pointer',
                                    background: '#3B82F6',
                                    color: 'white'
                                }}
                            >
                                Vista Cliente
                            </button>
                        </>
                    }
                />

                {/* Content - with bottom padding for BackendNav */}
                <div style={{ padding: 16, paddingBottom: 'calc(88px + env(safe-area-inset-bottom, 0px))' }}>

                    {/* SUMMARY TAB */}
                    {activeTab === 'summary' && (
                        <>
                            {/* 1. FINANCIAL DASHBOARD (Top Priority) */}
                            <h3 style={labelStyle}>💳 PAGOS DEL DÍA</h3>
                            <div style={cardStyle}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid #F3F4F6' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#E0F2F1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>💳</div>
                                        <div><p style={{ fontSize: 14, fontWeight: 500, color: '#1F2937', margin: 0 }}>{t('mercado_pago')}</p><p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>{mpOrders.length} {t('sessions')}</p></div>
                                    </div>
                                    <span style={{ fontSize: 16, fontWeight: 600, color: '#22C55E' }}>${mpTotal.toLocaleString()}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #F3F4F6' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>💵</div>
                                        <div><p style={{ fontSize: 14, fontWeight: 500, color: '#1F2937', margin: 0 }}>{t('cash')}</p><p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>{cashOrders.length} {t('sessions')}</p></div>
                                    </div>
                                    <span style={{ fontSize: 16, fontWeight: 600, color: '#22C55E' }}>${cashTotal.toLocaleString()}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12 }}>
                                    <div><p style={{ fontSize: 14, fontWeight: 600, color: '#1F2937', margin: 0 }}>{t('total_day')}</p><p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>{todayOrders.length} {t('sessions')}</p></div>
                                    <span style={{ fontSize: 18, fontWeight: 700, color: '#1F2937' }}>${totalToday.toLocaleString()}</span>
                                </div>
                            </div>

                            <h3 style={labelStyle}>SESIONES</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                                <div style={cardStyle}><p style={{ fontSize: 24, fontWeight: 700, color: '#22C55E', margin: 0 }}>{weekOrders.length}</p><p style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 0' }}>{t('this_week')}</p></div>
                                <div style={cardStyle}><p style={{ fontSize: 24, fontWeight: 700, color: '#22C55E', margin: 0 }}>{monthOrders.length}</p><p style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 0' }}>{t('this_month')}</p></div>
                            </div>

                            {/* 2. ACTIVE COMMUNICATION */}
                            <h3 style={labelStyle}>📞 COMUNICACIÓN ACTIVA</h3>
                            <div style={cardStyle}>
                                <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>{t('whatsapp_contact')}</label>
                                <input type="text" placeholder="+54 11 1234-5678" value={config.businessInfo?.whatsapp || ''} onChange={(e) => updateBusinessInfoCloud('whatsapp', e.target.value)} style={inputStyle} />
                            </div>

                            {/* 3. PHYSICAL STORE INFO (LOCALIZACIÓN) */}
                            <h3 style={labelStyle}>📍 LOCALIZACIÓN</h3>
                            <div style={cardStyle}>
                                <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>{t('address')}</label>
                                <input type="text" placeholder="Av. Corrientes 1234" value={config.businessInfo?.address || ''} onChange={(e) => updateBusinessInfoCloud('address', e.target.value)} style={inputStyle} />

                                <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>Horarios</label>
                                <input type="text" placeholder="Lun-Vie 9-21, Sab 10-18" value={config.businessInfo?.hours || ''} onChange={(e) => updateBusinessInfoCloud('hours', e.target.value)} style={inputStyle} />

                                <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>Google Maps (reseñas)</label>
                                <input type="text" placeholder="https://maps.google.com/..." value={config.businessInfo?.googleMapsLink || ''} onChange={(e) => updateBusinessInfoCloud('googleMapsLink', e.target.value)} style={inputStyle} />

                                <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>Indicaciones / Notas</label>
                                <input type="text" placeholder="Timbre 2A, subir escaleras" value={config.businessInfo?.directions || ''} onChange={(e) => updateBusinessInfoCloud('directions', e.target.value)} style={inputStyle} />
                            </div>

                            {/* 4. EXTERNAL GATES (BOTTOM) */}
                            <h3 style={labelStyle}>🔗 LINKS EXTERNOS & PAGOS</h3>
                            <div style={cardStyle}>
                                {/* Mercado Pago Alias */}
                                <div style={{ paddingTop: 10, borderTop: '1px solid #F3F4F6' }}>
                                    <span style={{ fontSize: 13, color: '#374151', display: 'block', marginBottom: 6 }}>💳 Mercado Pago (Alias)</span>
                                    <input
                                        type="text"
                                        placeholder="ej: foodspot.mp"
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

                    {/* MENU TAB */}
                    {activeTab === 'menu' && canEdit && (
                        <>
                            <h3 style={labelStyle}>🍽️ GESTIÓN DE MENÚ</h3>

                            {/* 1. FEATURED SECTION (TOP 4) */}
                            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#4B5563', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Destaques de Inicio (Top 4)
                            </h3>

                            {/* Grid of 4 Featured Items */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(4, 1fr)',
                                gap: 8,
                                marginBottom: 24,
                                background: 'white',
                                padding: 12,
                                borderRadius: 12,
                                border: '1px solid #E2E8F0'
                            }}>
                                {[0, 1, 2, 3].map(slotIndex => {
                                    const currentSlot = config.featuredPhotos?.[slotIndex] || {}
                                    return (
                                        <div key={slotIndex} style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: 4
                                        }}>
                                            {/* Image Slot */}
                                            <div
                                                onClick={() => document.getElementById(`featured-img-${slotIndex}`)?.click()}
                                                style={{
                                                    aspectRatio: '1/1',
                                                    width: '100%',
                                                    background: currentSlot.image ? `url(${currentSlot.image}) center/cover` : '#F1F5F9',
                                                    borderRadius: 8,
                                                    border: '1px dashed #CBD5E1',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    position: 'relative',
                                                    overflow: 'hidden',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {!currentSlot.image && <span style={{ fontSize: 16, color: '#9CA3AF' }}>📷</span>}
                                                {uploadingFeaturedSlot === slotIndex && (
                                                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <span style={{ fontSize: 10 }}>...</span>
                                                    </div>
                                                )}
                                            </div>
                                            <input
                                                id={`featured-img-${slotIndex}`}
                                                type="file"
                                                accept="image/jpeg,image/png"
                                                onChange={(e) => handleFeaturedImageUpload(e, slotIndex)}
                                                style={{ display: 'none' }}
                                            />

                                            {/* Inputs */}
                                            <input
                                                type="text"
                                                placeholder="Nombre"
                                                value={currentSlot.name || ''}
                                                onChange={(e) => {
                                                    const newPhotos = [...(config.featuredPhotos || [{}, {}, {}, {}])]
                                                    newPhotos[slotIndex] = { ...newPhotos[slotIndex], name: e.target.value }
                                                    updateConfig({ featuredPhotos: newPhotos })
                                                    window.dispatchEvent(new CustomEvent('frontendSync'))
                                                }}
                                                style={{ width: '100%', fontSize: 10, padding: 4, borderRadius: 4, border: '1px solid #E2E8F0', textAlign: 'center' }}
                                            />
                                            <input
                                                type="number"
                                                placeholder="$"
                                                value={currentSlot.price || ''}
                                                onChange={(e) => {
                                                    const newPhotos = [...(config.featuredPhotos || [{}, {}, {}, {}])]
                                                    newPhotos[slotIndex] = { ...newPhotos[slotIndex], price: parseFloat(e.target.value) || 0 }
                                                    updateConfig({ featuredPhotos: newPhotos })
                                                    window.dispatchEvent(new CustomEvent('frontendSync'))
                                                }}
                                                style={{ width: '100%', fontSize: 10, padding: 4, borderRadius: 4, border: '1px solid #E2E8F0', textAlign: 'center' }}
                                            />
                                        </div>
                                    )
                                })}
                            </div>

                            {/* 2. VISUAL DIVIDER (Decorative Pill Branding) */}
                            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#4B5563', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Imagen Decorativa (Menú/Pedido)
                            </h3>
                            <div style={{ ...cardStyle, marginBottom: 24, border: '1px solid #E2E8F0' }}>
                                <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12 }}>Selecciona el estilo que divide el menú</p>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                                    {DIVIDER_PRESETS.map(preset => (
                                        <div
                                            key={preset.id}
                                            onClick={() => { updateConfig({ dividerPresetId: preset.id }); window.dispatchEvent(new CustomEvent('frontendSync')) }}
                                            style={{
                                                cursor: 'pointer',
                                                borderRadius: 8,
                                                overflow: 'hidden',
                                                border: config.dividerPresetId === preset.id ? '2px solid #22C55E' : '1px solid #E2E8F0',
                                                opacity: config.dividerPresetId === preset.id ? 1 : 0.7,
                                                height: 40
                                            }}
                                        >
                                            <img src={preset.url} alt={preset.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#4B5563', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Menú Principal
                            </h3>

                            {/* Add Category Button / Form */}
                            {!showAddCategory ? (
                                <button
                                    onClick={() => setShowAddCategory(true)}
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        marginBottom: 16,
                                        background: '#F3F4F6',
                                        border: '2px dashed #D1D5DB',
                                        borderRadius: 10,
                                        fontSize: 14,
                                        fontWeight: 500,
                                        color: '#6B7280',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 6
                                    }}
                                >
                                    ➕ Add Category
                                </button>
                            ) : (
                                <div style={{ ...cardStyle, marginBottom: 16, border: '2px solid #22C55E' }}>
                                    <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                                        <input
                                            type="text"
                                            placeholder="Category name"
                                            value={newCategoryName}
                                            onChange={(e) => setNewCategoryName(e.target.value)}
                                            autoFocus
                                            style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
                                        />
                                        <input
                                            type="text"
                                            placeholder="📦"
                                            value={newCategoryIcon}
                                            onChange={(e) => setNewCategoryIcon(e.target.value)}
                                            style={{ ...inputStyle, width: 60, marginBottom: 0, textAlign: 'center' }}
                                            maxLength={2}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: 10 }}>
                                        <button
                                            onClick={() => {
                                                if (newCategoryName.trim()) {
                                                    addCategory(newCategoryName.trim(), newCategoryIcon || '📦')
                                                    setMenu(getMenu()) // Refresh menu state
                                                    setNewCategoryName('')
                                                    setNewCategoryIcon('📦')
                                                    setShowAddCategory(false)
                                                }
                                            }}
                                            style={{
                                                flex: 1,
                                                padding: '10px 16px',
                                                background: '#22C55E',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: 8,
                                                fontWeight: 600,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Create Category
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowAddCategory(false)
                                                setNewCategoryName('')
                                                setNewCategoryIcon('📦')
                                            }}
                                            style={{
                                                padding: '10px 16px',
                                                background: '#F3F4F6',
                                                color: '#6B7280',
                                                border: 'none',
                                                borderRadius: 8,
                                                fontWeight: 500,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            )}

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
                                            color: config.camera?.color || config.branding?.primaryColor || '#6B7280',
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




                    {activeTab === 'branding' && canEdit && (
                        <>
                            <h3 style={labelStyle}>🎨 BRANDING Y ESTÉTICA</h3>

                            {/* SLOT 1: BASE DEL SISTEMA */}
                            <div style={cardStyle}>
                                <h4 style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 16, textTransform: 'uppercase' }}>1. Base del Sistema</h4>
                                <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>Nombre del negocio</label>
                                <input type="text" value={config.businessName || ''} onChange={(e) => updateBrandingCloud('businessName', e.target.value)} style={inputStyle} />

                                <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4, marginTop: 12 }}>Tipografía</label>
                                <select
                                    value={config.branding?.fontFamily || 'Inter'}
                                    onChange={(e) => updateBrandingCloud('fontFamily', e.target.value)}
                                    style={{ ...inputStyle, fontFamily: config.branding?.fontFamily || 'Inter' }}
                                >
                                    {CURATED_FONTS.map(font => (
                                        <option key={font.name} value={font.name}>{font.label}</option>
                                    ))}
                                </select>

                                <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4, marginTop: 12 }}>Peso de fuente</label>
                                <select
                                    value={config.branding?.fontWeight || '400'}
                                    onChange={(e) => updateBrandingCloud('fontWeight', e.target.value)}
                                    style={{ ...inputStyle, fontWeight: config.branding?.fontWeight || '400' }}
                                >
                                    {FONT_WEIGHTS.map(weight => (
                                        <option key={weight.value} value={weight.value}>{weight.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* SLOT 2: PORTADA (INICIO) */}
                            <div style={cardStyle}>
                                <h4 style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 16, textTransform: 'uppercase' }}>2. Portada (Inicio)</h4>

                                {/* Header Branding Mode Toggle */}
                                <div style={{ marginBottom: 16 }}>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>
                                        Modo de Cabecera
                                    </label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button
                                            onClick={() => {
                                                updateConfig({ headerBranding: { mode: 'cover' } })
                                                window.dispatchEvent(new CustomEvent('frontendSync'))
                                            }}
                                            style={{
                                                flex: 1, padding: '10px 12px', borderRadius: 8,
                                                border: (config.headerBranding?.mode || 'cover') === 'cover' ? '2px solid #3B82F6' : '1px solid #E5E7EB',
                                                background: (config.headerBranding?.mode || 'cover') === 'cover' ? '#EFF6FF' : 'white',
                                                color: '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer'
                                            }}
                                        >
                                            🖼️ Portada
                                        </button>
                                        <button
                                            onClick={() => {
                                                updateConfig({ headerBranding: { mode: 'text' } })
                                                window.dispatchEvent(new CustomEvent('frontendSync'))
                                            }}
                                            style={{
                                                flex: 1, padding: '10px 12px', borderRadius: 8,
                                                border: config.headerBranding?.mode === 'text' ? '2px solid #3B82F6' : '1px solid #E5E7EB',
                                                background: config.headerBranding?.mode === 'text' ? '#EFF6FF' : 'white',
                                                color: '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer'
                                            }}
                                        >
                                            📝 Solo Texto
                                        </button>
                                    </div>
                                </div>

                                {/* Cover Editor */}
                                {(config.headerBranding?.mode === 'cover' || !config.headerBranding?.mode) && (
                                    <div style={{ marginBottom: 16 }}>
                                        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>
                                            Imagen de Portada
                                        </label>
                                        {/* Cover Preview */}
                                        <div style={{
                                            background: '#111827',
                                            borderRadius: 12,
                                            padding: 12,
                                            marginBottom: 4
                                        }}>
                                            <div
                                                // 🛡️ GOOGLE FIX: Key changes = React remounts = fresh image
                                                key={`cover-${config.headerCover?.imageVersion || 0}`}
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
                                                        <span style={{ color: '#9CA3AF', fontSize: 13 }}>Sin imagen</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setShowCoverEditor(true)}
                                            onTouchEnd={(e) => { e.preventDefault(); setShowCoverEditor(true); }}
                                            style={{
                                                width: '100%',
                                                padding: '12px 16px',
                                                background: '#3B82F6',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: 8,
                                                fontSize: 13,
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                marginTop: 8
                                            }}
                                        >
                                            {config.headerCover?.image ? '✏️ Editar Portada' : '📷 Subir Portada'}
                                        </button>

                                        {config.headerCover?.image && (
                                            <button
                                                onClick={() => {
                                                    updateConfig({ headerCover: { image: null, scale: 1, offsetX: 0, offsetY: 0 } })
                                                    window.dispatchEvent(new CustomEvent('frontendSync'))
                                                }}
                                                style={{
                                                    width: '100%',
                                                    marginTop: 8,
                                                    padding: '8px',
                                                    background: 'white',
                                                    color: '#EF4444',
                                                    border: '1px solid #EF4444',
                                                    borderRadius: 8,
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                🗑️ Eliminar Portada
                                            </button>
                                        )}

                                        {/* 🛡️ EMERGENCY: Clear Storage button (COVER ONLY) */}
                                        <button
                                            onClick={() => {
                                                if (confirm('⚠️ Esto borrará solo la IMAGEN DE PORTADA para liberar espacio. Tus logos no se tocarán. ¿Continuar?')) {
                                                    try {
                                                        // Clear ONLY header cover data
                                                        const currentConfig = JSON.parse(localStorage.getItem('foodspot_config') || '{}')
                                                        delete currentConfig.headerCover
                                                        localStorage.setItem('foodspot_config', JSON.stringify(currentConfig))

                                                        // Dispatch sync
                                                        window.dispatchEvent(new CustomEvent('frontendSync'))
                                                        alert('✅ Espacio liberado. Intenta subir tu portada de nuevo.')
                                                        window.location.reload()
                                                    } catch (e) {
                                                        alert('Error: ' + e.message)
                                                    }
                                                }
                                            }}
                                            style={{
                                                width: '100%',
                                                marginTop: 16,
                                                padding: '10px',
                                                background: '#FEE2E2',
                                                color: '#991B1B',
                                                border: '1px solid #FCA5A5',
                                                borderRadius: 8,
                                                fontSize: 11,
                                                fontWeight: 600,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            🧹 Liberar Memoria de Portada (Solo Portada)
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* SLOT 3: ICONOS HERO (INICIO) */}
                            <div style={cardStyle}>
                                <h4 style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 16, textTransform: 'uppercase' }}>3. Iconos Hero (Inicio)</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    {['menu', 'delivery', 'promos', 'game'].map(iconId => {
                                        const iconConfig = config.heroIcons?.[iconId] || HERO_DEFAULT
                                        const labels = { menu: 'Menú', delivery: 'Envíos', promos: 'Promos', game: 'Juego' }
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
                                                            [iconId]: { ...iconConfig, color: newColor },
                                                            // FORCE SYNC: Double-write for legacy caches
                                                            ...(iconId === 'promos' ? { rewards: { ...iconConfig, color: newColor } } : {})
                                                        }
                                                    })
                                                    window.dispatchEvent(new CustomEvent('frontendSync'))
                                                }}
                                                onIconModeChange={(mode) => {
                                                    updateConfig({
                                                        heroIcons: {
                                                            ...config.heroIcons,
                                                            [iconId]: { ...iconConfig, iconColorMode: mode },
                                                            // FORCE SYNC: Double-write for legacy caches
                                                            ...(iconId === 'promos' ? { rewards: { ...iconConfig, iconColorMode: mode } } : {})
                                                        }
                                                    })
                                                    window.dispatchEvent(new CustomEvent('frontendSync'))
                                                }}
                                            />
                                        )
                                    })}
                                </div>
                            </div>

                            {/* SLOT 4: ESTÉTICA DE NAVEGACIÓN */}
                            <div style={cardStyle}>
                                <h4 style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 16, textTransform: 'uppercase' }}>4. Estética de Navegación</h4>

                                {/* Navbar Color */}
                                <div style={{ marginBottom: 16 }}>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>
                                        Color de la Barra de Navegación
                                    </label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <input
                                            type="color"
                                            value={config.branding?.primaryColor || '#8B7355'}
                                            onChange={(e) => updateBrandingCloud('primaryColor', e.target.value)}
                                            style={{ width: 48, height: 48, border: 'none', borderRadius: 8, cursor: 'pointer', padding: 0 }}
                                        />
                                        <div style={{ flex: 1 }}>
                                            <div style={{
                                                height: 32,
                                                background: config.branding?.primaryColor || '#8B7355',
                                                borderRadius: 6,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}>
                                                <span style={{ fontSize: 10, color: config.branding?.iconColorMode === 'white' ? 'white' : 'black', fontWeight: 600 }}>Vista Previa</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Icon Color Mode */}
                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>
                                        Color de Iconos de Navegación
                                    </label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button
                                            onClick={() => {
                                                updateConfig({ branding: { ...config.branding, iconColorMode: 'white' } })
                                                window.dispatchEvent(new CustomEvent('frontendSync'))
                                            }}
                                            style={{
                                                flex: 1, padding: '10px 12px', borderRadius: 8,
                                                border: (config.branding?.iconColorMode || 'white') === 'white' ? '2px solid #3B82F6' : '1px solid #E5E7EB',
                                                background: (config.branding?.iconColorMode || 'white') === 'white' ? '#EFF6FF' : 'white',
                                                color: '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer'
                                            }}
                                        >
                                            ⬜ Blanco
                                        </button>
                                        <button
                                            onClick={() => {
                                                updateConfig({ branding: { ...config.branding, iconColorMode: 'black' } })
                                                window.dispatchEvent(new CustomEvent('frontendSync'))
                                            }}
                                            style={{
                                                flex: 1, padding: '10px 12px', borderRadius: 8,
                                                border: config.branding?.iconColorMode === 'black' ? '2px solid #3B82F6' : '1px solid #E5E7EB',
                                                background: config.branding?.iconColorMode === 'black' ? '#EFF6FF' : 'white',
                                                color: '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer'
                                            }}
                                        >
                                            ⬛ Negro
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* SLOT 5: CONFIRMACIÓN Y CRÉDITOS */}
                            <div style={cardStyle}>
                                <h4 style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 16, textTransform: 'uppercase' }}>5. Confirmación y Créditos</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div>
                                        <p style={{ fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Color de Botón de Confirmación</p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <input type="color" value={config.colors?.confirmation || '#22C55E'} onChange={(e) => { updateConfig({ colors: { ...config.colors, confirmation: e.target.value } }); window.dispatchEvent(new CustomEvent('frontendSync')) }} style={{ width: 40, height: 40, border: '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer' }} />
                                            <span style={{ fontSize: 11, color: '#6B7280' }}>{(config.colors?.confirmation || '#22C55E').toUpperCase()}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Créditos de FoodSpot (Footer)</p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <input type="color" value={config.branding?.poweredByColor || '#C4856A'} onChange={(e) => { updateConfig({ branding: { ...config.branding, poweredByColor: e.target.value } }); window.dispatchEvent(new CustomEvent('frontendSync')) }} style={{ width: 40, height: 40, border: '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer' }} />
                                            <span style={{ fontSize: 11, color: '#6B7280' }}>{(config.branding?.poweredByColor || '#C4856A').toUpperCase()}</span>
                                        </div>
                                        <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4 }}>
                                            Personaliza el color de '@powered by foodspotapp'.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* SLOT 6: CONFIGURACIÓN DE CÁMARA */}
                            <div style={cardStyle}>
                                <h4 style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 16, textTransform: 'uppercase' }}>6. Configuración de Cámara</h4>

                                {/* Enable toggle */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                                    <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Habilitar botón en navegación</label>
                                    <button
                                        onClick={() => {
                                            updateConfig({ camera: { ...config.camera, enabled: !config.camera?.enabled } })
                                            window.dispatchEvent(new CustomEvent('frontendSync'))
                                        }}
                                        style={{
                                            padding: '6px 12px', borderRadius: 16, border: 'none',
                                            backgroundColor: config.camera?.enabled ? '#3B82F6' : '#E5E7EB',
                                            color: config.camera?.enabled ? 'white' : '#6B7280',
                                            fontSize: 12, fontWeight: 500, cursor: 'pointer'
                                        }}
                                    >
                                        {config.camera?.enabled ? 'ACTIVADO' : 'DESACTIVADO'}
                                    </button>
                                </div>

                                {config.camera?.enabled && (
                                    <>
                                        <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 12 }}>
                                            Selecciona el estilo del botón:
                                        </p>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 16, marginBottom: 12, alignItems: 'stretch' }}>
                                            {/* PREVIEW BOX */}
                                            <div style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'flex-start',
                                                gap: 8
                                            }}>
                                                <span style={{ fontSize: 10, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vista Previa</span>
                                                <div style={{
                                                    width: 72, height: 72,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    background: '#F9FAFB',
                                                    borderRadius: 12,
                                                    border: '1px dashed #D1D5DB',
                                                }}>
                                                    <div style={{
                                                        width: 48, height: 48,
                                                        backgroundColor: config.camera?.color || '#3B82F6',
                                                        borderRadius: '50%',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                                                        color: config.camera?.textColor === 'black' ? '#000000' : '#FFFFFF'
                                                    }}>
                                                        {(() => {
                                                            const iconId = config.camera?.icon || 'default'
                                                            const item = [
                                                                { id: 'default', label: 'Lente', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg> },
                                                                { id: 'camera', label: 'Cámara', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg> },
                                                                { id: 'aperture', label: 'Obturador', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="14.31" y1="8" x2="20.05" y2="17.94" /><line x1="9.69" y1="8" x2="21.17" y2="8" /><line x1="7.38" y1="12" x2="13.12" y2="2.06" /><line x1="9.69" y1="16" x2="3.95" y2="6.06" /><line x1="14.31" y1="16" x2="2.83" y2="16" /><line x1="16.62" y1="12" x2="10.88" y2="21.94" /></svg> }
                                                            ].find(i => i.id === iconId)

                                                            return item ? item.icon : null
                                                        })()}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* SELECTOR GRID */}
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 72px)', gap: 6, marginTop: 20 }}>
                                                {[
                                                    { id: 'default', label: 'Lente', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg> },
                                                    { id: 'camera', label: 'Cámara', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg> },
                                                    { id: 'aperture', label: 'Obturador', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="14.31" y1="8" x2="20.05" y2="17.94" /><line x1="9.69" y1="8" x2="21.17" y2="8" /><line x1="7.38" y1="12" x2="13.12" y2="2.06" /><line x1="9.69" y1="16" x2="3.95" y2="6.06" /><line x1="14.31" y1="16" x2="2.83" y2="16" /><line x1="16.62" y1="12" x2="10.88" y2="21.94" /></svg> }
                                                ].map(item => {
                                                    const isSelected = (config.camera?.icon || 'default') === item.id
                                                    const textColor = config.camera?.textColor === 'black' ? '#000000' : '#4B5563'
                                                    const iconColor = isSelected ? '#3B82F6' : textColor

                                                    return (
                                                        <button
                                                            key={item.id}
                                                            onClick={() => {
                                                                updateConfig({ camera: { ...config.camera, icon: item.id } })
                                                                window.dispatchEvent(new CustomEvent('frontendSync'))
                                                            }}
                                                            style={{
                                                                width: 72, height: 72,
                                                                borderRadius: 12,
                                                                border: isSelected ? '2px solid #3B82F6' : '1px solid #E5E7EB',
                                                                backgroundColor: isSelected ? '#EFF6FF' : 'white',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                gap: 4,
                                                                padding: 0
                                                            }}
                                                        >
                                                            <div style={{ color: iconColor, display: 'flex' }}>{item.icon}</div>
                                                            <span style={{ fontSize: 10, fontWeight: 600, color: iconColor }}>{item.label}</span>
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, backgroundColor: '#F9FAFB', padding: '12px 12px 8px 12px', borderRadius: 8 }}>
                                            <div>
                                                <label style={{ fontSize: 10, color: '#6B7280', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>Color del Botón</label>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <input
                                                        type="color"
                                                        value={config.camera?.color || '#3B82F6'}
                                                        onChange={(e) => {
                                                            updateConfig({ camera: { ...config.camera, color: e.target.value } })
                                                            window.dispatchEvent(new CustomEvent('frontendSync'))
                                                        }}
                                                        style={{ width: 44, height: 32, border: 'none', borderRadius: 6, cursor: 'pointer' }}
                                                    />
                                                    <span style={{ fontSize: 11, color: '#6B7280', fontFamily: 'monospace' }}>{(config.camera?.color || '#3B82F6').toUpperCase()}</span>
                                                </div>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: 10, color: '#6B7280', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>Color del Ícono</label>
                                                <div style={{ display: 'flex', gap: 4 }}>
                                                    <button
                                                        onClick={() => {
                                                            updateConfig({ camera: { ...config.camera, textColor: 'white' } })
                                                            window.dispatchEvent(new CustomEvent('frontendSync'))
                                                        }}
                                                        style={{
                                                            flex: 1, padding: '6px 0', borderRadius: 6,
                                                            border: (config.camera?.textColor || 'white') === 'white' ? '2px solid #3B82F6' : '1px solid #E5E7EB',
                                                            background: 'white', fontSize: 11, fontWeight: 500, cursor: 'pointer',
                                                            color: '#374151'
                                                        }}
                                                    >
                                                        Blanco
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            updateConfig({ camera: { ...config.camera, textColor: 'black' } })
                                                            window.dispatchEvent(new CustomEvent('frontendSync'))
                                                        }}
                                                        style={{
                                                            flex: 1, padding: '6px 0', borderRadius: 6,
                                                            border: config.camera?.textColor === 'black' ? '2px solid #3B82F6' : '1px solid #E5E7EB',
                                                            background: 'black', color: 'white', fontSize: 11, fontWeight: 500, cursor: 'pointer'
                                                        }}
                                                    >
                                                        Negro
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* SLOT 7: BOTONES DE INFO */}
                            <div style={cardStyle}>
                                <h4 style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 16, textTransform: 'uppercase' }}>7. Botones de Info</h4>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                                    {[
                                        { id: 'whatsapp', label: 'WhatsApp', icon: '💬' },
                                        { id: 'mercadoPago', label: 'Mercado Pago', icon: '💳' },
                                        { id: 'demo', label: 'Demo', icon: '🎮' },
                                        { id: 'adminAccess', label: 'Admin', icon: '🔒' },
                                    ].map(pill => {
                                        const pillConfig = config.infoPills?.[pill.id] || {}
                                        const isEditing = editingPillId === pill.id

                                        // Defaults
                                        const defaultBg = pill.id === 'whatsapp' ? '#C4856A' : pill.id === 'mercadoPago' ? '#FFE600' : pill.id === 'demo' ? '#84CC16' : '#FFFFFF'
                                        const bgColor = pillConfig.bgColor || defaultBg
                                        const textColor = pillConfig.textColor || (pill.id === 'mercadoPago' ? '#009EE3' : pill.id === 'adminAccess' ? '#9CA3AF' : '#FFFFFF')
                                        // For preview in grid, we use actual colors

                                        return (
                                            <button
                                                key={pill.id}
                                                onClick={() => setEditingPillId(pill.id)}
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: 6,
                                                    padding: '12px 8px',
                                                    backgroundColor: 'white',
                                                    borderRadius: 8,
                                                    border: isEditing ? '2px solid #3B82F6' : '1px solid #E5E7EB',
                                                    cursor: 'pointer',
                                                    position: 'relative',
                                                    overflow: 'hidden',
                                                    transition: 'all 0.2s',
                                                    boxShadow: isEditing ? '0 0 0 2px rgba(59, 130, 246, 0.2)' : 'none'
                                                }}
                                            >
                                                {/* Mini Preview inside card */}
                                                <div style={{
                                                    background: bgColor,
                                                    color: textColor,
                                                    padding: '4px 8px',
                                                    borderRadius: 12,
                                                    fontSize: 10,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 4
                                                }}>
                                                    <span>{pill.icon}</span>
                                                    <span>{pill.label}</span>
                                                </div>
                                                <span style={{ fontSize: 10, color: isEditing ? '#3B82F6' : '#9CA3AF', fontWeight: 600 }}>
                                                    {isEditing ? 'EDITANDO' : 'Editar'}
                                                </span>
                                            </button>
                                        )
                                    })}
                                </div>

                                {/* Active Pill Editor */}
                                {editingPillId && (
                                    <div style={{ backgroundColor: '#F9FAFB', padding: 12, borderRadius: 8, animation: 'fadeIn 0.2s' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                            <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                                                Ajustes de {editingPillId.toUpperCase()}
                                            </span>
                                            <button onClick={() => setEditingPillId(null)} style={{ border: 'none', background: 'transparent', color: '#9CA3AF', cursor: 'pointer', fontSize: 16 }}>×</button>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                            <div>
                                                <label style={{ fontSize: 11, color: '#6B7280', display: 'block', marginBottom: 6, fontWeight: 600 }}>Color de Fondo</label>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <input
                                                        type="color"
                                                        value={config.infoPills?.[editingPillId]?.bgColor || '#ffffff'}
                                                        onChange={(e) => {
                                                            updateConfig({
                                                                infoPills: {
                                                                    ...config.infoPills,
                                                                    [editingPillId]: { ...config.infoPills?.[editingPillId], bgColor: e.target.value }
                                                                }
                                                            })
                                                            window.dispatchEvent(new CustomEvent('frontendSync'))
                                                        }}
                                                        style={{ width: 44, height: 44, border: 'none', borderRadius: 8, cursor: 'pointer' }}
                                                    />
                                                    <span style={{ fontSize: 11, color: '#6B7280', fontFamily: 'monospace' }}>{(config.infoPills?.[editingPillId]?.bgColor || '#ffffff').toUpperCase()}</span>
                                                </div>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: 11, color: '#6B7280', display: 'block', marginBottom: 6, fontWeight: 600 }}>Color de Texto</label>
                                                <div style={{ display: 'flex', gap: 4 }}>
                                                    <button
                                                        onClick={() => {
                                                            updateConfig({
                                                                infoPills: {
                                                                    ...config.infoPills,
                                                                    [editingPillId]: { ...config.infoPills?.[editingPillId], textColor: '#ffffff' }
                                                                }
                                                            })
                                                            window.dispatchEvent(new CustomEvent('frontendSync'))
                                                        }}
                                                        style={{
                                                            flex: 1, padding: 8, borderRadius: 6,
                                                            border: (config.infoPills?.[editingPillId]?.textColor || '#ffffff') === '#ffffff' ? '2px solid #3B82F6' : '1px solid #E5E7EB',
                                                            background: 'white', color: '#374151', fontSize: 11, fontWeight: 500, cursor: 'pointer'
                                                        }}
                                                    >
                                                        Blanco
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            updateConfig({
                                                                infoPills: {
                                                                    ...config.infoPills,
                                                                    [editingPillId]: { ...config.infoPills?.[editingPillId], textColor: '#000000' }
                                                                }
                                                            })
                                                            window.dispatchEvent(new CustomEvent('frontendSync'))
                                                        }}
                                                        style={{
                                                            flex: 1, padding: 8, borderRadius: 6,
                                                            border: config.infoPills?.[editingPillId]?.textColor === '#000000' ? '2px solid #3B82F6' : '1px solid #E5E7EB',
                                                            background: 'black', color: 'white', fontSize: 11, fontWeight: 500, cursor: 'pointer'
                                                        }}
                                                    >
                                                        Negro
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* ORDERS TAB */}
                    {activeTab === 'orders' && (
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

                    {/* DELIVERY SECTION */}
                    {activeTab === 'orders' && (
                        <>
                            <h3 style={labelStyle}>🚚 PEDIDOS DE ENVÍO</h3>
                            {/* Business Disclaimers */}
                            <div style={{
                                background: '#FEF3C7',
                                border: '1px solid #F59E0B',
                                borderRadius: 8,
                                padding: 12,
                                marginBottom: 16,
                                fontSize: 11
                            }}>
                                <p style={{ fontWeight: 600, color: '#92400E', marginBottom: 4 }}>⚠️ Recordatorios de Despacho:</p>
                                <ul style={{ margin: 0, paddingLeft: 16, color: '#92400E' }}>
                                    <li>FoodSpot es software, no una empresa de delivery</li>
                                    <li>El negocio es responsable de los repartidores y seguros</li>
                                    <li>Los pagos en efectivo deben confirmarse ANTES de preparar</li>
                                </ul>
                            </div>
                            {(() => {
                                const deliveryOrders = orders.filter(o => o.order_type === 'delivery' && o.status !== ORDER_STATUS.DELIVERED && o.status !== ORDER_STATUS.CANCELLED)
                                if (deliveryOrders.length === 0) {
                                    return (
                                        <div style={{ ...cardStyle, textAlign: 'center', padding: 24 }}>
                                            <div style={{ fontSize: 32, marginBottom: 8 }}>🚚</div>
                                            <p style={{ color: '#6B7280', margin: 0 }}>No hay pedidos de envío activos</p>
                                        </div>
                                    )
                                }



                                // Handle status change with payment validation
                                const handleDeliveryStatusChange = (orderId, newStatus, order) => {
                                    // Use Shared Logic Gate
                                    const validation = canAdvanceOrder(order, newStatus, config)
                                    if (!validation.allowed) {
                                        alert(validation.reason)
                                        return
                                    }
                                    updateOrder(orderId, { status: newStatus })
                                    setOrders(getOrders())
                                }

                                // Handle payment confirmation
                                const handlePaymentConfirm = (orderId) => {
                                    const method = paymentMethodSelect[orderId] || 'cash'
                                    updateOrder(orderId, { paymentConfirmed: true, paymentMethod: method })
                                    setOrders(getOrders())
                                }

                                return deliveryOrders.map(order => {
                                    const statusInfo = getOrderStatusInfo(order.status, order.orderType)
                                    return (
                                        <div key={order.id} style={{ ...cardStyle, marginBottom: 12, borderLeft: '4px solid #F97316' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                <span style={{ fontWeight: 700, fontSize: 18, color: '#374151' }}>#{order.orderNumber} 🚚</span>
                                                <span style={{
                                                    padding: '4px 10px',
                                                    borderRadius: 10,
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    background: order.status === ORDER_STATUS.DISPATCHED ? '#FFEDD5' : order.status === ORDER_STATUS.READY ? '#DCFCE7' : '#E0E7FF',
                                                    color: order.status === ORDER_STATUS.DISPATCHED ? '#9A3412' : order.status === ORDER_STATUS.READY ? '#166534' : '#3730A3'
                                                }}>
                                                    {statusInfo.label}
                                                </span>
                                            </div>

                                            {/* Customer Info */}
                                            {order.customerInfo && (
                                                <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 10, background: '#F0FDF4', padding: 10, borderRadius: 8 }}>
                                                    <p style={{ margin: 0, fontWeight: 600, color: '#374151' }}>📍 {order.customerInfo.name}</p>
                                                    <p style={{ margin: '4px 0 0' }}>{formatAddress(order.customerInfo.address)}</p>
                                                    <p style={{ margin: '4px 0 0' }}>Tel: ***{getPhoneLast4(order.customerInfo.phone)}</p>
                                                </div>
                                            )}

                                            {/* Order Items */}
                                            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
                                                {order.items?.map((item, i) => (
                                                    <span key={item.id ?? `item-${i}`}>{item.quantity}x {item.name}{i < order.items.length - 1 ? ', ' : ''}</span>
                                                ))}
                                            </div>

                                            {/* Total */}
                                            <div style={{ fontSize: 14, fontWeight: 600, color: '#22C55E', marginBottom: 10 }}>
                                                ${order.total?.toLocaleString()}
                                            </div>

                                            {/* Actions */}
                                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                {/* Phone confirmation input for dispatched */}
                                                {order.status === ORDER_STATUS.DISPATCHED && order.customerInfo && (
                                                    <div style={{ width: '100%', marginBottom: 8 }}>
                                                        <label style={{ fontSize: 10, color: '#6B7280', display: 'block', marginBottom: 4 }}>
                                                            Últimos 4 dígitos del teléfono para confirmar entrega
                                                        </label>
                                                        <input
                                                            type="text"
                                                            maxLength={4}
                                                            placeholder="****"
                                                            value={deliveryConfirmCode[order.id] || ''}
                                                            onChange={(e) => setDeliveryConfirmCode(prev => ({ ...prev, [order.id]: e.target.value.replace(/\D/g, '') }))}
                                                            style={{
                                                                width: '100%',
                                                                padding: '8px 12px',
                                                                border: '1px solid #E5E7EB',
                                                                borderRadius: 8,
                                                                fontSize: 18,
                                                                textAlign: 'center',
                                                                letterSpacing: 6
                                                            }}
                                                        />
                                                    </div>
                                                )}

                                                {/* Status advance button */}
                                                {statusInfo.next && (
                                                    <button
                                                        onClick={() => {
                                                            // Phone code verification for delivered
                                                            if (statusInfo.next === ORDER_STATUS.DELIVERED && order.customerInfo) {
                                                                const code = deliveryConfirmCode[order.id] || ''
                                                                if (!verifyDeliveryCode(order.customerInfo.phone, code)) {
                                                                    alert('❌ Código incorrecto. Ingrese los últimos 4 dígitos del teléfono del cliente.')
                                                                    return
                                                                }
                                                                updateOrder(order.id, { deliveryConfirmedAt: new Date().toISOString() })
                                                            }
                                                            handleDeliveryStatusChange(order.id, statusInfo.next, order)
                                                        }}
                                                        style={{
                                                            flex: 1,
                                                            padding: '10px 16px',
                                                            background: '#3B82F6',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: 8,
                                                            fontWeight: 600,
                                                            fontSize: 12,
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        {statusInfo.nextLabel}
                                                    </button>
                                                )}

                                                {/* Payment method selector */}
                                                {!order.paymentConfirmed && (
                                                    <select
                                                        value={paymentMethodSelect[order.id] || 'cash'}
                                                        onChange={(e) => setPaymentMethodSelect(prev => ({ ...prev, [order.id]: e.target.value }))}
                                                        style={{
                                                            flex: 1,
                                                            padding: '10px 12px',
                                                            border: '1px solid #E5E7EB',
                                                            borderRadius: 8,
                                                            fontSize: 12,
                                                            minWidth: 100
                                                        }}
                                                    >
                                                        <option value="cash">💵 Efectivo</option>
                                                        <option value="mercado_pago">📱 MercadoPago</option>
                                                    </select>
                                                )}

                                                {/* Payment confirm button */}
                                                <button
                                                    onClick={() => handlePaymentConfirm(order.id)}
                                                    style={{
                                                        minWidth: 110,
                                                        padding: '10px 14px',
                                                        background: order.paymentConfirmed ? '#22C55E' : '#F59E0B',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: 8,
                                                        fontWeight: 600,
                                                        fontSize: 12,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {order.paymentConfirmed ? `✅ ${order.paymentMethod === 'mercado_pago' ? 'MP' : 'Efectivo'}` : '💳 Confirmar Pago'}
                                                </button>
                                            </div>

                                            {/* Cancel Order */}
                                            <button
                                                onClick={() => {
                                                    if (confirm('Are you sure you want to cancel this order?')) {
                                                        updateOrder(order.id, { status: ORDER_STATUS.CANCELLED });
                                                        setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: ORDER_STATUS.CANCELLED } : o));
                                                    }
                                                }}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 14px',
                                                    background: '#DC2626',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: 8,
                                                    fontWeight: 600,
                                                    fontSize: 12,
                                                    cursor: 'pointer',
                                                    marginTop: 8
                                                }}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    )
                                })
                            })()}

                            {/* Today's delivery summary */}
                            <div style={{ ...cardStyle, textAlign: 'center', marginTop: 16 }}>
                                <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>Pedidos de envío hoy</p>
                                <p style={{ fontSize: 24, fontWeight: 700, color: '#F97316', margin: '4px 0 0' }}>
                                    {orders.filter(o => o.orderType === 'delivery' && new Date(o.createdAt).toDateString() === new Date().toDateString()).length}
                                </p>
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
                                            <div key={d.date} style={{ flex: 1, height: `${(d.value / Math.max(...demoData.map(x => x.value))) * 100}%`, background: i % 2 === 0 ? '#B8A089' : '#C9B89A', borderRadius: '3px 3px 0 0', minHeight: 6 }} />
                                        ))}
                                    </div>
                                    <p style={{ fontSize: 9, color: '#9CA3AF', textAlign: 'center', marginTop: 8 }}>⚠️ Datos de demostración</p>
                                </div>
                            )}
                        </>
                    )}

                    {/* HISTORY SECTION */}
                    {activeTab === 'orders' && (
                        <>
                            <div style={{ background: '#FEF3C7', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                                <p style={{ fontSize: 12, color: '#92400E', margin: 0 }}>⚠️ Los registros son de solo lectura. No se pueden modificar pagos confirmados.</p>
                            </div>

                            <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                {orders.length === 0 ? (
                                    <div style={{ padding: 24, textAlign: 'center', color: '#9CA3AF' }}><p style={{ fontSize: 14 }}>No hay registros aún</p></div>
                                ) : (
                                    orders.slice(0, 15).map((order, i) => {
                                        const isPaid = order.payment_status === 'paid' || order.paymentConfirmed;
                                        const isMp = order.paymentMethod === PAYMENT_METHOD.MERCADO_PAGO || order.payment_method === PAYMENT_METHOD.MERCADO_PAGO;
                                        return (
                                            <div key={order.orderNumber || i} style={{ padding: '12px 14px', borderBottom: i < Math.min(orders.length, 15) - 1 ? '1px solid #F3F4F6' : 'none' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div>
                                                        <p style={{ fontSize: 13, fontWeight: 500, color: '#1F2937', margin: 0 }}>Pedido #{order.orderNumber || i + 1}</p>
                                                        <p style={{ fontSize: 11, color: '#9CA3AF', margin: '2px 0 0' }}>Confirmado por: {order.confirmedBy || 'staff'}</p>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <span style={{
                                                            display: 'inline-block',
                                                            padding: '2px 8px',
                                                            borderRadius: 10,
                                                            fontSize: 11,
                                                            fontWeight: 600,
                                                            background: isPaid ? '#22C55E' : '#F59E0B',
                                                            color: 'white',
                                                            marginRight: 4
                                                        }}>
                                                            {isPaid ? '✅ Paid' : isMp ? '⏳ Pending' : '💵 Cash'}
                                                        </span>
                                                        <span style={{ display: 'inline-block', padding: '2px 6px', background: order.paymentMethod === PAYMENT_METHOD.MERCADO_PAGO ? '#E0F2F1' : '#FEF3C7', borderRadius: 4, fontSize: 9, color: order.paymentMethod === PAYMENT_METHOD.MERCADO_PAGO ? '#0D9488' : '#92400E', fontWeight: 500 }}>
                                                            {order.paymentMethod === PAYMENT_METHOD.MERCADO_PAGO ? 'MP' : 'Efectivo'}
                                                        </span>
                                                        <p style={{ fontSize: 13, fontWeight: 600, color: '#1F2937', margin: '4px 0 0' }}>${(order.total || 0).toLocaleString()}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
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

            {/* 🛡️ SAVE STATUS TOAST */}
            {saveStatus && (
                <div style={{
                    position: 'fixed',
                    bottom: 100,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    padding: '10px 20px',
                    borderRadius: 20,
                    fontSize: 13,
                    fontWeight: 600,
                    zIndex: 9999,
                    background: saveStatus === 'saving' ? '#3B82F6' : saveStatus === 'saved' ? '#22C55E' : '#EF4444',
                    color: 'white',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                }}>
                    {saveStatus === 'saving' && '⏳ Guardando...'}
                    {saveStatus === 'saved' && '✅ Guardado'}
                    {saveStatus === 'error' && '❌ Error al guardar'}
                </div>
            )}

            {/* Bottom Navigation */}
            <BackendNav
                role="superadmin"
                activeTab={activeTab}
                onTabChange={setActiveTab}
                badges={navBadges}
            />
        </>
    )
}

export default SuperAdmin
