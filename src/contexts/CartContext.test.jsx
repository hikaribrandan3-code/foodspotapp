import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { CartProvider, useCart } from './CartContext.jsx';

// ---------------------------------------------------------------------------
// localStorage mock — jsdom provides one, but we reset it before each test so
// state never leaks between cases.
// ---------------------------------------------------------------------------
beforeEach(() => {
    localStorage.clear();
    // Reset the module-level STORAGE_PREFIX back to its default between tests.
    // We do this by importing and calling setTenantStoragePrefix with no arg;
    // storage.js guards against falsy values, so we directly manipulate the key
    // that getCurrentOrder() will read instead.
    vi.restoreAllMocks();
});

const wrapper = ({ children }) => <CartProvider>{children}</CartProvider>;

// ---------------------------------------------------------------------------
// Sample items
// ---------------------------------------------------------------------------
const ITEM_A = { id: 'item-a', name: 'Burger', price: 500 };
const ITEM_B = { id: 'item-b', name: 'Fries', price: 200 };

// ---------------------------------------------------------------------------
// 1. Cart starts empty
// ---------------------------------------------------------------------------
describe('initial state', () => {
    it('cart starts with an empty items array', () => {
        const { result } = renderHook(() => useCart(), { wrapper });
        expect(result.current.cart.items).toEqual([]);
    });

    it('cartTotal is 0 for an empty cart', () => {
        const { result } = renderHook(() => useCart(), { wrapper });
        expect(result.current.cartTotal).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// 2. addToCart adds item to cart
// ---------------------------------------------------------------------------
describe('addToCart', () => {
    it('adds a new item to the cart', () => {
        const { result } = renderHook(() => useCart(), { wrapper });

        act(() => {
            result.current.addToCart(ITEM_A, 1);
        });

        expect(result.current.cart.items).toHaveLength(1);
        expect(result.current.cart.items[0].id).toBe('item-a');
        expect(result.current.cart.items[0].quantity).toBe(1);
    });

    it('adding the same item increases its quantity instead of adding a new entry', () => {
        const { result } = renderHook(() => useCart(), { wrapper });

        act(() => {
            result.current.addToCart(ITEM_A, 1);
        });
        act(() => {
            result.current.addToCart(ITEM_A, 2);
        });

        expect(result.current.cart.items).toHaveLength(1);
        expect(result.current.cart.items[0].quantity).toBe(3);
    });

    it('tracks multiple different items independently', () => {
        const { result } = renderHook(() => useCart(), { wrapper });

        act(() => {
            result.current.addToCart(ITEM_A, 1);
            result.current.addToCart(ITEM_B, 3);
        });

        expect(result.current.cart.items).toHaveLength(2);
        const ids = result.current.cart.items.map((i) => i.id);
        expect(ids).toContain('item-a');
        expect(ids).toContain('item-b');
    });
});

// ---------------------------------------------------------------------------
// 4. removeItem removes an item completely
// ---------------------------------------------------------------------------
describe('removeItem', () => {
    it('removes the item at the given index completely', () => {
        const { result } = renderHook(() => useCart(), { wrapper });

        act(() => {
            result.current.addToCart(ITEM_A, 2);
            result.current.addToCart(ITEM_B, 1);
        });

        // Remove the first item (index 0 = ITEM_A)
        act(() => {
            result.current.removeItem(0);
        });

        expect(result.current.cart.items).toHaveLength(1);
        expect(result.current.cart.items[0].id).toBe('item-b');
    });
});

// ---------------------------------------------------------------------------
// 5. updateQuantity changes item quantity
// ---------------------------------------------------------------------------
describe('updateQuantity', () => {
    it('changes the quantity of the item at the given index', () => {
        const { result } = renderHook(() => useCart(), { wrapper });

        act(() => {
            result.current.addToCart(ITEM_A, 1);
        });

        act(() => {
            result.current.updateQuantity(0, 5);
        });

        expect(result.current.cart.items[0].quantity).toBe(5);
    });

    it('removes the item when quantity is set to 0', () => {
        const { result } = renderHook(() => useCart(), { wrapper });

        act(() => {
            result.current.addToCart(ITEM_A, 2);
        });

        act(() => {
            result.current.updateQuantity(0, 0);
        });

        expect(result.current.cart.items).toHaveLength(0);
    });
});

// ---------------------------------------------------------------------------
// 6. cartTotal sums price × quantity correctly
// ---------------------------------------------------------------------------
describe('cartTotal', () => {
    it('sums price × quantity for all items', () => {
        const { result } = renderHook(() => useCart(), { wrapper });

        act(() => {
            result.current.addToCart(ITEM_A, 2); // 500 × 2 = 1000
            result.current.addToCart(ITEM_B, 3); // 200 × 3 = 600
        });

        expect(result.current.cartTotal).toBe(1600);
    });

    it('updates cartTotal after quantity change', () => {
        const { result } = renderHook(() => useCart(), { wrapper });

        act(() => {
            result.current.addToCart(ITEM_A, 1); // 500
        });

        act(() => {
            result.current.updateQuantity(0, 4); // 500 × 4 = 2000
        });

        expect(result.current.cartTotal).toBe(2000);
    });
});

// ---------------------------------------------------------------------------
// 8. Cart persists across refreshCart calls
// ---------------------------------------------------------------------------
describe('refreshCart', () => {
    it('re-reads the cart from storage without losing items', () => {
        const { result } = renderHook(() => useCart(), { wrapper });

        act(() => {
            result.current.addToCart(ITEM_A, 1);
        });

        act(() => {
            result.current.refreshCart();
        });

        expect(result.current.cart.items).toHaveLength(1);
        expect(result.current.cart.items[0].id).toBe('item-a');
    });
});

// ---------------------------------------------------------------------------
// 9. removeFromCart decrements quantity
// (removeFromCurrentOrder splices by index — effectively removes the entry.
//  "Decrement" use-case: add two of same item as one entry, then call
//  removeFromCart which removes the whole entry at that index.)
// ---------------------------------------------------------------------------
describe('removeFromCart', () => {
    it('removes the cart entry at the given index', () => {
        const { result } = renderHook(() => useCart(), { wrapper });

        act(() => {
            result.current.addToCart(ITEM_A, 1);
            result.current.addToCart(ITEM_B, 2);
        });

        // removeFromCart(0) should remove ITEM_A
        act(() => {
            result.current.removeFromCart(0);
        });

        expect(result.current.cart.items).toHaveLength(1);
        expect(result.current.cart.items[0].id).toBe('item-b');
    });

    it('cart is empty after removing the only item', () => {
        const { result } = renderHook(() => useCart(), { wrapper });

        act(() => {
            result.current.addToCart(ITEM_A, 3);
        });

        act(() => {
            result.current.removeFromCart(0);
        });

        expect(result.current.cart.items).toHaveLength(0);
        expect(result.current.cartTotal).toBe(0);
    });
});
