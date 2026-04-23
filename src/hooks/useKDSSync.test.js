import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useKDSSync } from './useKDSSync'

// ─── Mock supabase ────────────────────────────────────────────────────────────
vi.mock('../lib/supabaseClient', () => ({
    supabase: {
        from: vi.fn(),
        rpc: vi.fn(),
        channel: vi.fn(),
        removeChannel: vi.fn(),
    },
}))

import { supabase } from '../lib/supabaseClient'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a fully-chained mock for:
 *   supabase.from(table).select('*').eq(...).in(...).order(...)
 *
 * The terminal call (order) resolves with { data, error }.
 */
function mockFromChain({ data = [], error = null } = {}) {
    const orderMock  = vi.fn().mockResolvedValue({ data, error })
    const inMock     = vi.fn().mockReturnValue({ order: orderMock })
    const eqMock     = vi.fn().mockReturnValue({ in: inMock })
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
    supabase.from.mockReturnValue({ select: selectMock })
    return { selectMock, eqMock, inMock, orderMock }
}

/**
 * Build a realtime channel mock for:
 *   supabase.channel(name).on(event, filter, callback).subscribe()
 *
 * Captures the realtime payload callback so tests can fire it directly.
 * Returns { captureCallback } — a ref object whose `.fn` property will hold
 * the captured callback once the hook's useEffect runs.
 */
function mockChannel() {
    const capture = { fn: null }
    const subscribeMock = vi.fn().mockReturnValue({})
    // channelMock must be returned by both .channel() and .on() so that
    // .subscribe() is reachable after .on() is called.
    const channelMock = {
        on: vi.fn().mockImplementation((_event, _filter, cb) => {
            capture.fn = cb
            return channelMock   // allows chaining: .on(...).subscribe()
        }),
        subscribe: subscribeMock,
    }
    supabase.channel.mockReturnValue(channelMock)
    return { channelMock, subscribeMock, capture }
}

