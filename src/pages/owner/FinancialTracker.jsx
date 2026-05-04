import React, { useState } from 'react';
import {
  LayoutDashboard,
  BarChart3,
  Wallet,
  Settings,
  User,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  Trash2,
  Plus,
  Calculator,
  ChevronDown,
  Calendar,
  DollarSign
} from 'lucide-react';
import { motion } from 'motion';

const StatCard = ({ title, value, delta, icon: Icon }) => (
  <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 flex flex-col gap-2">
    <p className="text-[12px] font-semibold text-outline uppercase tracking-wider">{title}</p>
    <div className="flex items-center justify-between">
      <p className="text-3xl font-bold text-on-surface tracking-tight">{value}</p>
      <div className="flex items-center gap-2">
        {delta && (
          <div className={`flex items-center px-1.5 py-0.5 rounded text-[12px] font-bold ${
            delta.type === 'positive' ? 'text-secondary bg-secondary-container/30' : 'text-error bg-error-container/40'
          }`}>
            {delta.type === 'positive' ? <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" /> : <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />}
            {delta.value}
          </div>
        )}
        {Icon && <div className="p-2 bg-surface-container rounded text-outline"><Icon className="w-5 h-5" /></div>}
      </div>
    </div>
  </div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState('expense');
  const [expenses, setExpenses] = useState([
    { id: '1', category: 'Software', description: 'AWS Hosting Monthly', amount: 450.00, date: '2024-05-01' },
    { id: '2', category: 'Marketing', description: 'Q3 Ad Campaign', amount: 800.00, date: '2024-05-02' },
  ]);
  const [products, setProducts] = useState([
    { id: '1', name: 'Premium Widget', category: 'Hardware', price: 99.99, active: true },
    { id: '2', name: 'Basic Subscription', category: 'Software', price: 19.99, active: false },
  ]);

  const handleDeleteExpense = (id) => {
    setExpenses(expenses.filter(e => e.id !== id));
  };

  const toggleProductActive = (id) => {
    setProducts(products.map(p => p.id === id ? { ...p, active: !p.active } : p));
  };

  return (
    <div className="min-h-screen bg-surface md:grid md:grid-cols-[260px_1fr]">
      <main className="p-6 md:p-8 space-y-8 flex-1">
        {/* Hero Section (Bento KPI Grid) */}
        <section className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:col-span-2 md:row-span-2 bg-linear-to-br from-surface-container to-primary-container/10 border border-outline-variant rounded-3xl p-8 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <p className="text-xs font-bold text-outline tracking-widest uppercase">Net Profit</p>
              <h3 className="text-5xl font-bold text-on-surface tracking-tighter leading-tight font-data">
                $3,400.00
              </h3>
              <div className="inline-flex items-center px-2 py-1 bg-secondary-container/20 text-secondary rounded-full text-xs font-bold">
                <ArrowUpRight className="w-3 h-3 mr-1" />
                +12.4% this month
              </div>
            </div>
            <div className="mt-8 flex items-center justify-between">
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full bg-outline-variant border-2 border-surface" />
                ))}
              </div>
              <div className="text-xs font-medium text-on-surface-variant">
                Calculated from 42 products
              </div>
            </div>
          </motion.div>

          <div className="bg-surface-container border border-outline-variant rounded-3xl p-6 flex flex-col justify-between">
            <p className="text-xs font-bold text-outline tracking-widest uppercase">Expenses</p>
            <div>
              <p className="text-2xl font-bold text-on-surface tracking-tight font-data">$1,250</p>
              <div className="h-1 w-full bg-outline-variant rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-error w-3/4 rounded-full" />
              </div>
            </div>
          </div>

          <div className="bg-surface-container border border-outline-variant rounded-3xl p-6 flex flex-col justify-between">
            <p className="text-xs font-bold text-outline tracking-widest uppercase">Products</p>
            <div>
              <p className="text-2xl font-bold text-on-surface tracking-tight">42</p>
              <p className="text-xs text-on-surface-variant mt-1">↑ 3 new added</p>
            </div>
          </div>

          <div className="md:col-span-2 bg-on-surface text-surface border border-transparent rounded-3xl p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-outline tracking-widest uppercase text-surface/60">Next Payout</p>
              <p className="text-2xl font-bold tracking-tight mt-1">Friday, May 8</p>
            </div>
            <div className="w-12 h-12 bg-surface/10 rounded-2xl flex items-center justify-center">
              <Calendar className="w-6 h-6" />
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
                  <div key={expense.id} className="flex items-center justify-between p-4 hover:bg-surface-container-low transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-surface-container-low rounded-xl flex items-center justify-center text-on-surface-variant">
                        <DollarSign className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-on-surface">{expense.description}</p>
                        <p className="text-xs text-on-surface-variant">{expense.category} • {expense.date}</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-on-surface">-${expense.amount.toFixed(2)}</p>
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
                <button className="col-span-2 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-container transition-all active:scale-[0.98]">
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
                <div key={product.id} className="bg-surface-container border border-outline-variant rounded-3xl p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${product.active ? 'bg-primary/20 text-primary' : 'bg-outline-variant/30 text-outline'}`}>
                      <Package className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-on-surface">{product.name}</p>
                      <p className="text-xs text-on-surface-variant font-data">${product.price}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleProductActive(product.id)}
                    className={`w-10 h-6 rounded-full relative transition-colors ${product.active ? 'bg-primary' : 'bg-outline-variant'}`}
                  >
                    <motion.div
                      animate={{ x: product.active ? 18 : 2 }}
                      className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* FAB (Desktop/Mobile) */}
      <button className="fixed bottom-24 md:bottom-8 right-8 bg-primary text-white w-14 h-14 rounded-2xl shadow-xl flex items-center justify-center hover:bg-primary-container transition-all hover:scale-110 active:scale-95 group z-50">
        <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform" />
      </button>
    </div>
  );
}
