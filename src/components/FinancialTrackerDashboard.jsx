import React, { useState, useEffect, useMemo } from 'react';
import { Trash2, Plus, Calendar, DollarSign, TrendingUp, Package } from 'lucide-react';
import { supabase } from '../lib/supabaseClient.js';
import { useTenant } from '../contexts/TenantContext.jsx';

const fmtMoney = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

const todayStr = () => new Date().toISOString().split('T')[0];

export default function FinancialTrackerDashboard() {
  const { businessId } = useTenant();
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const primaryColor = '#10B981';

  const cardStyle = {
    padding: 20, background: '#FFFFFF', borderRadius: 16,
    border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
  };
  const labelStyle = {
    display: 'block', color: '#6B7280', fontSize: 11, marginBottom: 8,
    textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600
  };
  const valueStyle = { margin: 0, fontSize: 24, fontWeight: 800, color: '#111827' };

  // Expenses stored in localStorage per business
  const storageKey = `fs_expenses_${businessId || 'global'}`;
  const [expenses, setExpenses] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey)) || [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(expenses));
  }, [expenses, storageKey]);

  // Fetch real orders + menu items
  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      const [{ data: orderData }, { data: menuData }] = await Promise.all([
        supabase
          .from('orders')
          .select('total, status, created_at')
          .eq('business_id', businessId)
          .in('status', ['paid', 'paid_unreleased', 'released_to_kitchen', 'confirmado', 'en_camino', 'despachado', 'entregado']),
        supabase
          .from('menu_items')
          .select('id, active')
          .eq('business_id', businessId),
      ]);
      if (cancelled) return;
      setOrders(orderData || []);
      setMenuItems(menuData || []);
      setLoading(false);
    };

    fetchData();
  }, [businessId]);

  const totalRevenue = useMemo(() => orders.reduce((s, o) => s + (o.total || 0), 0), [orders]);
  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + (e.amount || 0), 0), [expenses]);
  const netProfit = totalRevenue - totalExpenses;
  const activeProducts = menuItems.filter((m) => m.active !== false).length;

  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Operations');

  const addExpense = () => {
    const amt = parseFloat(amount);
    if (!desc.trim() || isNaN(amt) || amt <= 0) return;
    setExpenses((prev) => [
      { id: crypto.randomUUID?.() || String(Date.now()), category, description: desc, amount: amt, date: todayStr() },
      ...prev,
    ]);
    setDesc('');
    setAmount('');
  };

  const deleteExpense = (id) => setExpenses((prev) => prev.filter((e) => e.id !== id));

  const nextPayout = useMemo(() => {
    const d = new Date();
    const daysUntilFri = (5 - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + daysUntilFri);
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>
        <div style={{ width: 40, height: 40, border: '4px solid #E5E7EB', borderTopColor: primaryColor, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ fontSize: 14 }}>Loading finance data...</p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #E5E7EB' }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 16 }}>
        💰 Financial Tracker
      </h2>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div style={{ ...cardStyle, borderLeft: `4px solid ${primaryColor}` }}>
          <span style={labelStyle}>Net Profit</span>
          <h3 style={{ ...valueStyle, color: netProfit >= 0 ? primaryColor : '#DC2626' }}>
            {fmtMoney(netProfit)}
          </h3>
          <p style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
            {orders.length} orders
          </p>
        </div>

        <div style={cardStyle}>
          <span style={labelStyle}>Expenses</span>
          <h3 style={{ ...valueStyle, color: '#DC2626' }}>{fmtMoney(totalExpenses)}</h3>
          <p style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
            {expenses.length} entries
          </p>
        </div>

        <div style={cardStyle}>
          <span style={labelStyle}>Products</span>
          <h3 style={valueStyle}>{activeProducts}</h3>
          <p style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
            {menuItems.length} total
          </p>
        </div>

        <div style={cardStyle}>
          <span style={labelStyle}>Next Payout</span>
          <h3 style={{ ...valueStyle, fontSize: 18 }}>{nextPayout}</h3>
          <p style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
            Auto-deposit
          </p>
        </div>
      </div>

      {/* Revenue Breakdown + Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 20 }}>
        {/* Revenue Card */}
        <div style={cardStyle}>
          <span style={{ ...labelStyle, marginBottom: 16 }}>Revenue Breakdown</span>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F3F4F6' }}>
            <span style={{ fontSize: 14, color: '#6B7280' }}>Total Revenue</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: primaryColor }}>{fmtMoney(totalRevenue)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F3F4F6' }}>
            <span style={{ fontSize: 14, color: '#6B7280' }}>Total Expenses</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#DC2626' }}>-{fmtMoney(totalExpenses)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0 0' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Net Profit</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: netProfit >= 0 ? primaryColor : '#DC2626' }}>
              {fmtMoney(netProfit)}
            </span>
          </div>
          <div style={{ height: 6, width: '100%', background: '#F3F4F6', borderRadius: 3, marginTop: 12, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                background: totalRevenue > 0 && (totalExpenses / totalRevenue) > 1 ? '#DC2626' : primaryColor,
                borderRadius: 3,
                width: `${Math.min(totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0, 100)}%`,
                transition: 'width 0.5s ease'
              }}
            />
          </div>
        </div>

        {/* Recent Activity */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={labelStyle}>Recent Activity</span>
            <span style={{ fontSize: 12, color: '#9CA3AF' }}>{expenses.length} expenses</span>
          </div>

          {expenses.length === 0 ? (
            <p style={{ color: '#9CA3AF', fontSize: 14, textAlign: 'center', padding: 20 }}>
              No expenses yet. Add one below.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: 12, background: '#F9FAFB', borderRadius: 12
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, background: '#EFF6FF', borderRadius: 10,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      <DollarSign className="w-4 h-4" style={{ color: '#3B82F6' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>{expense.description}</p>
                      <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>
                        {expense.category} • {expense.date}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
                      -${expense.amount.toFixed(2)}
                    </span>
                    <button
                      onClick={() => deleteExpense(expense.id)}
                      style={{
                        padding: 6, background: 'transparent', border: 'none',
                        cursor: 'pointer', borderRadius: 8, color: '#9CA3AF'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#DC2626'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#9CA3AF'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Add Form */}
      <div style={cardStyle}>
        <span style={{ ...labelStyle, marginBottom: 16 }}>Quick Expense Add</span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <input
              type="text"
              placeholder="Description"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid #E5E7EB',
                fontSize: 14, outline: 'none', background: '#F9FAFB', boxSizing: 'border-box'
              }}
            />
          </div>
          <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{
              padding: '12px 16px', borderRadius: 12, border: '1px solid #E5E7EB',
              fontSize: 14, outline: 'none', background: '#F9FAFB', boxSizing: 'border-box', width: '100%'
            }}
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{
              padding: '12px 16px', borderRadius: 12, border: '1px solid #E5E7EB',
              fontSize: 14, outline: 'none', background: '#F9FAFB', boxSizing: 'border-box', width: '100%'
            }}
          >
            <option>Operations</option>
            <option>Software</option>
            <option>Marketing</option>
            <option>Rent</option>
            <option>Supplies</option>
          </select>
          <button
            onClick={addExpense}
            style={{
              gridColumn: '1 / -1',
              padding: '14px', background: primaryColor, color: '#FFFFFF',
              borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            <Plus className="w-4 h-4" />
            Add Transaction
          </button>
        </div>
      </div>
    </div>
  );
}
