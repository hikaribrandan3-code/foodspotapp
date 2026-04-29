import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, Search, Plus, Minus, User, Phone, MapPin, Loader2, Hash } from 'lucide-react';
import { useBusiness } from '@/contexts/BusinessContext';
// @ts-ignore
import { supabase, createOrderCloud, getNextOrderNumber } from '../../lib/supabaseClient.js';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category?: string;
}

interface CartItem extends MenuItem {
  quantity: number;
}

type OrderType = 'pickup' | 'delivery' | 'dine_in';
type PaymentMethod = 'cash' | 'card_on_delivery' | 'transfer';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider mb-1 px-1" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
      <div className="px-3 py-2.5 rounded-xl" style={{ backgroundColor: 'var(--counter-bg)', border: '1px solid var(--counter-border)' }}>
        {children}
      </div>
    </div>
  );
}

export default function OrderView() {
  const { businessId } = useBusiness();

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [step, setStep] = useState<'items' | 'details'>('items');

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderType, setOrderType] = useState<OrderType>('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [staffNotes, setStaffNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    setLoadingMenu(true);
    supabase
      .from('branding')
      .select('menu_data')
      .eq('business_id', businessId)
      .single()
      .then(({ data }: { data: any }) => {
        const menuData = data?.menu_data;
        if (!menuData) { setLoadingMenu(false); return; }
        const categories = Array.isArray(menuData) ? menuData : (menuData.categories || menuData.sections || []);
        const items: MenuItem[] = [];
        categories.forEach((cat: any) => {
          (cat.items || []).forEach((item: any) => {
            items.push({ id: item.id || `${cat.name}-${item.name}`, name: item.name, price: item.price ?? 0, category: cat.name });
          });
        });
        setMenuItems(items);
        setLoadingMenu(false);
      })
      .catch(() => setLoadingMenu(false));
  }, [businessId]);

  const filtered = menuItems.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.category || '').toLowerCase().includes(search.toLowerCase()),
  );

  const addToCart = (item: MenuItem) => setCart(prev => {
    const existing = prev.find(c => c.id === item.id);
    if (existing) return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
    return [...prev, { ...item, quantity: 1 }];
  });

  const removeFromCart = (id: string) => setCart(prev => {
    const existing = prev.find(c => c.id === id);
    if (!existing) return prev;
    if (existing.quantity <= 1) return prev.filter(c => c.id !== id);
    return prev.map(c => c.id === id ? { ...c, quantity: c.quantity - 1 } : c);
  });

  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const reset = () => {
    setCart([]); setStep('items'); setCustomerName(''); setCustomerPhone('');
    setDeliveryAddress(''); setTableNumber(''); setStaffNotes('');
    setOrderType('pickup'); setPaymentMethod('cash'); setSearch('');
  };

  const handleSubmit = async () => {
    if ((orderType !== 'dine_in' && !customerName.trim()) || cart.length === 0) return;
    setSubmitting(true);
    try {
      const { nextNumber, error: seqError } = await getNextOrderNumber(businessId);
      if (seqError) {
        console.error('[OrderView] Failed to get next order number:', seqError);
        setSubmitting(false);
        return;
      }

      const isDineIn = orderType === 'dine_in';
      const actualCustomerName = isDineIn ? `Mesa ${tableNumber.trim()}` : customerName.trim();

      await createOrderCloud({
        orderNumber: nextNumber,
        items: cart.map(c => ({ name: c.name, quantity: c.quantity, price: c.price })),
        total: cartTotal,
        status: isDineIn ? 'released_to_kitchen' : 'pending_payment',
        customerName: actualCustomerName,
        customerPhone: customerPhone.trim() || null,
        deliveryMode: orderType === 'delivery',
        deliveryAddress: orderType === 'delivery' ? deliveryAddress.trim() || null : null,
        paymentMethod: isDineIn ? 'cash' : paymentMethod,
        paymentStatus: isDineIn ? 'unpaid' : 'pending',
        paymentConfirmed: false,
        notes: staffNotes.trim() || null,
        tableNumber: isDineIn && tableNumber ? Number(tableNumber) : null,
        deliveryType: orderType,
      }, businessId);

      setSuccess(true);
      setTimeout(() => { setSuccess(false); reset(); }, 1800);
    } catch (e) {
      console.error('[OrderView] submit failed:', e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <ClipboardList size={20} style={{ color: 'var(--status-icon-prep)' }} />
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Take Order</h1>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Select items, then fill in customer details.</p>
      </div>

      {/* Step tabs */}
      <div className="flex px-4 pb-3 gap-2 shrink-0">
        {(['items', 'details'] as const).map(s => (
          <button key={s} onClick={() => s === 'details' && cart.length > 0 ? setStep(s) : setStep('items')}
            className="flex-1 py-2 rounded-xl text-xs font-semibold capitalize transition-all"
            style={{
              backgroundColor: step === s ? 'var(--filter-active-bg)' : 'var(--counter-bg)',
              color: step === s ? 'var(--filter-active-text)' : 'var(--text-secondary)',
              border: `1px solid ${step === s ? 'var(--filter-active-border, var(--card-border))' : 'var(--counter-border)'}`,
            }}>
            {s === 'items' ? `Items${cartCount > 0 ? ` (${cartCount})` : ''}` : 'Details'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-hide">
        {step === 'items' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ backgroundColor: 'var(--counter-bg)', border: '1px solid var(--counter-border)' }}>
              <Search size={14} style={{ color: 'var(--text-tertiary)' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search menu..."
                className="flex-1 bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} />
            </div>

            {loadingMenu ? (
              <div className="flex justify-center py-12">
                <Loader2 size={22} className="animate-spin" style={{ color: 'var(--text-secondary)' }} />
              </div>
            ) : (
              <div className="space-y-2">
                {(() => {
                  const grouped = new Map<string, MenuItem[]>();
                  filtered.forEach(item => {
                    const cat = item.category || 'Uncategorized';
                    if (!grouped.has(cat)) grouped.set(cat, []);
                    grouped.get(cat)!.push(item);
                  });

                  if (grouped.size === 0) {
                    return <p className="text-center text-sm py-10" style={{ color: 'var(--text-secondary)' }}>
                      {menuItems.length === 0 ? 'No menu data found' : 'No items match'}
                    </p>;
                  }

                  return Array.from(grouped.entries()).map(([category, items]) => (
                    <div key={category}>
                      <p className="text-[10px] font-bold uppercase tracking-wider px-1 mb-1.5" style={{ color: 'var(--text-tertiary)' }}>{category}</p>
                      <div className="space-y-1.5">
                        {items.map(item => {
                          const inCart = cart.find(c => c.id === item.id);
                          return (
                            <div key={item.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                              style={{ backgroundColor: 'var(--card-bg)', border: `1px solid ${inCart ? 'var(--filter-active-bg)' : 'var(--card-border)'}` }}>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{item.name}</p>
                              </div>
                              <span className="text-xs font-mono shrink-0" style={{ color: 'var(--text-secondary)' }}>${item.price.toFixed(2)}</span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {inCart && (
                                  <>
                                    <button onClick={() => removeFromCart(item.id)}
                                      className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--btn-secondary-bg)' }}>
                                      <Minus size={12} style={{ color: 'var(--text-primary)' }} />
                                    </button>
                                    <span className="text-sm font-bold w-4 text-center" style={{ color: 'var(--text-primary)' }}>{inCart.quantity}</span>
                                  </>
                                )}
                                <button onClick={() => addToCart(item)}
                                  className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--filter-active-bg)' }}>
                                  <Plus size={12} style={{ color: 'var(--filter-active-text)' }} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        )}

        {step === 'details' && (
          <div className="space-y-3">
            {/* Cart summary */}
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

            {orderType !== 'dine_in' && (
              <Field label="Customer Name *">
                <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Full name"
                  className="w-full bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} />
              </Field>
            )}

            <Field label="Phone (optional)">
              <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="+1 555 000 0000"
                type="tel" className="w-full bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} />
            </Field>

            {/* Order type */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 px-1" style={{ color: 'var(--text-tertiary)' }}>Order Type</p>
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  { value: 'pickup', label: 'Pickup' },
                  { value: 'delivery', label: 'Delivery' },
                  { value: 'dine_in', label: 'Dine In' },
                ] as const).map(({ value, label }) => (
                  <button key={value} onClick={() => setOrderType(value)}
                    className="py-2.5 rounded-xl text-xs font-semibold"
                    style={{
                      backgroundColor: orderType === value ? 'var(--filter-active-bg)' : 'var(--counter-bg)',
                      color: orderType === value ? 'var(--filter-active-text)' : 'var(--text-secondary)',
                      border: `1px solid ${orderType === value ? 'var(--filter-active-border, var(--card-border))' : 'var(--counter-border)'}`,
                    }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {orderType === 'delivery' && (
              <Field label="Delivery Address">
                <input value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)}
                  placeholder="Street, number, floor..." className="w-full bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} />
              </Field>
            )}

            {orderType === 'dine_in' && (
              <Field label="Table Number">
                <div className="flex items-center gap-2">
                  <Hash size={14} style={{ color: 'var(--text-tertiary)' }} />
                  <input value={tableNumber} onChange={e => setTableNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 5" type="text" inputMode="numeric"
                    className="flex-1 bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} />
                </div>
              </Field>
            )}

            {/* Payment */}
            {orderType !== 'dine_in' && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 px-1" style={{ color: 'var(--text-tertiary)' }}>Payment</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {([
                    { value: 'cash', label: 'Cash' },
                    { value: 'card_on_delivery', label: 'Card' },
                    { value: 'transfer', label: 'Transfer' },
                  ] as const).map(({ value, label }) => (
                    <button key={value} onClick={() => setPaymentMethod(value)}
                      className="py-2 rounded-xl text-xs font-semibold"
                      style={{
                        backgroundColor: paymentMethod === value ? 'var(--filter-active-bg)' : 'var(--counter-bg)',
                        color: paymentMethod === value ? 'var(--filter-active-text)' : 'var(--text-secondary)',
                        border: `1px solid ${paymentMethod === value ? 'var(--filter-active-border, var(--card-border))' : 'var(--counter-border)'}`,
                      }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Staff notes */}
            <Field label="Staff Notes (optional)">
              <textarea value={staffNotes} onChange={e => setStaffNotes(e.target.value)}
                placeholder="No onions, extra sauce, allergy info..."
                rows={2} className="w-full bg-transparent text-sm outline-none resize-none" style={{ color: 'var(--text-primary)' }} />
            </Field>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 pb-28 pt-3 border-t shrink-0" style={{ borderColor: 'var(--card-border)' }}>
        {success ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full py-4 rounded-xl font-semibold text-sm flex items-center justify-center"
            style={{ backgroundColor: 'var(--reception-bg)', color: 'var(--reception-text)', border: '1px solid var(--reception-border)' }}>
            Order placed — sent to kitchen
          </motion.div>
        ) : step === 'items' ? (
          <button onClick={() => setStep('details')} disabled={cart.length === 0}
            className="w-full py-4 rounded-xl font-semibold text-sm transition-opacity"
            style={{
              backgroundColor: cart.length === 0 ? 'var(--btn-secondary-bg)' : 'var(--filter-active-bg)',
              color: cart.length === 0 ? 'var(--text-tertiary)' : 'var(--filter-active-text)',
              opacity: cart.length === 0 ? 0.5 : 1,
            }}>
            Continue — {cartCount} item{cartCount !== 1 ? 's' : ''} · ${cartTotal.toFixed(2)}
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={submitting || (orderType === 'dine_in' ? !tableNumber.trim() : !customerName.trim())}
            className="w-full py-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
            style={{
              backgroundColor: 'var(--filter-active-bg)',
              color: 'var(--filter-active-text)',
              opacity: submitting || (orderType === 'dine_in' ? !tableNumber.trim() : !customerName.trim()) ? 0.6 : 1,
            }}>
            {submitting ? <><Loader2 size={16} className="animate-spin" /> Placing order…</> : `Place Order · $${cartTotal.toFixed(2)}`}
          </button>
        )}
      </div>
    </div>
  );
}
