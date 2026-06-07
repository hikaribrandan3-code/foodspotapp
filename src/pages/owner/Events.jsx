import { useParams, useNavigate } from 'react-router-dom'
import { useTenant } from '../../contexts/TenantContext'
import { useLanguage } from '../../contexts/LanguageContext'
import BackendHeader from '../../components/BackendHeader'
import BackendNav from '../../components/BackendNav'
import OwnerEventsView from '../../components/owner/OwnerEventsView'

export default function Events() {
  const { tenantSlug } = useParams()
  const navigate = useNavigate()
  const { businessId } = useTenant()
  const { language: lang } = useLanguage()

  const handleLogout = () => {
    localStorage.removeItem('fs_auth_token')
    navigate(`/${tenantSlug}/owner`)
  }

  return (
    <div className="page backend-surface" style={{ paddingBottom: 'calc(88px + env(safe-area-inset-bottom, 0px))', background: '#F9FAFB', minHeight: '100vh' }}>
      <BackendHeader
        title="Events"
        onLogout={handleLogout}
        showDateSelector={false}
      />

      <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
        <OwnerEventsView
          businessId={businessId}
          tenantSlug={tenantSlug}
          lang={lang}
        />
      </div>

      <BackendNav role="owner" useRoutes={true} />
    </div>
  )
}
