/**
 * Envio.jsx
 * 
 * 🚚 THE ENVÍO SEAL
 * 
 * A strict wrapper around the Menu component for the /envios route.
 * Enforces data normalization via configNormalizer.js to prevent "Silo Orphan" issues.
 */

import { useMemo } from 'react'
import { useTenant } from '../../contexts/TenantContext'
import { normalizeTenantConfig } from '../../utils/configNormalizer'
import Menu from './Menu.jsx'

export default function Envio({ config: configProp }) {
    const { tenantData, loading } = useTenant()

    // 🛡️ THE ENVÍO SEAL: Strict normalization
    // Unlike the generic Menu, this wrapper guarantees the config is pre-scrubbed
    // before it even touches the Menu component props.
    const normalizedConfig = useMemo(() =>
        normalizeTenantConfig(configProp, tenantData),
        [configProp, tenantData])

    // Wait for tenant data to prevent flash of unstyled content
    if (loading) {
        return null // framework or parent skeleton will handle loading
    }

    return (
        <Menu
            config={normalizedConfig}
            deliveryMode={true}
        />
    )
}
