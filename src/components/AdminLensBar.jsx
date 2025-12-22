import { useAdminIntent } from '../contexts/AdminIntentContext'
import { useNavigate } from 'react-router-dom'
import { getSession } from '../utils/auth.js'

const AdminLensBar = () => {
    const { isSimulated, activeRoleView, impersonatingBusinessId, impersonatingUserId, exitSimulation } = useAdminIntent()
    const navigate = useNavigate()
    const session = getSession()

    // Only show for authenticated superadmin who is simulating
    if (!isSimulated || session?.role !== 'superadmin') return null

    const handleExit = () => {
        exitSimulation()
        navigate('/admin')
    }

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '40px',
            backgroundColor: '#FF6B00', // Strong warning orange
            color: 'white',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            fontFamily: 'system-ui, sans-serif'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontWeight: 'bold' }}>👁 VIEWING AS:</span>
                <span style={{ textTransform: 'uppercase', backgroundColor: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: '4px' }}>
                    {activeRoleView}
                </span>
                <span>
                    ID: {impersonatingBusinessId}
                    {impersonatingUserId && ` / User: ${impersonatingUserId}`}
                </span>
            </div>

            <button
                onClick={handleExit}
                style={{
                    backgroundColor: 'white',
                    color: '#FF6B00',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 12px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '12px'
                }}
            >
                EXIT VIEW ✕
            </button>
        </div>
    )
}

export default AdminLensBar
