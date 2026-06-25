import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign, Clock, CheckCircle2, AlertTriangle, XCircle,
  ChevronRight, ArrowLeft, Banknote, CreditCard, Smartphone,
  TrendingDown, TrendingUp, Minus, Lock, Unlock, FileText,
  RefreshCw, ShieldAlert,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBusiness } from '@/contexts/BusinessContext';
// @ts-ignore
import { supabase } from '../../lib/supabaseClient.js';

// ─── Types ────────────────────────────────────────────────────────────────────

type ShiftStatus = 'open' | 'closing' | 'closed' | 'forced_closed';
type Severity = 'ok' | 'warning' | 'critical' | 'investigate';

interface Shift {
  id: string;
  status: ShiftStatus;
  opened_at: string;
  closed_at: string | null;
  opened_by: string;
  float_cents: number;
  carried_float_cents: number | null;
  float_discrepancy_cents: number | null;
  expected_cash_cents: number | null;
  expected_card_cents: number | null;
  expected_mp_cents: number | null;
  expected_total_cents: number | null;
  actual_cash_cents: number | null;
  actual_card_cents: number | null;
  actual_mp_cents: number | null;
  actual_total_cents: number | null;
  variance_cash_cents: number | null;
  variance_card_cents: number | null;
  variance_mp_cents: number | null;
  variance_total_cents: number | null;
  variance_pct: number | null;
  severity: Severity | null;
  close_note: string | null;
  version: number;
}

