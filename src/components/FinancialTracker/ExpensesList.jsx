import React from 'react';
import { translations } from '../../utils/translations';

export default function ExpensesList({ expenses, lang, onDelete }) {
  return (
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
        {/* Table Header */}
        <div className="grid grid-cols-[2fr_3fr_1.5fr_auto] gap-sm p-sm bg-surface-container-low border-b border-outline-variant">
          <div className="font-label-caps text-label-caps text-outline">
            {translations.category?.[lang] || 'Category'}
          </div>
          <div className="font-label-caps text-label-caps text-outline">
            {translations.description?.[lang] || 'Description'}
          </div>
          <div className="font-label-caps text-label-caps text-outline text-right">
            {translations.amount?.[lang] || 'Amount'}
          </div>
          <div className="w-8"></div>
        </div>

        {/* Rows */}
        {expenses.length > 0 ? (
          <div className="divide-y divide-outline-variant">
            {expenses.map((expense) => (
              <div key={expense.id} className="grid grid-cols-[2fr_3fr_1.5fr_auto] gap-sm p-sm items-center hover:bg-surface transition-colors">
                <div className="font-body-md text-body-md text-on-surface">{expense.category}</div>
                <div className="font-body-md text-body-md text-outline truncate">{expense.description}</div>
                <div className="font-data-mono text-data-mono text-on-surface text-right">
                  ${expense.amount.toFixed(2)}
                </div>
                <button
                  onClick={() => onDelete(expense.id)}
                  className="text-outline hover:text-error transition-colors flex justify-end"
                >
                  <span className="material-symbols-outlined text-[20px]">delete</span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-sm text-center text-outline font-body-md">
            {translations.no_expenses?.[lang] || 'No expenses yet'}
          </div>
        )}
      </div>
    </div>
  );
}
