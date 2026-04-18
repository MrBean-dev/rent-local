'use client'

import { useEffect, useState } from 'react'
import { useAuth } from './AuthProvider'
import { StarDisplay, StarPicker } from './StarRating'
import { fetchServiceReviews, fetchMyServiceReview, submitServiceReview } from '@/lib/serviceDb'
import { formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase'
import type { ServiceReview } from '@/lib/types'

export default function ServiceReviewSection({ serviceId }: { serviceId: string }) {
  const { user } = useAuth()
  const [reviews, setReviews]         = useState<ServiceReview[]>([])
  const [myRequestId, setMyRequestId] = useState<string | null>(null)
  const [myReview, setMyReview]       = useState<ServiceReview | null>(null)
  const [rating, setRating]           = useState(0)
  const [comment, setComment]         = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [submitted, setSubmitted]     = useState(false)

  useEffect(() => {
    fetchServiceReviews(serviceId).then(setReviews)
    if (!user) return
    // Only show review form if request is approved AND end date has passed
    const today = new Date().toISOString().split('T')[0]
    ;(createClient().from('service_requests') as any)
      .select('id, end_date')
      .eq('service_id', serviceId)
      .eq('hirer_id', user.id)
      .eq('status', 'approved')
      .lte('end_date', today)
      .limit(1)
      .then(({ data }: any) => {
        if (data?.[0]?.id) {
          setMyRequestId(data[0].id)
          fetchMyServiceReview(data[0].id, user.id).then(setMyReview)
        }
      })
  }, [serviceId, user])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !myRequestId || rating === 0) return
    setSubmitting(true)
    await submitServiceReview({ requestId: myRequestId, serviceId, reviewerId: user.id, rating, comment: comment.trim() })
    setSubmitted(true)
    fetchServiceReviews(serviceId).then(setReviews)
    setSubmitting(false)
  }

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
        <h2 className="font-bold text-gray-900">Reviews</h2>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2">
            <StarDisplay rating={avg} size="sm" />
            <span className="text-sm font-semibold text-gray-700">{avg.toFixed(1)}</span>
            <span className="text-xs text-gray-400">({reviews.length})</span>
          </div>
        )}
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* Leave a review */}
        {user && myRequestId && !myReview && !submitted && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-amber-800 mb-3">⭐ Leave a Review</p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <StarPicker value={rating} onChange={setRating} />
              <textarea
                rows={2}
                placeholder="Share your experience…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-amber-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 resize-none"
              />
              <button
                type="submit"
                disabled={submitting || rating === 0}
                className="px-4 py-2 bg-amber-500 text-white text-sm font-semibold rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Submitting…' : 'Submit Review'}
              </button>
            </form>
          </div>
        )}

        {submitted && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700 font-medium">
            ✓ Thanks for your review!
          </div>
        )}

        {reviews.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No reviews yet.</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((r) => (
              <div key={r.id} className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 font-bold text-sm flex items-center justify-center shrink-0">
                  {r.reviewerName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{r.reviewerName}</p>
                    <StarDisplay rating={r.rating} size="sm" />
                    <span className="text-xs text-gray-400 ml-auto">{formatDate(r.createdAt)}</span>
                  </div>
                  {r.comment && <p className="text-sm text-gray-600 mt-1">{r.comment}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