type StepId = 'open_float' | 'shift_active' | 'count' | 'review' | 'done';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ARS = (cents: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(cents / 100);

const toCents = (val: string): number => Math.round((parseFloat(val) || 0) * 100);

function getSeverity(
  varianceTotalCents: number,
  expectedTotalCents: number,
  varianceCashCents: number,
  varianceCardCents: number,
): Severity {
  const absTotal = Math.abs(varianceTotalCents);
  const pct = expectedTotalCents > 0 ? (absTotal / expectedTotalCents) * 100 : 0;
  const absCard = Math.abs(varianceCardCents);
  const absCash = Math.abs(varianceCashCents);

  if (absTotal > 2000 || pct > 2 || absCard > 0) return 'critical';
  if (absCash > 1000 || pct > 1) return 'warning';
  if (absCash > 200) return 'warning';
  return 'ok';
}

function formatElapsed(openedAt: string): string {
  const ms = Date.now() - new Date(openedAt).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

// ─── Variance Badge ───────────────────────────────────────────────────────────

function VarianceBadge({ cents }: { cents: number }) {
  if (cents === 0) return <span className="text-emerald-400 font-bold">$0 ✓</span>;
  const color = cents < 0 ? 'text-red-400' : 'text-amber-400';
  const icon = cents < 0 ? <TrendingDown size={13} className="inline" /> : <TrendingUp size={13} className="inline" />;
  return <span className={`font-bold ${color}`}>{icon} {ARS(Math.abs(cents))}</span>;
}

// ─── Severity Color ───────────────────────────────────────────────────────────

const SEVERITY_STYLE: Record<Severity, { ring: string; bg: string; label: string }> = {
  ok:          { ring: 'border-emerald-500', bg: 'bg-emerald-500/10', label: 'OK' },
  warning:     { ring: 'border-amber-500',   bg: 'bg-amber-500/10',   label: '⚠ Warning' },
  critical:    { ring: 'border-red-500',     bg: 'bg-red-500/10',     label: '🔴 Critical' },
  investigate: { ring: 'border-purple-500',  bg: 'bg-purple-500/10',  label: '🔍 Investigate' },
};

// ─── Step: Open Float ─────────────────────────────────────────────────────────

function StepOpenFloat({ onOpen, prevShift }: {
  onOpen: (floatCents: number, note: string) => void;
  prevShift: { float_cents: number; closed_at: string | null } | null;
}) {
  const { t } = useLanguage();
  const [floatInput, setFloatInput] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const carriedCents = prevShift?.float_cents ?? null;
  const inputCents = toCents(floatInput);
  const discrepancy = carriedCents !== null ? inputCents - carriedCents : null;
  const needsNote = discrepancy !== null && Math.abs(discrepancy) > 200;

  const canOpen = floatInput !== '' && (!needsNote || note.trim().length >= 5) && !loading;

  const handleOpen = () => {
    if (!canOpen) return;
    setLoading(true);
    onOpen(inputCents, note.trim());
  };

  return (
    <div className="flex flex-col gap-5 px-4 py-6 max-w-sm mx-auto">
      <div className="text-center mb-2">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 flex items-center justify-center mx-auto mb-3">
          <Unlock size={26} className="text-emerald-400" />
        </div>
        <h2 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>
          {t('shift_open_title')}
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
          {t('shift_open_subtitle')}
        </p>
      </div>

      {/* Previous shift float hint */}
      {carriedCents !== null && (
        <div className="rounded-xl px-4 py-3 bg-blue-500/10 border border-blue-500/30 text-sm"
          style={{ color: 'var(--text-secondary)' }}>
          {t('prev_shift_closed_with')} <strong className="text-blue-400">{ARS(carriedCents)}</strong>
        </div>
      )}

      {/* Float input */}
      <div>
        <label className="text-xs font-bold mb-1.5 block" style={{ color: 'var(--text-tertiary)' }}>
          {t('opening_float')}
        </label>
        <div className="flex items-center gap-2 rounded-xl border px-4 py-3"
          style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-color)' }}>
          <Banknote size={18} style={{ color: 'var(--text-tertiary)' }} />
          <input
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            value={floatInput}
            onChange={e => setFloatInput(e.target.value)}
            className="flex-1 bg-transparent text-lg font-bold outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
          <span className="text-sm font-semibold" style={{ color: 'var(--text-tertiary)' }}>ARS</span>
        </div>
      </div>

      {/* Float discrepancy warning */}
      {discrepancy !== null && Math.abs(discrepancy) > 0 && (
        <div className={`rounded-xl px-4 py-3 text-sm border ${Math.abs(discrepancy) > 200 ? 'bg-amber-500/10 border-amber-500/40 text-amber-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
          {discrepancy > 0
            ? `+${ARS(discrepancy)} ${t('float_excess')}`
            : `${ARS(discrepancy)} ${t('float_shortage')}`}
        </div>
      )}

      {/* Note — required if discrepancy > $2 */}
      {needsNote && (
        <div>
          <label className="text-xs font-bold mb-1.5 block text-amber-400">
            {t('float_note_required')}
          </label>
          <textarea
            rows={2}
            placeholder={t('float_note_placeholder')}
            value={note}
            onChange={e => setNote(e.target.value)}
            className="w-full rounded-xl border px-4 py-3 text-sm resize-none outline-none"
            style={{
              backgroundColor: 'var(--input-bg)',
              borderColor: '#F59E0B',
              color: 'var(--text-primary)',
            }}
          />
        </div>
      )}

      <button
        onClick={handleOpen}
        disabled={!canOpen}
        className="w-full py-3.5 rounded-xl font-bold text-white transition-opacity text-base"
        style={{ backgroundColor: canOpen ? '#10b981' : '#10b98160' }}
      >
        {loading ? t('opening') : t('open_shift')}
      </button>
    </div>
  );
}

// ─── Step: Shift Active ────────────────────────────────────────────────────────

function StepShiftActive({ shift, onStartClose, onForceClose }: {
  shift: Shift;
  onStartClose: () => void;
  onForceClose: () => void;
}) {
  const { t } = useLanguage();
  const [elapsed, setElapsed] = useState(formatElapsed(shift.opened_at));

  useEffect(() => {
    const id = setInterval(() => setElapsed(formatElapsed(shift.opened_at)), 60000);
    return () => clearInterval(id);
  }, [shift.opened_at]);

  return (
    <div className="flex flex-col gap-5 px-4 py-6 max-w-sm mx-auto">
      <div className="text-center mb-2">
        <div className="w-14 h-14 rounded-2xl bg-blue-500/15 flex items-center justify-center mx-auto mb-3">
          <Clock size={26} className="text-blue-400" />
        </div>
        <h2 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>
          {t('shift_active')}
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>{elapsed} {t('elapsed')}</p>
      </div>

      {/* Float opened with */}
      <div className="rounded-xl px-4 py-3 border" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--input-bg)' }}>
        <p className="text-xs font-bold mb-1" style={{ color: 'var(--text-tertiary)' }}>{t('opened_with_float')}</p>
        <p className="text-2xl font-black text-emerald-400">{ARS(shift.float_cents)}</p>
      </div>

      <button
        onClick={onStartClose}
        className="w-full py-3.5 rounded-xl font-bold text-white text-base"
        style={{ backgroundColor: '#3B82F6' }}
      >
        {t('start_close')} →
      </button>

      <button
        onClick={onForceClose}
        className="w-full py-3 rounded-xl font-semibold text-sm border border-red-500/40 text-red-400 bg-red-500/10"
      >
        {t('force_close')}
      </button>
    </div>
  );
}

// ─── Step: Count ──────────────────────────────────────────────────────────────

function StepCount({ shift, onSubmit, onBack }: {
  shift: Shift;
  onSubmit: (counts: { cash: number; card: number; mp: number; other: number; note: string }) => void;
  onBack: () => void;
}) {
  const { t } = useLanguage();
  const [cash, setCash] = useState('');
  const [card, setCard] = useState('');
  const [mp, setMp] = useState('');
  const [other, setOther] = useState('');
  const [note, setNote] = useState('');
  const [step, setStep] = useState(0);  // 0=cash, 1=card, 2=mp, 3=other, 4=note

  const cashCents   = toCents(cash);
  const cardCents   = toCents(card);
  const mpCents     = toCents(mp);
  const otherCents  = toCents(other);
  const totalCents  = cashCents + cardCents + mpCents + otherCents;

  const expectedCash  = shift.expected_cash_cents ?? 0;
  const expectedCard  = shift.expected_card_cents ?? 0;
  const expectedMp    = shift.expected_mp_cents ?? 0;
  const expectedTotal = shift.expected_total_cents ?? 0;

  const varCash  = cashCents - expectedCash;
  const varCard  = cardCents - expectedCard;
  const varTotal = totalCents - expectedTotal;

  const sev = getSeverity(varTotal, expectedTotal, varCash, varCard);
  const needsNote = sev !== 'ok';

  const steps = [
    { key: 'cash',  label: t('cash'),     icon: <Banknote size={20} />,    value: cash,  set: setCash,  expected: expectedCash },
    { key: 'card',  label: t('card'),     icon: <CreditCard size={20} />,  value: card,  set: setCard,  expected: expectedCard },
    { key: 'mp',    label: t('mp_qr'),    icon: <Smartphone size={20} />,  value: mp,    set: setMp,    expected: expectedMp },
    { key: 'other', label: t('other'),    icon: <DollarSign size={20} />,  value: other, set: setOther, expected: null },
  ];

  const canSubmit = steps.every(s => s.value !== '') && (!needsNote || note.trim().length >= 5);

  const handleNext = () => {
    if (step < steps.length) setStep(s => s + 1);
    else {
      onSubmit({ cash: cashCents, card: cardCents, mp: mpCents, other: otherCents, note: note.trim() });
    }
  };

  const currentStep = step < steps.length ? steps[step] : null;

  return (
    <div className="flex flex-col gap-4 px-4 py-6 max-w-sm mx-auto">
      {/* Progress dots */}
      <div className="flex gap-1.5 justify-center mb-1">
        {steps.map((s, i) => (
          <div key={s.key} className="h-1.5 rounded-full flex-1 transition-colors"
            style={{ backgroundColor: i <= step ? '#3B82F6' : 'var(--border-color)' }} />
        ))}
      </div>

      {/* Current method input */}
      {currentStep && (
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
          <div className="text-center mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center mx-auto mb-2 text-blue-400">
              {currentStep.icon}
            </div>
            <h3 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>{t('count_method')} {currentStep.label}</h3>
            {currentStep.expected !== null && (
              <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                {t('system_expects')} <strong className="text-blue-400">{ARS(currentStep.expected)}</strong>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 rounded-xl border px-4 py-3 mb-3"
            style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-color)' }}>
            <span style={{ color: 'var(--text-tertiary)' }}>{currentStep.icon}</span>
            <input
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={currentStep.value}
              onChange={e => currentStep.set(e.target.value)}
              autoFocus
              className="flex-1 bg-transparent text-2xl font-black outline-none"
              style={{ color: 'var(--text-primary)' }}
            />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-tertiary)' }}>ARS</span>
          </div>

          {/* Live variance hint */}
          {currentStep.expected !== null && currentStep.value !== '' && (
            <div className="text-center text-sm">
              {(() => {
                const v = toCents(currentStep.value) - currentStep.expected;
                if (v === 0) return <span className="text-emerald-400 font-bold">✓ {t('matches')}</span>;
                return <VarianceBadge cents={v} />;
              })()}
            </div>
          )}
        </motion.div>
      )}

      {/* Note step */}
      {step === steps.length && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
          <div className="text-center mb-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center mx-auto mb-2 text-amber-400">
              <FileText size={20} />
            </div>
            <h3 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>{t('close_note')}</h3>
            {needsNote && (
              <p className="text-xs text-amber-400 mt-1">{t('note_required_variance')}</p>
            )}
          </div>
          <textarea
            rows={3}
            placeholder={needsNote ? t('note_required_placeholder') : t('note_optional_placeholder')}
            value={note}
            onChange={e => setNote(e.target.value)}
            className="w-full rounded-xl border px-4 py-3 text-sm resize-none outline-none"
            style={{
              backgroundColor: 'var(--input-bg)',
              borderColor: needsNote ? '#F59E0B' : 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
          />
          {/* Total summary */}
          <div className="mt-3 rounded-xl border px-4 py-3 space-y-1.5 text-sm"
            style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--input-bg)' }}>
            <div className="flex justify-between"><span style={{ color: 'var(--text-tertiary)' }}>{t('total_counted')}</span><strong style={{ color: 'var(--text-primary)' }}>{ARS(totalCents)}</strong></div>
            <div className="flex justify-between"><span style={{ color: 'var(--text-tertiary)' }}>{t('total_expected')}</span><strong className="text-blue-400">{ARS(expectedTotal)}</strong></div>
            <div className="flex justify-between pt-1 border-t" style={{ borderColor: 'var(--border-color)' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>{t('variance')}</span>
              <VarianceBadge cents={varTotal} />
            </div>
          </div>
        </motion.div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 mt-2">
        <button
          onClick={step === 0 ? onBack : () => setStep(s => s - 1)}
          className="flex items-center gap-1.5 px-4 py-3 rounded-xl border text-sm font-semibold"
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
        >
          <ArrowLeft size={16} /> {t('back')}
        </button>
        <button
          onClick={handleNext}
          disabled={currentStep ? currentStep.value === '' : (!canSubmit)}
          className="flex-1 py-3 rounded-xl font-bold text-white text-base transition-opacity"
          style={{ backgroundColor: '#3B82F6', opacity: (currentStep ? currentStep.value === '' : !canSubmit) ? 0.5 : 1 }}
        >
          {step < steps.length ? t('next') : t('confirm_close')}
        </button>
      </div>
    </div>
  );
}

// ─── Step: Done / Receipt ─────────────────────────────────────────────────────

function StepDone({ shift, onNewShift }: { shift: Shift; onNewShift: () => void }) {
  const { t } = useLanguage();
  const sev = shift.severity ?? 'ok';
  const style = SEVERITY_STYLE[sev];

  return (
    <div className="flex flex-col gap-4 px-4 py-6 max-w-sm mx-auto">
      <div className={`rounded-2xl border p-4 ${style.ring} ${style.bg}`}>
        <div className="flex items-center gap-3 mb-3">
          {sev === 'ok' ? <CheckCircle2 size={24} className="text-emerald-400" />
            : sev === 'critical' ? <XCircle size={24} className="text-red-400" />
            : <AlertTriangle size={24} className="text-amber-400" />}
          <div>
            <p className="font-black text-base" style={{ color: 'var(--text-primary)' }}>{t('shift_closed')}</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{style.label}</p>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          {[
            { label: t('cash'), exp: shift.expected_cash_cents, act: shift.actual_cash_cents, var: shift.variance_cash_cents },
            { label: t('card'), exp: shift.expected_card_cents, act: shift.actual_card_cents, var: shift.variance_card_cents },
            { label: t('mp_qr'), exp: shift.expected_mp_cents, act: shift.actual_mp_cents, var: shift.variance_mp_cents },
          ].map(row => (
            <div key={row.label} className="flex justify-between items-center py-1.5 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>{row.label}</span>
              <div className="flex items-center gap-2 text-xs">
                <span style={{ color: 'var(--text-secondary)' }}>{ARS(row.exp ?? 0)}</span>
                <span style={{ color: 'var(--text-tertiary)' }}>→</span>
                <span style={{ color: 'var(--text-primary)' }}>{ARS(row.act ?? 0)}</span>
                {row.var !== null && row.var !== undefined && <VarianceBadge cents={row.var} />}
              </div>
            </div>
          ))}
        </div>

        {shift.variance_total_cents !== null && (
          <div className="mt-3 flex justify-between items-center">
            <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{t('total_variance')}</span>
            <VarianceBadge cents={shift.variance_total_cents} />
          </div>
        )}
      </div>

      {sev !== 'ok' && (
        <div className="rounded-xl px-4 py-3 bg-amber-500/10 border border-amber-500/30 text-sm text-amber-400">
          {t('manager_review_pending')}
        </div>
      )}

      <button
        onClick={onNewShift}
        className="w-full py-3.5 rounded-xl font-bold text-white text-base mt-2"
        style={{ backgroundColor: '#10b981' }}
      >
        {t('open_new_shift')}
      </button>
    </div>
  );
}

// ─── Force Close Modal ─────────────────────────────────────────────────────────

function ForceCloseModal({ onConfirm, onCancel }: { onConfirm: (reason: string) => void; onCancel: () => void }) {
  const { t } = useLanguage();
  const [reason, setReason] = useState('');
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 bg-black/60 flex items-end justify-center"
    >
      <motion.div
        initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }}
        className="w-full max-w-sm rounded-t-2xl p-5 pb-8"
        style={{ backgroundColor: 'var(--app-bg)' }}
      >
        <div className="flex items-center gap-3 mb-4">
          <ShieldAlert size={22} className="text-red-400" />
          <h3 className="font-black text-base" style={{ color: 'var(--text-primary)' }}>{t('force_close_title')}</h3>
        </div>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>{t('force_close_desc')}</p>
        <textarea
          rows={2}
          placeholder={t('force_close_reason_placeholder')}
          value={reason}
          onChange={e => setReason(e.target.value)}
          className="w-full rounded-xl border px-4 py-3 text-sm resize-none outline-none mb-4"
          style={{ backgroundColor: 'var(--input-bg)', borderColor: '#EF4444', color: 'var(--text-primary)' }}
        />
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl border text-sm font-semibold"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
            {t('cancel')}
          </button>
          <button
            onClick={() => reason.trim().length >= 3 && onConfirm(reason.trim())}
            disabled={reason.trim().length < 3}
            className="flex-1 py-3 rounded-xl font-bold text-white text-sm"
            style={{ backgroundColor: reason.trim().length >= 3 ? '#EF4444' : '#EF444460' }}>
            {t('force_close_confirm')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export default function CorteDeCajaView() {
  const { t } = useLanguage();
  const { businessId } = useBusiness();
  const [shift, setShift] = useState<Shift | null>(null);
  const [prevShift, setPrevShift] = useState<{ float_cents: number; closed_at: string | null } | null>(null);
  const [step, setStep] = useState<StepId>('open_float');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForceClose, setShowForceClose] = useState(false);

  const staffMember = (() => {
    try { return JSON.parse(localStorage.getItem('fs_staff_member') || '{}'); }
    catch { return {}; }
  })();
  const staffId = staffMember?.id;

  // Fetch active shift and previous shift
  const loadShift = useCallback(async () => {
    if (!businessId || !staffId) { setLoading(false); return; }
    setLoading(true);

    const { data: openShift } = await supabase
      .from('shifts')
      .select('*')
      .eq('business_id', businessId)
      .eq('status', 'open')
      .order('opened_at', { ascending: false })
      .limit(1)
      .single();

    if (openShift) {
      setShift(openShift);
      setStep('shift_active');
    } else {
      // Load previous closed shift for float carry-forward
      const { data: prev } = await supabase
        .from('shifts')
        .select('float_cents, closed_at, actual_cash_cents')
        .eq('business_id', businessId)
        .in('status', ['closed', 'forced_closed'])
        .order('closed_at', { ascending: false })
        .limit(1)
        .single();

      // Carry forward: previous shift's actual cash is today's float
      if (prev) {
        setPrevShift({ float_cents: prev.actual_cash_cents ?? prev.float_cents, closed_at: prev.closed_at });
      }
      setStep('open_float');
    }

    setLoading(false);
  }, [businessId, staffId]);

  useEffect(() => { loadShift(); }, [loadShift]);

  // Pull expected totals from transaction_ledger for this shift window
  const fetchExpectedTotals = useCallback(async (openedAt: string): Promise<{
    cash: number; card: number; mp: number; total: number;
  }> => {
    if (!businessId) return { cash: 0, card: 0, mp: 0, total: 0 };

    const { data } = await supabase
      .from('transaction_ledger')
      .select('payment_method, amount_gross_cents')
      .eq('business_id', businessId)
      .gte('created_at', openedAt);

    if (!data) return { cash: 0, card: 0, mp: 0, total: 0 };

    let cash = 0, card = 0, mp = 0;
    for (const row of data) {
      const pm = (row.payment_method || '').toLowerCase();
      const amt = row.amount_gross_cents ?? 0;
      if (['cash', 'efectivo', 'pay_at_counter'].includes(pm)) cash += amt;
      else if (['card', 'tarjeta', 'debit', 'credit'].includes(pm)) card += amt;
      else if (['mp', 'mercadopago', 'mp_qr', 'mp_link', 'mp_point'].includes(pm)) mp += amt;
    }

    return { cash, card, mp, total: cash + card + mp };
  }, [businessId]);

  // Log event helper
  const logEvent = async (shiftId: string, eventType: string, data?: object) => {
    await supabase.from('shift_events').insert({
      shift_id: shiftId,
      staff_id: staffId,
      event_type: eventType,
      event_data: data ?? null,
    });
  };

  // Open a new shift
  const handleOpenShift = async (floatCents: number, note: string) => {
    if (!businessId || !staffId) return;

    const carried = prevShift?.float_cents ?? null;
    const discrepancy = carried !== null ? floatCents - carried : null;

    const { data, error: err } = await supabase
      .from('shifts')
      .insert({
        business_id: businessId,
        opened_by: staffId,
        float_cents: floatCents,
        carried_float_cents: carried,
        float_discrepancy_cents: discrepancy,
        status: 'open',
      })
      .select()
      .single();

    if (err || !data) { setError(err?.message ?? 'Error opening shift'); return; }

    await logEvent(data.id, 'opened', { float_cents: floatCents, float_note: note || null });

    // If there's a float note, log it in close_note field won't work here—instead log in shift_events
    setShift(data);
    setStep('shift_active');
  };

  // Start close — fetch expected totals, then move to count step
  const handleStartClose = async () => {
    if (!shift) return;
    const expected = await fetchExpectedTotals(shift.opened_at);

    const { data, error: err } = await supabase
      .from('shifts')
      .update({
        expected_cash_cents: expected.cash,
        expected_card_cents: expected.card,
        expected_mp_cents: expected.mp,
        expected_total_cents: expected.total,
        status: 'closing',
        version: shift.version + 1,
      })
      .eq('id', shift.id)
      .eq('version', shift.version)  // optimistic lock
      .select()
      .single();

    if (err || !data) { setError(err?.message ?? 'Conflict — refresh and try again'); return; }

    await logEvent(shift.id, 'count_started', { expected });
    setShift(data);
    setStep('count');
  };

  // Submit counts → calculate variance → close shift
  const handleSubmitCounts = async (counts: { cash: number; card: number; mp: number; other: number; note: string }) => {
    if (!shift) return;

    const varCash  = counts.cash - (shift.expected_cash_cents ?? 0);
    const varCard  = counts.card - (shift.expected_card_cents ?? 0);
    const varMp    = counts.mp   - (shift.expected_mp_cents ?? 0);
    const totalAct = counts.cash + counts.card + counts.mp + counts.other;
    const varTotal = totalAct - (shift.expected_total_cents ?? 0);
    const pct = (shift.expected_total_cents ?? 0) > 0
      ? (Math.abs(varTotal) / (shift.expected_total_cents!)) * 100
      : 0;

    const sev = getSeverity(varTotal, shift.expected_total_cents ?? 0, varCash, varCard);

    const { data, error: err } = await supabase
      .from('shifts')
      .update({
        closed_by: staffId,
        closed_at: new Date().toISOString(),
        status: 'closed',
        actual_cash_cents: counts.cash,
        actual_card_cents: counts.card,
        actual_mp_cents: counts.mp,
        actual_other_cents: counts.other,
        actual_total_cents: totalAct,
        variance_cash_cents: varCash,
        variance_card_cents: varCard,
        variance_mp_cents: varMp,
        variance_total_cents: varTotal,
        variance_pct: pct,
        severity: sev,
        close_note: counts.note || null,
        version: shift.version + 1,
      })
      .eq('id', shift.id)
      .eq('version', shift.version)
      .select()
      .single();

    if (err) {
      // Handle close_note_required trigger error
      if (err.message?.includes('close_note_required')) {
        setError(t('note_required_variance'));
        setStep('count');
        return;
      }
      setError(err.message);
      return;
    }

    if (!data) return;

    // Insert payment breakdowns
    await supabase.from('shift_payment_breakdowns').insert([
      { shift_id: shift.id, method_key: 'cash', expected_cents: shift.expected_cash_cents ?? 0, actual_cents: counts.cash, variance_cents: varCash, settlement_status: 'not_applicable' },
      { shift_id: shift.id, method_key: 'card', expected_cents: shift.expected_card_cents ?? 0, actual_cents: counts.card, variance_cents: varCard, settlement_status: varCard === 0 ? 'settled' : 'mismatch' },
      { shift_id: shift.id, method_key: 'mp',   expected_cents: shift.expected_mp_cents ?? 0,   actual_cents: counts.mp,   variance_cents: varMp,  settlement_status: 'pending' },
    ]);

    await logEvent(shift.id, 'closed', { severity: sev, variance_total_cents: varTotal });

    setShift(data);
    setStep('done');
    setPrevShift(null);
  };

  // Force close
  const handleForceClose = async (reason: string) => {
    if (!shift) return;
    setShowForceClose(false);

    const expected = await fetchExpectedTotals(shift.opened_at);

    const { data } = await supabase
      .from('shifts')
      .update({
        closed_by: staffId,
        closed_at: new Date().toISOString(),
        status: 'forced_closed',
        expected_cash_cents: expected.cash,
        expected_card_cents: expected.card,
        expected_mp_cents: expected.mp,
        expected_total_cents: expected.total,
        severity: 'investigate',
        forced_close_reason: reason,
        version: shift.version + 1,
      })
      .eq('id', shift.id)
      .eq('version', shift.version)
      .select()
      .single();

    if (data) {
      await logEvent(shift.id, 'forced_closed', { reason });
      setShift(data);
      setStep('done');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-tertiary)' }}>
        <RefreshCw size={20} className="animate-spin mr-2" /> {t('loading')}
      </div>
    );
  }

  return (
    <div className="relative h-full overflow-y-auto" style={{ backgroundColor: 'var(--app-frame)' }}>
      {/* Header */}
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 border-b"
        style={{ backgroundColor: 'var(--app-frame)', borderColor: 'var(--border-color)' }}>
        <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center">
          <Banknote size={16} className="text-emerald-400" />
        </div>
        <div>
          <p className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>{t('corte_de_caja')}</p>
          <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
            {step === 'shift_active' ? t('shift_in_progress') : step === 'done' ? t('shift_closed') : t('shift_closed')}
          </p>
        </div>
        {shift?.status === 'open' && (
          <span className="ml-auto flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-400/15 px-2 py-1 rounded-full">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            {t('live')}
          </span>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-4 mt-4 rounded-xl bg-red-500/15 border border-red-500/30 px-4 py-3 text-sm text-red-400 flex items-start gap-2">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <div>{error}
            <button onClick={() => setError(null)} className="ml-2 underline text-xs">{t('dismiss')}</button>
          </div>
        </div>
      )}

      {/* Steps */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {step === 'open_float' && (
            <StepOpenFloat
              onOpen={handleOpenShift}
              prevShift={prevShift}
            />
          )}
          {step === 'shift_active' && shift && (
            <StepShiftActive
              shift={shift}
              onStartClose={handleStartClose}
              onForceClose={() => setShowForceClose(true)}
            />
          )}
          {step === 'count' && shift && (
            <StepCount
              shift={shift}
              onSubmit={handleSubmitCounts}
              onBack={() => setStep('shift_active')}
            />
          )}
          {step === 'done' && shift && (
            <StepDone
              shift={shift}
              onNewShift={() => {
                setShift(null);
                setPrevShift({ float_cents: shift.actual_cash_cents ?? shift.float_cents, closed_at: shift.closed_at });
                setStep('open_float');
              }}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Force close modal */}
      <AnimatePresence>
        {showForceClose && shift && (
          <ForceCloseModal
            onConfirm={handleForceClose}
            onCancel={() => setShowForceClose(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
