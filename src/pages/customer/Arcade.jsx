import React, { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTenant } from '../../contexts/TenantContext'
import { HikariBoy } from '../../components/HikariBoy/HikariBoy'

/**
 * Arcade - Entry point for the HikariBoy Emulator Shell
 */
const Arcade = () => {
    const navigate = useNavigate()
    const { slug: tenantSlug } = useTenant()

    const handleClose = useCallback(() => {
        const homePath = tenantSlug ? `/${tenantSlug}/home` : '/home'
        navigate(homePath)
    }, [navigate, tenantSlug])

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
                controllerColor="#8B5CF6"
            />
        </div>
    )
}

export default Arcade
