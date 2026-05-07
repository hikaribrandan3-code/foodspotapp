import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Camera, X, Flame, Leaf, Wheat, Star } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import MenuItemCard from './MenuItemCard';

export default function MenuTab({
  menuItems,
  categories,
  categoryMap,
  activeCategory,
  onSelectCategory,
  onItemUpdate,
  onAddItem,
  onAddCategory,
  onDeleteCategory,
  businessId
}) {
  const { t } = useLanguage();
  const fileInputRef = useRef(null);
  const [isAdding, setIsAdding] = useState(false);
  const [heldCategoryId, setHeldCategoryId] = useState(null);
  const longPressTimerRef = useRef(null);
  const [newRecipe, setNewRecipe] = useState({
    name: '',
    description: '',
    price: '',
    kcal: '',
    category: activeCategory || '',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800',
    is_vegan: false,
    is_gluten_free: false,
    is_spicy: false,
    featured: false
  });

  const filteredItems = activeCategory
    ? menuItems.filter((item) => item.category_id === activeCategory)
    : menuItems;

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setNewRecipe({ ...newRecipe, image: event.target?.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCategoryPress = (categoryId) => {
    longPressTimerRef.current = setTimeout(() => {
      setHeldCategoryId(categoryId);
    }, 2000);
  };

  const handleCategoryRelease = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  };

  const handleCategoryDelete = (categoryId, categoryName) => {
    setHeldCategoryId(null);
    onDeleteCategory(categoryId, categoryName);
  };

  const handleAddRecipe = () => {
    if (!newRecipe.name || !newRecipe.price) return;

    const categoryName = newRecipe.category || activeCategory || 'General';
    const categoryId = categoryMap[categoryName] || categoryName;

    const item = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9),
      business_id: businessId,
      name: newRecipe.name,
      description: newRecipe.description || 'A new discovery.',
      price: Math.round(parseFloat(newRecipe.price) * 100),
      kcal: parseInt(newRecipe.kcal) || 0,
      image_url: newRecipe.image,
      available: true,
      featured: newRecipe.featured,
      is_vegan: newRecipe.is_vegan,
      is_gluten_free: newRecipe.is_gluten_free,
      is_spicy: newRecipe.is_spicy,
      category_id: categoryId
    };

    onAddItem(item);
    setIsAdding(false);
    setNewRecipe({
      name: '',
      description: '',
      price: '',
      kcal: '',
      category: activeCategory || '',
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800',
      is_vegan: false,
      is_gluten_free: false,
      is_spicy: false,
      featured: false
    });
  };

  const categoryList = categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    count: menuItems.filter((i) => i.category_id === cat.id).length
  }));

  return (
    <section className="mb-16 md:mb-32">
      <div className="bg-white border-2 border-stone-200 rounded-[2.5rem] p-6 md:p-16 mb-12 shadow-[0_20px_50px_rgba(28,25,23,0.03)] relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Plus className="w-64 h-64 text-emerald-600 rotate-12" />
        </div>

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 md:gap-12 relative z-10">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-6 w-1 bg-emerald-600 rounded-full" />
              <p className="text-emerald-600 font-black tracking-[0.3em] uppercase text-[10px] md:text-[12px]">
                {t('menu_management_title') || 'Menu Management'}
              </p>
            </div>
            <h2 className="font-['Outfit',sans-serif] text-4xl md:text-7xl text-stone-950 mb-6 font-black tracking-tight leading-none italic">
              {t('menu') || 'Menu Offerings'}
            </h2>
            <p className="text-base md:text-xl text-stone-600 leading-relaxed font-medium">
              {t('menu_management_subtitle') || 'Simple tagging, full control. Diet-friendly, spicy, natural, promoted—your way.'}
            </p>
          </div>
          <div className="flex gap-4 w-full lg:w-auto">
            <button
              onClick={() => setIsAdding(true)}
              className="flex-grow lg:flex-none flex items-center justify-center gap-3 px-12 h-16 bg-emerald-600 text-white font-black text-sm md:text-base uppercase tracking-[0.2em] rounded-2xl hover:bg-emerald-500 transition-all shadow-2xl active:scale-95"
            >
              <Plus className="h-5 w-5" />
              {t('new_recipe') || 'New Recipe'}
            </button>
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
        <button
          onClick={() => onSelectCategory('')}
          className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
            !activeCategory
              ? 'bg-emerald-600 text-white shadow-lg'
              : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
          }`}
        >
          All Categories
        </button>
        {categoryList && categoryList.map((cat) => (
          <div key={cat.id} className="relative">
            <button
              onMouseDown={() => handleCategoryPress(cat.id)}
              onMouseUp={handleCategoryRelease}
              onMouseLeave={handleCategoryRelease}
              onTouchStart={() => handleCategoryPress(cat.id)}
              onTouchEnd={handleCategoryRelease}
              onClick={() => {
                if (heldCategoryId !== cat.id) {
                  onSelectCategory(cat.id);
                }
              }}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all select-none ${
                heldCategoryId === cat.id
                  ? 'bg-red-100 text-red-700 border border-red-300'
                  : activeCategory === cat.id
                  ? 'bg-emerald-600 text-white shadow-lg'
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              {heldCategoryId === cat.id ? '🗑️ Delete?' : `${cat.name} (${cat.count})`}
            </button>
            {heldCategoryId === cat.id && (
              <div className="absolute top-full mt-2 left-0 flex gap-2 z-20">
                <button
                  onClick={() => handleCategoryDelete(cat.id, cat.name)}
                  className="px-3 py-1 rounded-full text-xs font-bold bg-red-500 text-white active:bg-red-600 transition-all"
                >
                  Delete
                </button>
                <button
                  onClick={() => setHeldCategoryId(null)}
                  className="px-3 py-1 rounded-full text-xs font-bold bg-stone-300 text-stone-700 active:bg-stone-400 transition-all"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        ))}
        <button
          onClick={onAddCategory}
          className="px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap bg-white border border-dashed border-stone-300 text-stone-600 hover:bg-stone-50 transition-all"
        >
          + Add Category
        </button>
      </div>

      <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14">
          {filteredItems.map((item) => (
            <MenuItemCard key={item.id} item={item} onUpdate={onItemUpdate} />
          ))}
          {filteredItems.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-stone-400">
              <Plus className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-lg font-medium">{t('no_items_in_category') || 'No items in this category yet.'}</p>
            </div>
          )}
        </div>

      {/* New Recipe Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-stone-950/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[2.5rem] md:rounded-[3rem] shadow-2xl relative z-10 overflow-y-auto md:overflow-hidden flex flex-col md:flex-row"
            >
              {/* Photo Upload Side */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full md:w-2/5 bg-stone-100 flex flex-col items-center justify-center p-8 border-b md:border-b-0 md:border-r border-stone-200 group/upload cursor-pointer relative overflow-hidden"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
                {newRecipe.image && !newRecipe.image.startsWith('https') ? (
                  <img
                    src={newRecipe.image}
                    alt="Preview"
                    className="w-full h-full object-cover absolute inset-0"
                  />
                ) : (
                  <>
                    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: `radial-gradient(circle, #000 1px, transparent 1px)`, backgroundSize: '20px 20px' }}></div>
                    <div className="h-20 w-20 rounded-full bg-white flex items-center justify-center shadow-lg mb-4 text-stone-300 group-hover/upload:text-emerald-500 transition-colors z-10">
                      <Camera className="h-10 w-10" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 z-10">{t('add_food_photo') || 'Add Food Photo'}</p>
                  </>
                )}
                <div className="absolute inset-0 bg-emerald-50 opacity-0 group-hover/upload:opacity-100 transition-opacity"></div>
              </div>

              {/* Form Side */}
              <div className="flex-grow p-8 md:p-12 space-y-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-2xl font-['Outfit',sans-serif] font-black tracking-tight italic">{t('create_recipe') || 'Create Recipe'}</h3>
                  <button onClick={() => setIsAdding(false)} className="text-stone-300 hover:text-stone-950 transition-colors">
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest">{t('dish_name') || 'Dish Name'}</label>
                    <input
                      type="text"
                      placeholder={t('dish_name_placeholder') || 'The Midnight Saffron...'}
                      className="w-full bg-stone-50 border-none rounded-xl p-4 font-bold text-stone-950 outline-none focus:bg-stone-100 transition-all"
                      value={newRecipe.name}
                      onChange={(e) => setNewRecipe({ ...newRecipe, name: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest">{t('price') || 'Price ($)'}</label>
                      <input
                        type="text"
                        placeholder="28.00"
                        className="w-full bg-stone-50 border-none rounded-xl p-4 font-bold text-stone-950 outline-none"
                        value={newRecipe.price}
                        onChange={(e) => setNewRecipe({ ...newRecipe, price: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest">{t('calories') || 'Calories (KCAL)'}</label>
                      <div className="relative">
                        <Flame className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-300" />
                        <input
                          type="text"
                          placeholder="450"
                          className="w-full bg-stone-50 border-none rounded-xl pl-10 p-4 font-bold text-stone-950 outline-none"
                          value={newRecipe.kcal}
                          onChange={(e) => setNewRecipe({ ...newRecipe, kcal: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest">{t('description') || 'Description'}</label>
                    <textarea
                      placeholder={t('description_placeholder') || 'Briefly describe the flavor profile...'}
                      className="w-full h-24 bg-stone-50 border-none rounded-xl p-4 font-medium text-stone-500 italic resize-none outline-none focus:bg-stone-100"
                      value={newRecipe.description}
                      onChange={(e) => setNewRecipe({ ...newRecipe, description: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest">{t('dietary_tags') || 'Dietary Tags'}</label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setNewRecipe({ ...newRecipe, is_vegan: !newRecipe.is_vegan })}
                        className={`flex items-center gap-1.5 rounded-full border transition-all text-[10px] font-bold uppercase tracking-wider ${newRecipe.is_vegan ? 'bg-emerald-50 border-emerald-100 text-emerald-600 px-3 py-1.5' : 'bg-stone-50 border-stone-200 text-stone-300 hover:text-stone-400 p-1.5'}`}
                      >
                        <Leaf className={`h-3.5 w-3.5 ${newRecipe.is_vegan ? 'fill-current' : ''}`} />
                        {newRecipe.is_vegan && <span>Natural</span>}
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewRecipe({ ...newRecipe, is_gluten_free: !newRecipe.is_gluten_free })}
                        className={`flex items-center gap-1.5 rounded-full border transition-all text-[10px] font-bold uppercase tracking-wider ${newRecipe.is_gluten_free ? 'bg-stone-900 border-stone-900 text-white px-3 py-1.5' : 'bg-stone-50 border-stone-200 text-stone-300 hover:text-stone-400 p-1.5'}`}
                      >
                        <Wheat className="h-3.5 w-3.5" />
                        {newRecipe.is_gluten_free && <span>Tacc</span>}
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewRecipe({ ...newRecipe, is_spicy: !newRecipe.is_spicy })}
                        className={`flex items-center gap-1.5 rounded-full border transition-all text-[10px] font-bold uppercase tracking-wider ${newRecipe.is_spicy ? 'bg-red-50 border-red-100 text-red-500 px-3 py-1.5' : 'bg-stone-50 border-stone-200 text-stone-300 hover:text-stone-400 p-1.5'}`}
                      >
                        <Flame className={`h-3.5 w-3.5 ${newRecipe.is_spicy ? 'fill-current' : ''}`} />
                        {newRecipe.is_spicy && <span>Spicy</span>}
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewRecipe({ ...newRecipe, featured: !newRecipe.featured })}
                        className={`flex items-center gap-1.5 rounded-full border transition-all text-[10px] font-bold uppercase tracking-wider ${newRecipe.featured ? 'bg-amber-50 border-amber-100 text-amber-500 px-3 py-1.5' : 'bg-stone-50 border-stone-200 text-stone-300 hover:text-stone-400 p-1.5'}`}
                      >
                        <Star className={`h-3.5 w-3.5 ${newRecipe.featured ? 'fill-current' : ''}`} />
                        {newRecipe.featured && <span>Special</span>}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleAddRecipe}
                  className="w-full bg-emerald-600 text-white font-['Outfit',sans-serif] font-black uppercase tracking-[0.15em] italic py-4 rounded-2xl hover:bg-emerald-500 transition-all flex items-center justify-center"
                >
                  {t('add_to_menu') || 'Add to Menu'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
