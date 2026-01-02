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
 * Upload an asset to Supabase Storage with cache-busting filename
 * 
 * @param {File} file - The file to upload
 * @param {string} bucketName - The storage bucket name (e.g., 'branding')
 * @returns {Promise<{url: string, error: Error|null}>}
 */
export async function uploadAsset(file, bucketName = 'assets') {
    try {
        // 1. Generate cache-busting filename: logo_1735849200.png
        const ext = file.name.split('.').pop()
        const baseName = file.name.replace(`.${ext}`, '').replace(/[^a-zA-Z0-9]/g, '_')
        const cacheBusterName = `${baseName}_${Date.now()}.${ext}`

        // 2. Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(cacheBusterName, file, {
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
 * Fetch branding configuration from Supabase
 * @returns {Promise<{data: object, error: Error|null}>}
 */
export async function getBranding() {
    const { data, error } = await supabase
        .from('branding')
        .select('*')
        .limit(1)
        .single()

    return { data, error }
}

/**
 * Update branding configuration in Supabase
 * @param {object} updates - Fields to update
 * @returns {Promise<{data: object, error: Error|null}>}
 */
export async function updateBranding(updates) {
    const { data, error } = await supabase
        .from('branding')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', 1)
        .select()
        .single()

    return { data, error }
}
