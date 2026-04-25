export function money(value?: number | string | null) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0))
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
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
