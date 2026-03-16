import React from 'react';
import { canAdvanceOrder, getOrderStatusInfo } from '../../../utils/orderStateGuard.js';
import { verifyDeliveryCode, getPhoneLast4 } from '../../../utils/deliveryUtils.js';

const cardStyle = { background: 'white', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };

export default function OrdersTab({ orders, config, updateOrder, setOrders, deliveryConfirmCode, setDeliveryConfirmCode, paymentMethodSelect, setPaymentMethodSelect }) {
    const today = new Date().toDateString();
    const todayOrders = orders?.filter(o => new Date(o.createdAt).toDateString() === today) || [];
    const pendingOrders = todayOrders.filter(o => o.status === 'pendiente');
    const preparingOrders = todayOrders.filter(o => o.status === 'preparando');
    const deliveryOrders = todayOrders.filter(o => o.orderType === 'delivery' && !['entregado', 'cancelado'].includes(o.status));

    const handleStatusChange = (orderId, newStatus, order) => {
        const validation = canAdvanceOrder(order, newStatus, config);
        if (!validation.allowed) {
            alert(validation.reason);
            return;
        }
        updateOrder(orderId, { status: newStatus });
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    };

    const handlePaymentConfirm = (orderId) => {
        const method = paymentMethodSelect[orderId] || 'cash';
        updateOrder(orderId, { paymentConfirmed: true, paymentMethod: method });
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, paymentConfirmed: true, paymentMethod: method } : o));
    };

    const renderOrderCard = (order) => {
        const statusInfo = getOrderStatusInfo(order.status, order.orderType);
        return (
            <div key={order.id} style={{ ...cardStyle, marginBottom: 12, borderLeft: `4px solid ${statusInfo.color || '#E5E7EB'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 16, color: '#374151' }}>#{order.orderNumber}</span>
                    <span style={{ padding: '4px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: statusInfo.bg, color: statusInfo.color }}>
                        {statusInfo.label}
                    </span>
                </div>
                <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
                    {order.items?.map((item, i) => (
                        <span key={i}>{item.quantity}x {item.name}{i < order.items.length - 1 ? ', ' : ''}</span>
                    ))}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#22C55E', marginBottom: 10 }}>${order.total?.toLocaleString()}</div>
                {statusInfo.next && (
                    <button onClick={() => handleStatusChange(order.id, statusInfo.next, order)} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: statusInfo.color, color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        {statusInfo.action}
                    </button>
                )}
            </div>
        );
    };

    return (
        <>
            {pendingOrders.length > 0 && (
                <>
                    <h3 style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', marginBottom: 8, textTransform: 'uppercase' }}>⏳ PENDIENTES ({pendingOrders.length})</h3>
                    {pendingOrders.map(renderOrderCard)}
                </>
            )}

            {preparingOrders.length > 0 && (
                <>
                    <h3 style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', marginBottom: 8, textTransform: 'uppercase' }}>👨‍🍳 EN COCINA ({preparingOrders.length})</h3>
                    {preparingOrders.map(renderOrderCard)}
                </>
            )}

            {deliveryOrders.length > 0 && (
                <>
                    <h3 style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', marginBottom: 8, textTransform: 'uppercase' }}>🚚 ENVÍOS ({deliveryOrders.length})</h3>
                    {deliveryOrders.map(order => {
                        const statusInfo = getOrderStatusInfo(order.status, order.orderType);
                        return (
                            <div key={order.id} style={{ ...cardStyle, marginBottom: 12, borderLeft: '4px solid #F97316' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <span style={{ fontWeight: 700, fontSize: 16, color: '#374151' }}>#{order.orderNumber} 🚚</span>
                                    <span style={{ padding: '4px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: statusInfo.bg, color: statusInfo.color }}>{statusInfo.label}</span>
                                </div>
                                {order.customerInfo && (
                                    <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 10, background: '#F0FDF4', padding: 10, borderRadius: 8 }}>
                                        <p style={{ margin: 0, fontWeight: 600, color: '#374151' }}>📍 {order.customerInfo.name}</p>
                                        <p style={{ margin: '4px 0 0' }}>{order.customerInfo.address}</p>
                                        <p style={{ margin: '4px 0 0' }}>Tel: ***{getPhoneLast4(order.customerInfo.phone)}</p>
                                    </div>
                                )}
                                {order.status === 'en_camino' && order.customerInfo && (
                                    <div style={{ width: '100%', marginBottom: 8 }}>
                                        <label style={{ fontSize: 10, color: '#6B7280', display: 'block', marginBottom: 4 }}>Últimos 4 dígitos del teléfono</label>
                                        <input type="text" maxLength={4} placeholder="****" value={deliveryConfirmCode[order.id] || ''} onChange={(e) => setDeliveryConfirmCode(prev => ({ ...prev, [order.id]: e.target.value.replace(/\D/g, '') }))} style={{ width: '100%', padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 18, textAlign: 'center', letterSpacing: 6 }} />
                                    </div>
                                )}
                                {statusInfo.next && (
                                    <button onClick={() => {
                                        if (statusInfo.next === 'entregado' && order.customerInfo) {
                                            const code = deliveryConfirmCode[order.id] || '';
                                            if (!verifyDeliveryCode(code, order.customerInfo.phone)) { alert('Código incorrecto'); return; }
                                        }
                                        handleStatusChange(order.id, statusInfo.next, order);
                                    }} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: statusInfo.color, color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                                        {statusInfo.action}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </>
            )}

            {todayOrders.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40 }}>
                    <div style={{ fontSize: 32, marginBottom: 16 }}>📋</div>
                    <p style={{ color: '#6B7280' }}>No hay pedidos hoy</p>
                </div>
            )}

            <div style={{ background: '#FEF3C7', borderRadius: 8, padding: 12, marginTop: 24 }}>
                <p style={{ fontSize: 12, color: '#92400E', margin: 0 }}>⚠️ Historial de solo lectura</p>
            </div>

            <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginTop: 16 }}>
                {orders?.slice(0, 15).map((order, i) => (
                    <div key={order.orderNumber || i} style={{ padding: '12px 14px', borderBottom: i < Math.min(orders.length, 15) - 1 ? '1px solid #F3F4F6' : 'none' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <p style={{ fontSize: 13, fontWeight: 500, color: '#1F2937', margin: 0 }}>Pedido #{order.orderNumber || i + 1}</p>
                                <p style={{ fontSize: 11, color: '#9CA3AF', margin: '2px 0 0' }}>Confirmado por: {order.confirmedBy || 'staff'}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <span style={{ display: 'inline-block', padding: '2px 6px', background: order.paymentMethod === 'mercadopago' ? '#E0F2F1' : '#FEF3C7', borderRadius: 4, fontSize: 9, color: order.paymentMethod === 'mercadopago' ? '#0D9488' : '#92400E', fontWeight: 500 }}>{order.paymentMethod === 'mercadopago' ? 'MP' : 'Efectivo'}</span>
                                <p style={{ fontSize: 13, fontWeight: 600, color: '#1F2937', margin: '4px 0 0' }}>${(order.total || 0).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}
