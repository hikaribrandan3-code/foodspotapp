import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ChevronDown, ChevronUp, Plus, Settings, Camera, X, Check, Package } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBusiness } from '../contexts/BusinessContext';
import { translations } from '../lib/translations';
import { supabase } from '../../lib/supabaseClient.js';
import { Html5QrcodeScanner } from 'html5-qrcode';

const BLUE = '#3b82f6';

export const InventoryEntry: React.FC = () => {
  const { language } = useLanguage();
  const { businessId } = useBusiness();
  const t = (key: string) => (translations as any)[key]?.[language] || key;

  const [expandedItems, setExpandedItems] = useState<string[]>(['1']);
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState(['All', 'Food', 'Drinks', 'Cups', 'Plates', 'Condiments', 'Chips']);
  const [activeCategory, setActiveCategory] = useState('All');
  const [lastClick, setLastClick] = useState<{ id: string, time: number } | null>(null);

  // Scanner State
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState<{ name: string; category: string; barcode: string; price: number; cost?: number; supplier?: string; unit?: string } | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanQty, setScanQty] = useState(1);
  const [scanUnit, setScanUnit] = useState('units');

  const [items, setItems] = useState([
    { id: '1', name: 'Tomato Soup', category: 'Food', min: 12, max: 48, qty: 24, unit: 'units', expiryDate: '', location: 'Shelf A1', supplier: 'Sysco', cost: 1.25, price: 5.99, barcode: '123456', tags: [] },
    { id: '2', name: 'Black Beans', category: 'Food', tags: ['Low stock'], qty: 8, unit: 'units', expiryDate: '', location: 'Shelf A2', supplier: 'Goya', cost: 0.85, price: 2.50, barcode: '789012' },
    { id: '3', name: 'Jasmine Rice', category: 'Food', qty: 15, unit: 'lbs', expiryDate: '', location: 'Pantry Rack', supplier: 'Local Bulk', cost: 2.10, price: 12.00, barcode: '345678', tags: [] },
    { id: '4', name: 'Cola 330ml', category: 'Drinks', min: 24, max: 120, qty: 48, unit: 'units', expiryDate: '', location: 'Fridge 1', supplier: 'Coke', cost: 0.45, price: 1.50, barcode: '901234', tags: [] },
  ]);

  // Query Supabase for scanned barcode
  const lookupBarcode = async (barcode: string) => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('name, category, price, cost, supplier, unit')
        .eq('barcode', barcode)
        .eq('business_id', businessId)
        .single();

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

    // Persist to Supabase
    if (businessId && newItem.barcode) {
      try {
        await supabase
          .from('inventory')
          .insert({
            business_id: businessId,
            menu_item_id: null,
            barcode: newItem.barcode,
            cost_per_unit: newItem.cost,
            quantity_available: newItem.qty,
            reorder_level: newItem.min,
            safety_stock: Math.floor(newItem.min / 2),
            max_stock: newItem.max,
            storage_location: newItem.location,
            supplier: newItem.supplier
          });
      } catch (err) {
        console.error('Failed to save inventory item:', err);
      }
    }
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
  };

  const updateQty = (id: string, delta: number) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, qty: Math.max(0, item.qty + delta) } : item
    ));
  };

  const toggleExpand = (id: string) => {
    setExpandedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
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

  const manageCategory = (cat: string) => {
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

  const handleCategoryInteraction = (cat: string) => {
    if (cat === 'All') {
      setActiveCategory('All');
      return;
    }
    const now = Date.now();
    if (lastClick && lastClick.id === cat && (now - lastClick.time) < 500) {
      manageCategory(cat);
      setLastClick(null);
    } else {
      setActiveCategory(cat);
      setLastClick({ id: cat, time: now });
    }
  };

  return (
    <div className="flex flex-col gap-6 px-4 pt-4 pb-24" style={{ backgroundColor: 'var(--app-bg)', color: 'var(--text-primary)' }}>
      {/* Search & Add */}
      <div className="flex gap-2">
        <div className="relative h-12 rounded-xl flex items-center px-3 gap-3 flex-1 border transition-all focus-within:ring-2" style={{ backgroundColor: 'var(--counter-bg)', borderColor: 'var(--counter-border)', '--tw-ring-color': BLUE } as any}>
          <Search size={18} style={{ color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            placeholder={t('search_items')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none focus:ring-0 w-full text-sm outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>
        <button
          onClick={() => setShowScanner(true)}
          className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm active:scale-95 transition-transform shrink-0"
          style={{ backgroundColor: BLUE, color: '#fff' }}
        >
          <Camera size={20} />
        </button>
        <button
          onClick={() => {
            const name = prompt(t('item_name'));
            if (name) addItem({ name, qty: 0 });
          }}
          className="w-12 h-12 rounded-xl border flex items-center justify-center shadow-sm active:scale-95 transition-transform shrink-0"
          style={{ backgroundColor: 'var(--nav-bg)', borderColor: 'var(--nav-border)', color: 'var(--text-primary)' }}
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
              onClick={() => {
                setShowScanner(false);
                setScanResult(null);
              }}
              className="absolute top-12 right-6 p-2 rounded-full bg-white/10 text-white"
            >
              <X size={24} />
            </button>

            <div className="w-full max-w-sm flex flex-col gap-6">
              {scanLoading ? (
                <div className="flex flex-col items-center justify-center gap-4 py-12">
                  <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                  <p className="text-white/60 text-sm font-medium">Looking up item...</p>
                </div>
              ) : !scanResult ? (
                <>
                  <div className="text-center">
                    <h2 className="text-white text-2xl font-bold mb-2">{t('scanning')}</h2>
                    <p className="text-white/60">{t('point_camera')}</p>
                  </div>
                  <div id="reader" className="w-full aspect-square overflow-hidden rounded-3xl border-2 bg-white/5" style={{ borderColor: BLUE }}></div>
                  <p className="text-center text-white/40 text-sm">Allow camera access when prompted</p>
                </>
              ) : (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="bg-white rounded-[32px] p-8 flex flex-col gap-6 shadow-2xl"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl text-white flex items-center justify-center" style={{ backgroundColor: BLUE }}>
                      {scanResult.name === t('item_not_found') ? <Search size={32} /> : <Check size={32} />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold tracking-wider text-gray-400">{t('found')}</p>
                      <h2 className="text-2xl font-black text-black leading-tight">{scanResult.name}</h2>
                      <p className="text-gray-500 font-medium">{scanResult.category} &bull; {scanResult.barcode}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold tracking-wider text-gray-400 ml-1">{t('quantity')}</label>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-16 rounded-2xl bg-gray-100 flex items-center px-6 gap-4">
                        <input
                          type="number"
                          value={scanQty}
                          onChange={(e) => setScanQty(Number(e.target.value))}
                          className="bg-transparent border-none focus:ring-0 text-2xl font-bold text-black w-full"
                        />
                        <select
                          value={scanUnit}
                          onChange={(e) => setScanUnit(e.target.value)}
                          className="bg-transparent border-none focus:ring-0 text-gray-500 font-bold"
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
                      className="flex-1 h-14 rounded-2xl border-2 border-gray-100 font-bold text-gray-500 active:scale-95 transition-all"
                    >
                      {scanResult.name === t('item_not_found') ? t('cancel') : 'Scan again'}
                    </button>
                    <button
                      onClick={confirmScanAdd}
                      className="flex-[2] h-14 rounded-2xl font-bold text-white shadow-lg active:scale-95 transition-all"
                      style={{ backgroundColor: BLUE }}
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

      {/* Categories Section */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold tracking-wider px-1" style={{ color: 'var(--text-tertiary)' }}>{t('category')}</p>
          <button
            onClick={addCategory}
            className="text-sm font-semibold flex items-center gap-1 active:opacity-60"
            style={{ color: BLUE }}
          >
            <Plus size={14} />
            {t('add_category')}
          </button>
        </div>
        <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide -mx-4 px-4">
          {categories.map((cat) => (
            <div key={cat} className="relative flex-shrink-0">
              <button
                onClick={() => handleCategoryInteraction(cat)}
                className="px-4 py-2 rounded-xl whitespace-nowrap text-sm font-medium transition-all border flex items-center gap-2"
                style={{
                  backgroundColor: activeCategory === cat ? 'var(--filter-active-bg)' : 'var(--filter-inactive-bg)',
                  color: activeCategory === cat ? 'var(--filter-active-text)' : 'var(--text-primary)',
                  borderColor: activeCategory === cat ? 'var(--filter-active-border, var(--card-border))' : 'var(--nav-border)',
                }}
              >
                {cat === 'All' ? t('all') : cat}
                {activeCategory === cat && cat !== 'All' && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      manageCategory(cat);
                    }}
                    className="ml-1 opacity-60 hover:opacity-100"
                  >
                    <Settings size={14} />
                  </div>
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
              className="overflow-hidden transition-all active:scale-[0.99]"
              style={{
                backgroundColor: isExpanded ? 'var(--card-bg)' : 'var(--nav-bg)',
                borderColor: isExpanded ? 'var(--card-border-strong)' : 'var(--nav-border)',
                borderWidth: '1px',
                borderRadius: '16px',
              }}
            >
              <div
                className="p-4 flex flex-col gap-3"
                onClick={() => toggleExpand(item.id)}
              >
                <div className="flex items-start justify-between w-full">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{item.name}</h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-md border" style={{ backgroundColor: 'var(--filter-bg)', color: 'var(--text-secondary)', borderColor: 'var(--nav-border)' }}>
                        {item.category}
                      </span>
                      {item.tags?.map(tag => (
                        <span key={tag} className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-orange-100 text-orange-600 border border-orange-200">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {!isExpanded && (
                    <div className="text-right ml-3 shrink-0">
                      <p className="text-lg font-bold" style={{ color: BLUE }}>
                        {item.qty}
                      </p>
                      <p className="text-[11px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
                        {item.unit}
                      </p>
                    </div>
                  )}

                  <div className="ml-2 shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="flex flex-col gap-5 mt-2 pt-4 border-t" style={{ borderColor: 'var(--nav-border)' }} onClick={(e) => e.stopPropagation()}>
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium ml-1" style={{ color: 'var(--text-tertiary)' }}>{t('category')}</label>
                        <select
                          value={item.category}
                          onChange={(e) => updateItem(item.id, { category: e.target.value })}
                          className="h-11 px-3 rounded-xl border text-sm outline-none bg-transparent"
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
                          className="h-11 px-3 rounded-xl border text-sm outline-none bg-transparent"
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
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium ml-1" style={{ color: 'var(--text-tertiary)' }}>{t('supplier')}</label>
                        <input
                          type="text"
                          value={(item as any).supplier || ''}
                          onChange={(e) => updateItem(item.id, { supplier: e.target.value })}
                          placeholder="e.g. Sysco"
                          className="h-11 px-3 rounded-xl border text-sm outline-none bg-transparent"
                          style={{ backgroundColor: 'var(--filter-bg)', borderColor: 'var(--nav-border)', color: 'var(--text-primary)' }}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium ml-1" style={{ color: 'var(--text-tertiary)' }}>{t('min_stock')}</label>
                        <input
                          type="number"
                          value={item.min || 0}
                          onChange={(e) => updateItem(item.id, { min: Number(e.target.value) })}
                          className="h-11 px-3 rounded-xl border text-sm outline-none bg-transparent"
                          style={{ backgroundColor: 'var(--filter-bg)', borderColor: 'var(--nav-border)', color: 'var(--text-primary)' }}
                        />
                      </div>
                    </div>

                    {/* Pricing */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium ml-1" style={{ color: 'var(--text-tertiary)' }}>{t('cost')}</label>
                        <input
                          type="number"
                          step="0.01"
                          value={(item as any).cost ?? ''}
                          onChange={(e) => updateItem(item.id, { cost: e.target.value === '' ? null : Number(e.target.value) })}
                          className="h-11 px-3 rounded-xl border text-sm outline-none bg-transparent"
                          style={{ backgroundColor: 'var(--filter-bg)', borderColor: 'var(--nav-border)', color: 'var(--text-primary)' }}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium ml-1" style={{ color: BLUE }}>{t('price')}</label>
                        <input
                          type="number"
                          step="0.01"
                          value={(item as any).price || ''}
                          onChange={(e) => updateItem(item.id, { price: Number(e.target.value) })}
                          className="h-11 px-3 rounded-xl border text-sm outline-none bg-transparent font-semibold"
                          style={{ backgroundColor: 'var(--filter-bg)', borderColor: BLUE, color: 'var(--text-primary)' }}
                        />
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium ml-1" style={{ color: 'var(--text-tertiary)' }}>{t('tags')}</label>
                      <input
                        type="text"
                        value={item.tags?.join(', ') || ''}
                        onChange={(e) => updateItem(item.id, { tags: e.target.value.split(',').map(s => s.trim()).filter(s => s !== '') })}
                        placeholder="Low stock, organic"
                        className="h-11 px-3 rounded-xl border text-sm outline-none bg-transparent"
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
                          style={{ color: BLUE }}
                        />
                        <button
                          onClick={() => updateQty(item.id, 1)}
                          className="h-11 px-4 text-white font-semibold text-sm flex items-center gap-2 active:opacity-80 transition-opacity"
                          style={{ backgroundColor: BLUE }}
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
              {activeCategory === 'All' ? 'No items found' : `Empty "${activeCategory}" category`}
            </p>
            <p className="text-xs mt-1 opacity-60">
              Start building your inventory by adding your first item.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
