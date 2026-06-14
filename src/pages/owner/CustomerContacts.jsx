import { useState, useMemo } from 'react'
import { useTenant } from '../../contexts/TenantContext.jsx'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import { useCustomerContacts } from '../../hooks/useCustomerContacts.js'
import { exportContactsToCSV } from '../../services/contactsService.js'
import { translations } from '../../utils/translations.js'
import BackendHeader from '../../components/BackendHeader.jsx'
import BackendNav from '../../components/BackendNav.jsx'
import { LoadingScreen } from '../../components/LoadingScreen'
import { ReservationsContent } from './Reservations.jsx'

const T = {
  bg:    '#F4F6F9',
  card:  '#FFFFFF',
  ink:   '#0F1B2D',
  ink2:  '#1F2A3D',
  body:  '#3D4A5C',
  muted: '#7A8699',
  line:  '#E6EAF0',
  line2: '#EEF1F5',
  green: '#10B981',
  greenBg: '#E2F5EA',
  greenInk: '#1F7A45',
  redBg: '#FBECEC',
  redInk: '#B33A3A',
}

// ── Add Contact Modal ────────────────────────────────────────────
function AddContactModal({ onClose, onAdd }) {
  const { language } = useLanguage()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const t = (key) => translations[key]?.[language] || translations[key]?.en || key

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 8) { setError(t('phone_required')); return }
    if (!name.trim()) { setError(t('name_required')); return }
    setLoading(true)
    const { error: err } = await onAdd(phone, name)
    if (err) setError(err.message)
    else onClose()
    setLoading(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: 24, pointerEvents: 'auto'
    }} onClick={onClose}>
      <div style={{
        background: T.card, borderRadius: 20, padding: 32,
        width: '100%', maxWidth: 420,
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)', pointerEvents: 'auto'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: T.ink }}>{t('add_customer')}</span>
          <button onClick={onClose} style={{
            background: T.line2, border: 'none', borderRadius: '50%',
            width: 32, height: 32, cursor: 'pointer', fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.muted
          }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>{t('name')}</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('name')}
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 12,
                border: `1.5px solid ${T.line}`, fontSize: 15, color: T.ink,
                outline: 'none', boxSizing: 'border-box', background: T.bg,
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>{t('phone_placeholder')}</label>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder={t('phone_placeholder')}
              type="tel"
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 12,
                border: `1.5px solid ${T.line}`, fontSize: 15, color: T.ink,
                outline: 'none', boxSizing: 'border-box', background: T.bg,
                fontFamily: 'inherit'
              }}
            />
          </div>

          {error && (
            <div style={{ background: T.redBg, color: T.redInk, borderRadius: 10, padding: '10px 14px', fontSize: 13 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: T.green, color: '#fff', border: 'none',
              borderRadius: 12, padding: '14px', fontSize: 15,
              fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1, marginTop: 4, fontFamily: 'inherit'
            }}
          >
            {loading ? t('saving_ellipsis') : t('add_customer')}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────
export default function CustomerContacts({ defaultTab = 'clientes' }) {
  const { businessId, tenantData } = useTenant()
  const { language } = useLanguage()
  const { contacts, loading, addContact } = useCustomerContacts(businessId)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [activeTab, setActiveTab] = useState(defaultTab)

  const t = (key) => translations[key]?.[language] || translations[key]?.en || key

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return contacts.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q)
    )
  }, [contacts, search])

  if (loading) return <LoadingScreen />

  return (
    <div style={{ width: '100%', height: '100vh', background: T.bg, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <BackendHeader title={`${tenantData?.business_name || 'FoodSpot'} CRM`} />

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 28px 0', background: T.bg, borderBottom: `1px solid ${T.line}` }}>
        {[
          { id: 'clientes', label: t('crm') || 'Clientes' },
          { id: 'reservas', label: t('reservations') || 'Reservas' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 20px', borderRadius: '10px 10px 0 0', border: 'none',
              background: activeTab === tab.id ? T.card : 'transparent',
              color: activeTab === tab.id ? T.green : T.muted,
              fontWeight: 700, fontSize: 14, cursor: 'pointer',
              borderBottom: activeTab === tab.id ? `2px solid ${T.green}` : '2px solid transparent',
              fontFamily: 'inherit', transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'reservas' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <ReservationsContent />
        </div>
      )}

      {activeTab === 'clientes' && <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

        {/* Top bar */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>

          {/* Search pill */}
          <div style={{
            flex: 1, minWidth: 200, display: 'flex', alignItems: 'center',
            background: T.card, borderRadius: 50, border: `1.5px solid ${T.line}`,
            padding: '0 18px', height: 46, gap: 10
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('search_by_name_phone')}
              style={{
                border: 'none', outline: 'none', fontSize: 14,
                color: T.ink, background: 'transparent', width: '100%',
                fontFamily: 'inherit'
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: 16, padding: 0 }}>✕</button>
            )}
          </div>

          {/* Export pill */}
          <button
            onClick={() => exportContactsToCSV(filtered)}
            disabled={filtered.length === 0}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: T.card, border: `1.5px solid ${T.line}`,
              borderRadius: 50, padding: '0 20px', height: 46,
              fontSize: 14, fontWeight: 600, color: T.body,
              cursor: filtered.length === 0 ? 'not-allowed' : 'pointer',
              opacity: filtered.length === 0 ? 0.5 : 1,
              fontFamily: 'inherit', whiteSpace: 'nowrap'
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            {t('export_csv')}
          </button>

          {/* Add pill */}
          <button
            onClick={() => setShowModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: T.green, border: 'none',
              borderRadius: 50, padding: '0 20px', height: 46,
              fontSize: 14, fontWeight: 700, color: '#fff',
              cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap'
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            {t('add_customer')}
          </button>
        </div>

        {/* Count pill */}
        <div style={{ marginBottom: 16 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: T.greenBg, color: T.greenInk,
            borderRadius: 50, padding: '5px 14px', fontSize: 13, fontWeight: 600
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
            </svg>
            {filtered.length} {filtered.length === 1 ? t('customer_count_one') : t('customer_count_many')}
          </span>
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div style={{
            background: T.card, borderRadius: 20, padding: '60px 24px',
            textAlign: 'center', border: `1.5px dashed ${T.line}`
          }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: T.ink, marginBottom: 6 }}>
              {search ? t('no_customers_match') : t('no_customers_yet')}
            </div>
            <div style={{ fontSize: 14, color: T.muted }}>
              {search ? t('try_different_search') : t('customers_appear_orders')}
            </div>
          </div>
        )}

        {/* Contact pills */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(contact => (
            <div key={contact.id} style={{
              background: T.card, borderRadius: 16,
              padding: '16px 20px',
              display: 'flex', alignItems: 'center', gap: 16,
              border: `1.5px solid ${T.line2}`,
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              transition: 'box-shadow 0.15s'
            }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'}
            >
              {/* Avatar pill */}
              <div style={{
                width: 42, height: 42, borderRadius: '50%',
                background: T.greenBg, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 700, color: T.greenInk
              }}>
                {(contact.name || '?')[0].toUpperCase()}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.ink, marginBottom: 3 }}>
                  {contact.name || 'Unknown'}
                </div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: T.bg, borderRadius: 50, padding: '3px 12px',
                  fontSize: 13, color: T.body, fontWeight: 500
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill={T.muted}>
                    <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z"/>
                  </svg>
                  {contact.phone}
                </div>
              </div>

              {/* Date pill */}
              <div style={{
                fontSize: 12, color: T.muted, fontWeight: 500,
                background: T.bg, borderRadius: 50, padding: '4px 12px',
                whiteSpace: 'nowrap'
              }}>
                {new Date(contact.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>

            </div>
          ))}
        </div>
      </div>}

      <BackendNav useRoutes={true} role="owner" />

      {showModal && (
        <AddContactModal
          onClose={() => setShowModal(false)}
          onAdd={addContact}
        />
      )}
    </div>
  )
}
