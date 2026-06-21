import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTenant } from '../../contexts/TenantContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { useTier } from '../../hooks/useTier'
import { supabase } from '../../lib/supabaseClient.js'
import { getScopedGuestToken } from '../../utils/storage.js'
import { ORDER_STATUS } from '../../constants/database.js'
import { HikariBoy } from '../../components/HikariBoy/HikariBoy'

console.log('[Arcade] MODULE LOADED v3')

const Arcade = () => {
    const navigate = useNavigate()
    const { slug: tenantSlug, tenantData, businessId } = useTenant()
    const { t } = useLanguage()
    const { isPro } = useTier()

    const [foodReady, setFoodReady] = useState(false)
    const [readyOrderId, setReadyOrderId] = useState(null)
    const channelRef = useRef(null)

    // Load arcade-only fonts on demand
    useEffect(() => {
        const ARCADE_FONT_ID = 'arcade-fonts'
        if (document.getElementById(ARCADE_FONT_ID)) return
        const link = document.createElement('link')
        link.id = ARCADE_FONT_ID
        link.rel = 'stylesheet'
        link.href = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap'
        document.head.appendChild(link)
    }, [])

    // Realtime: watch for THIS customer's pickup order hitting 'ready'
    useEffect(() => {
        console.log('[Arcade] useEffect fired, businessId:', businessId)
        if (!businessId) return

        const guestToken = getScopedGuestToken()
        console.log('[Arcade] guestToken:', guestToken)

        const findAndWatchPickupOrder = async () => {
            console.log('[Arcade] Querying for active pickup orders...')
            const { data, error } = await supabase
                .from('orders')
                .select('id, status, order_type')
                .eq('business_id', businessId)
                .eq('order_type', 'pickup')
                .eq('guest_token', guestToken)
                .neq('status', ORDER_STATUS.DELIVERED)
                .neq('status', ORDER_STATUS.CANCELLED)
                .order('created_at', { ascending: false })
                .limit(1)

            if (error) {
                console.error('[Arcade] Order lookup error:', error)
                return
            }
            const order = data?.[0]
            if (!order) {
                console.log('[Arcade] No active pickup order found for this guest')
                return
            }
            console.log('[Arcade] Found pickup order:', order.id, 'status:', order.status)

            if (order.status === ORDER_STATUS.READY) {
                console.log('[Arcade] Order already READY on arcade load')
                setReadyOrderId(order.id)
                setFoodReady(true)
                return
            }

            console.log('[Arcade] Setting up realtime subscription for order:', order.id)
            channelRef.current = supabase
                .channel(`arcade-pickup-${order.id}`)
                .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'orders',
                    filter: `id=eq.${order.id}`
                }, (payload) => {
                    console.log('[Arcade] Order update received:', payload.new.status, 'type:', payload.new.order_type)
                    if (payload.new.status === ORDER_STATUS.READY &&
                        payload.new.order_type === 'pickup') {
                        console.log('[Arcade] FIRING FOOD READY!')
                        setReadyOrderId(order.id)
                        setFoodReady(true)
                    }
                })
                .subscribe((status) => {
                    console.log('[Arcade] Subscription status:', status)
                })
        }

        findAndWatchPickupOrder()

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current)
            }
        }
    }, [businessId])

    const handleClose = useCallback(() => {
        const homePath = tenantSlug ? `/${tenantSlug}/home` : '/home'
        navigate(homePath)
    }, [navigate, tenantSlug])

    const handleUpgrade = useCallback(() => {
        alert('Upgrade to FoodSpot Pro to unlock all games! 🎮')
    }, [])

    const handleViewReceipt = useCallback((orderId) => {
        const path = orderId
            ? `/${tenantSlug}/status?orderId=${orderId}`
            : `/${tenantSlug}/status`
        navigate(path)
    }, [navigate, tenantSlug])

    const handleDismissFoodReady = useCallback(() => {
        setFoodReady(false)
    }, [])

    // Translations for the notification card
    const foodReadyTexts = {
        title:   t('food_ready_title'),
        sub:     t('food_ready_sub'),
        view:    t('food_ready_view'),
        keep:    t('food_ready_keep'),
        resume:  t('food_ready_resume'),
    }

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
                munchboyShellColor={tenantData?.app_config?.munchboy?.shell_color || tenantData?.munchboy_shell_color}
                munchboyAColor={tenantData?.app_config?.munchboy?.a_color || tenantData?.munchboy_a_color}
                munchboyBColor={tenantData?.app_config?.munchboy?.b_color || tenantData?.munchboy_b_color}
                foodReady={foodReady}
                readyOrderId={readyOrderId}
                foodReadyTexts={foodReadyTexts}
                onViewReceipt={handleViewReceipt}
                onDismissFoodReady={handleDismissFoodReady}
            />
        </div>
    )
}

export default Arcade
