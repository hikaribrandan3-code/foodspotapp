import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useTenant } from './TenantContext';
import { translations } from '../utils/translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const { tenantData, businessId, refreshTenantData } = useTenant();

    // Default to 'es' if not set, prioritize tenantData value (prevents mount flicker)
    const [lang, setLang] = useState(() => {
        const initial = tenantData?.language || 'es';
        console.log(`[LanguageContext] 🏁 Initializing with: ${initial} (from tenantData: ${!!tenantData})`);
        return initial;
    });

    useEffect(() => {
        if (tenantData?.language && tenantData.language !== lang) {
            console.log(`[LanguageContext] 🔄 System Sync: Reverting from ${lang} to ${tenantData.language}`);
            setLang(tenantData.language);
        }
    }, [tenantData?.language, lang]);

    const t = (key) => {
        if (!translations[key]) {
            console.warn(`Translation key missing: ${key}`);
            return key;
        }
        return translations[key][lang] || translations[key]['es'] || key;
    };

    const changeLanguage = async (newLang) => {
        if (!businessId) return;

        // Optimistic update
        setLang(newLang);

        try {
            // Update the tenants table as requested
            const { error } = await supabase
                .from('tenants')
                .update({ language: newLang })
                .eq('business_id', businessId);

            if (error) {
                // Try branding table if tenants fails, or if they are synced
                // Just in case, user said 'tenants'
                console.error('Error updating language in tenants table:', error);
            }

            // Refresh tenant data to sync across app
            await refreshTenantData();
        } catch (err) {
            console.error('Failed to change language:', err);
        }
    };

    return (
        <LanguageContext.Provider value={{ lang, t, changeLanguage }}>
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
