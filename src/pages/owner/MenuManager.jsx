import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getAuth, clearAuth } from '../../utils/storage.js'
import { getMenu, saveMenu, formatPrice, setFeaturedItem, toggleCategoryEnabled } from '../../config/menuData.js'
import { processAndStoreImage, formatFileSize } from '../../utils/imageOptimizer.js'

function MenuManager() {
    const navigate = useNavigate()
    const [menu, setMenu] = useState(() => getMenu())
    const [editingItem, setEditingItem] = useState(null)
    const [editForm, setEditForm] = useState({ name: '', price: '', image: null })
    const [uploadStatus, setUploadStatus] = useState(null)
    const [isUploading, setIsUploading] = useState(false)
    const fileInputRef = useRef(null)

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

    const handleEdit = (categoryId, item) => {
        setEditingItem({ categoryId, itemId: item.id })
        setEditForm({ name: item.name, price: item.price.toString(), image: item.image || null })
        setUploadStatus(null)
    }

    // Image upload handler with optimization
    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        setUploadStatus(null)

        try {
            const result = await processAndStoreImage(file)
            setEditForm(prev => ({ ...prev, image: result.dataURI }))
            setUploadStatus({
                success: true,
                message: `✔ Imagen optimizada: ${formatFileSize(result.originalSize)} → ${formatFileSize(result.optimizedSize)}`
            })
        } catch (error) {
            setUploadStatus({
                success: false,
                message: error.message
            })
        } finally {
            setIsUploading(false)
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
        setMenu(getMenu())
    }

    const handleToggleCategory = (categoryId) => {
        toggleCategoryEnabled(categoryId)
        setMenu(getMenu())
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
                    📋 Menú
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
                <Link to="/owner/menu" className="tab active">Menú</Link>
                <Link to="/owner/rewards" className="tab">Recompensas</Link>
                <Link to="/owner/settings" className="tab">Config</Link>
                <Link to="/owner/analytics" className="tab">Stats</Link>
            </div>

            {/* Menu Categories */}
            {menu.categories.map(category => {
                const isEnabled = category.enabled !== false
                return (
                    <div key={category.id} className="admin-section" style={{ opacity: isEnabled ? 1 : 0.5 }}>
                        {/* Category Header with Toggle */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 'var(--space-2)'
                        }}>
                            <h3 className="admin-section-title" style={{ marginBottom: 0 }}>
                                {category.icon} {category.name}
                                {!isEnabled && <span style={{ fontSize: 'var(--font-size-xs)', marginLeft: 'var(--space-2)', color: 'var(--color-error)' }}>(oculta)</span>}
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

                        <div className="admin-card">
                            {category.items.map(item => (
                                <div key={item.id} className="admin-row">
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                            <p style={{ fontWeight: 'var(--font-weight-medium)' }}>{item.name}</p>
                                            {item.featured && <span style={{ fontSize: 'var(--font-size-sm)' }}>⭐</span>}
                                        </div>
                                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                                            {formatPrice(item.price)} · {item.available ? '✅' : '❌'}
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                        <button
                                            className="btn btn-secondary"
                                            style={{ padding: 'var(--space-1) var(--space-2)', fontSize: 'var(--font-size-sm)' }}
                                            onClick={() => handleEdit(category.id, item)}
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            className="btn btn-secondary"
                                            style={{ padding: 'var(--space-1) var(--space-2)', fontSize: 'var(--font-size-sm)' }}
                                            onClick={() => handleToggleAvailability(category.id, item.id)}
                                        >
                                            {item.available ? '🔴' : '🟢'}
                                        </button>
                                        <button
                                            className="btn btn-secondary"
                                            style={{ padding: 'var(--space-1) var(--space-2)', fontSize: 'var(--font-size-sm)' }}
                                            onClick={() => handleSetFeatured(category.id, item.id)}
                                        >
                                            ⭐
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            })}

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

                        {/* Image Upload */}
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
                                {isUploading ? 'Optimizando...' : (editForm.image ? '📷 Cambiar imagen' : '📷 Subir imagen')}
                            </button>
                            {uploadStatus && (
                                <p style={{
                                    fontSize: 'var(--font-size-sm)',
                                    color: uploadStatus.success ? 'var(--color-success)' : 'var(--color-error)',
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
                            style={{ marginTop: 'var(--space-2)' }}
                            onClick={() => setEditingItem(null)}
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default MenuManager
