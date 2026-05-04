import React from 'react';
import { translations } from '../../utils/translations';

export default function StatCards({ totalExpenses, totalProducts, netProfit, lang }) {
  return (
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
          <p className="font-h1 text-h1 text-on-surface">{totalProducts}</p>
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
          <p className="font-h1 text-h1 text-on-surface">${netProfit.toLocaleString()}</p>
          <div className="flex items-center text-secondary bg-secondary-container px-xs py-[2px] rounded">
            <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
            <span className="font-data-mono text-data-mono text-[12px]">12%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
