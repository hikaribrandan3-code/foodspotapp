/**
 * Supabase Client Configuration
 * 
 * This file initializes the Supabase client for:
 * - Cloud storage of branding assets (logos, hero images)
 * - Real-time sync across devices (goodbye localStorage limits!)
 * - Cache-busting URLs that force Google App to refresh
 */

import { createClient } from '@supabase/supabase-js'

// Supabase Project Credentials
const SUPABASE_URL = 'https://buendqgmwpxdixwvlkhd.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_iv5xVk4DIMCq2l_oXvSNeQ_kwY038TD'

// Initialize the Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

/**
 * Upload an asset to Supabase Storage (Multi-Tenant)
 * 
 * @param {File} file - The file to upload
 * @param {string} businessId - REQUIRED: Tenant ID for scoped storage path
 * @param {string} bucketName - The storage bucket name (e.g., 'branding')
 * @returns {Promise<{url: string, error: Error|null}>}
 */
export async function uploadAsset(file, businessId, bucketName = 'assets') {
    // 🛡️ STRICT GUARDRAIL: Prevent cross-tenant asset storage
    if (!businessId) {
        throw new Error('[SILO VIOLATION] uploadAsset requires businessId for tenant isolation')
    }

    try {
        // 1. Generate cache-busting filename: logo_1735849200.png
        const ext = file.name.split('.').pop()
        const baseName = file.name.replace(`.${ext}`, '').replace(/[^a-zA-Z0-9]/g, '_')
        const cacheBusterName = `${baseName}_${Date.now()}.${ext}`

        // 2. Upload to Supabase Storage with tenant-scoped path
        // Path: {businessId}/{filename} → e.g., "grubclub-demo/logo_1735849200.png"
        const storagePath = `${businessId}/${cacheBusterName}`

        const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(storagePath, file, {
                cacheControl: '0', // No caching
                upsert: false      // Don't overwrite
            })

        if (error) throw error

        // 3. Get the public URL
        const { data: urlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(data.path)

        // 4. Add timestamp query param for extra cache-busting (paranoid mode)
        const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`

        return { url: publicUrl, error: null }
    } catch (error) {
        console.error('Upload failed:', error)
        return { url: null, error }
    }
}

/**
 * Fetch branding configuration from Supabase (Multi-Tenant)
 * @param {string} businessId - REQUIRED: Tenant UUID for isolation
 * @returns {Promise<{data: object, error: Error|null}>}
 */
export async function getBranding(businessId) {
    // 🚨 NETWORK INTERCEPTOR: Kill request on signup routes
    if (typeof window !== 'undefined' &&
        (window.location.pathname === '/' || window.location.pathname.includes('start-trial'))) {
        return { data: null, error: null }
    }

    // 🛡️ STRICT GUARDRAIL: Prevent global branding fetch
    if (!businessId) {
        return { data: null, error: new Error('[SILO VIOLATION] getBranding requires businessId') }
    }

    const { data, error } = await supabase
        .from('branding')
        .select('*')
        .eq('business_id', businessId) // 🔐 TENANT FILTER
        .single()

    return { data, error }
}

/**
 * Update branding configuration in Supabase (Multi-Tenant)
 * @param {object} updates - Fields to update
 * @param {string} businessId - REQUIRED: Tenant UUID for isolation
 * @returns {Promise<{data: object, error: Error|null}>}
 */
export async function updateBranding(updates, businessId) {
    // 🛡️ STRICT GUARDRAIL: Prevent off-silo branding updates
    if (!businessId) {
        throw new Error('[SILO VIOLATION] updateBranding requires businessId for tenant isolation')
    }

    const { data, error } = await supabase
        .from('branding')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('business_id', businessId) // 🔐 TENANT FILTER
        .select()
        .single()

    return { data, error }
}

/**
 * Get current authenticated user
 * @returns {Promise<{user: object|null, error: Error|null}>}
 */
export async function getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
}

/**
 * Sign out current user
 * @returns {Promise<{error: Error|null}>}
 */
export async function signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
}

/**
 * Check if user is authenticated
 * @returns {Promise<boolean>}
 */
export async function isAuthenticated() {
    const { user } = await getCurrentUser()
    return !!user
}

/**
 * Fetch menu data from Supabase (Multi-Tenant)
 * Transforms cloud schema into frontend format
 * @param {string} businessId - REQUIRED: Tenant UUID for isolation
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export async function getMenuCloud(businessId) {
    // 🛡️ STRICT GUARDRAIL: Prevent cross-tenant menu fetch
    if (!businessId) {
        throw new Error('[SILO VIOLATION] getMenuCloud requires businessId for tenant isolation')
    }

    try {
        // 1. Fetch categories ordered by display_order (scoped to business)
        const { data: categories, error: catError } = await supabase
            .from('categories')
            .select('*')
            .eq('business_id', businessId)
            .order('display_order', { ascending: true })

        if (catError) throw catError

        // 2. Fetch all menu items ordered by display_order (scoped to business)
        const { data: items, error: itemError } = await supabase
            .from('menu_items')
            .select('*')
            .eq('business_id', businessId)
            .order('display_order', { ascending: true })

        if (itemError) throw itemError

        // 3. Transform to frontend format (nest items under categories)
        const menuData = {
            categories: categories.map(cat => ({
                id: cat.id,
                name: cat.name,
                icon: cat.icon,
                enabled: cat.enabled,
                items: items
                    .filter(item => item.category_id === cat.id)
                    .map(item => ({
                        id: item.id,
                        name: item.name,
                        price: item.price,
                        available: item.available,
                        featured: item.featured,
                        image: item.image_url,
                        description: item.description
                    }))
            }))
        }

        return { data: menuData, error: null }
    } catch (error) {
        return { data: null, error }
    }
}

/**
 * Update a menu item in Supabase (Multi-Tenant)
 * @param {string} itemId - The item ID
 * @param {object} updates - Fields to update
 * @param {string} businessId - REQUIRED: Tenant UUID for isolation
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export async function updateMenuItemCloud(itemId, updates, businessId) {
    // 🛡️ STRICT GUARDRAIL: Prevent cross-tenant menu tampering
    if (!businessId) {
        throw new Error('[SILO VIOLATION] updateMenuItemCloud requires businessId for tenant isolation')
    }

    // Map frontend field names to database column names
    const dbUpdates = {}
    if (updates.name !== undefined) dbUpdates.name = updates.name
    if (updates.price !== undefined) dbUpdates.price = updates.price
    if (updates.available !== undefined) dbUpdates.available = updates.available
    if (updates.featured !== undefined) dbUpdates.featured = updates.featured
    if (updates.image !== undefined) dbUpdates.image_url = updates.image
    if (updates.description !== undefined) dbUpdates.description = updates.description

    const { data, error } = await supabase
        .from('menu_items')
        .update(dbUpdates)
        .eq('id', itemId)
        .eq('business_id', businessId)
        .select()
        .single()

    return { data, error }
}

/**
 * Update a category in Supabase (Multi-Tenant)
 * @param {string} categoryId - The category ID
 * @param {object} updates - Fields to update
 * @param {string} businessId - REQUIRED: Tenant UUID for isolation
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export async function updateCategoryCloud(categoryId, updates, businessId) {
    // 🛡️ STRICT GUARDRAIL: Prevent cross-tenant category tampering
    if (!businessId) {
        throw new Error('[SILO VIOLATION] updateCategoryCloud requires businessId for tenant isolation')
    }

    const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', categoryId)
        .eq('business_id', businessId)
        .select()
        .single()

    return { data, error }
}

/**
 * Add a new menu item to Supabase (Multi-Tenant)
 * @param {object} item - The item to add
 * @param {string} businessId - REQUIRED: Tenant UUID for isolation
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export async function addMenuItemCloud(item, businessId) {
    // 🛡️ STRICT GUARDRAIL: Prevent cross-tenant menu insertion
    if (!businessId) {
        throw new Error('[SILO VIOLATION] addMenuItemCloud requires businessId for tenant isolation')
    }

    const { data, error } = await supabase
        .from('menu_items')
        .insert({
            id: item.id,
            business_id: businessId,
            category_id: item.categoryId,
            name: item.name,
            price: item.price || 0,
            available: item.available ?? true,
            featured: item.featured ?? false,
            image_url: item.image || null,
            display_order: item.displayOrder || 0
        })
        .select()
        .single()

    return { data, error }
}

// =========================================================
// ORDERS CLOUD FUNCTIONS
// =========================================================

/**
 * Create a new order in Supabase (Multi-Tenant Silo Enforced)
 * 
 * @param {object} orderData - The order to create
 * @param {string} businessId - REQUIRED: The business UUID for tenant isolation
 * @returns {Promise<{data: object|null, error: Error|null}>}
 * @throws {Error} If businessId is missing (Off-Silo Guardrail)
 */
export async function createOrderCloud(orderData, businessId) {
    // 🛡️ STRICT GUARDRAIL: Prevent Off-Silo data leaks
    if (!businessId) {
        throw new Error('[SILO VIOLATION] createOrderCloud requires businessId for tenant isolation')
    }

    const { data, error } = await supabase
        .from('orders')
        .insert({
            business_id: businessId, // 🔐 TENANT ISOLATION
            order_number: orderData.orderNumber,
            items: orderData.items,
            total: orderData.total,
            status: orderData.status || 'pendiente',
            customer_name: orderData.customerName || null,
            customer_phone: orderData.customerPhone || null,
            delivery_mode: orderData.deliveryMode || false,
            delivery_address: orderData.deliveryAddress || null,
            payment_method: orderData.paymentMethod || null,
            notes: orderData.notes || null,
            created_at: new Date().toISOString()
        })
        .select()
        .single()

    return { data, error }
}

/**
 * Fetch orders for a specific business (Multi-Tenant)
 * @param {string} businessId - REQUIRED: Tenant UUID for isolation
 * @returns {Promise<{data: array|null, error: Error|null}>}
 */
export async function getOrdersCloud(businessId) {
    // 🛡️ STRICT GUARDRAIL: Prevent global order fetch
    if (!businessId) {
        throw new Error('[SILO VIOLATION] getOrdersCloud requires businessId for tenant isolation')
    }

    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })

    // Transform to frontend format
    if (data) {
        const orders = data.map(order => ({
            id: order.id,
            orderNumber: order.order_number,
            items: order.items,
            total: order.total,
            status: order.status,
            customerName: order.customer_name,
            customerPhone: order.customer_phone,
            deliveryMode: order.delivery_mode,
            deliveryAddress: order.delivery_address,
            paymentMethod: order.payment_method,
            notes: order.notes,
            createdAt: order.created_at
        }))
        return { data: orders, error: null }
    }

    return { data: null, error }
}

/**
 * Update an order status in Supabase (Multi-Tenant Silo Enforced)
 * 
 * @param {string} orderId - The order UUID
 * @param {object} updates - Fields to update (status, payment_method, etc)
 * @param {string} businessId - REQUIRED: Tenant UUID for isolation
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export async function updateOrderCloud(orderId, updates, businessId) {
    // 🛡️ STRICT GUARDRAIL: Prevent cross-tenant order modification
    if (!businessId) {
        throw new Error('[SILO VIOLATION] updateOrderCloud requires businessId for tenant isolation')
    }

    const dbUpdates = {}
    if (updates.status !== undefined) dbUpdates.status = updates.status
    if (updates.paymentMethod !== undefined) dbUpdates.payment_method = updates.paymentMethod
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes

    const { data, error } = await supabase
        .from('orders')
        .update(dbUpdates)
        .eq('id', orderId)
        .eq('business_id', businessId)  // 🏢 PHASE 3: Silo enforcement
        .select()
        .single()

    return { data, error }
}

/**
 * Subscribe to real-time order updates (Multi-Tenant Silo Enforced)
 * 
 * @param {string} businessId - REQUIRED: The business UUID for tenant isolation
 * @param {function} onInsert - Callback when new order is created
 * @param {function} onUpdate - Callback when order is updated
 * @returns {object} Supabase subscription (call .unsubscribe() to cleanup)
 * @throws {Error} If businessId is missing (Off-Silo Guardrail)
 */
export function subscribeToOrders(businessId, onInsert, onUpdate) {
    // 🛡️ STRICT GUARDRAIL: Prevent cross-tenant data contamination
    if (!businessId) {
        throw new Error('[SILO VIOLATION] subscribeToOrders requires businessId for tenant isolation')
    }

    return supabase
        .channel(`orders-realtime-${businessId}`) // Unique channel per tenant
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'orders',
            filter: `business_id=eq.${businessId}` // 🔐 TENANT FILTER
        }, payload => {
            const order = payload.new
            onInsert({
                id: order.id,
                orderNumber: order.order_number,
                items: order.items,
                total: order.total,
                status: order.status,
                customerName: order.customer_name,
                customerPhone: order.customer_phone,
                deliveryMode: order.delivery_mode,
                deliveryAddress: order.delivery_address,
                createdAt: order.created_at
            })
        })
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `business_id=eq.${businessId}` // 🔐 TENANT FILTER
        }, payload => {
            onUpdate(payload.new.id, payload.new)
        })
        .subscribe()
}

// =========================================================
// GUEST TOKEN FUNCTIONS (Valet Ticket System)
// =========================================================

/**
 * Fetch orders by guest token (Multi-Tenant)
 * @param {string} guestToken - The guest's UUID token
 * @param {string} businessId - REQUIRED: Tenant UUID for isolation
 * @returns {Promise<{data: array|null, error: Error|null}>}
 */
export async function getOrdersByGuestToken(guestToken, businessId) {
    // 🛡️ STRICT GUARDRAIL: Prevent cross-tenant order fetch
    if (!businessId) {
        throw new Error('[SILO VIOLATION] getOrdersByGuestToken requires businessId for tenant isolation')
    }

    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('guest_token', guestToken)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })

    if (data) {
        const orders = data.map(order => ({
            id: order.id,
            orderNumber: order.order_number,
            items: order.items,
            total: order.total,
            status: order.status,
            customerName: order.customer_name,
            customerPhone: order.customer_phone,
            deliveryMode: order.delivery_mode,
            deliveryAddress: order.delivery_address,
            paymentMethod: order.payment_method,
            createdAt: order.created_at
        }))
        return { data: orders, error: null }
    }

    return { data: [], error }
}

/**
 * Fetch orders by phone number (Multi-Tenant)
 * @param {string} phoneNumber - Customer phone number
 * @param {string} businessId - REQUIRED: Tenant UUID for isolation
 * @returns {Promise<{data: array|null, error: Error|null}>}
 */
export async function getOrdersByPhone(phoneNumber, businessId) {
    // 🛡️ STRICT GUARDRAIL: Prevent cross-tenant order fetch
    if (!businessId) {
        throw new Error('[SILO VIOLATION] getOrdersByPhone requires businessId for tenant isolation')
    }

    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_phone', phoneNumber)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })

    if (data) {
        const orders = data.map(order => ({
            id: order.id,
            orderNumber: order.order_number,
            items: order.items,
            total: order.total,
            status: order.status,
            customerName: order.customer_name,
            customerPhone: order.customer_phone,
            deliveryMode: order.delivery_mode,
            deliveryAddress: order.delivery_address,
            createdAt: order.created_at
        }))
        return { data: orders, error: null }
    }

    return { data: [], error }
}

/**
 * Create order with guest token (Multi-Tenant Silo Enforced)
 * 
 * @param {object} orderData - Order data
 * @param {string} guestToken - Guest UUID token
 * @param {string} businessId - REQUIRED: The business UUID for tenant isolation
 * @returns {Promise<{data: object|null, error: Error|null}>}
 * @throws {Error} If businessId is missing (Off-Silo Guardrail)
 */
export async function createOrderWithGuestToken(orderData, guestToken, businessId) {
    // 🛡️ STRICT GUARDRAIL: Prevent Off-Silo data leaks
    if (!businessId) {
        throw new Error('[SILO VIOLATION] createOrderWithGuestToken requires businessId for tenant isolation')
    }

    const { data, error } = await supabase
        .from('orders')
        .insert({
            business_id: businessId, // 🔐 TENANT ISOLATION
            order_number: orderData.orderNumber,
            items: orderData.items,
            total: orderData.total,
            status: orderData.status || 'pendiente',
            customer_name: orderData.customerName || null,
            customer_phone: orderData.customerPhone || null,
            delivery_mode: orderData.deliveryMode || false,
            delivery_address: orderData.deliveryAddress || null,
            payment_method: orderData.paymentMethod || null,
            guest_token: guestToken,
            created_at: new Date().toISOString()
        })
        .select()
        .single()

    return { data, error }
}
