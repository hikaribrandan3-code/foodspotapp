import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, Link, useLocation, useParams } from 'react-router-dom'
import { supabase, updateBranding, getMenuCloud, updateMenuItemCloud, uploadAsset } from '../../lib/supabaseClient.js'
import { getAuth, clearAuth } from '../../utils/storage.js'
import { formatPrice } from '../../config/menuData.js'
import { updateConfig } from '../../config/appConfig.v2.js'
import { processAndStoreImage, formatFileSize } from '../../utils/imageOptimizer.js'
import { canChangeDeliveryConfig, recordDeliveryConfigChange } from '../../utils/deliveryUtils.js'
import { useAdminIntent } from '../../contexts/AdminIntentContext.jsx'
import { useTenant } from '../../contexts/TenantContext.jsx'
import BackendHeader from '../../components/BackendHeader.jsx'
import BackendNav from '../../components/BackendNav.jsx'
import { DIVIDER_PRESETS } from '../../config/dividerPresets.js'

import DesignWorkspace from '../../components/editor/DesignWorkspace.jsx'
import './MenuStyles.css'

/**
 * MENU MANAGER
 * 
 * ARCHITECTURAL INVARIANT: Config MUST come from props, NOT getConfig().
 * This ensures Single Source of Truth from App.jsx.
 */

