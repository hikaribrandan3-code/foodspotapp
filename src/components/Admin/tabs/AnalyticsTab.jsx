import React from 'react';

const cardStyle = { background: 'white', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
const labelStyle = { fontSize: 11, fontWeight: 600, color: '#6B7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' };

export default function AnalyticsTab({ orders, userRole, demoAnalytics, setDemoAnalytics, demoData, demoTotalSales }) {
    const today = new Date().toDateString();
    const todayOrders = orders?.filter(o => new Date(o.createdAt).toDateString() === today) || [];
    const weekOrders = orders?.filter(o => {
        const orderDate = new Date(o.createdAt);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return orderDate >= weekAgo;
    }) || [];
    const monthOrders = orders?.filter(o => {
        const orderDate = new Date(o.createdAt);
        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);
        return orderDate >= monthAgo;
    }) || [];
    const totalRevenue = orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;

    return (
        <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ ...labelStyle, marginBottom: 0 }}>📊 ANALYTICS</h3>
                {userRole === 'superadmin' && (
                    <label style={{ fontSize: 11, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 6 }}>
                        Demo <input type="checkbox" checked={demoAnalytics} onChange={() => setDemoAnalytics(!demoAnalytics)} style={{ accentColor: '#22C55E' }} />
                    </label>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div style={cardStyle}><p style={{ fontSize: 10, color: '#9CA3AF', margin: 0 }}>Hoy</p><p style={{ fontSize: 22, fontWeight: 700, color: '#1F2937', margin: '4px 0 0' }}>{todayOrders.length}</p></div>
                <div style={cardStyle}><p style={{ fontSize: 10, color: '#9CA3AF', margin: 0 }}>Semana</p><p style={{ fontSize: 22, fontWeight: 700, color: '#1F2937', margin: '4px 0 0' }}>{weekOrders.length}</p></div>
                <div style={cardStyle}><p style={{ fontSize: 10, color: '#9CA3AF', margin: 0 }}>Mes</p><p style={{ fontSize: 22, fontWeight: 700, color: '#1F2937', margin: '4px 0 0' }}>{monthOrders.length}</p></div>
                <div style={cardStyle}><p style={{ fontSize: 10, color: '#9CA3AF', margin: 0 }}>Total</p><p style={{ fontSize: 22, fontWeight: 700, color: '#1F2937', margin: '4px 0 0' }}>{orders?.length || 0}</p></div>
            </div>

            <div style={cardStyle}>
                <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>Ingresos totales</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: '#22C55E', margin: '4px 0 0' }}>${(demoAnalytics ? demoTotalSales : totalRevenue).toLocaleString()}</p>
            </div>

            {demoAnalytics && (
                <div style={cardStyle}>
                    <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 12 }}>Últimos 15 días</p>
                    <div style={{ height: 60, display: 'flex', alignItems: 'flex-end', gap: 3 }}>
                        {demoData?.slice(-15).map((d, i) => (
                            <div key={i} style={{ flex: 1, height: `${(d.value / Math.max(...demoData.map(x => x.value))) * 100}%`, background: i % 2 === 0 ? '#B8A089' : '#C9B89A', borderRadius: '3px 3px 0 0', minHeight: 6 }} />
                        ))}
                    </div>
                    <p style={{ fontSize: 9, color: '#9CA3AF', textAlign: 'center', marginTop: 8 }}>⚠️ Datos de demostración</p>
                </div>
            )}
        </>
    );
}
