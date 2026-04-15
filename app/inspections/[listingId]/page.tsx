'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getListing } from '@/lib/storage'
import { getInspectionsForListing, deleteInspection } from '@/lib/inspections'
import type { Listing, RentalInspection, InspectionPhoto } from '@/lib/types'
import { formatDate } from '@/lib/utils'

export default function InspectionsListPage() {
  const { listingId } = useParams<{ listingId: string }>()
  const router = useRouter()
  const [listing, setListing]         = useState<Listing | null>(null)
  const [inspections, setInspections] = useState<RentalInspection[]>([])
  const [expanded, setExpanded]       = useState<string | null>(null)
  const [viewPhoto, setViewPhoto]     = useState<InspectionPhoto | null>(null)

  useEffect(() => {
    const found = getListing(listingId)
    if (!found) { router.push('/listings'); return }
    setListing(found)
    setInspections(getInspectionsForListing(listingId))
  }, [listingId, router])

  function handleDelete(id: string) {
    if (!confirm('Delete this inspection record?')) return
    deleteInspection(id)
    setInspections((prev) => prev.filter((i) => i.id !== id))
  }

  if (!listing) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner */}
      <div className="bg-gradient-to-r from-brand-600 to-orange-600 text-white px-4 pt-6 pb-10">
        <div className="max-w-3xl mx-auto">
          <Link href={`/listings/${listing.id}`} className="inline-flex items-center gap-1 text-sm text-orange-200 hover:text-white mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to listing
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Inspection Records</h1>
              <p className="text-orange-100 text-sm mt-1">{listing.title}</p>
            </div>
            <Link
              href={`/listings/${listing.id}/inspect`}
              className="shrink-0 px-4 py-2.5 bg-white text-brand-600 text-sm font-semibold rounded-xl hover:bg-orange-50 transition-colors shadow-sm"
            >
              + New Inspection
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-4 pb-10">
        {inspections.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-20">
            <p className="text-5xl mb-3">📷</p>
            <p className="font-semibold text-gray-700">No inspections recorded yet.</p>
            <Link href={`/listings/${listing.id}/inspect`} className="mt-4 inline-block text-sm text-brand-600 hover:underline">
              Start first inspection →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {inspections.map((insp) => (
              <div key={insp.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <button
                  onClick={() => setExpanded(expanded === insp.id ? null : insp.id)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 font-bold text-sm flex items-center justify-center shrink-0">
                      {insp.renterName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{insp.renterName}</p>
                      <p className="text-sm text-gray-400">{formatDate(insp.createdAt)} · {insp.photos.length} photo{insp.photos.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <svg className={`w-5 h-5 text-gray-400 transition-transform ${expanded === insp.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {expanded === insp.id && (
                  <div className="px-5 pb-5 border-t border-gray-50">
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-4 mb-4">
                      {insp.photos.map((photo, i) => (
                        <button
                          key={photo.id}
                          onClick={() => setViewPhoto(photo)}
                          className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity"
                        >
                          <img src={photo.dataUrl} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                          {photo.note && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-1">
                              <p className="text-white text-xs line-clamp-1">{photo.note}</p>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => handleDelete(insp.id)} className="text-xs text-red-400 hover:text-red-600 hover:underline">
                      Delete this record
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {viewPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setViewPhoto(null)}>
          <div className="max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <img src={viewPhoto.dataUrl} alt="Inspection photo" className="w-full rounded-2xl" />
            {viewPhoto.note && <p className="mt-3 text-white text-sm text-center">{viewPhoto.note}</p>}
            <button onClick={() => setViewPhoto(null)} className="mt-4 w-full py-3 bg-white/10 text-white rounded-xl text-sm hover:bg-white/20 transition-colors">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
