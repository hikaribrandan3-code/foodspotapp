import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Leaf, Store, ChevronDown } from 'lucide-react';
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
  const [showFees, setShowFees] = useState(false);

  return (
    <section className="border-t border-stone-200 pt-3 md:pt-4 mb-4 md:mb-6">
      <div className="bg-white border border-stone-100 rounded-2xl p-3 md:p-4 mb-3 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-2 opacity-5">
          <Leaf className="w-20 h-20 text-amber-500 -rotate-12" />
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 relative z-10">
          <div>
            <h2 className="font-['Outfit',sans-serif] text-lg md:text-2xl text-stone-950 mb-0.5 font-black tracking-tight leading-none italic">
              {t('delivery_system_title') || 'Delivery System'}
            </h2>
            <p className="text-[11px] md:text-xs text-stone-500 leading-relaxed font-medium">
              {t('delivery_system_subtitle') || 'Define your radius, set fees, control thresholds. Full control, no complexity.'}
            </p>
          </div>

          {/* Pause Delivery Toggle */}
          <div className="flex items-center gap-2">
            <span className={`text-[9px] font-black uppercase tracking-[0.15em] ${isDeliveryPaused ? 'text-red-500' : 'text-emerald-600'}`}>
              {isDeliveryPaused ? (t('delivery_paused') || 'Paused') : (t('delivery_active') || 'Active')}
            </span>
            <label className="relative flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={!isDeliveryPaused}
                onChange={(e) => setIsDeliveryPaused(!e.target.checked)}
                className="sr-only peer"
              />
              <div className="h-6 w-11 rounded-full bg-stone-100 transition-all peer-checked:bg-emerald-600">
                <div className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-all duration-300 ${!isDeliveryPaused ? 'translate-x-5' : ''}`} />
              </div>
            </label>
          </div>
        </div>
      </div>

      <div className={`flex flex-col gap-4 transition-opacity duration-500 ${isDeliveryPaused ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
        {/* Map & Radius */}
        <div className="group">
          <div className="bg-white rounded-[2.5rem] border border-stone-200 overflow-hidden flex flex-col md:flex-row shadow-sm transition-all hover:shadow-md h-auto md:h-[14rem]">
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
                <div className="w-8 h-8 md:w-12 md:h-12 bg-emerald-600 rounded-full shadow-lg ring-8 ring-emerald-600/10 flex items-center justify-center">
                  <Store className="w-4 h-4 md:w-6 md:h-6 text-white" />
                </div>

                <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-stone-950 text-white px-4 py-2 rounded-full font-black text-[10px] tracking-[0.15em] shadow-xl font-['Outfit',sans-serif] italic">
                  {deliveryRadius} KM
                </div>
              </motion.div>
            </div>

            <div className="p-3 md:p-4 w-full md:w-1/3 flex flex-col justify-center">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-base md:text-lg font-['Outfit',sans-serif] font-black text-stone-950 uppercase tracking-tight italic">{t('radius') || 'Radius'}</h3>
                <div className="flex items-center gap-1 px-3 py-1.5 bg-stone-100 rounded-full">
                  <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[8px] font-black uppercase tracking-[0.15em] text-stone-600">{t('active') || 'Active'}</span>
                </div>
              </div>
              <div className="space-y-2">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={deliveryRadius}
                  onChange={(e) => setDeliveryRadius(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-stone-100 rounded-full appearance-none cursor-pointer accent-emerald-600"
                />
                <div className="flex justify-between text-[8px] font-bold text-stone-400 uppercase tracking-[0.1em]">
                  <span className="px-1.5 py-0.5 bg-stone-50 rounded-lg">{t('local') || 'Local'}</span>
                  <span className="text-emerald-600 px-1.5 py-0.5 bg-emerald-50 rounded-lg border border-emerald-100">{t('regional') || 'Regional'}</span>
                  <span className="px-1.5 py-0.5 bg-stone-50 rounded-lg">{t('wide') || 'Wide'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fee Settings Accordion */}
        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm">
          <button
            onClick={() => setShowFees(!showFees)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-stone-50 transition-colors rounded-2xl"
          >
            <h3 className="text-base font-['Outfit',sans-serif] font-black text-stone-950 uppercase tracking-tight italic">
              Fee Settings
            </h3>
            <motion.div
              animate={{ rotate: showFees ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown size={20} className="text-stone-400" />
            </motion.div>
          </button>

          <AnimatePresence>
            {showFees && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="flex flex-col gap-3 p-4">
                  <div className="bg-stone-50 rounded-xl p-4 flex flex-col transition-all">
                    <div className="flex justify-between items-center mb-2 text-left">
                      <div>
                        <p className="text-stone-400 font-bold uppercase text-[9px] tracking-[0.2em] mb-0.5">{t('service_fee') || 'Service Fee'}</p>
                        <h3 className="text-sm text-stone-950 font-['Outfit',sans-serif] font-black italic">{t('base_fee') || 'Base Fee'}</h3>
                      </div>
                      <label className="relative flex cursor-pointer items-center">
                        <input
                          type="checkbox"
                          checked={isDeliveryFeeEnabled}
                          onChange={(e) => setIsDeliveryFeeEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="h-6 w-11 rounded-full bg-stone-100 transition-all peer-checked:bg-emerald-600">
                          <div className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-all duration-300 ${isDeliveryFeeEnabled ? 'translate-x-5' : ''}`} />
                        </div>
                      </label>
                    </div>

                    <div className={`relative transition-all duration-500 ${isDeliveryFeeEnabled ? 'opacity-100' : 'opacity-20 scale-95'}`}>
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-300 font-['Outfit',sans-serif] font-black text-lg italic">$</div>
                      <input
                        type="text"
                        value={deliveryFee}
                        disabled={!isDeliveryFeeEnabled}
                        onChange={(e) => setDeliveryFee(e.target.value)}
                        className="w-full bg-stone-50 text-stone-950 font-['Outfit',sans-serif] font-black pl-8 py-2.5 rounded-xl focus:bg-white transition-all text-xl outline-none"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="bg-emerald-600 rounded-xl p-3 flex flex-col shadow-lg shadow-emerald-900/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10 drop-shadow-2xl">
                      <Gift className="w-12 h-12 text-white -rotate-12" />
                    </div>

                    <div className="flex justify-between items-center mb-2 relative z-10 text-left">
                      <div>
                        <p className="text-white/60 font-bold uppercase text-[9px] tracking-[0.2em] mb-0.5">{t('complimentary') || 'Complimentary'}</p>
                        <h3 className="text-sm text-white font-['Outfit',sans-serif] font-black italic">{t('free_delivery_above') || 'Free Delivery Above'}</h3>
                      </div>
                      <label className="relative flex cursor-pointer items-center">
                        <input
                          type="checkbox"
                          checked={isFreeDeliveryEnabled}
                          onChange={(e) => setIsFreeDeliveryEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="h-6 w-11 rounded-full bg-emerald-700 transition-all peer-checked:bg-white">
                          <div className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white peer-checked:bg-stone-950 shadow-md transition-all duration-300 ${isFreeDeliveryEnabled ? 'translate-x-5' : ''}`} />
                        </div>
                      </label>
                    </div>

                    <div className={`relative z-10 transition-all duration-500 ${isFreeDeliveryEnabled ? 'opacity-100' : 'opacity-20 scale-95'}`}>
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400 font-['Outfit',sans-serif] font-black text-lg italic">$</div>
                      <input
                        type="text"
                        value={freeDeliveryThreshold}
                        disabled={!isFreeDeliveryEnabled}
                        onChange={(e) => setFreeDeliveryThreshold(e.target.value)}
                        className="w-full bg-white/10 text-white font-['Outfit',sans-serif] font-black pl-8 py-2.5 rounded-xl focus:bg-white/20 transition-all text-xl outline-none placeholder-white/20"
                        placeholder="--.--"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
