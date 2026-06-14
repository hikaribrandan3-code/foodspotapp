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
  // CRITICAL: Start with null to force Supabase fetch instead of stale localStorage
  const [language, setLanguageState] = useState<string | null>(null);

  // Load language: staff personal preference (localStorage) takes priority over business default
  useEffect(() => {
    const fetchLanguage = async () => {
      // If staff has already set a personal language preference, respect it
      const staffPersonalLang = localStorage.getItem('fs_staff_language');
      if (staffPersonalLang) {
        setLanguageState(staffPersonalLang);
        return;
      }

      if (!businessId) {
        setLanguageState('en');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('businesses')
          .select('language')
          .eq('id', businessId)
          .single();

        if (error || !data) {
          setLanguageState('en');
          return;
        }

        // No personal preference — use business language as default (do NOT save to localStorage)
        setLanguageState(data?.language || 'en');
      } catch (err) {
        setLanguageState('en');
      }
    };

    fetchLanguage();
  }, [businessId]);

  const setLanguage = (lang: string) => {
    setLanguageState(lang);
    localStorage.setItem('fs_staff_language', lang);
    // Also sync with the main app key just in case
    localStorage.setItem('fs_staff_lang', lang);
  };

  const t = (key: string, replacements?: Record<string, string | number>) => {
    // Use language || 'en' to avoid passing null to translate
    let text = translate(key, language || 'en');
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
    <LanguageContext.Provider value={{ language: language || 'en', setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) return { language: 'en', setLanguage: () => {}, t: (key: string) => key };
  // If language is still null (loading), return 'en' as fallback to avoid UI breakage
  if (context.language === null) {
    return { language: 'en', setLanguage: () => {}, t: (key: string) => (translate(key, 'en') || key) };
  }
  return context;
}
