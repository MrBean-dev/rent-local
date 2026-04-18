export function formatPrice(cents: number): string {
  return `$${cents.toLocaleString()}/day`
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function generateId(): string {
  return crypto.randomUUID()
}

export function categoryLabel(cat: string): string {
  const map: Record<string, string> = {
    trailer:   'Trailer',
    backhoe:   'Backhoe / Excavator',
    tool:      'Tool',
    box_truck: 'Box Truck',
  }
  return map[cat] ?? cat
}

export function formatRate(rate: number, rateType: string): string {
  return `$${rate.toLocaleString()}/${rateType === 'per_job' ? 'job' : 'hr'}`
}

export function conditionLabel(cond: string): string {
  const map: Record<string, string> = {
    excellent: 'Excellent',
    good: 'Good',
    fair: 'Fair',
  }
  return map[cond] ?? cond
}
