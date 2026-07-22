import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Trophy, Calendar, ChevronLeft, Loader2 } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTournaments, fetchTournamentBracket, createTournamentPreference, fetchTournamentTeam } from '../../../hooks/useTournaments';
import { getSportsPhone, setSportsPhone } from '../../../hooks/useSportsProfile';
import { supabase } from '../../../lib/supabaseClient';

const STATUS_STYLE = {
  registration_open: { label: 'registration_open', color: 'bg-blue-100 text-blue-800' },
  in_progress: { label: 'in_progress', color: 'bg-green-100 text-green-800' },
  completed: { label: 'completed', color: 'bg-gray-100 text-gray-600' },
};

function formatDate(iso, lang) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(lang === 'en' ? 'en-US' : lang === 'pt' ? 'pt-BR' : 'es-AR', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}
function formatMoney(cents) {
  return `$${((cents || 0) / 100).toLocaleString('es-AR')}`;
}

export default function TorneosView({ businessId, onStageChange }) {
  const { t, lang } = useLanguage();
  const { tournaments, loading, refetch } = useTournaments(businessId);
  const [selected, setSelected] = useState(null);   // tournament being viewed (bracket)
  const [registering, setRegistering] = useState(null); // tournament being registered for
  const [mpReturn, setMpReturn] = useState(null); // { team_name, registration_code } after MP redirect
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle Mercado Pago return redirect: ?payment=success&kind=tournament&id=<team_id>&guest_token=...
  useEffect(() => {
    const payment = searchParams.get('payment');
    const kind = searchParams.get('kind');
    const id = searchParams.get('id');
    const guestToken = searchParams.get('guest_token');
    if (!payment || kind !== 'tournament' || !id) return;

    let cancelled = false;
    (async () => {
      if (payment === 'success' && guestToken) {
        await supabase.rpc('confirm_sports_payment_return', {
          p_kind: 'tournament', p_id: id, p_guest_token: guestToken
        }).catch(() => {});
      }
      try {
        const team = await fetchTournamentTeam(id);
        if (!cancelled) setMpReturn(team);
      } catch {
        // ignore — fall through to list view
      }
      const next = new URLSearchParams(searchParams);
      ['payment', 'kind', 'id', 'guest_token'].forEach((k) => next.delete(k));
      setSearchParams(next, { replace: true });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    onStageChange?.(selected || registering || mpReturn ? 'detail' : 'list');
  }, [selected, registering, mpReturn, onStageChange]);

  if (mpReturn) {
    return (
      <RegistrationSuccess
        teamName={mpReturn.team_name}
        registrationCode={mpReturn.registration_code}
        paid={mpReturn.entry_payment_status === 'paid'}
        onBack={() => { setMpReturn(null); refetch(); }}
      />
    );
  }

  if (registering) {
    return (
      <RegisterForm
        businessId={businessId}
        tournament={registering}
        onBack={() => setRegistering(null)}
        onDone={() => { setRegistering(null); refetch(); }}
      />
    );
  }

  if (selected) {
    return <BracketView tournament={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="px-4 space-y-4 pb-4">
      <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('torneos') || 'Torneos'}</h2>

      {loading && (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-[var(--color-primary)]" size={28} />
        </div>
      )}

      {!loading && tournaments.length === 0 && (
        <div className="bg-white/70 dark:bg-slate-900/40 rounded-xl p-8 text-center border" style={{ borderColor: 'var(--border-color)' }}>
          <Trophy className="mx-auto mb-3 text-[var(--color-primary)]" size={36} />
          <p style={{ color: 'var(--text-secondary)' }}>{t('no_tournaments_found') || 'No hay torneos disponibles por el momento.'}</p>
        </div>
      )}

      <div className="space-y-4">
        {tournaments.map((tournament) => {
          const status = STATUS_STYLE[tournament.status] || STATUS_STYLE.registration_open;
          return (
            <div
              key={tournament.id}
              className="rounded-xl p-4 border shadow-sm"
              style={{ backgroundColor: 'var(--canvas-surface)', borderColor: 'var(--border-color)' }}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>{tournament.name}</h3>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{tournament.category}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                  {t(status.label) || tournament.status}
                </span>
              </div>

              {tournament.description && (
                <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>{tournament.description}</p>
              )}

              <div className="flex items-center text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                <Calendar size={14} className="mr-1.5" />
                {formatDate(tournament.start_date, lang)}
              </div>
              <div className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                {tournament.teams_registered}/{tournament.max_teams} {t('teams') || 'equipos'} · {tournament.is_free ? (t('gratis') || 'Gratis') : formatMoney(tournament.entry_fee_cents)}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setSelected(tournament)}
                  className="flex-1 bg-[var(--color-primary)] hover:opacity-90 text-white font-medium py-2.5 rounded-lg transition-colors"
                >
                  {t('ver_torneo') || 'Ver torneo'}
                </button>
                {tournament.status === 'registration_open' && (
                  <button
                    onClick={() => setRegistering(tournament)}
                    className="flex-1 bg-[var(--color-accent)] hover:opacity-90 text-white font-medium py-2.5 rounded-lg transition-colors"
                  >
                    {t('inscribirme') || 'Inscribirme'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BracketView({ tournament, onBack }) {
  const { t } = useLanguage();
  const [bracket, setBracket] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchTournamentBracket(tournament.id)
      .then((data) => { if (!cancelled) setBracket(data); })
      .catch(() => { if (!cancelled) setBracket(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tournament.id]);

  return (
    <div className="px-4 pb-4">
      <BackHeader onBack={onBack} title={tournament.name} />

      {loading && (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-[var(--color-primary)]" size={28} />
        </div>
      )}

      {!loading && (!bracket?.rounds || bracket.rounds.length === 0) && (
        <p className="text-center py-10" style={{ color: 'var(--text-secondary)' }}>
          {t('bracket_not_ready') || 'El cuadro todavía no fue armado.'}
        </p>
      )}

      <div className="space-y-6 overflow-x-auto">
        {bracket?.rounds?.map((round) => (
          <div key={round.round_number}>
            <h4 className="font-bold text-sm uppercase mb-2" style={{ color: 'var(--color-primary)' }}>
              {round.round_name || `${t('round') || 'Ronda'} ${round.round_number}`}
            </h4>
            <div className="space-y-2">
              {round.matches.map((m) => (
                <div
                  key={m.id}
                  className="rounded-lg p-3 border text-sm"
                  style={{ backgroundColor: 'var(--canvas-surface)', borderColor: 'var(--border-color)' }}
                >
                  <div className={`flex justify-between ${m.winner === 'A' ? 'font-bold' : ''}`} style={{ color: 'var(--text-primary)' }}>
                    <span>{m.team_a}</span>
                    <span>{m.winner === 'A' ? '✓' : ''}</span>
                  </div>
                  <div className={`flex justify-between ${m.winner === 'B' ? 'font-bold' : ''}`} style={{ color: 'var(--text-primary)' }}>
                    <span>{m.team_b}</span>
                    <span>{m.winner === 'B' ? '✓' : ''}</span>
                  </div>
                  {m.score && <div className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>{m.score}</div>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RegisterForm({ businessId, tournament, onBack, onDone }) {
  const { t } = useLanguage();
  const { tenantSlug } = useParams();
  const [teamName, setTeamName] = useState('');
  const [captainName, setCaptainName] = useState('');
  const [captainPhone, setCaptainPhone] = useState(getSportsPhone());
  const [partnerName, setPartnerName] = useState('');
  const [partnerPhone, setPartnerPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!teamName || !captainName || !captainPhone) return;
    setSubmitting(true);
    setError('');
    try {
      const players = [{ name: captainName, phone: captainPhone }];
      if (partnerName && partnerPhone) players.push({ name: partnerName, phone: partnerPhone });

      const res = await createTournamentPreference({
        businessId, tenantSlug, tournamentId: tournament.id, teamName, captainName, captainPhone, players
      });

      if (res?.error) {
        setError(res.error === 'mp_not_configured'
          ? (t('mp_not_configured') || 'El club todavía no configuró los pagos online. Probá de nuevo más tarde.')
          : (res.detail || res.error));
        return;
      }

      setSportsPhone(captainPhone);

      if (res?.init_point) {
        // Same checkout pattern as food/events: redirect to Mercado Pago
        window.location.href = res.init_point;
        return;
      }

      // free_order path — already paid, no MP step needed
      setResult({ registration_code: res.code, paid: true });
    } catch (err) {
      setError(err?.message || 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <RegistrationSuccess
        teamName={teamName}
        registrationCode={result.registration_code}
        paid={result.paid}
        onBack={onDone}
      />
    );
  }

  return (
    <div className="px-4 pb-4">
      <BackHeader onBack={onBack} title={t('registro_torneo') || 'Registro de equipo'} />
      {!tournament.is_free && tournament.entry_fee_cents > 0 && (
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
          {t('cuota_inscripcion') || 'Cuota de inscripción'}: <strong>{formatMoney(tournament.entry_fee_cents)}</strong>
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label={t('nombre_equipo') || 'Nombre del equipo'} value={teamName} onChange={setTeamName} required />
        <Field label={t('capitan') || 'Capitán'} value={captainName} onChange={setCaptainName} required />
        <Field label={t('telefono') || 'Teléfono'} value={captainPhone} onChange={setCaptainPhone} required type="tel" />
        <Field label={`${t('jugadores') || 'Compañero'} (${t('optional') || 'opcional'})`} value={partnerName} onChange={setPartnerName} />
        {partnerName && <Field label={t('telefono') || 'Teléfono'} value={partnerPhone} onChange={setPartnerPhone} type="tel" />}

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-[var(--color-primary)] hover:opacity-90 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50"
        >
          {submitting ? '...' : (t('confirmar') || 'Confirmar inscripción')}
        </button>
      </form>
    </div>
  );
}

function RegistrationSuccess({ teamName, registrationCode, paid, onBack }) {
  const { t } = useLanguage();
  return (
    <div className="px-4 pb-4">
      <BackHeader onBack={onBack} title={t('inscripcion_exitosa') || 'Inscripción exitosa'} />
      <div className="rounded-xl p-6 text-center border" style={{ backgroundColor: 'var(--canvas-surface)', borderColor: 'var(--border-color)' }}>
        <Trophy className="mx-auto mb-3 text-[var(--color-primary)]" size={40} />
        {teamName && <p className="font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{teamName}</p>}
        <p className="mb-1" style={{ color: 'var(--text-secondary)' }}>{t('codigo_registro') || 'Código de registro'}</p>
        <p className="text-3xl font-black tracking-widest mb-4" style={{ color: 'var(--text-primary)' }}>{registrationCode}</p>
        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${paid ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
          {paid ? (t('pago_confirmado') || 'Pago confirmado') : (t('pago_pendiente') || 'Pago pendiente')}
        </span>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, required, type = 'text' }) {
  return (
    <label className="block">
      <span className="text-sm font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full px-3 py-2.5 rounded-lg border outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        style={{ backgroundColor: 'var(--canvas-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
      />
    </label>
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
