import { useTenant } from '../contexts/TenantContext';
import { formatCurrency } from '../utils/currency';

/**
 * Returns a fmt(cents) function pre-bound to the tenant's configured currency.
 * Falls back to ARS if not set.
 */
export function useCurrency() {
  const { tenantData } = useTenant();
  const currency = tenantData?.app_config?.businessCurrency || 'ARS';
  return (cents) => formatCurrency(cents ?? 0, currency);
}
