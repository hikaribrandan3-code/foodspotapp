import { useState } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';

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
  activeCategoryItemRef,
  onGenerateDescription
}) {
  const { t } = useLanguage();
  const [isGenerating, setIsGenerating] = useState(false);

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
          <label className="form-label">{t('description') || 'Description'}</label>
          <textarea
            className="form-input"
            rows={3}
            value={editForm.description || ''}
            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            placeholder={t('item_description_placeholder') || 'Short appetizing description...'}
          />
          {editingItem.categoryId && !editingItem.isFeaturedSlot && (
            <button
              type="button"
              className="btn btn-secondary btn-block"
              style={{ marginTop: 8, fontSize: 13 }}
              onClick={async () => {
                setIsGenerating(true);
                try {
                  await onGenerateDescription?.(editingItem.categoryId, editingItem.itemId);
                } finally {
                  setIsGenerating(false);
                }
              }}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <span className="spinner" style={{
                    width: 14, height: 14, border: '2px solid #E5E7EB',
                    borderTopColor: '#3B82F6', borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite', display: 'inline-block'
                  }} />
                  Generating...
                </span>
              ) : (
                <span>✨ {t('generate_description') || 'Generate Description'}</span>
              )}
            </button>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">{t('calories') || 'Calories'}</label>
          <input
            type="number"
            className="form-input"
            value={editForm.calories || ''}
            onChange={(e) => setEditForm({ ...editForm, calories: e.target.value })}
            placeholder="e.g. 420"
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
