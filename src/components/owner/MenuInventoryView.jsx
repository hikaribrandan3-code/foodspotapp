import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, ChevronUp, Plus, Settings, Camera, X, Check, Package } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext.jsx';
import { translations as staffTranslations } from '../../staff-ops/lib/translations';
import { supabase, updateBranding } from '../../lib/supabaseClient.js';
import { deepMergeAppConfig } from '../../utils/appConfig';
import { Html5QrcodeScanner } from 'html5-qrcode';

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

  // Entry tab state
  const [expandedItems, setExpandedItems] = useState([]);
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState(['All', 'Food', 'Drinks', 'Cups', 'Plates', 'Condiments', 'Chips']);
  const [activeCategory, setActiveCategory] = useState('All');
  const [lastClick, setLastClick] = useState(null);

  // Scanner
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanQty, setScanQty] = useState(1);
  const [scanUnit, setScanUnit] = useState('units');

  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState(null);
  const saveDebounceRef = useRef(null);
  const saveStatusTimeoutRef = useRef(null);

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
    if (!effectiveBusinessId || isLoading) return;
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
        .then(() => {
          setSaveStatus({ message: t('saved') || 'Saved' });
          if (saveStatusTimeoutRef.current) clearTimeout(saveStatusTimeoutRef.current);
          saveStatusTimeoutRef.current = setTimeout(() => setSaveStatus(null), 2000);
        })
        .catch(err => {
          const isForbidden = err?.code === '42501' || err?.status === 403 || err?.message?.includes('permission');
          if (isForbidden) {
            console.error('[MenuInventoryView] 🚨 403 FORBIDDEN — Inventory save blocked. Please log in as owner.');
          } else {
            console.error('[MenuInventoryView] Save failed:', err);
          }
          setSaveStatus({ error: true, message: t('save_failed') || 'Save failed' });
          if (saveStatusTimeoutRef.current) clearTimeout(saveStatusTimeoutRef.current);
          saveStatusTimeoutRef.current = setTimeout(() => setSaveStatus(null), 3000);
        });
    }, 1000);
    return () => {
      clearTimeout(saveDebounceRef.current);
      clearTimeout(saveStatusTimeoutRef.current);
    };
  }, [items, categories, businessId, tenantData, isLoading]);

  const lookupBarcode = async (barcode) => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('name, category, price, cost, supplier, unit')
        .eq('barcode', barcode)
        .eq('business_id', businessId)
        .maybeSingle();
      if (error || !data) return null;
      return data;
    } catch {
      return null;
    }
  };

  const addItem = (item) => {
    const newItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: item.name,
      category: item.category || (activeCategory === 'All' ? categories[1] || 'Food' : activeCategory),
      qty: item.qty,
      min: item.min || 0,
      max: item.max || 100,
      unit: item.unit || scanUnit || 'units',
      expiryDate: item.expiryDate || '',
      location: item.location || '',
      supplier: item.supplier || '',
      cost: item.cost || 0,
      price: item.price || 0,
      barcode: item.barcode || '',
      tags: item.tags || []
    };
    setItems([newItem, ...items]);
    setExpandedItems([newItem.id]);
  };

  useEffect(() => {
    let scanner = null;
    if (showScanner && !scanResult) {
      try {
        scanner = new Html5QrcodeScanner(
          "reader",
          {
            fps: 15,
            qrbox: { width: 250, height: 250 },
            disableFlip: false,
            supportedScanTypes: [0],
            videoConstraints: { facingMode: 'environment' },
          },
          false
        );
        scanner.render(
          async (decodedText) => {
            setScanLoading(true);
            const foundItem = await lookupBarcode(decodedText);
            setScanLoading(false);
            setScanResult(foundItem
              ? { ...foundItem, barcode: decodedText }
              : { name: t('item_not_found'), category: t('uncategorized'), barcode: decodedText, price: 0 }
            );
            scanner?.clear();
          },
          () => {}
        );
      } catch (err) {
        console.error("Scanner setup failed", err);
      }
    }
    return () => {
      if (scanner) {
        try { scanner.stop().catch(() => {}); } catch {}
        try { scanner.clear().catch(() => {}); } catch {}
      }
    };
  }, [showScanner, scanResult]);

  const confirmScanAdd = () => {
    if (scanResult) {
      if (scanResult.name === t('item_not_found')) {
        const name = prompt(t('item_name'));
        if (name) addItem({ name, category: 'Food', qty: scanQty, barcode: scanResult.barcode });
      } else {
        addItem({
          name: scanResult.name,
          category: scanResult.category,
          qty: scanQty,
          barcode: scanResult.barcode,
          cost: scanResult.cost,
          price: scanResult.price,
          supplier: scanResult.supplier,
          unit: scanResult.unit,
        });
      }
      setShowScanner(false);
      setScanResult(null);
      setScanQty(1);
    }
  };

  const updateItem = (id, updates) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const updateQty = (id, delta) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, qty: Math.max(0, item.qty + delta) } : item));
  };

  const toggleExpand = (id) => {
    setExpandedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const addCategory = () => {
    const name = prompt(t('add_category'));
    if (name) setCategories([...categories, name]);
  };

  const activeItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const manageCategory = (cat) => {
    const action = prompt(`${t('edit_category')} "${cat}"? \n1. ${t('rename')}\n2. ${t('delete')}\n3. Cancel`, "1");
    if (action === "1") {
      const newName = prompt(`${t('rename')} "${cat}" to:`, cat);
      if (newName && newName !== cat) {
        setCategories(prev => prev.map(c => c === cat ? newName : c));
        setItems(prev => prev.map(item => item.category === cat ? { ...item, category: newName } : item));
        setActiveCategory(newName);
      }
    } else if (action === "2") {
      if (confirm(`${t('delete')} category "${cat}"?`)) {
        const firstCat = categories.find(c => c !== cat) || t('uncategorized');
        setCategories(prev => prev.filter(c => c !== cat));
        setItems(prev => prev.map(item => item.category === cat ? { ...item, category: firstCat } : item));
        setActiveCategory(firstCat);
      }
    }
  };

  const handleCategoryInteraction = (cat) => {
    if (cat === 'All') { setActiveCategory('All'); return; }
    const now = Date.now();
    if (lastClick && lastClick.id === cat && (now - lastClick.time) < 500) {
      manageCategory(cat);
      setLastClick(null);
    } else {
      setActiveCategory(cat);
      setLastClick({ id: cat, time: now });
    }
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
      {saveStatus && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          padding: '10px 20px',
          borderRadius: 999,
          fontSize: 13,
          fontWeight: 600,
          color: 'white',
          background: saveStatus.error ? '#EF4444' : '#22C55E',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          transition: 'all 0.3s ease',
          pointerEvents: 'none',
        }}>
          {saveStatus.message}
        </div>
      )}

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Search & Add */}
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{
              position: 'relative',
              height: 48,
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              padding: '0 12px',
              gap: 8,
              flex: 1,
              border: `1px solid ${colors.counterBorder}`,
              backgroundColor: colors.counterBg,
            }}>
              <Search size={18} style={{ color: colors.textTertiary, flexShrink: 0 }} />
              <input
                type="text"
                placeholder={t('search_items')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  width: '100%',
                  fontSize: 14,
                  color: colors.textPrimary,
                }}
              />
            </div>
            <button
              onClick={() => setShowScanner(true)}
              style={{
                width: 48, height: 48, borderRadius: 12,
                backgroundColor: EMERALD, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: 'none', cursor: 'pointer', flexShrink: 0,
              }}
            >
              <Camera size={20} />
            </button>
            <button
              onClick={() => {
                const name = prompt(t('item_name'));
                if (name) addItem({ name, qty: 0 });
              }}
              style={{
                width: 48, height: 48, borderRadius: 12,
                backgroundColor: colors.navBg, color: colors.textPrimary,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1px solid ${colors.navBorder}`, cursor: 'pointer', flexShrink: 0,
              }}
            >
              <Plus size={20} />
            </button>
          </div>

          {/* Scanner Overlay */}
          <AnimatePresence>
            {showScanner && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'fixed', inset: 0, zIndex: 100,
                  background: 'black', display: 'flex',
                  flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  padding: 24,
                }}
              >
                <button
                  onClick={() => { setShowScanner(false); setScanResult(null); }}
                  style={{
                    position: 'absolute', top: 48, right: 24,
                    padding: 8, borderRadius: 9999, background: 'rgba(255,255,255,0.1)',
                    color: 'white', border: 'none', cursor: 'pointer',
                  }}
                >
                  <X size={24} />
                </button>

                <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {scanLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '48px 0' }}>
                      <div style={{
                        width: 48, height: 48,
                        border: '4px solid rgba(255,255,255,0.2)',
                        borderTopColor: 'white', borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                      }} />
                      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 500 }}>Looking up item...</p>
                    </div>
                  ) : !scanResult ? (
                    <>
                      <div style={{ textAlign: 'center' }}>
                        <h2 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginBottom: 8 }}>{t('scanning')}</h2>
                        <p style={{ color: 'rgba(255,255,255,0.6)' }}>{t('point_camera')}</p>
                      </div>
                      <div id="reader" style={{
                        width: '100%', aspectRatio: '1',
                        overflow: 'hidden', borderRadius: 24,
                        border: `2px solid ${EMERALD}`, background: 'rgba(255,255,255,0.05)',
                      }} />
                      <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Allow camera access when prompted</p>
                    </>
                  ) : (
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      style={{
                        background: 'white', borderRadius: 32, padding: 32,
                        display: 'flex', flexDirection: 'column', gap: 24,
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{
                          width: 64, height: 64, borderRadius: 16,
                          backgroundColor: EMERALD, color: 'white',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {scanResult.name === t('item_not_found') ? <Search size={32} /> : <Check size={32} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.05em', color: '#9ca3af' }}>{t('found')}</p>
                          <h2 style={{ fontSize: 24, fontWeight: 900, color: '#111827', lineHeight: 1.2, margin: 0 }}>{scanResult.name}</h2>
                          <p style={{ color: '#6b7280', fontWeight: 500 }}>{scanResult.category} &bull; {scanResult.barcode}</p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', color: '#9ca3af', marginLeft: 4 }}>{t('quantity')}</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                          <div style={{
                            flex: 1, height: 64, borderRadius: 16,
                            background: '#f3f4f6', display: 'flex', alignItems: 'center',
                            padding: '0 24px', gap: 16,
                          }}>
                            <input
                              type="number"
                              value={scanQty}
                              onChange={(e) => setScanQty(Number(e.target.value))}
                              style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 24, fontWeight: 700, color: '#111827', width: '100%' }}
                            />
                            <select
                              value={scanUnit}
                              onChange={(e) => setScanUnit(e.target.value)}
                              style={{ background: 'transparent', border: 'none', outline: 'none', color: '#6b7280', fontWeight: 700 }}
                            >
                              <option value="units">{t('units')}</option>
                              <option value="lbs">{t('lbs')}</option>
                              <option value="kg">kg</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                        <button
                          onClick={() => setScanResult(null)}
                          style={{
                            flex: 1, height: 56, borderRadius: 16,
                            border: '2px solid #f3f4f6', background: 'transparent',
                            fontWeight: 700, color: '#6b7280', cursor: 'pointer',
                          }}
                        >
                          {scanResult.name === t('item_not_found') ? t('cancel') : 'Scan again'}
                        </button>
                        <button
                          onClick={confirmScanAdd}
                          style={{
                            flex: 2, height: 56, borderRadius: 16,
                            backgroundColor: EMERALD, fontWeight: 700, color: 'white',
                            border: 'none', cursor: 'pointer',
                          }}
                        >
                          {scanResult.name === t('item_not_found') ? 'Add new item' : t('confirm_scan')}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Categories */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', color: colors.textTertiary, paddingLeft: 4 }}>Category</p>
              <button
                onClick={addCategory}
                style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, color: EMERALD, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <Plus size={14} />
                {t('add_category')}
              </button>
            </div>
            <div style={{ display: 'flex', overflowX: 'auto', gap: 8, paddingBottom: 8 }}>
              {categories.map((cat) => (
                <div key={cat} style={{ flexShrink: 0 }}>
                  <button
                    onClick={() => handleCategoryInteraction(cat)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 12,
                      whiteSpace: 'nowrap',
                      fontSize: 14,
                      fontWeight: 500,
                      transition: 'all 0.2s',
                      border: '1px solid',
                      display: 'flex', alignItems: 'center', gap: 8,
                      cursor: 'pointer',
                      backgroundColor: activeCategory === cat ? colors.filterActiveBg : colors.filterInactiveBg,
                      color: activeCategory === cat ? colors.filterActiveText : colors.textPrimary,
                      borderColor: activeCategory === cat ? colors.filterActiveBorder : colors.navBorder,
                    }}
                  >
                    {cat === 'All' ? t('all') : cat}
                    {activeCategory === cat && cat !== 'All' && (
                      <span
                        onClick={(e) => { e.stopPropagation(); manageCategory(cat); }}
                        style={{ marginLeft: 4, opacity: 0.6, cursor: 'pointer' }}
                      >
                        <Settings size={14} />
                      </span>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Item List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {activeItems.length > 0 ? activeItems.map(item => {
              const isExpanded = expandedItems.includes(item.id);
              return (
                <div
                  key={item.id}
                  style={{
                    overflow: 'hidden',
                    transition: 'all 0.2s',
                    backgroundColor: isExpanded ? colors.cardBg : colors.navBg,
                    border: `1px solid ${isExpanded ? colors.cardBorderStrong : colors.navBorder}`,
                    borderRadius: 16,
                  }}
                >
                  <div
                    style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, cursor: 'pointer' }}
                    onClick={() => toggleExpand(item.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ fontSize: 18, fontWeight: 900, fontStyle: 'italic', fontFamily: "'Outfit', sans-serif", color: colors.textPrimary, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.name}
                        </h3>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                          <span style={{
                            fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 6,
                            backgroundColor: colors.filterBg, color: colors.textSecondary, border: `1px solid ${colors.navBorder}`,
                          }}>
                            {item.category}
                          </span>
                          {item.tags?.map(tag => (
                            <span key={tag} style={{
                              fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 6,
                              backgroundColor: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa',
                            }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {!isExpanded && (
                        <div style={{ textAlign: 'right', marginLeft: 12, flexShrink: 0 }}>
                          <p style={{ fontSize: 18, fontWeight: 700, color: EMERALD, margin: 0 }}>{item.qty}</p>
                          <p style={{ fontSize: 11, fontWeight: 500, color: colors.textTertiary, margin: 0 }}>{item.unit}</p>
                        </div>
                      )}

                      <div style={{ marginLeft: 8, flexShrink: 0, color: colors.textTertiary }}>
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 8, paddingTop: 16, borderTop: `1px solid ${colors.navBorder}` }} onClick={(e) => e.stopPropagation()}>
                        {/* Basic Info */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <label style={{ fontSize: 12, fontWeight: 500, marginLeft: 4, color: colors.textTertiary }}>Category</label>
                            <select
                              value={item.category}
                              onChange={(e) => updateItem(item.id, { category: e.target.value })}
                              style={{
                                height: 44, padding: '0 12px', borderRadius: 12,
                                border: `1px solid ${colors.navBorder}`, backgroundColor: colors.filterBg,
                                color: colors.textPrimary, fontSize: 14, outline: 'none',
                              }}
                            >
                              {categories.filter(c => c !== 'All').map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <label style={{ fontSize: 12, fontWeight: 500, marginLeft: 4, color: colors.textTertiary }}>Unit type</label>
                            <select
                              value={item.unit}
                              onChange={(e) => updateItem(item.id, { unit: e.target.value })}
                              style={{
                                height: 44, padding: '0 12px', borderRadius: 12,
                                border: `1px solid ${colors.navBorder}`, backgroundColor: colors.filterBg,
                                color: colors.textPrimary, fontSize: 14, outline: 'none',
                              }}
                            >
                              <option value="units">Units</option>
                              <option value="kg">kg</option>
                              <option value="lbs">Lbs</option>
                              <option value="liters">Liters</option>
                            </select>
                          </div>
                        </div>

                        {/* Supply Chain */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <label style={{ fontSize: 12, fontWeight: 500, marginLeft: 4, color: colors.textTertiary }}>Supplier</label>
                            <input
                              type="text"
                              value={item.supplier || ''}
                              onChange={(e) => updateItem(item.id, { supplier: e.target.value })}
                              placeholder="e.g. Sysco"
                              style={{
                                height: 44, padding: '0 12px', borderRadius: 12,
                                border: `1px solid ${colors.navBorder}`, backgroundColor: colors.filterBg,
                                color: colors.textPrimary, fontSize: 14, outline: 'none',
                              }}
                            />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <label style={{ fontSize: 12, fontWeight: 500, marginLeft: 4, color: colors.textTertiary }}>Min stock</label>
                            <input
                              type="number"
                              value={item.min || 0}
                              onChange={(e) => updateItem(item.id, { min: Number(e.target.value) })}
                              style={{
                                height: 44, padding: '0 12px', borderRadius: 12,
                                border: `1px solid ${colors.navBorder}`, backgroundColor: colors.filterBg,
                                color: colors.textPrimary, fontSize: 14, outline: 'none',
                              }}
                            />
                          </div>
                        </div>

                        {/* Pricing */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <label style={{ fontSize: 12, fontWeight: 500, marginLeft: 4, color: colors.textTertiary }}>Cost ($)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.cost ?? ''}
                              onChange={(e) => updateItem(item.id, { cost: e.target.value === '' ? null : Number(e.target.value) })}
                              style={{
                                height: 44, padding: '0 12px', borderRadius: 12,
                                border: `1px solid ${colors.navBorder}`, backgroundColor: colors.filterBg,
                                color: colors.textPrimary, fontSize: 14, outline: 'none',
                              }}
                            />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <label style={{ fontSize: 12, fontWeight: 500, marginLeft: 4, color: EMERALD }}>Price ($)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.price || ''}
                              onChange={(e) => updateItem(item.id, { price: Number(e.target.value) })}
                              style={{
                                height: 44, padding: '0 12px', borderRadius: 12,
                                border: `1px solid ${EMERALD}`, backgroundColor: colors.filterBg,
                                color: colors.textPrimary, fontSize: 14, outline: 'none', fontWeight: 600,
                              }}
                            />
                          </div>
                        </div>

                        {/* Tags */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <label style={{ fontSize: 12, fontWeight: 500, marginLeft: 4, color: colors.textTertiary }}>Tags</label>
                          <input
                            type="text"
                            value={item.tags?.join(', ') || ''}
                            onChange={(e) => updateItem(item.id, { tags: e.target.value.split(',').map(s => s.trim()).filter(s => s !== '') })}
                            placeholder="Low stock, organic"
                            style={{
                              height: 44, padding: '0 12px', borderRadius: 12,
                              border: `1px solid ${colors.navBorder}`, backgroundColor: colors.filterBg,
                              color: colors.textPrimary, fontSize: 14, outline: 'none',
                            }}
                          />
                        </div>

                        {/* Quantity */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <label style={{ fontSize: 12, fontWeight: 500, marginLeft: 4, color: colors.textTertiary }}>Quantity</label>
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            borderRadius: 12, overflow: 'hidden',
                            border: `1px solid ${colors.navBorder}`, backgroundColor: colors.filterBg,
                          }}>
                            <input
                              type="number"
                              value={item.qty}
                              disabled
                              style={{
                                height: 44, flex: 1, background: 'transparent',
                                border: 'none', textAlign: 'center', fontSize: 16,
                                fontWeight: 700, color: EMERALD, outline: 'none',
                              }}
                            />
                            <button
                              onClick={() => updateQty(item.id, 1)}
                              style={{
                                height: 44, padding: '0 16px',
                                backgroundColor: EMERALD, color: 'white',
                                fontWeight: 600, fontSize: 14,
                                display: 'flex', alignItems: 'center', gap: 8,
                                border: 'none', cursor: 'pointer',
                              }}
                            >
                              <Plus size={16} />
                              Restock
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            }) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', textAlign: 'center', color: colors.textTertiary }}>
                <Package size={48} style={{ marginBottom: 12, color: colors.emptyIcon }} />
                <p style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary }}>
                  {activeCategory === 'All' ? 'No items found' : `Empty "${activeCategory}" category`}
                </p>
                <p style={{ fontSize: 12, marginTop: 4, opacity: 0.6 }}>
                  Start building your inventory by adding your first item.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STOCK TAB */}
      {activeTab === 'stock' && (
        <div style={{ color: colors.textSecondary, textAlign: 'center', padding: '40px 0' }}>
          <Package size={40} style={{ marginBottom: 12, color: colors.emptyIcon }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary }}>Stock view</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>Detailed stock levels coming soon.</p>
        </div>
      )}

      {/* AUDIT TAB */}
      {activeTab === 'audit' && (
        <div style={{ color: colors.textSecondary, textAlign: 'center', padding: '40px 0' }}>
          <Package size={40} style={{ marginBottom: 12, color: colors.emptyIcon }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary }}>Audit view</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>Transaction history coming soon.</p>
        </div>
      )}
    </div>
  );
}
