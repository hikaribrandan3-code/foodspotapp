import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, Search, ShoppingBag, User, Phone, MapPin, CreditCard, Loader2 } from 'lucide-react';
import { useBusiness } from '@/contexts/BusinessContext';
import { useOrders } from '@/hooks/useOrders';
import { useLanguage } from '@/contexts/LanguageContext';
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
  const { refreshOrders } = useOrders();
  const { t } = useLanguage();
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
  const [step, setStep] = useState<'items' | 'order-type' | 'details'>('items');

  // Fetch menu items from branding.menu_data, fallback to relational tables
  useEffect(() => {
    if (!open || !businessId) return;
    setLoadingMenu(true);

    const loadFromJsonb = (menuData: any): { items: MenuItem[]; groups: Array<{ name: string; items: MenuItem[] }> } => {
      const items: MenuItem[] = [];
      const groups: Array<{ name: string; items: MenuItem[] }> = [];
      const cats = Array.isArray(menuData) ? menuData : (menuData.categories || menuData.sections || []);
      cats.forEach((cat: { name?: string; items?: { id?: string; name: string; price: number }[] }) => {
        const categoryItems: MenuItem[] = [];
        (cat.items || []).forEach((item) => {
          const menuItem: MenuItem = { id: item.id || `${cat.name}-${item.name}`, name: item.name, price: item.price ?? 0, category: cat.name };
          items.push(menuItem);
          categoryItems.push(menuItem);
        });
        if (categoryItems.length > 0) {
          groups.push({ name: cat.name || t('uncategorized'), items: categoryItems });
        }
      });
      return { items, groups };
    };

    const loadFromRelational = async (): Promise<{ items: MenuItem[]; groups: Array<{ name: string; items: MenuItem[] }> }> => {
      const [{ data: dbItems }, { data: dbCategories }] = await Promise.all([
        supabase.from('menu_items').select('*').eq('business_id', businessId).limit(200),
        supabase.from('categories').select('id, name, sort_order').eq('business_id', businessId).order('sort_order', { ascending: true, nullsFirst: false })
      ]);
      const catMap: Record<string, string> = {};
      (dbCategories || []).forEach((c: any) => { catMap[c.id] = c.name; });

      const items: MenuItem[] = [];
      const groupMap: Record<string, MenuItem[]> = {};
      (dbItems || []).forEach((item: any) => {
        const catName = catMap[item.category_id] || item.category_name || 'Other';
        const menuItem: MenuItem = { id: item.id || `${catName}-${item.name}`, name: item.name, price: item.price ?? 0, category: catName };
        items.push(menuItem);
        if (!groupMap[catName]) groupMap[catName] = [];
        groupMap[catName].push(menuItem);
      });

      const groups = Object.entries(groupMap).map(([name, groupItems]) => ({ name, items: groupItems }));
      return { items, groups };
    };

    supabase
      .from('branding')
      .select('menu_data')
      .eq('business_id', businessId)
      .single()
      .then(async ({ data }: { data: any }) => {
        const menuData = data?.menu_data;
        let result: { items: MenuItem[]; groups: Array<{ name: string; items: MenuItem[] }> } = { items: [], groups: [] };
        if (menuData && (menuData.categories?.length > 0 || (Array.isArray(menuData) && menuData.length > 0))) {
          result = loadFromJsonb(menuData);
        }
        if (result.items.length === 0) {
          try { result = await loadFromRelational(); } catch (e) { console.error('[ManualOrder] relational load failed:', e); }
        }
        setMenuItems(result.items);
        setCategories(result.groups);
        if (result.groups.length > 0) {
          setActiveCategory(result.groups[0].name);
        }
        setLoadingMenu(false);
      })
      .catch(async () => {
        try {
          const result = await loadFromRelational();
          setMenuItems(result.items);
          setCategories(result.groups);
          if (result.groups.length > 0) setActiveCategory(result.groups[0].name);
        } catch (e) { console.error('[ManualOrder] fallback load failed:', e); }
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
        staffNotes: notes.trim() || null,
      }, businessId);

      // Refresh orders immediately so new order appears in Mission Control
      await refreshOrders();

      setCart([]);
      setTableNumber('');
      setCustomerName('');
      setCustomerPhone('');
      setDeliveryAddress('');
      setNotes('');
      setOrderType('dine_in');
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
    setCustomerName('');
    setCustomerPhone('');
    setDeliveryAddress('');
    setNotes('');
    setOrderType('dine_in');
    setStep('items');
    onClose();
  };

  const orderTypeOptions = [
    { value: 'dine_in' as const, label: t('dine_in'), icon: '🍽️' },
    { value: 'pickup' as const, label: t('take_out'), icon: '🛍️' },
    { value: 'delivery' as const, label: t('delivery'), icon: '🚗' },
  ];

  const paymentMethodOptions = [
    { value: 'cash', label: t('cash') },
    { value: 'card_on_delivery', label: t('card') },
    { value: 'transfer', label: t('transfer') },
  ];

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
              {(['items', 'order-type', 'details'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => {
                    if (s === 'items') setStep('items');
                    else if (s === 'order-type' && cart.length > 0) setStep('order-type');
                    else if (s === 'details' && cart.length > 0) setStep('details');
                  }}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold capitalize transition-all"
                  style={{
                    backgroundColor: step === s ? 'var(--filter-active-bg)' : 'var(--counter-bg)',
                    color: step === s ? 'var(--filter-active-text)' : 'var(--text-secondary)',
                    border: `1px solid ${step === s ? 'var(--filter-active-border)' : 'var(--counter-border)'}`,
                    opacity: (s !== 'items' && cart.length === 0) ? 0.5 : 1,
                  }}
                  disabled={s !== 'items' && cart.length === 0}
                >
                  {s === 'items' ? `${t('items')}${cartCount > 0 ? ` (${cartCount})` : ''}` : s === 'order-type' ? t('order_type') : t('details')}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {step === 'items' && (
                <div className="space-y-3">
                  {/* Category tabs */}
                  {categories.length > 0 && (
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

              {step === 'order-type' && (
                <div className="space-y-4 pt-4">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>What type of order?</p>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      ...orderTypeOptions,
                    ]).map(({ value, label, icon }) => (
                      <button
                        key={value}
                        onClick={() => setOrderType(value)}
                        className="p-4 rounded-xl text-xs font-semibold text-center transition-all"
                        style={{
                          backgroundColor: orderType === value ? 'var(--filter-active-bg)' : 'var(--counter-bg)',
                          color: orderType === value ? 'var(--filter-active-text)' : 'var(--text-secondary)',
                          border: `1px solid ${orderType === value ? 'var(--filter-active-border)' : 'var(--counter-border)'}`,
                        }}
                      >
                        <div style={{ fontSize: 24, marginBottom: 4 }}>{icon}</div>
                        {label}
                      </button>
                    ))}
                  </div>
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
                      {orderType === 'delivery' && (
                        <Field icon={<MapPin size={14} />} label={`${t('delivery_address')} *`}>
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
                          {paymentMethodOptions.map(({ value, label }) => (
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
                </>
              )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 pb-8 pt-3 border-t" style={{ borderColor: 'var(--card-border)' }}>
              {submitError && (
                <p className="text-xs text-center mb-2 font-medium" style={{ color: '#DC2626' }}>{submitError}</p>
              )}
              {step === 'items' && (
                <button
                  onClick={() => setStep('order-type')}
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
              )}
              {step === 'order-type' && (
                <button
                  onClick={() => setStep('details')}
                  className="w-full py-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-opacity"
                  style={{
                    backgroundColor: 'var(--filter-active-bg)',
                    color: 'var(--filter-active-text)',
                  }}
                >
                  Next →
                </button>
              )}
              {step === 'details' && (() => {
                const isInvalid = (orderType === 'dine_in' ? !tableNumber.trim() : !customerName.trim()) || (orderType === 'delivery' && !deliveryAddress.trim());
                const isValid = !submitting && !isInvalid;
                return (
                  <button
                    onClick={handleSubmit}
                    disabled={!isValid}
                    className="w-full py-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                    style={{
                      backgroundColor: submitting ? '#10b981' : (isValid ? '#f97316' : 'var(--btn-secondary-bg)'),
                      color: submitting || isValid ? 'white' : 'var(--text-tertiary)',
                      cursor: isValid ? 'pointer' : 'not-allowed',
                      opacity: isValid || submitting ? 1 : 0.6,
                    }}
                  >
                    {submitting
                      ? <><Loader2 size={16} className="animate-spin" /> Placing Order…</>
                      : `Place Order · $${cartTotal.toFixed(2)}`
                    }
                  </button>
                );
              })()}
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
// redeploy trigger
