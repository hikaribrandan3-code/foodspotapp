import React, { createContext, useContext, useState, useEffect } from 'react';
import { t as translate } from '../lib/translations';
// @ts-ignore
import { supabase } from '../../lib/supabaseClient.js';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ businessId, children }: { businessId?: string; children: React.ReactNode }) {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('fs_staff_language') || 'en';
  });

  // Fetch tenant's language from app_config on mount
  useEffect(() => {
    if (!businessId) return;
    supabase
      .from('branding')
      .select('app_config')
      .eq('business_id', businessId)
      .single()
      .then(({ data }: { data: any }) => {
        const tenantLang = data?.app_config?.language || 'en';
        setLanguageState(tenantLang);
        localStorage.setItem('fs_staff_language', tenantLang);
      })
      .catch(() => {}); // silent fail, use localStorage default
  }, [businessId]);

  const setLanguage = (lang: string) => {
    setLanguageState(lang);
    localStorage.setItem('fs_staff_language', lang);
    // Also sync with the main app key just in case
    localStorage.setItem('fs_staff_lang', lang);
  };

  const t = (key: string, replacements?: Record<string, string | number>) => {
    let text = translate(key, language);
    if (replacements) {
      Object.entries(replacements).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, v.toString());
      });
    }
    return text;
  };

  // Listen for storage changes from other tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'fs_staff_language' && e.newValue) {
        setLanguageState(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) return { language: 'en', setLanguage: () => {}, t: (key: string) => key };
  return context;
}
