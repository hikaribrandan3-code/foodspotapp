import React from 'react';
import { Phone, Mail, MapPin, Globe, Plus, Search } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import { translations } from '../lib/translations';

export const InventorySuppliers: React.FC = () => {
  const { language } = useLanguage();
  const t = (key: string) => (translations as any)[language]?.[key] || key;

  const suppliers = [
    { id: '1', name: 'Sysco Food Services', category: 'General Food', contact: 'John Doe', phone: '+1 555-0123', email: 'orders@sysco.com', location: 'Metropolitan Area' },
    { id: '2', name: 'Goya Foods', category: 'Latin Products', contact: 'Maria Garcia', phone: '+1 555-0456', email: 'sales@goya.com', location: 'New Jersey, NJ' },
    { id: '3', name: 'Local Bulk Co-op', category: 'Dry Goods & Grains', contact: 'Sam Rivers', phone: '+1 555-0789', email: 'support@localbulk.org', location: 'Downtown Hub' },
    { id: '4', name: 'Coke Distribution', category: 'Beverages', contact: 'Kevin Smith', phone: '+1 555-1011', email: 'distribution@coca-cola.com', location: 'Regional Center' },
  ];

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
              className="bg-transparent border-none focus:ring-0 text-[15px] w-full placeholder:text-[var(--text-tertiary)]"
            />
          </div>
          <button 
            className="w-[48px] h-[48px] rounded-xl bg-[var(--accent)] text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform shrink-0"
          >
            <Plus size={24} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {suppliers.map(supplier => (
            <div 
              key={supplier.id}
              className="bento-card p-6 flex flex-col gap-4 shadow-sm"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">{supplier.name}</h2>
                  <p className="text-[var(--accent)] font-semibold text-sm uppercase tracking-wider mt-0.5">{supplier.category}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center font-bold">
                  {supplier.name[0]}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t" style={{ borderColor: 'var(--nav-border)' }}>
                <div className="flex items-center gap-2 text-[13px]">
                  <Phone size={14} className="text-[var(--text-tertiary)]" />
                  <span>{supplier.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-[13px]">
                  <Mail size={14} className="text-[var(--text-tertiary)]" />
                  <span className="truncate">{supplier.email}</span>
                </div>
                <div className="flex items-center gap-2 text-[13px]">
                  <MapPin size={14} className="text-[var(--text-tertiary)]" />
                  <span>{supplier.location}</span>
                </div>
                <div className="flex items-center gap-2 text-[13px]">
                  <Globe size={14} className="text-[var(--text-tertiary)]" />
                  <span>{supplier.contact}</span>
                </div>
              </div>

              <div className="flex gap-2 mt-2">
                <button className="flex-1 h-10 rounded-xl bg-[var(--filter-bg)] text-[var(--text-primary)] font-bold text-xs border border-[var(--nav-border)]">
                  Order History
                </button>
                <button className="flex-1 h-10 rounded-xl bg-[var(--accent)] text-white font-bold text-xs">
                  Place Order
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};
