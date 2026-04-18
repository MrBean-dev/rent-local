import { createClient } from './supabase'
import type { ServiceListing, ServiceRequest, ServiceReview } from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const table = (name: string) => (createClient().from(name) as any)

// ── Service Listings ──────────────────────────────────────

export async function fetchServiceListings(): Promise<ServiceListing[]> {
  const { data } = await table('service_listings')
    .select('*, profiles(name)')
    .order('created_at', { ascending: false })
  return (data ?? []).map(rowToService)
}

export async function fetchServiceListing(id: string): Promise<ServiceListing | null> {
  const { data } = await table('service_listings')
    .select('*, profiles(name)')
    .eq('id', id)
    .single()
  return data ? rowToService(data) : null
}

export async function fetchMyServiceListings(userId: string): Promise<ServiceListing[]> {
  const { data } = await table('service_listings')
    .select('*, profiles(name)')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })
  return (data ?? []).map(rowToService)
}

export async function insertServiceListing(userId: string, s: {
  title: string; description: string; category: string;
  rate: number; rateType: string; location: string;
  imageUrl?: string; available: boolean; insured: boolean;
  yearsExperience?: number; serviceRadius?: number; lat?: number; lng?: number
}): Promise<string | null> {
  const { data } = await table('service_listings').insert({
    owner_id: userId,
    title: s.title,
    description: s.description,
    category: s.category,
    rate: s.rate,
    rate_type: s.rateType,
    location: s.location,
    image_url: s.imageUrl ?? null,
    available: s.available,
    insured: s.insured,
    years_experience: s.yearsExperience ?? null,
    service_radius: s.serviceRadius ?? null,
    lat: s.lat ?? null,
    lng: s.lng ?? null,
  }).select('id').single()
  return data?.id ?? null
}

export async function patchServiceListing(id: string, fields: Record<string, unknown>): Promise<void> {
  await table('service_listings').update(fields).eq('id', id)
}

export async function removeServiceListing(id: string): Promise<void> {
  await table('service_listings').delete().eq('id', id)
}

// ── Service Requests ──────────────────────────────────────

export async function fetchServiceRequestsForListing(serviceId: string): Promise<ServiceRequest[]> {
  const { data } = await table('service_requests')
    .select('*, profiles(name), service_listings(title, owner_id, profiles(name))')
    .eq('service_id', serviceId)
    .order('created_at', { ascending: false })
  return (data ?? []).map(rowToServiceRequest)
}

export async function fetchMyServiceRequests(userId: string): Promise<ServiceRequest[]> {
  const { data } = await table('service_requests')
    .select('*, profiles(name), service_listings(title, owner_id, profiles(name))')
    .eq('hirer_id', userId)
    .order('created_at', { ascending: false })
  return (data ?? []).map(rowToServiceRequest)
}

export async function insertServiceRequest(userId: string, req: {
  serviceId: string; startDate: string; endDate: string; message: string
}): Promise<string | null> {
  const { data } = await table('service_requests').insert({
    service_id: req.serviceId,
    hirer_id: userId,
    start_date: req.startDate,
    end_date: req.endDate,
    message: req.message,
    status: 'pending',
  }).select('id').single()
  return data?.id ?? null
}

export async function patchServiceRequestStatus(id: string, status: 'approved' | 'declined' | 'pending'): Promise<void> {
  await table('service_requests').update({ status }).eq('id', id)
}

// ── Service Reviews ───────────────────────────────────────

export async function fetchServiceReviews(serviceId: string): Promise<ServiceReview[]> {
  const { data } = await table('service_reviews')
    .select('*, profiles(name)')
    .eq('service_id', serviceId)
    .order('created_at', { ascending: false })
  return (data ?? []).map((r: any): ServiceReview => ({
    id: r.id,
    requestId: r.request_id,
    serviceId: r.service_id,
    reviewerId: r.reviewer_id,
    reviewerName: r.profiles?.name ?? 'Anonymous',
    rating: r.rating,
    comment: r.comment ?? '',
    createdAt: r.created_at,
  }))
}

export async function fetchMyServiceReview(requestId: string, reviewerId: string): Promise<ServiceReview | null> {
  const { data } = await table('service_reviews')
    .select('*')
    .eq('request_id', requestId)
    .eq('reviewer_id', reviewerId)
    .single()
  if (!data) return null
  return {
    id: data.id,
    requestId: data.request_id,
    serviceId: data.service_id,
    reviewerId: data.reviewer_id,
    reviewerName: '',
    rating: data.rating,
    comment: data.comment ?? '',
    createdAt: data.created_at,
  }
}

export async function submitServiceReview(data: {
  requestId: string; serviceId: string; reviewerId: string; rating: number; comment: string
}): Promise<void> {
  await table('service_reviews').insert({
    request_id: data.requestId,
    service_id: data.serviceId,
    reviewer_id: data.reviewerId,
    rating: data.rating,
    comment: data.comment,
  })
}

// ── Row mappers ───────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToService(row: any): ServiceListing {
  return {
    id: row.id,
    ownerId: row.owner_id ?? '',
    title: row.title,
    description: row.description ?? '',
    category: row.category,
    rate: Number(row.rate),
    rateType: row.rate_type,
    location: row.location ?? '',
    contactName: row.profiles?.name ?? '',
    imageUrl: row.image_url ?? undefined,
    available: row.available,
    insured: row.insured ?? false,
    yearsExperience: row.years_experience ?? undefined,
    serviceRadius: row.service_radius ?? undefined,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    createdAt: row.created_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToServiceRequest(row: any): ServiceRequest {
  return {
    id: row.id,
    serviceId: row.service_id,
    serviceTitle: row.service_listings?.title ?? '',
    providerName: row.service_listings?.profiles?.name ?? '',
    hirerId: row.hirer_id ?? '',
    hirerName: row.profiles?.name ?? '',
    startDate: row.start_date,
    endDate: row.end_date,
    message: row.message ?? '',
    status: row.status,
    createdAt: row.created_at,
  }
}
