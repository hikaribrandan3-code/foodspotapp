import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuth, clearAuth, getOrders } from '../../utils/storage.js'
import { getConfig, updateConfig } from '../../config/appConfig.js'
import BackendHeader from '../../components/BackendHeader.jsx'
import BackendNav from '../../components/BackendNav.jsx'

/**
 * OwnerSummary - Summary dashboard for Owner (matches SuperAdmin Summary layout)
 */
function OwnerSummary({ config }) {
    const navigate = useNavigate()
    const [orders, setOrders] = useState(() => getOrders())

    useEffect(() => {
        const auth = getAuth()
        if (!auth.authenticated || (auth.role !== 'owner' && auth.role !== 'superadmin')) {
            navigate('/owner')
        }
    }, [navigate])

    // Poll for order updates
    useEffect(() => {
        const interval = setInterval(() => {
            setOrders(getOrders())
        }, 5000)
        return () => clearInterval(interval)
    }, [])

    const handleLogout = () => {
        clearAuth()
        navigate('/')
    }

    // Stats calculations
    const today = new Date().toDateString()
    const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === today)
    const mpOrders = todayOrders.filter(o => o.paymentMethod === 'mercadopago')
    const cashOrders = todayOrders.filter(o => o.paymentMethod === 'efectivo' || !o.paymentMethod)
    const mpTotal = mpOrders.reduce((sum, o) => sum + (o.total || 0), 0)
    const cashTotal = cashOrders.reduce((sum, o) => sum + (o.total || 0), 0)
    const totalToday = mpTotal + cashTotal

    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
    const monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth() - 1)
    const weekOrders = orders.filter(o => new Date(o.createdAt) >= weekAgo)
    const monthOrders = orders.filter(o => new Date(o.createdAt) >= monthAgo)

    // Update business info
    const updateBusinessInfo = (field, value) => {
        const newInfo = { ...config?.businessInfo, [field]: value }
        updateConfig({ businessInfo: newInfo })
        window.dispatchEvent(new CustomEvent('frontendSync'))
    }

    // Card style helper
    const cardStyle = { background: 'white', borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }
    const labelStyle = { fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }
    const inputStyle = { width: '100%', padding: '12px 14px', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 14, boxSizing: 'border-box', marginBottom: 12 }

    return (
        <div className="backend-surface" style={{ minHeight: '100vh', background: '#F5F2EE', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <BackendHeader
                title="Summary"
                onLogout={handleLogout}
                showDateSelector={false}
                showNotifications={false}
                showAvatar={false}
            />

            {/* Sync Button */}
            <div style={{ padding: '12px 16px', background: '#FFFFFF', borderBottom: '1px solid #E5E7EB' }}>
                <button
                    onClick={() => {
                        window.dispatchEvent(new CustomEvent('frontendSync'))
                        setOrders(getOrders())
                        alert('✅ Frontend synced!')
                    }}
                    style={{
                        width: '100%',
                        padding: '10px 16px',
                        fontSize: 13,
                        fontWeight: 600,
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        background: '#3B82F6',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8
                    }}
                >
                    🔄 Refresh Frontend
                </button>
            </div>

            {/* Content - with bottom padding for BackendNav */}
            <div style={{ padding: 16, paddingBottom: 'calc(88px + env(safe-area-inset-bottom, 0px))' }}>

                {/* ==================== PAGOS DEL DÍA ==================== */}
                <h3 style={labelStyle}>💳 PAGOS DEL DÍA</h3>
                <div style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid #F3F4F6' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#E0F2F1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>💳</div>
                            <div><p style={{ fontSize: 14, fontWeight: 500, color: '#1F2937', margin: 0 }}>Mercado Pago</p><p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>{mpOrders.length} sesiones</p></div>
                        </div>
                        <span style={{ fontSize: 16, fontWeight: 600, color: '#22C55E' }}>${mpTotal.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #F3F4F6' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>💵</div>
                            <div><p style={{ fontSize: 14, fontWeight: 500, color: '#1F2937', margin: 0 }}>Efectivo</p><p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>{cashOrders.length} sesiones</p></div>
                        </div>
                        <span style={{ fontSize: 16, fontWeight: 600, color: '#22C55E' }}>${cashTotal.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12 }}>
                        <div><p style={{ fontSize: 14, fontWeight: 600, color: '#1F2937', margin: 0 }}>Total del día</p><p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>{todayOrders.length} sesiones</p></div>
                        <span style={{ fontSize: 18, fontWeight: 700, color: '#1F2937' }}>${totalToday.toLocaleString()}</span>
                    </div>
                </div>

                {/* ==================== SESIONES ==================== */}
                <h3 style={labelStyle}>SESIONES</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <div style={cardStyle}><p style={{ fontSize: 24, fontWeight: 700, color: '#22C55E', margin: 0 }}>{weekOrders.length}</p><p style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 0' }}>Esta semana</p></div>
                    <div style={cardStyle}><p style={{ fontSize: 24, fontWeight: 700, color: '#22C55E', margin: 0 }}>{monthOrders.length}</p><p style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 0' }}>Este mes</p></div>
                </div>

                {/* ==================== INFORMACIÓN DEL LOCAL ==================== */}
                <h3 style={labelStyle}>📍 INFORMACIÓN DEL LOCAL</h3>
                <div style={cardStyle}>
                    <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>WhatsApp (contacto principal)</label>
                    <input type="text" placeholder="+54 11 1234-5678" value={config?.businessInfo?.whatsapp || ''} onChange={(e) => updateBusinessInfo('whatsapp', e.target.value)} style={inputStyle} />

                    <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>Dirección</label>
                    <input type="text" placeholder="Av. Corrientes 1234" value={config?.businessInfo?.address || ''} onChange={(e) => updateBusinessInfo('address', e.target.value)} style={inputStyle} />

                    <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>Horarios</label>
                    <input type="text" placeholder="Lun-Vie 9-21, Sab 10-18" value={config?.businessInfo?.hours || ''} onChange={(e) => updateBusinessInfo('hours', e.target.value)} style={inputStyle} />

                    <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>Google Maps (reseñas)</label>
                    <input type="text" placeholder="https://maps.google.com/..." value={config?.businessInfo?.googleMapsLink || ''} onChange={(e) => updateBusinessInfo('googleMapsLink', e.target.value)} style={inputStyle} />

                    <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>Indicaciones / Notas</label>
                    <input type="text" placeholder="Timbre 2A, subir escaleras" value={config?.businessInfo?.directions || ''} onChange={(e) => updateBusinessInfo('directions', e.target.value)} style={inputStyle} />
                </div>

                {/* ==================== LINKS EXTERNOS ==================== */}
                <h3 style={labelStyle}>🔗 LINKS EXTERNOS</h3>
                <div style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, color: '#374151' }}>🧡 Rappi</span>
                        <label className="toggle"><input type="checkbox" checked={config?.externalOrdering?.rappiEnabled ?? false} onChange={() => { const c = config?.externalOrdering || {}; updateConfig({ externalOrdering: { ...c, rappiEnabled: !c.rappiEnabled } }); window.dispatchEvent(new CustomEvent('frontendSync')) }} /><span className="toggle-slider"></span></label>
                    </div>
                    <input type="text" placeholder="Link de Rappi" value={config?.externalOrdering?.rappiUrl || ''} onChange={(e) => { const c = config?.externalOrdering || {}; updateConfig({ externalOrdering: { ...c, rappiUrl: e.target.value } }); window.dispatchEvent(new CustomEvent('frontendSync')) }} style={{ ...inputStyle, marginBottom: 14 }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, color: '#374151' }}>❤️ PedidosYa</span>
                        <label className="toggle"><input type="checkbox" checked={config?.externalOrdering?.pedidosYaEnabled ?? false} onChange={() => { const c = config?.externalOrdering || {}; updateConfig({ externalOrdering: { ...c, pedidosYaEnabled: !c.pedidosYaEnabled } }); window.dispatchEvent(new CustomEvent('frontendSync')) }} /><span className="toggle-slider"></span></label>
                    </div>
                    <input type="text" placeholder="Link de PedidosYa" value={config?.externalOrdering?.pedidosYaUrl || ''} onChange={(e) => { const c = config?.externalOrdering || {}; updateConfig({ externalOrdering: { ...c, pedidosYaUrl: e.target.value } }); window.dispatchEvent(new CustomEvent('frontendSync')) }} style={{ ...inputStyle, marginBottom: 14 }} />

                    {/* Mercado Pago Alias */}
                    <div style={{ paddingTop: 10, borderTop: '1px solid #F3F4F6' }}>
                        <span style={{ fontSize: 13, color: '#374151', display: 'block', marginBottom: 6 }}>💳 Mercado Pago (Alias)</span>
                        <input
                            type="text"
                            placeholder="ej: grubclub.mp"
                            value={config?.payments?.mercadoPagoAlias || ''}
                            onChange={(e) => {
                                const c = config?.payments || {};
                                updateConfig({ payments: { ...c, mercadoPagoAlias: e.target.value } });
                                window.dispatchEvent(new CustomEvent('frontendSync'))
                            }}
                            style={inputStyle}
                        />
                        <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4 }}>Si está vacío, no aparece en Info</p>
                    </div>
                </div>

            </div>

            {/* Backend Navigation */}
            <BackendNav
                role="owner"
                useRoutes={true}
            />
        </div>
    )
}

export default OwnerSummary
