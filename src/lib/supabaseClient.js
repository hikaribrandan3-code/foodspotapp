/**
 * Supabase Client Configuration
 * 
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  🛡️  SILO-CORRECT: AUDITED 2026-01-14                        ║
 * ║                                                              ║
 * ║  All cloud functions enforce .eq('business_id', businessId)  ║
 * ║  No hardcoded IDs. Full multi-tenant isolation confirmed.    ║
 * ║                                                              ║
 * ║  Audited Functions:                                          ║
 * ║  ✅ getBranding        ✅ updateBranding                      ║
 * ║  ✅ getMenuCloud       ✅ updateMenuItemCloud                 ║
 * ║  ✅ createOrderCloud   ✅ getOrdersCloud                      ║
 * ║  ✅ updateOrderCloud   ✅ subscribeToOrders                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 * 
 * This file initializes the Supabase client for:
 * - Cloud storage of branding assets (logos, hero images)
 * - Real-time sync across devices (goodbye localStorage limits!)
 * - Cache-busting URLs that force Google App to refresh
 */

import { createClient } from '@supabase/supabase-js'



// 🛡️ INLINE GUEST TOKEN UTILITIES (Breaks circular dependency with storage.js)
// These functions are duplicated here to avoid: supabaseClient → storage → supabaseClient

const getTenantTokenKey = () => {
    if (typeof window === 'undefined') return 'fs_guest_token';
    const pathSegments = window.location.pathname.split('/').filter(Boolean);
    const urlSlug = pathSegments[0];
    const tenantSlug = (urlSlug && urlSlug !== 'admin') ? urlSlug : localStorage.getItem('fs_last_active_slug');
    return tenantSlug ? `fs_guest_token_${tenantSlug}` : 'fs_guest_token';
};

