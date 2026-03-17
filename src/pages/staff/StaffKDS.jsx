// src/pages/staff/StaffKDS.jsx
import React, { useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTenant } from '../../contexts/TenantContext';
import { useKDSSync } from '../../hooks/useKDSSync';
import { useCamTechListener } from '../../hooks/useCamTech';

const KDS_COLUMNS = [
    { id: 'paid', next: 'cooking', color: 'yellow' },
    { id: 'cooking', next: 'ready', color: 'orange' },
    { id: 'ready', next: 'completed', color: 'green' }
];

export const StaffKDS = () => {
    const { businessId } = useTenant();
    const { t } = useLanguage();
    const [isPaused, setIsPaused] = React.useState(false);
    const { orders, loading, transitionOrderState, fetchOrders } = useKDSSync(businessId);

    useCamTechListener({
        onPause: () => {
            console.log('[KDS] ⏸️ Pausing live updates (Camera Active)');
            setIsPaused(true);
        },
        onResume: () => {
            console.log('[KDS] ▶️ Resuming live updates');
            setIsPaused(false);
            fetchOrders();
        }
    });

    const ordersByStatus = useMemo(() => {
        const grouped = { paid: [], cooking: [], ready: [] };
        orders.forEach(order => {
            if (grouped[order.status]) {
                grouped[order.status].push(order);
            }
        });
        // Sort by oldest first
        Object.keys(grouped).forEach(key => {
            grouped[key].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        });
        return grouped;
    }, [orders]);

    if (loading) return <div className="kds-loading">{t('loading')}</div>;

    if (!businessId) return <div className="kds-error">No business ID found. Please login.</div>;

    return (
        <div className="kds-container">
            <div className="kds-columns">
                {KDS_COLUMNS.map(col => (
                    <div key={col.id} className={`kds-column kds-column--${col.color}`}>
                        <div className="kds-column-header">
                            <h3>{t(col.id)}</h3>
                            <span className="kds-count">{ordersByStatus[col.id].length}</span>
                        </div>
                        
                        <div className="kds-orders">
                            {ordersByStatus[col.id].map(order => (
                                <div key={order.id} className={`kds-card ${order.isOptimistic ? 'kds-card--optimistic' : ''}`}>
                                    <div className="kds-card-header">
                                        <span className="kds-order-number">#{order.order_number}</span>
                                        {order.isOptimistic && <span className="kds-spinner">⏳</span>}
                                    </div>
                                    <div className="kds-card-items">
                                        {order.items?.map((item, i) => (
                                            <div key={i}><strong>{item.quantity}x</strong> {item.name}</div>
                                        ))}
                                    </div>
                                    <button 
                                        disabled={order.isOptimistic}
                                        onClick={() => transitionOrderState(order.id, order.status, col.next)}
                                        className="btn-primary"
                                        style={{ width: '100%', padding: '12px', borderRadius: '8px', cursor: 'pointer' }}
                                    >
                                        {t('ready_action')}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StaffKDS;