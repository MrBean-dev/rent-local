import type { RentalInspection } from './types'

const STORAGE_KEY = 'rentlocal_inspections'

export function getInspections(): RentalInspection[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as RentalInspection[]) : []
  } catch {
    return []
  }
}

export function getInspectionsForListing(listingId: string): RentalInspection[] {
  return getInspections().filter((i) => i.listingId === listingId)
}

export function saveInspection(inspection: RentalInspection): void {
  if (typeof window === 'undefined') return
  try {
    const current = getInspections()
    const existing = current.findIndex((i) => i.id === inspection.id)
    if (existing >= 0) {
      current[existing] = inspection
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([inspection, ...current]))
    }
  } catch {
    // storage full
  }
}

export function deleteInspection(id: string): void {
  if (typeof window === 'undefined') return
  try {
    const current = getInspections().filter((i) => i.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
  } catch {
    // ignore
  }
}
