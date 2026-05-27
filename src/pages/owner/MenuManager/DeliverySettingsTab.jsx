import { Gift, Leaf } from 'lucide-react';
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

  const radiusOptions = [
    { label: t('local') || 'Local', value: 2 },
    { label: t('regional') || 'Regional', value: 5 },
    { label: t('wide') || 'Wide', value: 10 }
  ];

  return (
    <section className="border-t border-stone-200 pt-3 md:pt-4 mb-4 md:mb-6">
      {/* Hero: Title + Pause Toggle */}
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
        {/* Radius Selector: Pills */}
        <div className="flex gap-2 flex-wrap">
          {radiusOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setDeliveryRadius(option.value)}
              className={`px-4 py-2 rounded-full font-black text-sm uppercase tracking-tight transition-all ${
                deliveryRadius === option.value
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Fee Settings: 2-Column Grid */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Service Fee Card */}
          <div className="flex-1 bg-stone-50 rounded-xl p-4 flex flex-col">
            <div className="flex justify-between items-center mb-3 text-left">
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
                className="w-full bg-white text-stone-950 font-['Outfit',sans-serif] font-black pl-8 py-2.5 rounded-lg focus:bg-emerald-50 transition-all text-xl outline-none border border-stone-200"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Free Delivery Card */}
          <div className="flex-1 bg-emerald-600 rounded-xl p-4 flex flex-col shadow-lg shadow-emerald-900/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10">
              <Gift className="w-12 h-12 text-white -rotate-12" />
            </div>

            <div className="flex justify-between items-center mb-3 relative z-10 text-left">
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
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-300 font-['Outfit',sans-serif] font-black text-lg italic">$</div>
              <input
                type="text"
                value={freeDeliveryThreshold}
                disabled={!isFreeDeliveryEnabled}
                onChange={(e) => setFreeDeliveryThreshold(e.target.value)}
                className="w-full bg-white/10 text-white font-['Outfit',sans-serif] font-black pl-8 py-2.5 rounded-lg focus:bg-white/20 transition-all text-xl outline-none placeholder-white/20 border border-white/20"
                placeholder="--.--"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
