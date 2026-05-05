import { useState } from 'react';
import { Package } from 'lucide-react';
import { InventoryEntry } from './InventoryEntry';
import { InventoryStockList } from './InventoryStockList';
import { InventoryAudit } from './InventoryAudit';

const TABS = [
  { id: 'entry', label: 'Entry' },
  { id: 'stock', label: 'Stock' },
  { id: 'audit', label: 'Audit' },
];

export default function InventoryView() {
  const [activeTab, setActiveTab] = useState('entry');

  return (
    <div className="h-full w-full flex flex-col" style={{ backgroundColor: 'var(--app-bg)' }}>
      {/* Header */}
      <div
        className="px-4 pt-5 pb-3 border-b transition-colors duration-300"
        style={{ backgroundColor: 'var(--nav-bg)', borderColor: 'var(--nav-border)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Package size={20} strokeWidth={2.2} style={{ color: 'var(--status-icon-prep)' }} />
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Inventory
          </h1>
        </div>

        <div className="flex gap-2 overflow-x-auto justify-center scrollbar-hide">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 flex items-center justify-center py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border"
              style={{
                backgroundColor: activeTab === tab.id ? 'var(--filter-active-bg)' : 'var(--counter-bg)',
                color: activeTab === tab.id ? 'var(--filter-active-text)' : 'var(--text-secondary)',
                borderColor: activeTab === tab.id ? 'var(--filter-active-border, var(--card-border))' : 'var(--counter-border)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {activeTab === 'entry' && <InventoryEntry />}
        {activeTab === 'stock' && <InventoryStockList />}
        {activeTab === 'audit' && <InventoryAudit />}
      </div>
    </div>
  );
}
