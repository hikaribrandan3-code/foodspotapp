import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ChevronDown, ChevronUp, Plus, Settings, Camera, X, Check, Package } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBusiness } from '../contexts/BusinessContext';
import { translations } from '../lib/translations';
import { supabase, updateBranding } from '../../lib/supabaseClient.js';
import { deepMergeAppConfig } from '../../utils/appConfig';
import { Html5QrcodeScanner } from 'html5-qrcode';

const GREEN = '#059669';

export const InventoryEntry: React.FC = () => {
  const { language } = useLanguage();
  const { businessId } = useBusiness();
  const t = (key: string) => (translations as any)[key]?.[language] || key;

  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState(['All', 'Food', 'Drinks', 'Cups', 'Plates', 'Condiments', 'Chips']);
  const [activeCategory, setActiveCategory] = useState('All');
  const [lastClick, setLastClick] = useState<{ id: string, time: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<{ message: string; error?: boolean } | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Scanner State
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState<{ name: string; category: string; barcode: string; price: number; cost?: number; supplier?: string; unit?: string } | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanQty, setScanQty] = useState(1);
  const [scanUnit, setScanUnit] = useState('units');

  const [items, setItems] = useState<any[]>([]);
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load inventory from branding.app_config on mount
  useEffect(() => {
    if (!businessId) return;
    const load = async () => {
      const { data } = await supabase
        .from('branding')
        .select('app_config')
        .eq('business_id', businessId)
        .maybeSingle();
      const invConfig = data?.app_config?.inventory || {};
      setItems(invConfig.items || []);
      setCategories(invConfig.categories || ['All', 'Food', 'Drinks', 'Cups', 'Plates', 'Condiments', 'Chips']);
      setIsLoading(false);
    };
    load();
  }, [businessId]);

  // Debounced auto-save to branding.app_config
  useEffect(() => {
    if (!businessId || isLoading || !isDirty) return;
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = setTimeout(() => {
      setSaveStatus({ message: t('saving') || 'Saving...' });
      const payload = {
        app_config: deepMergeAppConfig({}, {
          inventory: { items, categories }
        })
      };
      updateBranding(payload, businessId)
        .then(() => {
          setSaveStatus({ message: t('saved') || 'Saved' });
          setIsDirty(false);
          if (saveStatusTimeoutRef.current) clearTimeout(saveStatusTimeoutRef.current);
          saveStatusTimeoutRef.current = setTimeout(() => setSaveStatus(null), 2000);
        })
        .catch(err => {
          console.error('[InventoryEntry] Save failed:', err);
          setSaveStatus({ error: true, message: t('save_failed') || 'Save failed' });
          if (saveStatusTimeoutRef.current) clearTimeout(saveStatusTimeoutRef.current);
          saveStatusTimeoutRef.current = setTimeout(() => setSaveStatus(null), 3000);
        });
    }, 1000);
    return () => {
      if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
      if (saveStatusTimeoutRef.current) clearTimeout(saveStatusTimeoutRef.current);
    };
  }, [items, categories, businessId, isLoading, isDirty]);

  // Query Supabase for scanned barcode
  const lookupBarcode = async (barcode: string) => {
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

  const addItem = async (item: Partial<any> & { name: string; qty: number }) => {
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
    setIsDirty(true);
  };

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
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
          async (decodedText: string) => {
            setScanLoading(true);
            const foundItem = await lookupBarcode(decodedText);
            setScanLoading(false);
            setScanResult(foundItem ?
              { ...foundItem, barcode: decodedText } :
              { name: t('item_not_found'), category: t('uncategorized'), barcode: decodedText, price: 0 }
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
      scanner?.clear().catch(() => {});
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

  const updateItem = (id: string, updates: Partial<any>) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, ...updates } : item
    ));
    setIsDirty(true);
  };

  const updateQty = (id: string, delta: number) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, qty: Math.max(0, item.qty + delta) } : item
    ));
    setIsDirty(true);
  };

  const toggleExpand = (id: string) => {
    setExpandedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const addCategory = () => {
    const name = prompt(t('add_category'));
    if (name) {
      setCategories([...categories, name]);
      setIsDirty(true);
    }
  };

  const activeItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const manageCategory = (cat: string) => {
    const action = prompt(`${t('edit_category')} "${cat}"? \n1. ${t('rename')}\n2. ${t('delete')}\n3. Cancel`, "1");
    if (action === "1") {
      const newName = prompt(`${t('rename')} "${cat}" to:`, cat);
      if (newName && newName !== cat) {
        setCategories(prev => prev.map(c => c === cat ? newName : c));
        setItems(prev => prev.map(item => item.category === cat ? { ...item, category: newName } : item));
        setActiveCategory(newName);
        setIsDirty(true);
      }
    } else if (action === "2") {
      if (confirm(`${t('delete')} category "${cat}"?`)) {
        const firstCat = categories.find(c => c !== cat) || t('uncategorized');
        setCategories(prev => prev.filter(c => c !== cat));
        setItems(prev => prev.map(item => item.category === cat ? { ...item, category: firstCat } : item));
        setActiveCategory(firstCat);
        setIsDirty(true);
      }
    }
  };

  const handleCategoryInteraction = (cat: string) => {
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

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen pb-20 items-center justify-center" style={{ backgroundColor: 'var(--app-bg)', color: 'var(--text-primary)' }}>
        <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{t('loading') || 'Loading...'}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen pb-20" style={{ backgroundColor: 'var(--app-bg)', color: 'var(--text-primary)', position: 'relative' }}>
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

      <main className="px-4 pt-2 flex flex-col gap-4">
        {/* Search & Add */}
        <div className="flex gap-2">
          <div className="relative h-12 rounded-xl flex items-center px-3 gap-2 flex-1 border" style={{ borderColor: 'var(--counter-border)', backgroundColor: 'var(--counter-bg)' }}>
            <Search size={18} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
            <input
              type="text"
              placeholder={t('search_items')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-sm"
              style={{ color: 'var(--text-primary)' }}
            />
          </div>
          <button
            onClick={() => setShowScanner(true)}
            className="w-12 h-12 rounded-xl flex items-center justify-center border-none cursor-pointer shrink-0"
            style={{ backgroundColor: GREEN, color: '#fff' }}
          >
            <Camera size={20} />
          </button>
          <button
            onClick={() => {
              const name = prompt(t('item_name'));
              if (name) addItem({ name, qty: 0 });
            }}
            className="w-12 h-12 rounded-xl flex items-center justify-center cursor-pointer shrink-0 border"
            style={{ backgroundColor: 'var(--nav-bg)', color: 'var(--text-primary)', borderColor: 'var(--nav-border)' }}
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
              className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-6"
            >
              <button
                onClick={() => { setShowScanner(false); setScanResult(null); }}
                className="absolute top-12 right-6 p-2 rounded-full border-none cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}
              >
                <X size={24} />
              </button>

              <div className="w-full max-w-[400px] flex flex-col gap-6">
                {scanLoading ? (
                  <div className="flex flex-col items-center gap-4 py-12">
                    <div className="w-12 h-12 rounded-full border-4 border-white/20 border-t-white animate-spin" />
                    <p className="text-white/60 text-sm font-medium">Looking up item...</p>
                  </div>
                ) : !scanResult ? (
                  <>
                    <div className="text-center">
                      <h2 className="text-white text-2xl font-bold mb-2">{t('scanning')}</h2>
                      <p className="text-white/60">{t('point_camera')}</p>
                    </div>
                    <div id="reader" className="w-full aspect-square overflow-hidden rounded-3xl border-2" style={{ borderColor: GREEN, background: 'rgba(255,255,255,0.05)' }} />
                    <p className="text-center text-white/40 text-sm">Allow camera access when prompted</p>
                  </>
                ) : (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="bg-white rounded-[32px] p-8 flex flex-col gap-6"
                    style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: GREEN, color: 'white' }}>
                        {scanResult.name === t('item_not_found') ? <Search size={32} /> : <Check size={32} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold tracking-wider text-gray-400">{t('found')}</p>
                        <h2 className="text-2xl font-black text-gray-900 leading-tight truncate">{scanResult.name}</h2>
                        <p className="text-gray-500 font-medium">{scanResult.category} &bull; {scanResult.barcode}</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold tracking-wider text-gray-400 ml-1">{t('quantity')}</label>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 h-16 rounded-2xl flex items-center px-6 gap-4" style={{ background: '#f3f4f6' }}>
                          <input
                            type="number"
                            value={scanQty}
                            onChange={(e) => setScanQty(Number(e.target.value))}
                            className="bg-transparent border-none outline-none text-2xl font-bold text-gray-900 w-full"
                          />
                          <select
                            value={scanUnit}
                            onChange={(e) => setScanUnit(e.target.value)}
                            className="bg-transparent border-none outline-none text-gray-500 font-bold"
                          >
                            <option value="units">{t('units')}</option>
                            <option value="lbs">{t('lbs')}</option>
                            <option value="kg">kg</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-2">
                      <button
                        onClick={() => setScanResult(null)}
                        className="flex-1 h-14 rounded-2xl border-2 font-bold text-gray-500 cursor-pointer"
                        style={{ borderColor: '#f3f4f6', background: 'transparent' }}
                      >
                        {scanResult.name === t('item_not_found') ? t('cancel') : 'Scan again'}
                      </button>
                      <button
                        onClick={confirmScanAdd}
                        className="flex-[2] h-14 rounded-2xl font-bold text-white border-none cursor-pointer"
                        style={{ backgroundColor: GREEN }}
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
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold tracking-wider uppercase pl-1" style={{ color: 'var(--text-tertiary)' }}>Category</p>
            <button
              onClick={addCategory}
              className="text-sm font-semibold flex items-center gap-1 border-none cursor-pointer bg-transparent"
              style={{ color: GREEN }}
            >
              <Plus size={14} />
              {t('add_category')}
            </button>
          </div>
          <div className="flex overflow-x-auto gap-2 pb-2">
            {categories.map((cat) => (
              <div key={cat} className="shrink-0">
                <button
                  onClick={() => handleCategoryInteraction(cat)}
                  className="px-4 py-2 rounded-xl whitespace-nowrap text-sm font-medium transition-all border flex items-center gap-2 cursor-pointer"
                  style={{
                    backgroundColor: activeCategory === cat ? 'var(--filter-active-bg)' : 'var(--filter-inactive-bg)',
                    color: activeCategory === cat ? 'var(--filter-active-text)' : 'var(--text-primary)',
                    borderColor: activeCategory === cat ? 'var(--filter-active-border)' : 'var(--nav-border)',
                  }}
                >
                  {cat === 'All' ? t('all') : cat}
                  {activeCategory === cat && cat !== 'All' && (
                    <span
                      onClick={(e) => { e.stopPropagation(); manageCategory(cat); }}
                      className="ml-1 opacity-60 cursor-pointer"
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
        <div className="flex flex-col gap-3">
          {activeItems.length > 0 ? activeItems.map(item => {
            const isExpanded = expandedItems.includes(item.id);
            return (
              <div
                key={item.id}
                className="overflow-hidden transition-all"
                style={{
                  backgroundColor: isExpanded ? 'var(--card-bg)' : 'var(--nav-bg)',
                  border: `1px solid ${isExpanded ? 'var(--card-border-strong)' : 'var(--nav-border)'}`,
                  borderRadius: 16,
                }}
              >
                <div
                  className="p-4 pr-6 flex flex-col gap-3 cursor-pointer"
                  onClick={() => toggleExpand(item.id)}
                >
                  <div className="flex items-start justify-between w-full">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-black italic truncate" style={{ fontFamily: "'Outfit', sans-serif", color: 'var(--text-primary)' }}>
                        {item.name}
                      </h3>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md border" style={{ backgroundColor: 'var(--filter-bg)', color: 'var(--text-secondary)', borderColor: 'var(--nav-border)' }}>
                          {item.category}
                        </span>
                        {item.tags?.map((tag: string) => (
                          <span key={tag} className="text-[11px] font-medium px-2 py-0.5 rounded-md border" style={{ backgroundColor: '#fff7ed', color: '#ea580c', borderColor: '#fed7aa' }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {!isExpanded && (
                      <div className="text-right ml-3 shrink-0">
                        <p className="text-lg font-bold" style={{ color: GREEN }}>{item.qty}</p>
                        <p className="text-[11px] font-medium" style={{ color: 'var(--text-tertiary)' }}>{item.unit}</p>
                      </div>
                    )}

                    <div className="ml-2 shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="flex flex-col gap-5 mt-2 pt-4 border-t" style={{ borderColor: 'var(--nav-border)' }} onClick={(e) => e.stopPropagation()}>
                      {/* Basic Info */}
                      <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium ml-1" style={{ color: 'var(--text-tertiary)' }}>{t('category')}</label>
                          <select
                            value={item.category}
                            onChange={(e) => updateItem(item.id, { category: e.target.value })}
                            className="h-11 px-3 rounded-xl border text-sm outline-none bg-transparent w-full"
                            style={{ backgroundColor: 'var(--filter-bg)', borderColor: 'var(--nav-border)', color: 'var(--text-primary)' }}
                          >
                            {categories.filter(c => c !== 'All').map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium ml-1" style={{ color: 'var(--text-tertiary)' }}>{t('unit_type')}</label>
                          <select
                            value={item.unit}
                            onChange={(e) => updateItem(item.id, { unit: e.target.value })}
                            className="h-11 px-3 rounded-xl border text-sm outline-none bg-transparent w-full"
                            style={{ backgroundColor: 'var(--filter-bg)', borderColor: 'var(--nav-border)', color: 'var(--text-primary)' }}
                          >
                            <option value="units">{t('units')}</option>
                            <option value="kg">kg</option>
                            <option value="lbs">{t('lbs')}</option>
                            <option value="liters">Liters</option>
                          </select>
                        </div>
                      </div>

                      {/* Supply Chain */}
                      <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium ml-1" style={{ color: 'var(--text-tertiary)' }}>{t('supplier')}</label>
                          <input
                            type="text"
                            value={(item as any).supplier || ''}
                            onChange={(e) => updateItem(item.id, { supplier: e.target.value })}
                            placeholder="e.g. Sysco"
                            className="h-11 px-3 rounded-xl border text-sm outline-none bg-transparent w-full"
                            style={{ backgroundColor: 'var(--filter-bg)', borderColor: 'var(--nav-border)', color: 'var(--text-primary)' }}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium ml-1" style={{ color: 'var(--text-tertiary)' }}>{t('min_stock')}</label>
                          <input
                            type="number"
                            value={item.min || 0}
                            onChange={(e) => updateItem(item.id, { min: Number(e.target.value) })}
                            className="h-11 px-3 rounded-xl border text-sm outline-none bg-transparent w-full"
                            style={{ backgroundColor: 'var(--filter-bg)', borderColor: 'var(--nav-border)', color: 'var(--text-primary)' }}
                          />
                        </div>
                      </div>

                      {/* Pricing */}
                      <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium ml-1" style={{ color: 'var(--text-tertiary)' }}>{t('cost')}</label>
                          <input
                            type="number"
                            step="0.01"
                            value={(item as any).cost ?? ''}
                            onChange={(e) => updateItem(item.id, { cost: e.target.value === '' ? null : Number(e.target.value) })}
                            className="h-11 px-3 rounded-xl border text-sm outline-none bg-transparent w-full"
                            style={{ backgroundColor: 'var(--filter-bg)', borderColor: 'var(--nav-border)', color: 'var(--text-primary)' }}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium ml-1" style={{ color: GREEN }}>{t('price')}</label>
                          <input
                            type="number"
                            step="0.01"
                            value={(item as any).price || ''}
                            onChange={(e) => updateItem(item.id, { price: Number(e.target.value) })}
                            className="h-11 px-3 rounded-xl border text-sm outline-none bg-transparent font-semibold w-full"
                            style={{ backgroundColor: 'var(--filter-bg)', borderColor: GREEN, color: 'var(--text-primary)' }}
                          />
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium ml-1" style={{ color: 'var(--text-tertiary)' }}>{t('tags')}</label>
                        <input
                          type="text"
                          value={item.tags?.join(', ') || ''}
                          onChange={(e) => updateItem(item.id, { tags: e.target.value.split(',').map((s: string) => s.trim()).filter((s: string) => s !== '') })}
                          placeholder="Low stock, organic"
                          className="h-11 px-3 rounded-xl border text-sm outline-none bg-transparent w-full"
                          style={{ backgroundColor: 'var(--filter-bg)', borderColor: 'var(--nav-border)', color: 'var(--text-primary)' }}
                        />
                      </div>

                      {/* Quantity */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium ml-1" style={{ color: 'var(--text-tertiary)' }}>{t('quantity')}</label>
                        <div className="flex items-center gap-2 rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--filter-bg)', borderColor: 'var(--nav-border)' }}>
                          <input
                            type="number"
                            value={item.qty}
                            disabled
                            className="h-11 flex-1 bg-transparent border-none text-center text-base font-bold outline-none"
                            style={{ color: GREEN }}
                          />
                          <button
                            onClick={() => updateQty(item.id, 1)}
                            className="h-11 px-4 text-white font-semibold text-sm flex items-center gap-2 active:opacity-80 transition-opacity border-none cursor-pointer"
                            style={{ backgroundColor: GREEN }}
                          >
                            <Plus size={16} />
                            {t('restock')}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          }) : (
            <div className="flex flex-col items-center justify-center py-16 text-center" style={{ color: 'var(--text-tertiary)' }}>
              <Package size={48} className="mb-3" style={{ color: 'var(--empty-icon)' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {activeCategory === 'All' ? 'No items in stock' : `Empty "${activeCategory}" category`}
              </p>
              <p className="text-xs mt-1 opacity-60">
                Start building your inventory by adding your first item.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
