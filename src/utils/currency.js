/**
 * Currency utilities — single source of truth for all FoodSpot apps
 *
 * Supported currencies match the OwnerSummary dropdown exactly.
 * ALL prices are stored as integer cents (minor units) — never floats.
 * Never use parseFloat or toFixed on currency values.
 */

export const CURRENCY_CONFIG = {
  ARS: { locale: 'es-AR', symbol: '$',  name: 'Argentine Peso'  },
  USD: { locale: 'en-US', symbol: '$',  name: 'US Dollar'       },
  BRL: { locale: 'pt-BR', symbol: 'R$', name: 'Brazilian Real'  },
  CLP: { locale: 'es-CL', symbol: '$',  name: 'Chilean Peso'    },
  COP: { locale: 'es-CO', symbol: '$',  name: 'Colombian Peso'  },
  MXN: { locale: 'es-MX', symbol: '$',  name: 'Mexican Peso'    },
  PEN: { locale: 'es-PE', symbol: 'S/', name: 'Peruvian Sol'    },
  UYU: { locale: 'es-UY', symbol: '$',  name: 'Uruguayan Peso'  },
};

/**
 * Format integer cents as a currency string.
 *
 * @param {number} cents  - integer minor units (e.g. 150000 = $1,500)
 * @param {string} currency - ISO 4217 code (default: 'ARS')
 * @returns {string} e.g. "$1.500" (ARS) | "$15" (USD) | "R$15" (BRL)
 */
export function formatCurrency(cents, currency = 'ARS') {
  const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.ARS;
  const amount = Math.round(cents) / 100;
  return `${config.symbol}${amount.toLocaleString(config.locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

/**
 * Return the BCP 47 locale string for a currency code.
 * Useful for date/number formatting that should match the currency's region.
 */
export function getCurrencyLocale(currency = 'ARS') {
  return (CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.ARS).locale;
}

/**
 * Return the symbol for a currency code.
 */
export function getCurrencySymbol(currency = 'ARS') {
  return (CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.ARS).symbol;
}
