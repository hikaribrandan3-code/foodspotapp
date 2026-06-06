import { useState, useEffect, useCallback } from 'react';
import { CalendarDays, Clock, Users, Phone, MessageSquare, Check, X, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBusiness } from '@/contexts/BusinessContext';
// @ts-ignore
import { supabase } from '../../lib/supabaseClient.js';

interface Reservation {
  id: string;
  customer_name: string;
  customer_phone: string;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  notes: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'no_show' | 'completed';
  created_at: string;
}

type FilterTab = 'pending' | 'approved' | 'all';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const isToday = d.toDateString() === today.toDateString();
  const isTomorrow = d.toDateString() === tomorrow.toDateString();

  if (isToday) return 'Hoy';
  if (isTomorrow) return 'Mañana';
  return d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTime(timeStr: string): string {
  return timeStr?.slice(0, 5) || '';
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  pending:  { bg: '#FEF3C7', text: '#92400E', label: 'Pendiente' },
  approved: { bg: '#D1FAE5', text: '#065F46', label: 'Aprobada' },
  rejected: { bg: '#FEE2E2', text: '#991B1B', label: 'Rechazada' },
  no_show:  { bg: '#F3F4F6', text: '#6B7280', label: 'No se presentó' },
  completed:{ bg: '#EDE9FE', text: '#5B21B6', label: 'Completada' },
};

export default function ReservationsView() {
  const { t, language } = useLanguage();
  const { businessId } = useBusiness();

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('pending');
  const [actioning, setActioning] = useState<string | null>(null);

  const fetchReservations = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('business_id', businessId)
        .order('reservation_date', { ascending: true })
        .order('reservation_time', { ascending: true });

      if (!error && data) setReservations(data);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  // Realtime subscription
  useEffect(() => {
    if (!businessId) return;
    const channel = supabase
      .channel(`reservations-${businessId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'reservations',
        filter: `business_id=eq.${businessId}`,
      }, () => fetchReservations())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [businessId, fetchReservations]);

  const updateStatus = async (id: string, status: string) => {
    setActioning(id + status);
    try {
      await supabase
        .from('reservations')
        .update({ status, approved_at: status === 'approved' ? new Date().toISOString() : null })
        .eq('id', id)
        .eq('business_id', businessId);

      setReservations(prev => prev.map(r => r.id === id ? { ...r, status: status as any } : r));
    } finally {
      setActioning(null);
    }
  };

  const filtered = reservations.filter(r => {
    if (filter === 'pending') return r.status === 'pending';
    if (filter === 'approved') return r.status === 'approved';
    return true;
  });

  const pendingCount = reservations.filter(r => r.status === 'pending').length;

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--app-bg)' }}>

      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b" style={{ borderColor: 'var(--nav-border)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>
              {t('reservations_title')}
            </h1>
            {pendingCount > 0 && (
              <p className="text-xs font-semibold mt-0.5" style={{ color: '#F59E0B' }}>
                {pendingCount} pendiente{pendingCount > 1 ? 's' : ''} esperando confirmación
              </p>
            )}
          </div>
          <button
            onClick={fetchReservations}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
            style={{ backgroundColor: 'var(--filter-active-bg)' }}
          >
            <RefreshCw size={16} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {(['pending', 'approved', 'all'] as FilterTab[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-1.5 rounded-full text-xs font-bold transition-all"
              style={{
                backgroundColor: filter === f ? 'var(--text-primary)' : 'var(--filter-active-bg)',
                color: filter === f ? 'var(--app-bg)' : 'var(--text-secondary)',
              }}
            >
              {f === 'pending' ? `${t('reservations_pending')}${pendingCount > 0 ? ` (${pendingCount})` : ''}` :
               f === 'approved' ? t('reservations_approved') : t('reservations_all')}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <CalendarDays size={36} style={{ color: 'var(--text-tertiary)', opacity: 0.4 }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--text-tertiary)' }}>
              {t('reservation_empty')}
            </p>
          </div>
        ) : (
          filtered.map(r => {
            const sc = STATUS_COLORS[r.status] || STATUS_COLORS.pending;
            const isPending = r.status === 'pending';
            return (
              <div
                key={r.id}
                className="rounded-2xl p-4"
                style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--nav-border)' }}
              >
                {/* Top row: date/time + status */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <CalendarDays size={14} style={{ color: 'var(--text-secondary)' }} />
                      <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                        {formatDate(r.reservation_date)}
                      </span>
                    </div>
                    <span style={{ color: 'var(--text-tertiary)' }}>·</span>
                    <div className="flex items-center gap-1">
                      <Clock size={13} style={{ color: 'var(--text-secondary)' }} />
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {formatTime(r.reservation_time)}
                      </span>
                    </div>
                  </div>
                  <span
                    className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: sc.bg, color: sc.text }}
                  >
                    {sc.label}
                  </span>
                </div>

                {/* Customer info */}
                <div className="flex items-center gap-4 mb-2">
                  <div>
                    <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>{r.customer_name}</p>
                  </div>
                  <div className="flex items-center gap-1.5 ml-auto">
                    <Users size={13} style={{ color: 'var(--text-secondary)' }} />
                    <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      {r.party_size} {t('reservation_people')}
                    </span>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-center gap-1.5 mb-2">
                  <Phone size={13} style={{ color: 'var(--text-secondary)' }} />
                  <a
                    href={`tel:${r.customer_phone}`}
                    className="text-sm font-semibold"
                    style={{ color: '#3B82F6' }}
                  >
                    {r.customer_phone}
                  </a>
                </div>

                {/* Notes */}
                {r.notes && (
                  <div className="flex items-start gap-1.5 mb-3 px-3 py-2 rounded-xl" style={{ backgroundColor: 'var(--filter-active-bg)' }}>
                    <MessageSquare size={13} style={{ color: 'var(--text-secondary)', marginTop: 2 }} />
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{r.notes}</p>
                  </div>
                )}

                {/* Action buttons — only for pending */}
                {isPending && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => updateStatus(r.id, 'rejected')}
                      disabled={!!actioning}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all"
                      style={{ backgroundColor: '#FEE2E2', color: '#DC2626', opacity: actioning ? 0.6 : 1 }}
                    >
                      <X size={15} />
                      {t('reservation_reject')}
                    </button>
                    <button
                      onClick={() => updateStatus(r.id, 'approved')}
                      disabled={!!actioning}
                      className="flex-2 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all"
                      style={{ flex: 2, backgroundColor: '#D1FAE5', color: '#065F46', opacity: actioning ? 0.6 : 1 }}
                    >
                      <Check size={15} />
                      {actioning === r.id + 'approved' ? '...' : t('reservation_approve')}
                    </button>
                  </div>
                )}

                {/* No-show button for approved reservations */}
                {r.status === 'approved' && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => updateStatus(r.id, 'no_show')}
                      disabled={!!actioning}
                      className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                      style={{ backgroundColor: 'var(--filter-active-bg)', color: 'var(--text-secondary)', opacity: actioning ? 0.6 : 1 }}
                    >
                      {t('reservation_no_show')}
                    </button>
                    <button
                      onClick={() => updateStatus(r.id, 'completed')}
                      disabled={!!actioning}
                      className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                      style={{ backgroundColor: '#EDE9FE', color: '#5B21B6', opacity: actioning ? 0.6 : 1 }}
                    >
                      ✓ Arrived
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
