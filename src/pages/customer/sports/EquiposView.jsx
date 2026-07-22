import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ShoppingBag, Plus, Minus, ChevronLeft, Loader2, Package } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useRentalItems, createRentalPreference, fetchRentalOrder } from '../../../hooks/useRentalItems';
import { getSportsPhone, setSportsPhone } from '../../../hooks/useSportsProfile';
import { supabase } from '../../../lib/supabaseClient';

function formatMoney(cents) {
  return `$${((cents || 0) / 100).toLocaleString('es-AR')}`;
}

const CATEGORY_ICON = { racket: '🎾', balls: '🎾', shoes: '👟', apparel: '👕', accessory: '🧢', other: '📦' };

export default function EquiposView({ businessId, onStageChange }) {
  const { t } = useLanguage();
  const { items, loading } = useRentalItems(businessId);
  const [cart, setCart] = useState({}); // { rental_item_id: qty }
  const [checkingOut, setCheckingOut] = useState(false);
  const [mpReturn, setMpReturn] = useState(null); // rental_orders row after MP redirect
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle Mercado Pago return redirect: ?payment=success&kind=rental&id=<order_id>&guest_token=...
  useEffect(() => {
    const payment = searchParams.get('payment');
    const kind = searchParams.get('kind');
    const id = searchParams.get('id');
    const guestToken = searchParams.get('guest_token');
    if (!payment || kind !== 'rental' || !id) return;

    let cancelled = false;
    (async () => {
      if (payment === 'success' && guestToken) {
        await supabase.rpc('confirm_sports_payment_return', {
          p_kind: 'rental', p_id: id, p_guest_token: guestToken
        }).catch(() => {});
      }
      try {
        const order = await fetchRentalOrder(id);
        if (!cancelled) setMpReturn(order);
      } catch {
        // ignore — fall through to catalog view
      }
      const next = new URLSearchParams(searchParams);
      ['payment', 'kind', 'id', 'guest_token'].forEach((k) => next.delete(k));
      setSearchParams(next, { replace: true });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    onStageChange?.(checkingOut || mpReturn ? 'detail' : 'list');
  }, [checkingOut, mpReturn, onStageChange]);

  const cartCount = useMemo(() => Object.values(cart).reduce((s, q) => s + q, 0), [cart]);

  const setQty = (id, qty) => {
    setCart((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[id];
      else next[id] = qty;
      return next;
    });
  };

  if (mpReturn) {
    return (
      <ReservationSuccess
        rentalCode={mpReturn.rental_code}
        totalCents={mpReturn.total_cents}
        paid={mpReturn.payment_status === 'paid'}
        onBack={() => setMpReturn(null)}
      />
    );
  }

  if (checkingOut) {
    return (
      <Checkout
        businessId={businessId}
        items={items}
        cart={cart}
        onBack={() => setCheckingOut(false)}
        onDone={() => { setCart({}); setCheckingOut(false); }}
      />
    );
  }

  return (
    <div className="px-4 pb-24">
      <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{t('equipos') || 'Equipos'}</h2>

      {loading && (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-[var(--color-primary)]" size={28} />
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="bg-white/70 dark:bg-slate-900/40 rounded-xl p-8 text-center border" style={{ borderColor: 'var(--border-color)' }}>
          <Package className="mx-auto mb-3 text-[var(--color-primary)]" size={36} />
          <p style={{ color: 'var(--text-secondary)' }}>{t('no_rentals_found') || 'No hay equipos disponibles.'}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => {
          const qty = cart[item.id] || 0;
          const outOfStock = item.stock_available <= 0 && item.stock_total > 0;
          return (
            <div
              key={item.id}
              className="rounded-xl p-3 border shadow-sm flex flex-col"
              style={{ backgroundColor: 'var(--canvas-surface)', borderColor: 'var(--border-color)' }}
            >
              <div className="w-full aspect-square rounded-lg mb-2 flex items-center justify-center text-4xl" style={{ backgroundColor: 'var(--canvas-bg)' }}>
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                ) : (
                  item.icon || CATEGORY_ICON[item.category] || '📦'
                )}
              </div>
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{item.name}</span>
              <span className="text-sm mb-2" style={{ color: 'var(--color-primary)' }}>{formatMoney(item.price_cents)}</span>

              {outOfStock ? (
                <span className="text-xs text-center py-2" style={{ color: 'var(--text-secondary)' }}>{t('sin_stock') || 'Sin stock'}</span>
              ) : qty === 0 ? (
                <button
                  onClick={() => setQty(item.id, 1)}
                  className="mt-auto bg-[var(--color-primary)] hover:opacity-90 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                >
                  {t('agregar') || 'Agregar'}
                </button>
              ) : (
                <div className="mt-auto flex items-center justify-between gap-1">
                  <button onClick={() => setQty(item.id, qty - 1)} className="w-8 h-8 rounded-full flex items-center justify-center border" style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                    <Minus size={14} />
                  </button>
                  <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{qty}</span>
                  <button onClick={() => setQty(item.id, qty + 1)} className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--color-primary)] text-white">
                    <Plus size={14} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {cartCount > 0 && (
        <div className="fixed bottom-24 left-4 right-4 z-40">
          <button
            onClick={() => setCheckingOut(true)}
            className="w-full bg-[var(--color-accent)] hover:opacity-90 text-white font-bold py-3.5 rounded-full shadow-lg flex items-center justify-center gap-2"
          >
            <ShoppingBag size={18} />
            {t('carrito') || 'Carrito'} ({cartCount})
          </button>
        </div>
      )}
    </div>
  );
}

function Checkout({ businessId, items, cart, onBack, onDone }) {
  const { t } = useLanguage();
  const { tenantSlug } = useParams();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState(getSportsPhone());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const lines = Object.entries(cart).map(([id, quantity]) => {
    const item = items.find((i) => i.id === id);
    return { item, quantity };
  }).filter((l) => l.item);

  const total = lines.reduce((sum, l) => sum + (l.item.price_cents + (l.item.deposit_cents || 0)) * l.quantity, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerName || !customerPhone || lines.length === 0) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await createRentalPreference({
        businessId,
        tenantSlug,
        customerName,
        customerPhone,
        items: lines.map((l) => ({ rental_item_id: l.item.id, quantity: l.quantity }))
      });

      if (res?.error) {
        setError(res.error === 'mp_not_configured'
          ? (t('mp_not_configured') || 'El club todavía no configuró los pagos online. Probá de nuevo más tarde.')
          : (res.detail || res.error));
        return;
      }

      setSportsPhone(customerPhone);

      if (res?.init_point) {
        // Same checkout pattern as food/events: redirect to Mercado Pago
        window.location.href = res.init_point;
        return;
      }

      // free_order path (zero-cost cart) — already paid, no MP step needed
      setResult({ rental_code: res.code, total_cents: 0, paid: true });
    } catch (err) {
      setError(err?.message || 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <ReservationSuccess
        rentalCode={result.rental_code}
        totalCents={result.total_cents}
        paid={result.paid}
        onBack={onDone}
      />
    );
  }

  return (
    <div className="px-4 pb-4">
      <BackHeader onBack={onBack} title={t('carrito') || 'Carrito'} />

      <div className="space-y-2 mb-4">
        {lines.map(({ item, quantity }) => (
          <div key={item.id} className="flex justify-between text-sm py-1" style={{ color: 'var(--text-primary)' }}>
            <span>{item.name} x{quantity}</span>
            <span>{formatMoney((item.price_cents + (item.deposit_cents || 0)) * quantity)}</span>
          </div>
        ))}
        <div className="flex justify-between font-bold pt-2 border-t" style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
          <span>{t('total') || 'Total'}</span>
          <span>{formatMoney(total)}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <span className="text-sm font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>{t('nombre') || 'Nombre'}</span>
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
            className="w-full px-3 py-2.5 rounded-lg border outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            style={{ backgroundColor: 'var(--canvas-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>{t('telefono') || 'Teléfono'}</span>
          <input
            type="tel"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            required
            className="w-full px-3 py-2.5 rounded-lg border outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            style={{ backgroundColor: 'var(--canvas-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
          />
        </label>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-[var(--color-primary)] hover:opacity-90 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50"
        >
          {submitting ? '...' : (t('reservar') || 'Reservar')}
        </button>
      </form>
    </div>
  );
}

function ReservationSuccess({ rentalCode, totalCents, paid, onBack }) {
  const { t } = useLanguage();
  return (
    <div className="px-4 pb-4">
      <BackHeader onBack={onBack} title={t('reserva_confirmada') || 'Reserva confirmada'} />
      <div className="rounded-xl p-6 text-center border" style={{ backgroundColor: 'var(--canvas-surface)', borderColor: 'var(--border-color)' }}>
        <ShoppingBag className="mx-auto mb-3 text-[var(--color-primary)]" size={40} />
        <p className="mb-1" style={{ color: 'var(--text-secondary)' }}>{t('codigo_retiro') || 'Código de retiro'}</p>
        <p className="text-3xl font-black tracking-widest mb-3" style={{ color: 'var(--text-primary)' }}>{rentalCode}</p>
        {totalCents > 0 && (
          <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
            {t('total') || 'Total'}: {formatMoney(totalCents)}
          </p>
        )}
        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${paid ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
          {paid ? (t('pago_confirmado') || 'Pago confirmado') : (t('pago_pendiente') || 'Pago pendiente')}
        </span>
      </div>
    </div>
  );
}

function BackHeader({ onBack, title }) {
  return (
    <div className="flex items-center gap-2 py-3 mb-2">
      <button onClick={onBack} className="p-1.5 rounded-full" style={{ color: 'var(--text-primary)' }} aria-label="Back">
        <ChevronLeft size={22} />
      </button>
      <h2 className="text-lg font-bold truncate" style={{ color: 'var(--text-primary)' }}>{title}</h2>
    </div>
  );
}
