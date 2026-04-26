// src/hooks/useOrderFlow.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOrderFlow } from './useOrderFlow.js';
import { supabase } from '../lib/supabaseClient.js';

vi.mock('../lib/supabaseClient.js');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a fully-chained Supabase mock for the 'orders' table.
 * Each operation returns the next chainable object, with the terminal
 * call resolving to `{ data, error }`.
 */
function buildOrdersMock({ data = null, error = null } = {}) {
    return {
        insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data, error }),
            }),
        }),
        select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data, error }),
            }),
        }),
        update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error }),
        }),
    };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useOrderFlow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // -----------------------------------------------------------------------
    // createOrder
    // -----------------------------------------------------------------------
    describe('createOrder', () => {
        it('sets status to paid_unreleased for cash payment', async () => {
            const mockOrder = {
                id: 'order-001',
                status: 'paid_unreleased',
                paymentMethod: 'cash',
                total: 5000,
            };

            // Capture the mock table object so we can inspect calls later.
            const ordersMock = buildOrdersMock({ data: mockOrder });
            supabase.from.mockImplementation((table) => {
                if (table === 'orders') return ordersMock;
            });

            const { result } = renderHook(() => useOrderFlow());

            let response;
            await act(async () => {
                response = await result.current.createOrder({
                    paymentMethod: 'cash',
                    total: 5000,
                    items: [],
                });
            });

            expect(response.success).toBe(true);
            expect(response.order.status).toBe('paid_unreleased');

            // Verify the payload sent to insert included the correct status.
            expect(ordersMock.insert).toHaveBeenCalledWith(
                expect.objectContaining({ status: 'paid_unreleased' })
            );
        });

        it('sets status to pending for mercadopago payment', async () => {
            const mockOrder = {
                id: 'order-002',
                status: 'pending',
                paymentMethod: 'mercadopago',
                total: 8000,
            };

            const ordersMock = buildOrdersMock({ data: mockOrder });
            supabase.from.mockImplementation((table) => {
                if (table === 'orders') return ordersMock;
            });

            const { result } = renderHook(() => useOrderFlow());

            let response;
            await act(async () => {
                response = await result.current.createOrder({
                    paymentMethod: 'mercadopago',
                    total: 8000,
                    items: [],
                });
            });

            expect(response.success).toBe(true);
            expect(response.order.status).toBe('pending');

            expect(ordersMock.insert).toHaveBeenCalledWith(
                expect.objectContaining({ status: 'pending' })
            );
        });

        it('fails gracefully on DB error', async () => {
            const dbError = new Error('Connection timeout');

            supabase.from.mockImplementation((table) => {
                if (table === 'orders') return buildOrdersMock({ data: null, error: dbError });
            });

            const { result } = renderHook(() => useOrderFlow());

            let response;
            await act(async () => {
                response = await result.current.createOrder({
                    paymentMethod: 'cash',
                    total: 1000,
                    items: [],
                });
            });

            expect(response.success).toBe(false);
            expect(response.error).toBe('Connection timeout');
            // Hook-level error state should also reflect the failure
            expect(result.current.error).toBe('Connection timeout');
        });
    });

    // -----------------------------------------------------------------------
    // getOrderStatus
    // -----------------------------------------------------------------------
    describe('getOrderStatus', () => {
        it('returns the current order state for a given orderId', async () => {
            const mockOrder = {
                id: 'order-003',
                status: 'preparing',
                total: 3500,
            };

            const ordersMock = buildOrdersMock({ data: mockOrder });
            supabase.from.mockImplementation((table) => {
                if (table === 'orders') return ordersMock;
            });

            const { result } = renderHook(() => useOrderFlow());

            let response;
            await act(async () => {
                response = await result.current.getOrderStatus('order-003');
            });

            expect(response.success).toBe(true);
            expect(response.order.id).toBe('order-003');
            expect(response.order.status).toBe('preparing');

            // Verify select() was called, then eq('id', orderId) was chained on.
            expect(ordersMock.select).toHaveBeenCalled();
            const selectChain = ordersMock.select.mock.results[0].value;
            expect(selectChain.eq).toHaveBeenCalledWith('id', 'order-003');
        });

        it('returns an error when no orderId is provided', async () => {
            const { result } = renderHook(() => useOrderFlow());

            let response;
            await act(async () => {
                response = await result.current.getOrderStatus(undefined);
            });

            expect(response.success).toBe(false);
            expect(response.error).toBe('No order ID provided');
        });
    });

    // -----------------------------------------------------------------------
    // cancelOrder
    // -----------------------------------------------------------------------
    describe('cancelOrder', () => {
        it('cancels via advance_order_status RPC with the correct status enum', async () => {
            supabase.rpc = vi.fn().mockResolvedValue({
                data: { success: true, from_status: 'preparing', to_status: 'cancelled' },
                error: null,
            });

            const { result } = renderHook(() => useOrderFlow());

            let response;
            await act(async () => {
                response = await result.current.cancelOrder('order-004');
            });

            expect(response.success).toBe(true);

            // Verify the FSM RPC was called with the correct (NOT 'cancelado') enum.
            expect(supabase.rpc).toHaveBeenCalledWith('advance_order_status', {
                p_order_id: 'order-004',
                p_target_status: 'cancelled',
                p_cancel_reason: 'Cancelled via order flow',
            });
        });

        it('returns an error when no orderId is provided', async () => {
            const { result } = renderHook(() => useOrderFlow());

            let response;
            await act(async () => {
                response = await result.current.cancelOrder(null);
            });

            expect(response.success).toBe(false);
            expect(response.error).toBe('No order ID provided');
        });

        it('fails gracefully when the RPC errors', async () => {
            const rpcError = new Error('Row not found');
            supabase.rpc = vi.fn().mockResolvedValue({ data: null, error: rpcError });

            const { result } = renderHook(() => useOrderFlow());

            let response;
            await act(async () => {
                response = await result.current.cancelOrder('order-005');
            });

            expect(response.success).toBe(false);
            expect(response.error).toBe('Row not found');
        });

        it('returns the FSM rejection message when the RPC reports !success', async () => {
            supabase.rpc = vi.fn().mockResolvedValue({
                data: { success: false, error: 'INVALID_TRANSITION', message: 'No se puede cancelar' },
                error: null,
            });

            const { result } = renderHook(() => useOrderFlow());

            let response;
            await act(async () => {
                response = await result.current.cancelOrder('order-006');
            });

            expect(response.success).toBe(false);
            expect(response.error).toBe('No se puede cancelar');
        });
    });

    // -----------------------------------------------------------------------
    // loading / error state management
    // -----------------------------------------------------------------------
    describe('hook state', () => {
        it('exposes loading and error state, defaulting to false/null', () => {
            const { result } = renderHook(() => useOrderFlow());

            expect(result.current.loading).toBe(false);
            expect(result.current.error).toBeNull();
        });

        it('resets error to null on a successful subsequent call', async () => {
            // First call errors
            const dbError = new Error('Temporary failure');
            supabase.from.mockImplementationOnce((table) => {
                if (table === 'orders') return buildOrdersMock({ data: null, error: dbError });
            });

            // Second call succeeds
            const mockOrder = { id: 'order-006', status: 'pending' };
            supabase.from.mockImplementation((table) => {
                if (table === 'orders') return buildOrdersMock({ data: mockOrder });
            });

            const { result } = renderHook(() => useOrderFlow());

            await act(async () => {
                await result.current.createOrder({ paymentMethod: 'mercadopago', items: [] });
            });
            expect(result.current.error).toBe('Temporary failure');

            await act(async () => {
                await result.current.createOrder({ paymentMethod: 'mercadopago', items: [] });
            });
            expect(result.current.error).toBeNull();
        });
    });
});
