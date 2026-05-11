import { motion } from 'framer-motion';

export default function CategorySidebar({ categories, activeCategory, onSelectCategory }) {
  return (
    <aside className="w-full lg:w-72 flex-shrink-0">
      <div className="lg:sticky lg:top-32 lg:rounded-[2rem] lg:border border-stone-200 lg:bg-white p-4 md:p-8 shadow-sm">
        <h3 className="mb-4 md:mb-6 hidden md:block px-2 text-[10px] font-black uppercase tracking-[0.3em] text-stone-400 italic">
          Categories
        </h3>
        <ul className="flex list-none m-0 p-0 gap-3 md:gap-4 overflow-x-auto pb-4 md:pb-0 scrollbar-hide lg:flex-col lg:overflow-x-visible">
          {categories.map((cat) => (
            <li key={cat.id || cat.name} className="list-none m-0 p-0 flex-shrink-0 lg:flex-shrink">
              <button
                onClick={() => onSelectCategory(cat.name)}
                className={`flex w-auto lg:w-full items-center justify-between rounded-2xl px-5 md:px-6 py-3 md:py-4 text-left transition-all duration-500 group/cat border ${
                  activeCategory === cat.name
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-xl shadow-emerald-900/10 lg:translate-x-3'
                    : 'bg-transparent text-stone-600 hover:bg-stone-50 border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-1.5 w-1.5 rounded-full transition-colors ${activeCategory === cat.name ? 'bg-white' : 'bg-stone-300'}`} />
                  <span className="text-[12px] md:text-[14px] font-bold tracking-tight whitespace-nowrap uppercase">{cat.name}</span>
                </div>
                <span className={`ml-4 hidden sm:inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[10px] font-black tracking-widest transition-all ${
                  activeCategory === cat.name
                    ? 'bg-white/20 text-white'
                    : 'bg-stone-100 text-stone-400'
                }`}>
                  {cat.count || 0}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
