import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    isOnline,
    getOfflinePaymentQueue,
    queueOfflineCashPayment,
    processOfflineQueue,
    getSyncStatus,
    handleCashPayment
} from './offlinePayment.js';
import { supabase } from '../lib/supabaseClient.js';

vi.mock('../lib/supabaseClient.js');

describe('Offline Payment Service', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    describe('isOnline', () => {
        it('should detect online status', () => {
            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: true,
            });
            expect(isOnline()).toBe(true);
        });

        it('should detect offline status', () => {
            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: false,
            });
            expect(isOnline()).toBe(false);
        });
    });

    describe('queueOfflineCashPayment', () => {
        it('should queue a cash payment', () => {
            const paymentData = {
                order_id: 'order-123',
                amount_cents: 5000,
                business_id: 'biz-123',
                currency: 'ARS'
            };

            const result = queueOfflineCashPayment(paymentData);

            expect(result.order_id).toBe('order-123');
            expect(result.status).toBe('pending_sync');
            expect(result.payment_method).toBe('cash');
            expect(result.amount_gross_cents).toBe(5000);
        });

        it('should persist queue to localStorage', () => {
            const paymentData = {
                order_id: 'order-123',
                amount_cents: 5000,
                business_id: 'biz-123'
            };

            queueOfflineCashPayment(paymentData);
            const queue = getOfflinePaymentQueue();

            expect(queue).toHaveLength(1);
            expect(queue[0].order_id).toBe('order-123');
        });

        it('should generate unique offline IDs', () => {
            const paymentData = {
                order_id: 'order-123',
                amount_cents: 5000,
                business_id: 'biz-123'
            };

            const result1 = queueOfflineCashPayment(paymentData);
            const result2 = queueOfflineCashPayment(paymentData);

            expect(result1.id).not.toBe(result2.id);
        });
    });

    describe('getOfflinePaymentQueue', () => {
        it('should return empty array when no queue exists', () => {
            const queue = getOfflinePaymentQueue();
            expect(queue).toEqual([]);
        });

        it('should return queued payments', () => {
            const paymentData = {
                order_id: 'order-123',
                amount_cents: 5000,
                business_id: 'biz-123'
            };

            queueOfflineCashPayment(paymentData);
            const queue = getOfflinePaymentQueue();

            expect(queue).toHaveLength(1);
            expect(queue[0].order_id).toBe('order-123');
        });

        it('should handle corrupted localStorage gracefully', () => {
            localStorage.setItem('fs_offline_payments_queue', 'invalid json');
            const queue = getOfflinePaymentQueue();
            expect(queue).toEqual([]);
        });
    });

    describe('processOfflineQueue', () => {
        it('should not process when offline', async () => {
            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: false,
            });

            const paymentData = {
                order_id: 'order-123',
                amount_cents: 5000,
                business_id: 'biz-123'
            };
            queueOfflineCashPayment(paymentData);

            const result = await processOfflineQueue();

            expect(result.processed).toBe(0);
            expect(result.remaining).toBe(1);
        });

        it('should sync payments when online', async () => {
            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: true,
            });

            supabase.from.mockImplementation((table) => {
                if (table === 'transaction_ledger') {
                    return {
                        insert: vi.fn().mockReturnValue({
                            select: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: { id: 'ledger-123' },
                                    error: null
                                })
                            })
                        })
                    };
                }
                if (table === 'orders') {
                    return {
                        update: vi.fn().mockReturnValue({
                            eq: vi.fn().mockResolvedValue({
                                error: null
                            })
                        })
                    };
                }
            });

            const paymentData = {
                order_id: 'order-123',
                amount_cents: 5000,
                business_id: 'biz-123'
            };
            queueOfflineCashPayment(paymentData);

            const result = await processOfflineQueue();

            expect(result.processed).toBeGreaterThan(0);
            expect(supabase.from).toHaveBeenCalledWith('transaction_ledger');
        });

        it('should retry failed payments up to 5 times', async () => {
            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: true,
            });

            supabase.from.mockReturnValue({
                insert: vi.fn().mockResolvedValue({
                    data: null,
                    error: new Error('Network error')
                })
            });

            const paymentData = {
                order_id: 'order-123',
                amount_cents: 5000,
                business_id: 'biz-123'
            };
            const entry = queueOfflineCashPayment(paymentData);

            // Simulate 5 retries
            for (let i = 0; i < 5; i++) {
                await processOfflineQueue();
            }

            const queue = getOfflinePaymentQueue();
            const payment = queue.find(p => p.id === entry.id);

            expect(payment.sync_attempts).toBe(5);
        });
    });

    describe('handleCashPayment', () => {
        it('should handle online cash payment', async () => {
            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: true,
            });

            supabase.from.mockImplementation((table) => {
                if (table === 'transaction_ledger') {
                    return {
                        insert: vi.fn().mockReturnValue({
                            select: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: { id: 'ledger-123' },
                                    error: null
                                })
                            })
                        })
                    };
                }
                if (table === 'orders') {
                    return {
                        update: vi.fn().mockReturnValue({
                            eq: vi.fn().mockResolvedValue({
                                error: null
                            })
                        })
                    };
                }
            });

            const result = await handleCashPayment({
                orderId: 'order-123',
                amountCents: 5000,
                businessId: 'biz-123'
            });

            expect(result.success).toBe(true);
            expect(result.method).toBe('online');
        });

        it('should fallback to offline queue on online payment failure', async () => {
            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: true,
            });

            supabase.from.mockReturnValue({
                insert: vi.fn().mockResolvedValue({
                    data: null,
                    error: new Error('Sync failed')
                })
            });

            const result = await handleCashPayment({
                orderId: 'order-123',
                amountCents: 5000,
                businessId: 'biz-123'
            });

            expect(result.success).toBe(true);
            expect(result.method).toBe('offline');
            const queue = getOfflinePaymentQueue();
            expect(queue).toHaveLength(1);
        });

        it('should queue payment when offline', async () => {
            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: false,
            });

            const result = await handleCashPayment({
                orderId: 'order-123',
                amountCents: 5000,
                businessId: 'biz-123'
            });

            expect(result.success).toBe(true);
            expect(result.method).toBe('offline');
            const queue = getOfflinePaymentQueue();
            expect(queue).toHaveLength(1);
        });
    });

    describe('getSyncStatus', () => {
        it('should return null when no sync has occurred', () => {
            const status = getSyncStatus();
            expect(status).toBeNull();
        });

        it('should track sync status', async () => {
            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: true,
            });

            supabase.from.mockImplementation((table) => {
                if (table === 'transaction_ledger') {
                    return {
                        insert: vi.fn().mockReturnValue({
                            select: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: { id: 'ledger-123' },
                                    error: null
                                })
                            })
                        })
                    };
                }
                if (table === 'orders') {
                    return {
                        update: vi.fn().mockReturnValue({
                            eq: vi.fn().mockResolvedValue({
                                error: null
                            })
                        })
                    };
                }
            });

            const paymentData = {
                order_id: 'order-123',
                amount_cents: 5000,
                business_id: 'biz-123'
            };
            queueOfflineCashPayment(paymentData);
            await processOfflineQueue();

            const status = getSyncStatus();
            expect(status).not.toBeNull();
            expect(status.processed).toBeGreaterThan(0);
        });
    });
});
