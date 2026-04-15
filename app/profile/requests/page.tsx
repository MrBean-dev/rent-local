'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getRequests } from '@/lib/requests'
import { getProfile } from '@/lib/profile'
import type { RentalRequest } from '@/lib/types'
import { formatDate } from '@/lib/utils'

const statusStyles: Record<string, string> = {
  pending:  'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-500',
}

const statusIcon: Record<string, string> = {
  pending: '⏳', approved: '✅', declined: '✕',
}

function daysBetween(start: string, end: string) {
  return Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1)
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function MyRequestsPage() {
  const [requests, setRequests]   = useState<RentalRequest[]>([])
  const [hasProfile, setHasProfile] = useState(true)
  const [filter, setFilter]       = useState<'all' | 'pending' | 'approved' | 'declined'>('all')

  useEffect(() => {
    const profile = getProfile()
    if (!profile) { setHasProfile(false); return }
    const mine = getRequests().filter(
      (r) => r.renterName.toLowerCase() === profile.name.toLowerCase() ||
             r.renterEmail.toLowerCase() === profile.email.toLowerCase() ||
             r.renterPhone === profile.phone
    )
    setRequests(mine.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
  }, [])

  if (!hasProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-4xl">👤</p>
        <p className="font-semibold text-gray-700">No profile yet</p>
        <p className="text-sm text-gray-500">Create a profile to track your rental requests.</p>
        <Link href="/profile" className="px-5 py-3 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 transition-colors">Create Profile</Link>
      </div>
    )
  }

  const counts = {
    all: requests.length,
    pending:  requests.filter((r) => r.status === 'pending').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    declined: requests.filter((r) => r.status === 'declined').length,
  }

  const visible = filter === 'all' ? requests : requests.filter((r) => r.status === filter)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-brand-600 to-orange-600 text-white px-4 pt-6 pb-10">
        <div className="max-w-2xl mx-auto">
          <Link href="/profile" className="inline-flex items-center gap-1 text-sm text-orange-200 hover:text-white mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Profile
          </Link>
          <h1 className="text-2xl font-bold">My Requests</h1>
          <p className="text-orange-100 text-sm mt-1">{requests.length} rental request{requests.length !== 1 ? 's' : ''} sent</p>

          {/* Filter tabs */}
          <div className="flex gap-1 mt-5 border-b border-white/20 -mb-10">
            {(['all', 'pending', 'approved', 'declined'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
                  filter === s ? 'border-white text-white' : 'border-transparent text-orange-200 hover:text-white'
                }`}
              >
                {s === 'all' ? 'All' : s}
                {counts[s] > 0 && <span className="ml-1.5 opacity-70">({counts[s]})</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 mt-14 pb-10">
        {visible.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-20">
            <p className="text-5xl mb-3">📭</p>
            <p className="font-semibold text-gray-700">
              {filter === 'all' ? "You haven't sent any requests yet." : `No ${filter} requests.`}
            </p>
            {filter === 'all' && (
              <Link href="/listings" className="mt-4 inline-block text-sm text-brand-600 hover:underline">Browse equipment →</Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map((req) => {
              const days = daysBetween(req.startDate, req.endDate)
              return (
                <div key={req.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="flex items-start justify-between gap-3 px-5 py-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{req.listingTitle}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Requested {formatDate(req.createdAt)}</p>
                    </div>
                    <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyles[req.status]}`}>
                      {statusIcon[req.status]} {req.status}
                    </span>
                  </div>

                  <div className="border-t border-gray-50 px-5 py-3 flex flex-wrap gap-3 text-sm">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {fmtDate(req.startDate)} – {fmtDate(req.endDate)}
                      <span className="text-gray-400">({days}d)</span>
                    </div>
                  </div>

                  {req.message && (
                    <div className="px-5 pb-3">
                      <p className="text-sm text-gray-500 italic bg-gray-50 rounded-xl px-3 py-2">"{req.message}"</p>
                    </div>
                  )}

                  <div className="border-t border-gray-50 px-5 py-2.5">
                    <Link href={`/listings/${req.listingId}`} className="text-sm text-brand-600 hover:underline">
                      View listing →
                    </Link>
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
