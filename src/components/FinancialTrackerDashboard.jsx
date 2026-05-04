import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Plus, Calendar, DollarSign, TrendingUp, Package, Calculator, X } from 'lucide-react';
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
  const [showCalc, setShowCalc] = useState(false);
  const [calcToast, setCalcToast] = useState(null);

  const addExpense = () => {
    const amt = parseFloat(amount);
    if (!desc.trim() || isNaN(amt) || amt <= 0) return;
    setExpenses((prev) => [
      { id: crypto.randomUUID?.() || String(Date.now()), category, description: desc, amount: amt, date: todayStr() },
      ...prev,
    ]);
    setDesc('');
    setAmount('');
    setCalcToast(null);
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
          Financial Tracker
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

      {/* Toast from calculator */}
      {calcToast && (
        <div style={{ ...cardStyle, marginBottom: 12, background: '#ECFDF5', border: `1px solid ${primaryColor}`, display: 'flex', alignItems: 'center', gap: 10, animation: 'slideDown 0.3s ease' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>✓</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#065F46' }}>{calcToast}</p>
            <p style={{ margin: 0, fontSize: 11, color: '#6B7280' }}>Review & add below</p>
          </div>
          <button
            onClick={() => setCalcToast(null)}
            style={{ padding: 4, background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 6, color: '#065F46', flexShrink: 0 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      )}

      {/* Quick Add Form */}
      <div id="expense-form" style={cardStyle}>
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

      {/* Calculator Modal — rendered via portal to avoid scroll container bugs */}
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

  // Lock scroll
  useEffect(() => {
    const originalBody = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalBody;
    };
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
    try {
      await navigator.clipboard.writeText(display);
    } catch {
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
    <button
      onClick={onPress}
      style={{ ...s, gridColumn: w ? 'span 2' : undefined }}
      onMouseDown={down} onMouseUp={up} onMouseLeave={up} onTouchStart={down} onTouchEnd={up}
    >{children}</button>
  );

  const modalContent = (
    <div
      className="calculator-modal-backdrop"
      style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 2147483647, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, pointerEvents: 'auto' }}
      onClick={onClose}
    >
      <div style={{ ...cardStyle, width: '100%', maxWidth: 360, padding: 20, pointerEvents: 'auto' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>Calculator</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              onClick={press(() => setShowHistory((v) => !v))}
              style={{ padding: 8, background: showHistory ? '#E5E7EB' : 'transparent', border: 'none', cursor: 'pointer', borderRadius: 8, color: showHistory ? '#111827' : '#9CA3AF', pointerEvents: 'auto' }}
              title="History"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </button>
            <button onClick={press(onClose)} style={{ padding: 8, background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 8, color: '#9CA3AF', pointerEvents: 'auto' }}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* History panel */}
        {showHistory && (
          <div style={{ marginBottom: 12, background: '#F9FAFB', borderRadius: 12, padding: '8px 12px', maxHeight: 140, overflowY: 'auto' }}>
            {history.length === 0 ? (
              <p style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', margin: '8px 0' }}>No history yet</p>
            ) : (
              history.map((h, i) => (
                <button
                  key={i}
                  onClick={press(() => { setDisplay(h.result); setNewNum(true); setShowHistory(false); })}
                  style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '8px 4px', background: 'transparent', border: 'none', borderBottom: i < history.length - 1 ? '1px solid #E5E7EB' : 'none', cursor: 'pointer', fontSize: 14, color: '#111827', pointerEvents: 'auto' }}
                >
                  <span style={{ color: '#9CA3AF', fontSize: 12 }}>{new Date(h.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span style={{ fontWeight: 700 }}>{h.result}</span>
                </button>
              ))
            )}
          </div>
        )}

        {/* Display */}
        <div
          onClick={press(copyDisplay)}
          style={{ background: '#111827', borderRadius: 16, padding: '20px 16px', textAlign: 'right', marginBottom: 16, minHeight: 72, display: 'flex', flexDirection: 'column', justifyContent: 'center', cursor: 'pointer', position: 'relative', pointerEvents: 'auto' }}
          title="Tap to copy"
        >
          <div style={{ fontSize: 12, color: '#6B7280', minHeight: 18 }}>{prev !== null ? `${prev} ${op || ''}` : ''}</div>
          <div style={{ fontSize: 36, fontWeight: 700, color: '#FFFFFF', wordBreak: 'break-all', lineHeight: 1.2 }}>{display}</div>
          {copied && (
            <div style={{ position: 'absolute', top: 8, left: 12, fontSize: 11, fontWeight: 600, color: primaryColor, background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 6 }}>
              Copied!
            </div>
          )}
        </div>

        {/* Keypad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          <Btn s={accentBtn} onPress={press(clear)}>C</Btn>
          <Btn s={opBtn(false)} onPress={press(inputPercent)}>%</Btn>
          <Btn s={numBtn} onPress={press(backspace)}>⌫</Btn>
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

        {/* Quick Expense Drop */}
        {onUseResult && (
          <button
            onClick={press(() => { onUseResult(display); onClose(); })}
            style={{
              width: '100%', marginTop: 14, padding: '12px', background: primaryColor, color: '#FFFFFF',
              borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 2px 8px rgba(16,185,129,0.3)', pointerEvents: 'auto'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
            Use ${display} as Expense
          </button>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
