import React, { createContext, useContext, useState } from 'react';
import { translations } from '../utils/translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const [lang, setLang] = useState('es');

    const t = (key) => {
        if (!translations[key]) {
            console.warn(`Translation key missing: ${key}`);
            return key;
        }
        return translations[key][lang] || translations[key]['es'] || translations[key]['en'] || key;
    };

    const changeLanguage = (newLang) => { if (newLang) setLang(newLang); };

    return (
        <LanguageContext.Provider value={{ lang, t, changeLanguage, language: lang, setLanguage: setLang }}>
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
