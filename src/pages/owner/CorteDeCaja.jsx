import { useState, useEffect, useCallback } from 'react';
import {
  Banknote, AlertTriangle, CheckCircle2, XCircle, Clock,
  ChevronDown, ChevronUp, RefreshCw, ShieldAlert, Check,
  TrendingDown, TrendingUp, User, FileText, Settings,
} from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabaseClient';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ARS = (cents) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format((cents ?? 0) / 100);

const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
};

const fmtDuration = (openedAt, closedAt) => {
  if (!openedAt || !closedAt) return '—';
  const ms = new Date(closedAt) - new Date(openedAt);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
};

// ─── Severity Style ───────────────────────────────────────────────────────────

const SEV = {
  ok:          { dot: '#10b981', label: 'OK',          bgCard: 'rgba(16,185,129,0.07)', border: 'rgba(16,185,129,0.3)' },
  warning:     { dot: '#F59E0B', label: 'Warning',     bgCard: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.3)' },
  critical:    { dot: '#EF4444', label: 'Critical',    bgCard: 'rgba(239,68,68,0.07)',  border: 'rgba(239,68,68,0.3)' },
  investigate: { dot: '#A855F7', label: 'Investigate', bgCard: 'rgba(168,85,247,0.07)', border: 'rgba(168,85,247,0.3)' },
};

function SevDot({ sev }) {
  const s = SEV[sev] ?? SEV.investigate;
  return <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: s.dot }} />;
}

function VarianceLabel({ cents }) {
  if (cents == null) return <span style={{ color: 'var(--text-tertiary)' }}>—</span>;
  if (cents === 0) return <span style={{ color: '#10b981' }}>$0 ✓</span>;
  const color = cents < 0 ? '#EF4444' : '#F59E0B';
  const Icon = cents < 0 ? TrendingDown : TrendingUp;
  return <span style={{ color }} className="flex items-center gap-1"><Icon size={12} />{ARS(Math.abs(cents))}</span>;
}

// ─── Shift Card ───────────────────────────────────────────────────────────────

