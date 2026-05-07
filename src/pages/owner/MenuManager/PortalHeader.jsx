import { useLanguage } from '../../../contexts/LanguageContext';

export default function PortalHeader({ activeTab, setActiveTab }) {
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="mx-auto flex h-20 md:h-24 max-w-7xl items-center justify-center px-4 md:px-6 py-4 md:py-6">
        <nav className="flex items-center gap-1 bg-stone-100 p-1 rounded-[2rem] border border-stone-200 shadow-sm">
          <button
            onClick={() => setActiveTab('menu')}
            className={`px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.22em] transition-all ${
              activeTab === 'menu'
                ? 'bg-white text-stone-900 shadow-sm border border-stone-100'
                : 'text-stone-400 hover:text-stone-600'
            }`}
          >
            {t('menu') || 'Menu'}
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.22em] transition-all ${
              activeTab === 'inventory'
                ? 'bg-white text-stone-900 shadow-sm border border-stone-100'
                : 'text-stone-400 hover:text-stone-600'
            }`}
          >
            {t('inventory') || 'Inventory'}
          </button>
        </nav>
      </div>
    </header>
  );
}
