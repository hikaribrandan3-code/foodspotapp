import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTenant } from '../../contexts/TenantContext';
import { translations } from '../../utils/translations';
import { supabase } from '../../lib/supabaseClient';
import CalculatorModal from '../../components/FinancialTracker/CalculatorModal';

export default function FinancialTracker() {
  const { lang } = useLanguage();
  const { businessId } = useTenant();
  const [activeTab, setActiveTab] = useState('expense');
  const [showCalculator, setShowCalculator] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [loading, setLoading] = useState(false);

  const [expenses, setExpenses] = useState([]);
  const [products, setProducts] = useState([]);


  const [expenseForm, setExpenseForm] = useState({
    category: 'Operations',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    recurring: false,
  });

  const [productForm, setProductForm] = useState({
    name: '',
    category: 'food',
    price: '',
    cost: '',
  });

  useEffect(() => {
    if (!businessId) return;
    fetchExpenses();
    fetchProducts();
  }, [businessId]);

  const fetchExpenses = async () => {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (!error && data) setExpenses(data);
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (!error && data) setProducts(data);
  };

  const handleCalculatorUse = (value) => {
    if (focusedField) {
      const field = document.getElementById(focusedField);
      if (field) field.value = value;
    }
    setShowCalculator(false);
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    if (!expenseForm.amount || !expenseForm.description || !businessId) return;

    setLoading(true);
    const { error } = await supabase.from('expenses').insert([{
      business_id: businessId,
      category: expenseForm.category,
      description: expenseForm.description,
      amount: Math.round(parseFloat(expenseForm.amount) * 100),
      date: expenseForm.date,
      is_recurring: expenseForm.recurring,
    }]);

    if (!error) {
      setExpenseForm({
        category: 'Operations',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        recurring: false,
      });
      fetchExpenses();
    }
    setLoading(false);
  };

  const deleteExpense = async (id) => {
    await supabase.from('expenses').delete().eq('id', id).eq('business_id', businessId);
    fetchExpenses();
  };

  const deleteProduct = async (id) => {
    await supabase.from('products').delete().eq('id', id).eq('business_id', businessId);
    fetchProducts();
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (!productForm.name || !productForm.price || !businessId) return;

    setLoading(true);
    const { error } = await supabase.from('products').insert([{
      business_id: businessId,
      name: productForm.name,
      category: productForm.category,
      price: Math.round(parseFloat(productForm.price) * 100),
      cost: productForm.cost ? Math.round(parseFloat(productForm.cost) * 100) : 0,
      is_active: true,
    }]);

    if (!error) {
      setProductForm({
        name: '',
        category: 'food',
        price: '',
        cost: '',
      });
      fetchProducts();
    }
    setLoading(false);
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

  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0) / 100;

  return (
    <>
      <div className="space-y-md">
        <div className="flex items-end justify-between border-b border-outline-variant pb-xs">
          <h2 className="font-h3 text-h3 text-on-surface font-bold">
            {translations.financial_overview?.[lang] || 'Financial Overview'}
          </h2>
          <p className="font-label-md text-label-md text-outline">Last 30 Days</p>
        </div>

        {/* 3 Stat Cards Grid */}
        <div className="grid grid-cols-2 gap-gutter md:grid-cols-3">
          {/* Card 1: Total Expenses */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg flex flex-col gap-sm p-md">
            <p className="font-label-md text-label-md text-outline uppercase tracking-wider">
              {translations.total_expenses?.[lang] || 'Total Expenses'}
            </p>
            <div className="flex items-center justify-between">
              <p className="font-h1 text-h1 text-on-surface">${totalExpenses.toLocaleString()}</p>
              <div className="flex items-center text-error bg-error-container px-xs py-[2px] rounded">
                <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                <span className="font-data-mono text-data-mono text-[12px]">8%</span>
              </div>
            </div>
          </div>

          {/* Card 2: Total Products */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg flex flex-col gap-sm p-md">
            <p className="font-label-md text-label-md text-outline uppercase tracking-wider">
              {translations.total_products?.[lang] || 'Total Products'}
            </p>
            <div className="flex items-center justify-between">
              <p className="font-h1 text-h1 text-on-surface">{products.length}</p>
              <div className="flex items-center text-outline bg-surface-variant px-xs py-[2px] rounded">
                <span className="material-symbols-outlined text-[16px]">inventory_2</span>
              </div>
            </div>
          </div>

          {/* Card 3: Net Profit */}
          <div className="col-span-2 md:col-span-1 bg-surface-container-lowest border border-outline-variant rounded-lg flex flex-col gap-sm p-md">
            <p className="font-label-md text-label-md text-outline uppercase tracking-wider">
              {translations.net_profit?.[lang] || 'Net Profit'}
            </p>
            <div className="flex items-center justify-between">
              <p className="font-h1 text-h1 text-on-surface">${Math.max(0, (products.reduce((sum, p) => sum + (p.is_active ? p.price || 0 : 0), 0) / 100) - totalExpenses).toLocaleString()}</p>
              <div className="flex items-center text-secondary bg-secondary-container px-xs py-[2px] rounded">
                <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
                <span className="font-data-mono text-data-mono text-[12px]">—</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Add Section */}
        <section className="space-y-md mt-xl">
          <div className="flex items-end justify-between border-b border-outline-variant pb-xs">
            <h2 className="font-h3 text-h3 text-on-surface font-bold">
              {translations.quick_add?.[lang] || 'Quick Add'}
            </h2>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-outline-variant mb-md">
            <button
              onClick={() => setActiveTab('expense')}
              className={`flex-1 py-sm font-label-caps text-label-caps text-center ${
                activeTab === 'expense'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              {translations.add_expense?.[lang] || 'Add Expense'}
            </button>
            <button
              onClick={() => setActiveTab('product')}
              className={`flex-1 py-sm font-label-caps text-label-caps text-center ${
                activeTab === 'product'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              {translations.add_product?.[lang] || 'Add Product'}
            </button>
          </div>

          {/* Add Expense Form */}
          {activeTab === 'expense' && (
            <form onSubmit={handleExpenseSubmit} className="bg-surface-container-lowest border border-outline-variant rounded-lg space-y-md p-md">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
                <div className="flex flex-col gap-xs">
                  <label className="font-label-md text-label-md text-outline">
                    {translations.category?.[lang] || 'Category'}
                  </label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="font-body-md text-body-md text-on-surface bg-surface border border-outline-variant rounded p-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  >
                    <option>Operations</option>
                    <option>Marketing</option>
                    <option>Payroll</option>
                  </select>
                </div>

                <div className="flex flex-col gap-xs">
                  <label className="font-label-md text-label-md text-outline">
                    {translations.amount?.[lang] || 'Amount'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-sm top-1/2 -translate-y-1/2 text-outline font-data-mono text-data-mono">$</span>
                    <input
                      id="expenseAmount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                      onFocus={() => setFocusedField('expenseAmount')}
                      className="w-full font-data-mono text-data-mono text-on-surface bg-surface border border-outline-variant rounded py-sm pl-[24px] pr-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-xs md:col-span-2">
                  <label className="font-label-md text-label-md text-outline">
                    {translations.description?.[lang] || 'Description'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Monthly Server Hosting"
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                    className="font-body-md text-body-md text-on-surface bg-surface border border-outline-variant rounded p-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>

                <div className="flex flex-col gap-xs">
                  <label className="font-label-md text-label-md text-outline">
                    {translations.date?.[lang] || 'Date'}
                  </label>
                  <input
                    type="date"
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="font-body-md text-body-md text-on-surface bg-surface border border-outline-variant rounded p-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>

                <div className="flex items-center gap-sm">
                  <input
                    type="checkbox"
                    id="recurring"
                    checked={expenseForm.recurring}
                    onChange={(e) => setExpenseForm({ ...expenseForm, recurring: e.target.checked })}
                    className="w-4 h-4 text-primary bg-surface border-outline-variant rounded focus:ring-primary focus:ring-2"
                  />
                  <label htmlFor="recurring" className="font-body-md text-body-md text-on-surface">
                    {translations.recurring_expense?.[lang] || 'Recurring Expense'}
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-sm">
                <button
                  type="submit"
                  className="bg-primary text-on-primary font-label-md text-label-md px-lg py-sm rounded hover:bg-primary-container transition-colors"
                >
                  {translations.add_expense?.[lang] || 'Add Expense'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'product' && (
            <form onSubmit={handleProductSubmit} className="bg-surface-container-lowest border border-outline-variant rounded-lg space-y-md p-md">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
                <div className="flex flex-col gap-xs md:col-span-2">
                  <label className="font-label-md text-label-md text-outline">
                    {translations.product_name?.[lang] || 'Product Name'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Premium Coffee"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    className="font-body-md text-body-md text-on-surface bg-surface border border-outline-variant rounded p-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>

                <div className="flex flex-col gap-xs">
                  <label className="font-label-md text-label-md text-outline">
                    {translations.category?.[lang] || 'Category'}
                  </label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="font-body-md text-body-md text-on-surface bg-surface border border-outline-variant rounded p-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  >
                    <option value="food">Food</option>
                    <option value="drink">Drink</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="flex flex-col gap-xs">
                  <label className="font-label-md text-label-md text-outline">
                    {translations.price?.[lang] || 'Price'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-sm top-1/2 -translate-y-1/2 text-outline font-data-mono text-data-mono">$</span>
                    <input
                      id="productPrice"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={productForm.price}
                      onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                      onFocus={() => setFocusedField('productPrice')}
                      className="w-full font-data-mono text-data-mono text-on-surface bg-surface border border-outline-variant rounded py-sm pl-[24px] pr-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-xs">
                  <label className="font-label-md text-label-md text-outline">
                    {translations.cost?.[lang] || 'Cost'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-sm top-1/2 -translate-y-1/2 text-outline font-data-mono text-data-mono">$</span>
                    <input
                      id="productCost"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={productForm.cost}
                      onChange={(e) => setProductForm({ ...productForm, cost: e.target.value })}
                      onFocus={() => setFocusedField('productCost')}
                      className="w-full font-data-mono text-data-mono text-on-surface bg-surface border border-outline-variant rounded py-sm pl-[24px] pr-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-sm">
                <button
                  type="submit"
                  className="bg-primary text-on-primary font-label-md text-label-md px-lg py-sm rounded hover:bg-primary-container transition-colors"
                >
                  {translations.add_product?.[lang] || 'Add Product'}
                </button>
              </div>
            </form>
          )}
        </section>

        {/* Expenses List */}
        <div>
          <div className="flex items-end justify-between border-b border-outline-variant pb-xs mb-sm">
            <h3 className="font-h3 text-h3 text-on-surface font-bold">
              {translations.recent_expenses?.[lang] || 'Recent Expenses'}
            </h3>
            <a href="#" className="font-label-md text-label-md text-primary hover:underline">
              {translations.view_all?.[lang] || 'View All'}
            </a>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
            <div className="grid grid-cols-[2fr_3fr_1.5fr_auto] gap-sm p-sm bg-surface-container-low border-b border-outline-variant">
              <div className="font-label-caps text-label-caps text-outline">{translations.category?.[lang] || 'Category'}</div>
              <div className="font-label-caps text-label-caps text-outline">{translations.description?.[lang] || 'Description'}</div>
              <div className="font-label-caps text-label-caps text-outline text-right">{translations.amount?.[lang] || 'Amount'}</div>
              <div className="w-8"></div>
            </div>

            <div className="divide-y divide-outline-variant">
              {expenses.length === 0 ? (
                <p className="text-outline font-body-md p-sm text-center">{translations.no_expenses?.[lang] || 'No expenses yet'}</p>
              ) : (
                expenses.map((expense) => (
                  <div key={expense.id} className="grid grid-cols-[2fr_3fr_1.5fr_auto] gap-sm p-sm items-center hover:bg-surface transition-colors">
                    <div className="font-body-md text-body-md text-on-surface">{expense.category}</div>
                    <div className="font-body-md text-body-md text-outline truncate">{expense.description}</div>
                    <div className="font-data-mono text-data-mono text-on-surface text-right">${(expense.amount / 100).toFixed(2)}</div>
                    <button
                      onClick={() => deleteExpense(expense.id)}
                      className="text-outline hover:text-error transition-colors flex justify-end"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Products List */}
        <div>
          <div className="flex items-end justify-between border-b border-outline-variant pb-xs mb-sm">
            <h3 className="font-h3 text-h3 text-on-surface font-bold">
              {translations.active_products?.[lang] || 'Active Products'}
            </h3>
            <a href="#" className="font-label-md text-label-md text-primary hover:underline">
              {translations.view_all?.[lang] || 'View All'}
            </a>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
            <div className="grid grid-cols-[3fr_2fr_1.5fr_auto] gap-sm p-sm bg-surface-container-low border-b border-outline-variant">
              <div className="font-label-caps text-label-caps text-outline">{translations.product_name?.[lang] || 'Name'}</div>
              <div className="font-label-caps text-label-caps text-outline">{translations.category?.[lang] || 'Category'}</div>
              <div className="font-label-caps text-label-caps text-outline text-right">{translations.price?.[lang] || 'Price'}</div>
              <div className="w-[60px] text-center font-label-caps text-label-caps text-outline">{translations.status?.[lang] || 'Status'}</div>
            </div>

            <div className="divide-y divide-outline-variant">
              {products.length === 0 ? (
                <p className="text-outline font-body-md p-sm text-center">{translations.no_products?.[lang] || 'No products yet'}</p>
              ) : (
                products.map((product) => (
                  <div key={product.id} className="grid grid-cols-[3fr_2fr_1.5fr_auto] gap-sm p-sm items-center hover:bg-surface transition-colors">
                    <div className="font-body-md text-body-md text-on-surface font-medium truncate">{product.name}</div>
                    <div className="font-body-md text-body-md text-outline">{product.category}</div>
                    <div className="font-data-mono text-data-mono text-on-surface text-right">${(product.price / 100).toFixed(2)}</div>
                    <div className="flex justify-center gap-sm items-center">
                      <button
                        onClick={() => toggleProduct(product.id)}
                        className={`w-8 h-4 rounded-full relative cursor-pointer transition-colors ${
                          product.is_active ? 'bg-primary' : 'bg-outline-variant'
                        }`}
                      >
                        <div
                          className={`w-3 h-3 bg-white rounded-full absolute top-[2px] transition-all ${
                            product.is_active ? 'right-[2px]' : 'left-[2px]'
                          }`}
                        ></div>
                      </button>
                      <button
                        onClick={() => deleteProduct(product.id)}
                        className="text-outline hover:text-error transition-colors flex justify-end"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Calculator Button */}
      <button
        onClick={() => setShowCalculator(true)}
        className="fixed bottom-[88px] md:bottom-lg right-lg bg-primary text-on-primary w-[56px] h-[56px] rounded-2xl shadow-lg flex items-center justify-center hover:bg-primary-container transition-colors z-40"
      >
        <span className="material-symbols-outlined text-[24px]">calculate</span>
      </button>

      {/* Calculator Modal */}
      {showCalculator && (
        <CalculatorModal
          onClose={() => setShowCalculator(false)}
          onUseResult={handleCalculatorUse}
          lang={lang}
        />
      )}
    </>
  );
}
