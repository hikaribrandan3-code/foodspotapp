import React, { useState, useEffect } from 'react';
import { Package, ClipboardList, Plus, Search, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient.js';
import { useTenant } from '../../contexts/TenantContext.jsx';
import InventoryOwnerDashboard from '../InventoryOwnerDashboard.jsx';

const primaryColor = '#10B981';
const cardStyle = {
  padding: 20, background: '#FFFFFF', borderRadius: 16,
  border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
};

export default function MenuInventoryView() {
  const [activeTab, setActiveTab] = useState('stock');
  const { businessId } = useTenant();
  const [transactions, setTransactions] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [entryLoading, setEntryLoading] = useState(false);

  const tabs = [
    { id: 'entry', label: 'Entry' },
    { id: 'stock', label: 'Stock' },
    { id: 'audit', label: 'Audit' },
  ];

  const fetchLowStock = async () => {
    if (!businessId) return;
    setEntryLoading(true);
    const { data } = await supabase
      .from('inventory')
      .select(`
        id, menu_item_id, quantity_available, reorder_level,
        menu_items!inventory_menu_item_id_fkey(name, category)
      `)
      .eq('business_id', businessId)
      .lte('quantity_available', 10)
      .order('quantity_available', { ascending: true })
      .limit(20);

    if (data) {
      setLowStockItems(data.map((row) => ({
        id: row.id,
        name: row.menu_items?.name ?? 'Unknown',
        category: row.menu_items?.category ?? 'other',
        quantity_available: row.quantity_available,
        reorder_level: row.reorder_level ?? 10,
      })));
    }
    setEntryLoading(false);
  };

  const fetchTransactions = async () => {
    if (!businessId) return;
    setAuditLoading(true);
    const { data } = await supabase
      .from('inventory_transactions')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(50);
    setTransactions(data || []);
    setAuditLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'audit') fetchTransactions();
    if (activeTab === 'entry') fetchLowStock();
  }, [activeTab]);

  return (
    <div>
      {/* Sub-tabs: Entry / Stock / Audit */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, justifyContent: 'center' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 18px', borderRadius: 20, fontSize: 13, fontWeight: 600,
              border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              background: activeTab === tab.id ? primaryColor : '#FFFFFF',
              color: activeTab === tab.id ? '#FFFFFF' : '#4B5563',
              boxShadow: activeTab === tab.id ? `0 4px 12px ${primaryColor}40` : '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ENTRY TAB */}
      {activeTab === 'entry' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Quick Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={20} style={{ color: primaryColor }} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#111827' }}>Quick Add</p>
                <p style={{ margin: 0, fontSize: 11, color: '#6B7280' }}>Use staff app to scan barcodes</p>
              </div>
            </div>
            <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={20} style={{ color: '#F59E0B' }} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#111827' }}>Low Stock</p>
                <p style={{ margin: 0, fontSize: 11, color: '#6B7280' }}>{lowStockItems.length} items need restocking</p>
              </div>
            </div>
          </div>

          {/* Low Stock Quick List */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px', color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={16} style={{ color: '#F59E0B' }} />
              Items to Restock
            </h3>
            {entryLoading ? (
              <p style={{ color: '#9CA3AF', textAlign: 'center', padding: 20, fontSize: 14 }}>Loading...</p>
            ) : lowStockItems.length === 0 ? (
              <p style={{ color: '#9CA3AF', textAlign: 'center', padding: 20, fontSize: 14 }}>All items are well stocked</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {lowStockItems.map((item) => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#F9FAFB', borderRadius: 10 }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#111827' }}>{item.name}</p>
                      <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF', textTransform: 'capitalize' }}>{item.category}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: item.quantity_available === 0 ? '#DC2626' : '#F59E0B' }}>
                        {item.quantity_available} left
                      </p>
                      <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF' }}>reorder at {item.reorder_level}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STOCK TAB */}
      {activeTab === 'stock' && <InventoryOwnerDashboard />}

      {/* AUDIT TAB */}
      {activeTab === 'audit' && (
        <div style={cardStyle}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px', color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClipboardList size={16} style={{ color: '#6B7280' }} />
            Recent Transactions
          </h3>
          {auditLoading ? (
            <p style={{ color: '#9CA3AF', textAlign: 'center', padding: 20, fontSize: 14 }}>Loading...</p>
          ) : transactions.length === 0 ? (
            <p style={{ color: '#9CA3AF', textAlign: 'center', padding: 20, fontSize: 14 }}>No transactions yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {transactions.map((t) => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#F9FAFB', borderRadius: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      fontSize: 13, fontWeight: 700,
                      color: t.quantity_change > 0 ? '#10B981' : '#DC2626',
                      minWidth: 32
                    }}>
                      {t.quantity_change > 0 ? '+' : ''}{t.quantity_change}
                    </span>
                    <span style={{ fontSize: 12, color: '#6B7280' }}>{t.notes || 'Adjustment'}</span>
                  </div>
                  <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                    {new Date(t.created_at).toLocaleDateString()} {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
