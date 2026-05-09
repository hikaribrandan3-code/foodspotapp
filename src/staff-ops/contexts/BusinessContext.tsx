import { createContext, useContext, useEffect, useState } from 'react';
// @ts-ignore
import { supabase } from '../../lib/supabaseClient.js';

interface BusinessContextValue {
  businessId: string;
  tenantSlug: string;
  businessLat?: number;
  businessLng?: number;
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

  // Fetch business location on mount
  useEffect(() => {
    if (!businessId) return;
    supabase
      .from('businesses')
      .select('latitude, longitude')
      .eq('id', businessId)
      .single()
      .then(({ data }: { data: any }) => {
        if (data?.latitude && data?.longitude) {
          setCoords({ lat: data.latitude, lng: data.longitude });
        }
      })
      .catch(() => {}); // silent fail, ETA just won't show
  }, [businessId]);

  return (
    <BusinessContext.Provider
      value={{
        businessId,
        tenantSlug,
        businessLat: coords.lat,
        businessLng: coords.lng,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness(): BusinessContextValue {
  const ctx = useContext(BusinessContext);
  if (!ctx) return { businessId: '', tenantSlug: '' };
  return ctx;
}
