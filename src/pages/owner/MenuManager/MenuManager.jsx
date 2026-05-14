import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTenant } from '../../../contexts/TenantContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { supabase, updateBranding } from '../../../lib/supabaseClient';
import { deepMergeAppConfig } from '../../../utils/appConfig';
import BackendNav from '../../../components/BackendNav';
import PortalHeader from './PortalHeader';
import MenuTab from './MenuTab';
import InventoryTab from './InventoryTab';
import DeliverySettingsTab from './DeliverySettingsTab';

export default function MenuManager() {
  const { businessId, tenantData } = useTenant();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { tenantSlug } = useParams();

  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') === 'inventory' ? 'inventory' : 'menu';
  });
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryMap, setCategoryMap] = useState({});
  const [activeCategory, setActiveCategory] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState(null);
  const debounceRefs = useRef(new Map());

  // Delivery settings state
  const [deliveryRadius, setDeliveryRadius] = useState(5);
  const [deliveryFee, setDeliveryFee] = useState('2.99');
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState('35.00');
  const [isDeliveryFeeEnabled, setIsDeliveryFeeEnabled] = useState(true);
  const [isFreeDeliveryEnabled, setIsFreeDeliveryEnabled] = useState(true);
  const [isDeliveryPaused, setIsDeliveryPaused] = useState(false);

  // Fetch menu items and delivery settings on mount / businessId change
  useEffect(() => {
    if (!businessId) return;
    fetchMenuItems();
    fetchCategories();
    loadDeliverySettings();
  }, [businessId]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, sort_order')
        .eq('business_id', businessId)
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true });

      if (!error && data) {
        setCategories(data);
        const map = {};
        data.forEach((cat) => {
          map[cat.name] = cat.id;
        });
        setCategoryMap(map);
        if (data.length && !activeCategory) {
          setActiveCategory(data[0].id);
        }
      }
    } catch (err) {
      console.error('[MenuManager] Error fetching categories:', err);
    }
  };

  const fetchMenuItems = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[MenuManager] Error fetching menu items:', error);
        setSaveStatus({ error: true, message: t('fetch_error') || 'Failed to load menu items.' });
      } else if (data) {
        setMenuItems(data);
      }
    } catch (err) {
      console.error('[MenuManager] Critical error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDeliverySettings = () => {
    const appConfig = tenantData?.app_config || {};
    const delivery = appConfig.delivery || {};
    setDeliveryRadius(delivery.radius || 5);
    setDeliveryFee(String(delivery.fee || '2.99'));
    setFreeDeliveryThreshold(String(delivery.free_threshold || '35.00'));
    setIsDeliveryFeeEnabled(delivery.fee_enabled !== false);
    setIsFreeDeliveryEnabled(delivery.free_enabled !== false);
    setIsDeliveryPaused(delivery.paused || false);
  };

  // Debounced save for item field changes
  const saveItemField = useCallback(async (itemId, updates) => {
    // Optimistic local update
    setMenuItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, ...updates } : item))
    );

    // Debounce Supabase write — per-item timer so editing A doesn't cancel B's save
    const existing = debounceRefs.current.get(itemId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      const { error } = await supabase
        .from('menu_items')
        .update(updates)
        .eq('id', itemId)
        .eq('business_id', businessId);

      if (error) {
        console.error('[MenuManager] Save item error:', error);
        setSaveStatus({ error: true, message: t('save_error') || 'Save failed.' });
      } else {
        setSaveStatus({ error: false, message: t('saved') || 'Saved' });
        setTimeout(() => setSaveStatus(null), 2000);
      }
      debounceRefs.current.delete(itemId);
    }, 600);

    debounceRefs.current.set(itemId, timer);
  }, [businessId, t]);

  const handleDeleteItem = useCallback(async (itemId) => {
    if (!window.confirm('Delete this item permanently?')) return;
    setMenuItems((prev) => prev.filter((i) => i.id !== itemId));

    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', itemId)
      .eq('business_id', businessId);

    if (error) {
      console.error('[MenuManager] Delete item error:', error);
      setSaveStatus({ error: true, message: t('delete_error') || 'Failed to delete item.' });
      fetchMenuItems();
    } else {
      setSaveStatus({ error: false, message: t('item_deleted') || 'Item deleted' });
      setTimeout(() => setSaveStatus(null), 2000);
      syncMenuDataToJsonb(menuItems.filter((i) => i.id !== itemId));
    }
  }, [businessId, menuItems, t]);

  const handleAddItem = useCallback(async (item) => {
    // Optimistic
    setMenuItems((prev) => [item, ...prev]);

    const { error } = await supabase
      .from('menu_items')
      .insert(item);

    if (error) {
      console.error('[MenuManager] Add item error:', error.message || error);
      console.error('[MenuManager] Item data:', item);
      console.error('[MenuManager] Business ID:', businessId);
      setSaveStatus({ error: true, message: `${t('add_error') || 'Failed to add item.'} - ${error.message || 'Unknown error'}` });
      // Revert optimistic
      setMenuItems((prev) => prev.filter((i) => i.id !== item.id));
    } else {
      setSaveStatus({ error: false, message: t('item_added') || 'Item added' });
      setTimeout(() => setSaveStatus(null), 2000);
      // Also sync to menu_data JSONB for customer-facing compatibility
      syncMenuDataToJsonb([item, ...menuItems]);
    }
  }, [businessId, menuItems, t]);

  const handleAddCategory = useCallback(async () => {
    const categoryName = prompt('Enter category name:');
    if (!categoryName || !categoryName.trim()) return;

    const { data, error } = await supabase
      .from('categories')
      .insert({
        name: categoryName.trim(),
        business_id: businessId,
        sort_order: 0,
        display_order: 0,
        is_active: true,
        is_enabled: true,
        icon: ''
      })
      .select();

    if (error) {
      console.error('[MenuManager] Add category error:', error);
      setSaveStatus({ error: true, message: t('category_add_error') || 'Failed to add category.' });
    } else {
      setSaveStatus({ error: false, message: 'Category added' });
      setTimeout(() => setSaveStatus(null), 2000);
      fetchCategories();
    }
  }, [businessId, t]);

  const handleDeleteCategory = useCallback(async (categoryId, categoryName) => {
    if (!window.confirm(`Delete "${categoryName}" and all its dishes? This cannot be undone.`)) return;

    // Cascade: delete menu items in this category first
    const { error: itemsError } = await supabase
      .from('menu_items')
      .delete()
      .eq('category_id', categoryId)
      .eq('business_id', businessId);

    if (itemsError) {
      console.error('[MenuManager] Delete category items error:', itemsError);
      setSaveStatus({ error: true, message: 'Failed to delete category dishes.' });
      return;
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId)
      .eq('business_id', businessId);

    if (error) {
      console.error('[MenuManager] Delete category error:', error);
      setSaveStatus({ error: true, message: 'Failed to delete category.' });
    } else {
      setSaveStatus({ error: false, message: 'Category deleted' });
      setTimeout(() => setSaveStatus(null), 2000);
      if (activeCategory === categoryId) {
        setActiveCategory('');
      }
      fetchCategories();
      fetchMenuItems();
    }
  }, [businessId, activeCategory, t]);

  const handleEditCategory = useCallback(async (categoryId, newName) => {
    const { error } = await supabase
      .from('categories')
      .update({ name: newName })
      .eq('id', categoryId)
      .eq('business_id', businessId);

    if (error) {
      console.error('[MenuManager] Edit category error:', error);
      setSaveStatus({ error: true, message: 'Failed to edit category.' });
    } else {
      setSaveStatus({ error: false, message: 'Category updated' });
      setTimeout(() => setSaveStatus(null), 2000);
      fetchCategories();
    }
  }, [businessId, t]);

  const handleMoveCategory = useCallback(async (categoryId, direction) => {
    const currentIndex = categories.findIndex(c => c.id === categoryId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= categories.length) return;

    const swapId = categories[newIndex].id;
    const currentSort = categories[currentIndex].sort_order || currentIndex;
    const swapSort = categories[newIndex].sort_order || newIndex;

    await supabase
      .from('categories')
      .update({ sort_order: swapSort })
      .eq('id', categoryId)
      .eq('business_id', businessId);

    await supabase
      .from('categories')
      .update({ sort_order: currentSort })
      .eq('id', swapId)
      .eq('business_id', businessId);

    fetchCategories();
  }, [businessId, categories]);

  // Keep menu_data JSONB in sync for backward compatibility with customer Menu.jsx
  const syncMenuDataToJsonb = async (items) => {
    if (!businessId) return;
    const cats = [...new Set(items.map((i) => i.category).filter(Boolean))];
    const menuData = {
      categories: cats.map((catName) => ({
        id: `cat-${catName.toLowerCase().replace(/\s+/g, '-')}`,
        name: catName,
        icon: '🍽️',
        enabled: true,
        items: items
          .filter((i) => i.category === catName)
          .map((i) => ({
            id: i.id,
            name: i.name,
            price: i.price,
            image: i.image_url || i.image,
            available: i.available,
            description: i.description,
            calories: i.calories || i.kcal || 0
          }))
      }))
    };

    try {
      await updateBranding({ menu_data: menuData }, businessId);
    } catch (err) {
      console.error('[MenuManager] menu_data sync error:', err);
    }
  };

  // Save delivery settings to app_config JSONB
  const saveDeliverySettings = useCallback(async () => {
    if (!businessId) return;
    const payload = {
      app_config: deepMergeAppConfig(tenantData?.app_config || {}, {
        delivery: {
          radius: deliveryRadius,
          fee: deliveryFee,
          free_threshold: freeDeliveryThreshold,
          fee_enabled: isDeliveryFeeEnabled,
          free_enabled: isFreeDeliveryEnabled,
          paused: isDeliveryPaused
        }
      })
    };

    setSaveStatus({ error: false, message: t('saving') || 'Saving...' });
    try {
      const { data, error } = await updateBranding(payload, businessId);
      if (error) throw error;
      setSaveStatus({ error: false, message: t('saved') || 'Saved' });
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (err) {
      console.error('[MenuManager] Delivery save error:', err);
      const isForbidden = err?.code === '42501' || err?.status === 403 || err?.message?.includes('permission');
      setSaveStatus({
        error: true,
        message: isForbidden
          ? 'Access denied. Please log out and log back in as the business owner.'
          : (t('save_error') || 'Save failed.')
      });
    }
  }, [
    businessId, tenantData, deliveryRadius, deliveryFee, freeDeliveryThreshold,
    isDeliveryFeeEnabled, isFreeDeliveryEnabled, isDeliveryPaused, t
  ]);

  // Auto-save delivery settings when they change
  useEffect(() => {
    if (!businessId || isLoading) return;
    const timer = setTimeout(() => {
      saveDeliverySettings();
    }, 800);
    return () => clearTimeout(timer);
  }, [
    deliveryRadius, deliveryFee, freeDeliveryThreshold,
    isDeliveryFeeEnabled, isFreeDeliveryEnabled, isDeliveryPaused
  ]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-400 text-sm font-medium animate-pulse">
          {t('loading_menu') || 'Loading menu...'}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-stone-50 text-stone-950 font-sans min-h-screen flex flex-col transition-colors duration-500">
      <PortalHeader activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Save Status Toast */}
      {saveStatus && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[60] px-6 py-3 rounded-full text-[11px] font-black uppercase tracking-[0.2em] shadow-xl transition-all ${
          saveStatus.error ? 'bg-red-500 text-white' : 'bg-emerald-600 text-white'
        }`}>
          {saveStatus.message}
        </div>
      )}

      <main className="flex-grow px-4 md:px-12 py-10 md:py-16 max-w-7xl mx-auto w-full">
        {activeTab === 'menu' ? (
          <div className="space-y-24 md:space-y-40">
            <MenuTab
              menuItems={menuItems}
              categories={categories}
              categoryMap={categoryMap}
              activeCategory={activeCategory}
              onSelectCategory={setActiveCategory}
              onItemUpdate={saveItemField}
              onDeleteItem={handleDeleteItem}
              onAddItem={handleAddItem}
              onAddCategory={handleAddCategory}
              onDeleteCategory={handleDeleteCategory}
              onEditCategory={handleEditCategory}
              onMoveCategory={handleMoveCategory}
              businessId={businessId}
            />
            <DeliverySettingsTab
              deliveryRadius={deliveryRadius}
              setDeliveryRadius={setDeliveryRadius}
              deliveryFee={deliveryFee}
              setDeliveryFee={setDeliveryFee}
              freeDeliveryThreshold={freeDeliveryThreshold}
              setFreeDeliveryThreshold={setFreeDeliveryThreshold}
              isDeliveryFeeEnabled={isDeliveryFeeEnabled}
              setIsDeliveryFeeEnabled={setIsDeliveryFeeEnabled}
              isFreeDeliveryEnabled={isFreeDeliveryEnabled}
              setIsFreeDeliveryEnabled={setIsFreeDeliveryEnabled}
              isDeliveryPaused={isDeliveryPaused}
              setIsDeliveryPaused={setIsDeliveryPaused}
            />
          </div>
        ) : (
          <div className="space-y-20">
            <InventoryTab />
          </div>
        )}
      </main>

      {/* Backend Navigation */}
      <BackendNav
        role="owner"
        useRoutes={true}
      />

      <footer className="py-12 border-t border-stone-200 text-center" />
    </div>
  );
}
