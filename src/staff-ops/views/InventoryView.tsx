import { useState, lazy, Suspense } from 'react';
import { Package } from 'lucide-react';

// Lazy-load all inventory tabs so the large shared chunk (used by both
// staff-ops and the owner MenuInventoryView) is NOT eagerly preloaded on
// staff-ops startup. This prevents TDZ / "Cannot access 'x' before
// initialization" crashes caused by cross-entry chunk loading order.
const InventoryEntry = lazy(() => import('./InventoryEntry').then(m => ({ default: m.InventoryEntry })));
const InventoryStockList = lazy(() => import('./InventoryStockList').then(m => ({ default: m.InventoryStockList })));
const InventoryAudit = lazy(() => import('./InventoryAudit').then(m => ({ default: m.InventoryAudit })));

const TABS = [
  { id: 'entry', label: 'Entry' },
  { id: 'stock', label: 'Stock' },
  { id: 'audit', label: 'Audit' },
];

function InventoryFallback() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="animate-pulse flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-200" />
        <div className="w-24 h-3 rounded bg-gray-200" />
      </div>
    </div>
  );
}

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
        <Suspense fallback={<InventoryFallback />}>
          {activeTab === 'entry' && <InventoryEntry />}
          {activeTab === 'stock' && <InventoryStockList />}
          {activeTab === 'audit' && <InventoryAudit />}
        </Suspense>
      </div>
    </div>
  );
}
