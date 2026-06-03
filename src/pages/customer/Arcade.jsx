import React, { useState, useCallback } from 'react'
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
