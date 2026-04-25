/**
 * Envio.jsx
 * 
 * 🚚 THE ENVÍO SEAL
 * 
 * A strict wrapper around the Menu component for the /envios route.
 * Enforces data normalization via configNormalizer.js to prevent "Silo Orphan" issues.
 */

import { useMemo, useEffect } from 'react'
import { useTenant } from '../../contexts/TenantContext'
import { normalizeTenantConfig } from '../../utils/configNormalizer'
import { setDeliveryMode } from '../../utils/deliveryUtils'
import Menu from './Menu.jsx'

export default function Envio({ config: configProp }) {
    const { tenantData, loading } = useTenant()

    useEffect(() => {
        setDeliveryMode()
    }, [])

    const normalizedConfig = useMemo(() =>
        normalizeTenantConfig(configProp, tenantData),
        [configProp, tenantData])

    if (loading) {
        return null
    }

    return (
        <Menu
            config={normalizedConfig}
            deliveryMode={true}
        />
    )
}
