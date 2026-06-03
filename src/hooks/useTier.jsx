// ============================================================
// useTier — FoodSpot Mobile Lite Feature Gating
// ============================================================
// Returns the current tenant's subscription tier + MP limits.
// Use this to gate Pro-only features in any component.
//
// Usage:
//   const { isPro, mpRemaining, isLoading } = useTier();
//   if (!isPro) return <UpgradeBanner />;
// ============================================================

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useTenant } from '../contexts/TenantContext';

const DEFAULT_STATE = {
  isPro: false,
  tier: 'free',
  mpLimit: 30,
  mpUsed: 0,
  mpRemaining: 30,
  canPay: true,
  isLoading: true,
  error: null,
};

export function useTier() {
  const { businessId } = useTenant();
  const [tierState, setTierState] = useState(DEFAULT_STATE);

  useEffect(() => {
    if (!businessId) return;

    let cancelled = false;

    supabase
      .rpc('check_tier_limits', { p_business_id: businessId })
      .then(({ data, error }) => {
        if (cancelled) return;

        if (error || !data) {
          console.error('[useTier] RPC error:', error);
          setTierState(prev => ({
            ...prev,
            isLoading: false,
            error: error?.message || 'Failed to load tier',
          }));
          return;
        }

        setTierState({
          isPro: data.is_pro ?? false,
          tier: data.tier ?? 'free',
          mpLimit: data.mp_limit ?? 30,
          mpUsed: data.mp_used ?? 0,
          mpRemaining: data.mp_remaining ?? 0,
          canPay: data.can_pay ?? false,
          isLoading: false,
          error: null,
        });
      });

    return () => { cancelled = true; };
  }, [businessId]);

  return tierState;
}
