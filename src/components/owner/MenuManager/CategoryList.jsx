import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

// 🚀 VAULT-SEAL: Thumbnail optimizer
const getThumbUrl = (url, size = 80) => {
    if (!url || url.startsWith('blob:')) return url
    if (url.includes('unsplash.com')) {
        return `${url.split('?')[0]}?w=${size}&q=60&fit=crop&format=webp`
    }
    const sep = url.includes('?') ? '&' : '?'
    return `${url}${sep}width=${size}&quality=60&format=webp`
}

export default function CategoryList({
  categories,
  onToggleCategory,
  onEditItem,
  onRemoveItem,
  onAddItem,
  onAddCategory,
  onUpdateCategory,
  onRemoveCategory
}) {
  const { t } = useLanguage();
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('📦');
  const [editingCategory, setEditingCategory] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});

  const toggleExpand = (catId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  const handleAddCategorySubmit = () => {
    if (!newCategoryName.trim()) return;
    onAddCategory({
      name: newCategoryName.trim(),
      icon: newCategoryIcon
    });
    setNewCategoryName('');
    setNewCategoryIcon('📦');
    setShowAddCategory(false);
  };

  const handleUpdateCategory = (catId, updates) => {
    onUpdateCategory(catId, updates);
    setEditingCategory(null);
  };

  return (
    <>
      <h3 style={{
        fontSize: 13,
        fontWeight: 700,
        color: '#4B5563',
        marginBottom: 16,
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}>
        {t('main_menu')}
      </h3>

      {/* Add Category Button */}
      {!showAddCategory ? (
        <button
          onClick={() => setShowAddCategory(true)}
          style={{
            width: '100%',
            padding: '12px 16px',
            marginBottom: 16,
            background: '#F1F5F9',
            border: '2px dashed #CBD5E1',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 500,
            color: '#64748B',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6
          }}
        >
          ➕ {t('add_category')}
        </button>
      ) : (
        <div style={{
          background: '#FFFFFF',
          borderRadius: 10,
          border: '2px solid #22C55E',
          padding: 16,
          marginBottom: 16
        }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              type="text"
              placeholder={t('category_name_placeholder')}
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 12px',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                fontSize: 14
              }}
            />
            <select
              value={newCategoryIcon}
              onChange={(e) => setNewCategoryIcon(e.target.value)}
              style={{
                padding: '10px',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                fontSize: 16
              }}
            >
              <option value="📦">📦</option>
              <option value="🍔">🍔</option>
              <option value="🍕">🍕</option>
              <option value="🥗">🥗</option>
              <option value="🍝">🍝</option>
              <option value="🍣">🍣</option>
              <option value="🍰">🍰</option>
              <option value="☕">☕</option>
              <option value="🍹">🍹</option>
              <option value="🍺">🍺</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setShowAddCategory(false)}
              style={{
                flex: 1,
                padding: '10px',
                background: '#F1F5F9',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                color: '#64748B',
                cursor: 'pointer'
              }}
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleAddCategorySubmit}
              disabled={!newCategoryName.trim()}
              style={{
                flex: 1,
                padding: '10px',
                background: '#22C55E',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                color: 'white',
                cursor: newCategoryName.trim() ? 'pointer' : 'not-allowed',
                opacity: newCategoryName.trim() ? 1 : 0.5
              }}
            >
              {t('add')}
            </button>
          </div>
        </div>
      )}

      {/* Categories */}
      {categories.map((category) => (
        <div
          key={category.id}
          style={{
            background: 'white',
            borderRadius: 12,
            border: '1px solid #E2E8F0',
            marginBottom: 12,
            overflow: 'hidden'
          }}
        >
          {/* Category Header */}
          <div
            onClick={() => toggleExpand(category.id)}
            style={{
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              background: expandedCategories[category.id] ? '#F8FAFC' : 'white'
            }}
          >
            {editingCategory === category.id ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                <input
                  type="text"
                  defaultValue={category.name}
                  onBlur={(e) => handleUpdateCategory(category.id, { name: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleUpdateCategory(category.id, { name: e.target.value });
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    border: '1px solid #3B82F6',
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 600
                  }}
                />
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>{category.icon || '📦'}</span>
                <span style={{ fontWeight: 600, fontSize: 15, color: '#1E293B' }}>
                  {category.name}
                </span>
                <span style={{ fontSize: 12, color: '#94A3B8' }}>
                  ({category.items?.length || 0})
                </span>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Enable/Disable Toggle */}
              <label
                onClick={(e) => e.stopPropagation()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 8px',
                  background: category.enabled !== false ? '#DCFCE7' : '#FEE2E2',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 600,
                  color: category.enabled !== false ? '#166534' : '#991B1B'
                }}
              >
                <input
                  type="checkbox"
                  checked={category.enabled !== false}
                  onChange={(e) => onToggleCategory(category.id, e.target.checked)}
                  style={{ margin: 0 }}
                />
                {category.enabled !== false ? t('active') : t('paused')}
              </label>

              {/* Edit/Delete Actions */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingCategory(category.id);
                }}
                style={{
                  padding: '6px 8px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 14
                }}
              >
                ✏️
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(t('confirm_delete_category', { name: category.name }))) {
                    onRemoveCategory(category.id);
                  }
                }}
                style={{
                  padding: '6px 8px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 14
                }}
              >
                🗑️
              </button>
              <span style={{
                transform: expandedCategories[category.id] ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
                fontSize: 12
              }}>
                ▼
              </span>
            </div>
          </div>

          {/* Items List */}
          {expandedCategories[category.id] && (
            <div style={{ borderTop: '1px solid #E2E8F0' }}>
              {(category.items || []).map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    borderBottom: '1px solid #F1F5F9'
                  }}
                >
                  {/* Item Image - Lazy loaded thumbnail */}
                  <div
                    onClick={() => onEditItem(category.id, item)}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 8,
                      background: '#F1F5F9',
                      border: '1px dashed #CBD5E1',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      overflow: 'hidden'
                    }}
                  >
                    {item.image ? (
                        <img 
                            src={getThumbUrl(item.image, 80)}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                animation: 'fadeIn 0.3s ease'
                            }}
                        />
                    ) : (
                        <span style={{ fontSize: 16 }}>📷</span>
                    )}
                  </div>

                  {/* Item Info */}
                  <div 
                    onClick={() => onEditItem(category.id, item)}
                    style={{ flex: 1, cursor: 'pointer' }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#1E293B' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: 13, color: '#22C55E', fontWeight: 700 }}>
                      ${item.price?.toLocaleString?.() || item.price}
                    </div>
                  </div>

                  {/* Available Toggle */}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 8px',
                      background: item.available !== false ? '#DCFCE7' : '#FEE2E2',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 11,
                      fontWeight: 600,
                      color: item.available !== false ? '#166534' : '#991B1B'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={item.available !== false}
                      onChange={(e) => onToggleCategory(item.id, e.target.checked, category.id, item.id)}
                      style={{ margin: 0 }}
                    />
                    {item.available !== false ? t('available') : t('out_of_stock')}
                  </label>

                  {/* Remove Button */}
                  <button
                    onClick={() => onRemoveItem(category.id, item)}
                    style={{
                      padding: '6px 8px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 14,
                      color: '#EF4444'
                    }}
                  >
                    🗑️
                  </button>
                </div>
              ))}

              {/* Add Item Button */}
              <div
                onClick={() => onAddItem(category.id)}
                style={{
                  padding: '12px',
                  background: '#F8FAFC',
                  borderTop: '1px solid #E2E8F0',
                  color: '#3B82F6',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                ➕ {t('add_item')}
              </div>
            </div>
          )}
        </div>
      ))}
    </>
  );
}
