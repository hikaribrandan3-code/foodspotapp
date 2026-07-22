import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { User, Trophy, Package, Camera, Loader2 } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { usePlayerProfile, getSportsPhone, setSportsPhone } from '../../../hooks/useSportsProfile';

export default function MiPerfilView({ businessId, onStageChange }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { tenantSlug } = useParams();
  const [phone, setPhone] = useState(getSportsPhone());
  const { profile, loading } = usePlayerProfile(businessId, phone);

  useEffect(() => { onStageChange?.('list'); }, [onStageChange]);

  if (!phone) {
    return <PhoneGate onSubmit={(p) => { setSportsPhone(p); setPhone(p); }} />;
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-[var(--color-primary)]" size={28} />
      </div>
    );
  }

  if (!profile?.exists) {
    return (
      <div className="px-4 pt-10 text-center">
        <User className="mx-auto mb-3 text-[var(--color-primary)]" size={40} />
        <h3 className="font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{t('sin_perfil') || 'Todavía no tenés perfil'}</h3>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {t('sin_perfil_hint') || 'Jugá tu primer partido para empezar a construir tu ranking.'}
        </p>
      </div>
    );
  }

  const { player, achievements, rentals } = profile;

  return (
    <div className="px-4 pb-4">
      {/* Header card */}
      <div className="rounded-2xl p-5 mb-4 text-center border" style={{ backgroundColor: 'var(--canvas-surface)', borderColor: 'var(--border-color)' }}>
        <div className="w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center text-3xl font-bold text-white" style={{ backgroundColor: 'var(--color-primary)' }}>
          {player.avatar_url ? (
            <img src={player.avatar_url} alt={player.display_name} className="w-full h-full rounded-full object-cover" />
          ) : (
            (player.display_name || '?').charAt(0).toUpperCase()
          )}
        </div>
        <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{player.display_name || t('jugador') || 'Jugador'}</h3>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
          {t('nivel') || 'Nivel'} {player.skill_level} · {t('ranking_local') || 'Ranking Local'} {player.local_rank ? `#${player.local_rank}` : '—'}
        </p>
        <button
          onClick={() => navigate(`/${tenantSlug || ''}/camera`)}
          className="inline-flex items-center gap-2 bg-[var(--color-accent)] hover:opacity-90 text-white text-sm font-medium px-4 py-2 rounded-full transition-colors"
        >
          <Camera size={16} />
          {t('selfie_post_partido') || 'Selfie post-partido'}
        </button>
      </div>

      {/* Stats */}
      <div className="mb-2">
        <h4 className="font-bold text-sm uppercase mb-2" style={{ color: 'var(--color-primary)' }}>{t('estadisticas_torneo') || 'Estadísticas'}</h4>
        <div className="grid grid-cols-3 gap-2">
          <StatCard label={t('partidos_jugados') || 'Partidos'} value={player.matches_played} />
          <StatCard label={t('victorias') || 'Victorias'} value={player.matches_won} accent />
          <StatCard label={t('derrotas') || 'Derrotas'} value={player.matches_lost} />
        </div>
      </div>

      {/* Rented gear */}
      <div className="mt-5 mb-2">
        <h4 className="font-bold text-sm uppercase mb-2" style={{ color: 'var(--color-primary)' }}>{t('equipos_alquilados') || 'Equipos Alquilados'}</h4>
        {(!rentals || rentals.length === 0) ? (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('sin_alquileres') || 'Sin alquileres recientes.'}</p>
        ) : (
          <div className="space-y-2">
            {rentals.slice(0, 5).map((r, i) => (
              <div key={i} className="rounded-lg p-3 border flex items-center gap-2" style={{ backgroundColor: 'var(--canvas-surface)', borderColor: 'var(--border-color)' }}>
                <Package size={16} className="text-[var(--color-primary)]" />
                <div className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>
                  {(r.items || []).map((it) => it.name).join(', ')}
                </div>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{r.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Achievements */}
      <div className="mt-5">
        <h4 className="font-bold text-sm uppercase mb-2" style={{ color: 'var(--color-primary)' }}>{t('logros') || 'Logros'}</h4>
        {(!achievements || achievements.length === 0) ? (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('sin_logros') || 'Todavía sin logros.'}</p>
        ) : (
          <div className="flex gap-3 flex-wrap">
            {achievements.map((a) => (
              <div key={a.key} className="flex flex-col items-center w-16">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl mb-1" style={{ backgroundColor: 'var(--canvas-surface)', border: '1px solid var(--border-color)' }}>
                  {a.icon || '🏅'}
                </div>
                <span className="text-[10px] text-center" style={{ color: 'var(--text-secondary)' }}>{a.label || a.key}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div className="rounded-xl p-3 text-center border" style={{ backgroundColor: 'var(--canvas-surface)', borderColor: 'var(--border-color)' }}>
      <div className="text-xl font-black" style={{ color: accent ? 'var(--color-primary)' : 'var(--text-primary)' }}>{value ?? 0}</div>
      <div className="text-[10px] uppercase" style={{ color: 'var(--text-secondary)' }}>{label}</div>
    </div>
  );
}

function PhoneGate({ onSubmit }) {
  const { t } = useLanguage();
  const [phone, setPhone] = useState('');
  return (
    <div className="px-4 pt-10 text-center">
      <User className="mx-auto mb-3 text-[var(--color-primary)]" size={40} />
      <h3 className="font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{t('mi_perfil') || 'Mi Perfil'}</h3>
      <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
        {t('phone_gate_hint') || 'Ingresá tu teléfono para ver tu perfil.'}
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
