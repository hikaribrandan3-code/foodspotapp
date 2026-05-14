/**
 * Envio.jsx
 * 
 * 🚚 THE ENVÍO SEAL
 * 
 * A strict wrapper around the Menu component for the /envios route.
 * Enforces data normalization via configNormalizer.js to prevent "Silo Orphan" issues.
 */

import { useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTenant } from '../../contexts/TenantContext'
import { normalizeTenantConfig } from '../../utils/configNormalizer'
import { setDeliveryMode } from '../../utils/deliveryUtils'
import Menu from './Menu.jsx'

export default function Envio({ config: configProp }) {
    const { tenantData, loading, serviceModes } = useTenant()
    const navigate = useNavigate()

    useEffect(() => {
        setDeliveryMode()
    }, [])

    // Guard: redirect if delivery is disabled for this tenant
    useEffect(() => {
        if (!loading && serviceModes?.delivery === false) {
            navigate('../menu', { replace: true })
        }
    }, [loading, serviceModes, navigate])

    const normalizedConfig = useMemo(() =>
        normalizeTenantConfig(configProp, tenantData),
        [configProp, tenantData])

    if (loading) {
        return null
    }

    // If delivery disabled, show nothing while redirect effect fires
    if (serviceModes?.delivery === false) {
        return null
    }

    return (
        <Menu
            config={normalizedConfig}
            deliveryMode={true}
        />
    )
}
