import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useOrdersPolling } from './useOrdersPolling'

// ─── Mock supabase ────────────────────────────────────────────────────────────
vi.mock('../lib/supabaseClient', () => ({
    supabase: {
        from: vi.fn(),
    },
}))

import { supabase } from '../lib/supabaseClient'
import { ORDER_STATUS } from '../constants/database.js';


// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a fully-chained mock for:
 *   supabase.from(table).select('*').eq(...).order(...).limit(n)
 *
 * The terminal call (limit) resolves with { data, error }.
 */
function mockFromChain({ data = [], error = null } = {}) {
    const limitMock  = vi.fn().mockResolvedValue({ data, error })
    const orderMock  = vi.fn().mockReturnValue({ limit: limitMock })
    const eqMock     = vi.fn().mockReturnValue({ order: orderMock })
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
    supabase.from.mockReturnValue({ select: selectMock })
    return { selectMock, eqMock, orderMock, limitMock }
}

const MOCK_ORDERS = [
    { id: 'order-1', business_id: 'biz-123', status: ORDER_STATUS.PREPARING, created_at: '2026-04-23T10:00:00Z' },
    { id: 'order-2', business_id: 'biz-123', status: ORDER_STATUS.READY,     created_at: '2026-04-23T09:00:00Z' },
]

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useOrdersPolling', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    // ── 1. Returns empty array initially ─────────────────────────────────────
    it('returns an empty orders array and loading=true before the first fetch resolves', () => {
        // Use a promise that never resolves so we can inspect the initial state
        const limitMock  = vi.fn().mockReturnValue(new Promise(() => {}))
        const orderMock  = vi.fn().mockReturnValue({ limit: limitMock })
        const eqMock     = vi.fn().mockReturnValue({ order: orderMock })
        const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
        supabase.from.mockReturnValue({ select: selectMock })

        const { result } = renderHook(() => useOrdersPolling('biz-123'))

        expect(result.current.orders).toEqual([])
        expect(result.current.loading).toBe(true)
    })

    // ── 2. Fetches orders for businessId ──────────────────────────────────────
    it('fetches orders for the given businessId and populates the orders array', async () => {
        const { eqMock } = mockFromChain({ data: MOCK_ORDERS })

        const { result } = renderHook(() => useOrdersPolling('biz-123'))

        await waitFor(() => expect(result.current.loading).toBe(false))

        expect(supabase.from).toHaveBeenCalledWith('orders')
        expect(eqMock).toHaveBeenCalledWith('business_id', 'biz-123')
        expect(result.current.orders).toEqual(MOCK_ORDERS)
    })

    // ── 3. Filters active orders correctly ────────────────────────────────────
    it('stores only the data Supabase returns (DB-side filtering via .eq)', async () => {
        // The hook performs no client-side filtering — it trusts the DB response.
        const activeOnly = MOCK_ORDERS.filter(o => o.status === ORDER_STATUS.PREPARING)
        mockFromChain({ data: activeOnly })

        const { result } = renderHook(() => useOrdersPolling('biz-123'))

        await waitFor(() => expect(result.current.loading).toBe(false))
        expect(result.current.orders).toEqual(activeOnly)
    })

    // ── 4. refreshOrders re-fetches data ─────────────────────────────────────
    it('refreshOrders triggers a second fetch and updates orders', async () => {
        const firstBatch  = [MOCK_ORDERS[0]]
        const secondBatch = MOCK_ORDERS

        const limitMock  = vi.fn()
            .mockResolvedValueOnce({ data: firstBatch,  error: null })
            .mockResolvedValueOnce({ data: secondBatch, error: null })
        const orderMock  = vi.fn().mockReturnValue({ limit: limitMock })
        const eqMock     = vi.fn().mockReturnValue({ order: orderMock })
        const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
        supabase.from.mockReturnValue({ select: selectMock })

        const { result } = renderHook(() => useOrdersPolling('biz-123'))

        await waitFor(() => expect(result.current.orders).toEqual(firstBatch))

        await act(async () => {
            await result.current.refreshOrders()
        })

        expect(result.current.orders).toEqual(secondBatch)
        expect(limitMock).toHaveBeenCalledTimes(2)
    })

    // ── 5. Handles DB errors gracefully ──────────────────────────────────────
    it('sets loading=false and keeps orders empty when Supabase returns an error object', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        mockFromChain({ data: null, error: { message: 'DB connection failed' } })

        const { result } = renderHook(() => useOrdersPolling('biz-123'))

        await waitFor(() => expect(result.current.loading).toBe(false))
        expect(result.current.orders).toEqual([])
        consoleSpy.mockRestore()
    })

    it('sets loading=false and keeps orders empty when the fetch throws', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

        const limitMock  = vi.fn().mockRejectedValue(new Error('Network error'))
        const orderMock  = vi.fn().mockReturnValue({ limit: limitMock })
        const eqMock     = vi.fn().mockReturnValue({ order: orderMock })
        const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
        supabase.from.mockReturnValue({ select: selectMock })

        const { result } = renderHook(() => useOrdersPolling('biz-123'))

        await waitFor(() => expect(result.current.loading).toBe(false))
        expect(result.current.orders).toEqual([])
        consoleSpy.mockRestore()
    })

    // ── 6. Does not fetch without businessId ─────────────────────────────────
    it('does not call supabase.from when businessId is undefined', async () => {
        const { result } = renderHook(() => useOrdersPolling(undefined))
        await act(async () => {})
        expect(supabase.from).not.toHaveBeenCalled()
        expect(result.current.loading).toBe(true)
    })

    it('does not call supabase.from when businessId is null', async () => {
        renderHook(() => useOrdersPolling(null))
        await act(async () => {})
        expect(supabase.from).not.toHaveBeenCalled()
    })

    // ── Polling interval ──────────────────────────────────────────────────────
    it('re-fetches every 15 seconds via setInterval', async () => {
        vi.useFakeTimers()

        const limitMock  = vi.fn().mockResolvedValue({ data: MOCK_ORDERS, error: null })
        const orderMock  = vi.fn().mockReturnValue({ limit: limitMock })
        const eqMock     = vi.fn().mockReturnValue({ order: orderMock })
        const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
        supabase.from.mockReturnValue({ select: selectMock })

        renderHook(() => useOrdersPolling('biz-123'))

        // Flush initial fetch microtasks
        await act(async () => { await Promise.resolve() })
        expect(limitMock).toHaveBeenCalledTimes(1)

        // Advance one full interval
        await act(async () => {
            vi.advanceTimersByTime(15000)
            await Promise.resolve()
        })
        expect(limitMock).toHaveBeenCalledTimes(2)

        vi.useRealTimers()
    })

    it('clears the interval on unmount', async () => {
        vi.useFakeTimers()
        const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')
        mockFromChain({ data: [] })

        const { unmount } = renderHook(() => useOrdersPolling('biz-123'))
        await act(async () => { await Promise.resolve() })

        unmount()
        expect(clearIntervalSpy).toHaveBeenCalled()
        clearIntervalSpy.mockRestore()
        vi.useRealTimers()
    })

    // ── Exposed API shape ─────────────────────────────────────────────────────
    it('exposes { orders, loading, refreshOrders } with the correct types', async () => {
        mockFromChain({ data: [] })
        const { result } = renderHook(() => useOrdersPolling('biz-123'))
        await waitFor(() => expect(result.current.loading).toBe(false))

        expect(Array.isArray(result.current.orders)).toBe(true)
        expect(typeof result.current.loading).toBe('boolean')
        expect(typeof result.current.refreshOrders).toBe('function')
    })
})