function ShiftCard({ shift, staffMap, onAction }) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [actionNote, setActionNote] = useState('');
  const [adjCash, setAdjCash] = useState('');
  const [adjCard, setAdjCard] = useState('');
  const [adjMp, setAdjMp] = useState('');
  const [acting, setActing] = useState(false);
  const [showAdj, setShowAdj] = useState(false);

  const sev = shift.severity ?? 'ok';
  const style = SEV[sev] ?? SEV.investigate;
  const openedByName = staffMap[shift.opened_by] ?? shift.opened_by?.slice(0, 8);
  const closedByName = staffMap[shift.closed_by] ?? '—';
  const isForced = shift.status === 'forced_closed';
  const needsReview = ['warning', 'critical', 'investigate'].includes(sev) && !shift.is_finalized;

  const handleApprove = async () => {
    setActing(true);
    await onAction(shift.id, 'approved', actionNote, null, shift.version);
    setActing(false);
  };

  const handleAdjust = async () => {
    setActing(true);
    const newActuals = {
      actual_cash_cents: adjCash !== '' ? Math.round(parseFloat(adjCash) * 100) : shift.actual_cash_cents,
      actual_card_cents: adjCard !== '' ? Math.round(parseFloat(adjCard) * 100) : shift.actual_card_cents,
      actual_mp_cents:   adjMp !== ''   ? Math.round(parseFloat(adjMp) * 100)   : shift.actual_mp_cents,
    };
    await onAction(shift.id, 'adjusted', actionNote, newActuals, shift.version);
    setActing(false);
    setShowAdj(false);
  };

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: style.border, backgroundColor: style.bgCard }}>
      {/* Header row */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <SevDot sev={sev} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
              {fmtDate(shift.opened_at)}
            </span>
            {isForced && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-red-500/20 text-red-400">FORZADO</span>
            )}
            {shift.is_finalized && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400">✓ APROBADO</span>
            )}
          </div>
          <div className="text-xs mt-0.5 flex items-center gap-2" style={{ color: 'var(--text-tertiary)' }}>
            <User size={10} /> {openedByName}
            <span>·</span>
            <Clock size={10} /> {fmtDuration(shift.opened_at, shift.closed_at)}
          </div>
        </div>
        <div className="text-right shrink-0">
          <VarianceLabel cents={shift.variance_total_cents} />
          {expanded ? <ChevronUp size={14} style={{ color: 'var(--text-tertiary)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-tertiary)' }} />}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
          {/* Method breakdown table */}
          <table className="w-full text-xs mt-3">
            <thead>
              <tr style={{ color: 'var(--text-tertiary)' }}>
                <th className="text-left pb-1.5 font-semibold">{t('method')}</th>
                <th className="text-right pb-1.5 font-semibold">{t('expected')}</th>
                <th className="text-right pb-1.5 font-semibold">{t('actual')}</th>
                <th className="text-right pb-1.5 font-semibold">{t('variance')}</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: t('cash'), exp: shift.expected_cash_cents, act: shift.actual_cash_cents, var: shift.variance_cash_cents },
                { label: t('card'), exp: shift.expected_card_cents, act: shift.actual_card_cents, var: shift.variance_card_cents },
                { label: t('mp_qr'), exp: shift.expected_mp_cents, act: shift.actual_mp_cents, var: shift.variance_mp_cents },
              ].map(row => (
                <tr key={row.label} className="border-t" style={{ borderColor: 'var(--border-color)' }}>
                  <td className="py-1.5" style={{ color: 'var(--text-secondary)' }}>{row.label}</td>
                  <td className="py-1.5 text-right" style={{ color: 'var(--text-secondary)' }}>{ARS(row.exp)}</td>
                  <td className="py-1.5 text-right font-semibold" style={{ color: 'var(--text-primary)' }}>{row.act != null ? ARS(row.act) : '—'}</td>
                  <td className="py-1.5 text-right"><VarianceLabel cents={row.var} /></td>
                </tr>
              ))}
              <tr className="border-t-2 font-bold" style={{ borderColor: 'var(--border-color)' }}>
                <td className="py-1.5" style={{ color: 'var(--text-primary)' }}>{t('total')}</td>
                <td className="py-1.5 text-right" style={{ color: 'var(--text-primary)' }}>{ARS(shift.expected_total_cents)}</td>
                <td className="py-1.5 text-right" style={{ color: 'var(--text-primary)' }}>{ARS(shift.actual_total_cents)}</td>
                <td className="py-1.5 text-right"><VarianceLabel cents={shift.variance_total_cents} /></td>
              </tr>
            </tbody>
          </table>

          {/* Float info */}
          <div className="rounded-xl px-3 py-2 text-xs space-y-1" style={{ backgroundColor: 'var(--input-bg)' }}>
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-tertiary)' }}>{t('opening_float')}</span>
              <span style={{ color: 'var(--text-primary)' }}>{ARS(shift.float_cents)}</span>
            </div>
            {shift.float_discrepancy_cents != null && Math.abs(shift.float_discrepancy_cents) > 0 && (
              <div className="flex justify-between text-amber-400">
                <span>{t('float_discrepancy')}</span>
                <span>{ARS(Math.abs(shift.float_discrepancy_cents))}</span>
              </div>
            )}
          </div>

          {/* Close note */}
          {shift.close_note && (
            <div className="rounded-xl px-3 py-2 text-xs" style={{ backgroundColor: 'var(--input-bg)' }}>
              <p className="font-bold mb-1" style={{ color: 'var(--text-tertiary)' }}>
                <FileText size={10} className="inline mr-1" />{t('staff_note')}
              </p>
              <p style={{ color: 'var(--text-primary)' }}>{shift.close_note}</p>
            </div>
          )}

          {/* Forced close reason */}
          {shift.forced_close_reason && (
            <div className="rounded-xl px-3 py-2 text-xs bg-red-500/10 border border-red-500/30">
              <p className="font-bold text-red-400 mb-1"><ShieldAlert size={10} className="inline mr-1" />{t('force_close_reason')}</p>
              <p style={{ color: 'var(--text-primary)' }}>{shift.forced_close_reason}</p>
            </div>
          )}

          {/* Manager actions */}
          {needsReview && !shift.manager_action && (
            <div className="space-y-2 pt-1">
              <div>
                <textarea
                  rows={2}
                  placeholder={t('manager_note_placeholder')}
                  value={actionNote}
                  onChange={e => setActionNote(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-xs resize-none outline-none"
                  style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>

              {/* Adjustment inputs */}
              {showAdj && (
                <div className="space-y-2 rounded-xl p-3 border" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--input-bg)' }}>
                  <p className="text-xs font-bold" style={{ color: 'var(--text-tertiary)' }}>{t('adjust_actuals')}</p>
                  {[
                    { label: t('cash'), val: adjCash, set: setAdjCash, ph: shift.actual_cash_cents != null ? (shift.actual_cash_cents / 100).toFixed(2) : '' },
                    { label: t('card'), val: adjCard, set: setAdjCard, ph: shift.actual_card_cents != null ? (shift.actual_card_cents / 100).toFixed(2) : '' },
                    { label: t('mp_qr'), val: adjMp, set: setAdjMp, ph: shift.actual_mp_cents != null ? (shift.actual_mp_cents / 100).toFixed(2) : '' },
                  ].map(f => (
                    <div key={f.label} className="flex items-center gap-2">
                      <span className="w-12 text-xs" style={{ color: 'var(--text-secondary)' }}>{f.label}</span>
                      <input
                        type="number" inputMode="decimal"
                        placeholder={f.ph}
                        value={f.val}
                        onChange={e => f.set(e.target.value)}
                        className="flex-1 rounded-lg border px-2 py-1.5 text-xs outline-none"
                        style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  ))}
                  <button
                    onClick={handleAdjust}
                    disabled={acting || actionNote.trim().length < 3}
                    className="w-full py-2 rounded-lg font-bold text-xs text-white mt-1"
                    style={{ backgroundColor: actionNote.trim().length >= 3 ? '#F59E0B' : '#F59E0B60' }}
                  >
                    {acting ? t('saving') : t('save_adjustment')}
                  </button>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleApprove}
                  disabled={acting}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-xs text-white"
                  style={{ backgroundColor: '#10b981' }}
                >
                  <Check size={14} /> {t('approve')}
                </button>
                <button
                  onClick={() => setShowAdj(v => !v)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-xs border"
                  style={{ borderColor: '#F59E0B', color: '#F59E0B' }}
                >
                  <Settings size={14} /> {t('adjust')}
                </button>
              </div>
            </div>
          )}

          {/* Already actioned */}
          {shift.manager_action && (
            <div className="rounded-xl px-3 py-2 text-xs bg-emerald-500/10 border border-emerald-500/30">
              <p className="text-emerald-400 font-bold">
                {shift.manager_action === 'approved' ? t('approved_by') : t('adjusted_by')} ·{' '}
                {staffMap[shift.reviewed_by] ?? '—'} · {fmtDate(shift.reviewed_at)}
              </p>
              {shift.manager_note && <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>{shift.manager_note}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Summary Stats Bar ────────────────────────────────────────────────────────

function SummaryStats({ shifts }) {
  const { t } = useLanguage();
  const total = shifts.length;
  const ok = shifts.filter(s => s.severity === 'ok').length;
  const critical = shifts.filter(s => s.severity === 'critical').length;
  const pending = shifts.filter(s => ['warning', 'critical', 'investigate'].includes(s.severity) && !s.is_finalized).length;

  return (
    <div className="grid grid-cols-3 gap-2 mb-4">
      {[
        { label: t('shifts_total'), value: total, color: 'var(--text-primary)' },
        { label: t('ok'), value: ok, color: '#10b981' },
        { label: t('pending_review'), value: pending, color: pending > 0 ? '#EF4444' : 'var(--text-primary)' },
      ].map(s => (
        <div key={s.label} className="rounded-xl px-3 py-2.5 text-center border"
          style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--input-bg)' }}>
          <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{s.label}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CorteDeCaja() {
  const { businessId } = useTenant();
  const { t } = useLanguage();
  const [shifts, setShifts] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [staffMap, setStaffMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'pending' | 'critical'
  const [tab, setTab] = useState('shifts'); // 'shifts' | 'alerts'

  const loadData = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);

    const [shiftsRes, alertsRes, staffRes] = await Promise.all([
      supabase
        .from('shifts')
        .select('*')
        .eq('business_id', businessId)
        .order('opened_at', { ascending: false })
        .limit(50),
      supabase
        .from('variance_alerts')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('staff')
        .select('id, name')
        .eq('business_id', businessId),
    ]);

    if (shiftsRes.data) setShifts(shiftsRes.data);
    if (alertsRes.data) setAlerts(alertsRes.data);
    if (staffRes.data) {
      const map = {};
      staffRes.data.forEach(s => { map[s.id] = s.name; });
      setStaffMap(map);
    }

    setLoading(false);
  }, [businessId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAction = async (shiftId, action, note, newActuals, currentVersion) => {
    const payload = {
      manager_action: action,
      manager_note: note || null,
      reviewed_by: null, // would be current owner's staff id if wired
      reviewed_at: new Date().toISOString(),
      is_finalized: true,
      finalized_at: new Date().toISOString(),
      version: currentVersion + 1,
    };

    if (action === 'adjusted' && newActuals) {
      // Snapshot originals before overwrite
      const orig = shifts.find(s => s.id === shiftId);
      payload.original_actual_cents = {
        cash: orig?.actual_cash_cents,
        card: orig?.actual_card_cents,
        mp: orig?.actual_mp_cents,
      };
      Object.assign(payload, newActuals);
      // Recalc variance
      const s = shifts.find(sh => sh.id === shiftId);
      if (s) {
        payload.variance_cash_cents = (payload.actual_cash_cents ?? s.actual_cash_cents ?? 0) - (s.expected_cash_cents ?? 0);
        payload.variance_card_cents = (payload.actual_card_cents ?? s.actual_card_cents ?? 0) - (s.expected_card_cents ?? 0);
        payload.variance_mp_cents   = (payload.actual_mp_cents   ?? s.actual_mp_cents   ?? 0) - (s.expected_mp_cents ?? 0);
        const totalAct = (payload.actual_cash_cents ?? 0) + (payload.actual_card_cents ?? 0) + (payload.actual_mp_cents ?? 0);
        payload.actual_total_cents  = totalAct;
        payload.variance_total_cents = totalAct - (s.expected_total_cents ?? 0);
      }
    }

    const { error } = await supabase
      .from('shifts')
      .update(payload)
      .eq('id', shiftId)
      .eq('version', currentVersion);

    if (!error) {
      loadData();
    }
  };

  const resolveAlert = async (alertId) => {
    await supabase.from('variance_alerts').update({ resolved: true, resolved_at: new Date().toISOString() }).eq('id', alertId);
    setAlerts(a => a.map(al => al.id === alertId ? { ...al, resolved: true } : al));
  };

  const filteredShifts = shifts.filter(s => {
    if (filter === 'pending') return ['warning', 'critical', 'investigate'].includes(s.severity) && !s.is_finalized;
    if (filter === 'critical') return s.severity === 'critical';
    return true;
  });

  const unresolvedAlerts = alerts.filter(a => !a.resolved);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Title */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
          <Banknote size={20} className="text-emerald-400" />
        </div>
        <div>
          <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>{t('corte_de_caja')}</h1>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('owner_review_desc')}</p>
        </div>
        <button onClick={loadData} className="ml-auto" style={{ color: 'var(--text-tertiary)' }}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {!loading && shifts.length > 0 && <SummaryStats shifts={shifts} />}

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl mb-4" style={{ backgroundColor: 'var(--input-bg)' }}>
        {[
          { id: 'shifts', label: t('shifts') },
          { id: 'alerts', label: `${t('alerts')}${unresolvedAlerts.length > 0 ? ` (${unresolvedAlerts.length})` : ''}` },
        ].map(tb => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className="flex-1 py-2 rounded-lg text-sm font-bold transition-colors"
            style={{
              backgroundColor: tab === tb.id ? 'var(--app-bg)' : 'transparent',
              color: tab === tb.id ? 'var(--text-primary)' : 'var(--text-tertiary)',
            }}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* Shifts tab */}
      {tab === 'shifts' && (
        <>
          {/* Filter pills */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
            {[
              { id: 'all', label: t('all') },
              { id: 'pending', label: t('pending_review') },
              { id: 'critical', label: t('critical') },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors border"
                style={{
                  backgroundColor: filter === f.id ? 'var(--color-primary)' : 'transparent',
                  borderColor: filter === f.id ? 'var(--color-primary)' : 'var(--border-color)',
                  color: filter === f.id ? '#fff' : 'var(--text-secondary)',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12" style={{ color: 'var(--text-tertiary)' }}>
              <RefreshCw size={18} className="animate-spin mr-2" /> {t('loading')}
            </div>
          ) : filteredShifts.length === 0 ? (
            <div className="text-center py-12" style={{ color: 'var(--text-tertiary)' }}>
              <Banknote size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">{t('no_shifts_yet')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredShifts.map(s => (
                <ShiftCard key={s.id} shift={s} staffMap={staffMap} onAction={handleAction} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Alerts tab */}
      {tab === 'alerts' && (
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="text-center py-12" style={{ color: 'var(--text-tertiary)' }}>
              <CheckCircle2 size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">{t('no_alerts')}</p>
            </div>
          ) : alerts.map(al => (
            <div key={al.id} className={`rounded-xl border px-4 py-3 ${al.resolved ? 'opacity-50' : ''}`}
              style={{ borderColor: al.severity === 'critical' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)', backgroundColor: al.severity === 'critical' ? 'rgba(239,68,68,0.07)' : 'rgba(245,158,11,0.07)' }}>
              <div className="flex items-start gap-2">
                {al.severity === 'critical'
                  ? <XCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                  : <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{al.message}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{fmtDate(al.created_at)}</p>
                </div>
                {!al.resolved && (
                  <button onClick={() => resolveAlert(al.id)} className="text-xs px-2 py-1 rounded-lg font-bold text-emerald-400 bg-emerald-500/10 shrink-0">
                    {t('resolve')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
