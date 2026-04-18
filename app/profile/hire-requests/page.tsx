'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { fetchMyServiceRequests } from '@/lib/serviceDb'
import { formatDate } from '@/lib/utils'
import type { ServiceRequest } from '@/lib/types'

const statusColors: Record<string, string> = {
  pending:  'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-600',
}

export default function MyHireRequestsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [requests, setRequests] = useState<ServiceRequest[]>([])

  useEffect(() => {
    if (!loading && !user) { router.push('/login'); return }
    if (user) fetchMyServiceRequests(user.id).then(setRequests)
  }, [user, loading, router])

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>
  if (!user)   return null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-teal-600 to-brand-600 text-white px-4 pt-6 pb-10">
        <div className="max-w-3xl mx-auto">
          <Link href="/profile" className="inline-flex items-center gap-1 text-sm text-teal-200 hover:text-white mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to profile
          </Link>
          <h1 className="text-2xl font-bold">My Hire Requests</h1>
          <p className="text-teal-100 text-sm mt-1">Services you've requested</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-4 pb-10">
        {requests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-20">
            <p className="text-5xl mb-3">📋</p>
            <p className="font-semibold text-gray-700">No hire requests yet.</p>
            <Link href="/services" className="mt-4 inline-block text-sm text-teal-600 hover:underline">
              Browse services →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <div key={req.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 flex items-start justify-between gap-4">
                  <div>
                    <Link href={`/services/${req.serviceId}`} className="font-semibold text-gray-900 hover:text-teal-600 transition-colors">
                      {req.serviceTitle}
                    </Link>
                    <p className="text-sm text-gray-500 mt-0.5">Provider: {req.providerName}</p>
                  </div>
                  <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[req.status]}`}>
                    {req.status}
                  </span>
                </div>
                <div className="px-5 pb-4 space-y-3">
                  <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
                    <p><span className="font-medium text-gray-800">Dates:</span> {req.startDate} → {req.endDate}</p>
                    {req.message && <p className="mt-1"><span className="font-medium text-gray-800">Message:</span> {req.message}</p>}
                    <p className="mt-1 text-xs text-gray-400">Requested {formatDate(req.createdAt)}</p>
                  </div>
                  {req.status === 'approved' && (
                    <Link
                      href={`/services/messages/${req.id}`}
                      className="flex items-center justify-center gap-2 w-full py-2.5 bg-teal-50 text-teal-700 font-semibold rounded-xl hover:bg-teal-100 transition-colors text-sm border border-teal-200"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      Message Provider
                    </Link>
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
