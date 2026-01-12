import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { getAuth, clearAuth } from '../../utils/storage.js'
import { getMenu, saveMenu, formatPrice, setFeaturedItem, toggleCategoryEnabled, addCategory } from '../../config/menuData.js'
import { updateConfig } from '../../config/appConfig.v2.js'
import { processAndStoreImage, formatFileSize } from '../../utils/imageOptimizer.js'
import { useAdminIntent } from '../../contexts/AdminIntentContext.jsx'
import BackendHeader from '../../components/BackendHeader.jsx'
import BackendNav from '../../components/BackendNav.jsx'

/**
 * MENU MANAGER
 * 
 * ARCHITECTURAL INVARIANT: Config MUST come from props, NOT getConfig().
 * This ensures Single Source of Truth from App.jsx.
 */
function MenuManager({ config, demoMode = false }) {
    const navigate = useNavigate()
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
    const fileInputRef = useRef(null)

    // PHOENIX PATTERN: Key-based input reset for mobile browsers
    // Incrementing this forces React to trash and recreate the file input DOM node
    const [inputKey, setInputKey] = useState(0)

    // Category creation state
    const [showAddCategory, setShowAddCategory] = useState(false)
    const [newCategoryName, setNewCategoryName] = useState('')
    const [newCategoryIcon, setNewCategoryIcon] = useState('📦')

    // NOTE: Auth check removed - ProtectedRoute handles authentication
    // The old getAuth() was using localStorage, not Supabase Auth

    const handleLogout = () => {
        clearAuth()
        navigate('/')
    }

    const handleEdit = (categoryId, item) => {
        setEditingItem({ categoryId, itemId: item.id })
        setEditForm({ name: item.name, price: item.price.toString(), image: item.image || null })
        setUploadStatus(null)
    }

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) {
            console.log('No file selected')
            return
        }

        console.log('Starting image upload:', file.name, file.type, file.size)
        setIsUploading(true)
        setUploadStatus(null)

        try {
            const result = await processAndStoreImage(file)
            console.log('Image processed successfully:', result.optimizedSize)
            setEditForm(prev => ({ ...prev, image: result.dataURI }))
            setUploadStatus({
                success: true,
                message: `✔ Imagen optimizada: ${formatFileSize(result.originalSize)} → ${formatFileSize(result.optimizedSize)}`
            })
        } catch (error) {
            console.error('Image upload error:', error)
            setUploadStatus({
                success: false,
                message: error.message || 'Error al procesar imagen'
            })
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
            }
        }
    }

    const handleSetFeatured = (categoryId, itemId) => {
        setFeaturedItem(categoryId, itemId)
        setMenu(getMenu(targetBusinessId))
    }

    const handleToggleCategory = (categoryId) => {
        toggleCategoryEnabled(categoryId)
        setMenu(getMenu(targetBusinessId))
    }

    // --- CRUD HANDLERS ---
    const handleRemoveItem = (categoryId, item) => {
        if (confirm(`¿Eliminar ítem "${item.name}"?`)) {
            removeMenuItem(categoryId, item.id)
            setMenu(getMenu(targetBusinessId))
        }
    }

    const handleAddItem = (categoryId) => {
        const newItem = {
            name: 'Nuevo ítem',
            price: 0,
            image: null
        }
        addMenuItem(categoryId, newItem)
        setMenu(getMenu(targetBusinessId))
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
    }
    // -----------------------------------------------------

    return (
        <div className="backend-surface" style={{ minHeight: '100vh', background: '#F8FAFC' }}>
            <BackendHeader
                title={demoMode ? "Demo Menú" : "Menú"}
                onLogout={handleLogout}
            />

            <div style={{ padding: 16, paddingBottom: 100 }}>
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
                            <div key={i} style={{
                                aspectRatio: '1/1',
                                background: slot?.image ? `url(${slot.image}) center/cover` : '#F1F5F9',
                                borderRadius: 8,
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
                                            onClick={() => handleToggleFeatured(slot)}
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
                                    <span style={{ fontSize: 10, color: '#94A3B8', textAlign: 'center' }}>Vacío</span>
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
                                        setMenu(getMenu(targetBusinessId))
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
                                <h3 style={{
                                    fontSize: 14,
                                    fontWeight: 600,
                                    color: '#374151',
                                    margin: 0
                                }}>
                                    {category.name}
                                    {!isEnabled && <span style={{ fontSize: 11, marginLeft: 8, color: '#EF4444' }}>(oculta)</span>}
                                </h3>
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
                                borderRadius: 10,
                                border: '1px solid #E2E8F0',
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
                                                onClick={() => handleEdit(category.id, item)}
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
                                            onClick={() => handleRemoveItem(category.id, item)}
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
            {editingItem && (
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
                                            borderRadius: 8
                                        }}
                                    />
                                </div>
                            )}
                            <input
                                key={inputKey}
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/jpg"
                                onChange={handleImageUpload}
                                style={{ display: 'none' }}
                            />
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
            )}

            {/* Backend Navigation */}
            <BackendNav
                role={demoMode ? 'demo' : 'owner'}
                useRoutes={true}
            />
        </div>
    )
}

export default MenuManager
