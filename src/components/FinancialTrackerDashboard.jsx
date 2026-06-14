import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Trash2, Plus, Calendar, DollarSign, TrendingUp, Package, Calculator, X,
  Download, Repeat, ChevronDown, ChevronUp, Target
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { supabase } from '../lib/supabaseClient.js';
import { useTenant } from '../contexts/TenantContext.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { ORDER_STATUS } from '../constants/database.js';

const todayStr = () => new Date().toLocaleDateString('sv-SE');

const CATEGORIES = [
  { name: 'Food & Ingredients', color: '#F59E0B' },
  { name: 'Packaging', color: '#8B5CF6' },
  { name: 'Payroll / Labor', color: '#EF4444' },
  { name: 'Utilities', color: '#06B6D4' },
  { name: 'Equipment & Repairs', color: '#6366F1' },
  { name: 'Insurance', color: '#EC4899' },
  { name: 'Licenses & Permits', color: '#14B8A6' },
  { name: 'Bank & Processing Fees', color: '#64748B' },
  { name: 'Delivery / Transport', color: '#F97316' },
  { name: 'Cleaning & Sanitation', color: '#10B981' },
  { name: 'Software', color: '#3B82F6' },
  { name: 'Marketing', color: '#D946EF' },
  { name: 'Rent', color: '#DC2626' },
  { name: 'Operations', color: '#6B7280' },
  { name: 'Supplies', color: '#84CC16' },
];

function getDateRange(filter) {
  const now = new Date();
  const start = new Date();
  switch (filter) {
    case 'week':
      start.setDate(now.getDate() - 7);
      return [start.toISOString().split('T')[0], now.toISOString().split('T')[0]];
    case 'month':
      start.setDate(1);
      return [start.toISOString().split('T')[0], now.toISOString().split('T')[0]];
    case 'quarter': {
      const q = Math.floor(now.getMonth() / 3);
      start.setMonth(q * 3, 1);
      return [start.toISOString().split('T')[0], now.toISOString().split('T')[0]];
    }
    default:
      return ['2000-01-01', '2099-12-31'];
  }
}

function getCatMeta(name) {
  return CATEGORIES.find((c) => c.name === name) || { color: '#9CA3AF', icon: '•' };
}

