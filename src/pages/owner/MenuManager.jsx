import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link, useLocation, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient.js'
import { getAuth, clearAuth } from '../../utils/storage.js'
import { getMenu, saveMenu, formatPrice, setFeaturedItem, toggleCategoryEnabled, addCategory, updateCategory, removeMenuItem, addMenuItem } from '../../config/menuData.js'
import { updateConfig } from '../../config/appConfig.v2.js'
import { processAndStoreImage, formatFileSize } from '../../utils/imageOptimizer.js'
import { canChangeDeliveryConfig, recordDeliveryConfigChange } from '../../utils/deliveryUtils.js'
import { useAdminIntent } from '../../contexts/AdminIntentContext.jsx'
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

    const currentUser = getAuth()
    const targetBusinessId = isSimulated ? impersonatingBusinessId : currentUser?.businessId

    const [menu, setMenu] = useState(() => getMenu(targetBusinessId))
    // REMOVED: const [config, setConfig] = useState(() => getConfig())
    // Config now comes from props
    const [localConfig, setLocalConfig] = useState(config) // Local copy for mutations
    const [editingItem, setEditingItem] = useState(null)
    const [editForm, setEditForm] = useState({ name: '', price: '', image: null })
    const [uploadStatus, setUploadStatus] = useState(null)
    const [isUploading, setIsUploading] = useState(false)
    const [activeFeaturedSlot, setActiveFeaturedSlot] = useState(null) // New: Track which top slot is tapped
    const fileInputRef = useRef(null)

    // PHOENIX PATTERN: Key-based input reset for mobile browsers
    // Incrementing this forces React to trash and recreate the file input DOM node
    const [inputKey, setInputKey] = useState(0)

    // Category creation state
    const [showAddCategory, setShowAddCategory] = useState(false)
    const [newCategoryName, setNewCategoryName] = useState('')
    const [newCategoryIcon, setNewCategoryIcon] = useState('📦')

    // Category renaming state
    const [editingCategory, setEditingCategory] = useState(null) // { id, name }

    // Operational controls state
    const [pauseMessage, setPauseMessage] = useState(config?.pauseOrdersMessage || '')

    // NOTE: Auth check removed - ProtectedRoute handles authentication
    // The old getAuth() was using localStorage, not Supabase Auth

    // 🚀 SILO-AWARE LOGOUT: Redirect to customer-facing view of THIS tenant
    const handleLogout = async () => {
        await supabase.auth.signOut()
        clearAuth()
        window.location.href = demoMode ? '/' : `/${tenantSlug}`
    }

    // --- CLOUD SOLDER: Sync Logic ---
    const syncMenuToCloud = async (updatedMenu) => {
        const auth = getAuth()
        const businessId = isSimulated ? impersonatingBusinessId : auth?.businessId

        if (!businessId) {
            console.error('CRITICAL: Cannot sync to cloud - No Business ID')
            return
        }

        console.log('☁️ Syncing Menu to Supabase...')
        const { error } = await supabase
            .from('branding')
            .upsert({
                tenant_id: businessId,
                menu_data: updatedMenu,
                updated_at: new Date()
            }, {
                onConflict: 'tenant_id'
            })

        if (error) {
            console.error('❌ Cloud Sync Failed:', error)
        } else {
            console.log('✅ Cloud Sync Validated')
        }
    }
    // --------------------------------

    const syncConfigToCloud = async (updatedConfig) => {
        const auth = getAuth()
        const businessId = isSimulated ? impersonatingBusinessId : auth?.businessId

        if (!businessId) return

        console.log('☁️ Syncing Config to Supabase...')
        const { error } = await supabase
            .from('branding')
            .upsert({
                tenant_id: businessId,
                app_config: updatedConfig,
                updated_at: new Date()
            }, {
                onConflict: 'tenant_id'
            })

        if (error) console.error('❌ Cloud Config Sync Failed:', error)
    }

    const handleEdit = (categoryId, item) => {
        setEditingItem({ categoryId, itemId: item.id })
        setEditForm({ name: item.name, price: item.price.toString(), image: item.image || null })
        setUploadStatus(null)
    }

    const handleBoxTap = (categoryId, item) => {
        // 1. Set State for Generic Edit
        handleEdit(categoryId, item)

        // 2. If Vacío (Empty), Trigger Upload Immediately
        if (!item.image) {
            // SYNC EXECUTION: Must happen in the same event loop for mobile
            fileInputRef.current?.click()
        }
    }

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) {
            console.log('No file selected')
            // If we canceled, reset the slot intent
            if (activeFeaturedSlot !== null) setActiveFeaturedSlot(null)
            return
        }

        console.log('Starting image upload:', file.name, file.type, file.size)
        setIsUploading(true)
        setUploadStatus(null)

        try {
            const result = await processAndStoreImage(file)
            console.log('Image processed successfully:', result.optimizedSize)

            // BRANCH: Featured Slot Direct Upload
            if (activeFeaturedSlot !== null) {
                const currentFeatured = [...(localConfig.featuredPhotos || [])]
                // Ensure array has size up to the target index if sparse
                while (currentFeatured.length <= activeFeaturedSlot) {
                    currentFeatured.push(null)
                }

                // Create new generic featured item
                currentFeatured[activeFeaturedSlot] = {
                    name: 'Destacado',
                    price: 0,
                    image: result.dataURI
                }

                const newConfig = { ...localConfig, featuredPhotos: currentFeatured }
                updateConfig(newConfig)
                setLocalConfig(newConfig)
                window.dispatchEvent(new CustomEvent('frontendSync'))
                syncConfigToCloud(newConfig) // ☁️ Cloud Sync

                setUploadStatus({
                    success: true,
                    message: '✔ Foto destacada actualizada'
                })
                setActiveFeaturedSlot(null) // Reset intent
            } else {
                // BRANCH: Normal Menu Item Edit
                setEditForm(prev => ({ ...prev, image: result.dataURI }))
                setUploadStatus({
                    success: true,
                    message: `✔ Imagen optimizada: ${formatFileSize(result.originalSize)} → ${formatFileSize(result.optimizedSize)}`
                })
            }
        } catch (error) {
            console.error('Image upload error:', error)
            setUploadStatus({
                success: false,
                message: error.message || 'Error al procesar imagen'
            })
            if (activeFeaturedSlot !== null) setActiveFeaturedSlot(null)
        } finally {
            setIsUploading(false)

            // PHOENIX PATTERN: Force React to unmount/remount the input
            // This clears Safari/Chrome internal file caches that .value='' doesn't reach
            setInputKey(prev => prev + 1)
            console.log('File input phoenix reset (key incremented)')
        }
    }

    const handleSave = () => {
        if (!editingItem) return

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
                saveMenu(updatedMenu)
                setMenu(updatedMenu)
                syncMenuToCloud(updatedMenu) // ☁️ Cloud Sync
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
                saveMenu(updatedMenu)
                setMenu(updatedMenu)
                syncMenuToCloud(updatedMenu) // ☁️ Cloud Sync
            }
        }
    }

    const handleSetFeatured = (categoryId, itemId) => {
        setFeaturedItem(categoryId, itemId)
        const updatedMenu = getMenu(targetBusinessId) // Re-fetch updated state
        setMenu(updatedMenu)
        syncMenuToCloud(updatedMenu) // ☁️ Cloud Sync
    }

    const handleToggleCategory = (categoryId) => {
        toggleCategoryEnabled(categoryId)
        const updatedMenu = getMenu(targetBusinessId) // Re-fetch updated state
        setMenu(updatedMenu)
        syncMenuToCloud(updatedMenu) // ☁️ Cloud Sync
    }

    const handleRenameCategory = (categoryId) => {
        if (editingCategory && editingCategory.name.trim()) {
            updateCategory(categoryId, { name: editingCategory.name.trim() })
            const updatedMenu = getMenu(targetBusinessId) // Re-fetch updated state
            setMenu(updatedMenu)
            syncMenuToCloud(updatedMenu) // ☁️ Cloud Sync
        }
        setEditingCategory(null)
    }

    // --- CRUD HANDLERS ---
    const handleRemoveItem = (categoryId, item) => {
        if (confirm(`¿Eliminar ítem "${item.name}"?`)) {
            removeMenuItem(categoryId, item.id)
            const updatedMenu = getMenu(targetBusinessId) // Re-fetch updated state
            setMenu(updatedMenu)
            syncMenuToCloud(updatedMenu) // ☁️ Cloud Sync
        }
    }

    const handleAddItem = (categoryId) => {
        const newItem = {
            name: 'Nuevo ítem',
            price: 0,
            image: null
        }
        addMenuItem(categoryId, newItem)
        const updatedMenu = getMenu(targetBusinessId) // Re-fetch updated state
        setMenu(updatedMenu)
        syncMenuToCloud(updatedMenu) // ☁️ Cloud Sync
        // Optionally auto-open edit modal for the new item.
        // For now, we leave it as created. 
        // To do auto-open we need to know the ID, but addMenuItem returns it.
        // Let's improve this if possible, but basic add is fine.
    }
    // ---------------------

    // --- FEATURED ITEMS LOGIC (Synced with SuperAdmin) ---
    const activeFeaturedItems = localConfig?.featuredPhotos || []
    const isFeatured = (item) => activeFeaturedItems.some(f => f && f.name === item.name)

    const handleToggleFeatured = (item) => {
        const currentFeatured = [...activeFeaturedItems]
        const idx = currentFeatured.findIndex(f => f && f.name === item.name)

        if (idx !== -1) {
            currentFeatured.splice(idx, 1) // Remove
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

        // Update both Config (for Home Top 4) AND local state
        const newConfig = { ...localConfig, featuredPhotos: currentFeatured }
        updateConfig(newConfig)
        setLocalConfig(newConfig)
        window.dispatchEvent(new CustomEvent('frontendSync'))
        syncConfigToCloud(newConfig) // ☁️ Cloud Sync
    }

    // --- DIRECT FEATURED UPLOAD LOGIC ---
    const handleFeaturedTap = (index) => {
        const slot = activeFeaturedItems[index]
        // If empty, trigger upload
        if (!slot) {
            setActiveFeaturedSlot(index)
            // SYNC EXECUTION: Mobile-UX Protocol
            fileInputRef.current?.click()
        }
    }
    // ------------------------------------
    // -----------------------------------------------------

    return (
        <div className="backend-surface" style={{ minHeight: '100vh', background: '#F8FAFC' }}>
            <BackendHeader
                title={demoMode ? "Demo Menú" : "Menú"}
                onLogout={handleLogout}
            />

            <div style={{ padding: 16, paddingBottom: 100 }}>
                {/* ==================== OPERATIONAL COMMAND CENTER ==================== */}
                <div style={{ marginBottom: 24 }}>
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
                                    width: 40, height: 40, // Base size (represents ~1km visually)
                                    marginLeft: -20, marginTop: -20,
                                    borderRadius: '50%',
                                    border: '2px solid #22C55E',
                                    background: 'rgba(34, 197, 94, 0.15)',
                                    transform: `scale(${config.delivery?.radiusKm || 5})`,
                                    willChange: 'transform',
                                    transition: 'transform 0.1s linear', // Ultra-fast hardware sync
                                    pointerEvents: 'none',
                                    boxShadow: '0 0 0 1000px rgba(0,0,0,0.1)' // Focus ring effect (inverted mask look)
                                }} />

                                <div style={{
                                    position: 'absolute', bottom: 8, right: 8,
                                    background: 'rgba(255,255,255,0.9)',
                                    padding: '2px 6px', borderRadius: 4,
                                    fontSize: 10, fontWeight: 600, color: '#64748B'
                                }}>
                                    Vista Previa
                                </div>
                            </div>

                            <label style={{ fontSize: 12, color: '#64748B', display: 'block', marginBottom: 4 }}>Radio de entrega: {config.delivery?.radiusKm || 5} km</label>
                            <input
                                type="range"
                                min="1"
                                max="50"
                                value={config.delivery?.radiusKm || 5}
                                onChange={(e) => {
                                    // Removed restrictions: Infinite autonomy
                                    const newValue = parseInt(e.target.value)
                                    const oldValue = config.delivery?.radiusKm || 5
                                    if (newValue !== oldValue) {
                                        // Optional: we can keep the confirm or remove it too if we want true "speed"
                                        // Keeping confirm for now to avoid accidental huge swipes, but removing the "Limit" check
                                        // Actually user said "remove any alert pop-ups that block the Save action". 
                                        // The confirm is a safety, not a block. But I'll remove the block check.
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
                                    overflow: 'hidden'
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
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleToggleFeatured(slot)
                                            }}
                                            style={{
                                                position: 'absolute',
                                                top: 2, right: 2,
                                                width: 20, height: 20,
                                                background: 'red',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '50%',
                                                fontSize: 12,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            ×
                                        </button>
                                    </>
                                ) : (
                                    <span style={{ fontSize: 10, color: '#94A3B8', textAlign: 'center', pointerEvents: 'none' }}>Vacío</span>
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
                                        addCategory(newCategoryName.trim(), newCategoryIcon || '📦')
                                        const updatedMenu = getMenu(targetBusinessId) // Re-fetch updated state
                                        setMenu(updatedMenu)
                                        syncMenuToCloud(updatedMenu) // ☁️ Cloud Sync
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

                {menu.categories.map(category => {
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
                                                        <p style={{
                                                            fontWeight: 500,
                                                            fontSize: 14,
                                                            color: '#1E293B',
                                                            margin: 0
                                                        }}>{item.name}</p>
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
                                                    <p style={{ fontSize: 13, color: '#22C55E', fontWeight: 600, margin: 0 }}>
                                                        ${item.price}
                                                    </p>
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
        </div >
    )
}



export default MenuManager
