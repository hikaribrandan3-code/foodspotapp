import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTenant } from '../../contexts/TenantContext';
import { supabase } from '../../lib/supabaseClient';

export default function FinancialTracker() {
  const { lang } = useLanguage();
  const { businessId } = useTenant();
  const [expenses, setExpenses] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Operations');

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

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!expenseAmount || !expenseDesc || !businessId) return;

    setLoading(true);
    await supabase.from('expenses').insert([{
      business_id: businessId,
      category: expenseCategory,
      description: expenseDesc,
      amount: Math.round(parseFloat(expenseAmount) * 100),
      date: new Date().toISOString().split('T')[0],
      is_recurring: false,
    }]);

    setExpenseDesc('');
    setExpenseAmount('');
    setExpenseCategory('Operations');
    fetchExpenses();
    setLoading(false);
  };

  const deleteExpense = async (id) => {
    await supabase.from('expenses').delete().eq('id', id).eq('business_id', businessId);
    fetchExpenses();
  };

  const toggleProduct = async (id) => {
    const product = products.find(p => p.id === id);
    if (!product || !businessId) return;

    await supabase
      .from('products')
      .update({ is_active: !product.is_active })
      .eq('id', id)
      .eq('business_id', businessId);
    fetchProducts();
  };

  const deleteProduct = async (id) => {
    await supabase.from('products').delete().eq('id', id).eq('business_id', businessId);
    fetchProducts();
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0) / 100;
  const totalProductRevenue = products.filter(p => p.is_active).reduce((sum, p) => sum + (p.price || 0), 0) / 100;
  const netProfit = Math.max(0, totalProductRevenue - totalExpenses);

  return (
    <div className="w-full bg-surface space-y-8 py-8">
      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Net Profit - Large Card */}
        <div className="md:col-span-2 md:row-span-2 bg-gradient-to-br from-primary/10 to-primary/5 border border-outline-variant rounded-3xl p-8 flex flex-col justify-between">
          <div className="space-y-4">
            <p className="text-xs font-bold text-outline uppercase tracking-widest">Net Profit</p>
            <h3 className="text-5xl font-bold text-on-surface tracking-tighter">${netProfit.toFixed(2)}</h3>
            <div className="inline-flex items-center px-2 py-1 bg-secondary-container/20 text-secondary rounded-full text-xs font-bold">
              ↑ {((netProfit / (totalProductRevenue || 1)) * 100).toFixed(1)}% health
            </div>
          </div>
        </div>

        {/* Expenses Card */}
        <div className="bg-surface-container border border-outline-variant rounded-3xl p-6 flex flex-col justify-between">
          <p className="text-xs font-bold text-outline uppercase tracking-widest">Expenses</p>
          <div>
            <p className="text-2xl font-bold text-on-surface tracking-tight font-data">${totalExpenses.toFixed(2)}</p>
            <div className="h-1 w-full bg-outline-variant rounded-full mt-3 overflow-hidden">
              <div className="h-full bg-error w-1/2 rounded-full" />
            </div>
          </div>
        </div>

        {/* Products Card */}
        <div className="bg-surface-container border border-outline-variant rounded-3xl p-6 flex flex-col justify-between">
          <p className="text-xs font-bold text-outline uppercase tracking-widest">Products</p>
          <div>
            <p className="text-2xl font-bold text-on-surface tracking-tight">{products.filter(p => p.is_active).length}</p>
            <p className="text-xs text-on-surface-variant mt-1">Active</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
        {/* Left: Recent Activity + Quick Add */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-outline-variant pb-3">
            <h3 className="text-xl font-bold text-on-surface">Recent Activity</h3>
            <button className="text-xs font-bold text-primary uppercase tracking-wider hover:underline">View All</button>
          </div>

          {/* Expenses List */}
          <div className="bg-surface-container border border-outline-variant rounded-3xl overflow-hidden">
            {expenses.length === 0 ? (
              <p className="text-on-surface-variant text-sm p-6 text-center">No expenses yet</p>
            ) : (
              <div className="divide-y divide-outline-variant">
                {expenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between p-4 hover:bg-surface-container-low transition-colors group">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 bg-surface-container-low rounded-xl flex items-center justify-center text-error">
                        💰
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-on-surface truncate">{expense.description}</p>
                        <p className="text-xs text-on-surface-variant">{expense.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-bold text-on-surface font-data">-${(expense.amount / 100).toFixed(2)}</p>
                      <button
                        onClick={() => deleteExpense(expense.id)}
                        className="opacity-0 group-hover:opacity-100 text-error hover:text-error/80 transition-all p-1"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Expense Add */}
          <form onSubmit={handleAddExpense} className="bg-surface-container border border-outline-variant rounded-3xl p-6 space-y-4">
            <h4 className="text-sm font-bold text-on-surface">Quick Expense Add</h4>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Description"
                value={expenseDesc}
                onChange={(e) => setExpenseDesc(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 text-sm focus:border-primary outline-none transition-colors"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 text-sm focus:border-primary outline-none transition-colors"
                />
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  className="bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 text-sm focus:border-primary outline-none transition-colors"
                >
                  <option>Operations</option>
                  <option>Marketing</option>
                  <option>Payroll</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                Add Expense
              </button>
            </div>
          </form>
        </div>

        {/* Right: Products */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-outline-variant pb-3">
            <h3 className="text-xl font-bold text-on-surface">Products</h3>
          </div>
          <div className="space-y-3">
            {products.length === 0 ? (
              <p className="text-on-surface-variant text-sm p-6 text-center bg-surface-container rounded-2xl">No products</p>
            ) : (
              products.map((product) => (
                <div key={product.id} className="bg-surface-container border border-outline-variant rounded-3xl p-5 flex items-center justify-between group hover:border-outline transition-colors">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${product.is_active ? 'bg-primary/20 text-primary' : 'bg-outline-variant/30 text-outline'}`}>
                      📦
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-on-surface truncate">{product.name}</p>
                      <p className="text-xs text-on-surface-variant font-data">${(product.price / 100).toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleProduct(product.id)}
                      className={`w-10 h-6 rounded-full relative transition-all ${product.is_active ? 'bg-primary' : 'bg-outline-variant'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${product.is_active ? 'translate-x-4' : 'translate-x-1'}`} />
                    </button>
                    <button
                      onClick={() => deleteProduct(product.id)}
                      className="opacity-0 group-hover:opacity-100 text-error hover:text-error/80 transition-all p-1 text-lg"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
