import { motion } from 'framer-motion';
import { Flame, Leaf, Star, Wheat, Camera, Crop } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { processAndStoreImage } from '../../../utils/imageOptimizer';
import PhotoAdjuster from '../../../components/PhotoAdjuster';

export default function MenuItemCard({ item, onUpdate, onDelete }) {
  const [inStock, setInStock] = useState(item.available !== false);
  const [description, setDescription] = useState(item.description || '');
  const [calories, setCalories] = useState(item.calories || item.kcal || 0);
  const [isVegan, setIsVegan] = useState(item.is_vegan || false);
  const [isGlutenFree, setIsGlutenFree] = useState(item.is_gluten_free || false);
  const [isSpicy, setIsSpicy] = useState(item.is_spicy || false);
  const [isFeatured, setIsFeatured] = useState(item.featured || false);
  const [imgUploading, setImgUploading] = useState(false);
  const [showPhotoAdjuster, setShowPhotoAdjuster] = useState(false);
  const fileInputRef = useRef(null);

  // Sync local state when item prop changes (realtime updates, parent refresh)
  useEffect(() => {
    setInStock(item.available !== false);
    setDescription(item.description || '');
    setCalories(item.calories || item.kcal || 0);
    setIsVegan(item.is_vegan || false);
    setIsGlutenFree(item.is_gluten_free || false);
    setIsSpicy(item.is_spicy || false);
    setIsFeatured(item.featured || false);
  }, [item.id, item.available, item.description, item.calories, item.kcal, item.is_vegan, item.is_gluten_free, item.is_spicy, item.featured]);

  const handleToggle = (field, value, setter) => {
    setter(value);
    onUpdate(item.id, { [field]: value });
  };

  const handleDescriptionChange = (e) => {
    setDescription(e.target.value);
    onUpdate(item.id, { description: e.target.value });
  };

  const handleKcalChange = (e) => {
    const val = parseInt(e.target.value) || 0;
    setCalories(val);
    onUpdate(item.id, { calories: val });
  };

  const priceDisplay = typeof item.price === 'number'
    ? (item.price / 100).toFixed(2)
    : item.price;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`group/card relative flex flex-col overflow-hidden rounded-[2rem] bg-white border border-stone-200 transition-all duration-500 hover:shadow-[0_40px_80px_rgba(28,25,23,0.06)] hover:-translate-y-1.5 ${
        !inStock ? 'opacity-60 saturate-[0.2]' : ''
      }`}
    >
      <div className="relative h-48 w-full overflow-hidden">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setImgUploading(true);
            try {
              const { publicUrl } = await processAndStoreImage(file);
              onUpdate(item.id, { image_url: publicUrl });
            } catch (err) {
              console.error('[MenuItemCard] upload error:', err);
              alert('Image upload failed: ' + err.message);
            } finally {
              setImgUploading(false);
              e.target.value = '';
            }
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="relative h-full w-full p-0 border-none bg-transparent cursor-pointer"
          title="Tap to change photo"
        >
          <img
            src={item.image_url || item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800'}
            alt={item.name}
            className="h-full w-full object-cover transition-transform duration-1000 group-hover/card:scale-110"
          />
          {imgUploading && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center justify-center">
            <div className="flex flex-col gap-2 items-center">
              <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg">
                <Camera className="h-4 w-4 text-stone-700" />
                <span className="text-xs font-bold uppercase tracking-widest text-stone-700">Change Photo</span>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowPhotoAdjuster(true);
                }}
                className="flex items-center gap-2 bg-emerald-600/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg hover:bg-emerald-700 transition-colors"
              >
                <Crop className="h-4 w-4 text-white" />
                <span className="text-xs font-bold uppercase tracking-widest text-white">Adjust</span>
              </button>
            </div>
          </div>
        </button>

        <div className="absolute top-6 right-6 flex flex-col gap-2 pointer-events-none z-10">
          <div className="flex items-center gap-2 rounded-full bg-white/95 backdrop-blur-md px-4 py-2 text-stone-900 shadow-xl border border-white/50 pointer-events-auto">
            <Flame className="h-3.5 w-3.5 text-emerald-600 fill-current" />
            <input
              type="text"
              value={calories}
              onChange={handleKcalChange}
              className="w-10 bg-transparent text-[10px] font-bold uppercase tracking-[0.1em] border-none outline-none focus:text-emerald-600"
            />
            <span className="text-[10px] font-bold uppercase tracking-[0.1em]">KCAL</span>
          </div>
        </div>

        <div className="absolute top-6 left-6 flex flex-col gap-2 items-start pointer-events-none z-10">
          {isFeatured && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-white shadow-xl border border-amber-400/50"
            >
              <Star className="h-3.5 w-3.5 fill-current" />
              <span className="text-[10px] font-black uppercase tracking-widest">Special</span>
            </motion.div>
          )}
          {isVegan && (
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-white shadow-xl"
            >
              <Leaf className="h-3.5 w-3.5 fill-current" />
              <span className="text-[10px] font-black uppercase tracking-widest">Natural</span>
            </motion.div>
          )}
          {isGlutenFree && (
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="flex items-center gap-2 rounded-full bg-stone-900/90 backdrop-blur-md px-4 py-2 text-white shadow-xl border border-white/10"
              title="Gluten Free"
            >
              <Wheat className="h-3.5 w-3.5" />
              <span className="text-[10px] font-black uppercase tracking-widest">Tacc</span>
            </motion.div>
          )}
          {isSpicy && (
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="flex items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-white shadow-xl"
              title="Spicy"
            >
              <Flame className="h-3.5 w-3.5 fill-current" />
              <span className="text-[10px] font-black uppercase tracking-widest">Spicy</span>
            </motion.div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 p-6">
        <div className="flex justify-between items-start gap-4">
          <h4 className="flex-grow font-['Outfit',sans-serif] text-2xl md:text-3xl font-bold text-stone-950 leading-[1.1] italic">
            {item.name}
          </h4>
          <div className="flex-shrink-0">
            <span className="text-2xl md:text-3xl font-bold text-emerald-600 font-['Outfit',sans-serif]">
              ${priceDisplay}
            </span>
          </div>
        </div>

        <textarea
          value={description}
          onChange={handleDescriptionChange}
          placeholder="Briefly describe the flavor profile..."
          className="w-full bg-stone-50 rounded-xl border border-stone-100 px-4 py-3 text-base md:text-lg font-medium leading-relaxed text-stone-500 italic resize-none outline-none focus:text-stone-900 focus:bg-white focus:border-emerald-200 transition-colors" rows={1} style={{ minHeight: '48px' }}
        />

        <div className="flex items-center justify-between pt-4 border-t border-stone-100">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleToggle('is_vegan', !isVegan, setIsVegan)}
              className={`p-1.5 rounded-full border transition-all ${isVegan ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-stone-50 border-stone-200 text-stone-300 hover:text-stone-400'}`}
              title="Toggle Natural/Vegan"
            >
              <Leaf className={`h-3.5 w-3.5 ${isVegan ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={() => handleToggle('is_gluten_free', !isGlutenFree, setIsGlutenFree)}
              className={`p-1.5 rounded-full border transition-all ${isGlutenFree ? 'bg-stone-900 border-stone-900 text-white' : 'bg-stone-50 border-stone-200 text-stone-300 hover:text-stone-400'}`}
              title="Toggle Gluten Free"
            >
              <Wheat className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => handleToggle('is_spicy', !isSpicy, setIsSpicy)}
              className={`p-1.5 rounded-full border transition-all ${isSpicy ? 'bg-red-50 border-red-100 text-red-500' : 'bg-stone-50 border-stone-200 text-stone-300 hover:text-stone-400'}`}
              title="Toggle Spicy"
            >
              <Flame className={`h-3.5 w-3.5 ${isSpicy ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={() => handleToggle('featured', !isFeatured, setIsFeatured)}
              className={`p-1.5 rounded-full border transition-all ${isFeatured ? 'bg-amber-50 border-amber-100 text-amber-500' : 'bg-stone-50 border-stone-200 text-stone-300 hover:text-stone-400'}`}
              title="Toggle Featured"
            >
              <Star className={`h-3.5 w-3.5 ${isFeatured ? 'fill-current' : ''}`} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleToggle('available', !inStock, setInStock)}
              className={`flex items-center gap-2 px-5 py-2 rounded-full border-2 transition-all active:scale-95 text-[10px] font-black uppercase tracking-[0.1em] shadow-sm ${
                inStock
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'
                  : 'bg-stone-900 text-white border-stone-900 hover:bg-stone-800'
              }`}
            >
              {inStock ? 'In Kitchen' : 'Sold Out'}
            </button>
            {onDelete && (
              <button
                onClick={() => onDelete(item.id)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full border-2 border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-all active:scale-95 text-[10px] font-black uppercase tracking-[0.1em] shadow-sm"
                title="Delete item"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {/* PhotoAdjuster Modal */}
      {showPhotoAdjuster && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-sm max-h-[90vh] overflow-y-auto"
          >
            <PhotoAdjuster
              item={item}
              onSave={(offsetY) => {
                onUpdate(item.id, { image_offset_y: offsetY });
                setShowPhotoAdjuster(false);
              }}
              onCancel={() => setShowPhotoAdjuster(false)}
            />
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