export default function FinancialTrackerDashboard() {
  const { t } = useLanguage();
  const { businessId, tenantData } = useTenant();
  const currency = tenantData?.app_config?.businessCurrency || 'ARS';
  const fmtMoney = (n) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(n || 0);
  const [orders, setOrders] = useState([]);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : true
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

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

  // Expenses from Supabase
  const [expenses, setExpenses] = useState([]);

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    const fetchExpenses = async () => {
      const { data } = await supabase
        .from('expenses')
        .select('*')
        .eq('business_id', businessId)
        .order('date', { ascending: false });
      if (!cancelled) setExpenses(data || []);
    };
    fetchExpenses();
    return () => { cancelled = true; };
  }, [businessId]);

  // Budgets
  const budgetKey = `fs_budgets_${businessId || 'global'}`;
  const [budgets, setBudgets] = useState(() => {
    try { return JSON.parse(localStorage.getItem(budgetKey)) || {}; } catch { return {}; }
  });
  useEffect(() => {
    localStorage.setItem(budgetKey, JSON.stringify(budgets));
  }, [budgets, budgetKey]);

  // Fetch orders (operational counts), ledger (revenue), and menu items
  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      const [{ data: orderData }, { data: ledgerData }, { data: menuData }] = await Promise.all([
        supabase
          .from('orders')
          .select('total, status, created_at')
          .eq('business_id', businessId)
          .not('status', 'in', '(pending,pending_payment,cancelled,refunded)'),
        supabase
          .from('transaction_ledger')
          .select('amount_gross_cents, processed_at')
          .eq('business_id', businessId)
          .eq('transaction_type', 'payment')
          .eq('status', 'completed'),
        supabase
          .from('menu_items')
          .select('id, available')
          .eq('business_id', businessId),
      ]);
      if (cancelled) return;
      setOrders(orderData || []);
      setLedgerEntries(ledgerData || []);
      setMenuItems(menuData || []);
      setLoading(false);
    };
    fetchData();
  }, [businessId]);

  // Date filter
  const [dateFilter, setDateFilter] = useState('all');
  const [rangeStart, rangeEnd] = getDateRange(dateFilter);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => e.date >= rangeStart && e.date <= rangeEnd);
  }, [expenses, rangeStart, rangeEnd]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const d = o.created_at?.split('T')[0];
      return d >= rangeStart && d <= rangeEnd;
    });
  }, [orders, rangeStart, rangeEnd]);

  const filteredLedger = useMemo(() => {
    return ledgerEntries.filter((l) => {
      const d = l.processed_at?.split('T')[0];
      return d >= rangeStart && d <= rangeEnd;
    });
  }, [ledgerEntries, rangeStart, rangeEnd]);

  const totalRevenue = useMemo(() => filteredLedger.reduce((s, l) => s + (l.amount_gross_cents || 0), 0) / 100, [filteredLedger]);
  const totalExpenses = useMemo(() => filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0), [filteredExpenses]);
  const netProfit = totalRevenue - totalExpenses;
  const activeProducts = menuItems.filter((m) => m.available !== false).length;

  // Charts data
  const pieData = useMemo(() => {
    const map = {};
    filteredExpenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value, color: getCatMeta(name).color }))
      .sort((a, b) => b.value - a.value);
  }, [filteredExpenses]);

  const barData = useMemo(() => {
    const map = {};
    filteredLedger.forEach((l) => {
      const d = l.processed_at?.split('T')[0];
      if (!map[d]) map[d] = { date: d, revenue: 0, expenses: 0 };
      map[d].revenue += (l.amount_gross_cents || 0) / 100;
    });
    filteredExpenses.forEach((e) => {
      if (!map[e.date]) map[e.date] = { date: e.date, revenue: 0, expenses: 0 };
      map[e.date].expenses += e.amount || 0;
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredLedger, filteredExpenses]);

  // Form state
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food & Ingredients');
  const [recurring, setRecurring] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const [calcToast, setCalcToast] = useState(null);
  const [showBudgets, setShowBudgets] = useState(false);

  const addExpense = async () => {
    const amt = parseFloat(amount);
    if (!desc.trim() || isNaN(amt) || amt <= 0) return;
    const { data: userData } = await supabase.auth.getUser();
    const newExpense = {
      business_id: businessId,
      user_id: userData.user?.id,
      category, description: desc, amount: amt, date: todayStr(),
      is_recurring: !!recurring,
    };
    const { data, error } = await supabase.from('expenses').insert(newExpense).select().single();
    if (error) {
      console.error('[Expenses] Insert failed:', error);
      alert('Failed to save expense: ' + error.message);
      return;
    }
    if (data) {
      setExpenses((prev) => [data, ...prev]);
    }
    setDesc('');
    setAmount('');
    setRecurring(false);
    setCalcToast(null);
  };

  const deleteExpense = async (id) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id).eq('business_id', businessId);
    if (error) {
      console.error('[Expenses] Delete failed:', error);
      alert('Failed to delete expense: ' + error.message);
      return;
    }
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const exportCSV = () => {
    const headers = ['Date', 'Category', 'Description', 'Amount', 'Recurring'];
    const rows = filteredExpenses.map((e) => [
      e.date, e.category, e.description, e.amount, e.is_recurring ? 'Yes' : 'No'
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${businessId || 'all'}-${todayStr()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
    <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid #E5E7EB' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
          {t('expenses_label')}
        </h2>
        <button
          onClick={() => setShowCalc(true)}
          style={{
            width: 40, height: 40, borderRadius: 12, background: primaryColor,
            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#FFFFFF',
            boxShadow: '0 0 12px rgba(16,185,129,0.5), 0 2px 8px rgba(16,185,129,0.3)',
            transition: 'all 0.2s ease',
            animation: 'calcFloat 2.5s ease-in-out infinite, calcGlow 2.5s ease-in-out infinite',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08) rotate(3deg)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(16,185,129,0.7), 0 4px 12px rgba(16,185,129,0.4)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1) rotate(0deg)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(16,185,129,0.5), 0 2px 8px rgba(16,185,129,0.3)'; }}
          onTouchStart={(e) => { e.currentTarget.style.transform = 'scale(0.95)'; }}
          onTouchEnd={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; }}
          title="Open calculator"
        >
          <Calculator className="w-5 h-5" />
        </button>
      </div>

      {/* Date Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {[
          { key: 'all', label: t('all_time') },
          { key: 'week', label: t('this_week') },
          { key: 'month', label: t('this_month') },
          { key: 'quarter', label: t('this_quarter') },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setDateFilter(f.key)}
            style={{
              padding: '8px 14px', borderRadius: 20, border: '1px solid #E5E7EB',
              background: dateFilter === f.key ? primaryColor : '#FFFFFF',
              color: dateFilter === f.key ? '#FFFFFF' : '#6B7280',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={{ ...cardStyle, borderLeft: `4px solid ${primaryColor}` }}>
          <span style={labelStyle}>{t('net_profit')}</span>
          <h3 style={{ ...valueStyle, color: netProfit >= 0 ? primaryColor : '#DC2626' }}>
            {fmtMoney(netProfit)}
          </h3>
          <p style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
            {filteredOrders.length} {t('orders_lowercase')}
          </p>
        </div>
        <div style={cardStyle}>
          <span style={labelStyle}>{t('expenses_label')}</span>
          <h3 style={{ ...valueStyle, color: '#DC2626' }}>{fmtMoney(totalExpenses)}</h3>
          <p style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
            {filteredExpenses.length} {t('entries_lowercase')}
          </p>
        </div>
        <div style={cardStyle}>
          <span style={labelStyle}>Products</span>
          <h3 style={valueStyle}>{activeProducts}</h3>
          <p style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
            {menuItems.length} total
          </p>
        </div>
      </div>

      {/* Charts */}
      {filteredExpenses.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 24, marginBottom: 24 }}>
          {/* Pie Chart */}
          <div style={cardStyle}>
            <span style={{ ...labelStyle, marginBottom: 12 }}>Expenses by Category</span>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ReTooltip formatter={(v) => fmtMoney(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 12px', marginTop: 8, justifyContent: 'center' }}>
              {pieData.map((d) => (
                <span key={d.name} style={{ fontSize: 11, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
                  {d.name}
                </span>
              ))}
            </div>
          </div>

          {/* Bar Chart */}
          {barData.length > 0 && (
            <div style={cardStyle}>
              <span style={{ ...labelStyle, marginBottom: 12 }}>Revenue vs Expenses</span>
              <div style={{ width: '100%', height: 220 }}>
                <ResponsiveContainer>
                  <BarChart data={barData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#9CA3AF" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#9CA3AF" tickFormatter={(v) => v >= 1000000 ? `$${(v/1000000).toFixed(1)}M` : v >= 1000 ? `$${(v/1000).toFixed(0)}K` : `$${v}`} width={45} />
                    <ReTooltip formatter={(v) => fmtMoney(v)} />
                    <Bar dataKey="revenue" fill={primaryColor} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" fill="#DC2626" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Budget vs Actual */}
      {filteredExpenses.length > 0 && (
        <div style={cardStyle}>
          <button
            onClick={() => setShowBudgets((v) => !v)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <span style={labelStyle}>Budget vs Actual</span>
            {showBudgets ? <ChevronUp className="w-4 h-4" style={{ color: '#9CA3AF' }} /> : <ChevronDown className="w-4 h-4" style={{ color: '#9CA3AF' }} />}
          </button>
          {showBudgets && (
            <div style={{ marginTop: 8 }}>
              {CATEGORIES.map((cat) => {
                const spent = filteredExpenses
                  .filter((e) => e.category === cat.name)
                  .reduce((s, e) => s + e.amount, 0);
                const budget = budgets[cat.name] || 0;
                const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
                const over = budget > 0 && spent > budget;
                if (spent === 0 && budget === 0) return null;
                return (
                  <div key={cat.name} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color }} /> {cat.name}
                      </span>
                      <span style={{ color: over ? '#DC2626' : '#6B7280', fontWeight: 500 }}>
                        {fmtMoney(spent)} {budget > 0 && <span style={{ color: '#9CA3AF' }}>/ {fmtMoney(budget)}</span>}
                      </span>
                    </div>
                    <div style={{ height: 8, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden', marginBottom: 4 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: over ? '#DC2626' : cat.color, borderRadius: 4, transition: 'width 0.5s' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="number"
                        placeholder="Set budget"
                        value={budgets[cat.name] ?? ''}
                        onChange={(e) => setBudgets((prev) => ({ ...prev, [cat.name]: parseFloat(e.target.value) || 0 }))}
                        style={{ width: 100, padding: '4px 8px', borderRadius: 6, border: '1px solid #E5E7EB', fontSize: 11, outline: 'none' }}
                      />
                      {over && <span style={{ fontSize: 11, color: '#DC2626', fontWeight: 600 }}>Over budget!</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Revenue Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24, marginBottom: 24, marginTop: 24 }}>
        <div style={cardStyle}>
          <span style={{ ...labelStyle, marginBottom: 16 }}>{t('revenue_breakdown')}</span>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F3F4F6' }}>
            <span style={{ fontSize: 14, color: '#6B7280' }}>{t('total_revenue')}</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: primaryColor }}>{fmtMoney(totalRevenue)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F3F4F6' }}>
            <span style={{ fontSize: 14, color: '#6B7280' }}>{t('total_expense')}</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#DC2626' }}>-{fmtMoney(totalExpenses)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0 0' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{t('net_profit')}</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: netProfit >= 0 ? primaryColor : '#DC2626' }}>
              {fmtMoney(netProfit)}
            </span>
          </div>
          <div style={{ height: 6, width: '100%', background: '#F3F4F6', borderRadius: 3, marginTop: 12, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: totalRevenue > 0 && (totalExpenses / totalRevenue) > 1 ? '#DC2626' : primaryColor, borderRadius: 3, width: `${Math.min(totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0, 100)}%`, transition: 'width 0.5s ease' }} />
          </div>
        </div>

      </div>

      {/* Quick Add Form + Toast — side by side with recent activity on desktop */}
      <div style={{ display: isMobile ? 'block' : 'grid', gridTemplateColumns: isMobile ? undefined : '1fr 1fr', gap: isMobile ? undefined : 24, marginBottom: 24 }}>

      {/* Left: Quick Add */}
      <div>
        {calcToast && (
          <div style={{ ...cardStyle, marginBottom: 12, background: '#ECFDF5', border: `1px solid ${primaryColor}`, display: 'flex', alignItems: 'center', gap: 10, animation: 'slideDown 0.3s ease' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>✓</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#065F46' }}>{calcToast}</p>
              <p style={{ margin: 0, fontSize: 11, color: '#6B7280' }}>Review & add below</p>
            </div>
            <button onClick={() => setCalcToast(null)} style={{ padding: 4, background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 6, color: '#065F46', flexShrink: 0 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        )}

      {/* Quick Add Form */}
      <div id="expense-form" style={cardStyle}>
        <span style={{ ...labelStyle, marginBottom: 16 }}>{t('quick_expense')}</span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <input
              type="text"
              placeholder="Description"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 14, outline: 'none', background: '#F9FAFB', boxSizing: 'border-box' }}
            />
          </div>
          <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ padding: '12px 16px', borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 14, outline: 'none', background: '#F9FAFB', boxSizing: 'border-box', width: '100%' }}
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ padding: '12px 16px', borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 14, outline: 'none', background: '#F9FAFB', boxSizing: 'border-box', width: '100%' }}
          >
            {CATEGORIES.map((c) => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
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
            {t('add_transaction')}
          </button>
        </div>
      </div>
      </div> {/* end left col */}

      {/* Right: Recent Activity (desktop only — on mobile it's already in Revenue Breakdown grid above) */}
      {!isMobile && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={labelStyle}>{t('recent_activity')}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>{filteredExpenses.length} expenses</span>
              <button
                onClick={exportCSV}
                style={{ padding: 6, background: '#F3F4F6', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#6B7280', display: 'flex', alignItems: 'center' }}
                title="Export CSV"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
          {filteredExpenses.length === 0 ? (
            <p style={{ color: '#9CA3AF', fontSize: 14, textAlign: 'center', padding: 20 }}>
              No expenses for this period. Add one below.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto' }}>
              {filteredExpenses.map((expense) => {
                const meta = getCatMeta(expense.category);
                return (
                  <div key={expense.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, background: '#F9FAFB', borderRadius: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, background: meta.color + '15', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14, fontWeight: 700, color: meta.color }}>
                        {meta.name?.[0] || '?'}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{expense.description}</p>
                        <p style={{ fontSize: 12, color: '#6B7280', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ color: meta.color, fontWeight: 600 }}>{expense.category}</span>
                          <span>•</span>
                          <span>{expense.date}</span>
                          {expense.is_recurring && <span title="Recurring monthly"><Repeat className="w-3 h-3" style={{ color: primaryColor }} /></span>}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
                        -{fmtMoney(expense.amount || 0)}
                      </span>
                      <button
                        onClick={() => deleteExpense(expense.id)}
                        style={{ padding: 6, background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 8, color: '#9CA3AF' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#DC2626'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#9CA3AF'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      </div> {/* end desktop 2-col quick-add row */}

      <style>{`
        @keyframes calcGlow {
          0%, 100% { box-shadow: 0 0 12px rgba(16,185,129,0.5), 0 2px 8px rgba(16,185,129,0.3); }
          50% { box-shadow: 0 0 20px rgba(16,185,129,0.8), 0 4px 12px rgba(16,185,129,0.4); }
        }
        @keyframes calcFloat {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-6px) scale(1.05); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Calculator Modal */}
      {showCalc && (
        <CalculatorModal
          onClose={() => setShowCalc(false)}
          onUseResult={(val) => {
            const clean = String(parseFloat(val) || 0);
            setAmount(clean);
            setCalcToast(`$${clean} added to expense form`);
            setTimeout(() => document.getElementById('expense-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
          }}
          primaryColor={primaryColor}
          cardStyle={cardStyle}
        />
      )}
    </div>
  );
}

function CalculatorModal({ onClose, onUseResult, primaryColor, cardStyle }) {
  const [display, setDisplay] = useState('0');
  const [prev, setPrev] = useState(null);
  const [op, setOp] = useState(null);
  const [newNum, setNewNum] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const HISTORY_KEY = 'fs_calc_history';
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch { return []; }
  });

  useEffect(() => {
    const originalBody = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = originalBody; };
  }, []);

  const inputNum = (n) => {
    if (newNum) { setDisplay(String(n)); setNewNum(false); }
    else { setDisplay(display === '0' ? String(n) : display + n); }
  };
  const inputOp = (o) => { setOp(o); setPrev(parseFloat(display)); setNewNum(true); };
  const inputPercent = () => {
    const val = parseFloat(display);
    if (isNaN(val)) return;
    setDisplay(String(Math.round((val / 100) * 100000000) / 100000000));
    setNewNum(true);
  };
  const inputDot = () => {
    if (newNum) { setDisplay('0.'); setNewNum(false); }
    else if (!display.includes('.')) { setDisplay(display + '.'); }
  };
  const backspace = () => setDisplay(display.length > 1 ? display.slice(0, -1) : '0');
  const clear = () => { setDisplay('0'); setPrev(null); setOp(null); setNewNum(true); };

  const saveHistory = (result) => {
    const entry = { result, time: Date.now() };
    const next = [entry, ...history].slice(0, 5);
    setHistory(next);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch {}
  };

  const calc = () => {
    if (op === null || prev === null) return;
    const curr = parseFloat(display);
    if (isNaN(curr)) return;
    let res = 0;
    switch (op) {
      case '+': res = prev + curr; break;
      case '-': res = prev - curr; break;
      case '*': res = prev * curr; break;
      case '/': res = curr !== 0 ? prev / curr : 0; break;
    }
    const formatted = String(Math.round(res * 100000000) / 100000000);
    setDisplay(formatted);
    setPrev(null);
    setOp(null);
    setNewNum(true);
    saveHistory(formatted);
  };

  const copyDisplay = async () => {
    try { await navigator.clipboard.writeText(display); } catch {
      const ta = document.createElement('textarea');
      ta.value = display;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const baseBtn = { padding: '18px 0', borderRadius: 14, border: 'none', fontSize: 20, fontWeight: 700, cursor: 'pointer', transition: 'transform 0.08s, opacity 0.08s', WebkitTapHighlightColor: 'transparent', userSelect: 'none', WebkitUserSelect: 'none', pointerEvents: 'auto' };
  const numBtn = { ...baseBtn, background: '#F9FAFB', color: '#111827' };
  const accentBtn = { ...baseBtn, background: primaryColor, color: '#FFFFFF' };
  const opBtn = (active) => ({ ...baseBtn, background: active ? '#DBEAFE' : '#F3F4F6', color: active ? '#2563EB' : '#6B7280' });

  const press = (fn) => (e) => { e.stopPropagation(); fn(); };
  const down = (e) => { e.currentTarget.style.transform = 'scale(0.93)'; e.currentTarget.style.opacity = '0.8'; };
  const up = (e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.opacity = '1'; };

  const Btn = ({ s, children, w, onPress }) => (
    <button onClick={onPress} style={{ ...s, gridColumn: w ? 'span 2' : undefined }} onMouseDown={down} onMouseUp={up} onMouseLeave={up} onTouchStart={down} onTouchEnd={up}>
      {children}
    </button>
  );

  const modalContent = (
    <div
      className="calculator-modal-backdrop"
      style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 2147483647, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, pointerEvents: 'auto' }}
      onClick={onClose}
    >
      <div style={{ ...cardStyle, width: '100%', maxWidth: 360, padding: 20, pointerEvents: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>Calculator</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button onClick={press(() => setShowHistory((v) => !v))} style={{ padding: 8, background: showHistory ? '#E5E7EB' : 'transparent', border: 'none', cursor: 'pointer', borderRadius: 8, color: showHistory ? '#111827' : '#9CA3AF', pointerEvents: 'auto' }} title="History">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </button>
            <button onClick={press(onClose)} style={{ padding: 8, background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 8, color: '#9CA3AF', pointerEvents: 'auto' }}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {showHistory && (
          <div style={{ marginBottom: 12, background: '#F9FAFB', borderRadius: 12, padding: '8px 12px', maxHeight: 140, overflowY: 'auto' }}>
            {history.length === 0 ? (
              <p style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', margin: '8px 0' }}>No history yet</p>
            ) : (
              history.map((h, i) => (
                <button key={i} onClick={press(() => { setDisplay(h.result); setNewNum(true); setShowHistory(false); })} style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '8px 4px', background: 'transparent', border: 'none', borderBottom: i < history.length - 1 ? '1px solid #E5E7EB' : 'none', cursor: 'pointer', fontSize: 14, color: '#111827', pointerEvents: 'auto' }}>
                  <span style={{ color: '#9CA3AF', fontSize: 12 }}>{new Date(h.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span style={{ fontWeight: 700 }}>{h.result}</span>
                </button>
              ))
            )}
          </div>
        )}

        <div onClick={press(copyDisplay)} style={{ background: '#111827', borderRadius: 16, padding: '20px 16px', textAlign: 'right', marginBottom: 16, minHeight: 72, display: 'flex', flexDirection: 'column', justifyContent: 'center', cursor: 'pointer', position: 'relative', pointerEvents: 'auto' }} title="Tap to copy">
          <div style={{ fontSize: 12, color: '#6B7280', minHeight: 18 }}>{prev !== null ? `${prev} ${op || ''}` : ''}</div>
          <div style={{ fontSize: 36, fontWeight: 700, color: '#FFFFFF', wordBreak: 'break-all', lineHeight: 1.2 }}>{display}</div>
          {copied && <div style={{ position: 'absolute', top: 8, left: 12, fontSize: 11, fontWeight: 600, color: primaryColor, background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 6 }}>Copied!</div>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          <Btn s={accentBtn} onPress={press(clear)}>C</Btn>
          <Btn s={numBtn} onPress={press(backspace)}>⌫</Btn>
          <Btn s={numBtn} style={{ opacity: 0.3, pointerEvents: 'none' }}></Btn>
          <Btn s={opBtn(op === '/' && prev !== null)} onPress={press(() => inputOp('/'))}>÷</Btn>

          {[7,8,9].map(n => <Btn key={n} s={numBtn} onPress={press(() => inputNum(n))}>{n}</Btn>)}
          <Btn s={opBtn(op === '*' && prev !== null)} onPress={press(() => inputOp('*'))}>×</Btn>

          {[4,5,6].map(n => <Btn key={n} s={numBtn} onPress={press(() => inputNum(n))}>{n}</Btn>)}
          <Btn s={opBtn(op === '-' && prev !== null)} onPress={press(() => inputOp('-'))}>-</Btn>

          {[1,2,3].map(n => <Btn key={n} s={numBtn} onPress={press(() => inputNum(n))}>{n}</Btn>)}
          <Btn s={opBtn(op === '+' && prev !== null)} onPress={press(() => inputOp('+'))}>+</Btn>

          <Btn s={numBtn} w onPress={press(() => inputNum(0))}>0</Btn>
          <Btn s={numBtn} onPress={press(inputDot)}>.</Btn>
          <Btn s={accentBtn} onPress={press(calc)}>=</Btn>
        </div>

        {onUseResult && (
          <button onClick={press(() => { onUseResult(display); onClose(); })} style={{ width: '100%', marginTop: 14, padding: '12px', background: primaryColor, color: '#FFFFFF', borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 2px 8px rgba(16,185,129,0.3)', pointerEvents: 'auto' }} onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)'; }} onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
            Use ${display} as Expense
          </button>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
