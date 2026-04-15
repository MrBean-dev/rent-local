import type { Listing } from './types'
import { seedListings } from './seed'

const STORAGE_KEY = 'rentlocal_listings'
const SEEDED_KEY = 'rentlocal_seeded'

export function getListings(): Listing[] {
  if (typeof window === 'undefined') return []
  try {
    if (!localStorage.getItem(SEEDED_KEY)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seedListings))
      localStorage.setItem(SEEDED_KEY, '1')
    }
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Listing[]) : []
  } catch {
    return seedListings
  }
}

export function saveListing(listing: Listing): void {
  if (typeof window === 'undefined') return
  try {
    const current = getListings()
    localStorage.setItem(STORAGE_KEY, JSON.stringify([listing, ...current]))
  } catch {
    // storage full or unavailable — silently skip
  }
}

export function getListing(id: string): Listing | undefined {
  return getListings().find((l) => l.id === id)
}
