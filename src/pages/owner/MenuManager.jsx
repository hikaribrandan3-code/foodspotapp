import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { getAuth, clearAuth } from '../../utils/storage.js'
import { getMenu, saveMenu, formatPrice, setFeaturedItem, toggleCategoryEnabled, addCategory } from '../../config/menuData.js'
import { processAndStoreImage, formatFileSize } from '../../utils/imageOptimizer.js'
import { useAdminIntent } from '../../contexts/AdminIntentContext.jsx'
import BackendHeader from '../../components/BackendHeader.jsx'
import BackendNav from '../../components/BackendNav.jsx'

function MenuManager() {
    const navigate = useNavigate()
    const { isSimulated, impersonatingBusinessId } = useAdminIntent()

    const currentUser = getAuth()
    const targetBusinessId = isSimulated ? impersonatingBusinessId : currentUser?.businessId

    const [menu, setMenu] = useState(() => getMenu(targetBusinessId))
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

    return (
        <div className="backend-surface" style={{ minHeight: '100vh', background: '#F8FAFC' }}>
            <BackendHeader
                title="Menú"
                onLogout={handleLogout}
            />

            <div style={{ padding: 16, paddingBottom: 100 }}>
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
                                    {category.icon} {category.name}
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
                                overflow: 'hidden'
                            }}>
                                {category.items.map((item, idx) => (
                                    <div key={item.id} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '12px 14px',
                                        borderBottom: idx < category.items.length - 1 ? '1px solid #F1F5F9' : 'none'
                                    }}>
                                        {item.image && (
                                            <div style={{ width: 40, height: 40, flexShrink: 0, marginRight: 12 }}>
                                                <img
                                                    src={item.image}
                                                    alt=""
                                                    style={{
                                                        width: 40,
                                                        height: 40,
                                                        borderRadius: 6,
                                                        objectFit: 'cover'
                                                    }}
                                                />
                                            </div>
                                        )}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <p style={{
                                                    fontWeight: 500,
                                                    fontSize: 14,
                                                    color: '#1E293B',
                                                    margin: 0,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>{item.name}</p>
                                                {item.featured && <span style={{ fontSize: 12 }}>⭐</span>}
                                            </div>
                                            <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>
                                                {formatPrice(item.price)} · {item.available ? '✓ Stock' : '✗ Agotado'}
                                            </p>
                                        </div>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button
                                                onClick={() => handleEdit(category.id, item)}
                                                style={{
                                                    padding: '6px 10px',
                                                    fontSize: 12,
                                                    background: '#F1F5F9',
                                                    border: 'none',
                                                    borderRadius: 5,
                                                    cursor: 'pointer',
                                                    color: '#475569'
                                                }}
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={() => handleToggleAvailability(category.id, item.id)}
                                                style={{
                                                    padding: '6px 10px',
                                                    fontSize: 12,
                                                    background: item.available ? '#FEE2E2' : '#DCFCE7',
                                                    border: 'none',
                                                    borderRadius: 5,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {item.available ? '🔴' : '🟢'}
                                            </button>
                                            <button
                                                onClick={() => handleSetFeatured(category.id, item.id)}
                                                style={{
                                                    padding: '6px 10px',
                                                    fontSize: 12,
                                                    background: item.featured ? '#FEF3C7' : '#F1F5F9',
                                                    border: 'none',
                                                    borderRadius: 5,
                                                    cursor: 'pointer'
                                                }}
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
                role="owner"
                useRoutes={true}
            />
        </div>
    )
}

export default MenuManager
