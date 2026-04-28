import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useTenant } from './TenantContext';
import { translations } from '../utils/translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const { tenantData, businessId, refreshTenantData } = useTenant();
    const isLocked = useRef(false);
    const lockTimer = useRef(null);

    // Tenant language is always the source of truth — owner backend controls all UI language
    const [lang, setLang] = useState(() => {
        const initial = tenantData?.language || 'en';
        console.log(`[LanguageContext] 🏁 Initializing with: ${initial} (tenantData: ${tenantData?.language})`);
        return initial;
    });

    // 🔄 REACTIVE SYNC: Always adopt tenantData.language unless we're mid-toggle
    // The isLocked ref protects against reverts during manual owner toggles.
    // No hasInitialized guard — this must fire every time tenantData.language changes
    // so that ALL tabs re-render with the new language immediately.
    useEffect(() => {
        console.log(`[LanguageContext] 🔍 Sync Check: Current=${lang} | DB=${tenantData?.language || 'null'} | Locked=${isLocked.current}`);

        if (!tenantData?.language) return;

        if (tenantData.language !== lang) {
            if (isLocked.current) {
                console.log(`[LanguageContext] 🛡️ Revert Prevented: Context is LOCKED during manual toggle.`);
                return;
            }
            console.log(`[LanguageContext] 🔄 Syncing to DB language: ${tenantData.language}`);
            setLang(tenantData.language);
        }
    }, [tenantData?.language, lang]);

    // 🧹 Cleanup lock timer on unmount
    useEffect(() => {
        return () => {
            if (lockTimer.current) clearTimeout(lockTimer.current);
        };
    }, []);

    const t = (key) => {
        if (!translations[key]) {
            console.warn(`Translation key missing: ${key}`);
            return key;
        }
        return translations[key][lang] || translations[key]['en'] || key;
    };

    const changeLanguage = async (newLang) => {
        if (!businessId) return;

        console.log(`[LanguageContext] ⚡ MANUAL TOGGLE: Setting to ${newLang}. Locking context...`);

        // Optimistic update + LOCK
        isLocked.current = true;
        setLang(newLang);

        // Clear existing timer if any
        if (lockTimer.current) clearTimeout(lockTimer.current);

        try {
            // 🛡️ SCHEMA GUARD: Use the real tenant PK (id) from tenantData
            if (!tenantData?.id) {
                console.warn("[LanguageContext] ⚠️ Cannot update: tenantData.id missing.");
                isLocked.current = false;
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

            // Refresh tenant data immediately (DB write is already complete).
            // Keep lock for 1500ms to prevent the refresh result from reverting
            // the optimistic update before it settles.
            refreshTenantData();

            lockTimer.current = setTimeout(() => {
                isLocked.current = false;
                console.log(`[LanguageContext] 🔓 Context UNLOCKED after toggle settle.`);
            }, 1500);

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
