import { createClient } from './supabase'
import type { Listing, RentalRequest } from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const table = (name: string) => (createClient().from(name) as any)

// ── Listings ──────────────────────────────────────────────

export async function fetchListings(): Promise<Listing[]> {
  const { data } = await table('listings').select('id, owner_id, title, description, category, condition, price_per_day, location, image_url, available, created_at, profiles(name)').order('created_at', { ascending: false })
  return (data ?? []).map(rowToListing)
}

export async function fetchListing(id: string): Promise<Listing | null> {
  const { data } = await table('listings').select('*, profiles(name)').eq('id', id).single()
  return data ? rowToListing(data) : null
}

export async function fetchMyListings(userId: string): Promise<Listing[]> {
  const { data } = await table('listings').select('*, profiles(name)').eq('owner_id', userId).order('created_at', { ascending: false })
  return (data ?? []).map(rowToListing)
}

export async function hasApprovedRequest(userId: string, listingId: string): Promise<boolean> {
  const { data } = await table('rental_requests')
    .select('id')
    .eq('renter_id', userId)
    .eq('listing_id', listingId)
    .eq('status', 'approved')
    .limit(1)
  return (data ?? []).length > 0
}

export async function insertListing(userId: string, listing: {
  title: string; description: string; category: string; condition: string;
  pricePerDay: number; location: string; pickupAddress?: string; imageUrl?: string; available: boolean
}): Promise<string | null> {
  const { data } = await table('listings').insert({
    owner_id: userId,
    title: listing.title,
    description: listing.description,
    category: listing.category,
    condition: listing.condition,
    price_per_day: listing.pricePerDay,
    location: listing.location,
    pickup_address: listing.pickupAddress ?? null,
    image_url: listing.imageUrl ?? null,
    available: listing.available,
  }).select('id').single()
  return data?.id ?? null
}

export async function patchListing(id: string, fields: {
  title?: string; description?: string; category?: string; condition?: string;
  price_per_day?: number; location?: string; pickup_address?: string | null;
  image_url?: string | null; available?: boolean
}): Promise<void> {
  await table('listings').update(fields).eq('id', id)
}

export async function removeListing(id: string): Promise<void> {
  await table('listings').delete().eq('id', id)
}

export async function fetchOwnerListings(ownerName: string, excludeId: string): Promise<Listing[]> {
  const { data } = await table('listings')
    .select('*, profiles(name)')
    .neq('id', excludeId)
    .eq('available', true)
    .order('created_at', { ascending: false })
    .limit(3)
  return (data ?? []).map(rowToListing).filter((l: Listing) =>
    l.contactName.toLowerCase() === ownerName.toLowerCase()
  )
}

// ── Rental requests ───────────────────────────────────────

export async function fetchRequestsForListing(listingId: string): Promise<RentalRequest[]> {
  const { data } = await table('rental_requests')
    .select('*, profiles(name), listings(title, owner_id, profiles(name))')
    .eq('listing_id', listingId)
    .order('created_at', { ascending: false })
  return (data ?? []).map(rowToRequest)
}

export async function fetchMyRequests(userId: string): Promise<RentalRequest[]> {
  const { data } = await table('rental_requests')
    .select('*, profiles(name), listings(title, owner_id, profiles(name))')
    .eq('renter_id', userId)
    .order('created_at', { ascending: false })
  return (data ?? []).map(rowToRequest)
}

export async function insertRequest(userId: string, req: {
  listingId: string; startDate: string; endDate: string; message: string
}): Promise<void> {
  await table('rental_requests').insert({
    listing_id: req.listingId,
    renter_id: userId,
    start_date: req.startDate,
    end_date: req.endDate,
    message: req.message,
    status: 'pending',
  })
}

export async function patchRequestStatus(id: string, status: 'approved' | 'declined' | 'pending'): Promise<void> {
  await table('rental_requests').update({ status }).eq('id', id)
}

// ── Profile ───────────────────────────────────────────────

export async function fetchProfile(userId: string) {
  const { data } = await table('profiles').select('*').eq('id', userId).single()
  return data
}

export async function upsertProfile(userId: string, fields: {
  name?: string; phone?: string; location?: string; bio?: string
}): Promise<void> {
  await table('profiles').update(fields).eq('id', userId)
}

// ── Row mappers ───────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToListing(row: any): Listing {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    condition: row.condition,
    pricePerDay: Number(row.price_per_day),
    location: row.location,
    imageUrl: row.image_url ?? undefined,
    available: row.available,
    createdAt: row.created_at,
    pickupAddress: row.pickup_address ?? undefined,
    contactName: row.profiles?.name ?? '',
    contactPhone: '',
    contactEmail: '',
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToRequest(row: any): RentalRequest {
  return {
    id: row.id,
    listingId: row.listing_id,
    listingTitle: row.listings?.title ?? '',
    ownerName: row.listings?.profiles?.name ?? '',
    ownerPhone: '',
    ownerEmail: '',
    renterName: row.profiles?.name ?? '',
    renterPhone: '',
    renterEmail: '',
    startDate: row.start_date,
    endDate: row.end_date,
    message: row.message ?? '',
    status: row.status,
    createdAt: row.created_at,
  }
}
