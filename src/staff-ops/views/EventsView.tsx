import { useBusiness } from '@/contexts/BusinessContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { useEffect, useState } from 'react'
// @ts-ignore
import { supabase } from '../../lib/supabaseClient.js'
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
  const [isOwner, setIsOwner] = useState(false)
  const role = getStaffRole()
  const isStaffAllowed = role === 'manager' || role === 'admin'

  // Check if current user is the business owner — allow owner to manage events on staff side
  useEffect(() => {
    const checkOwner = async () => {
      const { data: session } = await supabase.auth.getSession()
      if (!session?.user?.id || !businessId) return

      const { data: owner } = await supabase
        .from('businesses')
        .select('owner_id')
        .eq('id', businessId)
        .single()

      if (owner?.owner_id === session.user.id) {
        setIsOwner(true)
      }
    }

    checkOwner()
  }, [businessId])

  const isAllowed = isStaffAllowed || isOwner

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
          Solo el propietario o managers pueden gestionar eventos.
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
