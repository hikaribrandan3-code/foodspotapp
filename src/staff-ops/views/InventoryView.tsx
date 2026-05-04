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
      {/* Top pills */}
      <div
        className="px-4 pt-4 pb-3 border-b transition-colors duration-300"
        style={{ backgroundColor: 'var(--nav-bg)', borderColor: 'var(--nav-border)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Package size={18} strokeWidth={2.2} style={{ color: 'var(--text-primary)' }} />
          <span className="text-sm font-bold tracking-wide" style={{ color: 'var(--text-primary)' }}>
            Inventory
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border"
              style={{
                background: activeTab === tab.id ? '#10B981' : 'var(--filter-bg)',
                color: activeTab === tab.id ? '#FFFFFF' : '#000000',
                borderColor: activeTab === tab.id ? '#10B981' : 'var(--nav-border)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'entry' && <InventoryEntry />}
        {activeTab === 'stock' && <InventoryStockList />}
        {activeTab === 'audit' && <InventoryAudit />}
      </div>
    </div>
  );
}
