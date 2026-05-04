import React, { useState } from 'react';
import { translations } from '../../utils/translations';

export default function QuickAddForm({ lang, setFocusedField, onExpenseAdded, onProductAdded }) {
  const [activeTab, setActiveTab] = useState('expense');
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

  const expenseCategories = ['Operations', 'Marketing', 'Payroll', 'Software', 'Rent', 'Utilities'];
  const productCategories = ['food', 'drink', 'other'];

  const handleExpenseSubmit = (e) => {
    e.preventDefault();
    if (expenseForm.amount && expenseForm.description) {
      onExpenseAdded({
        id: Date.now(),
        category: expenseForm.category,
        description: expenseForm.description,
        amount: parseFloat(expenseForm.amount),
        date: expenseForm.date,
        recurring: expenseForm.recurring,
      });
      setExpenseForm({
        category: 'Operations',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        recurring: false,
      });
    }
  };

  const handleProductSubmit = (e) => {
    e.preventDefault();
    if (productForm.name && productForm.price) {
      onProductAdded({
        id: Date.now(),
        name: productForm.name,
        category: productForm.category,
        price: parseFloat(productForm.price),
        cost: parseFloat(productForm.cost) || 0,
        active: true,
      });
      setProductForm({ name: '', category: 'food', price: '', cost: '' });
    }
  };

  return (
    <section className="space-y-md">
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
                {expenseCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
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

      {/* Add Product Form */}
      {activeTab === 'product' && (
        <form onSubmit={handleProductSubmit} className="bg-surface-container-lowest border border-outline-variant rounded-lg space-y-md p-md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
            <div className="flex flex-col gap-xs md:col-span-2">
              <label className="font-label-md text-label-md text-outline">
                {translations.product_name?.[lang] || 'Product Name'}
              </label>
              <input
                type="text"
                placeholder="e.g. Deluxe Burger"
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
                {productCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
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
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={productForm.cost}
                  onChange={(e) => setProductForm({ ...productForm, cost: e.target.value })}
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
  );
}
