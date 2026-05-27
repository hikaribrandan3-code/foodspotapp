import { useLanguage } from '../../../contexts/LanguageContext';

export default function PortalHeader({ activeTab, setActiveTab }) {
  const { t } = useLanguage();

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', url);
  };

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="mx-auto flex h-14 md:h-16 max-w-7xl items-center justify-center px-4 md:px-6 py-3 md:py-4">
        <nav className="flex items-center gap-1 bg-stone-100 p-1 rounded-[2rem] border border-stone-200 shadow-sm">
          <button
            onClick={() => handleTabClick('menu')}
            className={`px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.22em] transition-all ${
              activeTab === 'menu'
                ? 'bg-white text-stone-900 shadow-sm border border-stone-100'
                : 'text-stone-400 hover:text-stone-600'
            }`}
          >
            {t('menu') || 'Menu'}
          </button>
          <button
            onClick={() => handleTabClick('inventory')}
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
