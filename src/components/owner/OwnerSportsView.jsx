import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'

const TABS = [
  { id: 'settings', label: 'Configuración' },
  { id: 'torneos', label: 'Torneos' },
  { id: 'equipos', label: 'Equipos' },
  { id: 'pagos', label: 'Pagos' },
]

function centsToPesos(cents) { return ((cents || 0) / 100).toString() }
function pesosToCents(pesos) { return Math.round((parseFloat(pesos) || 0) * 100) }
function formatMoney(cents) { return `$${((cents || 0) / 100).toLocaleString('es-AR')}` }

/** Build a single-elimination bracket for a tournament's registered teams.
 *  Byes auto-complete round 1 so the existing on_match_completed trigger
 *  cascades the winner forward — no separate advance logic needed here. */
async function generateBracket(businessId, tournamentId, teams) {
  const n = teams.length
  if (n < 2) throw new Error('Se necesitan al menos 2 equipos')

  const bracketSize = 2 ** Math.ceil(Math.log2(n))
  const numRounds = Math.log2(bracketSize)
  const roundName = (r) => {
    const fromEnd = numRounds - r
    if (fromEnd === 0) return 'Final'
    if (fromEnd === 1) return 'Semifinal'
    if (fromEnd === 2) return 'Cuartos de final'
    if (fromEnd === 3) return 'Octavos de final'
    return `Ronda ${r}`
  }

  // wipe any existing matches for a clean regenerate
  await supabase.from('tournament_matches').delete().eq('tournament_id', tournamentId)

  // Build backward from the final so next_match_id always points at an existing row.
  const { data: finalRow, error: finalErr } = await supabase
    .from('tournament_matches')
    .insert({ business_id: businessId, tournament_id: tournamentId, round_number: numRounds, round_name: roundName(numRounds), match_number: 1, next_match_id: null })
    .select('id').single()
  if (finalErr) throw finalErr

  let prevRoundIds = [finalRow.id]
  let round1Ids = null

  for (let r = numRounds - 1; r >= 1; r--) {
    const count = 2 ** (numRounds - r)
    const rows = []
    for (let i = 0; i < count; i++) {
      rows.push({
        business_id: businessId, tournament_id: tournamentId,
        round_number: r, round_name: roundName(r), match_number: i + 1,
        next_match_id: prevRoundIds[Math.floor(i / 2)]
      })
    }
    const { data: inserted, error } = await supabase.from('tournament_matches').insert(rows).select('id').order('id')
    if (error) throw error
    // preserve insertion order (rows array order), not the returned id order
    const idsInOrder = rows.map((_, idx) => inserted[idx]?.id).filter(Boolean)
    prevRoundIds = idsInOrder.length === rows.length ? idsInOrder : inserted.map((x) => x.id)
    if (r === 1) round1Ids = prevRoundIds
  }

  // seed round-1 teams, padding with byes; byes auto-complete via UPDATE (fires the cascade trigger)
  const padded = [...teams]
  while (padded.length < bracketSize) padded.push(null)
  for (let i = 0; i < round1Ids.length; i++) {
    const a = padded[i * 2]
    const b = padded[i * 2 + 1]
    const patch = {
      team_a_id: a?.id || null, team_a_name: a?.team_name || 'Por definir',
      team_b_id: b?.id || null, team_b_name: b?.team_name || 'Por definir',
    }
    if (a && !b) { patch.status = 'completed'; patch.winner = 'A'; patch.score = 'BYE' }
    else if (!a && b) { patch.team_a_id = b.id; patch.team_a_name = b.team_name; patch.team_b_id = null; patch.team_b_name = 'Por definir'; patch.status = 'completed'; patch.winner = 'A'; patch.score = 'BYE' }
    await supabase.from('tournament_matches').update(patch).eq('id', round1Ids[i])
  }
}

