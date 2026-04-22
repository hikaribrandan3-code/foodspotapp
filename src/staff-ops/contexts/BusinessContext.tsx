import { createContext, useContext } from 'react';

interface BusinessContextValue {
  businessId: string;
  tenantSlug: string;
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
  return (
    <BusinessContext.Provider value={{ businessId, tenantSlug }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness(): BusinessContextValue {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error('useBusiness must be used within BusinessProvider');
  return ctx;
}
