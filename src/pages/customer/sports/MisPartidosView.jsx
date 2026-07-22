import React, { useState, useEffect } from 'react';
import { Swords, Loader2 } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useMyMatches, getSportsPhone, setSportsPhone } from '../../../hooks/useSportsProfile';

const SUBTABS = ['activos', 'historial', 'torneos'];

export default function MisPartidosView({ businessId, onStageChange }) {
  const { t } = useLanguage();
  const [phone, setPhone] = useState(getSportsPhone());
  const [subtab, setSubtab] = useState('activos');
  const { matches, loading } = useMyMatches(businessId, phone);

  useEffect(() => { onStageChange?.('list'); }, [onStageChange]);

  if (!phone) {
    return <PhoneGate onSubmit={(p) => { setSportsPhone(p); setPhone(p); }} />;
  }

  return (
    <div className="px-4 pb-4">
      <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{t('mis_partidos') || 'Mis Partidos'}</h2>

      <div className="flex gap-2 mb-4 bg-white/60 dark:bg-slate-900/40 rounded-full p-1 border" style={{ borderColor: 'var(--border-color)' }}>
        {SUBTABS.map((s) => (
          <button
            key={s}
            onClick={() => setSubtab(s)}
            className={`flex-1 py-2 rounded-full text-sm font-bold transition-colors ${subtab === s ? 'bg-[var(--color-primary)] text-white' : ''}`}
            style={{ color: subtab === s ? undefined : 'var(--text-secondary)' }}
          >
            {t(s) || s}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-[var(--color-primary)]" size={28} />
        </div>
      )}

      {!loading && subtab === 'activos' && (
        <List
          rows={matches.active}
          empty={t('sin_partidos_activos') || 'No tenés partidos activos.'}
          render={(m) => (
            <>
              <div className="text-xs font-bold uppercase" style={{ color: 'var(--color-primary)' }}>{m.round}</div>
              <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{m.team_a} vs {m.team_b}</div>
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {m.court || (t('court_tbd') || 'Cancha a definir')}
                {m.scheduled_at ? ` · ${new Date(m.scheduled_at).toLocaleString('es-AR')}` : ''}
              </div>
            </>
          )}
        />
      )}

      {!loading && subtab === 'historial' && (
        <List
          rows={matches.history}
          empty={t('sin_historial') || 'Todavía no jugaste partidos.'}
          render={(m) => (
            <>
              <div className="flex justify-between items-center">
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{m.team_a} vs {m.team_b}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${m.won ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
                  {m.won ? 'W' : 'L'}
                </span>
              </div>
              {m.score && <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{m.score}</div>}
            </>
          )}
        />
      )}

      {!loading && subtab === 'torneos' && (
        <List
          rows={matches.tournaments}
          empty={t('sin_torneos') || 'No estás inscripto en ningún torneo.'}
          render={(tt) => (
            <>
              <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{tt.name}</div>
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{tt.team_name} · {tt.status}</div>
            </>
          )}
        />
      )}
    </div>
  );
}

function List({ rows, empty, render }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="text-center py-10">
        <Swords className="mx-auto mb-3 text-[var(--color-primary)]" size={32} />
        <p style={{ color: 'var(--text-secondary)' }}>{empty}</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={row.match_id || row.tournament_id || i} className="rounded-xl p-3 border" style={{ backgroundColor: 'var(--canvas-surface)', borderColor: 'var(--border-color)' }}>
          {render(row)}
        </div>
      ))}
    </div>
  );
}

function PhoneGate({ onSubmit }) {
  const { t } = useLanguage();
  const [phone, setPhone] = useState('');
  return (
    <div className="px-4 pt-10 text-center">
      <Swords className="mx-auto mb-3 text-[var(--color-primary)]" size={40} />
      <h3 className="font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{t('tu_telefono') || 'Tu teléfono'}</h3>
      <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
        {t('phone_gate_hint') || 'Ingresá tu teléfono para ver tus partidos y torneos.'}
      </p>
      <form
        onSubmit={(e) => { e.preventDefault(); if (phone) onSubmit(phone); }}
        className="max-w-xs mx-auto space-y-3"
      >
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+54 9 ..."
          className="w-full px-3 py-2.5 rounded-lg border outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-center"
          style={{ backgroundColor: 'var(--canvas-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
        />
        <button
          type="submit"
          className="w-full bg-[var(--color-primary)] hover:opacity-90 text-white font-medium py-2.5 rounded-lg transition-colors"
        >
          {t('continuar') || 'Continuar'}
        </button>
      </form>
    </div>
  );
}
