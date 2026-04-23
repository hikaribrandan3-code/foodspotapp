import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSplitPayment } from './useSplitPayment.js';
import { supabase } from '../lib/supabaseClient.js';

vi.mock('../lib/supabaseClient.js');
vi.mock('../utils/guestToken.js', () => ({
    getGuestToken: () => 'test-guest-token'
}));

describe('useSplitPayment', () => {
    const businessId = 'biz-123';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createLedger', () => {
        it('should create a table ledger', async () => {
            const mockLedger = {
                id: 'ledger-123',
                business_id: businessId,
                table_number: 5,
                order_id: 'order-123',
                total_due: 10000,
                split_count: 1,
                status: 'pending'
            };

            supabase.from.mockReturnValue({
                insert: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: mockLedger,
                            error: null
                        })
                    })
                })
            });

            const { result } = renderHook(() => useSplitPayment(businessId));

            let createResult;
            await act(async () => {
                createResult = await result.current.createLedger(5, 'order-123', 10000);
            });

            expect(createResult.success).toBe(true);
            expect(createResult.ledger.id).toBe('ledger-123');
            expect(result.current.activeLedger).toEqual(mockLedger);
        });

        it('should fail if no business ID', async () => {
            const { result } = renderHook(() => useSplitPayment(null));

            let createResult;
            await act(async () => {
                createResult = await result.current.createLedger(5, 'order-123', 10000);
            });

            expect(createResult.success).toBe(false);
            expect(createResult.error).toBe('No business ID');
        });

        it('should handle database errors', async () => {
            supabase.from.mockReturnValue({
                insert: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: null,
                            error: new Error('DB error')
                        })
                    })
                })
            });

            const { result } = renderHook(() => useSplitPayment(businessId));

            let createResult;
            await act(async () => {
                createResult = await result.current.createLedger(5, 'order-123', 10000);
            });

            expect(createResult.success).toBe(false);
            expect(createResult.error).toBe('DB error');
        });
    });

    describe('splitBill', () => {
        it('should split a bill evenly', async () => {
            const mockLedger = {
                id: 'ledger-123',
                total_due: 10000,
                split_count: 1
            };

            const mockSplits = [
                {
                    id: 'split-1',
                    ledger_id: 'ledger-123',
                    participant_name: 'Person 1',
                    amount: 5000,
                    status: 'pending'
                },
                {
                    id: 'split-2',
                    ledger_id: 'ledger-123',
                    participant_name: 'Person 2',
                    amount: 5000,
                    status: 'pending'
                }
            ];

            supabase.from.mockImplementation((table) => {
                if (table === 'table_ledgers') {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: mockLedger,
                                    error: null
                                })
                            })
                        }),
                        update: vi.fn().mockReturnValue({
                            eq: vi.fn().mockResolvedValue({
                                error: null
                            })
                        })
                    };
                }
                if (table === 'split_payments') {
                    return {
                        insert: vi.fn().mockReturnValue({
                            select: vi.fn().mockResolvedValue({
                                data: mockSplits,
                                error: null
                            })
                        })
                    };
                }
            });

            const { result } = renderHook(() => useSplitPayment(businessId));

            let splitResult;
            await act(async () => {
                splitResult = await result.current.splitBill('ledger-123', 2);
            });

            expect(splitResult.success).toBe(true);
            expect(splitResult.splits).toHaveLength(2);
            expect(splitResult.splits[0].amount).toBe(5000);
            expect(splitResult.splits[1].amount).toBe(5000);
        });

        it('should handle uneven splits with remainder', async () => {
            const mockLedger = {
                id: 'ledger-123',
                total_due: 10001, // Odd amount
                split_count: 1
            };

            const mockSplits = [
                { id: 'split-1', amount: 3333, status: 'pending' },
                { id: 'split-2', amount: 3333, status: 'pending' },
                { id: 'split-3', amount: 3335, status: 'pending' } // Gets remainder
            ];

            supabase.from.mockImplementation((table) => {
                if (table === 'table_ledgers') {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: mockLedger,
                                    error: null
                                })
                            })
                        }),
                        update: vi.fn().mockReturnValue({
                            eq: vi.fn().mockResolvedValue({
                                error: null
                            })
                        })
                    };
                }
                if (table === 'split_payments') {
                    return {
                        insert: vi.fn().mockReturnValue({
                            select: vi.fn().mockResolvedValue({
                                data: mockSplits,
                                error: null
                            })
                        })
                    };
                }
            });

            const { result } = renderHook(() => useSplitPayment(businessId));

            let splitResult;
            await act(async () => {
                splitResult = await result.current.splitBill('ledger-123', 3);
            });

            expect(splitResult.success).toBe(true);
            const total = splitResult.splits.reduce((sum, s) => sum + s.amount, 0);
            expect(total).toBe(10001);
        });
    });

    describe('paySplitWithCard', () => {
        it('should deduct from wallet balance', async () => {
            const mockWallet = {
                id: 'wallet-123',
                card_id: 'card-123',
                balance: 10000,
                status: 'active'
            };

            const mockSplit = {
                id: 'split-123',
                ledger_id: 'ledger-123',
                amount: 5000
            };

            const mockLedger = {
                total_paid: 0,
                total_due: 10000
            };

            supabase.from.mockImplementation((table) => {
                if (table === 'wallets') {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: mockWallet,
                                    error: null
                                })
                            })
                        })
                    };
                }
                if (table === 'split_payments') {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: mockSplit,
                                    error: null
                                })
                            })
                        }),
                        update: vi.fn().mockReturnValue({
                            eq: vi.fn().mockResolvedValue({
                                error: null
                            })
                        })
                    };
                }
                if (table === 'table_ledgers') {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: mockLedger,
                                    error: null
                                })
                            })
                        }),
                        update: vi.fn().mockReturnValue({
                            eq: vi.fn().mockResolvedValue({
                                error: null
                            })
                        })
                    };
                }
            });

            supabase.rpc = vi.fn().mockResolvedValue({
                data: null,
                error: null
            });

            const { result } = renderHook(() => useSplitPayment(businessId));

            let payResult;
            await act(async () => {
                payResult = await result.current.paySplitWithCard('split-123', 'card-123');
            });

            expect(payResult.success).toBe(true);
            expect(supabase.rpc).toHaveBeenCalledWith('deduct_wallet_balance', expect.objectContaining({
                p_wallet_id: 'wallet-123',
                p_amount: 5000
            }));
        });

        it('should fail if insufficient balance', async () => {
            const mockWallet = {
                id: 'wallet-123',
                card_id: 'card-123',
                balance: 2000, // Less than needed
                status: 'active'
            };

            const mockSplit = {
                id: 'split-123',
                amount: 5000
            };

            supabase.from.mockImplementation((table) => {
                if (table === 'wallets') {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: mockWallet,
                                    error: null
                                })
                            })
                        })
                    };
                }
                if (table === 'split_payments') {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: mockSplit,
                                    error: null
                                })
                            })
                        })
                    };
                }
            });

            const { result } = renderHook(() => useSplitPayment(businessId));

            let payResult;
            await act(async () => {
                payResult = await result.current.paySplitWithCard('split-123', 'card-123');
            });

            expect(payResult.success).toBe(false);
            expect(payResult.error).toBe('Saldo insuficiente');
        });

        it('should fail if card is inactive', async () => {
            const mockWallet = {
                id: 'wallet-123',
                card_id: 'card-123',
                balance: 10000,
                status: 'inactive'
            };

            supabase.from.mockImplementation((table) => {
                if (table === 'wallets') {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: mockWallet,
                                    error: null
                                })
                            })
                        })
                    };
                }
            });

            const { result } = renderHook(() => useSplitPayment(businessId));

            let payResult;
            await act(async () => {
                payResult = await result.current.paySplitWithCard('split-123', 'card-123');
            });

            expect(payResult.success).toBe(false);
            expect(payResult.error).toBe('Tarjeta inactiva');
        });
    });

    describe('getLedgerStatus', () => {
        it('should retrieve ledger status', async () => {
            const mockLedger = {
                id: 'ledger-123',
                total_paid: 5000,
                total_due: 10000,
                status: 'pending'
            };

            supabase.from.mockImplementation((table) => {
                if (table === 'table_ledgers') {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: mockLedger,
                                    error: null
                                })
                            })
                        })
                    };
                }
            });

            const { result } = renderHook(() => useSplitPayment(businessId));

            let statusResult;
            await act(async () => {
                statusResult = await result.current.getLedgerStatus('ledger-123');
            });

            expect(statusResult.success).toBe(true);
            expect(statusResult.ledger.total_paid).toBe(5000);
            expect(result.current.activeLedger).toEqual(mockLedger);
        });
    });
});
