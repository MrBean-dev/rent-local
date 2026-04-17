'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { fetchListing, fetchRequestsForListing, patchRequestStatus, fetchMyReviewForRequest } from '@/lib/db'
import { getIdDocumentUrl } from '@/lib/uploadImage'
import { useAuth } from '@/components/AuthProvider'
import type { Listing, RentalRequest } from '@/lib/types'
import { formatDate, formatPrice } from '@/lib/utils'
import ReviewForm from '@/components/ReviewForm'

const statusStyles: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700', approved: 'bg-green-100 text-green-700', declined: 'bg-red-100 text-red-600',
}
const statusLabel: Record<string, string> = {
  pending: 'Pending', approved: 'Approved', declined: 'Declined',
}

function daysBetween(start: string, end: string) {
  return Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1)
}
function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function RequestsDashboard() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const [listing, setListing]     = useState<Listing | null>(null)
  const [requests, setRequests]   = useState<RentalRequest[]>([])
  const [filter, setFilter]       = useState<'all' | 'pending' | 'approved' | 'declined'>('all')
  const [reviewedMap, setReviewedMap] = useState<Record<string, boolean>>({})
  const [showReviewFor, setShowReviewFor] = useState<string | null>(null)

  useEffect(() => {
    fetchListing(id).then((found) => {
      if (!found) { router.push('/listings'); return }
      setListing(found)
      fetchRequestsForListing(id).then(async (reqs) => {
        setRequests(reqs)
        if (!user) return
        const today = new Date().toISOString().split('T')[0]
        const map: Record<string, boolean> = {}
        await Promise.all(
          reqs
            .filter((r) => r.status === 'approved' && r.endDate <= today)
            .map(async (r) => {
              const rev = await fetchMyReviewForRequest(r.id, user.id)
              map[r.id] = rev !== null
            })
        )
        setReviewedMap(map)
      })
    })
  }, [id, router])

  async function setStatus(reqId: string, status: RentalRequest['status']) {
    await patchRequestStatus(reqId, status)
    setRequests((prev) => prev.map((r) => r.id === reqId ? { ...r, status } : r))

    if (status === 'approved' || status === 'declined') {
      const req = requests.find((r) => r.id === reqId)
      if (req && listing) {
        // Fetch renter email from Supabase auth
        import('@/lib/supabase').then(({ createClient }) => {
          (createClient().from('rental_requests') as any)
            .select('renter_id')
            .eq('id', reqId)
            .single()
            .then(({ data }: any) => {
              if (!data) return
              // Get renter email via profiles or auth — use renter_id as a lookup
              fetch('/api/notify/request-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  renterEmail: `${data.renter_id}@placeholder.com`, // resolved server-side
                  renterName: req.renterName,
                  ownerName: listing.contactName,
                  listingTitle: listing.title,
                  status,
                  startDate: req.startDate,
                  endDate: req.endDate,
                  listingId: listing.id,
                  requestId: reqId,
                  renterId: data.renter_id,
                }),
              }).catch(() => {})
            })
        })
      }
    }
  }

  const counts = {
    all: requests.length,
    pending: requests.filter((r) => r.status === 'pending').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    declined: requests.filter((r) => r.status === 'declined').length,
  }
  const visible = filter === 'all' ? requests : requests.filter((r) => r.status === filter)

  if (!listing) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5">
          <Link href={`/listings/${listing.id}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-3">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to listing
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Rental Requests</h1>
              <p className="text-gray-500 text-sm mt-0.5">{listing.title}</p>
            </div>
            <span className="shrink-0 text-sm font-medium text-brand-600">{formatPrice(listing.pricePerDay)}</span>
          </div>
          <div className="flex gap-1 mt-4 border-b border-gray-100 -mb-5">
            {(['all', 'pending', 'approved', 'declined'] as const).map((s) => (
              <button key={s} onClick={() => setFilter(s)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${filter === s ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                {counts[s] > 0 && <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-bold ${s === 'pending' ? 'bg-yellow-100 text-yellow-700' : s === 'approved' ? 'bg-green-100 text-green-700' : s === 'declined' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>{counts[s]}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {visible.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">📭</p>
            <p className="font-medium text-gray-600">{filter === 'all' ? 'No requests yet.' : `No ${filter} requests.`}</p>
            {filter === 'all' && <p className="text-sm text-gray-400 mt-1">Share your listing link so renters can find it.</p>}
          </div>
        ) : (
          <div className="space-y-4">
            {visible.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((req) => {
              const days = daysBetween(req.startDate, req.endDate)
              const total = days * listing.pricePerDay
              return (
                <div key={req.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm shrink-0">{req.renterName.charAt(0).toUpperCase()}</div>
                      <div>
                        <p className="font-semibold text-gray-900">{req.renterName}</p>
                        <p className="text-xs text-gray-400">{formatDate(req.createdAt)}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyles[req.status]}`}>{statusLabel[req.status]}</span>
                  </div>
                  <div className="px-5 py-4 space-y-3">
                    <div className="flex flex-wrap gap-3">
                      <div className="bg-gray-50 rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <span className="text-gray-700 font-medium">{formatDateShort(req.startDate)} – {formatDateShort(req.endDate)}</span>
                        <span className="text-gray-400">({days} day{days !== 1 ? 's' : ''})</span>
                      </div>
                      <div className="bg-brand-50 rounded-xl px-4 py-2.5 text-sm font-bold text-brand-700">${total.toLocaleString()} est.</div>
                    </div>
                    {req.message && <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-600 italic">"{req.message}"</div>}

                    {/* ID document */}
                    {req.idDocumentUrl && (
                      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-blue-600 text-lg">🪪</span>
                          <div>
                            <p className="text-sm font-semibold text-blue-900">Driver's License Provided</p>
                            <p className="text-xs text-blue-500">Click to view — link expires in 1 hour</p>
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            const url = await getIdDocumentUrl(req.idDocumentUrl!)
                            window.open(url, '_blank')
                          }}
                          className="shrink-0 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          View ID
                        </button>
                      </div>
                    )}
                    {req.status === 'pending' && (
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => setStatus(req.id, 'approved')} className="flex-1 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition-colors">✓ Approve</button>
                        <button onClick={() => setStatus(req.id, 'declined')} className="flex-1 py-2.5 border border-red-300 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-50 transition-colors">✕ Decline</button>
                      </div>
                    )}
                    {req.status !== 'pending' && <button onClick={() => setStatus(req.id, 'pending')} className="text-xs text-gray-400 hover:text-gray-600 hover:underline">Reset to pending</button>}
                    <Link href={`/messages/${req.id}`} className="inline-flex items-center gap-1.5 mt-1 text-sm text-brand-600 hover:underline">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      Message {req.renterName}
                    </Link>

                    {/* Review prompt for completed rentals */}
                    {req.status === 'approved' && req.endDate <= new Date().toISOString().split('T')[0] && (
                      reviewedMap[req.id] ? (
                        <p className="mt-1 text-xs text-green-600 font-medium">✓ Reviewed</p>
                      ) : showReviewFor === req.id ? (
                        <div className="mt-3 border-t border-gray-100 pt-3">
                          <ReviewForm
                            requestId={req.id}
                            listingId={id}
                            reviewerId={user!.id}
                            revieweeId={req.renterName}
                            reviewerType="owner"
                            revieweeName={req.renterName}
                            listingTitle={listing.title}
                            onDone={() => {
                              setShowReviewFor(null)
                              setReviewedMap((prev) => ({ ...prev, [req.id]: true }))
                            }}
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowReviewFor(req.id)}
                          className="mt-1 text-sm text-amber-600 hover:underline"
                        >
                          ⭐ Review this renter
                        </button>
                      )
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
