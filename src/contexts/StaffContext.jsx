// src/contexts/StaffContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const StaffContext = createContext(null);

export const StaffProvider = ({ children }) => {
    const [staffMember, setStaffMember] = useState(null);
    const [currentShift, setCurrentShift] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedStaff = localStorage.getItem('fs_staff_member');
        const storedShift = localStorage.getItem('fs_current_shift');
        
        if (storedStaff) {
            try {
                setStaffMember(JSON.parse(storedStaff));
            } catch (e) {
                console.error('[StaffContext] Failed to parse stored staff:', e);
            }
        }
        
        if (storedShift) {
            try {
                setCurrentShift(JSON.parse(storedShift));
            } catch (e) {
                console.error('[StaffContext] Failed to parse stored shift:', e);
            }
        }
        
        setLoading(false);
    }, []);

    const setStaff = useCallback((staff, shift = null) => {
        setStaffMember(staff);
        setCurrentShift(shift);
        
        localStorage.setItem('fs_staff_member', JSON.stringify(staff));
        if (shift) {
            localStorage.setItem('fs_current_shift', JSON.stringify(shift));
        }
        
        if (staff?.business_id) {
            localStorage.setItem('fs_business_id', staff.business_id);
        }
        
        if (staff?.id) {
            localStorage.setItem('x-staff-id', staff.id);
        }
    }, []);

    const clearStaff = useCallback(() => {
        setStaffMember(null);
        setCurrentShift(null);
        
        localStorage.removeItem('fs_staff_member');
        localStorage.removeItem('fs_current_shift');
        localStorage.removeItem('fs_business_id');
        localStorage.removeItem('x-staff-id');
    }, []);

    const clockIn = useCallback(async (businessId, staffId, lat = null, lon = null) => {
        try {
            const { data, error } = await supabase.rpc('clock_in', {
                p_business_id: businessId,
                p_staff_id: staffId,
                p_lat: lat || 0,
                p_lon: lon || 0
            });

            if (error) throw error;
            
            const shiftData = {
                id: data,
                staff_id: staffId,
                business_id: businessId,
                status: 'active',
                clock_in_at: new Date().toISOString()
            };
            
            setCurrentShift(shiftData);
            localStorage.setItem('fs_current_shift', JSON.stringify(shiftData));
            
            return { success: true, shift_id: data };
        } catch (e) {
            console.error('[StaffContext] Clock in failed:', e);
            return { success: false, error: e.message };
        }
    }, []);

    const clockOut = useCallback(async (shiftId, lat = null, lon = null) => {
        try {
            const { error } = await supabase.rpc('clock_out', {
                p_shift_id: shiftId,
                p_lat: lat || 0,
                p_lon: lon || 0
            });

            if (error) throw error;
            
            setCurrentShift(null);
            localStorage.removeItem('fs_current_shift');
            
            return { success: true };
        } catch (e) {
            console.error('[StaffContext] Clock out failed:', e);
            return { success: false, error: e.message };
        }
    }, []);

    const isStaffLoggedIn = !!staffMember && !!currentShift;
    const staffRole = staffMember?.role || null;

    return (
        <StaffContext.Provider value={{
            staffMember,
            currentShift,
            loading,
            isStaffLoggedIn,
            staffRole,
            setStaff,
            clearStaff,
            clockIn,
            clockOut
        }}>
            {children}
        </StaffContext.Provider>
    );
};

export const useStaff = () => {
    const context = useContext(StaffContext);
    if (!context) {
        throw new Error('useStaff must be used within StaffProvider');
    }
    return context;
};