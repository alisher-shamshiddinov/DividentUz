import { CURRENCIES } from '../data/translations.js'

export function getCurrencyConfig(currencyCode) {
  return CURRENCIES.find((c) => c.code === currencyCode) || CURRENCIES[0]
}

export function fromUSD(amountUSD, currencyCode) {
  const cfg = getCurrencyConfig(currencyCode)
  return amountUSD * cfg.rateFromUSD
}

export function toUSD(amountInCurrency, currencyCode) {
  const cfg = getCurrencyConfig(currencyCode)
  return amountInCurrency / cfg.rateFromUSD
}

export function formatMoney(amountUSD, currencyCode, { compact = false, showSign = false } = {}) {
  const cfg = getCurrencyConfig(currencyCode)
  const val = amountUSD * cfg.rateFromUSD
  const absVal = Math.abs(val)

  const signPrefix = showSign ? (val >= 0 ? '+' : '-') : val < 0 ? '-' : ''

  if (compact) {
    if (absVal >= 1e12) {
      const formatted = (absVal / 1e12).toFixed(2)
      return cfg.code === 'USD'
        ? `${signPrefix}$${formatted}T`
        : `${signPrefix}${formatted}T ${cfg.symbol}`
    }
    if (absVal >= 1e9) {
      const formatted = (absVal / 1e9).toFixed(2)
      return cfg.code === 'USD'
        ? `${signPrefix}$${formatted}B`
        : `${signPrefix}${formatted}B ${cfg.symbol}`
    }
    if (absVal >= 1e6) {
      const formatted = (absVal / 1e6).toFixed(2)
      return cfg.code === 'USD'
        ? `${signPrefix}$${formatted}M`
        : `${signPrefix}${formatted}M ${cfg.symbol}`
    }
  }

  let decimals = cfg.decimals
  if (cfg.code === 'USD' && absVal > 0 && absVal < 0.1) {
    decimals = 4
  } else if (cfg.code === 'USD' && absVal > 0 && absVal < 1) {
    decimals = 3
  } else if (cfg.code === 'RUB' && absVal > 0 && absVal < 10) {
    decimals = 2
  } else if (cfg.code === 'UZS' && absVal > 0 && absVal < 100) {
    decimals = 1
  }

  const formattedNumber = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
    .format(absVal)
    .replace(/,/g, ' ')

  if (cfg.code === 'USD') {
    return `${signPrefix}$${formattedNumber}`
  }
  return `${signPrefix}${formattedNumber} ${cfg.symbol}`
}

export function formatShares(shares) {
  if (!Number.isFinite(shares) || shares <= 0) return '0'
  if (shares >= 1000) {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0,
    })
      .format(shares)
      .replace(/,/g, ' ')
  }
  if (shares >= 10) {
    return shares.toFixed(2)
  }
  return shares.toFixed(3)
}

export function formatMarketCap(marketCapB, currencyCode) {
  return formatMoney(marketCapB * 1e9, currencyCode, { compact: true })
}
