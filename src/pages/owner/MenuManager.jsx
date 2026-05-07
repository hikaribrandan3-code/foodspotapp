import React, { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react'
import { useNavigate, Link, useLocation, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Edit, Save } from 'lucide-react'
import { supabase, updateBranding } from '../../lib/supabaseClient.js'
import { getAuth, clearAuth } from '../../utils/storage.js'
import { formatPrice } from '../../config/menuData.js'
import { updateConfig } from '../../config/appConfig.v2.js'
import { processAndStoreImage, formatFileSize } from '../../utils/imageOptimizer.js'
import { canChangeDeliveryConfig, recordDeliveryConfigChange } from '../../utils/deliveryUtils.js'
import { useAdminIntent } from '../../contexts/AdminIntentContext.jsx'
import { useTenant } from '../../contexts/TenantContext.jsx'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import BackendHeader from '../../components/BackendHeader.jsx'
import BackendNav from '../../components/BackendNav.jsx'
import PrintMenu from '../../components/PrintMenu.jsx'
import ItemEditorModal from '../../components/owner/MenuManager/ItemEditorModal.jsx'
import { DIVIDER_PRESETS } from '../../config/dividerPresets.js'
import { useBlobUrlTracker } from '../../hooks/useBlobUrlTracker'

const MenuInventoryView = lazy(() => import('../../components/owner/MenuInventoryView.jsx'))

const sanitizeMenu = (menuData) => {
    if (!menuData || !menuData.categories) return menuData
    const cleanMenu = JSON.parse(JSON.stringify(menuData))
    cleanMenu.categories.forEach(cat => {
        if (cat.items) {
            cat.items.forEach(item => {
                if (item.image && item.image.startsWith('blob:')) {
                    item.image = null
                }
            })
        }
    })
    return cleanMenu
}

function MenuManager({ config: configProp, demoMode = false }) {
    const config = configProp || {};
    const navigate = useNavigate()
    const { tenantSlug } = useParams()
    const { isSimulated, impersonatingBusinessId } = useAdminIntent()
    const { businessId: tenantBusinessId, tenantData, isLoaded: tenantLoaded, refreshTenantData } = useTenant()
    const { lang, t } = useLanguage()
    const targetBusinessId = (isSimulated ? impersonatingBusinessId : tenantBusinessId) || '00470a1a-f5c4-4fb8-a4a5-2ab0d8d758fd'

    const [menu, setMenu] = useState({ categories: [] })
    const [activeCategoryId, setActiveCategoryId] = useState(null)
    const [editingItem, setEditingItem] = useState(null)
    const [editForm, setEditForm] = useState({})
    const [hasChanges, setHasChanges] = useState(false)
    const [uploadStatus, setUploadStatus] = useState(null)
    const [isUploading, setIsUploading] = useState(false)
    const [toast, setToast] = useState(null)
    const fileInputRef = useRef(null)

    useEffect(() => {
        if (tenantLoaded) {
            if (tenantData?.menu_data && tenantData.menu_data.categories?.length > 0) {
                const cleanMenu = sanitizeMenu(tenantData.menu_data)
                const sanitizedCategories = cleanMenu.categories.map(cat => ({
                    ...cat,
                    items: Array.isArray(cat.items) ? cat.items : []
                }))
                setMenu({ categories: sanitizedCategories })
                if (!activeCategoryId && sanitizedCategories.length > 0) {
                    setActiveCategoryId(sanitizedCategories[0].id)
                }
            } else {
                setMenu({
                    categories: [
                        {
                            id: 'cat-bakery', name: 'Bakery', icon: '🥐', enabled: true,
                            items: [
                                { id: 'item-bak-1', name: 'Croissants', price: 4500, image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500&q=80', available: true },
                            ]
                        },
                    ]
                })
            }
        }
    }, [tenantLoaded, tenantData])

    const activeCategory = menu.categories.find(cat => cat.id === activeCategoryId) || menu.categories[0]
    const activeItems = activeCategory?.items || []

    const handleAddItem = () => {
        if (!activeCategory) return
        const newItem = {
            id: `item-${Date.now()}`,
            name: 'New Item',
            price: 0,
            image: null,
            available: true,
            description: ''
        }
        const updatedCategories = menu.categories.map(cat =>
            cat.id === activeCategory.id
                ? { ...cat, items: [...cat.items, newItem] }
                : cat
        )
        setMenu({ categories: updatedCategories })
        setHasChanges(true)
    }

    const handleEdit = (item) => {
        setEditingItem(item)
        setEditForm({ ...item })
    }

    const handleSave = async () => {
        const updatedCategories = menu.categories.map(cat =>
            cat.id === editingItem.categoryId
                ? {
                    ...cat,
                    items: cat.items.map(item =>
                        item.id === editingItem.id ? { ...editingItem, ...editForm } : item
                    )
                }
                : cat
        )
        setMenu({ categories: updatedCategories })
        setEditingItem(null)
        setHasChanges(true)
    }

    const handleDelete = (item) => {
        if (!window.confirm(`Delete ${item.name}?`)) return
        const updatedCategories = menu.categories.map(cat =>
            cat.id === editingItem?.categoryId || cat.id === activeCategory.id
                ? { ...cat, items: cat.items.filter(i => i.id !== item.id) }
                : cat
        )
        setMenu({ categories: updatedCategories })
        setHasChanges(true)
    }

    const syncMenuToCloud = async () => {
        try {
            const { data, error } = await supabase
                .from('businesses')
                .update({ menu_data: menu })
                .eq('id', targetBusinessId)
                .select()

            if (error) throw error
            setToast({ message: 'Menu saved!', success: true })
            setHasChanges(false)
            setTimeout(() => setToast(null), 2000)
        } catch (err) {
            console.error('Sync error:', err)
            setToast({ message: 'Save failed', success: false })
        }
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
            <BackendHeader />

            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px' }}>
                {/* Header */}
                <div style={{ marginBottom: '40px' }}>
                    <h1 style={{ fontSize: '32px', fontWeight: 900, color: '#111827', marginBottom: '8px' }}>
                        Menu
                    </h1>
                    <p style={{ fontSize: '16px', color: '#6b7280' }}>
                        Organize and update your restaurant offerings with real-time feedback.
                    </p>
                </div>

                {/* Actions Bar */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', flexWrap: 'wrap' }}>
                    <button
                        onClick={handleAddItem}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 20px',
                            backgroundColor: '#f3f4f6',
                            border: '1px solid #e5e7eb',
                            borderRadius: '24px',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                    >
                        <Plus size={16} /> Category
                    </button>
                    <button
                        onClick={handleAddItem}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 20px',
                            backgroundColor: '#5b5bff',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '24px',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4747d4'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#5b5bff'}
                    >
                        <Plus size={16} /> Add Item
                    </button>
                </div>

                {/* Category Pills */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', overflowX: 'auto', paddingBottom: '12px' }}>
                    {menu.categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategoryId(cat.id)}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: activeCategoryId === cat.id ? '#5b5bff' : '#ffffff',
                                color: activeCategoryId === cat.id ? '#ffffff' : '#374151',
                                border: activeCategoryId === cat.id ? 'none' : '1px solid #e5e7eb',
                                borderRadius: '20px',
                                fontSize: '14px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                flexShrink: 0,
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>

                {/* Items Grid */}
                <div style={{ display: 'grid', gap: '16px' }}>
                    <AnimatePresence>
                        {activeItems.map(item => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                style={{
                                    display: 'flex',
                                    gap: '16px',
                                    padding: '16px',
                                    backgroundColor: '#ffffff',
                                    borderRadius: '12px',
                                    border: '1px solid #e5e7eb',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }}
                            >
                                {item.image && (
                                    <div style={{ flexShrink: 0 }}>
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            style={{
                                                width: '96px',
                                                height: '96px',
                                                borderRadius: '8px',
                                                objectFit: 'cover'
                                            }}
                                        />
                                    </div>
                                )}

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '16px', marginBottom: '8px' }}>
                                        <div>
                                            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: 0 }}>
                                                {item.name}
                                            </h3>
                                            <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>
                                                {item.description || 'No description'}
                                            </p>
                                            {item.calories && (
                                                <p style={{ fontSize: '12px', color: '#9ca3af', margin: '6px 0 0 0' }}>
                                                    💧 {item.calories} kcal
                                                </p>
                                            )}
                                        </div>
                                        <span style={{ fontSize: '16px', fontWeight: 700, color: '#5b5bff', flexShrink: 0 }}>
                                            {formatPrice(item.price)}
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '12px' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                                            <input
                                                type="checkbox"
                                                checked={item.available}
                                                onChange={(e) => {
                                                    const updated = menu.categories.map(cat =>
                                                        cat.id === activeCategory.id
                                                            ? {
                                                                ...cat,
                                                                items: cat.items.map(i =>
                                                                    i.id === item.id ? { ...i, available: e.target.checked } : i
                                                                )
                                                            }
                                                            : cat
                                                    )
                                                    setMenu({ categories: updated })
                                                    setHasChanges(true)
                                                }}
                                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                            />
                                            <span style={{ color: item.available ? '#10b981' : '#9ca3af' }}>
                                                {item.available ? 'In Stock' : 'Out of Stock'}
                                            </span>
                                        </label>

                                        <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                                            <button
                                                onClick={() => handleEdit(item)}
                                                style={{
                                                    padding: '8px 12px',
                                                    backgroundColor: '#dbeafe',
                                                    color: '#2563eb',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#bfdbfe'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dbeafe'}
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item)}
                                                style={{
                                                    padding: '8px 12px',
                                                    backgroundColor: '#fee2e2',
                                                    color: '#dc2626',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fecaca'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Save Bar */}
                {hasChanges && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        style={{ position: 'fixed', bottom: '80px', left: 0, right: 0, textAlign: 'center' }}
                    >
                        <button
                            onClick={syncMenuToCloud}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '12px 24px',
                                backgroundColor: '#10b981',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '24px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
                        >
                            <Save size={18} /> Save Changes
                        </button>
                    </motion.div>
                )}

                {/* Toast */}
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        style={{
                            position: 'fixed',
                            bottom: '20px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            padding: '12px 20px',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: 500,
                            color: '#ffffff',
                            backgroundColor: toast.success ? '#10b981' : '#ef4444'
                        }}
                    >
                        {toast.message}
                    </motion.div>
                )}
            </div>

            {/* Modal */}
            <ItemEditorModal
                editingItem={editingItem}
                editForm={editForm}
                setEditForm={setEditForm}
                onClose={() => {
                    setEditingItem(null)
                    if (Object.keys(editForm).length > 0) handleSave()
                }}
                onImageClick={() => fileInputRef.current?.click()}
                uploadStatus={uploadStatus}
                isUploading={isUploading}
                fileInputRef={fileInputRef}
                activeFeaturedSlotRef={useRef(null)}
                activeCategoryItemRef={useRef(null)}
            />

            <BackendNav />
        </div>
    )
}

export default MenuManager
