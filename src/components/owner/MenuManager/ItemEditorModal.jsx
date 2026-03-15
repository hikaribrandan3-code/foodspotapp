import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ItemEditorModal({
  editingItem,
  editForm,
  setEditForm,
  onClose,
  onImageClick,
  uploadStatus,
  isUploading,
  fileInputRef,
  activeFeaturedSlotRef,
  activeCategoryItemRef
}) {
  const { t } = useLanguage();

  if (!editingItem) return null;

  const handleImageButtonClick = () => {
    if (editingItem.isFeaturedSlot) {
      activeFeaturedSlotRef.current = editingItem.index;
    } else if (editingItem.categoryId) {
      activeCategoryItemRef.current = { categoryId: editingItem.categoryId, itemId: editingItem.itemId };
    }
    fileInputRef.current?.click();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">{t('edit_item')}</h2>

        <div className="form-group">
          <label className="form-label">{t('name_label')}</label>
          <input
            type="text"
            className="form-input"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">{t('price_label_ars')}</label>
          <input
            type="number"
            className="form-input"
            value={editForm.price}
            onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">{t('image_label')}</label>
          {editForm.image && (
            <div style={{ marginBottom: 8 }}>
              <img
                src={editForm.image}
                alt="Preview"
                onClick={onImageClick}
                style={{
                  width: '100%',
                  maxHeight: 120,
                  objectFit: 'cover',
                  borderRadius: 10,
                  cursor: 'pointer'
                }}
                title={t('click_to_change_image')}
              />
            </div>
          )}
          <button
            className="btn btn-secondary btn-block"
            onClick={handleImageButtonClick}
            disabled={isUploading}
          >
            {isUploading 
              ? t('optimizing') 
              : (editForm.image ? t('change_image') : t('upload_image'))}
          </button>
          {uploadStatus && (
            <p style={{
              fontSize: 12,
              color: uploadStatus.success ? '#22C55E' : '#EF4444',
              marginTop: 6
            }}>
              {uploadStatus.message}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button
            className="btn btn-secondary"
            onClick={onClose}
            style={{ flex: 1 }}
          >
            {t('cancel')}
          </button>
          <button
            className="btn btn-primary"
            onClick={onClose}
            style={{ flex: 1 }}
          >
            {t('done')}
          </button>
        </div>
      </div>
    </div>
  );
}
