/** Shared formatting utilities across modules. */

export function getCurrencySymbol(currency?: string | null): string {
  if (currency === 'USD') return '$'
  if (currency === 'EUR') return '€'
  if (currency === 'GBP') return '£'
  if (currency === 'JPY') return '¥'
  return '₹'
}

export function formatMoney(
  amount: number | undefined | null,
  currency?: string | null,
  decimals = 2
): string {
  const symbol = getCurrencySymbol(currency)
  const value = Number(amount ?? 0)
  return `${symbol}${value.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`
}

export function formatQuantity(qty: number | undefined | null): string {
  const value = Number(qty ?? 0)
  if (value % 1 === 0) {
    return value.toLocaleString('en-IN', { maximumFractionDigits: 0 })
  }
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 4,
  })
}

export function formatShortDate(dateStr?: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
