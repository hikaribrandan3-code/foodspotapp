import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { translations } from '../../utils/translations';
import StatCards from '../../components/FinancialTracker/StatCards';
import QuickAddForm from '../../components/FinancialTracker/QuickAddForm';
import ExpensesList from '../../components/FinancialTracker/ExpensesList';
import ProductsList from '../../components/FinancialTracker/ProductsList';
import CalculatorModal from '../../components/FinancialTracker/CalculatorModal';

export default function FinancialTracker({ totalExpenses = 1250, totalProducts = 42, netProfit = 3400 }) {
  const { lang } = useLanguage();
  const [showCalculator, setShowCalculator] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [expenses, setExpenses] = useState([
    { id: 1, category: 'Software', description: 'AWS Hosting Monthly', amount: 450.00 },
    { id: 2, category: 'Marketing', description: 'Q3 Ad Campaign', amount: 800.00 },
  ]);
  const [products, setProducts] = useState([
    { id: 1, name: 'Premium Widget', category: 'Hardware', price: 99.99, active: true },
    { id: 2, name: 'Basic Subscription', category: 'Software', price: 19.99, active: false },
  ]);

  const handleCalculatorUse = (value) => {
    if (focusedField) {
      const field = document.getElementById(focusedField);
      if (field) field.value = value;
    }
    setShowCalculator(false);
  };

  return (
    <div className="space-y-lg pb-lg">
      {/* Financial Overview Section */}
      <section className="space-y-lg">
        <div className="flex items-end justify-between border-b border-outline-variant pb-xs">
          <h2 className="font-h3 text-h3 text-on-surface font-bold">
            {translations.financial_overview?.[lang] || 'Financial Overview'}
          </h2>
          <p className="font-label-md text-label-md text-outline">Last 30 Days</p>
        </div>
        <StatCards
          totalExpenses={totalExpenses}
          totalProducts={totalProducts}
          netProfit={netProfit}
          lang={lang}
        />
      </section>

      {/* Quick Add Section */}
      <QuickAddForm
        lang={lang}
        setFocusedField={setFocusedField}
        onExpenseAdded={(expense) => setExpenses([expense, ...expenses])}
        onProductAdded={(product) => setProducts([product, ...products])}
      />

      {/* Lists Section */}
      <section className="space-y-xl">
        <ExpensesList expenses={expenses} lang={lang} onDelete={(id) => setExpenses(expenses.filter(e => e.id !== id))} />
        <ProductsList products={products} lang={lang} onDelete={(id) => setProducts(products.filter(p => p.id !== id))} />
      </section>

      {/* Floating Calculator Button */}
      <button
        onClick={() => setShowCalculator(true)}
        className="fixed bottom-lg right-lg bg-primary text-on-primary w-[56px] h-[56px] rounded-2xl shadow-lg flex items-center justify-center hover:bg-primary-container transition-colors z-40 md:flex"
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
    </div>
  );
}
