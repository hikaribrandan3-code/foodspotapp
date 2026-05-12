import React, { useState, useEffect, useMemo } from 'react';
import { Package, AlertTriangle, XCircle, CheckCircle, ChevronRight, X, History, Edit3, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient.js';
import { useTenant } from '../contexts/TenantContext.jsx';

const cardStyle = {
  padding: 20, background: '#FFFFFF', borderRadius: 16,
  border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
};
const labelStyle = {
  display: 'block', color: '#6B7280', fontSize: 11, marginBottom: 8,
  textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600
};
const valueStyle = { margin: 0, fontSize: 24, fontWeight: 800, color: '#111827' };

export default function InventoryOwnerDashboard() {
  const { businessId } = useTenant();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerItem, setDrawerItem] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [editItem, setEditItem] = useState(null);
  const [editQty, setEditQty] = useState('');
  const [editReorder, setEditReorder] = useState('');

  const fetchInventory = async () => {
    if (!businessId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('inventory')
      .select(`
        id, menu_item_id, quantity_available, reorder_level, updated_at,
        menu_items!inventory_menu_item_id_fkey(name, category)
      `)
      .eq('business_id', businessId)
      .order('quantity_available', { ascending: true });

    if (!error && data) {
      setItems(data.map((row) => ({
        id: row.id,
        menu_item_id: row.menu_item_id,
        quantity_available: row.quantity_available,
        reorder_level: row.reorder_level ?? 10,
        updated_at: row.updated_at,
        name: row.menu_items?.name ?? 'Unknown',
        category: row.menu_items?.category ?? 'other',
      })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchInventory(); }, [businessId]);

  const fetchTransactions = async (menuItemId) => {
    const { data } = await supabase
      .from('inventory_transactions')
      .select('*')
      .eq('business_id', businessId)
      .eq('menu_item_id', menuItemId)
      .order('created_at', { ascending: false })
      .limit(20);
    setTransactions(data || []);
  };

  const openDrawer = (item) => {
    setDrawerItem(item);
    fetchTransactions(item.menu_item_id);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setEditQty(String(item.quantity_available));
    setEditReorder(String(item.reorder_level));
  };

  const saveEdit = async () => {
    if (!editItem) return;
    const qty = parseInt(editQty, 10);
    const reorder = parseInt(editReorder, 10);
    if (isNaN(qty) || qty < 0 || isNaN(reorder) || reorder < 0) return;

    const delta = qty - editItem.quantity_available;

    await supabase.from('inventory').update({
      quantity_available: qty,
      reorder_level: reorder,
      updated_at: new Date().toISOString(),
    }).eq('id', editItem.id);

    if (delta !== 0) {
      await supabase.from('inventory_transactions').insert({
        business_id: businessId,
        menu_item_id: editItem.menu_item_id,
        quantity_change: delta,
        notes: 'Owner adjustment',
      });
    }

    setItems((prev) =>
      prev.map((i) =>
        i.id === editItem.id
          ? { ...i, quantity_available: qty, reorder_level: reorder }
          : i
      )
    );
    setEditItem(null);
  };

  const deleteItem = async (itemId) => {
    if (!window.confirm('Delete this inventory item?')) return;
    await supabase.from('inventory').delete().eq('id', itemId).eq('business_id', businessId);
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const grouped = useMemo(() => {
    const out = items.filter((i) => i.quantity_available === 0);
    const low = items.filter((i) => i.quantity_available > 0 && i.quantity_available <= i.reorder_level);
    const ok = items.filter((i) => i.quantity_available > i.reorder_level);
    return { out, low, ok };
  }, [items]);

  const totalSKUs = items.length;
  const lowCount = grouped.low.length;
  const outCount = grouped.out.length;

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>
        <div style={{ width: 40, height: 40, border: '4px solid #E5E7EB', borderTopColor: '#10B981', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ fontSize: 14 }}>Loading inventory...</p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #E5E7EB' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>Inventory</h2>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div style={cardStyle}>
          <span style={labelStyle}>Total SKUs</span>
          <h3 style={valueStyle}>{totalSKUs}</h3>
        </div>
        <div style={{ ...cardStyle, borderLeft: '4px solid #F59E0B' }}>
          <span style={labelStyle}>Low Stock</span>
          <h3 style={{ ...valueStyle, color: '#F59E0B' }}>{lowCount}</h3>
        </div>
        <div style={{ ...cardStyle, borderLeft: '4px solid #DC2626' }}>
          <span style={labelStyle}>Out of Stock</span>
          <h3 style={{ ...valueStyle, color: '#DC2626' }}>{outCount}</h3>
        </div>
      </div>

      {/* Grouped List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* OUT OF STOCK */}
        {grouped.out.length > 0 && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <XCircle className="w-4 h-4" style={{ color: '#DC2626' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#DC2626' }}>OUT OF STOCK</span>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>{grouped.out.length} items</span>
            </div>
            {grouped.out.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                status="out"
                onHistory={() => openDrawer(item)}
                onEdit={() => openEdit(item)}
                onDelete={() => deleteItem(item.id)}
              />
            ))}
          </div>
        )}

        {/* LOW STOCK */}
        {grouped.low.length > 0 && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <AlertTriangle className="w-4 h-4" style={{ color: '#F59E0B' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#F59E0B' }}>LOW STOCK</span>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>{grouped.low.length} items</span>
            </div>
            {grouped.low.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                status="low"
                onHistory={() => openDrawer(item)}
                onEdit={() => openEdit(item)}
                onDelete={() => deleteItem(item.id)}
              />
            ))}
          </div>
        )}

        {/* OK */}
        {grouped.ok.length > 0 && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <CheckCircle className="w-4 h-4" style={{ color: '#10B981' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#10B981' }}>OK</span>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>{grouped.ok.length} items</span>
            </div>
            {grouped.ok.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                status="ok"
                onHistory={() => openDrawer(item)}
                onEdit={() => openEdit(item)}
                onDelete={() => deleteItem(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Transaction History Drawer */}
      {drawerItem && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 2147483647, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => setDrawerItem(null)}
        >
          <div
            style={{ ...cardStyle, width: '100%', maxWidth: 480, maxHeight: '70vh', overflowY: 'auto', borderRadius: '20px 20px 0 0', margin: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>
                {drawerItem.name} — History
              </h3>
              <button onClick={() => setDrawerItem(null)} style={{ padding: 6, background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 8, color: '#9CA3AF' }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {transactions.length === 0 ? (
              <p style={{ color: '#9CA3AF', fontSize: 14, textAlign: 'center', padding: 20 }}>No transactions yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {transactions.map((t) => (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#F9FAFB', borderRadius: 10 }}>
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 700, color: t.quantity_change > 0 ? '#10B981' : '#DC2626' }}>
                        {t.quantity_change > 0 ? '+' : ''}{t.quantity_change}
                      </span>
                      <span style={{ fontSize: 12, color: '#6B7280', marginLeft: 8 }}>{t.notes || 'Adjustment'}</span>
                    </div>
                    <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                      {new Date(t.created_at).toLocaleDateString()} {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editItem && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 2147483647, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setEditItem(null)}
        >
          <div style={{ ...cardStyle, width: '100%', maxWidth: 360, padding: 20 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>Edit {editItem.name}</h3>
              <button onClick={() => setEditItem(null)} style={{ padding: 6, background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 8, color: '#9CA3AF' }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ ...labelStyle, marginBottom: 6 }}>Current Stock</label>
                <input
                  type="number"
                  min="0"
                  value={editQty}
                  onChange={(e) => setEditQty(e.target.value)}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 14, outline: 'none', background: '#F9FAFB', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ ...labelStyle, marginBottom: 6 }}>Reorder Level</label>
                <input
                  type="number"
                  min="0"
                  value={editReorder}
                  onChange={(e) => setEditReorder(e.target.value)}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 14, outline: 'none', background: '#F9FAFB', boxSizing: 'border-box' }}
                />
              </div>
              <button
                onClick={saveEdit}
                style={{
                  padding: '14px', background: '#10B981', color: '#FFFFFF',
                  borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', marginTop: 4
                }}
              >
                Save Changes
              </button>
              <button
                onClick={async () => {
                  if (!window.confirm(`Stop tracking stock for "${editItem.name}"? This won't delete the menu item.`)) return;
                  await supabase.from('inventory').delete().eq('id', editItem.id);
                  setItems((prev) => prev.filter((i) => i.id !== editItem.id));
                  setEditItem(null);
                }}
                style={{
                  padding: '14px', background: '#FFFFFF', color: '#DC2626',
                  borderRadius: 12, border: '1px solid #FECACA', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', marginTop: 8
                }}
              >
                Remove from Inventory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ItemRow({ item, status, onHistory, onEdit, onDelete }) {
  const pct = Math.min((item.quantity_available / Math.max(item.reorder_level, 1)) * 100, 100);
  const statusColor = status === 'out' ? '#DC2626' : status === 'low' ? '#F59E0B' : '#10B981';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 0', borderBottom: '1px solid #F3F4F6'
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{item.name}</span>
          <span style={{ fontSize: 11, color: '#9CA3AF', textTransform: 'capitalize' }}>{item.category}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: statusColor }}>
            {item.quantity_available} / {item.reorder_level}
          </span>
          <div style={{ flex: 1, height: 6, background: '#F3F4F6', borderRadius: 3, maxWidth: 120 }}>
            <div style={{ height: '100%', width: `${pct}%`, background: statusColor, borderRadius: 3, transition: 'width 0.3s' }} />
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <button
          onClick={onHistory}
          style={{ padding: 6, background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 8, color: '#9CA3AF' }}
          title="History"
        >
          <History className="w-4 h-4" />
        </button>
        <button
          onClick={onEdit}
          style={{ padding: 6, background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 8, color: '#9CA3AF' }}
          title="Edit"
        >
          <Edit3 className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          style={{ padding: 6, background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 8, color: '#DC2626' }}
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
