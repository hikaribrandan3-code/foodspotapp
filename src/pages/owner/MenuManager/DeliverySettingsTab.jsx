import { motion } from 'framer-motion';
import { Gift, Leaf, Store } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';

export default function DeliverySettingsTab({
  deliveryRadius,
  setDeliveryRadius,
  deliveryFee,
  setDeliveryFee,
  freeDeliveryThreshold,
  setFreeDeliveryThreshold,
  isDeliveryFeeEnabled,
  setIsDeliveryFeeEnabled,
  isFreeDeliveryEnabled,
  setIsFreeDeliveryEnabled,
  isDeliveryPaused,
  setIsDeliveryPaused
}) {
  const { t } = useLanguage();

  return (
    <section className="border-t border-stone-200 pt-5 md:pt-8 mb-8 md:mb-12">
      <div className="bg-white border border-stone-100 rounded-2xl p-4 md:p-6 mb-5 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-3 opacity-5">
          <Leaf className="w-24 h-24 text-amber-500 -rotate-12" />
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div>
            <h2 className="font-['Outfit',sans-serif] text-xl md:text-3xl text-stone-950 mb-1 font-black tracking-tight leading-none italic">
              {t('delivery_system_title') || 'Delivery System'}
            </h2>
            <p className="text-xs md:text-sm text-stone-500 leading-relaxed font-medium">
              {t('delivery_system_subtitle') || 'Define your radius, set fees, control thresholds. Full control, no complexity.'}
            </p>
          </div>

          {/* Pause Delivery Toggle */}
          <div className="flex items-center gap-3">
            <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDeliveryPaused ? 'text-red-500' : 'text-emerald-600'}`}>
              {isDeliveryPaused ? (t('delivery_paused') || 'Paused') : (t('delivery_active') || 'Active')}
            </span>
            <label className="relative flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={!isDeliveryPaused}
                onChange={(e) => setIsDeliveryPaused(!e.target.checked)}
                className="sr-only peer"
              />
              <div className="h-8 w-14 rounded-full bg-stone-100 transition-all peer-checked:bg-emerald-600">
                <div className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow-md transition-all duration-300 ${!isDeliveryPaused ? 'translate-x-6' : ''}`} />
              </div>
            </label>
          </div>
        </div>
      </div>

      <div className={`grid grid-cols-12 gap-8 transition-opacity duration-500 ${isDeliveryPaused ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
        {/* Map & Radius */}
        <div className="col-span-12 group">
          <div className="bg-white rounded-[2.5rem] border border-stone-200 overflow-hidden flex flex-col md:flex-row shadow-sm transition-all hover:shadow-md h-auto md:h-[18rem]">
            <div className="h-48 md:h-full w-full md:w-2/3 relative bg-stone-50 flex items-center justify-center overflow-hidden border-b md:border-b-0 md:border-r border-stone-100">
              <div className="absolute inset-0 opacity-[0.03]"
                style={{ backgroundImage: `radial-gradient(circle, #059669 2px, transparent 2px)`, backgroundSize: '50px 50px' }}></div>

              <motion.div
                initial={false}
                animate={{
                  width: `${deliveryRadius * 10 + 10}%`,
                  height: `${deliveryRadius * 10 + 10}%`
                }}
                className="max-w-[90%] max-h-[90%] rounded-full border-2 border-emerald-600/20 bg-emerald-600/5 flex items-center justify-center relative transition-all ease-out duration-1000"
              >
                <div className="w-10 h-10 md:w-16 md:h-16 bg-emerald-600 rounded-full shadow-lg ring-8 ring-emerald-600/10 flex items-center justify-center">
                  <Store className="w-5 h-5 md:w-8 md:h-8 text-white" />
                </div>

                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-stone-950 text-white px-5 py-2.5 rounded-full font-black text-xs tracking-[0.2em] shadow-xl font-['Outfit',sans-serif] italic">
                  {deliveryRadius} KM
                </div>
              </motion.div>
            </div>

            <div className="p-5 md:p-6 w-full md:w-1/3 flex flex-col justify-center">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-lg md:text-xl font-['Outfit',sans-serif] font-black text-stone-950 uppercase tracking-tight italic">{t('radius') || 'Radius'}</h3>
                <div className="flex items-center gap-2 px-4 py-2 bg-stone-100 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-600">{t('active') || 'Active'}</span>
                </div>
              </div>
              <div className="space-y-3">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={deliveryRadius}
                  onChange={(e) => setDeliveryRadius(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-stone-100 rounded-full appearance-none cursor-pointer accent-emerald-600"
                />
                <div className="flex justify-between text-[9px] font-bold text-stone-400 uppercase tracking-[0.1em]">
                  <span className="px-2 py-1 bg-stone-50 rounded-lg">{t('local') || 'Local'}</span>
                  <span className="text-emerald-600 px-2 py-1 bg-emerald-50 rounded-lg border border-emerald-100">{t('regional') || 'Regional'}</span>
                  <span className="px-2 py-1 bg-stone-50 rounded-lg">{t('wide') || 'Wide'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fees Grid */}
        <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
          <div className="bg-white rounded-2xl border border-stone-200 p-4 md:p-5 flex flex-col shadow-sm transition-all hover:shadow-md">
            <div className="flex justify-between items-center mb-3 text-left">
              <div>
                <p className="text-stone-400 font-bold uppercase text-[10px] tracking-[0.3em] mb-1">{t('service_fee') || 'Service Fee'}</p>
                <h3 className="text-base md:text-lg text-stone-950 font-['Outfit',sans-serif] font-black italic">{t('base_fee') || 'Base Fee'}</h3>
              </div>
              <label className="relative flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={isDeliveryFeeEnabled}
                  onChange={(e) => setIsDeliveryFeeEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="h-7 w-12 rounded-full bg-stone-100 transition-all peer-checked:bg-emerald-600">
                  <div className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-all duration-300 ${isDeliveryFeeEnabled ? 'translate-x-5' : ''}`} />
                </div>
              </label>
            </div>

            <div className={`relative transition-all duration-500 ${isDeliveryFeeEnabled ? 'opacity-100' : 'opacity-20 scale-95'}`}>
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300 font-['Outfit',sans-serif] font-black text-xl italic">$</div>
              <input
                type="text"
                value={deliveryFee}
                disabled={!isDeliveryFeeEnabled}
                onChange={(e) => setDeliveryFee(e.target.value)}
                className="w-full bg-stone-50 text-stone-950 font-['Outfit',sans-serif] font-black pl-9 py-3 rounded-xl focus:bg-white transition-all text-2xl md:text-3xl outline-none"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="bg-emerald-600 rounded-2xl p-4 md:p-5 flex flex-col shadow-lg shadow-emerald-900/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10 drop-shadow-2xl">
              <Gift className="w-16 h-16 text-white -rotate-12" />
            </div>

            <div className="flex justify-between items-center mb-3 relative z-10 text-left">
              <div>
                <p className="text-white/60 font-bold uppercase text-[10px] tracking-[0.3em] mb-1">{t('complimentary') || 'Complimentary'}</p>
                <h3 className="text-base md:text-lg text-white font-['Outfit',sans-serif] font-black italic">{t('free_delivery_above') || 'Free Delivery Above'}</h3>
              </div>
              <label className="relative flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={isFreeDeliveryEnabled}
                  onChange={(e) => setIsFreeDeliveryEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="h-7 w-12 rounded-full bg-emerald-700 transition-all peer-checked:bg-white">
                  <div className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white peer-checked:bg-stone-950 shadow-md transition-all duration-300 ${isFreeDeliveryEnabled ? 'translate-x-5' : ''}`} />
                </div>
              </label>
            </div>

            <div className={`relative z-10 transition-all duration-500 ${isFreeDeliveryEnabled ? 'opacity-100' : 'opacity-20 scale-95'}`}>
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 font-['Outfit',sans-serif] font-black text-xl italic">$</div>
              <input
                type="text"
                value={freeDeliveryThreshold}
                disabled={!isFreeDeliveryEnabled}
                onChange={(e) => setFreeDeliveryThreshold(e.target.value)}
                className="w-full bg-white/10 text-white font-['Outfit',sans-serif] font-black pl-9 py-3 rounded-xl focus:bg-white/20 transition-all text-2xl md:text-3xl outline-none placeholder-white/20"
                placeholder="--.--"
              />
            </div>
          </div>
        </div>


      </div>
    </section>
  );
}
