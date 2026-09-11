export function formatNumber(value, locale = 'ms-MY') {
  return new Intl.NumberFormat(locale).format(value)
}

export function formatCurrency(value, currency = 'MYR', locale = 'ms-MY') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value)
}
