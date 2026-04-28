import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useTenant } from './TenantContext';
import { translations } from '../utils/translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const { tenantData, businessId, refreshTenantData } = useTenant();
    const isLocked = useRef(false);
    const lockTimer = useRef(null);

    // 🛡️ PERSONAL TRACK: Load staff preference from local storage if it exists
    const [lang, setLang] = useState(() => {
        const staffPref = localStorage.getItem('fs_staff_lang');
        if (staffPref) return staffPref;

        const initial = tenantData?.language || 'en';
        console.log(`[LanguageContext] 🏁 Initializing with: ${initial} (tenantData: ${tenantData?.language})`);
        return initial;
    });

    // 🔄 GLOBAL TRACK SYNC: Only sync from DB if there is NO staff preference locked in
    useEffect(() => {
        const staffPref = localStorage.getItem('fs_staff_lang');
        if (staffPref) {
            if (lang !== staffPref) setLang(staffPref);
            return; // Staff preference overrides Global Sync
        }

        if (!tenantData?.language) return;

        if (tenantData.language !== lang) {
            if (isLocked.current) return;
            console.log(`[LanguageContext] 🔄 Global Syncing to DB language: ${tenantData.language}`);
            setLang(tenantData.language);
        }
    }, [tenantData?.language, lang]);

    const t = (key) => {
        if (!translations[key]) {
            console.warn(`Translation key missing: ${key}`);
            return key;
        }
        return translations[key][lang] || translations[key]['en'] || key;
    };

    const changeLanguage = async (newLang) => {
        if (!businessId) return;

        // 1. Check if user is Staff or Owner
        const { data: { session } } = await supabase.auth.getSession();
        const role = session?.user?.user_metadata?.role;
        const isOwner = role === 'owner' || role === 'superadmin';

        if (isOwner) {
            // 🌎 GLOBAL CHANGE: Updates DB for all Customers
            console.log(`[LanguageContext] 🌎 OWNER CHANGE: Setting Global to ${newLang}`);
            isLocked.current = true;
            setLang(newLang);
            localStorage.removeItem('fs_staff_lang'); // Owners shouldn't have sticky personal prefs

            if (lockTimer.current) clearTimeout(lockTimer.current);

            try {
                if (!tenantData?.id) return;
                const { error } = await supabase
                    .from('tenants')
                    .update({ language: newLang })
                    .eq('id', tenantData.id);

                refreshTenantData();
                lockTimer.current = setTimeout(() => {
                    isLocked.current = false;
                }, 1500);
            } catch (err) {
                console.error('Owner language update failed:', err);
                isLocked.current = false;
            }
        } else {
            // 👤 PERSONAL CHANGE: Local Staff Preference Only
            console.log(`[LanguageContext] 👤 STAFF CHANGE: Setting Personal Preference to ${newLang}`);
            setLang(newLang);
            localStorage.setItem('fs_staff_lang', newLang);
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
