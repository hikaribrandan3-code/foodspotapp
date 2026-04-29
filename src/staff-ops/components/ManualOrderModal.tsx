import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, Search, ShoppingBag, User, Phone, MapPin, CreditCard, Loader2 } from 'lucide-react';
import { useBusiness } from '@/contexts/BusinessContext';
// @ts-ignore
import { supabase, createOrderCloud } from '../../lib/supabaseClient.js';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category?: string;
}

interface CartItem extends MenuItem {
  quantity: number;
  note?: string;
}

interface ManualOrderModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ManualOrderModal({ open, onClose }: ManualOrderModalProps) {
  const { businessId } = useBusiness();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Array<{ name: string; items: MenuItem[] }>>([]);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableNumber, setTableNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [orderType, setOrderType] = useState<'dine_in' | 'pickup' | 'delivery'>('dine_in');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card_on_delivery' | 'transfer'>('cash');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [step, setStep] = useState<'items' | 'details'>('items');

  // Fetch menu items from branding.menu_data
  useEffect(() => {
    if (!open || !businessId) return;
    setLoadingMenu(true);
    supabase
      .from('branding')
      .select('menu_data')
      .eq('business_id', businessId)
      .single()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data }: { data: any }) => {
        if (!data?.menu_data) { setLoadingMenu(false); return; }
        const menuData = data.menu_data;
        const items: MenuItem[] = [];
        const categoryGroups: Array<{ name: string; items: MenuItem[] }> = [];

        // menu_data can be: { categories: [...] } or an array of categories
        const cats = Array.isArray(menuData) ? menuData : (menuData.categories || menuData.sections || []);
        cats.forEach((cat: { name?: string; items?: { id?: string; name: string; price: number }[] }) => {
          const categoryItems: MenuItem[] = [];
          (cat.items || []).forEach((item) => {
            const menuItem: MenuItem = {
              id: item.id || `${cat.name}-${item.name}`,
              name: item.name,
              price: item.price ?? 0,
              category: cat.name,
            };
            items.push(menuItem);
            categoryItems.push(menuItem);
          });
          if (categoryItems.length > 0) {
            categoryGroups.push({ name: cat.name || 'Uncategorized', items: categoryItems });
          }
        });

        setMenuItems(items);
        setCategories(categoryGroups);
        if (categoryGroups.length > 0) {
          setActiveCategory(categoryGroups[0].name);
        }
        setLoadingMenu(false);
      });
  }, [open, businessId]);

  const filteredItems = menuItems.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    (item.category || '').toLowerCase().includes(search.toLowerCase()),
  );

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === id);
      if (!existing) return prev;
      if (existing.quantity <= 1) return prev.filter(c => c.id !== id);
      return prev.map(c => c.id === id ? { ...c, quantity: c.quantity - 1 } : c);
    });
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleSubmit = async () => {
    if (cart.length === 0) return;
    if (orderType === 'dine_in' && !tableNumber.trim()) return;
    if (orderType !== 'dine_in' && !customerName.trim()) return;
    if (orderType === 'delivery' && !deliveryAddress.trim()) return;
    setSubmitting(true);
    setSubmitError('');

    try {
      const { data: lastOrder } = await supabase
        .from('orders')
        .select('order_number')
        .eq('business_id', businessId)
        .order('order_number', { ascending: false })
        .limit(1)
        .single();

      const nextNumber = ((lastOrder?.order_number as number) || 0) + 1;
      const isDineIn = orderType === 'dine_in';

      await createOrderCloud({
        orderNumber: nextNumber,
        items: cart.map(c => ({ name: c.name, quantity: c.quantity, price: c.price })),
        total: cartTotal,
        status: isDineIn ? 'released_to_kitchen' : 'pending_payment',
        customerName: isDineIn ? `Mesa ${tableNumber.trim()}` : customerName.trim(),
        customerPhone: customerPhone.trim() || null,
        deliveryType: orderType,
        tableNumber: isDineIn ? tableNumber.trim() : null,
        deliveryAddress: orderType === 'delivery' ? deliveryAddress.trim() || null : null,
        paymentMethod: isDineIn ? 'cash' : paymentMethod,
        paymentStatus: isDineIn ? 'unpaid' : 'pending',
        paymentConfirmed: false,
        notes: notes.trim() || null,
      }, businessId);

      setCart([]);
      setTableNumber('');
      setCustomerName('');
      setCustomerPhone('');
      setDeliveryAddress('');
      setNotes('');
      setStep('items');
      onClose();
    } catch (e) {
      console.error('[ManualOrder] Submit failed:', e);
      setSubmitError('Order failed to send. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setCart([]);
    setSearch('');
    setTableNumber('');
    setStep('items');
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-40"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl flex flex-col"
            style={{
              backgroundColor: 'var(--bg-primary)',
              maxHeight: '92dvh',
              border: '1px solid var(--card-border)',
            }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--card-border-strong)' }} />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--card-border)' }}>
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} style={{ color: 'var(--status-icon-prep)' }} />
                <span className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Manual Order</span>
              </div>
              <button onClick={handleClose} className="p-1.5 rounded-lg" style={{ backgroundColor: 'var(--btn-secondary-bg)' }}>
                <X size={16} style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>

            {/* Step tabs */}
            <div className="flex px-4 pt-3 gap-2">
              {(['items', 'details'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => s === 'details' && cart.length > 0 ? setStep(s) : setStep('items')}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold capitalize transition-all"
                  style={{
                    backgroundColor: step === s ? 'var(--filter-active-bg)' : 'var(--counter-bg)',
                    color: step === s ? 'var(--filter-active-text)' : 'var(--text-secondary)',
                    border: `1px solid ${step === s ? 'var(--filter-active-border)' : 'var(--counter-border)'}`,
                  }}
                >
                  {s === 'items' ? `Items${cartCount > 0 ? ` (${cartCount})` : ''}` : 'Customer Details'}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {step === 'items' && (
                <div className="space-y-3">
                  {/* Category tabs */}
                  {categories.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {categories.map(cat => (
                        <button
                          key={cat.name}
                          onClick={() => setActiveCategory(cat.name)}
                          className="px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all"
                          style={{
                            backgroundColor: activeCategory === cat.name ? 'var(--filter-active-bg)' : 'var(--counter-bg)',
                            color: activeCategory === cat.name ? 'var(--filter-active-text)' : 'var(--text-secondary)',
                            border: `1px solid ${activeCategory === cat.name ? 'var(--filter-active-border)' : 'var(--counter-border)'}`,
                          }}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Search */}
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ backgroundColor: 'var(--counter-bg)', border: '1px solid var(--counter-border)' }}>
                    <Search size={14} style={{ color: 'var(--text-tertiary)' }} />
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search menu..."
                      className="flex-1 bg-transparent text-sm outline-none"
                      style={{ color: 'var(--text-primary)' }}
                    />
                  </div>

                  {loadingMenu ? (
                    <div className="flex justify-center py-8">
                      <Loader2 size={20} className="animate-spin" style={{ color: 'var(--text-secondary)' }} />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {search ? (
                        // Search mode: show flat filtered list
                        <div className="space-y-1.5">
                          {filteredItems.map(item => {
                            const inCart = cart.find(c => c.id === item.id);
                            return (
                              <div
                                key={item.id}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                                style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{item.name}</p>
                                  {item.category && <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{item.category}</p>}
                                </div>
                                <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                                  ${item.price.toFixed(2)}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  {inCart ? (
                                    <>
                                      <button onClick={() => removeFromCart(item.id)} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--btn-secondary-bg)' }}>
                                        <Minus size={12} style={{ color: 'var(--text-primary)' }} />
                                      </button>
                                      <span className="text-sm font-bold w-4 text-center" style={{ color: 'var(--text-primary)' }}>{inCart.quantity}</span>
                                    </>
                                  ) : null}
                                  <button onClick={() => addToCart(item)} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--filter-active-bg)' }}>
                                    <Plus size={12} style={{ color: 'var(--filter-active-text)' }} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                          {filteredItems.length === 0 && <p className="text-center text-sm py-6" style={{ color: 'var(--text-secondary)' }}>No items match</p>}
                        </div>
                      ) : (
                        // Category mode: show grouped items
                        <>
                          {categories.map(cat => (
                            <div key={cat.name} className={search ? 'hidden' : ''}>
                              {(search || activeCategory === '' || activeCategory === cat.name) && (
                                <>
                                  <p className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: 'var(--text-tertiary)' }}>
                                    {cat.name}
                                  </p>
                                  <div className="space-y-1.5">
                                    {cat.items.map(item => {
                                      const inCart = cart.find(c => c.id === item.id);
                                      return (
                                        <div
                                          key={item.id}
                                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                                          style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
                                        >
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{item.name}</p>
                                          </div>
                                          <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                                            ${item.price.toFixed(2)}
                                          </span>
                                          <div className="flex items-center gap-1.5">
                                            {inCart ? (
                                              <>
                                                <button onClick={() => removeFromCart(item.id)} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--btn-secondary-bg)' }}>
                                                  <Minus size={12} style={{ color: 'var(--text-primary)' }} />
                                                </button>
                                                <span className="text-sm font-bold w-4 text-center" style={{ color: 'var(--text-primary)' }}>{inCart.quantity}</span>
                                              </>
                                            ) : null}
                                            <button onClick={() => addToCart(item)} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--filter-active-bg)' }}>
                                              <Plus size={12} style={{ color: 'var(--filter-active-text)' }} />
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {step === 'details' && (
                <div className="space-y-3">
                  {/* Order summary */}
                  <div className="rounded-xl p-3 space-y-1.5" style={{ backgroundColor: 'var(--counter-bg)', border: '1px solid var(--counter-border)' }}>
                    {cart.map(c => (
                      <div key={c.id} className="flex justify-between text-sm">
                        <span style={{ color: 'var(--text-primary)' }}>{c.quantity}× {c.name}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>${(c.price * c.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="border-t pt-1.5 flex justify-between font-bold text-sm" style={{ borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}>
                      <span>Total</span>
                      <span>${cartTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Order type — dine-in only for staff table orders; picker hidden */}

                  {/* Dine-in: table + special requests only */}
                  {orderType === 'dine_in' && (
                    <>
                      <Field icon={<MapPin size={14} />} label="Table Number *">
                        <input
                          value={tableNumber}
                          onChange={e => setTableNumber(e.target.value)}
                          placeholder="e.g. 4"
                          inputMode="numeric"
                          className="w-full bg-transparent text-sm outline-none"
                          style={{ color: 'var(--text-primary)' }}
                        />
                      </Field>
                      <Field icon={<CreditCard size={14} />} label="Special Requests">
                        <textarea
                          value={notes}
                          onChange={e => setNotes(e.target.value)}
                          placeholder="Allergies, preferences, special requests..."
                          rows={2}
                          className="w-full bg-transparent text-sm outline-none resize-none"
                          style={{ color: 'var(--text-primary)' }}
                        />
                      </Field>
                    </>
                  )}
                  {/* Pickup / Delivery: full customer fields */}
                  {orderType !== 'dine_in' && (
                    <>
                      <Field icon={<User size={14} />} label="Customer Name *">
                        <input
                          value={customerName}
                          onChange={e => setCustomerName(e.target.value)}
                          placeholder="Full name"
                          className="w-full bg-transparent text-sm outline-none"
                          style={{ color: 'var(--text-primary)' }}
                        />
                      </Field>
                      <Field icon={<Phone size={14} />} label="Phone">
                        <input
                          value={customerPhone}
                          onChange={e => setCustomerPhone(e.target.value)}
                          placeholder="Optional"
                          type="tel"
                          className="w-full bg-transparent text-sm outline-none"
                          style={{ color: 'var(--text-primary)' }}
                        />
                      </Field>
                      {orderType === 'delivery' && (
                        <Field icon={<MapPin size={14} />} label="Delivery Address *">
                          <input
                            value={deliveryAddress}
                            onChange={e => setDeliveryAddress(e.target.value)}
                            placeholder="Street, number, floor..."
                            className="w-full bg-transparent text-sm outline-none"
                            style={{ color: 'var(--text-primary)' }}
                          />
                        </Field>
                      )}
                      {/* 🛡️ PAYMENT SELECTOR: Only for pickup/delivery — dine-in always pays at the end */}
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 px-1" style={{ color: 'var(--text-tertiary)' }}>Payment Method</p>
                        <div className="grid grid-cols-3 gap-1.5">
                          {([
                            { value: 'cash', label: 'Cash' },
                            { value: 'card_on_delivery', label: 'Card' },
                            { value: 'transfer', label: 'Transfer' },
                          ] as const).map(({ value, label }) => (
                            <button
                              key={value}
                              onClick={() => setPaymentMethod(value)}
                              className="py-2 rounded-xl text-xs font-semibold"
                              style={{
                                backgroundColor: paymentMethod === value ? 'var(--filter-active-bg)' : 'var(--counter-bg)',
                                color: paymentMethod === value ? 'var(--filter-active-text)' : 'var(--text-secondary)',
                                border: `1px solid ${paymentMethod === value ? 'var(--filter-active-border)' : 'var(--counter-border)'}`,
                              }}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <Field icon={<CreditCard size={14} />} label="Kitchen Notes">
                        <textarea
                          value={notes}
                          onChange={e => setNotes(e.target.value)}
                          placeholder="Allergies, special requests..."
                          rows={2}
                          className="w-full bg-transparent text-sm outline-none resize-none"
                          style={{ color: 'var(--text-primary)' }}
                        />
                  </Field>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 pb-8 pt-3 border-t" style={{ borderColor: 'var(--card-border)' }}>
              {submitError && (
                <p className="text-xs text-center mb-2 font-medium" style={{ color: '#DC2626' }}>{submitError}</p>
              )}
              {step === 'items' ? (
                <button
                  onClick={() => setStep('details')}
                  disabled={cart.length === 0}
                  className="w-full py-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-opacity"
                  style={{
                    backgroundColor: cart.length === 0 ? 'var(--btn-secondary-bg)' : 'var(--filter-active-bg)',
                    color: cart.length === 0 ? 'var(--text-tertiary)' : 'var(--filter-active-text)',
                    opacity: cart.length === 0 ? 0.5 : 1,
                  }}
                >
                  Continue — {cartCount} item{cartCount !== 1 ? 's' : ''} · ${cartTotal.toFixed(2)}
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={submitting || (orderType === 'dine_in' ? !tableNumber.trim() : !customerName.trim()) || (orderType === 'delivery' && !deliveryAddress.trim())}
                  className="w-full py-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-opacity"
                  style={{
                    backgroundColor: submitting || (orderType === 'dine_in' ? !tableNumber.trim() : !customerName.trim()) || (orderType === 'delivery' && !deliveryAddress.trim()) ? 'var(--btn-secondary-bg)' : '#10b981',
                    color: submitting || (orderType === 'dine_in' ? !tableNumber.trim() : !customerName.trim()) || (orderType === 'delivery' && !deliveryAddress.trim()) ? 'var(--text-tertiary)' : 'white',
                    opacity: submitting || (orderType === 'dine_in' ? !tableNumber.trim() : !customerName.trim()) || (orderType === 'delivery' && !deliveryAddress.trim()) ? 0.6 : 1,
                  }}
                >
                  {submitting
                    ? <><Loader2 size={16} className="animate-spin" /> Placing Order…</>
                    : `Place Order · $${cartTotal.toFixed(2)}`
                  }
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <span style={{ color: 'var(--text-tertiary)' }}>{icon}</span>
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
      </div>
      <div className="px-3 py-2.5 rounded-xl" style={{ backgroundColor: 'var(--counter-bg)', border: '1px solid var(--counter-border)' }}>
        {children}
      </div>
    </div>
  );
}
