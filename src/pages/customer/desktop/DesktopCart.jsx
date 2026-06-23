import { useNavigate } from 'react-router-dom'
import { X, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react'
import { useCart } from '../../../contexts/CartContext'
import { useCurrency } from '../../../hooks/useCurrency'
import { useTenant } from '../../../contexts/TenantContext'

export default function DesktopCart({ isOpen, onClose }) {
    const { cart, cartTotal, updateQuantity, removeFromCart } = useCart()
    const fmt = useCurrency()
    const { tenantData } = useTenant()
    const navigate = useNavigate()

    const items = cart?.items || []

    const goToCheckout = () => {
        const slug = tenantData?.slug
        if (slug) navigate(`/${slug}/order`)
    }

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                className={
                    'fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ' +
                    (isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none')
                }
            />

            {/* Drawer */}
            <aside
                className={
                    'fixed inset-y-0 right-0 w-[380px] max-w-[90vw] bg-white shadow-2xl z-50 flex flex-col ' +
                    'transform transition-transform duration-300 ease-in-out ' +
                    (isOpen ? 'translate-x-0' : 'translate-x-full')
                }
                aria-hidden={!isOpen}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h2 className="font-bold text-lg text-gray-900">Your order</h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="Close cart">
                        <X size={20} className="text-gray-600" />
                    </button>
                </div>

                {/* Items / empty state */}
                <div className="flex-1 overflow-y-auto">
                    {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 px-6 text-center">
                            <ShoppingBag size={40} className="mb-3" />
                            <p className="font-semibold mb-1">Your cart is empty</p>
                            <p className="text-sm">Add items from the menu to get started.</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-100">
                            {items.map((item, index) => (
                                <li key={`${item.id}-${index}`} className="flex items-center gap-3 px-5 py-4">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-sm text-gray-900 truncate">{item.name}</p>
                                        <p className="text-sm text-gray-500">{fmt(item.price * item.quantity)}</p>
                                    </div>

                                    {/* Quantity stepper */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() =>
                                                item.quantity <= 1
                                                    ? removeFromCart(index)
                                                    : updateQuantity(index, item.quantity - 1)
                                            }
                                            className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50"
                                            aria-label="Decrease quantity"
                                        >
                                            {item.quantity <= 1 ? <Trash2 size={13} /> : <Minus size={14} />}
                                        </button>
                                        <span className="w-5 text-center text-sm font-semibold text-gray-900">
                                            {item.quantity}
                                        </span>
                                        <button
                                            onClick={() => updateQuantity(index, item.quantity + 1)}
                                            className="w-7 h-7 flex items-center justify-center rounded-full text-white"
                                            style={{ background: 'var(--color-primary)' }}
                                            aria-label="Increase quantity"
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Footer */}
                {items.length > 0 && (
                    <div className="border-t border-gray-100 px-5 py-4">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm text-gray-500">Subtotal</span>
                            <span className="font-bold text-lg text-gray-900">{fmt(cartTotal)}</span>
                        </div>
                        <button
                            onClick={goToCheckout}
                            className="w-full py-3 rounded-xl text-white font-bold text-sm"
                            style={{ background: 'var(--color-primary)' }}
                        >
                            Place Order
                        </button>
                    </div>
                )}
            </aside>
        </>
    )
}
