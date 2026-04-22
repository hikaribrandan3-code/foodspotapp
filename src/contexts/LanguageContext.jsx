import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useTenant } from './TenantContext';
import { translations } from '../utils/translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const { tenantData, businessId, refreshTenantData } = useTenant();
    const isLocked = useRef(false);
    const lockTimer = useRef(null);

    // Default to 'es' if not set, prioritize tenantData value (prevents mount flicker)
    // Also check staff-ops language preference for consistency
    const [lang, setLang] = useState(() => {
        const staffPref = localStorage.getItem('fs_staff_language');
        const initial = tenantData?.language || staffPref || 'es';
        console.log(`[LanguageContext] 🏁 Initializing with: ${initial} (tenantData: ${tenantData?.language}, staff: ${staffPref})`);
        return initial;
    });

    useEffect(() => {
        // Trace logging as requested
        console.log(`[LanguageContext] 🔍 State Fight: Current Lang: ${lang} | DB Lang: ${tenantData?.language || 'es'}`);

        if (tenantData?.language && tenantData.language !== lang) {
            if (isLocked.current) {
                console.log(`[LanguageContext] 🛡️ Revert Prevented: Context is LOCKED during manual toggle.`);
                return;
            }
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

        console.log(`[LanguageContext] ⚡ MANUAL TOGGLE: Setting to ${newLang}. Locking context...`);

        // Optimistic update + LOCK
        isLocked.current = true;
        setLang(newLang);
        // Also save to localStorage for staff-ops sync
        localStorage.setItem('fs_staff_language', newLang);

        // Clear existing timer if any
        if (lockTimer.current) clearTimeout(lockTimer.current);

        try {
            // Update the tenants table as requested
            // 🛡️ SCHEMA GUARD: Use the real tenant PK (id) from tenantData
            if (!tenantData?.id) {
                console.warn("[LanguageContext] ⚠️ Cannot update: tenantData.id missing.");
                return;
            }

            const { error } = await supabase
                .from('tenants')
                .update({ language: newLang })
                .eq('id', tenantData.id);

            if (error) {
                console.error("SUPABASE ERROR (Language Update):", error.message, error.details);
                console.error('Full Update Context:', { id: businessId, newLang });
            }

            // Refresh tenant data to sync across app
            await refreshTenantData();

            // Unlock after a short delay to allow background sync to settle
            lockTimer.current = setTimeout(() => {
                isLocked.current = false;
                console.log(`[LanguageContext] 🔓 Context UNLOCKED.`);
            }, 2500);

        } catch (err) {
            console.error('Failed to change language:', err);
            isLocked.current = false;
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
