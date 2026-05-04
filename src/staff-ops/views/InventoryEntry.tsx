import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ChevronDown, ChevronUp, User, Plus, Settings, Camera, X, Check } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import { useBusiness } from '../contexts/BusinessContext';
import { translations } from '../lib/translations';
import { Html5QrcodeScanner } from 'html5-qrcode';

export const InventoryEntry: React.FC = () => {
  const { language } = useLanguage();
  const { businessId } = useBusiness();
  const t = (key: string) => (translations as any)[language]?.[key] || key;

  const [expandedItems, setExpandedItems] = useState<string[]>(['1']);
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState(['All', 'Food', 'Drinks', 'Cups', 'Plates', 'Condiments', 'Chips']);
  const [activeCategory, setActiveCategory] = useState('All');
  const [lastClick, setLastClick] = useState<{ id: string, time: number } | null>(null);
  
  // Scanner State
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState<{ name: string; category: string; barcode: string; price: number } | null>(null);
  const [scanQty, setScanQty] = useState(1);
  const [scanUnit, setScanUnit] = useState('units');

  const [items, setItems] = useState([
    { id: '1', name: 'Tomato Soup', category: 'Food', min: 12, max: 48, qty: 24, unit: 'units', expiryDate: '', location: 'Shelf A1', supplier: 'Sysco', cost: 1.25, price: 5.99, barcode: '123456', tags: [] },
    { id: '2', name: 'Black Beans', category: 'Food', tags: ['LOW STOCK'], qty: 8, unit: 'units', expiryDate: '', location: 'Shelf A2', supplier: 'Goya', cost: 0.85, price: 2.50, barcode: '789012' },
    { id: '3', name: 'Jasmine Rice', category: 'Food', qty: 15, unit: 'lbs', expiryDate: '', location: 'Pantry Rack', supplier: 'Local Bulk', cost: 2.10, price: 12.00, barcode: '345678', tags: [] },
    { id: '4', name: 'Cola 330ml', category: 'Drinks', min: 24, max: 120, qty: 48, unit: 'units', expiryDate: '', location: 'Fridge 1', supplier: 'Coke', cost: 0.45, price: 1.50, barcode: '901234', tags: [] },
  ]);

  // Mock lookup for scanned barcodes
  const lookupBarcode = (barcode: string) => {
    // In real app, this would be a Supabase query: SELECT * FROM menu_items WHERE barcode = scanned_value
    const mockDb: Record<string, { name: string; category: string; price: number }> = {
      '123456': { name: 'Tomato Soup', category: 'Food', price: 5.99 },
      '000111': { name: 'Fresh Avocado', category: 'Food', price: 1.50 },
      '222333': { name: 'Napkins (Pack 500)', category: 'Paper Goods', price: 12.99 },
    };
    return mockDb[barcode] || null;
  };

  const addItem = (name: string, category?: string, qty: number = 0, barcode: string = '') => {
    const newItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: name,
      category: category || (activeCategory === 'All' ? categories[1] || 'Food' : activeCategory),
      qty: qty,
      min: 0,
      max: 100,
      unit: scanUnit || 'units',
      expiryDate: '',
      location: '',
      supplier: '',
      cost: 0,
      price: scanResult?.price || 0,
      barcode: barcode,
      tags: []
    };
    setItems([newItem, ...items]);
    setExpandedItems([newItem.id]);
  };

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    if (showScanner && !scanResult) {
      scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );

      const onScanSuccess = (decodedText: string) => {
        console.log(`Code matched = ${decodedText}`);
        const foundItem = lookupBarcode(decodedText);
        if (foundItem) {
          setScanResult({ ...foundItem, barcode: decodedText });
        } else {
          // If not found, we could show a manual form or a message
          setScanResult({ name: t('item_not_found'), category: t('uncategorized'), barcode: decodedText, price: 0 });
        }
        scanner?.clear();
      };

      const onScanFailure = (error: any) => {
        // console.warn(`Code scan error = ${error}`);
      };

      scanner.render(onScanSuccess, onScanFailure);
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(e => console.error("Failed to clear scanner", e));
      }
    };
  }, [showScanner, scanResult]);

  const confirmScanAdd = () => {
    if (scanResult) {
      if (scanResult.name === t('item_not_found')) {
        const name = prompt(t('item_name'));
        if (name) addItem(name, 'Food', scanQty, scanResult.barcode);
      } else {
        addItem(scanResult.name, scanResult.category, scanQty, scanResult.barcode);
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
    <div className="flex flex-col min-h-screen pb-20" style={{ backgroundColor: 'var(--app-bg)', color: 'var(--text-primary)' }}>
      <main className="px-4 pt-2 flex flex-col gap-6">
        {/* Search & Add */}
        <div className="flex gap-2">
          <div className="relative h-[48px] rounded-xl flex items-center px-4 gap-3 flex-1 border shadow-sm transition-all focus-within:ring-2 focus-within:ring-[var(--accent)]" style={{ backgroundColor: 'var(--filter-bg)', borderColor: 'var(--nav-border)' }}>
            <Search size={20} className="text-[var(--text-tertiary)]" />
            <input 
              type="text" 
              placeholder={t('search_items')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none focus:ring-0 w-full text-[17px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none"
            />
          </div>
          <button 
            onClick={() => setShowScanner(true)}
            className="w-[48px] h-[48px] rounded-xl bg-[var(--accent)] text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform shrink-0"
          >
            <Camera size={24} />
          </button>
          <button 
            onClick={() => {
              const name = prompt(t('item_name'));
              if (name) addItem(name);
            }}
            className="w-[48px] h-[48px] rounded-xl border flex items-center justify-center shadow-sm active:scale-95 transition-transform shrink-0"
            style={{ backgroundColor: 'var(--nav-bg)', borderColor: 'var(--nav-border)', color: 'var(--text-primary)' }}
          >
            <Plus size={24} />
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

              <div className="w-full max-w-sm flex flex-col gap-8">
                {!scanResult ? (
                  <>
                    <div className="text-center">
                      <h2 className="text-white text-2xl font-bold mb-2">{t('scanning')}</h2>
                      <p className="text-white/60">{t('point_camera')}</p>
                    </div>
                    <div id="reader" className="w-full aspect-square overflow-hidden rounded-3xl border-2 border-[var(--accent)] bg-white/5 shadow-[0_0_50px_rgba(var(--accent-rgb),0.3)]"></div>
                  </>
                ) : (
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="bg-white rounded-[32px] p-8 flex flex-col gap-6 shadow-2xl"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-[var(--accent)] text-white flex items-center justify-center">
                        {scanResult.name === t('item_not_found') ? <Search size={32} /> : <Check size={32} />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold uppercase tracking-wider text-gray-400">{t('found')}</p>
                        <h2 className="text-2xl font-black text-black leading-tight">{scanResult.name}</h2>
                        <p className="text-gray-500 font-medium">{scanResult.category} • {scanResult.barcode}</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">{t('qty')}</label>
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
                        {t('cancel')}
                      </button>
                      <button 
                        onClick={confirmScanAdd}
                        className="flex-[2] h-14 rounded-2xl bg-[var(--accent)] font-bold text-white shadow-lg shadow-blue-200 active:scale-95 transition-all"
                      >
                        {t('confirm_scan')}
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
            <h2 className="text-[15px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">{t('category')}</h2>
            <button 
              onClick={addCategory}
              className="text-[var(--accent)] text-[14px] font-bold flex items-center gap-1 active:opacity-60"
            >
              <Plus size={14} />
              {t('add_category')}
            </button>
          </div>
          <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar -mx-4 px-4 mask-fade-right">
            {categories.map((cat) => (
              <div key={cat} className="relative flex-shrink-0">
                <button 
                  onClick={() => handleCategoryInteraction(cat)}
                  className={`px-4 py-2 rounded-xl whitespace-nowrap text-[15px] font-medium transition-all border flex items-center gap-2
                    ${activeCategory === cat ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-md translate-y-[-1px]' : 'bg-[var(--filter-bg)] border-[var(--nav-border)] text-[var(--text-tertiary)]'}`}
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
        <div className="flex flex-col gap-3 min-h-[400px]">
          {activeItems.length > 0 ? activeItems.map(item => {
            const isExpanded = expandedItems.includes(item.id);
            return (
              <div 
                key={item.id}
                className="overflow-hidden transition-all shadow-sm active:scale-[0.99]"
                style={{ 
                  backgroundColor: isExpanded ? 'var(--card-bg)' : 'var(--nav-bg)', 
                  borderColor: isExpanded ? 'var(--accent)' : 'var(--nav-border)',
                  borderWidth: '1px',
                  borderRadius: '16px'
                }}
              >
                <div 
                  className="p-4 flex flex-col gap-3"
                  onClick={() => toggleExpand(item.id)}
                >
                  <div className="flex items-start justify-between w-full">
                    <div className="flex-1">
                      <h3 className="text-[18px] font-bold text-[var(--text-primary)]">{item.name}</h3>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--filter-bg)] text-[var(--text-tertiary)] border border-[var(--nav-border)]">
                          {item.category}
                        </span>
                        {item.tags?.map(tag => (
                          <span key={tag} className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-orange-100 text-orange-600 border border-orange-200">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    {!isExpanded && (
                      <div className="text-right">
                        <p className="text-[20px] font-bold text-[var(--accent)]">
                          {item.qty}
                        </p>
                        <p className="text-[11px] font-bold uppercase text-[var(--text-tertiary)]">
                          {item.unit}
                        </p>
                      </div>
                    )}

                    <div className="ml-3 text-[var(--text-tertiary)]">
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="flex flex-col gap-4 mt-2 pt-4 border-t" style={{ borderColor: 'var(--nav-border)' }} onClick={(e) => e.stopPropagation()}>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[12px] font-bold uppercase text-[var(--text-tertiary)] ml-1">{t('category')}</label>
                          <select 
                            value={item.category}
                            onChange={(e) => updateItem(item.id, { category: e.target.value })}
                            className="h-[48px] w-full rounded-xl border px-3 text-[16px] bg-[var(--filter-bg)] border-[var(--nav-border)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent)] outline-none"
                          >
                            {categories.filter(c => c !== 'All').map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[12px] font-bold uppercase text-[var(--text-tertiary)] ml-1">{t('min_stock')}</label>
                          <input 
                            type="number"
                            value={item.min || 0}
                            onChange={(e) => updateItem(item.id, { min: Number(e.target.value) })}
                            className="h-[48px] w-full rounded-xl border px-3 text-[16px] bg-[var(--filter-bg)] border-[var(--nav-border)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent)] outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[12px] font-bold uppercase text-[var(--text-tertiary)] ml-1">{t('unit_type')}</label>
                          <select 
                            value={item.unit}
                            onChange={(e) => updateItem(item.id, { unit: e.target.value })}
                            className="h-[48px] w-full rounded-xl border px-3 text-[16px] bg-[var(--filter-bg)] border-[var(--nav-border)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent)] outline-none"
                          >
                            <option value="units">{t('units')}</option>
                            <option value="kg">kg</option>
                            <option value="lbs">lbs</option>
                            <option value="liters">Liters</option>
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[12px] font-bold uppercase text-[var(--text-tertiary)] ml-1">{t('supplier')}</label>
                          <input 
                            type="text"
                            value={(item as any).supplier || ''}
                            onChange={(e) => updateItem(item.id, { supplier: e.target.value })}
                            className="h-[48px] w-full rounded-xl border px-3 text-[16px] bg-[var(--filter-bg)] border-[var(--nav-border)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent)] outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[12px] font-bold uppercase text-[var(--text-tertiary)] ml-1">{t('cost')} ($)</label>
                          <input 
                            type="number"
                            step="0.01"
                            value={(item as any).cost || 0}
                            onChange={(e) => updateItem(item.id, { cost: Number(e.target.value) })}
                            className="h-[48px] w-full rounded-xl border px-3 text-[16px] bg-[var(--filter-bg)] border-[var(--nav-border)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent)] outline-none"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[12px] font-bold uppercase text-[var(--accent)] ml-1">{t('price')} ($)</label>
                          <input 
                            type="number"
                            step="0.01"
                            value={(item as any).price || ''}
                            onChange={(e) => updateItem(item.id, { price: Number(e.target.value) })}
                            className="h-[48px] w-full rounded-xl border px-3 text-[16px] bg-[var(--filter-bg)] border-[var(--accent)] text-[var(--text-primary)] font-bold focus:ring-2 focus:ring-[var(--accent)] outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[12px] font-bold uppercase text-[var(--text-tertiary)] ml-1">Tags (comma separated)</label>
                        <input 
                          type="text"
                          value={item.tags?.join(', ') || ''}
                          onChange={(e) => updateItem(item.id, { tags: e.target.value.split(',').map(s => s.trim()).filter(s => s !== '') })}
                          placeholder="e.g. LOW STOCK, ORGANIC"
                          className="h-[48px] w-full rounded-xl border px-3 text-[16px] bg-[var(--filter-bg)] border-[var(--nav-border)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent)] outline-none"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[12px] font-bold uppercase text-[var(--text-tertiary)] ml-1">{t('qty')}</label>
                        <div className="flex items-center rounded-xl border overflow-hidden bg-[var(--filter-bg)] border-[var(--nav-border)]">
                          <input 
                            type="number" 
                            value={item.qty}
                            disabled
                            className="h-[48px] flex-1 bg-transparent border-none text-center text-[18px] text-[var(--accent)] font-bold"
                          />
                          <button 
                            onClick={() => updateQty(item.id, 1)}
                            className="h-[48px] px-6 bg-[var(--accent)] text-white font-bold flex items-center gap-2 active:opacity-80 transition-opacity"
                          >
                            <Plus size={18} />
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
            <div className="flex flex-col items-center justify-center py-16 text-center bg-[var(--filter-bg)] rounded-[32px] border-2 border-dashed border-[var(--nav-border)] mx-4">
              <div className="w-20 h-20 rounded-full bg-[var(--nav-bg)] flex items-center justify-center mb-6 shadow-sm">
                <Plus size={32} className="text-[var(--accent)] opacity-40" />
              </div>
              <p className="text-[19px] font-bold text-[var(--text-primary)] mb-2">
                {activeCategory === 'All' ? 'No items found' : `Empty "${activeCategory}" Category`}
              </p>
              <p className="text-[15px] text-[var(--text-tertiary)] mb-8 px-8">
                Start building your inventory by adding your first item here.
              </p>
              <button 
                onClick={() => {
                  const name = prompt(t('item_name'));
                  if (name) addItem(name);
                }}
                className="bg-[var(--accent)] text-white font-bold py-4 px-10 rounded-2xl shadow-xl active:scale-95 transition-all text-[17px]"
              >
                + {t('add_item')}
              </button>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="flex gap-4 mt-6 pt-4 border-t" style={{ borderColor: 'var(--nav-border)' }}>
          <button className="flex-1 h-[50px] border rounded-lg flex items-center justify-center text-[17px] font-bold transition-colors" style={{ backgroundColor: 'var(--filter-bg)', borderColor: 'var(--nav-border)', color: 'var(--accent)' }}>
            {t('previous')}
          </button>
          <button className="flex-1 h-[50px] rounded-lg flex items-center justify-center text-[17px] font-bold text-white transition-colors shadow-sm" style={{ backgroundColor: 'var(--accent)' }}>
            {t('next')}
          </button>
        </div>
      </main>
    </div>
  );
};
