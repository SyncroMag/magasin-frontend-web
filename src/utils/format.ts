export function money(value?: number | string | null) {
  const amount = Number(value ?? 0)

  return `${new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0)} Ar`
}

export function formatNumberInput(value?: number | string | null) {
  const numericValue = Number(value ?? 0)
  if (!Number.isFinite(numericValue)) return ''

  const [integerPart, decimalPart] = String(numericValue).split('.')
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return decimalPart ? `${formattedInteger}.${decimalPart}` : formattedInteger
}

export function parseNumberInput(value: string) {
  const normalized = value.replace(/\s+/g, '').replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

export function numberValue(value?: number | string | null) {
  return Number(value ?? 0)
}

export function dateLabel(value?: string | null) {
  if (!value) {
    return 'Non renseigne'
  }

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}
