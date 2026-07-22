import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

/**
 * useTournaments - Fetch active tournaments (registration_open | in_progress | completed)
 * for a business, customer-facing.
 * @param {string} businessId
 */
export function useTournaments(businessId) {
    const [tournaments, setTournaments] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetchTournaments = useCallback(async () => {
        if (!businessId) {
            setLoading(false)
            return
        }
        try {
            setLoading(true)
            setError(null)

            const { data, error: fetchError } = await supabase
                .from('tournaments_active')
                .select('*')
                .eq('business_id', businessId)
                .order('start_date', { ascending: true })

            if (fetchError) {
                console.error('[useTournaments] Fetch failed:', fetchError)
                setError(fetchError)
                setTournaments([])
            } else {
                setTournaments(data || [])
            }
        } catch (err) {
            console.error('[useTournaments] Error:', err?.message)
            setError(err)
            setTournaments([])
        } finally {
            setLoading(false)
        }
    }, [businessId])

    useEffect(() => {
        fetchTournaments()
    }, [fetchTournaments])

    return { tournaments, loading, error, refetch: fetchTournaments }
}

/**
 * fetchTournamentBracket - full bracket JSON via RPC (rounds + matches)
 * @param {string} tournamentId
 */
export async function fetchTournamentBracket(tournamentId) {
    const { data, error } = await supabase.rpc('get_tournament_bracket', {
        p_tournament_id: tournamentId
    })
    if (error) {
        console.error('[fetchTournamentBracket] RPC failed:', error)
        throw error
    }
    return data
}

/**
 * registerTournamentTeam - RPC wrapper for team registration (no payment step).
 * Kept for free tournaments / non-MP flows.
 */
export async function registerTournamentTeam({ businessId, tournamentId, teamName, captainName, captainPhone, players, guestToken }) {
    const { data, error } = await supabase.rpc('register_tournament_team', {
        p_business_id: businessId,
        p_tournament_id: tournamentId,
        p_team_name: teamName,
        p_captain_name: captainName,
        p_captain_phone: captainPhone,
        p_players: players || [],
        p_guest_token: guestToken || null
    })
    if (error) {
        console.error('[registerTournamentTeam] RPC failed:', error)
        throw error
    }
    return data
}

/**
 * createTournamentPreference - registers the team AND creates the Mercado Pago
 * checkout preference in one call (create-sports-preference edge function).
 * Same checkout pattern as food/events: free → paid immediately, else → init_point redirect.
 */
export async function createTournamentPreference({ businessId, tenantSlug, tournamentId, teamName, captainName, captainPhone, players }) {
    const { data, error } = await supabase.functions.invoke('create-sports-preference', {
        body: {
            kind: 'tournament',
            business_id: businessId,
            tenant_slug: tenantSlug,
            tournament_id: tournamentId,
            team_name: teamName,
            captain_name: captainName,
            captain_phone: captainPhone,
            players: players || []
        }
    })
    if (error) {
        console.error('[createTournamentPreference] Edge function failed:', error)
        throw error
    }
    return data
}

/**
 * fetchTournamentTeam - read a single team row (used to render the MP-return confirmation screen)
 */
export async function fetchTournamentTeam(teamId) {
    const { data, error } = await supabase
        .from('tournament_teams')
        .select('id, team_name, registration_code, entry_payment_status, entry_fee_cents')
        .eq('id', teamId)
        .single()
    if (error) {
        console.error('[fetchTournamentTeam] Fetch failed:', error)
        throw error
    }
    return data
}
