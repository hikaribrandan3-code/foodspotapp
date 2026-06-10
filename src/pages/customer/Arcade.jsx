import React, { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTenant } from '../../contexts/TenantContext'
import { useTier } from '../../hooks/useTier'
import { HikariBoy } from '../../components/HikariBoy/HikariBoy'

/**
 * Arcade - Entry point for the HikariBoy Emulator Shell
 */
const Arcade = () => {
    const navigate = useNavigate()
    const { slug: tenantSlug, tenantData } = useTenant()
    const { isPro, isLoading: tierLoading } = useTier()

    // Load arcade-only fonts on demand — not in the global critical-path stylesheet
    useEffect(() => {
        const ARCADE_FONT_ID = 'arcade-fonts';
        if (document.getElementById(ARCADE_FONT_ID)) return;
        const link = document.createElement('link');
        link.id = ARCADE_FONT_ID;
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap';
        document.head.appendChild(link);
    }, [])

    const handleClose = useCallback(() => {
        const homePath = tenantSlug ? `/${tenantSlug}/home` : '/home'
        navigate(homePath)
    }, [navigate, tenantSlug])

    const handleUpgrade = useCallback(() => {
        // TODO: wire to upgrade/pricing page when built
        alert('Upgrade to FoodSpot Pro to unlock all games! 🎮')
    }, [])

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: '#000',
            zIndex: 9999,
            overflow: 'hidden'
        }}>
            <HikariBoy
                onClose={handleClose}
                onUpgradeClick={handleUpgrade}
                isPro={isPro}
                controllerColor={tenantData?.confirmation_color || '#8B5CF6'}
                munchboyShellColor={tenantData?.app_config?.munchboy?.shell_color || tenantData?.munchboy_shell_color}
                munchboyAColor={tenantData?.app_config?.munchboy?.a_color || tenantData?.munchboy_a_color}
                munchboyBColor={tenantData?.app_config?.munchboy?.b_color || tenantData?.munchboy_b_color}
            />
        </div>
    )
}

export default Arcade
