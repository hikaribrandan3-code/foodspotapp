// src/pages/staff/StaffKDS.jsx
import React, { useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTenant } from '../../contexts/TenantContext';
import { useKDSSync } from '../../hooks/useKDSSync';
import { useCamTechListener } from '../../hooks/useCamTech';
import { useStaff } from '../../contexts/StaffContext';
import { useKDSAudio } from '../../hooks/useKDSAudio.js';
import { VolumeIcon, BellIcon } from '../../components/AudioIcons';
import { LoadingScreen } from '../../components/LoadingScreen'
import { ORDER_STATUS } from '../../constants/database.js';


const KDS_COLUMNS = [
    { id: ORDER_STATUS.RELEASED_TO_KITCHEN, next: ORDER_STATUS.PREPARING, color: 'yellow' },
    { id: ORDER_STATUS.PREPARING, next: ORDER_STATUS.READY, color: 'orange' },
    { id: ORDER_STATUS.READY, next: null, color: 'green' } // next is order-type-aware
];

export const StaffKDS = () => {
    const { businessId } = useTenant();
    const { t } = useLanguage();
    const [isPaused, setIsPaused] = React.useState(false);
    const [lastOrderCount, setLastOrderCount] = React.useState(0);
    const [newOrderFlash, setNewOrderFlash] = React.useState(false);
    const { orders, loading, transitionOrderState, fetchOrders } = useKDSSync(businessId);
    const { currentShift, clockOut, clearStaff } = useStaff();
    const { isMuted, volume, isUnlocked, toggleMute, cycleVolume, playChime } = useKDSAudio();

    // Audio + visual alert for new orders
    React.useEffect(() => {
        if (orders.length > lastOrderCount && !isPaused) {
            playChime();
            // Visual flash backup (works even on silent)
            setNewOrderFlash(true);
            setTimeout(() => setNewOrderFlash(false), 600);
        }
        setLastOrderCount(orders.length);
    }, [orders.length, isPaused, playChime]);

    const handleEndShift = async () => {
        if (!window.confirm('End your shift?')) return;
        if (currentShift?.id) await clockOut(currentShift.id);
        clearStaff();
    };

    useCamTechListener({
        onPause: () => { setIsPaused(true); },
        onResume: () => { setIsPaused(false); fetchOrders(); }
    });

    const ordersByStatus = useMemo(() => {
        const grouped = { released_to_kitchen: [], preparing: [], ready: [] };
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

    if (loading) return <LoadingScreen />;

    if (!businessId) return <div className="kds-error">No business ID found. Please login.</div>;

    return (
        <div className="kds-container" style={{ outline: newOrderFlash ? '3px solid #F59E0B' : '3px solid transparent', transition: 'outline 0.1s' }}>

            {/* Unlock banner — shows until user taps */}
            {!isUnlocked && (
                <div style={{
                    background: '#FEF3C7', color: '#92400E', padding: '10px 16px',
                    fontSize: 13, fontWeight: 600, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    borderBottom: '1px solid #FDE68A', cursor: 'pointer'
                }}>
                    <BellIcon muted={false} size={16} color="#92400E" />
                    Tap anywhere to enable order sound alerts
                </div>
            )}

            <div className="bg-white border-b border-stone-200 px-4 md:px-8 py-3" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h1 className="font-['Outfit',sans-serif] text-2xl font-black text-stone-950 italic tracking-tight leading-none">
                    Staff
                </h1>

                {/* Audio controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                        onClick={cycleVolume}
                        title={`Volume: ${volume}`}
                        style={{
                            background: '#F3F4F6', border: 'none', borderRadius: 8,
                            padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                            opacity: isMuted ? 0.4 : 1, color: '#0F1B2D'
                        }}
                    ><VolumeIcon level={volume} size={18} /></button>
                    <button
                        onClick={toggleMute}
                        title={isMuted ? 'Unmute' : 'Mute'}
                        style={{
                            background: isMuted ? '#FEE2E2' : '#F3F4F6',
                            border: 'none', borderRadius: 8,
                            padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                            color: isMuted ? '#B33A3A' : '#0F1B2D'
                        }}
                    ><BellIcon muted={isMuted} size={18} /></button>

                    {currentShift && (
                        <button
                            onClick={handleEndShift}
                            style={{ background: '#EF4444', color: 'white', border: 'none', borderRadius: 8, padding: '8px 14px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                        >
                            End Shift
                        </button>
                    )}
                </div>
            </div>
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
                                        onClick={() => {
                                            const target = col.next || (order.order_type === 'delivery' ? ORDER_STATUS.DISPATCHED : ORDER_STATUS.DELIVERED)
                                            transitionOrderState(order.id, order.status, target)
                                        }}
                                        className="btn-primary"
                                        style={{ width: '100%', padding: '12px', borderRadius: '8px', cursor: 'pointer' }}
                                    >
                                        {col.next ? t('ready_action')
                                            : order.order_type === 'delivery' ? 'Dispatch'
                                            : 'Hand Over'}
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