export default function OwnerSportsView({ businessId, tenantSlug }) {
  const [tab, setTab] = useState('settings')

  return (
    <div>
      <div className="flex gap-2 mb-5 border-b" style={{ borderColor: '#E5E7EB' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="px-4 py-2.5 text-sm font-bold border-b-2 transition-colors"
            style={{
              borderColor: tab === t.id ? '#10b981' : 'transparent',
              color: tab === t.id ? '#10b981' : '#6B7280'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'settings' && <SettingsTab businessId={businessId} />}
      {tab === 'torneos' && <TorneosTab businessId={businessId} generateBracket={generateBracket} />}
      {tab === 'equipos' && <EquiposTab businessId={businessId} />}
      {tab === 'pagos' && <PagosTab businessId={businessId} />}
    </div>
  )
}

// ============================================================
// SETTINGS — the enabled flag drives the customer hero toggle
// ============================================================
function SettingsTab({ businessId }) {
  const [settings, setSettings] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!businessId) return
    const { data } = await supabase.from('sports_settings').select('*').eq('business_id', businessId).maybeSingle()
    setSettings(data)
  }, [businessId])

  useEffect(() => { load() }, [load])

  const toggle = async () => {
    if (!settings) return
    setSaving(true)
    const next = !settings.enabled
    const { error } = await supabase.from('sports_settings').update({ enabled: next }).eq('business_id', businessId)
    if (!error) setSettings((s) => ({ ...s, enabled: next }))
    setSaving(false)
  }

  if (!settings) return <div style={{ color: '#6B7280' }}>Cargando...</div>

  return (
    <div style={{ maxWidth: 560 }}>
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold" style={{ color: '#111827' }}>Módulo Deportes</div>
            <div className="text-sm" style={{ color: '#6B7280' }}>
              Cuando está activo, el botón "Eventos" de la app pasa a mostrar "Deportes" (Torneos + Equipos) en su lugar.
            </div>
          </div>
          <button
            onClick={toggle}
            disabled={saving}
            className="relative w-12 h-7 rounded-full transition-colors flex-shrink-0"
            style={{ backgroundColor: settings.enabled ? '#10b981' : '#D1D5DB' }}
          >
            <span
              className="absolute top-1 w-5 h-5 rounded-full bg-white transition-all"
              style={{ left: settings.enabled ? 26 : 4 }}
            />
          </button>
        </div>
      </Card>
    </div>
  )
}

// ============================================================
// TORNEOS — list, create, bracket generate/edit, status
// ============================================================
function TorneosTab({ businessId, generateBracket }) {
  const [tournaments, setTournaments] = useState([])
  const [view, setView] = useState('list') // list | create | detail
  const [selected, setSelected] = useState(null)

  const load = useCallback(async () => {
    if (!businessId) return
    const { data } = await supabase.from('tournaments').select('*').eq('business_id', businessId).eq('is_deleted', false).order('start_date', { ascending: false })
    setTournaments(data || [])
  }, [businessId])

  useEffect(() => { load() }, [load])

  if (view === 'create') {
    return <CreateTournament businessId={businessId} onBack={() => setView('list')} onDone={() => { setView('list'); load() }} />
  }
  if (view === 'detail' && selected) {
    return <TournamentDetail businessId={businessId} tournament={selected} generateBracket={generateBracket} onBack={() => { setView('list'); load() }} />
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => setView('create')} className="px-4 py-2 rounded-lg text-sm font-bold text-white" style={{ backgroundColor: '#10b981' }}>
          + Nuevo torneo
        </button>
      </div>
      <div className="grid gap-3">
        {tournaments.map((t) => (
          <Card key={t.id}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold" style={{ color: '#111827' }}>{t.name}</div>
                <div className="text-sm" style={{ color: '#6B7280' }}>
                  {t.category} · {t.teams_registered}/{t.max_teams} equipos · {t.status}
                </div>
              </div>
              <button
                onClick={() => { setSelected(t); setView('detail') }}
                className="px-3 py-1.5 rounded-lg text-sm font-medium border"
                style={{ borderColor: '#10b981', color: '#10b981' }}
              >
                Gestionar
              </button>
            </div>
          </Card>
        ))}
        {tournaments.length === 0 && <div style={{ color: '#6B7280' }}>Sin torneos todavía.</div>}
      </div>
    </div>
  )
}

