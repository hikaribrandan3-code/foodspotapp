import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Camera, X, Flame, Leaf, Wheat, Star, Edit2 } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import MenuItemCard from './MenuItemCard';

export default function MenuTab({
  menuItems,
  categories,
  categoryMap,
  activeCategory,
  onSelectCategory,
  onItemUpdate,
  onDeleteItem,
  onAddItem,
  onAddCategory,
  onDeleteCategory,
  onEditCategory,
  onMoveCategory,
  businessId
}) {
  const { t } = useLanguage();
  const fileInputRef = useRef(null);
  const [isAdding, setIsAdding] = useState(false);
  const [actionCategoryId, setActionCategoryId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const longPressTimerRef = useRef(null);
  const actionModalRef = useRef(null);
  const [newRecipe, setNewRecipe] = useState({
    name: '',
    description: '',
    price: '',
    kcal: '',
    categoryId: activeCategory || (categories[0]?.id || ''),
    categoryName: categories.find(c => c.id === activeCategory)?.name || categories[0]?.name || 'General',
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

  const handleCategoryPress = (categoryId, categoryName) => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      setActionCategoryId(categoryId);
      setEditName(categoryName);
      setIsEditing(false);
    }, 1300);
  };

  const handleCategoryRelease = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleEditCategory = () => {
    if (!editName.trim() || !actionCategoryId) return;
    onEditCategory(actionCategoryId, editName.trim());
    setActionCategoryId(null);
    setIsEditing(false);
  };

  const handleMoveCategory = (direction) => {
    const currentIndex = categories.findIndex(c => c.id === actionCategoryId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= categories.length) return;

    onMoveCategory(actionCategoryId, direction);
  };

  const handleDeleteCategory = (categoryId, categoryName) => {
    setActionCategoryId(null);
    setIsEditing(false);
    onDeleteCategory(categoryId, categoryName);
  };

  const handleAddRecipe = () => {
    if (!newRecipe.name || !newRecipe.price) return;

    const priceVal = parseFloat(newRecipe.price);
    if (isNaN(priceVal) || priceVal <= 0 || priceVal > 999999) {
      alert('Precio inválido. Debe ser entre 0.01 y 999,999.');
      return;
    }

    // Use explicitly selected category, or fall back to activeCategory, then first category
    const selectedCategoryId = newRecipe.categoryId || activeCategory || categories[0]?.id;
    if (!selectedCategoryId) {
      alert('Por favor selecciona una categoría.');
      return;
    }
    const selectedCategory = categories.find(c => c.id === selectedCategoryId);
    const categoryName = selectedCategory?.name || 'General';

    const item = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9),
      business_id: businessId,
      name: newRecipe.name,
      description: newRecipe.description || 'A new discovery.',
      price: Math.round(priceVal * 100),
      calories: parseInt(newRecipe.kcal) || 0,
      image_url: newRecipe.image,
      available: true,
      featured: newRecipe.featured,
      is_vegan: newRecipe.is_vegan,
      is_gluten_free: newRecipe.is_gluten_free,
      is_spicy: newRecipe.is_spicy,
      category_id: selectedCategoryId,
      category: categoryName
    };

    onAddItem(item);
    setIsAdding(false);
    setNewRecipe({
      name: '',
      description: '',
      price: '',
      kcal: '',
      categoryId: activeCategory || (categories[0]?.id || ''),
      categoryName: categories.find(c => c.id === activeCategory)?.name || categories[0]?.name || 'General',
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800',
      is_vegan: false,
      is_gluten_free: false,
      is_spicy: false,
      featured: false
    });
  };

  // Close modal when tapping outside
  useEffect(() => {
    if (!actionCategoryId) return;
    const handleOutside = (e) => {
      if (actionModalRef.current && !actionModalRef.current.contains(e.target)) {
        setActionCategoryId(null);
        setIsEditing(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [actionCategoryId]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, []);

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
          onClick={() => { setActionCategoryId(null); onSelectCategory(''); }}
          className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
            !activeCategory
              ? 'bg-emerald-600 text-white shadow-lg'
              : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
          }`}
        >
          All Categories
        </button>
        {categoryList && categoryList.map((cat) => (
          <button
            key={cat.id}
            onMouseDown={() => handleCategoryPress(cat.id, cat.name)}
            onMouseUp={handleCategoryRelease}
            onMouseLeave={handleCategoryRelease}
            onTouchStart={() => handleCategoryPress(cat.id, cat.name)}
            onTouchEnd={handleCategoryRelease}
            onContextMenu={(e) => e.preventDefault()}
            onClick={() => {
              if (actionCategoryId !== cat.id) {
                setActionCategoryId(null);
                onSelectCategory(cat.id);
              }
            }}
            style={{ touchAction: 'manipulation' }}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all select-none ${
              activeCategory === cat.id
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
          >
            {cat.name} ({cat.count})
          </button>
        ))}
        <button
          onClick={() => { setActionCategoryId(null); onAddCategory(); }}
          className="px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap bg-white border border-dashed border-stone-300 text-stone-600 hover:bg-stone-50 transition-all"
        >
          + Add Category
        </button>
      </div>

      {/* Category Action Modal */}
      <AnimatePresence>
        {actionCategoryId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActionCategoryId(null)}
              className="absolute inset-0 bg-stone-950/60 backdrop-blur-md"
            />
            <motion.div
              ref={actionModalRef}
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl relative z-10 p-8 space-y-6"
            >
              <div className="text-center">
                {isEditing ? (
                  <>
                    <p className="text-xs font-black text-stone-400 uppercase tracking-widest mb-3">Edit Category</p>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-3 font-bold text-stone-950 outline-none focus:bg-stone-100 transition-all"
                      autoFocus
                    />
                  </>
                ) : (
                  <p className="text-lg font-bold text-stone-950">{editName}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleMoveCategory('left')}
                  disabled={categories.findIndex(c => c.id === actionCategoryId) === 0}
                  className="px-4 py-3 bg-emerald-50 text-emerald-600 font-black text-lg rounded-2xl border border-emerald-200 hover:bg-emerald-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ←
                </button>
                <button
                  onClick={() => handleMoveCategory('right')}
                  disabled={categories.findIndex(c => c.id === actionCategoryId) === categories.length - 1}
                  className="px-4 py-3 bg-emerald-50 text-emerald-600 font-black text-lg rounded-2xl border border-emerald-200 hover:bg-emerald-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  →
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleEditCategory}
                      className="px-4 py-3 bg-green-50 text-green-600 font-black text-sm rounded-2xl border border-green-200 hover:bg-green-100 transition-all"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-3 bg-stone-100 text-stone-600 font-black text-sm rounded-2xl border border-stone-200 hover:bg-stone-200 transition-all"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-3 bg-green-50 text-green-600 font-black text-sm rounded-2xl border border-green-200 hover:bg-green-100 transition-all flex items-center justify-center gap-2"
                    >
                      <Edit2 className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(actionCategoryId, editName)}
                      className="px-4 py-3 bg-red-50 text-red-600 font-black text-sm rounded-2xl border border-red-200 hover:bg-red-100 transition-all"
                    >
                      🗑️ Delete
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14">
          {filteredItems.map((item) => (
            <MenuItemCard key={item.id} item={item} onUpdate={onItemUpdate} onDelete={onDeleteItem} />
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
                    <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest">{t('category') || 'Category'}</label>
                    <select
                      className="w-full bg-stone-50 border-none rounded-xl p-4 font-bold text-stone-950 outline-none focus:bg-stone-100 transition-all"
                      value={newRecipe.categoryId}
                      onChange={(e) => {
                        const catId = e.target.value;
                        const cat = categories.find(c => c.id === catId);
                        setNewRecipe({ ...newRecipe, categoryId: catId, categoryName: cat?.name || 'General' });
                      }}
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
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
