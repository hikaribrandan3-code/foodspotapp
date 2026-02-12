import { createContext, useContext, useState, useCallback } from 'react'
import { addToCurrentOrder, getCurrentOrder, updateItemQuantity, removeFromCurrentOrder } from '../utils/storage.js'

const CartContext = createContext(null)

export function CartProvider({ children }) {
    const [cart, setCart] = useState(() => getCurrentOrder())
    const [sheetItem, setSheetItem] = useState(null)
    const [sheetQuantity, setSheetQuantity] = useState(1)

    // Refresh cart from storage
    const refreshCart = useCallback(() => {
        setCart(getCurrentOrder())
    }, [])

    // Open the Order Sheet for an item
    const openOrderSheet = useCallback((item) => {
        setSheetItem(item)
        setSheetQuantity(1)
    }, [])

    // Close the Order Sheet
    const closeOrderSheet = useCallback(() => {
        setSheetItem(null)
        setSheetQuantity(1)
    }, [])

    // Add item to cart and close sheet
    const addItemToCart = useCallback(() => {
        if (!sheetItem) return
        addToCurrentOrder(sheetItem, sheetQuantity, [])
        refreshCart()
        closeOrderSheet()
        if (navigator.vibrate) navigator.vibrate([30, 50])
    }, [sheetItem, sheetQuantity, refreshCart, closeOrderSheet])

    // DIRECT ADD (Instant Velocity)
    const addToCart = useCallback((item, quantity = 1, extras = [], variants = []) => {
        addToCurrentOrder(item, quantity, extras, variants)
        refreshCart()
    }, [refreshCart])

    // DIRECT REMOVE
    const removeFromCart = useCallback((index) => {
        removeFromCurrentOrder(index)
        refreshCart()
    }, [refreshCart])

    // Update quantity in cart
    const updateQuantity = useCallback((index, quantity) => {
        updateItemQuantity(index, quantity)
        refreshCart()
    }, [refreshCart])

    // Remove item from cart
    const removeItem = useCallback((index) => {
        removeFromCurrentOrder(index)
        refreshCart()
    }, [refreshCart])

    // Calculate total
    const cartTotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)

    return (
        <CartContext.Provider value={{
            cart,
            cartTotal,
            refreshCart,
            openOrderSheet,
            closeOrderSheet,
            updateQuantity,
            removeItem,
            addToCart,
            removeFromCart
        }}>
            {children}

            {/* 🛒 ORDER SHEET (Amazon-Style Bottom Sheet) */}
            {sheetItem && (
                <div
                    onClick={closeOrderSheet}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.5)',
                        zIndex: 99998,
                        animation: 'fadeIn 0.2s ease'
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: 'white',
                            borderRadius: '20px 20px 0 0',
                            padding: '24px 20px',
                            paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
                            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                    >
                        {/* Handle Bar */}
                        <div style={{
                            width: 40,
                            height: 4,
                            background: '#E5E7EB',
                            borderRadius: 2,
                            margin: '0 auto 20px auto'
                        }} />

                        {/* Item Preview */}
                        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                            <div style={{
                                width: 100,
                                height: 100,
                                borderRadius: 12,
                                overflow: 'hidden',
                                background: '#F3F4F6',
                                flexShrink: 0
                            }}>
                                <img
                                    src={sheetItem.image || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&h=200&fit=crop'}
                                    alt={sheetItem.name}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#1F2937' }}>
                                    {sheetItem.name}
                                </h3>
                                <p style={{ margin: '8px 0 0 0', fontSize: 16, color: '#6B7280' }}>
                                    ${sheetItem.price?.toLocaleString('es-AR') || '0'}
                                </p>
                            </div>
                        </div>

                        {/* Quantity Selector */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 24,
                            marginBottom: 24,
                            padding: '16px 0',
                            background: '#F9FAFB',
                            borderRadius: 12
                        }}>
                            <button
                                onClick={() => setSheetQuantity(Math.max(1, sheetQuantity - 1))}
                                style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 22,
                                    border: '2px solid #E5E7EB',
                                    background: 'white',
                                    fontSize: 24,
                                    fontWeight: 300,
                                    color: sheetQuantity <= 1 ? '#D1D5DB' : '#1F2937',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                −
                            </button>
                            <span style={{ fontSize: 28, fontWeight: 600, color: '#1F2937', minWidth: 40, textAlign: 'center' }}>
                                {sheetQuantity}
                            </span>
                            <button
                                onClick={() => setSheetQuantity(sheetQuantity + 1)}
                                style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 22,
                                    border: '2px solid #22C55E',
                                    background: '#22C55E',
                                    fontSize: 24,
                                    fontWeight: 300,
                                    color: 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                +
                            </button>
                        </div>

                        {/* Add to Cart Button */}
                        <button
                            onClick={addItemToCart}
                            style={{
                                width: '100%',
                                padding: '16px 24px',
                                background: '#22C55E',
                                color: 'white',
                                border: 'none',
                                borderRadius: 14,
                                fontSize: 17,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                boxShadow: '0 4px 14px rgba(34, 197, 94, 0.3)'
                            }}
                        >
                            <span>Agregar al pedido</span>
                            <span>${(sheetItem.price * sheetQuantity).toLocaleString('es-AR')}</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Animations */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
            `}</style>
        </CartContext.Provider>
    )
}

export function useCart() {
    const context = useContext(CartContext)
    if (!context) {
        // Return a no-op version if not wrapped in provider
        return {
            cart: { items: [] },
            cartTotal: 0,
            refreshCart: () => { },
            openOrderSheet: () => { },
            closeOrderSheet: () => { },
            updateQuantity: () => { },
            removeItem: () => { }
        }
    }
    return context
}
