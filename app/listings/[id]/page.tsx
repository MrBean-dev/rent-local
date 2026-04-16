'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { fetchListing, fetchListings, removeListing, fetchRequestsForListing, hasApprovedRequest } from '@/lib/db'
import { useAuth } from '@/components/AuthProvider'
import type { Listing, RentalRequest } from '@/lib/types'
import { formatPrice, formatDate, categoryLabel, conditionLabel } from '@/lib/utils'
import AvailabilityCalendar from '@/components/AvailabilityCalendar'
import ListingCard from '@/components/ListingCard'

const categoryBadge: Record<string, string> = {
  trailer: 'bg-blue-100 text-blue-700',
  backhoe: 'bg-orange-100 text-orange-700',
  tool:    'bg-green-100 text-green-700',
}
const conditionDot: Record<string, string> = {
  excellent: 'bg-green-500', good: 'bg-yellow-400', fair: 'bg-orange-400',
}
const conditionText: Record<string, string> = {
  excellent: 'text-green-600', good: 'text-yellow-600', fair: 'text-orange-500',
}

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()

  const [listing, setListing]             = useState<Listing | null | undefined>(undefined)
  const [requests, setRequests]           = useState<RentalRequest[]>([])
  const [otherListings, setOtherListings] = useState<Listing[]>([])
  const [pendingCount, setPendingCount]   = useState(0)
  const [isOwner, setIsOwner]             = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [copied, setCopied]               = useState(false)
  const [pickupUnlocked, setPickupUnlocked] = useState(false)

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [])

  useEffect(() => {
    fetchListing(id).then((found) => {
      setListing(found ?? null)
      if (!found) return
      fetchRequestsForListing(id).then((reqs) => {
        setRequests(reqs)
        setPendingCount(reqs.filter((r) => r.status === 'pending').length)
      })
      fetchListings().then((all) => {
        const others = all.filter(
          (l) => l.id !== id &&
                 l.contactName.toLowerCase() === found.contactName.toLowerCase() &&
                 l.available
        )
        setOtherListings(others.slice(0, 3))
      })
    })
  }, [id])

  useEffect(() => {
    if (!user || !listing) return
    import('@/lib/supabase').then(({ createClient }) => {
      createClient()
        .from('listings' as any)
        .select('owner_id')
        .eq('id', id)
        .single()
        .then(({ data }: any) => {
          const owner = data?.owner_id === user.id
          setIsOwner(owner)
          // Owners always see pickup address; renters see it only if approved
          if (owner) {
            setPickupUnlocked(true)
          } else {
            hasApprovedRequest(user.id, id).then(setPickupUnlocked)
          }
        })
    })
  }, [user, listing, id])

  async function handleDelete() {
    await removeListing(id)
    router.push('/profile/listings')
  }

  if (listing === undefined) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Loading…</div>
  )
  if (listing === null) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3">
      <p className="text-4xl">🤔</p>
      <p className="font-semibold text-gray-700">Listing not found</p>
      <Link href="/listings" className="text-sm text-brand-600 hover:underline">← Back to listings</Link>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-brand-600 to-orange-600 text-white px-4 pt-6 pb-10">
        <div className="max-w-3xl mx-auto">
          <Link href="/listings" className="inline-flex items-center gap-1 text-sm text-orange-200 hover:text-white mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Browse
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${categoryBadge[listing.category]}`}>
                {listing.category === 'trailer' ? '🚛' : listing.category === 'backhoe' ? '🚜' : '🔧'} {categoryLabel(listing.category)}
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold mt-2">{listing.title}</h1>
              <div className="flex flex-wrap gap-3 mt-2 text-sm text-orange-100">
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {listing.location}
                </span>
                <span>Listed {formatDate(listing.createdAt)}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-3xl font-bold">{formatPrice(listing.pricePerDay)}</p>
              <div className="flex items-center justify-end gap-1.5 mt-1 text-sm text-orange-100">
                <span className={`w-2 h-2 rounded-full ${conditionDot[listing.condition]}`} />
                <span className="capitalize">{conditionLabel(listing.condition)}</span>
              </div>
              <button onClick={handleCopyLink} className="mt-2 flex items-center gap-1.5 text-xs text-orange-200 hover:text-white transition-colors ml-auto">
                {copied ? (
                  <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>Copied!</>
                ) : (
                  <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copy link</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-4 pb-10 space-y-4">

        {/* Photo */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="relative h-64 sm:h-80 bg-gray-100">
            {listing.imageUrl ? (
              <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-7xl text-gray-200">
                {listing.category === 'trailer' ? '🚛' : listing.category === 'backhoe' ? '🚜' : '🔧'}
              </div>
            )}
            {!listing.available && (
              <div className="absolute inset-0 bg-gray-900/55 flex items-center justify-center">
                <span className="bg-white text-gray-800 font-bold px-5 py-2 rounded-full">Currently Unavailable</span>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50/60">
            <span className="font-semibold text-gray-900">📋 Description</span>
          </div>
          <div className="px-5 py-5">
            <p className="text-gray-600 leading-relaxed whitespace-pre-line">{listing.description}</p>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="bg-gray-50 rounded-xl py-3">
                <p className="text-xs text-gray-400 mb-0.5">Category</p>
                <p className="text-sm font-semibold text-gray-800">{categoryLabel(listing.category)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl py-3">
                <p className="text-xs text-gray-400 mb-0.5">Condition</p>
                <p className={`text-sm font-semibold ${conditionText[listing.condition]}`}>{conditionLabel(listing.condition)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl py-3">
                <p className="text-xs text-gray-400 mb-0.5">Per Day</p>
                <p className="text-sm font-semibold text-brand-600">{formatPrice(listing.pricePerDay)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pickup / drop-off address */}
        {(listing.pickupAddress || isOwner) && (
          <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${pickupUnlocked ? 'border-green-100' : 'border-gray-100'}`}>
            <div className={`flex items-center gap-3 px-5 py-4 border-b ${pickupUnlocked ? 'border-green-100 bg-green-50/60' : 'border-gray-100 bg-gray-50/60'}`}>
              <span className="font-semibold text-gray-900">📍 Pickup / Drop-off</span>
              {pickupUnlocked && (
                <span className="ml-auto text-xs font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Unlocked</span>
              )}
            </div>
            <div className="px-5 py-4">
              {pickupUnlocked && listing.pickupAddress ? (
                <p className="text-gray-700 text-sm leading-relaxed">{listing.pickupAddress}</p>
              ) : pickupUnlocked && !listing.pickupAddress ? (
                <p className="text-gray-400 text-sm italic">The owner hasn't added pickup instructions yet. Message them to arrange.</p>
              ) : (
                <div className="flex items-center gap-3 text-gray-400">
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Address revealed after approval</p>
                    <p className="text-xs mt-0.5">Send a rental request to unlock the pickup location.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Availability calendar */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50/60">
            <span className="font-semibold text-gray-900">📅 Availability</span>
          </div>
          <div className="px-5 py-5">
            <AvailabilityCalendar requests={requests} />
          </div>
        </div>

        {/* Pre-rental inspection callout */}
        <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-amber-100 bg-amber-50/60">
            <span className="font-semibold text-amber-900">📷 Renting this equipment?</span>
          </div>
          <div className="px-5 py-4 flex items-center justify-between gap-4">
            <p className="text-sm text-amber-700">Document its condition before you take it — protects you if damage is disputed later.</p>
            <Link href={`/listings/${listing.id}/inspect`} className="shrink-0 px-4 py-2.5 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700 transition-colors">Inspect</Link>
          </div>
        </div>

        {/* Owner actions */}
        {isOwner && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide mr-auto">Your listing</span>
            <Link href={`/listings/${listing.id}/edit`} className="px-4 py-2 text-sm font-semibold text-brand-600 border border-brand-200 rounded-xl hover:bg-brand-50 transition-colors">Edit</Link>
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} className="px-4 py-2 text-sm font-semibold text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition-colors">Delete</button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Sure?</span>
                <button onClick={handleDelete} className="px-3 py-1.5 text-xs font-semibold bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">Yes, delete</button>
                <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 text-xs font-semibold text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
              </div>
            )}
          </div>
        )}

        {/* CTA card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50/60">
            <span className="font-semibold text-gray-900">👤 {listing.contactName}</span>
            {isOwner && (
              <Link href={`/listings/${listing.id}/requests`} className="ml-auto text-xs text-brand-600 hover:underline flex items-center gap-1">
                Manage requests
                {pendingCount > 0 && <span className="bg-brand-600 text-white text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center">{pendingCount}</span>}
              </Link>
            )}
          </div>
          <div className="px-5 py-5 space-y-4">
            <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
              <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-gray-700">Contact info is private</p>
                <p className="text-xs text-gray-400 mt-0.5">Revealed once the owner approves your request.</p>
              </div>
            </div>
            {!user ? (
              <Link href="/login" className="block w-full py-4 bg-brand-600 text-white font-bold text-center rounded-2xl hover:bg-brand-700 transition-all shadow-lg shadow-brand-600/20">
                Sign in to Request →
              </Link>
            ) : listing.available && !isOwner ? (
              <Link href={`/listings/${listing.id}/request`} className="block w-full py-4 bg-brand-600 text-white font-bold text-center rounded-2xl hover:bg-brand-700 active:scale-[0.98] transition-all shadow-lg shadow-brand-600/20">
                Request to Rent →
              </Link>
            ) : isOwner ? (
              <div className="w-full py-4 bg-gray-100 text-gray-400 font-bold text-center rounded-2xl">This is your listing</div>
            ) : (
              <div className="w-full py-4 bg-gray-100 text-gray-400 font-bold text-center rounded-2xl cursor-not-allowed">Currently Unavailable</div>
            )}
          </div>
        </div>

        {/* More from this owner */}
        {otherListings.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50/60">
              <span className="font-semibold text-gray-900">🏷️ More from {listing.contactName}</span>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {otherListings.map((l) => <ListingCard key={l.id} listing={l} />)}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