// 🛡️ SANITIZER: Purges dead blob URLs that cause WebKit crashes
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
    const { tenantSlug } = useParams() // 🏢 Get tenant from URL for logout redirect
    const { isSimulated, impersonatingBusinessId } = useAdminIntent()

    // 🛡️ REFACTOR: Use TenantContext as Source of Truth (replaces broken getAuth() from storage)
    const { businessId: tenantBusinessId, tenantData, isLoaded: tenantLoaded, refreshTenantData } = useTenant()
    // 🛡️ RESOLVED ID: Handles Simulation + Fallback for Dev
    const targetBusinessId = (isSimulated ? impersonatingBusinessId : tenantBusinessId) || '00470a1a-f5c4-4fb8-a4a5-2ab0d8d758fd'

    // 🛡️ STATE LOCK (Anti-Gravity V3.0 - Amnesia Killer)
    // Menu state is initialized as EMPTY STRUCTURE to prevent null-pointer crashes.
    // It will be populated by cloud data when tenantData arrives.
    const [menu, setMenu] = useState({ categories: [] })
    const [localConfig, setLocalConfig] = useState(config) // Local copy for mutations

    // 🔒 HYDRATION LOCK: Prevents sync until cloud data is loaded
    const isHydratedRef = useRef(false)
    // 🛡️ ANTI-BOUNCE: Blocks hydration if we just saved (Replica Lag Guard)
    const ignoreCloudUpdateRef = useRef(false)

    // SYNC: Update menu when tenantData loads from cloud (Gatekeeper Bypass)
    useEffect(() => {
        if (tenantLoaded) {
            // 🛡️ ANTI-BOUNCE GUARD: If we just saved, TRUST LOCAL STATE
            if (ignoreCloudUpdateRef.current) {
                console.log('[MenuManager] 🛡️ IGNORING STALE CLOUD DATA (Anti-Bounce Active)')
                ignoreCloudUpdateRef.current = false
                return
            }

            // 🛡️ DATA INTEGRITY: Hard-Check for menu_data
            if (tenantData?.menu_data && tenantData.menu_data.categories?.length > 0) {
                console.log('[MenuManager] 🎯 HYDRATING FROM CLOUD:', tenantData.menu_data)

                // 🛡️ SANITIZE FIRST: Remove dead blobs
                const cleanMenu = sanitizeMenu(tenantData.menu_data)

                // 🛡️ BOUNCER GUARD: Sanitize items to ensure they are arrays
                const sanitizedCategories = cleanMenu.categories.map(cat => ({
                    ...cat,
                    items: Array.isArray(cat.items) ? cat.items : []
                }))
                setMenu({ categories: sanitizedCategories })
            } else {
                console.log('[MenuManager] 🌱 NO CLOUD DATA: Seeding Default Menu')
                setMenu({
                    categories: [
                        // 1. BAKERY (6 Items)
                        {
                            id: 'cat-bakery', name: 'Bakery & Patisserie', icon: '🥐', enabled: true,
                            items: [
                                { id: 'item-bak-1', name: 'Panes Rústicos', price: 4500, image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&q=80', available: true },
                                { id: 'item-bak-2', name: 'Croissants', price: 3200, image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500&q=80', available: true },
                                { id: 'item-bak-3', name: 'Masa Madre', price: 5600, image: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=500&q=80', available: true },
                                { id: 'item-bak-4', name: 'Pastelería Fina', price: 7800, image: 'https://images.unsplash.com/photo-1579306194872-64d3b7bac4c2?w=500&q=80', available: true },
                                { id: 'item-bak-5', name: 'Sourdough Loaf', price: 4200, image: 'https://images.unsplash.com/photo-1585478402481-4552700bc50e?w=500&q=80', available: true },
                                { id: 'item-bak-6', name: 'Almond Croissant', price: 3800, image: 'https://images.unsplash.com/photo-1550617931-e17a7b70dce2?w=500&q=80', available: true }
                            ]
                        },
                        // 2. CAFE (6 Items)
                        {
                            id: 'cat-cafe', name: 'Specialty Coffee', icon: '☕', enabled: true,
                            items: [
                                { id: 'item-cafe-1', name: 'Granos Tostados', price: 12000, image: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=500&q=80', available: true },
                                { id: 'item-cafe-2', name: 'Latte Art', price: 4200, image: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=500&q=80', available: true },
                                { id: 'item-cafe-3', name: 'Espresso Bar', price: 2800, image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500&q=80', available: true },
                                { id: 'item-cafe-4', name: 'Pour Over', price: 3500, image: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=500&q=80', available: true },
                                { id: 'item-cafe-5', name: 'Flat White', price: 3900, image: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=500&q=80', available: true },
                                { id: 'item-cafe-6', name: 'Caramel Macchiato', price: 4500, image: 'https://images.unsplash.com/photo-1485808191679-5f8c7c860695?w=500&q=80', available: true }
                            ]
                        },
                        // 3. CANDY (6 Items)
                        {
                            id: 'cat-candy', name: 'Candy & Sweets', icon: '🍬', enabled: true,
                            items: [
                                { id: 'item-candy-1', name: 'Golosinas Coloridas', price: 1500, image: 'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=500&q=80', available: true },
                                { id: 'item-candy-2', name: 'Chocolates Finos', price: 6500, image: 'https://images.unsplash.com/photo-1548907040-4baa42d10919?w=500&q=80', available: true },
                                { id: 'item-candy-3', name: 'Macarons Box', price: 8200, image: 'https://images.unsplash.com/photo-1569864358642-9d1684040f43?w=500&q=80', available: true },
                                { id: 'item-candy-4', name: 'Donuts Glaseadas', price: 2100, image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=500&q=80', available: true },
                                { id: 'item-candy-5', name: 'Artisanal Truffles', price: 5400, image: 'https://images.unsplash.com/photo-1621939514649-28b12e81658b?w=500&q=80', available: true },
                                { id: 'item-candy-6', name: 'Sea Salt Caramels', price: 4200, image: 'https://images.unsplash.com/photo-1533221946892-5ebcdfd0495f?w=500&q=80', available: true }
                            ]
                        },
                        // 4. BUILDING (6 Items)
                        {
                            id: 'cat-building', name: 'Architecture & Spaces', icon: '🏛️', enabled: true,
                            items: [
                                { id: 'item-bldg-1', name: 'Fachada Clásica', price: 0, image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&q=80', available: true },
                                { id: 'item-bldg-2', name: 'Moderno Iluminado', price: 0, image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=500&q=80', available: true },
                                { id: 'item-bldg-3', name: 'Interior Acogedor', price: 0, image: 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=500&q=80', available: true },
                                { id: 'item-bldg-4', name: 'Patio Urbano', price: 0, image: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=500&q=80', available: true },
                                { id: 'item-bldg-5', name: 'Industrial Vibes', price: 0, image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=500&q=80', available: true },
                                { id: 'item-bldg-6', name: 'Modern Pavilion', price: 0, image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=500&q=80', available: true },
                            ]
                        },
                        // 5. NIGHTLIFE (6 Items)
                        {
                            id: 'cat-nightlife', name: 'The Vault (Nightlife)', icon: '🍾', enabled: true,
                            items: [
                                { id: 'item-night-1', name: 'Dom Pérignon Luminous', price: 350000, image: 'https://images.unsplash.com/photo-1598155523122-38423bb4d6c1?w=500&q=80', available: true },
                                { id: 'item-night-2', name: 'Grey Goose Magnum', price: 180000, image: 'https://images.unsplash.com/photo-1606836521683-16781be599ab?w=500&q=80', available: true },
                                { id: 'item-night-3', name: 'Macallan 18 Years', price: 420000, image: 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=500&q=80', available: true },
                                { id: 'item-night-4', name: 'Signature Cocktail', price: 12000, image: 'https://images.unsplash.com/photo-1514362545857-3bc16549766b?w=500&q=80', available: true },
                                { id: 'item-night-5', name: 'VIP Table Service', price: 500000, image: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=500&q=80', available: true },
                                { id: 'item-night-6', name: 'Champagne Parade', price: 850000, image: 'https://images.unsplash.com/photo-1594968155453-cae85b9b4781?w=500&q=80', available: true }
                            ]
                        },
                        // 6. EVENT PLANNING (6 Items)
                        {
                            id: 'cat-events', name: 'Catering & Packs', icon: '🎉', enabled: true,
                            items: [
                                { id: 'item-evt-1', name: 'Party Slider Box (24)', price: 45000, image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&q=80', available: true },
                                { id: 'item-evt-2', name: '50-Wing Platter', price: 38000, image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=500&q=80', available: true },
                                { id: 'item-evt-3', name: 'Office Lunch Bundle', price: 58000, image: 'https://images.unsplash.com/photo-1555244162-803834f70033?w=500&q=80', available: true },
                                { id: 'item-evt-4', name: 'Wedding Station', price: 150000, image: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=500&q=80', available: true },
                                { id: 'item-evt-5', name: 'Continental Breakfast', price: 42000, image: 'https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?w=500&q=80', available: true },
                                { id: 'item-evt-6', name: 'Birthday Cake XL', price: 32000, image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&q=80', available: true }
                            ]
                        },
                        // 7. STREET FOOD (6 Items)
                        {
                            id: 'cat-street', name: 'Truck Exclusives', icon: '🚚', enabled: true,
                            items: [
                                { id: 'item-str-1', name: 'Choripán Premium', price: 6500, image: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=500&q=80', available: true },
                                { id: 'item-str-2', name: 'Loaded Kimchi Fries', price: 8200, image: 'https://images.unsplash.com/photo-1573080496982-b73a83e91b9f?w=500&q=80', available: true },
                                { id: 'item-str-3', name: 'Birria Tacos (3)', price: 9500, image: 'https://images.unsplash.com/photo-1599321492590-9eb157c83f2e?w=500&q=80', available: true },
                                { id: 'item-str-4', name: 'Gourmet Hot Dog', price: 7200, image: 'https://images.unsplash.com/photo-1627042633145-d766d08912e7?w=500&q=80', available: true },
                                { id: 'item-str-5', name: 'Arepas Rellenas', price: 6800, image: 'https://images.unsplash.com/photo-1565060169194-192770280b0f?w=500&q=80', available: true },
                                { id: 'item-str-6', name: 'Mexican Elote', price: 3500, image: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=500&q=80', available: true }
                            ]
                        },
                        // 8. FINE DINING (6 Items)
                        {
                            id: 'cat-finedining', name: 'The Fancy Touch', icon: '🍽️', enabled: true,
                            items: [
                                { id: 'item-fine-1', name: 'Chef\'s 7-Course', price: 95000, image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=500&q=80', available: true },
                                { id: 'item-fine-2', name: 'Wine Pairing Flight', price: 42000, image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=500&q=80', available: true },
                                { id: 'item-fine-3', name: 'Truffle Exploration', price: 78000, image: 'https://images.unsplash.com/photo-1481931098730-318b6f776db0?w=500&q=80', available: true },
                                { id: 'item-fine-4', name: 'Wagyu A5 Steak', price: 120000, image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&q=80', available: true },
                                { id: 'item-fine-5', name: 'Lobster Thermidor', price: 88000, image: 'https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?w=500&q=80', available: true },
                                { id: 'item-fine-6', name: 'Royal Caviar', price: 150000, image: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=500&q=80', available: true }
                            ]
                        }
                    ]
                })
            }

            // 🔓 UNLOCK: Cloud data received, syncing is now safe
            isHydratedRef.current = true
            console.log('[MenuManager] 🔓 HYDRATION COMPLETE: Sync now allowed')
        }
    }, [tenantLoaded, tenantData])

    // 🛡️ UNIVERSAL SYNC: Fetch Row-Based Order from SQL (Source of Truth)
    useEffect(() => {
        const fetchSQLMenu = async () => {
            if (targetBusinessId) {
                console.log('[MenuManager] 🦅 FEEDING THE EAGLE: Fetching SQL Menu Order...')
                const { data, error } = await getMenuCloud(targetBusinessId)
                if (data && !error) {
                    console.log('[MenuManager] 🦅 EAGLE LANDED: SQL Menu Loaded', data)
                    setMenu(data)
                }
            }
        }
        if (tenantLoaded) fetchSQLMenu()
    }, [tenantLoaded, targetBusinessId])

    // 🛡️ THE AMNESIA KILLER: Only hydrate local state if Cloud data is richer than local state
    useEffect(() => {
        if (tenantLoaded && tenantData?.app_config) {
            setLocalConfig(prev => {
                const cloudPhotos = tenantData.app_config.featuredPhotos || []
                // Preserve local if cloud is empty but we have data locally
                if (cloudPhotos.length === 0 && prev.featuredPhotos?.length > 0) return prev

                return {
                    ...prev,
                    ...tenantData.app_config,
                    // 🆕 HYDRATE SERVICE MODES
                    service_modes: tenantData.service_modes || { dineIn: true, dineInPayment: 'before', delivery: true }
                }
            })
        }
    }, [tenantLoaded, tenantData?.app_config, tenantData?.service_modes])

    // 🛡️ ANTI-RECURSION GUARD: Only sync prop to state on actual identity change
    // Prevents "Hurricane" re-renders caused by object reference changes
    useEffect(() => {
        // 🛡️ STRICT PRIMITIVE COMPARISON: Only reset if the ID string actually changes
        const incomingId = config?.businessId || tenantBusinessId
        const localId = localConfig?.businessId

        if (incomingId && localId && String(incomingId) !== String(localId)) {
            console.log('[MenuManager] 🛡️ Cross-Tenant Move: Re-hydrating')
            setLocalConfig(config)
        }
    }, [config?.businessId])

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
    // 🛡️ SESSION-PERSISTENT DIRTY STATE: Survives tab switches
    const [hasChanges, setHasChanges] = useState(
        () => sessionStorage.getItem(`dirty_${targetBusinessId}`) === 'true'
    )
    const [isSaving, setIsSaving] = useState(false)
    const [stagedChanges, setStagedChanges] = useState({})
    const [isBatchSaving, setIsBatchSaving] = useState(false)
    // 📦 PENDING FILE BUFFER: Holds raw File objects until save
    const [pendingFiles, setPendingFiles] = useState({})

    // 💾 Persist dirty state to sessionStorage
    useEffect(() => {
        sessionStorage.setItem(`dirty_${targetBusinessId}`, hasChanges)
    }, [hasChanges, targetBusinessId])
    const fileInputRef = useRef(null)

    const [inputKey, setInputKey] = useState(0)

    // Category creation/editing
    const [showAddCategory, setShowAddCategory] = useState(false)
    const [newCategoryName, setNewCategoryName] = useState('')
    const [newCategoryIcon, setNewCategoryIcon] = useState('📦')
    const [editingCategory, setEditingCategory] = useState(null)

    // Operational controls
    const [pauseMessage, setPauseMessage] = useState(config?.pauseOrdersMessage || '')
    const [showEditor, setShowEditor] = useState(false)

    // 🚀 SILO-AWARE LOGOUT
    const handleLogout = async () => {
        await supabase.auth.signOut()
        clearAuth()
        window.location.href = demoMode ? '/' : `/${tenantSlug}`
    }

    // --- 🛡️ SAFE-SYNC: Sync Logic (Final Boss Fix) ---


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

        console.log('☁️ Syncing Menu to Supabase (JSONB Strict)... Target:', targetBusinessId)

        // ⚡ STRICT UPDATE: Partial update to avoid wiping other fields
        const { error } = await supabase
            .from('branding')
            .update({
                menu_data: updatedMenu,
                updated_at: new Date()
            })
            .eq('business_id', targetBusinessId) // 🛡️ GLOBAL PLATFORM STANDARD

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
        // 🛡️ NO BANDAIDS: Dynamic ID mapping
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

    // ⚡ THE IMAGE PROCESSOR: Upload from Pending Buffer (Raw File)
    const processMenuImages = async (currentMenu, fileBuffer) => {
        const updatedMenu = JSON.parse(JSON.stringify(currentMenu))

        // 🛡️ REFACTOR: Use explicit indexing to guarantee mutation
        if (updatedMenu.categories) {
            for (let c = 0; c < updatedMenu.categories.length; c++) {
                const cat = updatedMenu.categories[c]
                if (cat.items) {
                    for (let i = 0; i < cat.items.length; i++) {
                        const item = cat.items[i]
                        const fileToUpload = fileBuffer[item.id]

                        // 🔍 DEBUG: Check if we have a file for this item
                        if (fileBuffer[item.id]) {
                            console.log(`[ImageProcessor] 📸 Found pending file for: ${item.name} (${item.id})`)
                        }

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

                                // ⚡ MUTATION: Explicitly update the object in the array
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

    // 🛡️ THE ADDER (Category): Instant-add with unique ID
    const addCategory = () => {
        const newCat = {
            id: `cat-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            name: 'Nueva Categoría',
            items: [],
            icon: '',
            enabled: true
        }
        setMenu(prev => ({ ...prev, categories: [...prev.categories, newCat] }))
        setHasChanges(true)
    }

    // 🗑️ THE DELETER (Category Purge): Removes category from local state
    const handleDeleteCategory = (catId) => {
        if (!confirm('¿Eliminar categoría y todos sus ítems?')) return
        setMenu(prev => ({ ...prev, categories: prev.categories.filter(c => c.id !== catId) }))
        setHasChanges(true)
    }

    // 💾 THE ATOMIC SAVE (BATCH EDITION) - Strike 7
    const handlePlatformSave = async () => {
        if (Object.keys(stagedChanges).length === 0 && !hasChanges) {
            alert('No hay cambios pendientes.')
            return
        }

        setIsBatchSaving(true)
        console.log('💾 BATCH SAVE INITIATED:', targetBusinessId)

        try {
            // 0. PREPARE PAYLOAD
            // Deep clone menu to strictly avoid mutating state during async
            const menuToSave = JSON.parse(JSON.stringify(menu))

            // 1. BATCH IMAGE PROCESSING
            const stagedKeys = Object.keys(stagedChanges)
            if (stagedKeys.length > 0) {
                console.log(`🚀 BATCH: Processing images for ${stagedKeys.length} items...`)

                await Promise.all(stagedKeys.map(async (itemId) => {
                    const changes = stagedChanges[itemId]

                    // Only process files. Metadata is already in menuToSave (Optimistic UI)
                    if (changes.file) {
                        const { url, error } = await uploadAsset(changes.file, targetBusinessId, 'menu-images')
                        if (error) {
                            console.error(`❌ Upload failed for ${itemId}`, error)
                        } else {
                            // 💉 INJECT: Update the clone with the real cloud URL
                            // We must find the item in the cloned structure
                            let found = false
                            for (const cat of menuToSave.categories) {
                                const item = cat.items.find(i => i.id === itemId)
                                if (item) {
                                    item.image = url
                                    found = true
                                    break
                                }
                            }
                            if (found) console.log(`📸 Image Updated in Payload: ${itemId} -> ${url}`)
                        }
                    }
                }))
            }

            // 2. SYNC BRANDING (App Config)
            const { error: brandingError } = await supabase
                .from('branding')
                .update({
                    is_paused: localConfig.pauseOrders,
                    delivery_radius: localConfig.delivery?.radiusKm,
                    delivery_fee: localConfig.delivery?.flatFee,
                    free_delivery_threshold: localConfig.delivery?.freeDeliveryThreshold,
                    app_config: localConfig,
                    service_modes: localConfig.service_modes,
                    design_state: localConfig.design_state || {},
                    last_printed_at: localConfig.lastPrintedAt || null,
                    updated_at: new Date()
                })
                .eq('business_id', targetBusinessId)

            if (brandingError) throw brandingError

            // 3. UNIVERSAL SYNC: SQL TABLES (The Source of Truth)
            // We verify and construct the payload from menuToSave
            const categoriesPayload = menuToSave.categories.map((cat, index) => ({
                id: cat.id,
                business_id: targetBusinessId,
                name: cat.name,
                icon: cat.icon || '',
                sort_order: index,
                enabled: cat.enabled
            }))

            const itemsPayload = []
            menuToSave.categories.forEach((cat, catIndex) => {
                if (cat.items) {
                    cat.items.forEach((item, itemIndex) => {
                        itemsPayload.push({
                            id: item.id,
                            business_id: targetBusinessId,
                            category_id: cat.id,
                            name: item.name,
                            price: item.price,
                            image_url: item.image, // URL is now clean (no blobs)
                            available: item.available,
                            featured: item.featured,
                            sort_order: itemIndex,
                            description: item.description
                        })
                    })
                }
            })

            // BATCH UPSERT
            const { error: catError } = await supabase
                .from('categories')
                .upsert(categoriesPayload, { onConflict: 'id' })

            if (catError) console.error('❌ SQL Category Sync Error:', catError)

            const { error: itemsError } = await supabase
                .from('menu_items')
                .upsert(itemsPayload, { onConflict: 'id' })

            if (itemsError) throw itemsError

            console.log('✅ UNIVERSAL SYNC COMPLETE')

            // 4. FINALIZE
            setMenu(menuToSave) // Update local state with the resolved URLs
            setStagedChanges({})
            setHasChanges(false)
            sessionStorage.removeItem(`dirty_${targetBusinessId}`)

            // 5. RE-HYDRATE
            ignoreCloudUpdateRef.current = false
            await refreshTenantData()

            setSaveStatus({ message: '✓ Menú Publicado con Éxito' })
            setTimeout(() => setSaveStatus(null), 3000)

        } catch (error) {
            console.error('❌ BATCH SAVE ERROR:', error)
            alert('Error guardando cambios: ' + error.message)
        } finally {
            setIsBatchSaving(false)
        }
    }

    // --- 🛠️ PURE STATE HELPER: Generate IDs ---
    const generateId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const handleEdit = (categoryId, item) => {
        setEditingItem({ categoryId, itemId: item.id })
        setEditForm({ name: item.name, price: item.price.toString(), image: item.image || null })
        setUploadStatus(null)
    }

    const handleBoxTap = (categoryId, item) => {
        handleEdit(categoryId, item)
        // 🛡️ FIX: Always trigger file input (allows re-upload of existing images)
        activeCategoryItemRef.current = { categoryId, itemId: item.id }
        fileInputRef.current?.click()
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
            // 🛡️ FIX: Sync Modal with Optimistic Image
            setEditForm(prev => ({ ...prev, image: previewUrl }))
        } else if (targetItem) {
            // 📦 BUFFER: Store raw file for later upload
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
                        ...(currentFeatured[targetSlot] || { name: 'Destacado', price: 0 }), // Preserve edit
                        image: result.publicUrl
                    }
                    const newConfig = { ...prevConfig, featuredPhotos: currentFeatured }
                    updateConfig(newConfig)
                    window.dispatchEvent(new CustomEvent('frontendSync'))
                    setHasChanges(true)
                    return newConfig
                })
                // 🛡️ FIX: Sync Modal with Final URL
                setEditForm(prev => ({ ...prev, image: result.publicUrl }))
                setUploadStatus({ success: true, message: '✔ Guardado' })
            } else if (targetItem) {
                const finalMenu = await new Promise(resolve => {
                    setMenu(prevMenu => {
                        const newMenu = { ...prevMenu }
                        const cat = newMenu.categories.find(c => c.id === targetItem.categoryId)
                        const item = cat?.items.find(i => i.id === targetItem.itemId)
                        if (item) item.image = previewUrl
                        resolve(newMenu)
                        return newMenu
                    })
                })

                // 📦 STAGE CHANGE: Queue file for batch upload
                setStagedChanges(prev => ({
                    ...prev,
                    [targetItem.itemId]: {
                        ...prev[targetItem.itemId],
                        file: file
                    }
                }))

                setHasChanges(true)
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
            setHasChanges(true)

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
                // 📦 STAGE CHANGE: Queue metadata updates
                setStagedChanges(prev => ({
                    ...prev,
                    [item.id]: {
                        ...prev[item.id],
                        name: editForm.name,
                        price: parseInt(editForm.price) || item.price,
                        // If image was changed via preview URL in form, we assume it's already staged via handleImageUpload
                    }
                }))

                setMenu(updatedMenu)
                setHasChanges(true)
                setSaveStatus({ message: 'Cambio estagedo (Guardar para aplicar)' })
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
                item.available = !item.available

                // 📦 STAGE CHANGE
                setStagedChanges(prev => ({
                    ...prev,
                    [itemId]: { ...prev[itemId], available: item.available }
                }))

                setMenu(updatedMenu)
                setHasChanges(true)
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
        setHasChanges(true)
    }

    const handleToggleCategory = (categoryId) => {
        const updatedMenu = { ...menu }
        const category = updatedMenu.categories.find(c => c.id === categoryId)
        if (category) {
            category.enabled = category.enabled === undefined ? true : !category.enabled
            setMenu(updatedMenu)
            setHasChanges(true)
        }
    }

    const handleRenameCategory = (categoryId) => {
        if (editingCategory && editingCategory.name.trim()) {
            const updatedMenu = { ...menu }
            const category = updatedMenu.categories.find(c => c.id === categoryId)
            if (category) {
                category.name = editingCategory.name.trim()
                setMenu(updatedMenu)
                setHasChanges(true)
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
                item.price = price
                setMenu(updatedMenu)

                // 📦 STAGE CHANGE
                setStagedChanges(prev => ({
                    ...prev,
                    [itemId]: { ...prev[itemId], price }
                }))

                setHasChanges(true)
                setSaveStatus({ message: 'Precio estagedo' })
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
                item.name = newName
                setMenu(updatedMenu)

                // 📦 STAGE CHANGE
                setStagedChanges(prev => ({
                    ...prev,
                    [itemId]: { ...prev[itemId], name: newName }
                }))

                setHasChanges(true)
                setSaveStatus({ message: 'Nombre estagedo' })
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
                name: 'Nuevo ítem',
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

    // --- FEATURED ITEMS LOGIC ---
    // 🛡️ DEFAULT TO 4 SLOTS: Ensure UI is always clickable even if cloud array is empty/null
    // MEMOIZED: Prevent heavy array ops on every render
    const activeFeaturedItems = React.useMemo(() => {
        const photos = localConfig?.featuredPhotos || []
        const slots = [...photos]
        while (slots.length < 4) slots.push(null)
        return slots.slice(0, 4)
    }, [localConfig?.featuredPhotos])
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
        setHasChanges(true)
    }

    // --- DIRECT INLINE FEATURED UPDATE ---
    const handleFeaturedUpdate = (index, field, value) => {
        const newFeatured = [...(localConfig.featuredPhotos || [])]
        // Ensure array is padded if we are editing a slot that doesn't exist yet in the config
        while (newFeatured.length <= index) newFeatured.push(null)

        newFeatured[index] = {
            ...(newFeatured[index] || { name: 'Destacado', price: 0, image: null }),
            [field]: value
        }

        const newConfig = { ...localConfig, featuredPhotos: newFeatured }
        // ⚡ INSTANT UPDATE
        updateConfig(newConfig)
        setLocalConfig(newConfig)
        window.dispatchEvent(new CustomEvent('frontendSync'))
        setHasChanges(true)
    }

    // --- DIRECT FEATURED UPLOAD LOGIC ---
    const handleFeaturedTap = (index) => {
        const slot = activeFeaturedItems[index] || { name: '', price: 0, image: null }
        console.log('🎯 EXPLICIT TRIGGER: Opening Highlight Slot', index)

        // 1. Set context for the upload
        setEditingItem({ isFeaturedSlot: true, index })

        // 2. 🛡️ BYPASS MODAL: Trigger File Input directly (Click-to-Upload)
        // This matches the behavior of regular menu items
        activeFeaturedSlotRef.current = index
        fileInputRef.current?.click()
    }

    // 🖨️ PRINT MENU LOGIC
    const DISCORD_WEBHOOK_URL = import.meta.env.VITE_DISCORD_WEBHOOK_URL || 'https://discord.com/api/webhooks/1344449833215889418/aCszT58g7hH9M1k0Q8Q9j7Z-Z5r4Y6k1t5M9j7Z-Z5r4Y6k1t5M9j7Z-Z5r4Y6k1t5M9'

    const handlePrintMenu = async () => {
        window.print()

        try {
            await fetch(DISCORD_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: `🖨️ **Menú Impreso**\nNegocio: \`${tenantData?.business_name || 'Desconocido'}\`\nID: \`${targetBusinessId}\`\nFecha: ${new Date().toLocaleString('es-AR')}`
                })
            })
        } catch (e) {
            console.error('Discord Webhook Failed', e)
        }

        const newConfig = { ...localConfig, lastPrintedAt: new Date().toISOString() }
        setLocalConfig(newConfig)
        updateConfig(newConfig)
        window.dispatchEvent(new CustomEvent('frontendSync'))
        setHasChanges(true)
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
        <>
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
                                        checked={localConfig.pauseOrders}
                                        onChange={(e) => {
                                            const newPauseState = e.target.checked
                                            setLocalConfig(prev => ({ ...prev, pauseOrders: newPauseState }))
                                            setHasChanges(true)
                                        }}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                            {/* Pause Message */}
                            {localConfig.pauseOrders && (
                                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
                                    <label style={{ fontSize: 12, color: '#64748B', display: 'block', marginBottom: 6 }}>Mensaje para clientes</label>
                                    <input
                                        type="text"
                                        value={pauseMessage}
                                        onChange={(e) => {
                                            setPauseMessage(e.target.value)
                                            setHasChanges(true)
                                        }}
                                        onBlur={() => {
                                            setLocalConfig(prev => ({ ...prev, pauseOrdersMessage: pauseMessage }))
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

                        {/* ==================== FOODSPOT EDITOR ==================== */}
                        <div style={{ background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)', borderRadius: 14, padding: 20, marginBottom: 12, border: '1px solid #334155' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                        <span style={{ fontSize: 18 }}>{'🎨'}</span>
                                        <p style={{ fontWeight: 700, fontSize: 15, color: '#FFFFFF', margin: 0 }}>FoodSpot Editor</p>
                                    </div>
                                    <p style={{ fontSize: 12, color: '#94A3B8', margin: 0, maxWidth: '260px', lineHeight: 1.4 }}>
                                        {'Diseñá tu menú con temas, colores, y tipografías. Exportá en PDF A4 profesional.'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowEditor(true)}
                                    style={{
                                        background: '#3B82F6', color: 'white', border: 'none',
                                        padding: '10px 20px', borderRadius: 10, fontWeight: 700,
                                        fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                                        whiteSpace: 'nowrap', boxShadow: '0 4px 14px rgba(59, 130, 246, 0.3)',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    Abrir Editor
                                </button>
                            </div>

                            {/* Version Sync Warning */}
                            {(hasChanges || (localConfig.lastPrintedAt && tenantData?.updated_at && new Date(tenantData.updated_at) > new Date(localConfig.lastPrintedAt))) && (
                                <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 8, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                    <span style={{ fontSize: 14 }}>{'⚠️'}</span>
                                    <p style={{ margin: 0, fontSize: 11, color: '#FCA5A5', lineHeight: 1.4 }}>
                                        {hasChanges
                                            ? 'Cambios sin guardar. Guardá antes de imprimir.'
                                            : 'El menú digital fue modificado. Volvé a imprimir.'}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* OPERATIONAL COMMAND CENTER (Strike 9) */}
                        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E2E8F0', padding: 16, marginBottom: 12 }}>
                            <p style={{ fontWeight: 600, fontSize: 14, color: '#1E293B', margin: '0 0 12px' }}>⚙️ Configuración de Operación</p>

                            {/* Dine-In Toggle */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <div>
                                    <p style={{ fontWeight: 500, fontSize: 14, color: '#334155', margin: 0 }}>🍽️ Comer en Local</p>
                                    <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>Habilita mesas y mozos</p>
                                </div>
                                <label className="toggle">
                                    <input
                                        type="checkbox"
                                        checked={localConfig.service_modes?.dineIn ?? true}
                                        onChange={(e) => {
                                            const val = e.target.checked
                                            setLocalConfig(prev => ({
                                                ...prev, service_modes: { ...prev.service_modes, dineIn: val }
                                            }))
                                            setHasChanges(true)
                                        }}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>

                            {/* Dine-In Payment Logic (Conditional) */}
                            {(localConfig.service_modes?.dineIn ?? true) && (
                                <div style={{ background: '#F8FAFC', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                                    <label style={{ fontSize: 12, color: '#64748B', display: 'block', marginBottom: 6 }}>Momento de Pago</label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button
                                            onClick={() => {
                                                setLocalConfig(prev => ({
                                                    ...prev, service_modes: { ...prev.service_modes, dineInPayment: 'before' }
                                                }))
                                                setHasChanges(true)
                                            }}
                                            style={{
                                                flex: 1, padding: '8px', borderRadius: 6, fontSize: 13, border: '1px solid', cursor: 'pointer',
                                                borderColor: localConfig.service_modes?.dineInPayment === 'before' ? '#3B82F6' : '#E2E8F0',
                                                background: localConfig.service_modes?.dineInPayment === 'before' ? '#EFF6FF' : 'white',
                                                color: localConfig.service_modes?.dineInPayment === 'before' ? '#1D4ED8' : '#64748B'
                                            }}
                                        >
                                            Antes de comer
                                        </button>
                                        <button
                                            onClick={() => {
                                                setLocalConfig(prev => ({
                                                    ...prev, service_modes: { ...prev.service_modes, dineInPayment: 'after' }
                                                }))
                                                setHasChanges(true)
                                            }}
                                            style={{
                                                flex: 1, padding: '8px', borderRadius: 6, fontSize: 13, border: '1px solid', cursor: 'pointer',
                                                borderColor: localConfig.service_modes?.dineInPayment === 'after' ? '#3B82F6' : '#E2E8F0',
                                                background: localConfig.service_modes?.dineInPayment === 'after' ? '#EFF6FF' : 'white',
                                                color: localConfig.service_modes?.dineInPayment === 'after' ? '#1D4ED8' : '#64748B'
                                            }}
                                        >
                                            Después (Mesa)
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Delivery Toggle */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <p style={{ fontWeight: 500, fontSize: 14, color: '#334155', margin: 0 }}>🛵 Envíos</p>
                                    <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>Habilita delivery y zonas</p>
                                </div>
                                <label className="toggle">
                                    <input
                                        type="checkbox"
                                        checked={localConfig.service_modes?.delivery ?? true}
                                        onChange={(e) => {
                                            const val = e.target.checked
                                            setLocalConfig(prev => ({
                                                ...prev, service_modes: { ...prev.service_modes, delivery: val }
                                            }))
                                            setHasChanges(true)
                                        }}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                        </div>

                        {/* Delivery Configuration (Conditionally Hidden) */}
                        {
                            (localConfig.service_modes?.delivery ?? true) && (
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
                                                transform: `scale(${localConfig.delivery?.radiusKm || 5})`,
                                                willChange: 'transform',
                                                transition: 'transform 0.1s linear',
                                                pointerEvents: 'none',
                                                boxShadow: '0 0 0 1000px rgba(0,0,0,0.1)'
                                            }} />
                                        </div>

                                        <label style={{ fontSize: 12, color: '#64748B', display: 'block', marginBottom: 4 }}>Radio de entrega: {localConfig.delivery?.radiusKm || 5} km</label>
                                        <input
                                            type="range"
                                            min="1"
                                            max="50"
                                            value={localConfig.delivery?.radiusKm || 5}
                                            onChange={(e) => {
                                                const newValue = parseInt(e.target.value)
                                                const oldValue = localConfig.delivery?.radiusKm || 5
                                                if (newValue !== oldValue) {
                                                    recordDeliveryConfigChange('radiusKm', oldValue, newValue)
                                                }
                                                // Instant Local Update
                                                setLocalConfig(prev => ({
                                                    ...prev,
                                                    delivery: { ...prev.delivery, radiusKm: newValue }
                                                }))
                                                updateConfig({ delivery: { ...localConfig.delivery, radiusKm: newValue } })
                                                window.dispatchEvent(new CustomEvent('frontendSync'))
                                                setHasChanges(true)
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
                                                value={localConfig.delivery?.flatFee === 0 ? '' : localConfig.delivery?.flatFee} // 🛡️ KILL STICKY ZERO
                                                onChange={(e) => {
                                                    const val = e.target.value === '' ? 0 : parseInt(e.target.value)
                                                    setLocalConfig(prev => ({ ...prev, delivery: { ...prev.delivery, flatFee: val } }))
                                                    updateConfig({ delivery: { ...localConfig.delivery, flatFee: val } })
                                                    window.dispatchEvent(new CustomEvent('frontendSync'))
                                                    setHasChanges(true)
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
                                                value={localConfig.delivery?.freeDeliveryThreshold ?? ''}
                                                onChange={(e) => {
                                                    // 🛡️ STICKY ZERO FIX
                                                    const val = e.target.value
                                                    const newValue = val === '' ? 0 : parseInt(val)

                                                    setLocalConfig(prev => ({
                                                        ...prev,
                                                        delivery: { ...prev.delivery, freeDeliveryThreshold: val === '' ? '' : newValue }
                                                    }))

                                                    updateConfig({ delivery: { ...localConfig.delivery, freeDeliveryThreshold: newValue } })
                                                    window.dispatchEvent(new CustomEvent('frontendSync'))
                                                    setHasChanges(true)
                                                }}
                                                placeholder="0"
                                                style={{ width: '100%', padding: '10px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )
                        }
                    </div >

                    {/* ==================== BRIDGED BRANDING SECTION ==================== */}
                    < hr style={{ border: 'none', height: 1, background: '#E2E8F0', margin: '24px 0' }
                    } />
                    < h3 style={{ fontSize: 13, fontWeight: 700, color: '#4B5563', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Estilo de Menú(Píldora)
                    </h3 >
                    <div style={{ background: 'white', padding: '20px', borderRadius: 16, border: '1px solid #E2E8F0', marginBottom: 24 }}>
                        {/* Visual Preset Picker - iPhone Wallpaper Style */}
                        {(() => {
                            // Group presets by category
                            const grouped = DIVIDER_PRESETS.reduce((acc, preset) => {
                                const cat = preset.category || 'Varios'
                                if (!acc[cat]) acc[cat] = []
                                acc[cat].push(preset)
                                return acc
                            }, {})

                            const categories = Object.keys(grouped)

                            return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                    {categories.map(cat => (
                                        <div key={cat}>
                                            <h4 style={{
                                                fontSize: 12, fontWeight: 800, color: '#9CA3AF',
                                                textTransform: 'uppercase', marginBottom: 12,
                                                letterSpacing: '0.05em'
                                            }}>
                                                {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                            </h4>
                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                                                gap: 12
                                            }}>
                                                {grouped[cat].map(preset => {
                                                    const isActive = (localConfig.dividerPresetId || 'coffee-1') === preset.id

                                                    return (
                                                        <div
                                                            key={preset.id}
                                                            onClick={() => {
                                                                const newConfig = { ...localConfig, dividerPresetId: preset.id }
                                                                updateConfig(newConfig)
                                                                setLocalConfig(newConfig)
                                                                window.dispatchEvent(new CustomEvent('frontendSync'))
                                                                setHasChanges(true)
                                                            }}
                                                            style={{
                                                                position: 'relative',
                                                                aspectRatio: '3/1',
                                                                borderRadius: 8,
                                                                overflow: 'hidden',
                                                                cursor: 'pointer',
                                                                border: isActive ? '3px solid #22C55E' : '1px solid #E5E7EB',
                                                                transition: 'all 0.2s ease',
                                                                transform: isActive ? 'scale(1.02)' : 'scale(1)',
                                                                boxShadow: isActive ? '0 4px 12px rgba(34, 197, 94, 0.2)' : 'none'
                                                            }}
                                                        >
                                                            <img
                                                                src={preset.url}
                                                                alt={preset.name}
                                                                loading="lazy"
                                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                            />

                                                            {/* Checkmark Overlay */}
                                                            {isActive && (
                                                                <div style={{
                                                                    position: 'absolute',
                                                                    top: 0, left: 0, right: 0, bottom: 0,
                                                                    background: 'rgba(34, 197, 94, 0.2)',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                                }}>
                                                                    <div style={{
                                                                        background: '#22C55E', color: 'white',
                                                                        borderRadius: '50%', width: 24, height: 24,
                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                        fontSize: 14, boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                                                    }}>
                                                                        ✓
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Hover Label */}
                                                            {!isActive && (
                                                                <div className="hover-label" style={{
                                                                    position: 'absolute', bottom: 0, left: 0, right: 0,
                                                                    background: 'rgba(0,0,0,0.6)', color: 'white',
                                                                    fontSize: 10, padding: '4px', textAlign: 'center',
                                                                    opacity: 0, transition: 'opacity 0.2s'
                                                                }}>
                                                                    {preset.name}
                                                                </div>
                                                            )}
                                                            <style>{`
                                                            div:hover > .hover-label { opacity: 1; }
                                                        `}</style>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        })()}
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
                                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {/* Image Box */}
                                    <div
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
                                            cursor: 'pointer',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                        }}>
                                        {!slot && (
                                            <span style={{ fontSize: 10, color: '#94A3B8', textAlign: 'center', pointerEvents: 'none' }}>Editar</span>
                                        )}
                                    </div>
                                    {/* Meta Data (Below Image) */}
                                    {slot && (
                                        <div style={{ textAlign: 'center' }}>
                                            {/* INLINE NAME INPUT */}
                                            <input
                                                type="text"
                                                defaultValue={slot.name || 'Destacado'}
                                                onBlur={(e) => handleFeaturedUpdate(i, 'name', e.target.value)}
                                                onClick={(e) => e.stopPropagation()} // 🛡️ Prevent Modal Open
                                                style={{
                                                    fontWeight: 600,
                                                    fontSize: 11,
                                                    color: '#1E293B',
                                                    marginBottom: 2,
                                                    width: '100%',
                                                    textAlign: 'center',
                                                    border: 'none',
                                                    background: 'transparent',
                                                    outline: 'none',
                                                    padding: 0
                                                }}
                                            />
                                            {/* INLINE PRICE INPUT */}
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                                <span style={{ fontSize: 11, color: '#22C55E', fontWeight: 700 }}>$</span>
                                                <input
                                                    type="number"
                                                    defaultValue={slot.price || ''}
                                                    onBlur={(e) => handleFeaturedUpdate(i, 'price', parseInt(e.target.value) || 0)}
                                                    onClick={(e) => e.stopPropagation()} // 🛡️ Prevent Modal Open
                                                    placeholder="0"
                                                    style={{
                                                        color: '#22C55E',
                                                        fontWeight: 700,
                                                        fontSize: 12,
                                                        width: 40,
                                                        textAlign: 'center',
                                                        border: 'none',
                                                        background: 'transparent',
                                                        outline: 'none',
                                                        padding: 0
                                                    }}
                                                />
                                            </div>
                                        </div>
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
                    {
                        !showAddCategory ? (
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
                                                    icon: '',
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
                        )
                    }

                    {/* 🛡️ RENDER GUARD: Handle empty/undefined categories gracefully */}
                    {console.log('[MenuManager] 🎨 RENDER CHECK - Menu State:', menu)}
                    {
                        (menu?.categories || []).map(category => {
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
                                                    {/* 🗑️ DELETE CATEGORY BUTTON */}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteCategory(category.id) }}
                                                        title="Eliminar Categoría"
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            padding: 4,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            marginLeft: 4
                                                        }}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <polyline points="3 6 5 6 21 6"></polyline>
                                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                        </svg>
                                                    </button>
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
                                        {(category.items || []).map((item, idx) => (
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
                        })
                    }
                </div >

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
                                                onClick={() => {
                                                    // 🛡️ CLICK-TO-OVERWRITE
                                                    if (editingItem.isFeaturedSlot) {
                                                        activeFeaturedSlotRef.current = editingItem.index
                                                    } else if (editingItem.categoryId) {
                                                        activeCategoryItemRef.current = { categoryId: editingItem.categoryId, itemId: editingItem.itemId }
                                                    }
                                                    fileInputRef.current?.click()
                                                }}
                                                style={{
                                                    width: '100%',
                                                    maxHeight: 120,
                                                    objectFit: 'cover',
                                                    borderRadius: 10,
                                                    cursor: 'pointer' // Hand cursor for interactivity
                                                }}
                                                title="Clic para cambiar imagen"
                                            />
                                        </div>
                                    )}
                                    {/* File Input moved to root */}
                                    <button
                                        className="btn btn-secondary btn-block"
                                        onClick={() => {
                                            if (editingItem.isFeaturedSlot) {
                                                activeFeaturedSlotRef.current = editingItem.index
                                            } else if (editingItem.categoryId) {
                                                activeCategoryItemRef.current = { categoryId: editingItem.categoryId, itemId: editingItem.itemId }
                                            }
                                            fileInputRef.current?.click()
                                        }}
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
                {
                    saveStatus && (
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
                    )
                }

                {/* 💾 FLOATING SAVE BAR (Strike 1) */}
                {/* 🛡️ BATCH LOADER OVERLAY */}
                {
                    isBatchSaving && (
                        <div style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 99999,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            backdropFilter: 'blur(4px)'
                        }}>
                            <div style={{
                                width: 50, height: 50, border: '4px solid rgba(255,255,255,0.3)',
                                borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 1s linear infinite'
                            }} />
                            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                            <h2 style={{ color: 'white', marginTop: 20, fontSize: 18, fontWeight: 600 }}>Publicando Cambios...</h2>
                            <p style={{ color: '#94A3B8', marginTop: 8, fontSize: 14 }}>Sincronizando con la nube...</p>
                        </div>
                    )
                }

                {
                    hasChanges && (
                        <div style={{
                            position: 'fixed', bottom: 95, left: 12, right: 12,
                            background: '#1E293B', color: 'white', padding: '14px 20px',
                            borderRadius: 16, display: 'flex', justifyContent: 'space-between',
                            alignItems: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
                            zIndex: 10000, animation: 'slideUp 0.3s ease-out',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>⚠️ Cambios sin guardar</div>
                            <button
                                onClick={handlePlatformSave}
                                disabled={isBatchSaving}
                                style={{
                                    background: '#3B82F6', color: 'white', border: 'none',
                                    padding: '10px 24px', borderRadius: 12, fontWeight: 800,
                                    fontSize: 14, cursor: 'pointer', opacity: isBatchSaving ? 0.5 : 1
                                }}
                            >
                                {isBatchSaving ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
                            </button>
                        </div>
                    )
                }
            </div >

            {/* ==================== FOODSPOT EDITOR OVERLAY ==================== */}
            {showEditor && (
                <DesignWorkspace
                    menu={menu}
                    businessName={tenantData?.business_name || localConfig?.businessName || 'Menú'}
                    logoUrl={localConfig?.headerCover?.image || tenantData?.hero_url || localConfig?.logoUrl}
                    tenantData={tenantData}
                    localConfig={localConfig}
                    targetBusinessId={targetBusinessId}
                    hasChanges={hasChanges}
                    onClose={() => setShowEditor(false)}
                    onSaveState={(editorState) => {
                        const updatedConfig = { ...localConfig, design_state: editorState }
                        setLocalConfig(updatedConfig)
                        setHasChanges(true)
                    }}
                    onPrint={handlePrintMenu}
                />
            )}
        </>
    )
}

export default MenuManager
