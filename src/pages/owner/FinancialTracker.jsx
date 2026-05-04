import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTenant } from '../../contexts/TenantContext';
import { supabase } from '../../lib/supabaseClient';

export default function FinancialTracker() {
  const { lang } = useLanguage();
  const { businessId } = useTenant();
  const [expenses, setExpenses] = useState([
    { id: '1', category: 'Software', description: 'AWS Hosting Monthly', amount: 450.00, date: '2024-05-01' },
    { id: '2', category: 'Marketing', description: 'Q3 Ad Campaign', amount: 800.00, date: '2024-05-02' },
  ]);
  const [products, setProducts] = useState([
    { id: '1', name: 'Premium Widget', category: 'Hardware', price: 99.99, active: true },
    { id: '2', name: 'Basic Subscription', category: 'Software', price: 19.99, active: false },
  ]);

  useEffect(() => {
    if (!businessId) return;
    fetchExpenses();
    fetchProducts();
  }, [businessId]);

  const fetchExpenses = async () => {
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (data) setExpenses(data);
  };

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (data) setProducts(data);
  };

  const handleDeleteExpense = (id) => {
    setExpenses(expenses.filter(e => e.id !== id));
    supabase.from('expenses').delete().eq('id', id).eq('business_id', businessId).then(() => fetchExpenses());
  };

  const toggleProductActive = (id) => {
    const product = products.find(p => p.id === id);
    if (product) {
      supabase
        .from('products')
        .update({ is_active: !product.active })
        .eq('id', id)
        .eq('business_id', businessId)
        .then(() => fetchProducts());
    }
    setProducts(products.map(p => p.id === id ? { ...p, active: !p.active } : p));
  };

  const totalRevenue = products.filter(p => p.active).reduce((sum, p) => sum + p.price, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="w-full min-h-screen bg-surface p-6 md:p-8">
      {/* Hero Section (Bento KPI Grid) */}
      <section className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-5 mb-8">
        <div
          className="md:col-span-2 md:row-span-2 bg-gradient-to-br from-primary/10 to-primary/5 border border-outline-variant rounded-3xl p-8 flex flex-col justify-between"
        >
          <div className="space-y-4">
            <p className="text-xs font-bold text-outline tracking-widest uppercase">Net Profit</p>
            <h3 className="text-5xl font-bold text-on-surface tracking-tighter leading-tight font-mono">
              ${Math.max(0, totalRevenue - totalExpenses).toFixed(2)}
            </h3>
            <div className="inline-flex items-center px-2 py-1 bg-secondary-container/20 text-secondary rounded-full text-xs font-bold">
              ↑ +12.4% this month
            </div>
          </div>
          <div className="mt-8 flex items-center justify-between">
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-8 h-8 rounded-full bg-outline-variant border-2 border-surface" />
              ))}
            </div>
            <div className="text-xs font-medium text-on-surface-variant">
              Calculated from {products.length} products
            </div>
          </div>
        </div>

        <div className="bg-surface-container border border-outline-variant rounded-3xl p-6 flex flex-col justify-between">
          <p className="text-xs font-bold text-outline tracking-widest uppercase">Expenses</p>
          <div>
            <p className="text-2xl font-bold text-on-surface tracking-tight font-mono">${totalExpenses.toFixed(2)}</p>
            <div className="h-1 w-full bg-outline-variant rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-error w-3/4 rounded-full" />
            </div>
          </div>
        </div>

        <div className="bg-surface-container border border-outline-variant rounded-3xl p-6 flex flex-col justify-between">
          <p className="text-xs font-bold text-outline tracking-widest uppercase">Products</p>
          <div>
            <p className="text-2xl font-bold text-on-surface tracking-tight">{products.filter(p => p.active).length}</p>
            <p className="text-xs text-on-surface-variant mt-1">↑ Active</p>
          </div>
        </div>

        <div className="md:col-span-2 bg-on-surface text-surface border border-transparent rounded-3xl p-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-outline tracking-widest uppercase text-surface/60">Next Payout</p>
            <p className="text-2xl font-bold tracking-tight mt-1">Friday, May 8</p>
          </div>
          <div className="w-12 h-12 bg-surface/10 rounded-2xl flex items-center justify-center">
            📅
          </div>
        </div>
      </section>

      {/* Quick Add Form Section */}
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
        <div className="space-y-6">
          <div className="flex items-end justify-between border-b border-outline-variant pb-2">
            <h3 className="text-xl font-bold text-on-surface">Recent Activity</h3>
            <button className="text-xs font-bold text-primary hover:underline uppercase tracking-wider">View All</button>
          </div>

          <div className="bg-surface-container border border-outline-variant rounded-3xl overflow-hidden">
            <div className="divide-y divide-outline-variant">
              {expenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between p-4 hover:bg-surface-container-low transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-surface-container-low rounded-xl flex items-center justify-center text-on-surface-variant">
                      💰
                    </div>
                    <div>
                      <p className="text-sm font-bold text-on-surface">{expense.description}</p>
                      <p className="text-xs text-on-surface-variant">{expense.category} • {expense.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-on-surface">-${expense.amount.toFixed(2)}</p>
                    <button
                      onClick={() => handleDeleteExpense(expense.id)}
                      className="opacity-0 group-hover:opacity-100 text-error text-lg transition-all"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface-container border border-outline-variant rounded-3xl p-6">
            <h4 className="text-sm font-bold text-on-surface mb-4">Quick Expense Add</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <input
                  type="text"
                  placeholder="Description"
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 text-sm focus:border-primary outline-none transition-colors"
                />
              </div>
              <input
                type="text"
                placeholder="Amount"
                className="bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 text-sm focus:border-primary outline-none transition-colors"
              />
              <select className="bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 text-sm focus:border-primary outline-none transition-colors appearance-none">
                <option>Operations</option>
                <option>Software</option>
                <option>Marketing</option>
              </select>
              <button className="col-span-2 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-all active:scale-[0.98]">
                Add Transaction
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-end justify-between border-b border-outline-variant pb-2">
            <h3 className="text-xl font-bold text-on-surface">Managed Products</h3>
          </div>
          <div className="space-y-4">
            {products.map((product) => (
              <div key={product.id} className="bg-surface-container border border-outline-variant rounded-3xl p-5 flex items-center justify-between group hover:border-outline transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg ${product.active ? 'bg-primary/20' : 'bg-outline-variant/30'}`}>
                    📦
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface">{product.name}</p>
                    <p className="text-xs text-on-surface-variant font-mono">${product.price}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleProductActive(product.id)}
                    className={`w-10 h-6 rounded-full relative transition-colors ${product.active ? 'bg-primary' : 'bg-outline-variant'}`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                        product.active ? 'translate-x-4' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <button
                    className="opacity-0 group-hover:opacity-100 text-error text-lg transition-all"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
