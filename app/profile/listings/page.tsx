'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchMyListings, removeListing, patchListing } from '@/lib/db'
import { useAuth } from '@/components/AuthProvider'
import { fetchRequestsForListing } from '@/lib/db'
import type { Listing } from '@/lib/types'
import { formatPrice, formatDate } from '@/lib/utils'

const categoryBadge: Record<string, string> = {
  trailer: 'bg-blue-100 text-blue-700', backhoe: 'bg-orange-100 text-orange-700', tool: 'bg-green-100 text-green-700', box_truck: 'bg-purple-100 text-purple-700',
}
const categoryIcon: Record<string, string> = { trailer: '🚛', backhoe: '🚜', tool: '🔧', box_truck: '🚚' }

export default function MyListingsPage() {
  const { user, loading } = useAuth()
  const [listings, setListings]         = useState<Listing[]>([])
  const [pendingMap, setPendingMap]     = useState<Record<string, number>>({})
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  async function load(uid: string) {
    const mine = await fetchMyListings(uid)
    setListings(mine)
    const map: Record<string, number> = {}
    await Promise.all(mine.map(async (l) => {
      const reqs = await fetchRequestsForListing(l.id)
      map[l.id] = reqs.filter((r) => r.status === 'pending').length
    }))
    setPendingMap(map)
  }

  useEffect(() => { if (user) load(user.id) }, [user])

  async function handleDelete(id: string) {
    await removeListing(id)
    setConfirmDelete(null)
    if (user) load(user.id)
  }

  async function handleToggle(listing: Listing) {
    await patchListing(listing.id, { available: !listing.available })
    if (user) load(user.id)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>

  if (!user) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-4xl">👤</p>
      <p className="font-semibold text-gray-700">Sign in to see your listings</p>
      <Link href="/login" className="px-5 py-3 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 transition-colors">Sign in</Link>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-brand-600 to-orange-600 text-white px-4 pt-6 pb-10">
        <div className="max-w-3xl mx-auto">
          <Link href="/profile" className="inline-flex items-center gap-1 text-sm text-orange-200 hover:text-white mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Profile
          </Link>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">My Listings</h1>
              <p className="text-orange-100 text-sm mt-1">{listings.length} listing{listings.length !== 1 ? 's' : ''} posted</p>
            </div>
            <Link href="/post" className="shrink-0 px-4 py-2.5 bg-white text-brand-600 text-sm font-semibold rounded-xl hover:bg-orange-50 transition-colors shadow-sm">+ New Listing</Link>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-4 pb-10">
        {listings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-20">
            <p className="text-5xl mb-3">📋</p>
            <p className="font-semibold text-gray-700">No listings yet.</p>
            <Link href="/post" className="mt-4 inline-block text-sm text-brand-600 hover:underline">Post your first listing →</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {listings.map((l) => (
              <div key={l.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex gap-4 p-4">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center text-3xl">
                    {l.imageUrl ? <img src={l.imageUrl} alt={l.title} className="w-full h-full object-cover" /> : <span>{categoryIcon[l.category]}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${categoryBadge[l.category]}`}>{categoryIcon[l.category]} {l.category}</span>
                        <p className="font-semibold text-gray-900 mt-1 truncate">{l.title}</p>
                      </div>
                      <p className="text-brand-600 font-bold text-sm shrink-0">{formatPrice(l.pricePerDay)}</p>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-gray-400">
                      <span>📍 {l.location}</span>
                      <span>{formatDate(l.createdAt)}</span>
                      <span className={l.available ? 'text-green-600 font-medium' : 'text-red-400 font-medium'}>
                        {l.available ? '● Available' : '● Unavailable'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="border-t border-gray-50 px-4 py-2.5 flex items-center gap-3 flex-wrap">
                  <Link href={`/listings/${l.id}`} className="text-sm text-gray-500 hover:text-gray-800 transition-colors">View</Link>
                  <span className="text-gray-200">·</span>
                  <Link href={`/listings/${l.id}/edit`} className="text-sm text-brand-600 hover:underline">Edit</Link>
                  <span className="text-gray-200">·</span>
                  <button onClick={() => handleToggle(l)} className={`text-sm hover:underline ${l.available ? 'text-yellow-600' : 'text-green-600'}`}>
                    {l.available ? 'Mark unavailable' : 'Mark available'}
                  </button>
                  <span className="text-gray-200">·</span>
                  <Link href={`/listings/${l.id}/requests`} className="text-sm text-brand-600 hover:underline flex items-center gap-1">
                    Requests
                    {pendingMap[l.id] > 0 && <span className="bg-brand-600 text-white text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center">{pendingMap[l.id]}</span>}
                  </Link>
                  <span className="text-gray-200 ml-auto">·</span>
                  {confirmDelete === l.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Delete?</span>
                      <button onClick={() => handleDelete(l.id)} className="text-xs font-semibold text-red-500 hover:underline">Yes</button>
                      <button onClick={() => setConfirmDelete(null)} className="text-xs text-gray-400 hover:underline">No</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(l.id)} className="text-sm text-red-400 hover:text-red-600 hover:underline">Delete</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