function CreateTournament({ businessId, onBack, onDone }) {
  const [form, setForm] = useState({
    name: '', category: 'Mixto', format: 'single_elim', team_size: 2, max_teams: 16,
    start_date: '', entry_fee: '0', is_free: false
  })
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('tournaments').insert({
      business_id: businessId,
      name: form.name,
      category: form.category,
      format: form.format,
      team_size: Number(form.team_size),
      max_teams: Number(form.max_teams),
      start_date: form.start_date ? new Date(form.start_date).toISOString() : new Date().toISOString(),
      entry_fee_cents: form.is_free ? 0 : pesosToCents(form.entry_fee),
      is_free: form.is_free,
      status: 'draft'
    })
    setSaving(false)
    if (!error) onDone()
  }

  return (
    <form onSubmit={submit} style={{ maxWidth: 480 }} className="space-y-3">
      <button type="button" onClick={onBack} className="text-sm font-medium mb-2" style={{ color: '#10b981' }}>← Volver</button>
      <InputField label="Nombre" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} required />
      <InputField label="Categoría" value={form.category} onChange={(v) => setForm((f) => ({ ...f, category: v }))} />
      <InputField label="Máximo de equipos" type="number" value={form.max_teams} onChange={(v) => setForm((f) => ({ ...f, max_teams: v }))} />
      <InputField label="Fecha" type="date" value={form.start_date} onChange={(v) => setForm((f) => ({ ...f, start_date: v }))} />
      <label className="flex items-center gap-2 text-sm" style={{ color: '#374151' }}>
        <input type="checkbox" checked={form.is_free} onChange={(e) => setForm((f) => ({ ...f, is_free: e.target.checked }))} />
        Gratis
      </label>
      {!form.is_free && <InputField label="Cuota de inscripción ($)" type="number" value={form.entry_fee} onChange={(v) => setForm((f) => ({ ...f, entry_fee: v }))} />}
      <button type="submit" disabled={saving} className="w-full py-2.5 rounded-lg font-bold text-white" style={{ backgroundColor: '#10b981' }}>
        {saving ? '...' : 'Crear torneo'}
      </button>
    </form>
  )
}

