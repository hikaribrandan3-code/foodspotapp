import { createClient } from '@supabase/supabase-js'

let supabaseInstance = null;

function getSupabase() {
  if (supabaseInstance) return supabaseInstance;

  try {
    supabaseInstance = createClient(
      'https://buendqgmwpxdixwvlkhd.supabase.co',
      'sb_secret_5g4u0yoOlkxcJ-beSRbnWg__eK_bc2E',
      {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
        global: {
          fetch: (url, options = {}) => {
            const headers = new Headers(options?.headers || {});
            if (typeof window !== 'undefined') {
              const guestToken = localStorage.getItem('fs_guest_token') || `guest-${Date.now()}`;
              if (guestToken) headers.set('x-guest-token', guestToken);
              const businessId = localStorage.getItem('fs_business_id');
              if (businessId) headers.set('x-business-id', businessId);
            }
            return fetch(url, { ...options, headers });
          }
        }
      }
    );
  } catch (err) {
    console.error('[Supabase] Init failed:', err?.message);
  }

  return supabaseInstance;
}

export const supabase = {
  get auth() { return getSupabase()?.auth },
  get storage() { return getSupabase()?.storage },
  channel: (...args) => getSupabase()?.channel(...args),
  from: (...args) => getSupabase()?.from(...args),
  removeChannel: (...args) => getSupabase()?.removeChannel(...args)
};

export async function signOut() {
  return getSupabase()?.auth.signOut();
}

export async function getCurrentUser() {
  const { data: { user } } = await getSupabase()?.auth.getUser();
  return user;
}

export async function addMenuItemCloud(businessId, newItem) {
  if (!businessId) throw new Error('[SILO VIOLATION] addMenuItemCloud requires businessId');

  const client = getSupabase();
  const { data, error } = await client
    .from('branding')
    .select('menu_data')
    .eq('business_id', businessId)
    .single();

  if (error) return { error };

  const menu = [...(data?.menu_data || []), newItem];
  const { data: result, error: updateError } = await client
    .from('branding')
    .update({ menu_data: menu })
    .eq('business_id', businessId)
    .select()
    .single();

  return { data: result, error: updateError };
}

export async function uploadAsset(file, businessId, bucketName = 'assets') {
  if (!businessId) throw new Error('[SILO VIOLATION] uploadAsset requires businessId');

  try {
    const ext = file.name.split('.').pop();
    const baseName = file.name.replace(`.${ext}`, '').replace(/[^a-zA-Z0-9]/g, '_');
    const cacheBusterName = `${baseName}_${Date.now()}.${ext}`;
    const storagePath = `${businessId}/${cacheBusterName}`;

    const client = getSupabase();
    const { data, error } = await client.storage
      .from(bucketName)
      .upload(storagePath, file, { cacheControl: '0', upsert: false });

    if (error) throw error;

    const { data: urlData } = client.storage.from(bucketName).getPublicUrl(data.path);
    return { url: `${urlData.publicUrl}?t=${Date.now()}`, error: null };
  } catch (error) {
    console.error('Upload failed:', error);
    return { url: null, error };
  }
}

export async function getBranding(businessId) {
  if (!businessId) {
    console.error('[getBranding] ❌ SILO VIOLATION - no businessId provided');
    return { data: null, error: new Error('[SILO VIOLATION] getBranding requires businessId') };
  }

  const client = getSupabase();
  const { data, error } = await client
    .from('branding')
    .select('*')
    .eq('business_id', businessId)
    .single();

  if (error) console.error('[getBranding] ❌ Query failed:', error.message);
  else console.log('[getBranding] ✅ Success');

  return { data, error };
}

export async function updateBranding(businessId, updates) {
  if (!businessId) throw new Error('[SILO VIOLATION] updateBranding requires businessId');

  const client = getSupabase();
  const { data, error } = await client
    .from('branding')
    .update(updates)
    .eq('business_id', businessId)
    .select()
    .single();

  return { data, error };
}

export async function getMenuCloud(businessId) {
  if (!businessId) throw new Error('[SILO VIOLATION] getMenuCloud requires businessId');

  const client = getSupabase();
  const { data, error } = await client
    .from('branding')
    .select('menu_data')
    .eq('business_id', businessId)
    .single();

  return { menu: data?.menu_data || [], error };
}

export async function updateMenuItemCloud(businessId, itemId, updates) {
  if (!businessId || !itemId) throw new Error('[SILO VIOLATION] Missing businessId or itemId');

  const client = getSupabase();
  const { data, error } = await client
    .from('branding')
    .select('menu_data')
    .eq('business_id', businessId)
    .single();

  if (error) return { error };

  const menu = data?.menu_data || [];
  const updated = menu.map(item => item.id === itemId ? { ...item, ...updates } : item);

  const { data: result, error: updateError } = await client
    .from('branding')
    .update({ menu_data: updated })
    .eq('business_id', businessId)
    .select()
    .single();

  return { data: result, error: updateError };
}

export async function createOrderCloud(businessId, orderData) {
  if (!businessId) throw new Error('[SILO VIOLATION] createOrderCloud requires businessId');

  const client = getSupabase();
  const { data, error } = await client
    .from('orders')
    .insert([{ ...orderData, business_id: businessId }])
    .select()
    .single();

  return { data, error };
}

export async function getOrdersCloud(businessId, filters = {}) {
  if (!businessId) throw new Error('[SILO VIOLATION] getOrdersCloud requires businessId');

  const client = getSupabase();
  let query = client.from('orders').select('*').eq('business_id', businessId);

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.limit) query = query.limit(filters.limit);

  const { data, error } = await query.order('created_at', { ascending: false });
  return { data, error };
}

export async function updateOrderCloud(businessId, orderId, updates) {
  if (!businessId || !orderId) throw new Error('[SILO VIOLATION] Missing businessId or orderId');

  const client = getSupabase();
  const { data, error } = await client
    .from('orders')
    .update(updates)
    .eq('id', orderId)
    .eq('business_id', businessId)
    .select()
    .single();

  return { data, error };
}

export function subscribeToOrders(businessId, onInsert, onUpdate) {
  if (!businessId) throw new Error('[SILO VIOLATION] subscribeToOrders requires businessId');

  const client = getSupabase();
  return client
    .channel(`orders-${businessId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'orders',
      filter: `business_id=eq.${businessId}`
    }, payload => onInsert?.(payload.new))
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'orders',
      filter: `business_id=eq.${businessId}`
    }, payload => onUpdate?.(payload.new.id, payload.new))
    .subscribe((status, err) => {
      if (err) console.warn('[subscribeToOrders] Subscription error:', err?.message);
    });
}

export async function getOrdersByGuestToken(guestToken, businessId) {
  if (!businessId) return { data: null, error: new Error('Missing businessId') };

  const client = getSupabase();
  const { data, error } = await client
    .from('orders')
    .select('*')
    .eq('business_id', businessId)
    .eq('guest_token', guestToken);

  return { data, error };
}

export async function getOrdersByPhone(phone, businessId) {
  if (!businessId) return { data: null, error: new Error('Missing businessId') };

  const client = getSupabase();
  const { data, error } = await client
    .from('orders')
    .select('*')
    .eq('business_id', businessId)
    .eq('customer_phone', phone);

  return { data, error };
}