const MOCK_KDS_ORDERS = [
    { id: 'order-1', business_id: 'biz-999', status: 'paid',    created_at: '2026-04-23T08:00:00Z' },
    { id: 'order-2', business_id: 'biz-999', status: 'cooking', created_at: '2026-04-23T08:05:00Z' },
    { id: 'order-3', business_id: 'biz-999', status: 'ready',   created_at: '2026-04-23T08:10:00Z' },
]

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useKDSSync', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        delete window.__camTechActive
    })

    afterEach(() => {
        delete window.__camTechActive
    })

    // ── 1. Loads KDS orders on mount ──────────────────────────────────────────
    it('fetches KDS orders on mount and sets loading=false', async () => {
        mockFromChain({ data: MOCK_KDS_ORDERS })
        mockChannel()

        const { result } = renderHook(() => useKDSSync('biz-999'))

        await waitFor(() => expect(result.current.loading).toBe(false))

        expect(supabase.from).toHaveBeenCalledWith('orders')
        expect(result.current.orders).toEqual(MOCK_KDS_ORDERS)
    })

    it('filters by paid/cooking/ready statuses via .in()', async () => {
        const { inMock } = mockFromChain({ data: MOCK_KDS_ORDERS })
        mockChannel()

        const { result } = renderHook(() => useKDSSync('biz-999'))
        await waitFor(() => expect(result.current.loading).toBe(false))

        expect(inMock).toHaveBeenCalledWith('status', ['paid', 'cooking', 'ready'])
    })

    it('queries with the correct business_id guard', async () => {
        const { eqMock } = mockFromChain({ data: MOCK_KDS_ORDERS })
        mockChannel()

        const { result } = renderHook(() => useKDSSync('biz-999'))
        await waitFor(() => expect(result.current.loading).toBe(false))

        expect(eqMock).toHaveBeenCalledWith('business_id', 'biz-999')
    })

    it('orders results ascending by created_at', async () => {
        const { orderMock } = mockFromChain({ data: MOCK_KDS_ORDERS })
        mockChannel()

        const { result } = renderHook(() => useKDSSync('biz-999'))
        await waitFor(() => expect(result.current.loading).toBe(false))

        expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: true })
    })

    it('subscribes to a realtime channel scoped to businessId', async () => {
        mockFromChain({ data: [] })
        const { subscribeMock } = mockChannel()

        renderHook(() => useKDSSync('biz-999'))
        await act(async () => { await Promise.resolve() })

        expect(supabase.channel).toHaveBeenCalledWith('kds-silo-biz-999')
        expect(subscribeMock).toHaveBeenCalled()
    })

    it('removes the realtime channel on unmount', async () => {
        mockFromChain({ data: [] })
        mockChannel()

        const { unmount } = renderHook(() => useKDSSync('biz-999'))
        await act(async () => { await Promise.resolve() })

        unmount()
        expect(supabase.removeChannel).toHaveBeenCalled()
    })

    // ── 2. transitionOrderState calls RPC correctly ────────────────────────────
    it('calls supabase.rpc with transition_order_state and the correct arguments', async () => {
        mockFromChain({ data: MOCK_KDS_ORDERS })
        mockChannel()
        supabase.rpc.mockResolvedValue({ data: null, error: null })

        const { result } = renderHook(() => useKDSSync('biz-999'))
        await waitFor(() => expect(result.current.loading).toBe(false))

        await act(async () => {
            await result.current.transitionOrderState('order-2', 'cooking', 'ready')
        })

        expect(supabase.rpc).toHaveBeenCalledWith('transition_order_state', {
            p_order_id: 'order-2',
            p_new_status: 'ready',
        })
    })

    // ── 3. Transitions from cooking → ready succeed ────────────────────────────
    it('applies an optimistic update immediately before the RPC resolves', async () => {
        vi.useFakeTimers()

        mockFromChain({ data: MOCK_KDS_ORDERS })
        mockChannel()

        // RPC resolves after a delay so we can inspect the optimistic state
        supabase.rpc.mockImplementation(
            () => new Promise(resolve => setTimeout(() => resolve({ data: null, error: null }), 100))
        )

        const { result } = renderHook(() => useKDSSync('biz-999'))
        // Flush fetch microtasks without advancing timers
        await act(async () => { await Promise.resolve() })
        await act(async () => { await Promise.resolve() })

        // Start the transition without awaiting it
        act(() => {
            result.current.transitionOrderState('order-2', 'cooking', 'ready')
        })

        // Optimistic update is synchronous — visible before RPC finishes
        const optimisticOrder = result.current.orders.find(o => o.id === 'order-2')
        expect(optimisticOrder?.status).toBe('ready')
        expect(optimisticOrder?.isOptimistic).toBe(true)

        // Clean up pending timers
        await act(async () => { vi.runAllTimers() })
        vi.useRealTimers()
    })

    it('marks isOptimistic=false after the server confirms via realtime UPDATE', async () => {
        mockFromChain({ data: MOCK_KDS_ORDERS })
        const { capture } = mockChannel()
        supabase.rpc.mockResolvedValue({ data: null, error: null })

        const { result } = renderHook(() => useKDSSync('biz-999'))
        await waitFor(() => expect(result.current.loading).toBe(false))

        await act(async () => {
            await result.current.transitionOrderState('order-2', 'cooking', 'ready')
        })

        // Simulate server confirmation via realtime UPDATE
        act(() => {
            capture.fn?.({
                eventType: 'UPDATE',
                new: { id: 'order-2', business_id: 'biz-999', status: 'ready', isOptimistic: false },
                old: { id: 'order-2', business_id: 'biz-999', status: 'cooking' },
            })
        })

        const confirmed = result.current.orders.find(o => o.id === 'order-2')
        expect(confirmed?.isOptimistic).toBe(false)
        expect(confirmed?.status).toBe('ready')
    })

    // ── 4. Handles failed transitions ─────────────────────────────────────────
    it('rolls back the optimistic update immediately when RPC returns an error', async () => {
        mockFromChain({ data: MOCK_KDS_ORDERS })
        mockChannel()
        supabase.rpc.mockResolvedValue({ data: null, error: { message: 'Invalid transition' } })

        const { result } = renderHook(() => useKDSSync('biz-999'))
        await waitFor(() => expect(result.current.loading).toBe(false))

        await act(async () => {
            await result.current.transitionOrderState('order-2', 'cooking', 'ready')
        })

        const rolledBack = result.current.orders.find(o => o.id === 'order-2')
        expect(rolledBack?.status).toBe('cooking')
        expect(rolledBack?.isOptimistic).toBe(false)
    })

    it('triggers snapback to originalStatus after 8 s if no server confirmation arrives', async () => {
        vi.useFakeTimers()

        mockFromChain({ data: MOCK_KDS_ORDERS })
        mockChannel()
        // RPC succeeds but realtime never fires
        supabase.rpc.mockResolvedValue({ data: null, error: null })

        const { result } = renderHook(() => useKDSSync('biz-999'))
        await act(async () => { await Promise.resolve() })
        await act(async () => { await Promise.resolve() })

        await act(async () => {
            await result.current.transitionOrderState('order-2', 'cooking', 'ready')
        })

        // Optimistic update applied
        expect(result.current.orders.find(o => o.id === 'order-2')?.status).toBe('ready')

        // Advance past the 8-second snapback timeout
        act(() => { vi.advanceTimersByTime(8001) })

        const snapbackOrder = result.current.orders.find(o => o.id === 'order-2')
        expect(snapbackOrder?.status).toBe('cooking')
        expect(snapbackOrder?.isOptimistic).toBe(false)

        vi.useRealTimers()
    })

    // ── 5. Does not operate without businessId ────────────────────────────────
    it('does not call supabase.from when businessId is undefined', async () => {
        renderHook(() => useKDSSync(undefined))
        await act(async () => { await Promise.resolve() })

        expect(supabase.from).not.toHaveBeenCalled()
        expect(supabase.channel).not.toHaveBeenCalled()
    })

    it('does not call supabase.from when businessId is null', async () => {
        renderHook(() => useKDSSync(null))
        await act(async () => { await Promise.resolve() })

        expect(supabase.from).not.toHaveBeenCalled()
        expect(supabase.channel).not.toHaveBeenCalled()
    })

    it('does not apply a transition when window.__camTechActive is true', async () => {
        mockFromChain({ data: MOCK_KDS_ORDERS })
        mockChannel()
        supabase.rpc.mockResolvedValue({ data: null, error: null })
        window.__camTechActive = true

        const { result } = renderHook(() => useKDSSync('biz-999'))
        await waitFor(() => expect(result.current.loading).toBe(false))

        await act(async () => {
            await result.current.transitionOrderState('order-2', 'cooking', 'ready')
        })

        expect(supabase.rpc).not.toHaveBeenCalled()
        const order = result.current.orders.find(o => o.id === 'order-2')
        expect(order?.status).toBe('cooking')
    })

    // ── Realtime event handling ───────────────────────────────────────────────
    it('inserts a new paid order received via realtime INSERT', async () => {
        mockFromChain({ data: [MOCK_KDS_ORDERS[0]] })
        const { capture } = mockChannel()

        const { result } = renderHook(() => useKDSSync('biz-999'))
        await waitFor(() => expect(result.current.loading).toBe(false))

        act(() => {
            capture.fn?.({
                eventType: 'INSERT',
                new: { id: 'order-new', business_id: 'biz-999', status: 'paid', created_at: '2026-04-23T09:00:00Z' },
                old: null,
            })
        })

        expect(result.current.orders.find(o => o.id === 'order-new')).toBeDefined()
    })

    it('ignores a realtime INSERT for a non-KDS status (e.g. delivered)', async () => {
        mockFromChain({ data: [MOCK_KDS_ORDERS[0]] })
        const { capture } = mockChannel()

        const { result } = renderHook(() => useKDSSync('biz-999'))
        await waitFor(() => expect(result.current.loading).toBe(false))

        const countBefore = result.current.orders.length

        act(() => {
            capture.fn?.({
                eventType: 'INSERT',
                new: { id: 'order-delivered', business_id: 'biz-999', status: 'delivered' },
                old: null,
            })
        })

        expect(result.current.orders.length).toBe(countBefore)
    })

    it('removes an order from KDS when realtime UPDATE sets status to completed', async () => {
        mockFromChain({ data: MOCK_KDS_ORDERS })
        const { capture } = mockChannel()

        const { result } = renderHook(() => useKDSSync('biz-999'))
        await waitFor(() => expect(result.current.loading).toBe(false))

        act(() => {
            capture.fn?.({
                eventType: 'UPDATE',
                new: { id: 'order-3', business_id: 'biz-999', status: 'completed' },
                old: { id: 'order-3', business_id: 'biz-999', status: 'ready' },
            })
        })

        expect(result.current.orders.find(o => o.id === 'order-3')).toBeUndefined()
    })

    it('removes an order from KDS when realtime DELETE fires', async () => {
        mockFromChain({ data: MOCK_KDS_ORDERS })
        const { capture } = mockChannel()

        const { result } = renderHook(() => useKDSSync('biz-999'))
        await waitFor(() => expect(result.current.loading).toBe(false))

        act(() => {
            capture.fn?.({
                eventType: 'DELETE',
                new: null,
                old: { id: 'order-1', business_id: 'biz-999' },
            })
        })

        expect(result.current.orders.find(o => o.id === 'order-1')).toBeUndefined()
    })

    it('ignores realtime UPDATE events when window.__camTechActive is true', async () => {
        mockFromChain({ data: MOCK_KDS_ORDERS })
        const { capture } = mockChannel()

        const { result } = renderHook(() => useKDSSync('biz-999'))
        await waitFor(() => expect(result.current.loading).toBe(false))

        window.__camTechActive = true

        act(() => {
            capture.fn?.({
                eventType: 'UPDATE',
                new: { id: 'order-2', business_id: 'biz-999', status: 'ready' },
                old: { id: 'order-2', business_id: 'biz-999', status: 'cooking' },
            })
        })

        // Order should remain unchanged
        expect(result.current.orders.find(o => o.id === 'order-2')?.status).toBe('cooking')
    })

    // ── Exposed API shape ─────────────────────────────────────────────────────
    it('exposes { orders, loading, transitionOrderState, fetchOrders } with correct types', async () => {
        mockFromChain({ data: [] })
        mockChannel()

        const { result } = renderHook(() => useKDSSync('biz-999'))
        await waitFor(() => expect(result.current.loading).toBe(false))

        expect(Array.isArray(result.current.orders)).toBe(true)
        expect(typeof result.current.loading).toBe('boolean')
        expect(typeof result.current.transitionOrderState).toBe('function')
        expect(typeof result.current.fetchOrders).toBe('function')
    })

    it('fetchOrders re-fetches orders from the database', async () => {
        const orderMock  = vi.fn()
            .mockResolvedValueOnce({ data: [MOCK_KDS_ORDERS[0]], error: null })
            .mockResolvedValueOnce({ data: MOCK_KDS_ORDERS,       error: null })
        const inMock     = vi.fn().mockReturnValue({ order: orderMock })
        const eqMock     = vi.fn().mockReturnValue({ in: inMock })
        const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
        supabase.from.mockReturnValue({ select: selectMock })
        mockChannel()

        const { result } = renderHook(() => useKDSSync('biz-999'))
        await waitFor(() => expect(result.current.orders).toHaveLength(1))

        await act(async () => { await result.current.fetchOrders() })

        expect(result.current.orders).toHaveLength(MOCK_KDS_ORDERS.length)
    })
})