function TournamentDetail({ businessId, tournament, generateBracket, onBack }) {
  const [t, setT] = useState(tournament)
  const [teams, setTeams] = useState([])
  const [rounds, setRounds] = useState([])
  const [generating, setGenerating] = useState(false)

  const load = useCallback(async () => {
    const { data: tData } = await supabase.from('tournaments').select('*').eq('id', tournament.id).single()
    if (tData) setT(tData)
    const { data: teamData } = await supabase.from('tournament_teams').select('*').eq('tournament_id', tournament.id).order('created_at')
    setTeams(teamData || [])
    const { data: matchData } = await supabase.from('tournament_matches').select('*').eq('tournament_id', tournament.id).order('round_number').order('match_number')
    const byRound = {}
    ;(matchData || []).forEach((m) => { (byRound[m.round_number] = byRound[m.round_number] || []).push(m) })
    setRounds(Object.entries(byRound).sort((a, b) => a[0] - b[0]))
  }, [tournament.id])

  useEffect(() => { load() }, [load])

  const setStatus = async (status) => {
    await supabase.from('tournaments').update({ status }).eq('id', t.id)
    load()
  }

  const doGenerate = async () => {
    const paidTeams = teams.filter((tm) => tm.entry_payment_status === 'paid' && tm.status !== 'withdrawn')
    if (paidTeams.length < 2) { alert('Se necesitan al menos 2 equipos pagos.'); return }
    setGenerating(true)
    try {
      await generateBracket(businessId, t.id, paidTeams)
      await load()
    } catch (err) {
      alert(err.message)
    } finally {
      setGenerating(false)
    }
  }

  const setResult = async (matchId, score, winner) => {
    const { error } = await supabase.rpc('report_match_result', {
      p_business_id: businessId, p_match_id: matchId, p_score: score, p_winner: winner
    })
    if (error) alert(error.message)
    else load()
  }

  return (
    <div>
      <button onClick={onBack} className="text-sm font-medium mb-4" style={{ color: '#10b981' }}>← Volver</button>

      <Card>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="font-bold text-lg" style={{ color: '#111827' }}>{t.name}</div>
            <div className="text-sm" style={{ color: '#6B7280' }}>{t.category} · {t.teams_registered}/{t.max_teams} equipos · {formatMoney(t.total_revenue_cents)} recaudado</div>
          </div>
          <select value={t.status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-1.5 rounded-lg border text-sm" style={{ borderColor: '#E5E7EB' }}>
            <option value="draft">Borrador</option>
            <option value="registration_open">Inscripción abierta</option>
            <option value="in_progress">En curso</option>
            <option value="completed">Finalizado</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>
      </Card>

      <div className="mt-4">
        <div className="font-bold text-sm uppercase mb-2" style={{ color: '#6B7280' }}>Equipos registrados</div>
        <div className="grid gap-2 mb-4">
          {teams.map((tm) => (
            <div key={tm.id} className="flex items-center justify-between px-3 py-2 rounded-lg border text-sm" style={{ borderColor: '#E5E7EB' }}>
              <span style={{ color: '#111827' }}>{tm.team_name} <span style={{ color: '#9CA3AF' }}>({tm.captain_phone})</span></span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tm.entry_payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                {tm.entry_payment_status}
              </span>
            </div>
          ))}
          {teams.length === 0 && <div style={{ color: '#9CA3AF' }}>Sin equipos registrados.</div>}
        </div>

        <button
          onClick={doGenerate}
          disabled={generating}
          className="mb-4 px-4 py-2 rounded-lg text-sm font-bold text-white"
          style={{ backgroundColor: '#10b981' }}
        >
          {generating ? 'Generando...' : (rounds.length ? 'Regenerar cuadro' : 'Generar cuadro')}
        </button>

        <div className="font-bold text-sm uppercase mb-2" style={{ color: '#6B7280' }}>Cuadro</div>
        <div className="space-y-4 overflow-x-auto">
          {rounds.map(([roundNum, matches]) => (
            <div key={roundNum}>
              <div className="text-xs font-bold uppercase mb-1" style={{ color: '#10b981' }}>{matches[0]?.round_name || `Ronda ${roundNum}`}</div>
              <div className="grid gap-2">
                {matches.map((m) => <MatchRow key={m.id} match={m} onSave={setResult} />)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MatchRow({ match, onSave }) {
  const [score, setScore] = useState(match.score || '')
  const [winner, setWinner] = useState(match.winner || '')
  const canEdit = match.team_a_id && match.team_b_id && match.status !== 'completed'

  return (
    <div className="px-3 py-2 rounded-lg border text-sm" style={{ borderColor: '#E5E7EB' }}>
      <div className="flex justify-between items-center mb-1" style={{ color: '#111827' }}>
        <span className={match.winner === 'A' ? 'font-bold' : ''}>{match.team_a_name}</span>
        <span className={match.winner === 'B' ? 'font-bold' : ''}>{match.team_b_name}</span>
      </div>
      {canEdit ? (
        <div className="flex gap-2 mt-2">
          <input value={score} onChange={(e) => setScore(e.target.value)} placeholder="6-4, 6-3" className="flex-1 px-2 py-1 rounded border text-xs" style={{ borderColor: '#E5E7EB' }} />
          <select value={winner} onChange={(e) => setWinner(e.target.value)} className="px-2 py-1 rounded border text-xs" style={{ borderColor: '#E5E7EB' }}>
            <option value="">Ganador</option>
            <option value="A">{match.team_a_name}</option>
            <option value="B">{match.team_b_name}</option>
          </select>
          <button
            onClick={() => winner && onSave(match.id, score, winner)}
            disabled={!winner}
            className="px-3 py-1 rounded text-xs font-bold text-white disabled:opacity-40"
            style={{ backgroundColor: '#10b981' }}
          >
            Guardar
          </button>
        </div>
      ) : (
        <div className="text-xs" style={{ color: '#9CA3AF' }}>{match.score || (match.status === 'completed' ? 'Finalizado' : 'Pendiente')}</div>
      )}
    </div>
  )
}

// ============================================================
// EQUIPOS — rental catalog CRUD
// ============================================================
function EquiposTab({ businessId }) {
  const [items, setItems] = useState([])
  const [form, setForm] = useState({ name: '', category: 'accessory', price: '0', deposit: '0', stock: '5' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!businessId) return
    const { data } = await supabase.from('rental_items').select('*').eq('business_id', businessId).eq('is_deleted', false).order('sort_order')
    setItems(data || [])
  }, [businessId])

  useEffect(() => { load() }, [load])

  const addItem = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('rental_items').insert({
      business_id: businessId,
      name: form.name,
      category: form.category,
      price_cents: pesosToCents(form.price),
      deposit_cents: pesosToCents(form.deposit),
      stock_total: Number(form.stock),
      stock_available: Number(form.stock),
      is_available: true
    })
    setSaving(false)
    if (!error) { setForm({ name: '', category: 'accessory', price: '0', deposit: '0', stock: '5' }); load() }
  }

  const toggleAvailable = async (item) => {
    await supabase.from('rental_items').update({ is_available: !item.is_available }).eq('id', item.id)
    load()
  }

  const remove = async (item) => {
    await supabase.from('rental_items').update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq('id', item.id)
    load()
  }

  return (
    <div>
      <Card>
        <form onSubmit={addItem} className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
          <InputField label="Nombre" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} required />
          <SelectField label="Categoría" value={form.category} onChange={(v) => setForm((f) => ({ ...f, category: v }))} options={['racket', 'balls', 'shoes', 'apparel', 'accessory', 'other']} />
          <InputField label="Precio ($)" type="number" value={form.price} onChange={(v) => setForm((f) => ({ ...f, price: v }))} />
          <InputField label="Depósito ($)" type="number" value={form.deposit} onChange={(v) => setForm((f) => ({ ...f, deposit: v }))} />
          <InputField label="Stock" type="number" value={form.stock} onChange={(v) => setForm((f) => ({ ...f, stock: v }))} />
          <button type="submit" disabled={saving} className="col-span-2 md:col-span-5 py-2 rounded-lg font-bold text-white text-sm" style={{ backgroundColor: '#10b981' }}>
            + Agregar equipo
          </button>
        </form>
      </Card>

      <div className="grid gap-2 mt-4">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg border" style={{ borderColor: '#E5E7EB' }}>
            <div>
              <div className="font-medium text-sm" style={{ color: '#111827' }}>{item.name}</div>
              <div className="text-xs" style={{ color: '#6B7280' }}>{formatMoney(item.price_cents)} · stock {item.stock_available}/{item.stock_total}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => toggleAvailable(item)} className="text-xs font-medium px-2 py-1 rounded border" style={{ borderColor: item.is_available ? '#10b981' : '#D1D5DB', color: item.is_available ? '#10b981' : '#9CA3AF' }}>
                {item.is_available ? 'Activo' : 'Pausado'}
              </button>
              <button onClick={() => remove(item)} className="text-xs font-medium px-2 py-1 rounded border" style={{ borderColor: '#EF4444', color: '#EF4444' }}>
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// PAGOS — confirm cash for pending tournament entries / rentals
// ============================================================
function PagosTab({ businessId }) {
  const [pendingTeams, setPendingTeams] = useState([])
  const [pendingRentals, setPendingRentals] = useState([])

  const load = useCallback(async () => {
    if (!businessId) return
    const { data: teams } = await supabase.from('tournament_teams').select('*, tournaments(name)').eq('business_id', businessId).eq('entry_payment_status', 'pending')
    setPendingTeams(teams || [])
    const { data: rentals } = await supabase.from('rental_orders').select('*').eq('business_id', businessId).eq('payment_status', 'pending').eq('is_deleted', false)
    setPendingRentals(rentals || [])
  }, [businessId])

  useEffect(() => { load() }, [load])

  const confirmCash = async (kind, id) => {
    const { error } = await supabase.rpc('record_sports_cash_payment', {
      p_business_id: businessId, p_kind: kind, p_id: id, p_payment_method: 'cash'
    })
    if (error) alert(error.message)
    else load()
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="font-bold text-sm uppercase mb-2" style={{ color: '#6B7280' }}>Inscripciones pendientes</div>
        {pendingTeams.length === 0 && <div style={{ color: '#9CA3AF' }}>Nada pendiente.</div>}
        <div className="grid gap-2">
          {pendingTeams.map((tm) => (
            <div key={tm.id} className="flex items-center justify-between px-3 py-2 rounded-lg border" style={{ borderColor: '#E5E7EB' }}>
              <div className="text-sm">
                <span className="font-medium" style={{ color: '#111827' }}>{tm.team_name}</span>
                <span style={{ color: '#6B7280' }}> · {tm.tournaments?.name} · {formatMoney(tm.entry_fee_cents)}</span>
              </div>
              <button onClick={() => confirmCash('tournament', tm.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ backgroundColor: '#10b981' }}>
                Confirmar efectivo
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="font-bold text-sm uppercase mb-2" style={{ color: '#6B7280' }}>Alquileres pendientes</div>
        {pendingRentals.length === 0 && <div style={{ color: '#9CA3AF' }}>Nada pendiente.</div>}
        <div className="grid gap-2">
          {pendingRentals.map((ro) => (
            <div key={ro.id} className="flex items-center justify-between px-3 py-2 rounded-lg border" style={{ borderColor: '#E5E7EB' }}>
              <div className="text-sm">
                <span className="font-medium" style={{ color: '#111827' }}>{ro.customer_name}</span>
                <span style={{ color: '#6B7280' }}> · {ro.rental_code} · {formatMoney(ro.total_cents)}</span>
              </div>
              <button onClick={() => confirmCash('rental', ro.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ backgroundColor: '#10b981' }}>
                Confirmar efectivo
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Shared primitives
// ============================================================
function Card({ children }) {
  return <div className="p-4 rounded-xl border bg-white" style={{ borderColor: '#E5E7EB' }}>{children}</div>
}
function InputField({ label, value, onChange, type = 'text', required }) {
  return (
    <label className="block">
      <span className="text-xs font-medium block mb-1" style={{ color: '#6B7280' }}>{label}</span>
      <input
        type={type} value={value} required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border text-sm"
        style={{ borderColor: '#E5E7EB' }}
      />
    </label>
  )
}
function SelectField({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="text-xs font-medium block mb-1" style={{ color: '#6B7280' }}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: '#E5E7EB' }}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  )
}
