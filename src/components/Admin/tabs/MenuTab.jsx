import React, { useState, useRef } from 'react';
import { formatPrice } from '../../../config/menuData.js';
import { processAndStoreImage } from '../../../utils/imageOptimizer.js';

const cardStyle = { background: 'white', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: 16 };
const labelStyle = { fontSize: 11, fontWeight: 600, color: '#6B7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' };
const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 14, marginBottom: 12 };

export default function MenuTab({ menu, setMenu, categories, setCategories, businessId, updateMenuItemCloud, uploadAsset }) {
    const [editingItem, setEditingItem] = useState(null);
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryIcon, setNewCategoryIcon] = useState('📦');
    const [uploadingItemId, setUploadingItemId] = useState(null);
    const menuImageInputRef = useRef(null);

    const handleImageUpload = async (itemId, file) => {
        if (!file || !businessId) return;
        setUploadingItemId(itemId);
        try {
            const processed = await processAndStoreImage(file, { maxWidth: 800, quality: 0.85 });
            const { url, error } = await uploadAsset(processed.file, businessId, 'menu-images');
            if (!error && url) {
                updateMenuItemCloud(itemId, { image: url }, businessId);
                setMenu(prev => ({
                    ...prev,
                    categories: prev.categories.map(cat => ({
                        ...cat,
                        items: cat.items.map(item => item.id === itemId ? { ...item, image: url } : item)
                    }))
                }));
            }
        } catch (err) {
            console.error('Upload error:', err);
        } finally {
            setUploadingItemId(null);
        }
    };

    const handleAddCategory = () => {
        if (!newCategoryName.trim()) return;
        const newCategory = { id: `cat-${Date.now()}`, name: newCategoryName, icon: newCategoryIcon, items: [], enabled: true };
        setCategories([...categories, newCategory]);
        setShowAddCategory(false);
        setNewCategoryName('');
    };

    return (
        <>
            <h3 style={labelStyle}>🍽️ GESTIÓN DE MENÚ</h3>

            {categories.map(category => (
                <div key={category.id} style={cardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <span style={{ fontSize: 20 }}>{category.icon}</span>
                        <h4 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{category.name}</h4>
                    </div>

                    {category.items?.map(item => (
                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, border: '1px solid #E5E7EB', borderRadius: 8, marginBottom: 8 }}>
                            <div style={{ width: 60, height: 60, borderRadius: 8, background: item.image ? `url(${item.image}) center/cover` : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => menuImageInputRef.current?.click()}>
                                {!item.image && <span style={{ fontSize: 20 }}>📷</span>}
                            </div>
                            <input type="file" ref={menuImageInputRef} style={{ display: 'none' }} accept="image/*" onChange={(e) => handleImageUpload(item.id, e.target.files[0])} />

                            <div style={{ flex: 1 }}>
                                {editingItem?.id === item.id ? (
                                    <>
                                        <input type="text" value={editingItem.name} onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })} style={{ ...inputStyle, marginBottom: 4 }} />
                                        <input type="number" value={editingItem.price} onChange={(e) => setEditingItem({ ...editingItem, price: parseInt(e.target.value) || 0 })} style={{ width: 100 }} />
                                    </>
                                ) : (
                                    <>
                                        <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>{item.name}</p>
                                        <p style={{ fontSize: 12, color: '#22C55E', margin: '2px 0 0' }}>${formatPrice(item.price)}</p>
                                    </>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: 8 }}>
                                {editingItem?.id === item.id ? (
                                    <>
                                        <button onClick={() => { updateMenuItemCloud(item.id, { name: editingItem.name, price: editingItem.price }, businessId); setEditingItem(null); }} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#22C55E', color: 'white', fontSize: 12 }}>✓</button>
                                        <button onClick={() => setEditingItem(null)} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#6B7280', color: 'white', fontSize: 12 }}>✕</button>
                                    </>
                                ) : (
                                    <button onClick={() => setEditingItem(item)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #E5E7EB', background: 'white', fontSize: 12 }}>✏️</button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ))}

            <button onClick={() => setShowAddCategory(true)} style={{ width: '100%', padding: 12, borderRadius: 8, border: '2px dashed #E5E7EB', background: 'white', color: '#6B7280', fontWeight: 600 }}>
                + Nueva Categoría
            </button>

            {showAddCategory && (
                <div style={{ ...cardStyle, position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1000, width: '90%', maxWidth: 400 }}>
                    <h4>Nueva Categoría</h4>
                    <input type="text" placeholder="Nombre" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} style={inputStyle} />
                    <input type="text" placeholder="Icono (emoji)" value={newCategoryIcon} onChange={(e) => setNewCategoryIcon(e.target.value)} style={{ ...inputStyle, width: 60 }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={handleAddCategory} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: '#22C55E', color: 'white' }}>Crear</button>
                        <button onClick={() => setShowAddCategory(false)} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #E5E7EB', background: 'white' }}>Cancelar</button>
                    </div>
                </div>
            )}
        </>
    );
}
