import type { UserProfile } from './types'

const KEY = 'rentlocal_profile'

export function getProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as UserProfile) : null
  } catch { return null }
}

export function saveProfile(profile: UserProfile): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(KEY, JSON.stringify(profile)) } catch {}
}

export function clearProfile(): void {
  if (typeof window === 'undefined') return
  try { localStorage.removeItem(KEY) } catch {}
}
