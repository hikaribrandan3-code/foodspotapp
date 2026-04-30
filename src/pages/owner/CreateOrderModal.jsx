import { useState, useEffect } from 'react'
import { supabase, createOrderCloud, getNextOrderNumber } from '../../lib/supabaseClient.js'

function Field({ label, children }) {
  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, paddingLeft: 4, color: 'var(--text-tertiary, #7A8699)' }}>{label}</p>
      <div style={{ padding: '10px 12px', borderRadius: 12, backgroundColor: 'var(--counter-bg, #F4F6F9)', border: '1px solid var(--counter-border, #E6EAF0)' }}>
        {children}
      </div>
    </div>
  )
}

export default function CreateOrderModal({ businessId, onClose }) {
  const [menuItems, setMenuItems] = useState([])
  const [loadingMenu, setLoadingMenu] = useState(true)
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState([])
  const [step, setStep] = useState('items')

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [orderType, setOrderType] = useState('pickup')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [tableNumber, setTableNumber] = useState('')
  const [staffNotes, setStaffNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!businessId) return
    setLoadingMenu(true)
    supabase
      .from('branding')
      .select('menu_data')
      .eq('business_id', businessId)
      .single()
      .then(({ data }) => {
        const menuData = data?.menu_data
        if (!menuData) { setLoadingMenu(false); return }
        const categories = Array.isArray(menuData) ? menuData : (menuData.categories || menuData.sections || [])
        const items = []
        categories.forEach(cat => {
          ;(cat.items || []).forEach(item => {
            items.push({ id: item.id || `${cat.name}-${item.name}`, name: item.name, price: item.price ?? 0, category: cat.name })
          })
        })
        setMenuItems(items)
        setLoadingMenu(false)
      })
      .catch(() => setLoadingMenu(false))
  }, [businessId])

  const filtered = menuItems.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.category || '').toLowerCase().includes(search.toLowerCase())
  )

  const addToCart = (item) => setCart(prev => {
    const existing = prev.find(c => c.id === item.id)
    if (existing) return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c)
    return [...prev, { ...item, quantity: 1 }]
  })

  const removeFromCart = (id) => setCart(prev => {
    const existing = prev.find(c => c.id === id)
    if (!existing) return prev
    if (existing.quantity <= 1) return prev.filter(c => c.id !== id)
    return prev.map(c => c.id === id ? { ...c, quantity: c.quantity - 1 } : c)
  })

  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0)
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)

  const reset = () => {
    setCart([]); setStep('items'); setCustomerName(''); setCustomerPhone('')
    setDeliveryAddress(''); setTableNumber(''); setStaffNotes('')
    setOrderType('pickup'); setPaymentMethod('cash'); setSearch('')
  }

  const handleSubmit = async () => {
    if ((orderType !== 'dine_in' && !customerName.trim()) || cart.length === 0) return
    setSubmitting(true)
    try {
      const { nextNumber, error: seqError } = await getNextOrderNumber(businessId)
      if (seqError) { console.error('[CreateOrder] order number error:', seqError); setSubmitting(false); return }

      const isDineIn = orderType === 'dine_in'
      const actualCustomerName = isDineIn ? `Mesa ${tableNumber.trim()}` : customerName.trim()

      const { error } = await createOrderCloud({
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
      }, businessId)

      if (error) { alert('Error placing order: ' + error.message); setSubmitting(false); return }

      setSuccess(true)
      setTimeout(() => { setSuccess(false); reset(); onClose() }, 1800)
    } catch (e) {
      console.error('[CreateOrder] submit failed:', e)
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = orderType === 'dine_in' ? tableNumber.trim() : customerName.trim()

  return (
    /* Backdrop */
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(15,27,45,0.45)' }}
      onClick={onClose}
    >
      {/* Drawer panel */}
      <div
        style={{ marginTop: 'auto', backgroundColor: 'var(--detail-drawer-bg, #FFFFFF)', borderRadius: '20px 20px 0 0', maxHeight: '90dvh', display: 'flex', flexDirection: 'column', boxShadow: '0 -8px 40px rgba(0,0,0,0.15)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle + Header */}
        <div style={{ padding: '12px 16px 0', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, backgroundColor: 'var(--line-2, #EEF1F5)', borderRadius: 99, margin: '0 auto 14px' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-primary, #0F1B2D)', letterSpacing: '-0.02em' }}>Take Order</h1>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-secondary, #7A8699)' }}>Select items, then fill in customer details.</p>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: 'var(--text-tertiary, #9AA4B5)', fontSize: 20, lineHeight: 1 }}>✕</button>
          </div>
        </div>

        {/* Step tabs */}
        <div style={{ display: 'flex', gap: 8, padding: '10px 16px', flexShrink: 0 }}>
          {['items', 'details'].map(s => (
            <button key={s} onClick={() => s === 'details' && cart.length > 0 ? setStep(s) : setStep('items')}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 12, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                backgroundColor: step === s ? 'var(--filter-active-bg, #EAF1FB)' : 'var(--counter-bg, #F4F6F9)',
                color: step === s ? 'var(--filter-active-text, #1B4FB1)' : 'var(--text-secondary, #7A8699)',
                border: `1px solid ${step === s ? 'var(--filter-active-border, #C7D8F5)' : 'var(--counter-border, #E6EAF0)'}`,
              }}>
              {s === 'items' ? `Items${cartCount > 0 ? ` (${cartCount})` : ''}` : 'Details'}
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
          {step === 'items' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Search */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 12, backgroundColor: 'var(--counter-bg, #F4F6F9)', border: '1px solid var(--counter-border, #E6EAF0)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary, #9AA4B5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search menu..."
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: 'var(--text-primary, #0F1B2D)' }} />
              </div>

              {loadingMenu ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
                  <div style={{ width: 22, height: 22, border: '2px solid var(--text-tertiary, #9AA4B5)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                </div>
              ) : (
                (() => {
                  const grouped = new Map()
                  filtered.forEach(item => {
                    const cat = item.category || 'Other'
                    if (!grouped.has(cat)) grouped.set(cat, [])
                    grouped.get(cat).push(item)
                  })
                  if (grouped.size === 0) return (
                    <p style={{ textAlign: 'center', fontSize: 14, padding: '40px 0', color: 'var(--text-secondary, #7A8699)' }}>
                      {menuItems.length === 0 ? 'No menu data found' : 'No items match'}
                    </p>
                  )
                  return Array.from(grouped.entries()).map(([category, items]) => (
                    <div key={category}>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', paddingLeft: 4, marginBottom: 6, color: 'var(--text-tertiary, #9AA4B5)' }}>{category}</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {items.map(item => {
                          const inCart = cart.find(c => c.id === item.id)
                          return (
                            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, backgroundColor: 'var(--card-bg, #FFFFFF)', border: `1px solid ${inCart ? 'var(--filter-active-bg, #EAF1FB)' : 'var(--card-border, #E6EAF0)'}` }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--text-primary, #0F1B2D)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                              </div>
                              <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-secondary, #7A8699)', flexShrink: 0 }}>${item.price.toFixed(2)}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                {inCart && (
                                  <>
                                    <button onClick={() => removeFromCart(item.id)} style={{ width: 24, height: 24, borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--btn-secondary-bg, #F4F6F9)' }}>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary, #0F1B2D)" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                    </button>
                                    <span style={{ fontSize: 14, fontWeight: 700, width: 16, textAlign: 'center', color: 'var(--text-primary, #0F1B2D)' }}>{inCart.quantity}</span>
                                  </>
                                )}
                                <button onClick={() => addToCart(item)} style={{ width: 24, height: 24, borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--filter-active-bg, #EAF1FB)' }}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--filter-active-text, #1B4FB1)" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))
                })()
              )}
            </div>
          )}

          {step === 'details' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Cart summary */}
              <div style={{ padding: 12, borderRadius: 12, backgroundColor: 'var(--counter-bg, #F4F6F9)', border: '1px solid var(--counter-border, #E6EAF0)' }}>
                {cart.map(c => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-primary, #0F1B2D)' }}>{c.quantity}× {c.name}</span>
                    <span style={{ color: 'var(--text-secondary, #7A8699)' }}>${(c.price * c.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid var(--card-border, #E6EAF0)', marginTop: 6, paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, color: 'var(--text-primary, #0F1B2D)' }}>
                  <span>Total</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>
              </div>

              {orderType !== 'dine_in' && (
                <Field label="Customer Name *">
                  <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Full name"
                    style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: 'var(--text-primary, #0F1B2D)' }} />
                </Field>
              )}

              <Field label="Phone (optional)">
                <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="+1 555 000 0000"
                  type="tel" style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: 'var(--text-primary, #0F1B2D)' }} />
              </Field>

              {/* Order type */}
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, paddingLeft: 4, color: 'var(--text-tertiary, #9AA4B5)' }}>Order Type</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                  {[{ value: 'pickup', label: 'Pickup' }, { value: 'delivery', label: 'Delivery' }, { value: 'dine_in', label: 'Dine In' }].map(({ value, label }) => (
                    <button key={value} onClick={() => setOrderType(value)}
                      style={{
                        padding: '10px 0', borderRadius: 12, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        backgroundColor: orderType === value ? 'var(--filter-active-bg, #EAF1FB)' : 'var(--counter-bg, #F4F6F9)',
                        color: orderType === value ? 'var(--filter-active-text, #1B4FB1)' : 'var(--text-secondary, #7A8699)',
                        border: `1px solid ${orderType === value ? 'var(--filter-active-border, #C7D8F5)' : 'var(--counter-border, #E6EAF0)'}`,
                      }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {orderType === 'delivery' && (
                <Field label="Delivery Address">
                  <input value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} placeholder="Street, number, floor..."
                    style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: 'var(--text-primary, #0F1B2D)' }} />
                </Field>
              )}

              {orderType === 'dine_in' && (
                <Field label="Table Number">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary, #9AA4B5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8.5" y2="21"/><line x1="14" y1="3" x2="15.5" y2="21"/></svg>
                    <input value={tableNumber} onChange={e => setTableNumber(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 5" type="text" inputMode="numeric"
                      style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: 'var(--text-primary, #0F1B2D)' }} />
                  </div>
                </Field>
              )}

              {orderType !== 'dine_in' && (
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, paddingLeft: 4, color: 'var(--text-tertiary, #9AA4B5)' }}>Payment</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                    {[{ value: 'cash', label: 'Cash' }, { value: 'card_on_delivery', label: 'Card' }, { value: 'transfer', label: 'Transfer' }].map(({ value, label }) => (
                      <button key={value} onClick={() => setPaymentMethod(value)}
                        style={{
                          padding: '8px 0', borderRadius: 12, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          backgroundColor: paymentMethod === value ? 'var(--filter-active-bg, #EAF1FB)' : 'var(--counter-bg, #F4F6F9)',
                          color: paymentMethod === value ? 'var(--filter-active-text, #1B4FB1)' : 'var(--text-secondary, #7A8699)',
                          border: `1px solid ${paymentMethod === value ? 'var(--filter-active-border, #C7D8F5)' : 'var(--counter-border, #E6EAF0)'}`,
                        }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Field label="Staff Notes (optional)">
                <textarea value={staffNotes} onChange={e => setStaffNotes(e.target.value)}
                  placeholder="No onions, extra sauce, allergy info..."
                  rows={2} style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: 'var(--text-primary, #0F1B2D)', resize: 'none', fontFamily: 'inherit' }} />
              </Field>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div style={{ padding: '12px 16px 28px', borderTop: '1px solid var(--card-border, #E6EAF0)', flexShrink: 0 }}>
          {success ? (
            <div style={{ width: '100%', padding: '16px 0', borderRadius: 14, fontWeight: 600, fontSize: 14, textAlign: 'center', backgroundColor: 'var(--reception-bg, #E2F5EA)', color: 'var(--reception-text, #1F7A45)', border: '1px solid var(--reception-border, #B7E5C8)' }}>
              Order placed — sent to kitchen
            </div>
          ) : step === 'items' ? (
            <button onClick={() => setStep('details')} disabled={cart.length === 0}
              style={{
                width: '100%', padding: '16px 0', borderRadius: 14, fontWeight: 600, fontSize: 14, cursor: cart.length === 0 ? 'not-allowed' : 'pointer', border: 'none',
                backgroundColor: cart.length === 0 ? 'var(--btn-secondary-bg, #F4F6F9)' : 'var(--filter-active-bg, #EAF1FB)',
                color: cart.length === 0 ? 'var(--text-tertiary, #9AA4B5)' : 'var(--filter-active-text, #1B4FB1)',
                opacity: cart.length === 0 ? 0.5 : 1,
              }}>
              Continue — {cartCount} item{cartCount !== 1 ? 's' : ''} · ${cartTotal.toFixed(2)}
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting || !canSubmit}
              style={{
                width: '100%', padding: '16px 0', borderRadius: 14, fontWeight: 600, fontSize: 14, cursor: (submitting || !canSubmit) ? 'not-allowed' : 'pointer', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                backgroundColor: 'var(--filter-active-bg, #EAF1FB)',
                color: 'var(--filter-active-text, #1B4FB1)',
                opacity: (submitting || !canSubmit) ? 0.6 : 1,
              }}>
              {submitting ? 'Placing order…' : `Place Order · $${cartTotal.toFixed(2)}`}
            </button>
          )}
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  )
}
