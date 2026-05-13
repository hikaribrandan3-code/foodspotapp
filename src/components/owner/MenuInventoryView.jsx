import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, ChevronUp, Plus, Settings, Camera, X, Check, Package } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext.jsx';
import { translations as staffTranslations } from '../../staff-ops/lib/translations';
import { supabase, updateBranding } from '../../lib/supabaseClient.js';
import { deepMergeAppConfig } from '../../utils/appConfig';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { InventoryStockList } from '../../staff-ops/views/InventoryStockList.tsx';
import { InventoryAudit } from '../../staff-ops/views/InventoryAudit.tsx';
import { InventoryEntry } from '../../staff-ops/views/InventoryEntry.tsx';

const EMERALD = '#059669';

// Color tokens matching staff-ops light mode
const colors = {
  appBg: '#f8fafc',
  navBg: '#ffffff',
  navBorder: '#e2e8f0',
  cardBg: '#ffffff',
  cardBorder: '#e2e8f0',
  cardBorderStrong: '#cbd5e1',
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  textTertiary: '#94a3b8',
  filterBg: '#f1f5f9',
  filterInactiveBg: '#ffffff',
  counterBg: '#ffffff',
  counterBorder: '#e2e8f0',
  filterActiveBg: '#ecfdf5',
  filterActiveText: '#059669',
  filterActiveBorder: '#a7f3d0',
  emptyIcon: 'rgba(100, 116, 139, 0.4)',
};

export default function MenuInventoryView({ lang = 'en' }) {
  const { businessId, tenantData } = useTenant();
  const t = (key) => staffTranslations[key]?.[lang] || staffTranslations[key]?.['en'] || key;

  const [activeTab, setActiveTab] = useState('entry');
  const [categories, setCategories] = useState(['All', 'Food', 'Drinks', 'Cups', 'Plates', 'Condiments', 'Chips']);
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const saveDebounceRef = useRef(null);
  const isSyncing = useRef(false);

  // Load inventory from app_config on mount
  useEffect(() => {
    if (!tenantData) {
      setIsLoading(true);
      return;
    }
    const invConfig = tenantData.app_config?.inventory || {};
    setItems(invConfig.items || []);
    setCategories(invConfig.categories || ['All', 'Food', 'Drinks', 'Cups', 'Plates', 'Condiments', 'Chips']);
    setIsLoading(false);
  }, [tenantData]);

  // Debounced save to branding.app_config
  useEffect(() => {
    const effectiveBusinessId = businessId || tenantData?.business_id;
    if (!effectiveBusinessId || isLoading || !isDirty) return;
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = setTimeout(() => {
      setSaveStatus({ message: t('saving') || 'Saving...' });
      const payload = {
        app_config: deepMergeAppConfig(tenantData?.app_config || {}, {
          inventory: {
            items,
            categories
          }
        })
      };
      updateBranding(payload, effectiveBusinessId)
        .then((result) => {
          if (result.error) {
            const isForbidden = result.error?.code === '42501' || result.error?.status === 403 || result.error?.message?.includes('permission');
            if (isForbidden) {
              console.error('[MenuInventoryView] 🚨 403 FORBIDDEN — Inventory save blocked. Please log in as owner.');
            } else {
              console.error('[MenuInventoryView] Save failed:', result.error);
            }
            setSaveStatus({ error: true, message: t('save_failed') || 'Save failed' });
            return;
          }
          setSaveStatus({ message: t('saved') || 'Saved' });
          setIsDirty(false);
          isSyncing.current = true;
        })
        .catch(err => {
          console.error('[MenuInventoryView] Save failed:', err);
          setSaveStatus({ error: true, message: t('save_failed') || 'Save failed' });
        });
    }, 1000);
    return () => {
      clearTimeout(saveDebounceRef.current);
    };
  }, [items, categories, businessId, tenantData, isLoading, isDirty]);

  // Auto-hide save status pill independently
  useEffect(() => {
    if (!saveStatus) return;
    const timer = setTimeout(() => setSaveStatus(null), saveStatus.error ? 3000 : 2000);
    return () => clearTimeout(timer);
  }, [saveStatus]);

  const updateQty = (id, delta) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, qty: Math.max(0, item.qty + delta) } : item));
    setIsDirty(true);
  };

  const tabs = [
    { id: 'entry', label: 'Entry' },
    { id: 'stock', label: 'Stock' },
    { id: 'audit', label: 'Audit' },
  ];

  const tabButtonStyle = (isActive) => ({
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 16px',
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 600,
    border: '1px solid',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s',
    backgroundColor: isActive ? colors.filterActiveBg : colors.filterInactiveBg,
    color: isActive ? colors.filterActiveText : colors.textSecondary,
    borderColor: isActive ? colors.filterActiveBorder : colors.counterBorder,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: '0 0 112px 0', position: 'relative' }}>
      {/* Save Status Pill */}
      <AnimatePresence>
        {saveStatus && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              position: 'fixed',
              bottom: 80,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 9999,
              padding: '10px 20px',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 600,
              color: 'white',
              background: saveStatus.error ? '#EF4444' : '#059669',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              pointerEvents: 'none',
            }}
          >
            {saveStatus.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sub-tabs: Entry / Stock / Audit */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 20 }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={tabButtonStyle(activeTab === tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ENTRY TAB */}
      {activeTab === 'entry' && (
        <InventoryEntry
          externalItems={items}
          externalCategories={categories}
          onItemsChange={(next) => {
            if (isSyncing.current) { isSyncing.current = false; return; }
            setItems(next);
            setIsDirty(true);
          }}
          onCategoriesChange={(next) => {
            if (isSyncing.current) { isSyncing.current = false; return; }
            setCategories(next);
            setIsDirty(true);
          }}
          onDirty={() => setIsDirty(true)}
          businessId={businessId || tenantData?.business_id}
        />
      )}
      {/* STOCK TAB */}
      {activeTab === 'stock' && (
        <InventoryStockList externalItems={items} />
      )}

      {/* AUDIT TAB */}
      {activeTab === 'audit' && (
        <InventoryAudit externalItems={items} onUpdateQty={(id, delta) => updateQty(id, delta)} />
      )}
    </div>
  );
}