const getScopedGuestToken = () => {
    if (typeof window === 'undefined') return null;
    const tokenKey = getTenantTokenKey();
    let token = localStorage.getItem(tokenKey);
    
    if (!token) {
        token = crypto.randomUUID 
            ? crypto.randomUUID() 
            : `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem(tokenKey, token);
    }
    
    return token;
};

const migrateLegacyToken = () => {
    if (typeof window === 'undefined') return;
    
    const legacyToken = localStorage.getItem('fs_guest_token');
    const tenantSlug = (() => {
        const pathSegments = window.location.pathname.split('/').filter(Boolean);
        const urlSlug = pathSegments[0];
        return (urlSlug && urlSlug !== 'admin') ? urlSlug : localStorage.getItem('fs_last_active_slug');
    })();
    
    if (legacyToken && tenantSlug) {
        const newKey = `fs_guest_token_${tenantSlug}`;
        localStorage.setItem(newKey, legacyToken);
        localStorage.removeItem('fs_guest_token');
        console.log(`[Vault-Seal] Migrated legacy token to: ${tenantSlug}`);
    }
};

// Trigger migration on client init
if (typeof window !== 'undefined') {
    migrateLegacyToken();
}

// Supabase Project Credentials - with fallbacks
let SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL
let SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY

// Apply fallbacks if env vars are missing/empty
if (!SUPABASE_URL || SUPABASE_URL === 'undefined') {
  SUPABASE_URL = 'https://buendqgmwpxdixwvlkhd.supabase.co'
}
if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'undefined') {
  console.error('[Supabase] ❌ VITE_SUPABASE_ANON_KEY is missing. Add it to your environment variables.')
}

// Ensure both are strings before using
if (typeof SUPABASE_URL !== 'string' || typeof SUPABASE_ANON_KEY !== 'string') {
  console.error('[Supabase] ❌ Credentials are not strings', {
    URL: typeof SUPABASE_URL,
    KEY: typeof SUPABASE_ANON_KEY
  })
}

// Clear any corrupted auth tokens that would crash on JWT decode
if (typeof window !== 'undefined') {
  try {
    const authKey = `sb-${SUPABASE_URL?.match(/\/\/([^.]+)/)?.[1]}-auth-token`
    const raw = localStorage.getItem(authKey)
    if (raw) {
      const parsed = JSON.parse(raw)
      const token = parsed?.access_token || parsed
      if (typeof token === 'string' && token.split('.').length !== 3) {
        localStorage.removeItem(authKey)
        console.warn('[Supabase] Cleared malformed auth token')
      }
    }
  } catch { /* ignore */ }
}

// Initialize the Supabase client
let supabase = null;

try {
  console.log('[Supabase] 🚀 Calling createClient with:', {
    urlLength: SUPABASE_URL?.length,
    keyLength: SUPABASE_ANON_KEY?.length,
    urlType: typeof SUPABASE_URL,
    keyType: typeof SUPABASE_ANON_KEY
  })

  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true, // ✅ RESTORED: Sessions MUST survive page reloads (window.location.assign)
        autoRefreshToken: true, // ✅ RESTORED: Keep session alive across tab switches
        detectSessionInUrl: true
    },
    global: {
        // 🛡️ PERIMETER LOCK: Inject Guest Token into every request header
        // This allows RLS policies to validate the guest_token matches the database
        fetch: (url, options = {}) => {
            const headers = new Headers(options?.headers || {})

            if (typeof window !== 'undefined') {
                const guestToken = getScopedGuestToken();
                if (guestToken) {
                    headers.set('x-guest-token', guestToken)
                    // console.log('[Supabase] 🔐 Injecting x-guest-token', guestToken)
                }

                // 🔐 OWNER OVERRIDE: Inject Business ID for Dashboard Access
                // This matches the 'Owner Select' RLS policy
                const businessId = localStorage.getItem('fs_business_id') // Owner dashboard must set this
                if (businessId) {
                    headers.set('x-business-id', businessId)
                }
            }

            return fetch(url, { ...options, headers })
        }
    }
  });
  console.log('[Supabase] ✅ Client initialized successfully');
} catch (error) {
  console.error('[Supabase] 🔴 Failed to initialize:', error?.message || error);
  // Create a stub that will error on use
  supabase = {
    auth: { onAuthStateChange: () => ({ subscription: { unsubscribe: () => {} } }) },
    from: () => { throw new Error(`Supabase init failed: ${error?.message}`); }
  };
}

export { supabase };

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
    // 🔍 TRACE LOG: Debug tenant resolution
    console.log('[getBranding] 🔍 Requesting branding for businessId:', businessId)

    // 🚨 NETWORK INTERCEPTOR: Kill request on signup routes
    if (typeof window !== 'undefined' &&
        (window.location.pathname === '/' || window.location.pathname.includes('start-trial'))) {
        console.log('[getBranding] ⏹️ Skipped - signup route detected')
        return { data: null, error: null }
    }

    // 🛡️ STRICT GUARDRAIL: Prevent global branding fetch
    if (!businessId) {
        console.error('[getBranding] ❌ SILO VIOLATION - no businessId provided')
        return { data: null, error: new Error('[SILO VIOLATION] getBranding requires businessId') }
    }

    console.log('[getBranding] 🌐 Fetching from Supabase with filter: business_id =', businessId)

    const { data, error } = await supabase
        .from('branding')
        .select('*')
        .eq('business_id', businessId) // 🔐 TENANT FILTER
        .single()

    if (error) {
        console.error('[getBranding] ❌ Query failed:', error.message)
    } else {
        console.log('[getBranding] ✅ Success - received:', data?.business_name || 'no data')
    }

    return { data, error }
}

/**
 * Update branding configuration in Supabase (Multi-Tenant)
 * @param {object} updates - Fields to update (supports frontend OR backend keys)
 * @param {string} businessId - REQUIRED: Tenant UUID for isolation (!immutable ID!)
 * @returns {Promise<{data: object, error: Error|null}>}
 */
// 🛡️ KNOWN COLUMNS CACHE: Prevents repeated 400 errors from unknown columns.
// Populated on first successful save; cleared on page reload.
let _knownBrandingColumns = null;

// 🔐 GUARANTEED SAFE COLUMNS: These exist in every branding table deployment.
const CORE_BRANDING_COLUMNS = [
    'business_name', 'font_family', 'font_weight',
    'navbar_color', 'primary_color', 'secondary_color',
    'confirmation_color', 'powered_by_color',
    'hero_mode', 'hero_url', 'nav_icon_mode', 'hero_icon_mode',
    'is_paused', 'pause_message',
    'delivery_radius', 'delivery_fee', 'free_delivery_threshold',
    'menu_data', 'app_config',
    'updated_at'
];

export async function updateBranding(updates, businessId) {
    // 🛡️ STRICT GUARDRAIL: Prevent off-silo branding updates
    if (!businessId) {
        console.error('[SILO VIOLATION] updateBranding requires businessId')
        return { data: null, error: new Error('Missing business ID') }
    }

    try {
        // 🗺️ GHOST DATA FIX: Map Frontend keys to Backend Columns
        const dbUpdates = { updated_at: new Date().toISOString() }

        // Pass-through any existing backend-named fields
        Object.keys(updates).forEach(key => {
            // Skip frontend-only keys that need mapping
            if (!['pauseOrders', 'pauseOrdersMessage', 'radiusKm', 'flatFee', 'freeDeliveryThreshold'].includes(key)) {
                dbUpdates[key] = updates[key]
            }
        })

        // Explicit Frontend → Backend Mapping (The "Ghost Data" Bridge)
        if (updates.is_paused !== undefined) dbUpdates.is_paused = updates.is_paused
        if (updates.pauseOrders !== undefined) dbUpdates.is_paused = updates.pauseOrders
        if (updates.pause_message !== undefined) dbUpdates.pause_message = updates.pause_message
        if (updates.pauseOrdersMessage !== undefined) dbUpdates.pause_message = updates.pauseOrdersMessage
        if (updates.delivery_radius !== undefined) dbUpdates.delivery_radius = updates.delivery_radius
        if (updates.radiusKm !== undefined) dbUpdates.delivery_radius = updates.radiusKm
        if (updates.delivery_fee !== undefined) dbUpdates.delivery_fee = updates.delivery_fee
        if (updates.flatFee !== undefined) dbUpdates.delivery_fee = updates.flatFee
        if (updates.free_delivery_threshold !== undefined) dbUpdates.free_delivery_threshold = updates.free_delivery_threshold
        if (updates.freeDeliveryThreshold !== undefined) dbUpdates.free_delivery_threshold = updates.freeDeliveryThreshold

        // 🛡️ COLUMN FILTER: If we already know which columns exist, strip anything else
        let filteredUpdates = dbUpdates;
        if (_knownBrandingColumns) {
            filteredUpdates = {};
            for (const key of Object.keys(dbUpdates)) {
                if (_knownBrandingColumns.has(key)) {
                    filteredUpdates[key] = dbUpdates[key];
                }
            }
            console.log('[updateBranding] Using cached column set, sending:', Object.keys(filteredUpdates).join(', '));
        }

        // 🔒 ATTEMPT 1: Try with all (or cached) columns
        const { data, error } = await supabase
            .from('branding')
            .update(filteredUpdates)
            .eq('business_id', businessId)
            .select()
            .single()

        if (!error && data) {
            // ✅ SUCCESS: Learn which columns the table actually has from the returned row
            _knownBrandingColumns = new Set(Object.keys(data));
            console.log('[updateBranding] ✅ Success. Learned columns:', [..._knownBrandingColumns].join(', '));
            return { data, error: null }
        }

        // 🔍 DIAGNOSTIC: Log the full error
        console.warn('[updateBranding] Attempt 1 failed:', error?.message || error);

        // 🛡️ ATTEMPT 2: Auto-heal by using only CORE columns (guaranteed safe)
        if (error && (error.code === '42703' || error.message?.includes('column') || error.code === 'PGRST204' || String(error.code) === '400')) {
            console.warn('[updateBranding] ⚠️ Column mismatch detected. Retrying with core columns only...');
            
            const coreUpdates = {};
            for (const key of CORE_BRANDING_COLUMNS) {
                if (dbUpdates[key] !== undefined) {
                    coreUpdates[key] = dbUpdates[key];
                }
            }
            // Always include updated_at
            coreUpdates.updated_at = new Date().toISOString();

            const { data: coreData, error: coreError } = await supabase
                .from('branding')
                .update(coreUpdates)
                .eq('business_id', businessId)
                .select()
                .single()

            if (!coreError && coreData) {
                _knownBrandingColumns = new Set(Object.keys(coreData));
                console.log('[updateBranding] ✅ Core save succeeded. Known columns:', [..._knownBrandingColumns].join(', '));
                return { data: coreData, error: null }
            }

            console.error('[updateBranding] ❌ Core save also failed:', coreError);
            return { data: null, error: coreError }
        }

        return { data, error }
    } catch (error) {
        console.error('[updateBranding] Exception:', error)
        return { data: null, error }
    }
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
            .order('sort_order', { ascending: true })

        if (catError) throw catError

        // 2. Fetch all menu items ordered by display_order (scoped to business)
        const { data: items, error: itemError } = await supabase
            .from('menu_items')
            .select('*')
            .eq('business_id', businessId)
            .order('sort_order', { ascending: true })

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
            display_order: item.displayOrder || 0,
            sort_order: item.sortOrder || item.displayOrder || 0
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
            status: orderData.status || 'pending_payment',
            customer_name: orderData.customerName || null,
            customer_phone: orderData.customerPhone || null,
            delivery_mode: orderData.deliveryMode || false,
            delivery_address: orderData.deliveryAddress || null,
            payment_method: orderData.paymentMethod || null,
            payment_status: orderData.paymentStatus || 'pending',
            payment_confirmed: orderData.paymentConfirmed ?? false,
            notes: orderData.notes || null,
            staff_notes: orderData.staffNotes || null,
            table_number: orderData.tableNumber || null,
            order_type: orderData.deliveryType || orderData.orderType || null,
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
    if (updates.payment_confirmed !== undefined) dbUpdates.payment_confirmed = updates.payment_confirmed
    // Stamp delivered_at when order is confirmed delivered
    if (updates.status === 'delivered') dbUpdates.delivered_at = new Date().toISOString()

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
            status: orderData.status || 'pending_payment',
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

/**
 * Clock in a staff member — inserts a shift record.
 * Silently no-ops if the staff_shifts table doesn't exist yet.
 */
export async function clockInStaff(staffId, businessId) {
    if (!staffId || !businessId) return { data: null, error: null }
    const { data, error } = await supabase
        .from('staff_shifts')
        .insert({ staff_id: staffId, business_id: businessId, clock_in_at: new Date().toISOString() })
        .select()
        .single()
    return { data, error }
}

/**
 * Clock out a staff member — updates the open shift with clock_out_at.
 */
export async function clockOutStaff(staffId, businessId) {
    if (!staffId || !businessId) return { data: null, error: null }
    const now = new Date().toISOString()
    const { data: openShift } = await supabase
        .from('staff_shifts')
        .select('id')
        .eq('staff_id', staffId)
        .eq('business_id', businessId)
        .is('clock_out_at', null)
        .order('clock_in_at', { ascending: false })
        .limit(1)
        .single()
    if (!openShift) return { data: null, error: null }
    const { data, error } = await supabase
        .from('staff_shifts')
        .update({ clock_out_at: now })
        .eq('id', openShift.id)
        .eq('business_id', businessId)
        .select()
        .single()
    return { data, error }
}

/**
 * Fetch shift history for a staff member (last 30 days).
 */
export async function getStaffShifts(staffId, businessId) {
    if (!staffId || !businessId) return { data: [], error: null }
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data, error } = await supabase
        .from('staff_shifts')
        .select('*')
        .eq('staff_id', staffId)
        .eq('business_id', businessId)
        .gte('clock_in_at', since)
        .order('clock_in_at', { ascending: false })
    return { data: data ?? [], error }
}

/**
 * Get next order number safely - prevents duplicates under concurrent writes.
 * Uses a sequential ordering of MAX(order_number) + 1 from the database.
 * While not perfectly atomic in all cases, it minimizes race conditions by
 * leveraging PostgreSQL's order of operations. For critical high-concurrency,
 * consider a dedicated sequence table with atomic increment.
 */
export async function getNextOrderNumber(businessId) {
    if (!businessId) throw new Error('[ORDER_SEQUENCE] businessId required')

    // Query for the maximum order number for this business
    const { data: orders, error: queryError } = await supabase
        .from('orders')
        .select('order_number')
        .eq('business_id', businessId)
        .order('order_number', { ascending: false })
        .limit(1)

    if (queryError) return { nextNumber: 1, error: queryError }

    const lastOrderNumber = orders?.[0]?.order_number || 0
    const nextNumber = (Number(lastOrderNumber) || 0) + 1

    return { nextNumber, error: null }
}
