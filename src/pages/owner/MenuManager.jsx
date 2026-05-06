import React, { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react'
import { useNavigate, Link, useLocation, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChefHat, Plus, Trash2, Edit, Sun, Moon, Save, ChevronDown } from 'lucide-react'
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
                    console.warn(`⚠️ SANITIZER: Removed dead blob URL for item ${item.name}`)
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
    const isHydratedRef = useRef(false)
    const ignoreCloudUpdateRef = useRef(false)

    useEffect(() => {
        if (tenantLoaded) {
            if (ignoreCloudUpdateRef.current) {
                console.log('[MenuManager] 🛡️ IGNORING STALE CLOUD DATA (Anti-Bounce Active)')
                ignoreCloudUpdateRef.current = false
                return
            }

            if (tenantData?.menu_data && tenantData.menu_data.categories?.length > 0) {
                console.log('[MenuManager] 🎯 HYDRATING FROM CLOUD:', tenantData.menu_data)
                const cleanMenu = sanitizeMenu(tenantData.menu_data)
                const sanitizedCategories = cleanMenu.categories.map(cat => ({
                    ...cat,
                    items: Array.isArray(cat.items) ? cat.items : []
                }))
                setMenu({ categories: sanitizedCategories })
            } else {
                console.log('[MenuManager] 🌱 NO CLOUD DATA: Seeding Default Menu')
                setMenu({
                    categories: [
                        {
                            id: 'cat-bakery', name: 'Bakery & Patisserie', icon: '🥐', enabled: true,
                            items: [
                                { id: 'item-bak-1', name: 'Panes Rústicos', price: 4500, image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&q=80', available: true },
                                { id: 'item-bak-2', name: 'Croissants', price: 3200, image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500&q=80', available: true },
                            ]
                        },
                    ]
                })
            }
            isHydratedRef.current = true
            console.log('[MenuManager] 🔓 HYDRATION COMPLETE: Sync now allowed')
        }
    }, [tenantLoaded, tenantData])

    useEffect(() => {
        if (tenantLoaded && tenantData?.app_config) {
            setLocalConfig(prev => {
                const cloudPhotos = tenantData.app_config.featuredPhotos || []
                if (cloudPhotos.length === 0 && prev.featuredPhotos?.length > 0) return prev
                return { ...prev, ...tenantData.app_config }
            })
        }
    }, [tenantLoaded, tenantData?.app_config])

    useEffect(() => {
        const incomingId = config?.businessId || tenantBusinessId
        const localId = localConfig?.businessId
        if (incomingId && localId && String(incomingId) !== String(localId)) {
            console.log('[MenuManager] 🛡️ Cross-Tenant Move: Re-hydrating')
            setLocalConfig(config)
        }
    }, [config?.businessId])

    const [editingItem, setEditingItem] = useState(null)
    const [editForm, setEditForm] = useState({ name: '', price: '', image: null, description: '', calories: '' })
    const [uploadStatus, setUploadStatus] = useState(null)
    const [isUploading, setIsUploading] = useState(false)
    const activeFeaturedSlotRef = useRef(null)
    const activeCategoryItemRef = useRef(null)
    const [saveStatus, setSaveStatus] = useState(null)
    const [hasChanges, setHasChanges] = useState(() => sessionStorage.getItem(`dirty_${targetBusinessId}`) === 'true')
    const [isSaving, setIsSaving] = useState(false)
    const [pendingFiles, setPendingFiles] = useState({})
    const [viewTab, setViewTab] = useState('menu')
    const [activeCategory, setActiveCategory] = useState(null)
    const [darkMode, setDarkMode] = useState(false)

    const activeFeaturedItems = React.useMemo(() => {
        const photos = localConfig?.featuredPhotos || []
        const slots = [...photos]
        while (slots.length < 4) slots.push(null)
        return slots.slice(0, 4)
    }, [localConfig?.featuredPhotos])

    const { createBlobUrl, revokeBlobUrl, revokeAllBlobUrls } = useBlobUrlTracker()

    const getThumbUrl = (url, size = 80) => {
        if (!url || url.startsWith('blob:')) return url
        if (url.includes('unsplash.com')) {
            return `${url.split('?')[0]}?w=${size}&q=60&fit=crop&format=webp`
        }
        const sep = url.includes('?') ? '&' : '?'
        return `${url}${sep}width=${size}&quality=60&format=webp`
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        clearAuth()
        window.location.href = demoMode ? '/' : `/${tenantSlug}`
    }

    const hasBlobUrls = (menuData) => {
        if (!menuData?.categories) return false
        for (const cat of menuData.categories) {
            if (!cat?.items) continue
            for (const item of cat.items) {
                if (item?.image && item.image.startsWith('blob:')) {
                    console.error(`🚨 BLOB GUARD: Rejecting save - ${item.name} has blob URL:`, item.image)
                    return true
                }
            }
        }
        return false
    }

    const hasPendingUploads = () => {
        const pendingCount = Object.keys(pendingFiles).length
        if (pendingCount > 0) {
            console.warn(`🚨 PENDING GUARD: ${pendingCount} images still uploading. Rejecting save.`)
            return true
        }
        return false
    }

    const syncMenuToCloud = async (updatedMenu) => {
        if (!isHydratedRef.current) {
            console.warn('⚠️ SYNC BLOCKED: Hydration not complete.')
            return
        }

        if (!updatedMenu || !Array.isArray(updatedMenu.categories)) {
            console.warn('⚠️ SYNC BLOCKED: Attempted to sync null/invalid menu.')
            return
        }

        if (hasBlobUrls(updatedMenu)) {
            window.alert('⏳ Images still loading...')
            setSaveStatus({ message: '⏳ Waiting for images...', error: true })
            setTimeout(() => setSaveStatus(null), 3000)
            return
        }

        if (hasPendingUploads()) {
            window.alert('⏳ Upload in progress...')
            setSaveStatus({ message: '⏳ Uploading images...', error: true })
            setTimeout(() => setSaveStatus(null), 3000)
            return
        }

        const validCategories = updatedMenu.categories.filter(cat =>
            cat && cat.id && typeof cat.id === 'string' && Array.isArray(cat.items)
        )

        const sanitizedMenu = {
            ...updatedMenu,
            categories: validCategories.map(cat => ({
                ...cat,
                items: (cat.items || []).filter(item => item && item.id).map(item => ({
                    id: item.id,
                    name: item.name || 'Sin nombre',
                    price: typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0,
                    image: item.image || null,
                    description: item.description || '',
                    calories: item.calories || null,
                    available: item.available !== false
                }))
            }))
        }

        console.log('☁️ Syncing Menu to Supabase...', targetBusinessId)

        const { error } = await supabase
            .from('branding')
            .update({
                menu_data: sanitizedMenu,
                updated_at: new Date()
            })
            .eq('business_id', targetBusinessId)

        if (error) {
            console.error('❌ Cloud Sync Failed:', error)
            window.alert(`❌ Sync Error: ${error.message}`)
            setSaveStatus({ message: '❌ Error saving', error: true })
            setTimeout(() => setSaveStatus(null), 5000)
        } else {
            console.log('✅ Cloud Sync Validated')
            setMenu(sanitizedMenu)
            setSaveStatus({ message: '✅ Saved to cloud' })
            setTimeout(() => setSaveStatus(null), 2000)
        }
    }

    const syncConfigToCloud = async (updatedConfig) => {
        const { error } = await supabase
            .from('branding')
            .update({
                app_config: updatedConfig,
                hero_url: updatedConfig.headerCover?.image || null,
                business_name: updatedConfig.businessName || null
            })
            .eq('business_id', targetBusinessId)

        if (error) console.error('❌ Platform Sync Error:', error.message)
        else console.log('✅ Platform Sync Success')
    }

    const processMenuImages = async (currentMenu, fileBuffer) => {
        const updatedMenu = JSON.parse(JSON.stringify(currentMenu))

        if (updatedMenu.categories) {
            for (let c = 0; c < updatedMenu.categories.length; c++) {
                const cat = updatedMenu.categories[c]
                if (cat.items) {
                    for (let i = 0; i < cat.items.length; i++) {
                        const item = cat.items[i]
                        const fileToUpload = fileBuffer[item.id]

                        if (fileToUpload) {
                            try {
                                const filePath = `${targetBusinessId}/${item.id}-${Date.now()}.jpg`
                                const { error: uploadError } = await supabase.storage
                                    .from('menu-images')
                                    .upload(filePath, fileToUpload, { upsert: true })

                                if (uploadError) throw uploadError

                                const { data } = supabase.storage
                                    .from('menu-images')
                                    .getPublicUrl(filePath)

                                cat.items[i].image = data.publicUrl
                                console.log(`[ImageProcessor] ✅ REPLACED BLOB for ${item.name}: ${data.publicUrl}`)
                            } catch (err) {
                                console.error(`[ImageProcessor] ❌ Failed to upload image for: ${item.name}`, err)
                            }
                        }
                    }
                }
            }
        }
        return updatedMenu
    }

    const addCategory = () => {
        const newCat = {
            id: `cat-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            name: 'New Category',
            items: [],
            icon: '🍽️',
            enabled: true
        }
        setMenu(prev => ({ ...prev, categories: [...prev.categories, newCat] }))
        setHasChanges(true)
    }

    const handleDeleteCategory = (catId) => {
        const category = menu.categories.find(c => c.id === catId)
        if (!category) return
        if (!confirm(`Delete "${category.name}"?`)) return
        setMenu(prev => ({ ...prev, categories: prev.categories.filter(c => c.id !== catId) }))
        setHasChanges(true)
    }

    const handlePlatformSave = async () => {
        setIsSaving(true)
        console.log('💾 SAVING VAULT:', targetBusinessId)

        if (hasPendingUploads()) {
            window.alert('⏳ Upload in progress...')
            setSaveStatus({ message: '⏳ Uploading images...', error: true })
            setIsSaving(false)
            setTimeout(() => setSaveStatus(null), 3000)
            return
        }

        const processedMenu = await processMenuImages(menu, pendingFiles)

        if (hasBlobUrls(processedMenu)) {
            window.alert('⏳ Some images still uploading...')
            setSaveStatus({ message: '⏳ Waiting for images...', error: true })
            setIsSaving(false)
            setTimeout(() => setSaveStatus(null), 3000)
            return
        }

        const validCategories = processedMenu.categories.filter(cat =>
            cat && cat.id && Array.isArray(cat.items)
        )
        const menuToSave = { ...processedMenu, categories: validCategories }

        const { error: brandingError } = await supabase
            .from('branding')
            .update({
                app_config: localConfig,
                menu_data: menuToSave,
                updated_at: new Date()
            })
            .eq('business_id', targetBusinessId)

        if (brandingError) {
            console.error('❌ Branding Sync Error:', brandingError)
            window.alert(`❌ Error: ${brandingError.message}`)
            setIsSaving(false)
            return
        }

        setMenu(menuToSave)
        setPendingFiles({})
        setHasChanges(false)
        sessionStorage.removeItem(`dirty_${targetBusinessId}`)
        setSaveStatus({ message: '✓ Synced' })
        setTimeout(() => setSaveStatus(null), 3000)

        ignoreCloudUpdateRef.current = true
        await refreshTenantData()
        setIsSaving(false)
    }

    const generateId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const handleEdit = (categoryId, item) => {
        setEditingItem({ categoryId, itemId: item.id })
        setEditForm({
            name: item.name,
            price: item.price.toString(),
            image: item.image || null,
            description: item.description || '',
            calories: item.calories?.toString() || ''
        })
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

        const previewUrl = createBlobUrl(file)
        const targetSlot = activeFeaturedSlotRef.current
        const targetItem = activeCategoryItemRef.current

        if (targetSlot !== null) {
            setLocalConfig(prev => {
                const newFeatured = [...(prev.featuredPhotos || [])]
                while (newFeatured.length <= targetSlot) newFeatured.push(null)
                newFeatured[targetSlot] = {
                    ...(newFeatured[targetSlot] || { name: 'Featured', price: 0 }),
                    image: previewUrl
                }
                return { ...prev, featuredPhotos: newFeatured }
            })
            setEditForm(prev => ({ ...prev, image: previewUrl }))
        } else if (targetItem) {
            setPendingFiles(prev => ({ ...prev, [targetItem.itemId]: file }))
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
                        ...(currentFeatured[targetSlot] || { name: 'Featured', price: 0 }),
                        image: result.publicUrl
                    }
                    const newConfig = { ...prevConfig, featuredPhotos: currentFeatured }
                    updateConfig(newConfig)
                    window.dispatchEvent(new CustomEvent('frontendSync'))
                    setHasChanges(true)
                    return newConfig
                })
                setEditForm(prev => ({ ...prev, image: result.publicUrl }))
                setUploadStatus({ success: true, message: '✔ Saved' })
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
                setHasChanges(true)
                setEditForm(prev => ({ ...prev, image: result.publicUrl }))
                setUploadStatus({ success: true, message: '✔ Saved' })
            } else {
                setEditForm(prev => ({ ...prev, image: result.publicUrl }))
                setUploadStatus({ success: true, message: '✔ Ready' })
            }
        } catch (error) {
            console.error('Upload failed:', error)
            setUploadStatus({ success: false, message: 'Upload error' })
        } finally {
            setIsUploading(false)
            revokeBlobUrl(previewUrl)
            if (targetItem?.itemId) {
                setPendingFiles(prev => {
                    const newPending = { ...prev }
                    delete newPending[targetItem.itemId]
                    return newPending
                })
            }
            activeFeaturedSlotRef.current = null
            activeCategoryItemRef.current = null
        }
    }

    const handleSave = () => {
        if (!editingItem) return

        if (editingItem.isFeaturedSlot) {
            const newFeatured = [...(localConfig.featuredPhotos || [])]
            while (newFeatured.length <= editingItem.index) newFeatured.push(null)

            newFeatured[editingItem.index] = {
                name: editForm.name || 'Featured',
                price: parseInt(editForm.price) || 0,
                image: editForm.image
            }

            const newConfig = { ...localConfig, featuredPhotos: newFeatured }
            updateConfig(newConfig)
            setLocalConfig(newConfig)
            window.dispatchEvent(new CustomEvent('frontendSync'))
            setHasChanges(true)

            setEditingItem(null)
            setSaveStatus({ message: 'Featured updated' })
            setTimeout(() => setSaveStatus(null), 2000)
            setUploadStatus(null)
            return
        }

        const updatedMenu = { ...menu }
        const category = updatedMenu.categories.find(c => c.id === editingItem.categoryId)
        if (category) {
            const item = category.items.find(i => i.id === editingItem.itemId)
            if (item) {
                item.name = editForm.name
                item.price = parseInt(editForm.price) || item.price
                if (editForm.image) item.image = editForm.image
                item.description = editForm.description || ''
                item.calories = editForm.calories ? parseInt(editForm.calories) : undefined
                setMenu(updatedMenu)
                setSaveStatus({ message: 'Saved' })
                setTimeout(() => setSaveStatus(null), 1500)
                syncMenuToCloud(updatedMenu)
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
                setMenu(updatedMenu)
                setHasChanges(true)
            }
        }
    }

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
                setHasChanges(true)
                setSaveStatus({ message: 'Price updated' })
                setTimeout(() => setSaveStatus(null), 2000)
            }
        }
    }

    const handleNameUpdate = (categoryId, itemId, newName) => {
        if (!newName.trim()) return

        const updatedMenu = { ...menu }
        const category = updatedMenu.categories.find(c => c.id === categoryId)
        if (category) {
            const item = category.items.find(i => i.id === itemId)
            if (item) {
                item.name = newName
                setMenu(updatedMenu)
                setHasChanges(true)
                setSaveStatus({ message: 'Name updated' })
                setTimeout(() => setSaveStatus(null), 2000)
            }
        }
    }

    const handleRemoveItem = (categoryId, item) => {
        if (confirm(`Delete "${item.name}"?`)) {
            const updatedMenu = { ...menu }
            const category = updatedMenu.categories.find(c => c.id === categoryId)
            if (category) {
                category.items = category.items.filter(i => i.id !== item.id)
                setMenu(updatedMenu)
                setHasChanges(true)
            }
        }
    }

    const handleAddItem = (categoryId) => {
        const updatedMenu = { ...menu }
        const category = updatedMenu.categories.find(c => c.id === categoryId)
        if (category) {
            const newItem = {
                id: generateId('item'),
                name: 'New item',
                price: 0,
                available: true,
                featured: false,
                image: null
            }
            category.items.push(newItem)
            setMenu(updatedMenu)
            setHasChanges(true)
        }
    }

    const fileInputRef = useRef(null)
    const [inputKey, setInputKey] = useState(0)

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
                <div style={{ color: '#64748B', fontWeight: 500 }}>Syncing with cloud...</div>
            </div>
        )
    }

    const firstCategory = activeCategory || menu.categories[0]?.id
    const currentCategoryItems = menu.categories.find(c => c.id === firstCategory)?.items || []

    return (
        <div className="backend-surface dark:bg-gray-900" style={{ minHeight: '100vh', background: darkMode ? '#111827' : '#F8FAFC' }}>
            <BackendHeader
                title="FoodSpot Kitchen System"
                onLogout={handleLogout}
            />

            <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 60px)' }}>
                {/* TOP TABS */}
                <div style={{ display: 'flex', gap: 8, padding: '16px 16px', borderBottom: '1px solid #E5E7EB', background: darkMode ? '#1F2937' : '#FFFFFF' }}>
                    {[
                        { id: 'menu', label: 'Menu' },
                        { id: 'inventory', label: 'Inventory' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setViewTab(tab.id)}
                            className="transition-all duration-200"
                            style={{
                                flex: 1,
                                padding: '10px 16px',
                                borderRadius: 8,
                                fontSize: 13,
                                fontWeight: 600,
                                border: 'none',
                                cursor: 'pointer',
                                background: viewTab === tab.id ? 'var(--color-primary, #10B981)' : 'transparent',
                                color: viewTab === tab.id ? 'white' : (darkMode ? '#9CA3AF' : '#4B5563'),
                                boxShadow: viewTab === tab.id ? '0 4px 12px rgba(16, 185, 129, 0.25)' : 'none'
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* MAIN CONTENT */}
                {viewTab === 'menu' && (
                    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', background: darkMode ? '#111827' : '#F8FAFC' }}>
                        {/* SIDEBAR: Categories */}
                        <motion.div
                            initial={{ x: -300, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ duration: 0.3 }}
                            style={{
                                width: 280,
                                borderRight: `1px solid ${darkMode ? '#374151' : '#E5E7EB'}`,
                                overflowY: 'auto',
                                padding: '16px',
                                background: darkMode ? '#1F2937' : '#FFFFFF'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <h3 style={{ margin: 0, fontSize: 12, fontWeight: 800, color: darkMode ? '#F3F4F6' : '#111827', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Categories</h3>
                                <button
                                    onClick={addCategory}
                                    style={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: '50%',
                                        background: 'var(--color-primary, #10B981)',
                                        border: 'none',
                                        color: 'white',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <Plus size={16} />
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {menu.categories.map((cat) => (
                                    <motion.button
                                        key={cat.id}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setActiveCategory(cat.id)}
                                        style={{
                                            padding: '12px 16px',
                                            borderRadius: 12,
                                            border: 'none',
                                            background: activeCategory === cat.id || (!activeCategory && menu.categories[0]?.id === cat.id)
                                                ? 'rgba(16, 185, 129, 0.1)'
                                                : darkMode ? '#374151' : '#F3F4F6',
                                            color: activeCategory === cat.id || (!activeCategory && menu.categories[0]?.id === cat.id)
                                                ? 'var(--color-primary, #10B981)'
                                                : darkMode ? '#D1D5DB' : '#6B7280',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            fontWeight: 600,
                                            fontSize: 14,
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <span>{cat.icon} {cat.name}</span>
                                        <span style={{ fontSize: 11, fontWeight: 700, background: activeCategory === cat.id || (!activeCategory && menu.categories[0]?.id === cat.id) ? 'var(--color-primary, #10B981)' : darkMode ? '#4B5563' : '#D1D5DB', color: activeCategory === cat.id || (!activeCategory && menu.categories[0]?.id === cat.id) ? 'white' : darkMode ? '#F3F4F6' : '#1F2937', padding: '4px 8px', borderRadius: 6 }}>{cat.items?.length || 0}</span>
                                    </motion.button>
                                ))}
                            </div>
                        </motion.div>

                        {/* MAIN GRID: Items */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3, delay: 0.1 }}
                            style={{
                                flex: 1,
                                overflow: 'auto',
                                padding: '24px',
                                background: darkMode ? '#111827' : '#F8FAFC'
                            }}
                        >
                            {/* HEADER & CONTROLS */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: darkMode ? '#F3F4F6' : '#111827' }}>
                                        {firstCategory ? menu.categories.find(c => c.id === firstCategory)?.name : 'Menu'}
                                    </h2>
                                    <p style={{ margin: '4px 0 0', fontSize: 14, color: darkMode ? '#9CA3AF' : '#6B7280' }}>
                                        {currentCategoryItems.length} items
                                    </p>
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => firstCategory && handleAddItem(firstCategory)}
                                    style={{
                                        padding: '12px 24px',
                                        borderRadius: 50,
                                        border: 'none',
                                        background: 'var(--color-primary, #10B981)',
                                        color: 'white',
                                        fontWeight: 700,
                                        fontSize: 14,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
                                    }}
                                >
                                    <Plus size={18} />
                                    Add Item
                                </motion.button>
                            </div>

                            {/* ITEM GRID */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                                gap: 16
                            }}>
                                <AnimatePresence>
                                    {currentCategoryItems.map((item) => (
                                        <motion.div
                                            key={item.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            whileHover={{ y: -4 }}
                                            style={{
                                                borderRadius: 24,
                                                overflow: 'hidden',
                                                background: darkMode ? '#1F2937' : '#FFFFFF',
                                                border: `1px solid ${darkMode ? '#374151' : '#E5E7EB'}`,
                                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                                                opacity: item.available ? 1 : 0.6
                                            }}
                                        >
                                            {/* IMAGE */}
                                            <div style={{
                                                width: '100%',
                                                height: 160,
                                                background: item.image ? `url(${item.image})` : (darkMode ? '#374151' : '#F3F4F6'),
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center',
                                                position: 'relative',
                                                cursor: 'pointer'
                                            }}
                                            onClick={() => handleBoxTap(firstCategory, item)}
                                            >
                                                {!item.available && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        inset: 0,
                                                        background: 'rgba(0, 0, 0, 0.5)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: 'white',
                                                        fontWeight: 700
                                                    }}>
                                                        {t('out_of_stock') || 'Out of Stock'}
                                                    </div>
                                                )}
                                                <div style={{
                                                    position: 'absolute',
                                                    top: 8,
                                                    right: 8,
                                                    background: 'rgba(255, 255, 255, 0.9)',
                                                    padding: '6px 12px',
                                                    borderRadius: 20,
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    color: darkMode ? '#111827' : '#1F2937'
                                                }}>
                                                    {item.calories || '—'} kcal
                                                </div>
                                            </div>

                                            {/* CONTENT */}
                                            <div style={{ padding: '16px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                                                    <div>
                                                        <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: darkMode ? '#F3F4F6' : '#111827' }}>
                                                            {item.name}
                                                        </h4>
                                                    </div>
                                                    <span style={{
                                                        fontSize: 15,
                                                        fontWeight: 700,
                                                        color: 'var(--color-primary, #10B981)',
                                                        background: 'rgba(16, 185, 129, 0.1)',
                                                        padding: '6px 12px',
                                                        borderRadius: 8
                                                    }}>
                                                        ${(item.price / 100).toFixed(2)}
                                                    </span>
                                                </div>

                                                {item.description && (
                                                    <p style={{
                                                        margin: '0 0 12px',
                                                        fontSize: 13,
                                                        color: darkMode ? '#D1D5DB' : '#6B7280',
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: 'vertical',
                                                        overflow: 'hidden'
                                                    }}>
                                                        {item.description}
                                                    </p>
                                                )}

                                                {/* AVAILABILITY TOGGLE */}
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: `1px solid ${darkMode ? '#374151' : '#E5E7EB'}` }}>
                                                    <span style={{ fontSize: 12, fontWeight: 600, color: darkMode ? '#9CA3AF' : '#6B7280' }}>
                                                        {item.available ? 'In Stock' : 'Out of Stock'}
                                                    </span>
                                                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={item.available}
                                                            onChange={() => handleToggleAvailability(firstCategory, item.id)}
                                                            style={{ display: 'none' }}
                                                        />
                                                        <div style={{
                                                            width: 44,
                                                            height: 24,
                                                            borderRadius: 12,
                                                            background: item.available ? 'var(--color-primary, #10B981)' : (darkMode ? '#4B5563' : '#D1D5DB'),
                                                            position: 'relative',
                                                            transition: 'all 0.2s'
                                                        }}>
                                                            <div style={{
                                                                position: 'absolute',
                                                                top: 2,
                                                                left: item.available ? 22 : 2,
                                                                width: 20,
                                                                height: 20,
                                                                borderRadius: '50%',
                                                                background: 'white',
                                                                transition: 'left 0.2s'
                                                            }} />
                                                        </div>
                                                    </label>
                                                </div>

                                                {/* ACTIONS */}
                                                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                                                    <motion.button
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => handleEdit(firstCategory, item)}
                                                        style={{
                                                            flex: 1,
                                                            padding: '8px 12px',
                                                            borderRadius: 8,
                                                            border: 'none',
                                                            background: 'rgba(16, 185, 129, 0.1)',
                                                            color: 'var(--color-primary, #10B981)',
                                                            fontWeight: 600,
                                                            fontSize: 12,
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <Edit size={14} style={{ display: 'inline', marginRight: 4 }} />
                                                        Edit
                                                    </motion.button>
                                                    <motion.button
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => handleRemoveItem(firstCategory, item)}
                                                        style={{
                                                            flex: 1,
                                                            padding: '8px 12px',
                                                            borderRadius: 8,
                                                            border: 'none',
                                                            background: 'rgba(239, 68, 68, 0.1)',
                                                            color: '#EF4444',
                                                            fontWeight: 600,
                                                            fontSize: 12,
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <Trash2 size={14} style={{ display: 'inline', marginRight: 4 }} />
                                                        Delete
                                                    </motion.button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>

                            {currentCategoryItems.length === 0 && (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '60px 20px',
                                    color: darkMode ? '#9CA3AF' : '#6B7280'
                                }}>
                                    <p style={{ fontSize: 14, fontWeight: 600 }}>No items in this category yet</p>
                                    <button
                                        onClick={() => firstCategory && handleAddItem(firstCategory)}
                                        style={{
                                            marginTop: 16,
                                            padding: '10px 20px',
                                            borderRadius: 8,
                                            border: 'none',
                                            background: 'var(--color-primary, #10B981)',
                                            color: 'white',
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Add First Item
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}

                {viewTab === 'inventory' && (
                    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading...</div>}>
                        <MenuInventoryView lang={lang} />
                    </Suspense>
                )}
            </div>

            {/* MODALS & INPUTS */}
            <ItemEditorModal
                editingItem={editingItem}
                editForm={editForm}
                setEditForm={setEditForm}
                onClose={() => {
                    setEditingItem(null)
                    setUploadStatus(null)
                }}
                onImageClick={() => {
                    if (editingItem?.categoryId) {
                        activeCategoryItemRef.current = { categoryId: editingItem.categoryId, itemId: editingItem.itemId }
                    } else if (editingItem?.isFeaturedSlot) {
                        activeFeaturedSlotRef.current = editingItem.index
                    }
                    fileInputRef.current?.click()
                }}
                uploadStatus={uploadStatus}
                isUploading={isUploading}
                fileInputRef={fileInputRef}
                activeFeaturedSlotRef={activeFeaturedSlotRef}
                activeCategoryItemRef={activeCategoryItemRef}
                onSave={handleSave}
                t={t}
            />

            <input
                key={inputKey}
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
            />

            <BackendNav role={demoMode ? 'demo' : 'owner'} useRoutes={true} />

            {/* TOAST MESSAGES */}
            {saveStatus && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    style={{
                        position: 'fixed',
                        bottom: 24,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: saveStatus.error ? '#EF4444' : '#22C55E',
                        color: 'white',
                        padding: '12px 24px',
                        borderRadius: 50,
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                        fontWeight: 600,
                        fontSize: 14,
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                    }}
                >
                    <span>{saveStatus.error ? '⚠️' : '✓'}</span>
                    {saveStatus.message}
                </motion.div>
            )}

            {/* FLOATING SAVE BAR */}
            {hasChanges && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    style={{
                        position: 'fixed',
                        bottom: 95,
                        left: 12,
                        right: 12,
                        background: darkMode ? '#1F2937' : '#1E293B',
                        color: 'white',
                        padding: '14px 20px',
                        borderRadius: 16,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.6)',
                        zIndex: 10000,
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                >
                    <div style={{ fontSize: 13, fontWeight: 600 }}>⚠️ Unsaved changes</div>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handlePlatformSave}
                        disabled={isSaving}
                        style={{
                            background: 'var(--color-primary, #10B981)',
                            color: 'white',
                            border: 'none',
                            padding: '10px 24px',
                            borderRadius: 12,
                            fontWeight: 800,
                            fontSize: 14,
                            cursor: isSaving ? 'not-allowed' : 'pointer',
                            opacity: isSaving ? 0.6 : 1
                        }}
                    >
                        {isSaving ? 'SAVING...' : 'SAVE'}
                    </motion.button>
                </motion.div>
            )}
        </div>
    )
}

export default MenuManager
