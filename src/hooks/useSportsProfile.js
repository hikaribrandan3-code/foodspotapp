import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

const PHONE_KEY = 'fs_sports_phone'

/** Get/set the locally-remembered phone used to identify "me" across Mis Partidos / Mi Perfil. */
export function getSportsPhone() {
    return localStorage.getItem(PHONE_KEY) || ''
}
export function setSportsPhone(phone) {
    if (phone) localStorage.setItem(PHONE_KEY, phone)
}

/**
 * usePlayerProfile - Mi Perfil: stats, achievements, ranking, rented gear.
 * @param {string} businessId
 * @param {string} phone
 */
export function usePlayerProfile(businessId, phone) {
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetchProfile = useCallback(async () => {
        if (!businessId || !phone) {
            setLoading(false)
            return
        }
        try {
            setLoading(true)
            setError(null)
            const { data, error: rpcError } = await supabase.rpc('get_player_profile', {
                p_business_id: businessId,
                p_phone: phone
            })
            if (rpcError) {
                console.error('[usePlayerProfile] RPC failed:', rpcError)
                setError(rpcError)
                setProfile(null)
            } else {
                setProfile(data)
            }
        } catch (err) {
            console.error('[usePlayerProfile] Error:', err?.message)
            setError(err)
            setProfile(null)
        } finally {
            setLoading(false)
        }
    }, [businessId, phone])

    useEffect(() => {
        fetchProfile()
    }, [fetchProfile])

    return { profile, loading, error, refetch: fetchProfile }
}

/**
 * useMyMatches - Mis Partidos: active / history / tournaments for a phone.
 * @param {string} businessId
 * @param {string} phone
 */
export function useMyMatches(businessId, phone) {
    const [matches, setMatches] = useState({ active: [], history: [], tournaments: [] })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetchMatches = useCallback(async () => {
        if (!businessId || !phone) {
            setLoading(false)
            return
        }
        try {
            setLoading(true)
            setError(null)
            const { data, error: rpcError } = await supabase.rpc('get_my_matches', {
                p_business_id: businessId,
                p_phone: phone
            })
            if (rpcError) {
                console.error('[useMyMatches] RPC failed:', rpcError)
                setError(rpcError)
                setMatches({ active: [], history: [], tournaments: [] })
            } else {
                setMatches(data || { active: [], history: [], tournaments: [] })
            }
        } catch (err) {
            console.error('[useMyMatches] Error:', err?.message)
            setError(err)
            setMatches({ active: [], history: [], tournaments: [] })
        } finally {
            setLoading(false)
        }
    }, [businessId, phone])

    useEffect(() => {
        fetchMatches()
    }, [fetchMatches])

    return { matches, loading, error, refetch: fetchMatches }
}
