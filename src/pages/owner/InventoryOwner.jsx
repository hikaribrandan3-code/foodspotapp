import { useParams } from 'react-router-dom'
import BackendHeader from '../../components/BackendHeader.jsx'
import BackendNav from '../../components/BackendNav.jsx'
import InventoryOwnerDashboard from '../../components/InventoryOwnerDashboard.jsx'

export default function InventoryOwner() {
  const { tenantSlug } = useParams()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#F9FAFB' }}>
      <BackendHeader />
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '16px 20px' }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: '#111827' }}>
            Inventory Management
          </h1>
          <p style={{ color: '#6B7280', marginBottom: 24, fontSize: 14 }}>
            Monitor stock levels, set reorder points, and track inventory movements
          </p>
          <InventoryOwnerDashboard />
        </div>
      </div>
      <BackendNav
        role="owner"
        activeTab="inventory"
        onTabChange={(tab) => {
          // BackendNav handles navigation internally
        }}
      />
    </div>
  )
}
