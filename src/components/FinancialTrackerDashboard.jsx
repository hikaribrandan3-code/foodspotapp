import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowUpRight,
  ArrowDownRight,
  Package,
  Trash2,
  Plus,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  BarChart3,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient.js';
import { useTenant } from '../contexts/TenantContext.jsx';

// --- Utils ---
const fmtMoney = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

const todayStr = () => new Date().toISOString().split('T')[0];

// --- Components ---

const StatCard = ({ title, value, delta, icon: Icon, large, dark }) => (
  <div
    className={`flex flex-col gap-2 border border-outline-variant rounded-3xl p-6 ${
      dark
        ? 'bg-on-surface text-surface'
        : large
        ? 'bg-gradient-to-br from-surface-container to-primary-container/10 md:col-span-2 md:row-span-2'
        : 'bg-surface-container'
    }`}
  >
    <p
      className={`text-xs font-bold uppercase tracking-widest ${
        dark ? 'text-surface/60' : 'text-outline'
      }`}
    >
      {title}
    </p>
    <div className="flex items-center justify-between flex-1">
      <div>
        <p
          className={`font-bold tracking-tight font-heading ${
            large ? 'text-5xl leading-tight' : 'text-2xl'
          }`}
        >
          {value}
        </p>
        {delta && (
          <div
            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold mt-2 ${
              delta.type === 'positive'
                ? 'bg-secondary-container/20 text-secondary'
                : 'bg-error-container/40 text-error'
            }`}
          >
            {delta.type === 'positive' ? (
              <ArrowDownRight className="w-3 h-3 mr-1" />
            ) : (
              <ArrowUpRight className="w-3 h-3 mr-1" />
            )}
            {delta.value}
          </div>
        )}
      </div>
      {Icon && (
        <div
          className={`p-3 rounded-2xl flex-shrink-0 ${
            dark ? 'bg-surface/10' : 'bg-surface-container-low'
          }`}
        >
          <Icon className={`w-6 h-6 ${dark ? 'text-surface' : 'text-outline'}`} />
        </div>
      )}
    </div>
    {large && (
      <div className="flex items-center justify-between mt-4">
        <div className="flex -space-x-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-8 h-8 rounded-full bg-outline-variant border-2 border-surface"
            />
          ))}
        </div>
        <p className="text-xs font-medium text-on-surface-variant">
          Calculated from live orders
        </p>
      </div>
    )}
  </div>
);

export default function FinancialTrackerDashboard() {
  const { businessId } = useTenant();
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Expenses stored in localStorage per business
  const storageKey = `fs_expenses_${businessId || 'global'}`;
  const [expenses, setExpenses] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey)) || [
        { id: '1', category: 'Operations', description: 'Sample Expense', amount: 120, date: todayStr() },
      ];
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

  // Derived metrics
  const totalRevenue = useMemo(
    () => orders.reduce((s, o) => s + (o.total || 0), 0),
    [orders]
  );
  const totalExpenses = useMemo(
    () => expenses.reduce((s, e) => s + (e.amount || 0), 0),
    [expenses]
  );
  const netProfit = totalRevenue - totalExpenses;
  const activeProducts = menuItems.filter((m) => m.active !== false).length;

  // Form state
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

  // Next payout = upcoming Friday
  const nextPayout = useMemo(() => {
    const d = new Date();
    const daysUntilFri = (5 - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + daysUntilFri);
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Bento KPI Grid */}
      <section className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <StatCard
            title="Net Profit"
            value={fmtMoney(netProfit)}
            delta={{ value: `${((totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0)).toFixed(1)}% margin`, type: netProfit >= 0 ? 'positive' : 'negative' }}
            large
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <StatCard
            title="Expenses"
            value={fmtMoney(totalExpenses)}
            delta={{ value: `${expenses.length} entries`, type: 'negative' }}
            icon={TrendingUp}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <StatCard
            title="Products"
            value={activeProducts}
            delta={{ value: `${menuItems.length} total`, type: 'positive' }}
            icon={Package}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="md:col-span-2"
        >
          <StatCard
            title="Next Payout"
            value={nextPayout}
            icon={Calendar}
            dark
          />
        </motion.div>
      </section>

      {/* Recent Activity + Quick Add + Products */}
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
        <div className="space-y-6">
          {/* Recent Activity */}
          <div>
            <div className="flex items-end justify-between border-b border-outline-variant pb-2 mb-4">
              <h3 className="text-xl font-bold text-on-surface font-heading">Recent Activity</h3>
            </div>
            <div className="bg-surface-container border border-outline-variant rounded-3xl overflow-hidden divide-y divide-outline-variant">
              <AnimatePresence>
                {expenses.length === 0 ? (
                  <div className="p-6 text-center text-sm text-on-surface-variant">
                    No expenses yet. Add one below.
                  </div>
                ) : (
                  expenses.map((expense) => (
                    <motion.div
                      key={expense.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center justify-between p-4 hover:bg-surface-container-low transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-surface-container-low rounded-xl flex items-center justify-center text-on-surface-variant">
                          <DollarSign className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-on-surface">{expense.description}</p>
                          <p className="text-xs text-on-surface-variant">
                            {expense.category} • {expense.date}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-bold text-on-surface">
                          -${expense.amount.toFixed(2)}
                        </p>
                        <button
                          onClick={() => deleteExpense(expense.id)}
                          className="p-1.5 hover:bg-error-container/40 rounded-lg text-error transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Quick Add Form */}
          <div className="bg-surface-container border border-outline-variant rounded-3xl p-6">
            <h4 className="text-sm font-bold text-on-surface mb-4">Quick Expense Add</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <input
                  type="text"
                  placeholder="Description"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 text-sm focus:border-primary outline-none transition-colors"
                />
              </div>
              <input
                type="number"
                placeholder="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 text-sm focus:border-primary outline-none transition-colors"
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 text-sm focus:border-primary outline-none transition-colors appearance-none"
              >
                <option>Operations</option>
                <option>Software</option>
                <option>Marketing</option>
                <option>Rent</option>
                <option>Supplies</option>
              </select>
              <button
                onClick={addExpense}
                className="col-span-2 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-container hover:text-primary transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Transaction
              </button>
            </div>
          </div>
        </div>

        {/* Revenue Breakdown Card */}
        <div className="space-y-6">
          <div className="flex items-end justify-between border-b border-outline-variant pb-2">
            <h3 className="text-xl font-bold text-on-surface font-heading">Revenue</h3>
          </div>
          <div className="bg-surface-container border border-outline-variant rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-on-surface-variant">Total Revenue</span>
              <span className="text-lg font-bold text-on-surface font-heading">{fmtMoney(totalRevenue)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-on-surface-variant">Total Expenses</span>
              <span className="text-lg font-bold text-error font-heading">-{fmtMoney(totalExpenses)}</span>
            </div>
            <div className="h-px bg-outline-variant" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-on-surface">Net Profit</span>
              <span className={`text-xl font-bold font-heading ${netProfit >= 0 ? 'text-secondary' : 'text-error'}`}>
                {fmtMoney(netProfit)}
              </span>
            </div>
            <div className="h-1.5 w-full bg-outline-variant rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${Math.min((totalRevenue > 0 ? (totalExpenses / totalRevenue) : 0) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-on-surface-variant">
              {orders.length} orders processed
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
