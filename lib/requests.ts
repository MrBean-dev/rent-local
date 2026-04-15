import type { RentalRequest } from './types'

const KEY = 'rentlocal_requests'

export function getRequests(): RentalRequest[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as RentalRequest[]) : []
  } catch { return [] }
}

export function getRequestsForListing(listingId: string): RentalRequest[] {
  return getRequests().filter((r) => r.listingId === listingId)
}

export function saveRequest(req: RentalRequest): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(KEY, JSON.stringify([req, ...getRequests()]))
  } catch {}
}

export function updateRequestStatus(id: string, status: RentalRequest['status']): void {
  if (typeof window === 'undefined') return
  try {
    const all = getRequests().map((r) => r.id === id ? { ...r, status } : r)
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {}
}
