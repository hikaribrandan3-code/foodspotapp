import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link, useLocation, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient.js'
import { getAuth, clearAuth } from '../../utils/storage.js'
import { formatPrice } from '../../config/menuData.js'
import { updateConfig } from '../../config/appConfig.v2.js'
import { processAndStoreImage, formatFileSize } from '../../utils/imageOptimizer.js'
import { canChangeDeliveryConfig, recordDeliveryConfigChange } from '../../utils/deliveryUtils.js'
import { useAdminIntent } from '../../contexts/AdminIntentContext.jsx'
import { useTenant } from '../../contexts/TenantContext.jsx'
import BackendHeader from '../../components/BackendHeader.jsx'
import BackendNav from '../../components/BackendNav.jsx'
import './MenuStyles.css'

/**
 * MENU MANAGER
 * 
 * ARCHITECTURAL INVARIANT: Config MUST come from props, NOT getConfig().
 * This ensures Single Source of Truth from App.jsx.
 */
function MenuManager({ config: configProp, demoMode = false }) {
    const config = configProp || {};
    const navigate = useNavigate()
    const { tenantSlug } = useParams() // 🏢 Get tenant from URL for logout redirect
    const { isSimulated, impersonatingBusinessId } = useAdminIntent()

    // 🛡️ REFACTOR: Use TenantContext as Source of Truth (replaces broken getAuth() from storage)
    const { businessId: tenantBusinessId, tenantData, isLoaded: tenantLoaded } = useTenant()
    const targetBusinessId = isSimulated ? impersonatingBusinessId : tenantBusinessId

    // 🛡️ STATE LOCK (Anti-Gravity V3.0 - Amnesia Killer)
    // Menu state is initialized as EMPTY STRUCTURE to prevent null-pointer crashes.
    // It will be populated by cloud data when tenantData arrives.
    const [menu, setMenu] = useState({ categories: [] })
    const [localConfig, setLocalConfig] = useState(config) // Local copy for mutations

    // 🔒 HYDRATION LOCK: Prevents sync until cloud data is loaded
    const isHydratedRef = useRef(false)

    // SYNC: Update menu when tenantData loads from cloud (Gatekeeper Bypass)
    useEffect(() => {
        if (tenantLoaded) {
            // 🛡️ DATA INTEGRITY: Hard-Check for menu_data
            if (tenantData?.menu_data) {
                console.log('[MenuManager] 🎯 HYDRATING FROM CLOUD:', tenantData.menu_data)
                setMenu(tenantData.menu_data)
            } else {
                console.log('[MenuManager] ⚠️ NO CLOUD DATA: Defaulting to empty')
                // Only default to empty if truly missing, but don't overwrite if we already have data?
                // Actually, if tenantLoaded is true and no data, we MUST start empty.
                setMenu({ categories: [] })
            }

            // 🔓 UNLOCK: Cloud data received, syncing is now safe
            isHydratedRef.current = true
            console.log('[MenuManager] 🔓 HYDRATION COMPLETE: Sync now allowed')
        }
    }, [tenantLoaded, tenantData])

    // SYNC: Ensure localConfig updates when parent config changes (e.g. initial load)
    useEffect(() => {
        setLocalConfig(config)
    }, [config])

    // =========================================================
    // 🚫 AUTO-MIGRATION REMOVED (Anti-Gravity V3.0)
    // The "Bridge" was causing empty localStorage to overwrite Cloud Vault.
    // All persistence now goes through syncMenuToCloud() only.
    // =========================================================

    const [editingItem, setEditingItem] = useState(null)
    const [editForm, setEditForm] = useState({ name: '', price: '', image: null })
    const [uploadStatus, setUploadStatus] = useState(null)
    const [isUploading, setIsUploading] = useState(false)
    const activeFeaturedSlotRef = useRef(null)
    const activeCategoryItemRef = useRef(null)
    const [saveStatus, setSaveStatus] = useState(null)
    const fileInputRef = useRef(null)

    const [inputKey, setInputKey] = useState(0)

    // Category creation/editing
    const [showAddCategory, setShowAddCategory] = useState(false)
    const [newCategoryName, setNewCategoryName] = useState('')
    const [newCategoryIcon, setNewCategoryIcon] = useState('📦')
    const [editingCategory, setEditingCategory] = useState(null)

    // Operational controls
    const [pauseMessage, setPauseMessage] = useState(config?.pauseOrdersMessage || '')

    // 🚀 SILO-AWARE LOGOUT
    const handleLogout = async () => {
        await supabase.auth.signOut()
        clearAuth()
        window.location.href = demoMode ? '/' : `/${tenantSlug}`
    }

    // --- 🛡️ SAFE-SYNC: Sync Logic (Final Boss Fix) ---
    // 🔒 HARD-LOCKED TENANT ID (Universal Alignment)
    const LOCKED_TENANT_ID = '00470a1a-f5c4-4fb8-a4a5-2ab0d8d758fd'

    const syncMenuToCloud = async (updatedMenu) => {
        // 🔒 HYDRATION GUARD: Block sync until cloud data is loaded
        if (!isHydratedRef.current) {
            console.warn('⚠️ SYNC BLOCKED: Hydration not complete. Waiting for cloud data before allowing writes.')
            return
        }

        // 🛡️ AMNESIA GUARD: NEVER sync null or empty data
        if (!updatedMenu || !Array.isArray(updatedMenu.categories)) {
            console.warn('⚠️ SYNC BLOCKED: Attempted to sync null/invalid menu. Aborting to protect Cloud Vault.')
            return
        }

        console.log('☁️ Syncing Menu to Supabase (JSONB Strict)... Target:', LOCKED_TENANT_ID)

        // ⚡ STRICT UPDATE: Partial update to avoid wiping other fields
        const { error } = await supabase
            .from('branding')
            .update({
                menu_data: updatedMenu,
                updated_at: new Date()
            })
            .eq('tenant_id', LOCKED_TENANT_ID)

        if (error) {
            console.error('❌ Cloud Sync Failed:', error)
            window.alert(`❌ SYNC ERROR: ${error.message}\nCode: ${error.code || 'N/A'}\nDetails: ${error.details || 'None'}`)
            setSaveStatus({ message: 'Error al guardar en nube', error: true })
        } else {
            console.log('✅ Cloud Sync Validated')
            // 💧 FORCE STATE HYDRATION: Immediately update local state to match saved data
            setMenu(updatedMenu)
            setSaveStatus({ message: '☁️ Sincronizado' })
            setTimeout(() => setSaveStatus(null), 2000)
        }
    }
    // --------------------------------

    const syncConfigToCloud = async (updatedConfig) => {
        console.log('☁️ Syncing Config to Supabase... Target:', LOCKED_TENANT_ID)

        const { error } = await supabase
            .from('branding')
            .update({
                app_config: updatedConfig, // featuredPhotos lives here
                hero_url: updatedConfig.headerCover?.image || null,
                business_name: updatedConfig.businessName || null,
                updated_at: new Date()
            })
            .eq('tenant_id', LOCKED_TENANT_ID)

        if (error) {
            console.error('❌ Cloud Config Sync Failed:', error)
            window.alert(`❌ CONFIG SYNC ERROR: ${error.message}\nCode: ${error.code || 'N/A'}\nDetails: ${error.details || 'None'}`)
        } else {
            console.log('✅ Config Sync Validated')
            // 💧 FORCE STATE HYDRATION
            setLocalConfig(updatedConfig)
        }
    }

    // 🕵️ VAULT INSPECTOR (Temporary Tool)
    const checkVaultDirectly = async () => {
        console.log('🕵️ INVESTIGATING SUPABASE VAULT...');
        const { data, error } = await supabase
            .from('branding')
            .select('menu_data, app_config') // Fetch the specific columns
            .eq('tenant_id', LOCKED_TENANT_ID); // Hard-locked ID

        if (error) {
            console.error('❌ DB READ ERROR:', error);
            alert('DB ERROR: ' + error.message);
        } else {
            console.log('✅ RAW DB DATA:', data);
            console.log('🍔 MENU COLUMN:', data[0]?.menu_data);
            alert('Check Console for Raw Data!');
        }
    };

    // --- 🛠️ PURE STATE HELPER: Generate IDs ---
    const generateId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const handleEdit = (categoryId, item) => {
        setEditingItem({ categoryId, itemId: item.id })
        setEditForm({ name: item.name, price: item.price.toString(), image: item.image || null })
        setUploadStatus(null)
    }

    const handleBoxTap = (categoryId, item) => {
        handleEdit(categoryId, item)
        if (!item.image) {
            activeCategoryItemRef.current = { categoryId, itemId: item.id }
            fileInputRef.current?.click()
        }
    }

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) {
            activeFeaturedSlotRef.current = null
            activeCategoryItemRef.current = null
            return
        }

        const previewUrl = URL.createObjectURL(file)
        const targetSlot = activeFeaturedSlotRef.current
        const targetItem = activeCategoryItemRef.current

        // Optimistic UI
        if (targetSlot !== null) {
            setLocalConfig(prev => {
                const newFeatured = [...(prev.featuredPhotos || [])]
                while (newFeatured.length <= targetSlot) newFeatured.push(null)
                newFeatured[targetSlot] = {
                    ...(newFeatured[targetSlot] || { name: 'Cargando...', price: 0 }),
                    image: previewUrl
                }
                return { ...prev, featuredPhotos: newFeatured }
            })
        } else if (targetItem) {
            setMenu(prevMenu => {
                const newMenu = { ...prevMenu }
                const cat = newMenu.categories.find(c => c.id === targetItem.categoryId)
                const item = cat?.items.find(i => i.id === targetItem.itemId)
                if (item) item.image = previewUrl
                return newMenu
            })
            setEditForm(prev => ({ ...prev, image: previewUrl }))
        } else {
            setEditForm(prev => ({ ...prev, image: previewUrl }))
        }

        setIsUploading(true)

        try {
            const result = await processAndStoreImage(file)

            if (targetSlot !== null) {
                setLocalConfig(prevConfig => {
                    const currentFeatured = [...(prevConfig.featuredPhotos || [])]
                    currentFeatured[targetSlot] = {
                        ...(currentFeatured[targetSlot] || { name: 'Destacado', price: 0 }), // Preserve edit
                        image: result.publicUrl
                    }
                    const newConfig = { ...prevConfig, featuredPhotos: currentFeatured }
                    updateConfig(newConfig)
                    window.dispatchEvent(new CustomEvent('frontendSync'))
                    syncConfigToCloud(newConfig)
                    return newConfig
                })
                setUploadStatus({ success: true, message: '✔ Guardado' })
            } else if (targetItem) {
                const finalMenu = await new Promise(resolve => {
                    setMenu(prevMenu => {
                        const newMenu = { ...prevMenu }
                        const cat = newMenu.categories.find(c => c.id === targetItem.categoryId)
                        const item = cat?.items.find(i => i.id === targetItem.itemId)
                        if (item) item.image = result.publicUrl
                        resolve(newMenu)
                        return newMenu
                    })
                })
                // 🛡️ CLOUD-ONLY: saveMenu removed (Anti-Gravity V3.0)
                syncMenuToCloud(finalMenu)
                setEditForm(prev => ({ ...prev, image: result.publicUrl }))
                setUploadStatus({ success: true, message: '✔ Guardado' })
            } else {
                setEditForm(prev => ({ ...prev, image: result.publicUrl }))
                setUploadStatus({ success: true, message: '✔ Listo' })
            }

        } catch (error) {
            console.error('Upload failed:', error)
            setUploadStatus({ success: false, message: 'Error de subida' })
            // Revert omitted for brevity, user wants aggressive sync
        } finally {
            setIsUploading(false)
            setInputKey(prev => prev + 1)
            activeFeaturedSlotRef.current = null
            activeCategoryItemRef.current = null
        }
    }

    const handleSave = () => {
        if (!editingItem) return

        // PATH A: FEATURED SLOT EDIT (Top 4)
        if (editingItem.isFeaturedSlot) {
            const newFeatured = [...(localConfig.featuredPhotos || [])]
            while (newFeatured.length <= editingItem.index) newFeatured.push(null)

            newFeatured[editingItem.index] = {
                name: editForm.name || 'Destacado',
                price: parseInt(editForm.price) || 0,
                image: editForm.image
            }

            const newConfig = { ...localConfig, featuredPhotos: newFeatured }
            updateConfig(newConfig)
            setLocalConfig(newConfig)
            window.dispatchEvent(new CustomEvent('frontendSync'))
            syncConfigToCloud(newConfig)

            setEditingItem(null)
            setSaveStatus({ message: 'Destacado actualizado' })
            setTimeout(() => setSaveStatus(null), 2000)
            setUploadStatus(null)
            return
        }

        // PATH B: REGULAR MENU ITEM
        const updatedMenu = { ...menu }
        const category = updatedMenu.categories.find(c => c.id === editingItem.categoryId)
        if (category) {
            const item = category.items.find(i => i.id === editingItem.itemId)
            if (item) {
                item.name = editForm.name
                item.price = parseInt(editForm.price) || item.price
                if (editForm.image) {
                    item.image = editForm.image
                }
                // 🛡️ CLOUD-ONLY: saveMenu removed
                setMenu(updatedMenu)
                syncMenuToCloud(updatedMenu) // ☁️ Cloud Sync
                setSaveStatus({ message: 'Guardado correctamente' })
                setTimeout(() => setSaveStatus(null), 2000)
            }
        }
        setEditingItem(null)
        setUploadStatus(null)
    }

    const handleToggleAvailability = (categoryId, itemId) => {
        const updatedMenu = { ...menu }
        const category = updatedMenu.categories.find(c => c.id === categoryId)
        if (category) {
            const item = category.items.find(i => i.id === itemId)
            if (item) {
                item.available = !item.available
                // 🛡️ CLOUD-ONLY: saveMenu removed
                setMenu(updatedMenu)
                syncMenuToCloud(updatedMenu)
            }
        }
    }

    const handleSetFeatured = (categoryId, itemId) => {
        const updatedMenu = { ...menu }
        // Reset all featured
        updatedMenu.categories.forEach(cat => {
            cat.items.forEach(i => i.featured = false)
        })
        // Set new featured
        const category = updatedMenu.categories.find(c => c.id === categoryId)
        if (category) {
            const item = category.items.find(i => i.id === itemId)
            if (item) item.featured = true
        }
        setMenu(updatedMenu)
        syncMenuToCloud(updatedMenu)
    }

    const handleToggleCategory = (categoryId) => {
        const updatedMenu = { ...menu }
        const category = updatedMenu.categories.find(c => c.id === categoryId)
        if (category) {
            category.enabled = category.enabled === undefined ? true : !category.enabled
            setMenu(updatedMenu)
            syncMenuToCloud(updatedMenu)
        }
    }

    const handleRenameCategory = (categoryId) => {
        if (editingCategory && editingCategory.name.trim()) {
            const updatedMenu = { ...menu }
            const category = updatedMenu.categories.find(c => c.id === categoryId)
            if (category) {
                category.name = editingCategory.name.trim()
                setMenu(updatedMenu)
                syncMenuToCloud(updatedMenu)
            }
        }
        setEditingCategory(null)
    }

    // --- DIRECT PRICE EDIT ---
    const handlePriceUpdate = (categoryId, itemId, newPrice) => {
        const price = parseInt(newPrice)
        if (isNaN(price)) return

        const updatedMenu = { ...menu }
        const category = updatedMenu.categories.find(c => c.id === categoryId)
        if (category) {
            const item = category.items.find(i => i.id === itemId)
            if (item) {
                item.price = price
                setMenu(updatedMenu)
                // 🛡️ CLOUD-ONLY: saveMenu removed
                syncMenuToCloud(updatedMenu)
                setSaveStatus({ message: 'Precio actualizado' })
                setTimeout(() => setSaveStatus(null), 2000)
            }
        }
    }

    // --- DIRECT NAME EDIT (The Unlock) ---
    const handleNameUpdate = (categoryId, itemId, newName) => {
        if (!newName.trim()) return

        const updatedMenu = { ...menu }
        const category = updatedMenu.categories.find(c => c.id === categoryId)
        if (category) {
            const item = category.items.find(i => i.id === itemId)
            if (item) {
                item.name = newName
                setMenu(updatedMenu)
                // 🛡️ CLOUD-ONLY: saveMenu removed
                syncMenuToCloud(updatedMenu)
                setSaveStatus({ message: 'Nombre actualizado' })
                setTimeout(() => setSaveStatus(null), 2000)
            }
        }
    }

    const handleRemoveItem = (categoryId, item) => {
        if (confirm(`¿Eliminar ítem "${item.name}"?`)) {
            const updatedMenu = { ...menu }
            const category = updatedMenu.categories.find(c => c.id === categoryId)
            if (category) {
                category.items = category.items.filter(i => i.id !== item.id)
                setMenu(updatedMenu)
                syncMenuToCloud(updatedMenu)
            }
        }
    }

    const handleAddItem = (categoryId) => {
        const updatedMenu = { ...menu }
        const category = updatedMenu.categories.find(c => c.id === categoryId)
        if (category) {
            const newItem = {
                id: generateId('item'),
                name: 'Nuevo ítem',
                price: 0,
                available: true,
                featured: false,
                image: null
            }
            category.items.push(newItem)
            setMenu(updatedMenu)
            syncMenuToCloud(updatedMenu)
        }
    }

    // --- FEATURED ITEMS LOGIC ---
    const activeFeaturedItems = localConfig?.featuredPhotos || []
    const isFeatured = (item) => activeFeaturedItems.some(f => f && f.name === item.name)

    const handleToggleFeatured = (item) => {
        const currentFeatured = [...activeFeaturedItems]
        const idx = currentFeatured.findIndex(f => f && f.name === item.name)

        if (idx !== -1) {
            currentFeatured.splice(idx, 1)
        } else {
            if (currentFeatured.length < 4) {
                currentFeatured.push({
                    name: item.name,
                    price: item.price,
                    image: item.image
                })
            } else {
                alert('Máximo 4 destacados. Elimina uno para agregar otro.')
                return
            }
        }

        const newConfig = { ...localConfig, featuredPhotos: currentFeatured }
        updateConfig(newConfig)
        setLocalConfig(newConfig)
        window.dispatchEvent(new CustomEvent('frontendSync'))
        syncConfigToCloud(newConfig)
    }

    // --- DIRECT FEATURED UPLOAD LOGIC ---
    const handleFeaturedTap = (index) => {
        // Open Editor for Name/Price/Image
        const slot = activeFeaturedItems[index] || { name: 'Destacado', price: 0, image: null }
        setEditingItem({ isFeaturedSlot: true, index })
        setEditForm({
            name: slot.name,
            price: slot.price?.toString() || '',
            image: slot.image
        })
        setUploadStatus(null)
    }

    // 🚧 THE GATEKEEPER (Bypass Mode): Only block if tenant context is NOT loaded.
    // If loaded but empty, LET US IN to add initial data.
    if (!tenantLoaded) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#F8FAFC',
                flexDirection: 'column',
                gap: 12
            }}>
                <div style={{ fontSize: 32 }}>☁️</div>
                <div style={{ color: '#64748B', fontWeight: 500 }}>Sincronizando con la Nube...</div>
            </div>
        )
    }

    return (
        <div className="backend-surface" style={{ minHeight: '100vh', background: '#F8FAFC' }}>
            <BackendHeader
                title={demoMode ? "Demo Menú" : "Menú"}
                onLogout={handleLogout}
            />

            <div style={{ padding: 16, paddingBottom: 100 }}>
                {/* ==================== OPERATIONAL COMMAND CENTER ==================== */}
                <div style={{ marginBottom: 24 }}>
                    <button
                        onClick={checkVaultDirectly}
                        style={{
                            background: '#000', color: '#fff', padding: '10px',
                            borderRadius: '8px', marginBottom: '20px', width: '100%',
                            fontWeight: 'bold', border: '2px solid red'
                        }}
                    >
                        🕵️ INSPECT REAL DATABASE
                    </button>
                    {/* Pause Orders Toggle */}
                    <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E2E8F0', padding: 16, marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <p style={{ fontWeight: 600, fontSize: 14, color: '#1E293B', margin: 0 }}>⏸️ Pausar pedidos</p>
                                <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0' }}>Desactiva temporalmente los pedidos</p>
                            </div>
                            <label className="toggle">
                                <input
                                    type="checkbox"
                                    checked={config.pauseOrders}
                                    onChange={() => {
                                        updateConfig({ pauseOrders: !config.pauseOrders })
                                        window.dispatchEvent(new CustomEvent('frontendSync'))
                                        // TODO: Add cloud sync here too
                                    }}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                        {/* Pause Message */}
                        {config.pauseOrders && (
                            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
                                <label style={{ fontSize: 12, color: '#64748B', display: 'block', marginBottom: 6 }}>Mensaje para clientes</label>
                                <input
                                    type="text"
                                    value={pauseMessage}
                                    onChange={(e) => setPauseMessage(e.target.value)}
                                    onBlur={() => {
                                        updateConfig({ pauseOrdersMessage: pauseMessage })
                                        window.dispatchEvent(new CustomEvent('frontendSync'))
                                    }}
                                    placeholder="Ej: Estamos con muchos pedidos"
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Archive Info */}
                    <div style={{ background: '#F0FDF4', borderRadius: 12, border: '1px solid #BBF7D0', padding: 12, marginBottom: 12 }}>
                        <p style={{ fontSize: 13, color: '#166534', margin: 0 }}>✓ Los pedidos se archivan automáticamente al marcarlos como entregados.</p>
                    </div>

                    {/* Delivery Configuration */}
                    <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E2E8F0', padding: 16 }}>
                        <p style={{ fontWeight: 600, fontSize: 14, color: '#1E293B', margin: '0 0 12px' }}>🚚 Configuración de Envíos</p>

                        <div style={{ marginBottom: 12 }}>
                            {/* SaaS-Scale Static Map & Radius Visualizer */}
                            <div style={{
                                height: 160,
                                background: "url('https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?w=600&q=80') center/cover",
                                borderRadius: 10,
                                marginBottom: 16,
                                position: 'relative',
                                overflow: 'hidden',
                                border: '1px solid #CBD5E1'
                            }}>
                                {/* Dark overlay for contrast */}
                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.2)' }} />

                                {/* Center Pin */}
                                <div style={{
                                    position: 'absolute',
                                    top: '50%', left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    zIndex: 10,
                                    fontSize: 24,
                                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
                                }}>
                                    🏪
                                </div>

                                {/* Dynamic Radius Circle */}
                                <div style={{
                                    position: 'absolute',
                                    top: '50%', left: '50%',
                                    width: 40, height: 40,
                                    marginLeft: -20, marginTop: -20,
                                    borderRadius: '50%',
                                    border: '2px solid #22C55E',
                                    background: 'rgba(34, 197, 94, 0.15)',
                                    transform: `scale(${config.delivery?.radiusKm || 5})`,
                                    willChange: 'transform',
                                    transition: 'transform 0.1s linear',
                                    pointerEvents: 'none',
                                    boxShadow: '0 0 0 1000px rgba(0,0,0,0.1)'
                                }} />
                            </div>

                            <label style={{ fontSize: 12, color: '#64748B', display: 'block', marginBottom: 4 }}>Radio de entrega: {config.delivery?.radiusKm || 5} km</label>
                            <input
                                type="range"
                                min="1"
                                max="50"
                                value={config.delivery?.radiusKm || 5}
                                onChange={(e) => {
                                    const newValue = parseInt(e.target.value)
                                    const oldValue = config.delivery?.radiusKm || 5
                                    if (newValue !== oldValue) {
                                        recordDeliveryConfigChange('radiusKm', oldValue, newValue)
                                    }
                                    updateConfig({ delivery: { ...config.delivery, radiusKm: newValue } })
                                    window.dispatchEvent(new CustomEvent('frontendSync'))
                                }}
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div>
                                <label style={{ fontSize: 12, color: '#64748B', display: 'block', marginBottom: 4 }}>Tarifa fija ($)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="50"
                                    value={config.delivery?.flatFee || 0}
                                    onChange={(e) => {
                                        updateConfig({ delivery: { ...config.delivery, flatFee: parseInt(e.target.value) || 0 } })
                                        window.dispatchEvent(new CustomEvent('frontendSync'))
                                    }}
                                    placeholder="0"
                                    style={{ width: '100%', padding: '10px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 14, boxSizing: 'border-box' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: '#64748B', display: 'block', marginBottom: 4 }}>Gratis desde ($)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="100"
                                    value={config.delivery?.freeDeliveryThreshold || 0}
                                    onChange={(e) => {
                                        updateConfig({ delivery: { ...config.delivery, freeDeliveryThreshold: parseInt(e.target.value) || 0 } })
                                        window.dispatchEvent(new CustomEvent('frontendSync'))
                                    }}
                                    placeholder="0"
                                    style={{ width: '100%', padding: '10px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ==================== VISUAL DIVIDER ==================== */}
                <hr style={{ border: 'none', height: 1, background: '#E2E8F0', margin: '24px 0' }} />
                {/* 1. FEATURED SECTION (TOP 4) */}
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#4B5563', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Destaques de Inicio (Top 4)
                </h3>

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
                    {[0, 1, 2, 3].map(i => {
                        const slot = activeFeaturedItems[i]
                        return (
                            <div
                                key={i}
                                onClick={() => handleFeaturedTap(i)}
                                className={!slot ? "empty-box" : ""}
                                style={{
                                    aspectRatio: '1/1',
                                    background: slot?.image ? `url(${slot.image}) center/cover` : '#F1F5F9',
                                    borderRadius: 10,
                                    border: '1px dashed #CBD5E1',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    cursor: 'pointer'
                                }}>
                                {slot ? (
                                    <>
                                        <div style={{
                                            position: 'absolute',
                                            bottom: 0, left: 0, right: 0,
                                            background: 'rgba(0,0,0,0.6)',
                                            color: 'white',
                                            fontSize: 9,
                                            padding: '2px 4px',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            textAlign: 'center'
                                        }}>
                                            {slot.name}
                                        </div>
                                    </>
                                ) : (
                                    <span style={{ fontSize: 10, color: '#94A3B8', textAlign: 'center', pointerEvents: 'none' }}>Editar</span>
                                )}
                            </div>
                        )
                    })}
                </div>

                {/* 2. VISUAL DIVIDER */}
                <hr style={{ border: 'none', height: 1, background: '#E2E8F0', margin: '24px 0' }} />

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
                            background: '#F1F5F9',
                            border: '2px dashed #CBD5E1',
                            borderRadius: 10,
                            fontSize: 14,
                            fontWeight: 500,
                            color: '#64748B',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6
                        }}
                    >
                        ➕ Agregar Categoría
                    </button>
                ) : (
                    <div style={{
                        background: '#FFFFFF',
                        borderRadius: 10,
                        border: '2px solid #22C55E',
                        padding: 16,
                        marginBottom: 16
                    }}>
                        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                            <input
                                type="text"
                                placeholder="Nombre de categoría"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                autoFocus
                                style={{
                                    flex: 1,
                                    padding: '10px 14px',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: 8,
                                    fontSize: 14
                                }}
                            />
                            <input
                                type="text"
                                placeholder="📦"
                                value={newCategoryIcon}
                                onChange={(e) => setNewCategoryIcon(e.target.value)}
                                style={{
                                    width: 50,
                                    padding: '10px',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: 8,
                                    fontSize: 14,
                                    textAlign: 'center'
                                }}
                                maxLength={2}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button
                                onClick={() => {
                                    if (newCategoryName.trim()) {
                                        // 🛡️ NULL-POINTER DEFENSE: Ensure object exists
                                        const updatedMenu = menu ? { ...menu } : { categories: [] }
                                        if (!updatedMenu.categories) updatedMenu.categories = []

                                        updatedMenu.categories.push({
                                            id: generateId('category'),
                                            name: newCategoryName.trim(),
                                            icon: newCategoryIcon || '📦',
                                            enabled: true,
                                            items: []
                                        })
                                        setMenu(updatedMenu)
                                        syncMenuToCloud(updatedMenu)
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
                                Crear
                            </button>
                            <button
                                onClick={() => {
                                    setShowAddCategory(false)
                                    setNewCategoryName('')
                                    setNewCategoryIcon('📦')
                                }}
                                style={{
                                    padding: '10px 16px',
                                    background: '#F1F5F9',
                                    color: '#64748B',
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

                {/* 🛡️ RENDER GUARD: Handle empty/undefined categories gracefully */}
                {console.log('[MenuManager] 🎨 RENDER CHECK - Menu State:', menu)}
                {(menu?.categories || []).map(category => {
                    const isEnabled = category.enabled !== false
                    return (
                        <div key={category.id} style={{ marginBottom: 20, opacity: isEnabled ? 1 : 0.5 }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 8
                            }}>
                                <div style={{ flex: 1 }}>
                                    {editingCategory?.id === category.id ? (
                                        <input
                                            type="text"
                                            value={editingCategory.name}
                                            onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                                            onBlur={() => handleRenameCategory(category.id)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleRenameCategory(category.id)}
                                            autoFocus
                                            style={{
                                                fontSize: 14,
                                                fontWeight: 600,
                                                color: '#374151',
                                                border: '1px solid #3B82F6',
                                                borderRadius: 4,
                                                padding: '2px 6px',
                                                width: '100%',
                                                maxWidth: 200,
                                                outline: 'none'
                                            }}
                                        />
                                    ) : (
                                        <h3
                                            onClick={() => setEditingCategory({ id: category.id, name: category.name })}
                                            style={{
                                                fontSize: 14,
                                                fontWeight: 600,
                                                color: '#374151',
                                                margin: 0,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8
                                            }}
                                            title="Clic para renombrar"
                                        >
                                            {category.name}
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M12 20h9"></path>
                                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                                            </svg>
                                            {!isEnabled && <span style={{ fontSize: 11, marginLeft: 8, color: '#EF4444', opacity: 1 }}>(oculta)</span>}
                                        </h3>
                                    )}
                                </div>
                                <label className="toggle">
                                    <input
                                        type="checkbox"
                                        checked={isEnabled}
                                        onChange={() => handleToggleCategory(category.id)}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>

                            <div style={{
                                background: '#FFFFFF',
                                borderRadius: 12,
                                border: '1px solid #E2E8F0',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                            }}>
                                {category.items.map((item, idx) => (
                                    <div key={item.id} style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        padding: '12px 14px',
                                        borderBottom: idx < category.items.length - 1 ? '1px solid #F1F5F9' : 'none',
                                        gap: 10
                                    }}>
                                        {/* Image Placeholder - SuperAdmin Style (always visible, clickable) */}
                                        <div style={{ width: 60, flexShrink: 0 }}>
                                            <div
                                                onClick={() => handleBoxTap(category.id, item)}
                                                className="empty-box"
                                                style={{
                                                    width: 60,
                                                    height: 60,
                                                    borderRadius: 10,
                                                    background: item.image ? 'none' : '#F3F4F6',
                                                    border: '2px dashed #D1D5DB',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    overflow: 'hidden',
                                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                                }}
                                            >
                                                {item.image ? (
                                                    <img src={item.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
                                                ) : (
                                                    <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', pointerEvents: 'none', userSelect: 'none' }}>VACÍO</span>
                                                )}
                                            </div>
                                        </div>
                                        {/* Item Details - SuperAdmin Style */}
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                                        {/* 🛡️ UNLOCKED NAME INPUT */}
                                                        <input
                                                            type="text"
                                                            defaultValue={item.name}
                                                            onBlur={(e) => handleNameUpdate(category.id, item.id, e.target.value)}
                                                            onClick={(e) => e.stopPropagation()} // Prevent card tap
                                                            style={{
                                                                fontWeight: 500,
                                                                fontSize: 14,
                                                                color: '#1E293B',
                                                                margin: 0,
                                                                border: 'none',
                                                                background: 'transparent',
                                                                width: '100%',
                                                                outline: 'none',
                                                                pointerEvents: 'auto',
                                                                zIndex: 10
                                                            }}
                                                        />
                                                        <div
                                                            style={{
                                                                fontSize: 16,
                                                                filter: isFeatured(item) ? 'grayscale(0)' : 'grayscale(1)',
                                                                opacity: isFeatured(item) ? 1 : 0.2
                                                            }}
                                                        >
                                                            ⭐
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                        <span style={{ fontSize: 13, color: '#22C55E', fontWeight: 600 }}>$</span>
                                                        <input
                                                            type="number"
                                                            defaultValue={item.price}
                                                            onBlur={(e) => handlePriceUpdate(category.id, item.id, e.target.value)}
                                                            onClick={(e) => e.stopPropagation()} // Prevent card tap
                                                            style={{
                                                                fontSize: 13,
                                                                color: '#22C55E',
                                                                fontWeight: 600,
                                                                border: 'none',
                                                                background: 'transparent',
                                                                width: 60,
                                                                outline: 'none',
                                                                padding: 0
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                                                    <label style={{ fontSize: 11, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 6, height: 24, cursor: 'pointer' }}>
                                                        Agotado
                                                        <input
                                                            type="checkbox"
                                                            checked={!item.available}
                                                            onChange={() => handleToggleAvailability(category.id, item.id)}
                                                            style={{ width: 18, height: 18, accentColor: '#EF4444' }}
                                                        />
                                                    </label>
                                                    <label style={{ fontSize: 11, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 6, height: 24, cursor: 'pointer' }}>
                                                        Promo
                                                        <input
                                                            type="checkbox"
                                                            checked={isFeatured(item)}
                                                            onChange={() => handleToggleFeatured(item)}
                                                            style={{ width: 18, height: 18, accentColor: '#EAB308' }}
                                                        />
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Delete Button - SuperAdmin Style */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleRemoveItem(category.id, item)
                                            }}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: '#EF4444',
                                                fontSize: 18,
                                                cursor: 'pointer',
                                                padding: 4,
                                                alignSelf: 'flex-start',
                                                marginLeft: 8
                                            }}
                                            title="Eliminar ítem"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                                {/* Add Item Button (New) */}
                                <div
                                    onClick={() => handleAddItem(category.id)}
                                    style={{
                                        padding: '12px',
                                        background: '#F8FAFC',
                                        borderTop: '1px solid #E2E8F0',
                                        color: '#3B82F6',
                                        fontSize: 13,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                                    }}
                                >
                                    ➕ Agregar Ítem
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Edit Modal */}
            {
                editingItem && (
                    <div className="modal-overlay" onClick={() => setEditingItem(null)}>
                        <div className="modal" onClick={e => e.stopPropagation()}>
                            <h2 className="modal-title">Editar item</h2>

                            <div className="form-group">
                                <label className="form-label">Nombre</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Precio (ARS)</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={editForm.price}
                                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Imagen (JPG/PNG)</label>
                                {editForm.image && (
                                    <div style={{ marginBottom: 8 }}>
                                        <img
                                            src={editForm.image}
                                            alt="Preview"
                                            style={{
                                                width: '100%',
                                                maxHeight: 120,
                                                objectFit: 'cover',
                                                borderRadius: 10
                                            }}
                                        />
                                    </div>
                                )}
                                {/* File Input moved to root */}
                                <button
                                    className="btn btn-secondary btn-block"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                >
                                    {isUploading ? 'Optimizando...' : (editForm.image ? 'Cambiar imagen' : 'Subir imagen')}
                                </button>
                                {uploadStatus && (
                                    <p style={{
                                        fontSize: 12,
                                        color: uploadStatus.success ? '#22C55E' : '#EF4444',
                                        marginTop: 6
                                    }}>
                                        {uploadStatus.message}
                                    </p>
                                )}
                            </div>

                            <button
                                className="btn btn-primary btn-block"
                                onClick={handleSave}
                            >
                                Guardar
                            </button>
                            <button
                                className="btn btn-secondary btn-block"
                                style={{ marginTop: 8 }}
                                onClick={() => setEditingItem(null)}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                )
            }


            {/* Hidden File Input (Always Mounted for "Vacío" Tap) */}
            <input
                key={inputKey}
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
            />

            {/* Backend Navigation */}
            <BackendNav
                role={demoMode ? 'demo' : 'owner'}
                useRoutes={true}
            />
            {/* SAVE SUCCESS TOAST */}
            {saveStatus && (
                <div style={{
                    position: 'fixed',
                    bottom: 24,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: saveStatus.error ? '#EF4444' : '#22C55E', color: 'white',
                    padding: '10px 24px', borderRadius: 50,
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                    fontWeight: 600, fontSize: 14, zIndex: 9999,
                    display: 'flex', alignItems: 'center', gap: 8,
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <span>{saveStatus.error ? '⚠️' : '✓'}</span> {saveStatus.message}
                </div>
            )}
        </div >
    )
}



export default MenuManager
