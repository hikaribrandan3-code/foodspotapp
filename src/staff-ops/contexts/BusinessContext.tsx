import { createContext, useContext, useEffect, useState } from 'react';
// @ts-ignore
import { supabase } from '../../lib/supabaseClient.js';

interface BusinessContextValue {
  businessId: string;
  tenantSlug: string;
  businessLat?: number;
  businessLng?: number;
  mpAlias: string;
}

const BusinessContext = createContext<BusinessContextValue | null>(null);

export function BusinessProvider({
  businessId,
  tenantSlug,
  children,
}: {
  businessId: string;
  tenantSlug: string;
  children: React.ReactNode;
}) {
  const [coords, setCoords] = useState<{ lat?: number; lng?: number }>({});
  const [mpAlias, setMpAlias] = useState<string>('');

  // Fetch business location + MP alias on mount
  useEffect(() => {
    if (!businessId) return;
    supabase
      .from('businesses')
      .select('latitude, longitude, app_config')
      .eq('id', businessId)
      .single()
      .then(({ data }: { data: any }) => {
        if (data?.latitude && data?.longitude) {
          setCoords({ lat: data.latitude, lng: data.longitude });
        }
        const alias = data?.app_config?.payments?.mercadoPagoAlias;
        if (alias) setMpAlias(alias);
      })
      .catch(() => {}); // silent fail
  }, [businessId]);

  // Realtime subscription: owner updates app_config → staff sees new alias instantly
  useEffect(() => {
    if (!businessId) return;
    const channel = supabase
      .channel(`business-config-${businessId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'businesses',
          filter: `id=eq.${businessId}`,
        },
        (payload: any) => {
          const newAlias = payload.new?.app_config?.payments?.mercadoPagoAlias;
          if (typeof newAlias === 'string') {
            setMpAlias(newAlias);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel).catch(() => {});
    };
  }, [businessId]);

  return (
    <BusinessContext.Provider
      value={{
        businessId,
        tenantSlug,
        businessLat: coords.lat,
        businessLng: coords.lng,
        mpAlias,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness(): BusinessContextValue {
  const ctx = useContext(BusinessContext);
  if (!ctx) return { businessId: '', tenantSlug: '', mpAlias: '' };
  return ctx;
}
