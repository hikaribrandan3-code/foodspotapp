/**
 * Staff KDS with CamTech Black Box Integration
 * 
 * Pauses polling when camera is active to prevent lag/crashes
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useCamTechListener } from '../hooks/useCamTech';

export function StaffKDSWithCamTech({ businessId }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const lastFetchRef = useRef(Date.now());
  
  // Listen for camera state
  useCamTechListener({
    onPause: () => {
      console.log('[KDS] ⏸️ Polling paused - camera active');
      setIsPaused(true);
    },
    onResume: () => {
      console.log('[KDS] ▶️ Polling resumed - camera closed');
      setIsPaused(false);
      // Immediate refresh when resuming
      fetchOrders();
    },
    debounceMs: 1000
  });

  const fetchOrders = useCallback(async () => {
    // Skip if camera is active
    if (window.__camTechActive) {
      console.log('[KDS] ⏸️ Skipping fetch - camera active');
      return;
    }
    
    setLoading(true);
    lastFetchRef.current = Date.now();
    
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('business_id', businessId)
        .in('status', ['paid', 'cooking', 'ready'])
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error('[KDS] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  // Polling with smart backoff
  useEffect(() => {
    let intervalId;
    
    const startPolling = () => {
      // Fast poll (3s) normally, slow (10s) when idle
      const getInterval = () => {
        if (orders.length > 0) return 3000;
        if (Date.now() - lastFetchRef.current > 60000) return 10000; // Slow after 1min idle
        return 5000;
      };
      
      intervalId = setInterval(() => {
        if (!window.__camTechActive && !isPaused) {
          fetchOrders();
        }
      }, getInterval());
    };
    
    startPolling();
    fetchOrders(); // Initial fetch
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [fetchOrders, isPaused, orders.length]);

  // Handle order status change
  const updateStatus = async (orderId, newStatus) => {
    try {
      const { data, error } = await supabase
        .rpc('transition_order_state', {
          p_order_id: orderId,
          p_new_status: newStatus
        });
      
      if (error) throw error;
      
      // Refresh orders
      fetchOrders();
      
    } catch (err) {
      console.error('[KDS] Status update error:', err);
      alert('Failed to update status: ' + err.message);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>🍳 Kitchen Display System</h2>
        <div style={styles.status}>
          {isPaused && (
            <span style={styles.pausedBadge}>⏸️ Sync Paused (Camera Active)</span>
          )}
          {loading && !isPaused && <span>🔄 Updating...</span>}
        </div>
      </div>
      
      <div style={styles.ordersGrid}>
        {orders.length === 0 && (
          <div style={styles.empty}>No active orders 🎉</div>
        )}
        
        {orders.map(order => (
          <div key={order.id} style={{
            ...styles.orderCard,
            ...getStatusStyle(order.status)
          }}>
            <div style={styles.orderHeader}>
              <span>#{order.id.slice(-6)}</span>
              <span style={styles.time}>{formatTime(order.created_at)}</span>
            </div>
            
            <div style={styles.items}>
              {order.items?.map((item, i) => (
                <div key={i}>{item.quantity}x {item.name}</div>
              ))}
            </div>
            
            <div style={styles.actions}>
              {order.status === 'paid' && (
                <button 
                  onClick={() => updateStatus(order.id, 'cooking')}
                  style={styles.cookingBtn}
                >
                  Start Cooking
                </button>
              )}
              {order.status === 'cooking' && (
                <button 
                  onClick={() => updateStatus(order.id, 'ready')}
                  style={styles.readyBtn}
                >
                  Mark Ready
                </button>
              )}
              {order.status === 'ready' && (
                <button 
                  onClick={() => updateStatus(order.id, 'completed')}
                  style={styles.completeBtn}
                >
                  Complete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper functions
function getStatusStyle(status) {
  const styles = {
    paid: { borderLeft: '4px solid #ffc107' },
    cooking: { borderLeft: '4px solid #ff5722' },
    ready: { borderLeft: '4px solid #4caf50' }
  };
  return styles[status] || {};
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

const styles = {
  container: {
    padding: 20,
    background: '#1a1a2e',
    minHeight: '100vh',
    color: '#fff'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  status: {
    display: 'flex',
    gap: 10,
    alignItems: 'center'
  },
  pausedBadge: {
    background: '#ff9800',
    color: '#000',
    padding: '4px 12px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600
  },
  ordersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 16
  },
  empty: {
    textAlign: 'center',
    padding: 60,
    color: '#888',
    fontSize: 18
  },
  orderCard: {
    background: '#16213e',
    borderRadius: 12,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 12
  },
  orderHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontWeight: 600
  },
  time: {
    color: '#888',
    fontSize: 12
  },
  items: {
    fontSize: 14,
    lineHeight: 1.6
  },
  actions: {
    display: 'flex',
    gap: 8,
    marginTop: 'auto'
  },
  cookingBtn: {
    flex: 1,
    padding: 10,
    background: '#ff5722',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: 600
  },
  readyBtn: {
    flex: 1,
    padding: 10,
    background: '#4caf50',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: 600
  },
  completeBtn: {
    flex: 1,
    padding: 10,
    background: '#2196f3',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: 600
  }
};

export default StaffKDSWithCamTech;
