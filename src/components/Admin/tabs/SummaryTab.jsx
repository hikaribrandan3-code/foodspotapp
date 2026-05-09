import React from 'react';
import { PAYMENT_METHOD } from '../../../constants/database.js';


const cardStyle = { background: 'white', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
const labelStyle = { fontSize: 11, fontWeight: 600, color: '#6B7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' };
const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 14, marginBottom: 12 };

export default function SummaryTab({ config, updateBusinessInfoCloud, updateBrandingCloud, updateConfig }) {
    const today = new Date().toDateString();
    const todayOrders = config.orders?.filter(o => new Date(o.createdAt).toDateString() === today) || [];
    const weekOrders = config.orders?.filter(o => {
        const orderDate = new Date(o.createdAt);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return orderDate >= weekAgo;
    }) || [];
    const monthOrders = config.orders?.filter(o => {
        const orderDate = new Date(o.createdAt);
        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);
        return orderDate >= monthAgo;
    }) || [];
    const mpOrders = todayOrders.filter(o => o.paymentMethod === PAYMENT_METHOD.MERCADO_PAGO);
    const cashOrders = todayOrders.filter(o => o.paymentMethod === PAYMENT_METHOD.CASH);
    const mpTotal = mpOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const cashTotal = cashOrders.reduce((sum, o) => sum + (o.total || 0), 0);

    return (
        <>
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
                    <span style={{ fontSize: 18, fontWeight: 700, color: '#1F2937' }}>${(mpTotal + cashTotal).toLocaleString()}</span>
                </div>
            </div>

            <h3 style={labelStyle}>SESIONES</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div style={cardStyle}><p style={{ fontSize: 24, fontWeight: 700, color: '#22C55E', margin: 0 }}>{weekOrders.length}</p><p style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 0' }}>Esta semana</p></div>
                <div style={cardStyle}><p style={{ fontSize: 24, fontWeight: 700, color: '#22C55E', margin: 0 }}>{monthOrders.length}</p><p style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 0' }}>Este mes</p></div>
            </div>

            <h3 style={labelStyle}>📞 COMUNICACIÓN ACTIVA</h3>
            <div style={cardStyle}>
                <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>WhatsApp (contacto principal)</label>
                <input type="text" placeholder="+54 11 1234-5678" value={config.businessInfo?.whatsapp || ''} onChange={(e) => updateBusinessInfoCloud('whatsapp', e.target.value)} style={inputStyle} />
            </div>

            <h3 style={labelStyle}>📍 LOCALIZACIÓN</h3>
            <div style={cardStyle}>
                <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>Dirección</label>
                <input type="text" placeholder="Av. Corrientes 1234" value={config.businessInfo?.address || ''} onChange={(e) => updateBusinessInfoCloud('address', e.target.value)} style={inputStyle} />

                <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>Horarios</label>
                <input type="text" placeholder="Lun-Vie 9-21, Sab 10-18" value={config.businessInfo?.hours || ''} onChange={(e) => updateBusinessInfoCloud('hours', e.target.value)} style={inputStyle} />

                <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>Google Maps (reseñas)</label>
                <input type="text" placeholder="https://maps.google.com/..." value={config.businessInfo?.googleMapsLink || ''} onChange={(e) => updateBusinessInfoCloud('googleMapsLink', e.target.value)} style={inputStyle} />

                <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>Indicaciones / Notas</label>
                <input type="text" placeholder="Timbre 2A, subir escaleras" value={config.businessInfo?.directions || ''} onChange={(e) => updateBusinessInfoCloud('directions', e.target.value)} style={inputStyle} />
            </div>

            <h3 style={labelStyle}>🔗 LINKS EXTERNOS & PAGOS</h3>
            <div style={cardStyle}>
                <div style={{ paddingTop: 10, borderTop: '1px solid #F3F4F6' }}>
                    <span style={{ fontSize: 13, color: '#374151', display: 'block', marginBottom: 6 }}>💳 Mercado Pago Setup</span>

                    <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4, fontWeight: 600 }}>Código de Acceso (Access Token) *Requerido</label>
                    <input type="password" placeholder="APP_1234567890..." value={config.mp_access_token || ''} onChange={(e) => updateBrandingCloud('mercadoPagoAccessToken', e.target.value)} style={inputStyle} />
                    <p style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 12 }}>
                        🔒 Privado. Tu dinero va directo a tu cuenta de MP.
                        <br />👉 <strong>Cómo obtenerlo:</strong> mercadopago.com.ar → Configuración → Desarrolladores → Credenciales → Copiar "Access Token"
                    </p>

                    <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>Alias / Usuario (para Info página)</label>
                    <input type="text" placeholder="ej: grubclub.mp" value={config.payments?.mercadoPagoAlias || ''} onChange={(e) => { const c = config.payments || {}; updateConfig({ payments: { ...c, mercadoPagoAlias: e.target.value } }); window.dispatchEvent(new CustomEvent('frontendSync')) }} style={inputStyle} />
                    <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4 }}>Opcional. Si está vacío, no aparece en Info</p>
                </div>
            </div>
        </>
    );
}
