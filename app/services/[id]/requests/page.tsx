'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import { fetchServiceListing, fetchServiceRequestsForListing, patchServiceRequestStatus } from '@/lib/serviceDb'
import { formatDate } from '@/lib/utils'
import type { ServiceListing, ServiceRequest } from '@/lib/types'

const statusColors: Record<string, string> = {
  pending:  'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-600',
}

export default function ServiceRequestsPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user, loading } = useAuth()

  const [service, setService]     = useState<ServiceListing | null>(null)
  const [requests, setRequests]   = useState<ServiceRequest[]>([])
  const [updating, setUpdating]   = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    fetchServiceListing(id).then((s) => {
      if (!s) { router.push('/services'); return }
      if (s.ownerId !== user.id) { router.push(`/services/${id}`); return }
      setService(s)
    })
    fetchServiceRequestsForListing(id).then(setRequests)
  }, [id, user, router])

  async function handleStatus(reqId: string, status: 'approved' | 'declined') {
    setUpdating(reqId)
    await patchServiceRequestStatus(reqId, status)
    setRequests((prev) => prev.map((r) => r.id === reqId ? { ...r, status } : r))
    // Email the hirer
    const req = requests.find((r) => r.id === reqId)
    if (req && service) {
      fetch('/api/notify/service-request-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hirerId: req.hirerId,
          hirerName: req.hirerName,
          providerName: service.contactName,
          serviceTitle: service.title,
          status,
          startDate: req.startDate,
          endDate: req.endDate,
          serviceId: service.id,
          requestId: reqId,
        }),
      }).catch(() => {})
    }
    setUpdating(null)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>
  if (!user)   return null
  if (!service) return null

  const pending  = requests.filter((r) => r.status === 'pending')
  const others   = requests.filter((r) => r.status !== 'pending')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-teal-600 to-brand-600 text-white px-4 pt-6 pb-10">
        <div className="max-w-3xl mx-auto">
          <Link href={`/services/${id}`} className="inline-flex items-center gap-1 text-sm text-teal-200 hover:text-white mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to listing
          </Link>
          <h1 className="text-2xl font-bold">Hire Requests</h1>
          <p className="text-teal-100 text-sm mt-1">{service.title}</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-4 pb-10 space-y-8">
        {requests.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-20">
            <p className="text-5xl mb-3">📋</p>
            <p className="font-semibold text-gray-700">No requests yet.</p>
            <p className="text-sm text-gray-400 mt-1">You'll see requests here when someone wants to hire you.</p>
          </div>
        )}

        {pending.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Pending ({pending.length})</h2>
            <div className="space-y-4">
              {pending.map((req) => (
                <RequestCard
                  key={req.id}
                  req={req}
                  updating={updating}
                  onApprove={() => handleStatus(req.id, 'approved')}
                  onDecline={() => handleStatus(req.id, 'declined')}
                />
              ))}
            </div>
          </div>
        )}

        {others.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Reviewed</h2>
            <div className="space-y-4">
              {others.map((req) => (
                <RequestCard
                  key={req.id}
                  req={req}
                  updating={updating}
                  onApprove={() => handleStatus(req.id, 'approved')}
                  onDecline={() => handleStatus(req.id, 'declined')}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function RequestCard({
  req,
  updating,
  onApprove,
  onDecline,
}: {
  req: ServiceRequest
  updating: string | null
  onApprove: () => void
  onDecline: () => void
}) {
  const isBusy = updating === req.id

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 font-bold text-sm flex items-center justify-center shrink-0">
            {req.hirerName.charAt(0).toUpperCase() || '?'}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{req.hirerName || 'Unknown'}</p>
            <p className="text-xs text-gray-400">{formatDate(req.createdAt)}</p>
          </div>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${statusColors[req.status]}`}>
          {req.status}
        </span>
      </div>

      <div className="px-5 pb-4 space-y-3">
        <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1 text-gray-600">
          <p><span className="font-medium text-gray-800">Dates:</span> {req.startDate} → {req.endDate}</p>
          {req.message && <p><span className="font-medium text-gray-800">Message:</span> {req.message}</p>}
        </div>

        {req.status === 'pending' && (
          <div className="flex gap-3">
            <button
              onClick={onApprove}
              disabled={isBusy}
              className="flex-1 py-2.5 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors text-sm disabled:opacity-50"
            >
              {isBusy ? '…' : '✓ Approve'}
            </button>
            <button
              onClick={onDecline}
              disabled={isBusy}
              className="flex-1 py-2.5 bg-red-50 text-red-600 font-semibold rounded-xl hover:bg-red-100 transition-colors text-sm border border-red-200 disabled:opacity-50"
            >
              {isBusy ? '…' : '✕ Decline'}
            </button>
          </div>
        )}

        {req.status === 'approved' && (
          <Link
            href={`/services/messages/${req.id}`}
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-teal-50 text-teal-700 font-semibold rounded-xl hover:bg-teal-100 transition-colors text-sm border border-teal-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Message Hirer
          </Link>
        )}
      </div>
    </div>
  )
}
