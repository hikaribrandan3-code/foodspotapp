import React, { createContext, useContext, useState } from 'react';
import { translations } from '../utils/translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    // 🔒 Spanish is hardwired globally — no switching, no localStorage, no DB sync
    const [lang] = useState('es');

    const t = (key) => {
        if (!translations[key]) {
            console.warn(`Translation key missing: ${key}`);
            return key;
        }
        return translations[key][lang] || translations[key]['es'] || translations[key]['en'] || key;
    };

    // No-op — language is locked to Spanish
    const changeLanguage = async () => {
        console.log('[LanguageContext] Language is hardwired to Spanish (es)');
    };

    return (
        <LanguageContext.Provider value={{ lang, t, changeLanguage, language: lang, setLanguage: changeLanguage }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
