
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Cloud, CloudRain, CloudLightning, Wind, Thermometer } from 'lucide-react';

const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
const BIZ_LAT = parseFloat(import.meta.env.VITE_BUSINESS_LAT || "-34.6037");
const BIZ_LNG = parseFloat(import.meta.env.VITE_BUSINESS_LNG || "-58.3816");

export default function WeatherWidget({ lat, lng, variant = 'compact' }) {
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(true);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3958.8;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const activeLat = lat && lng && calculateDistance(BIZ_LAT, BIZ_LNG, lat, lng) > 20 ? lat : BIZ_LAT;
  const activeLng = lat && lng && calculateDistance(BIZ_LAT, BIZ_LNG, lat, lng) > 20 ? lng : BIZ_LNG;

  const getIcon = (condition, size = 18) => {
    const cond = condition.toLowerCase();
    const iconElement = (() => {
      if (cond.includes('sun') || cond.includes('clear')) return <Sun className="text-yellow-400" size={size} />;
      if (cond.includes('cloud')) return <Cloud className="text-slate-300" size={size} />;
      if (cond.includes('rain') || cond.includes('drizzle')) return <CloudRain className="text-blue-400" size={size} />;
      if (cond.includes('storm') || cond.includes('bolt')) return <CloudLightning className="text-orange-400" size={size} />;
      if (cond.includes('snow')) return <Wind className="text-blue-100" size={size} />;
      return <Sun className="text-yellow-400" size={size} />;
    })();

    return (
      <motion.div
        animate={{
          y: [0, -3, 0],
          rotate: cond.includes('sun') ? [0, 5, 0] : 0
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {iconElement}
      </motion.div>
    );
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!API_KEY) {
        setWeather({ temp: 24, feels_like: 26, condition: 'Sunny', icon: 'sun' });
        setForecast([
          { day: 'Mon', high: 26, low: 18, condition: 'Sunny' },
          { day: 'Tue', high: 24, low: 17, condition: 'Cloudy' },
          { day: 'Wed', high: 21, low: 15, condition: 'Rain' },
          { day: 'Thu', high: 27, low: 19, condition: 'Clear' },
          { day: 'Fri', high: 28, low: 20, condition: 'Sunny' },
          { day: 'Sat', high: 25, low: 18, condition: 'Cloudy' },
          { day: 'Sun', high: 23, low: 17, condition: 'Rain' },
        ]);
        setLoading(false);
        return;
      }

      try {
        const [wRes, fRes] = await Promise.all([
          fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${activeLat}&lon=${activeLng}&appid=${API_KEY}&units=metric`),
          fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${activeLat}&lon=${activeLng}&appid=${API_KEY}&units=metric`)
        ]);

        const wData = await wRes.json();
        const fData = await fRes.json();

        setWeather({
          temp: Math.round(wData.main.temp),
          feels_like: Math.round(wData.main.feels_like),
          condition: wData.weather[0].main,
          icon: wData.weather[0].icon
        });

        // Group by day for high/low
        const daily = {};
        fData.list.forEach((item) => {
          const date = new Date(item.dt * 1000).toLocaleDateString(undefined, { weekday: 'short' });
          if (!daily[date]) {
            daily[date] = { high: -Infinity, low: Infinity, condition: item.weather[0].main };
          }
          daily[date].high = Math.max(daily[date].high, item.main.temp);
          daily[date].low = Math.min(daily[date].low, item.main.temp);
        });

        // Show all unique days available (usually 5-6)
        const dailyForecast = Object.entries(daily).map(([day, data]) => ({
          day,
          high: Math.round(data.high),
          low: Math.round(data.low),
          condition: data.condition
        }));

        setForecast(dailyForecast);
      } catch (err) {
        console.error("Weather fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 900000);
    return () => clearInterval(interval);
  }, [activeLat, activeLng]);

  if (loading || !weather) return null;

  if (variant === 'forecast') {
    return (
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar py-1.5 px-1">
        {forecast.map((f, i) => (
          <motion.div
            key={f.day}
            whileHover={{ scale: 1.05 }}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 25 }}
            className="flex-shrink-0 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-full px-3.5 py-1 flex items-center gap-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
          >
            <span className="text-[8px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest w-7">{f.day}</span>
            <div className="flex-shrink-0">{getIcon(f.condition, 12)}</div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10.5px] font-black text-slate-800 dark:text-white">{f.high}°</span>
              <span className="text-[8px] font-bold text-slate-300 dark:text-slate-600">{f.low}°</span>
            </div>
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-2.5 flex items-center gap-4 shadow-2xl transition-colors"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={weather.condition}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.5, opacity: 0 }}
          className="bg-white/10 p-2 rounded-xl"
        >
          {getIcon(weather.condition)}
        </motion.div>
      </AnimatePresence>

      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="text-xl font-black text-white leading-none drop-shadow-sm">{weather.temp}°C</span>
          <span className="text-[10px] font-bold text-white/80 uppercase tracking-widest leading-none">{weather.condition}</span>
        </div>
        <div className="flex items-center gap-1 mt-1">
          <Thermometer size={10} className="text-white/60" />
          <span className="text-[9px] font-bold text-white/50 uppercase tracking-tighter">Feels {weather.feels_like}°C</span>
        </div>
      </div>
    </motion.div>
  );
}
