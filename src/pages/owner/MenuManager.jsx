import React, { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react'
import { useNavigate, Link, useLocation, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Edit, Sun, Moon, Save } from 'lucide-react'
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
import './MenuStyles.css'

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
    const [localConfig, setLocalConfig] = useState(config)
    const [activeCategoryId, setActiveCategoryId] = useState(null)
    const [editingItem, setEditingItem] = useState(null)
    const [editForm, setEditForm] = useState({})
    const [darkMode, setDarkMode] = useState(false)
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
        <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-white'}`}>
            <BackendHeader />

            <div className="max-w-6xl mx-auto px-4 py-6">
                {/* Title */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            FoodSpot Kitchen System
                        </h1>
                        <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Manage your menu items and categories
                        </p>
                    </div>
                    <button
                        onClick={() => setDarkMode(!darkMode)}
                        className={`p-3 rounded-full ${darkMode ? 'bg-gray-800 text-yellow-400' : 'bg-gray-100 text-gray-600'}`}
                    >
                        {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                </div>

                {/* Category Tabs */}
                <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
                    <button
                        onClick={handleAddItem}
                        className="flex-shrink-0 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-full flex items-center gap-2 font-medium transition"
                    >
                        <Plus size={18} /> Category
                    </button>
                    {menu.categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategoryId(cat.id)}
                            className={`flex-shrink-0 px-4 py-2 rounded-full font-medium transition ${
                                activeCategoryId === cat.id
                                    ? 'bg-blue-500 text-white'
                                    : darkMode
                                        ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            {cat.name} <span className="text-xs ml-1">({cat.items?.length || 0})</span>
                        </button>
                    ))}
                </div>

                {/* Items Grid */}
                <div className="space-y-4">
                    <button
                        onClick={handleAddItem}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition"
                    >
                        <Plus size={20} /> Add Item
                    </button>

                    <AnimatePresence>
                        {activeItems.map(item => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className={`rounded-lg p-4 ${darkMode ? 'bg-gray-800' : 'bg-gray-50'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}
                            >
                                <div className="flex gap-4">
                                    {/* Image */}
                                    {item.image && (
                                        <div className="flex-shrink-0">
                                            <img
                                                src={item.image}
                                                alt={item.name}
                                                className="w-24 h-24 rounded-lg object-cover"
                                            />
                                        </div>
                                    )}

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <h3 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                                    {item.name}
                                                </h3>
                                                <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                    {item.description || 'No description'}
                                                </p>
                                                {item.calories && (
                                                    <p className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                                        {item.calories} kcal
                                                    </p>
                                                )}
                                            </div>
                                            <span className="text-blue-500 font-bold text-lg flex-shrink-0">
                                                {formatPrice(item.price)}
                                            </span>
                                        </div>

                                        {/* Availability & Actions */}
                                        <div className="flex items-center gap-3 mt-4">
                                            <label className="flex items-center gap-2 cursor-pointer">
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
                                                    className="w-4 h-4 rounded"
                                                />
                                                <span className={`text-sm ${item.available ? 'text-green-600' : 'text-gray-500'}`}>
                                                    {item.available ? 'In Stock' : 'Out of Stock'}
                                                </span>
                                            </label>

                                            <div className="flex gap-2 ml-auto">
                                                <button
                                                    onClick={() => handleEdit(item)}
                                                    className="p-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-600 transition"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item)}
                                                    className="p-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 transition"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Floating Save Bar */}
                {hasChanges && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="fixed bottom-20 left-0 right-0 flex justify-center"
                    >
                        <button
                            onClick={syncMenuToCloud}
                            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-full font-semibold shadow-lg transition"
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
                        className={`fixed bottom-10 left-1/2 -translate-x-1/2 px-4 py-3 rounded-lg text-white font-medium ${
                            toast.success ? 'bg-green-500' : 'bg-red-500'
                        }`}
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
