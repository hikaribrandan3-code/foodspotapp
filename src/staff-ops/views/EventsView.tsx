import { useBusiness } from '@/contexts/BusinessContext'
import { useLanguage } from '@/contexts/LanguageContext'
import OwnerEventsView from '../../components/owner/OwnerEventsView'

function getStaffRole(): string {
  try {
    const member = JSON.parse(localStorage.getItem('fs_staff_member') || '{}')
    return (member.role || '').toLowerCase()
  } catch {
    return ''
  }
}

export default function EventsView() {
  const { businessId, tenantSlug } = useBusiness()
  const { language } = useLanguage()
  const role = getStaffRole()
  const isAllowed = role === 'manager' || role === 'admin'

  if (!isAllowed) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100%', gap: 12, padding: 32,
        textAlign: 'center'
      }}>
        <span style={{ fontSize: 40 }}>🔒</span>
        <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', margin: 0 }}>
          Acceso restringido
        </p>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
          Solo los managers pueden gestionar eventos.
        </p>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <OwnerEventsView
        businessId={businessId}
        tenantSlug={tenantSlug}
        lang={language}
        onBack={() => {}}
      />
    </div>
  )
}
