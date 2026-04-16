'use client'

import { useState } from 'react'
import { submitReview } from '@/lib/db'
import { StarPicker } from './StarRating'

interface Props {
  requestId: string
  listingId: string
  reviewerId: string
  revieweeId: string
  reviewerType: 'renter' | 'owner'
  revieweeName: string
  listingTitle: string
  onDone: () => void
}

export default function ReviewForm({
  requestId, listingId, reviewerId, revieweeId,
  reviewerType, revieweeName, listingTitle, onDone,
}: Props) {
  const [rating, setRating]   = useState(0)
  const [comment, setComment] = useState('')
  const [saving, setSaving]   = useState(false)
  const [done, setDone]       = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rating === 0) return
    setSaving(true)
    await submitReview({ requestId, listingId, reviewerId, revieweeId, reviewerType, rating, comment: comment.trim() })
    setSaving(false)
    setDone(true)
    setTimeout(onDone, 1500)
  }

  if (done) return (
    <div className="text-center py-6">
      <p className="text-3xl mb-2">⭐</p>
      <p className="font-semibold text-gray-900">Review submitted!</p>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="text-xs text-gray-500 mb-1">Rating for <span className="font-medium text-gray-700">{revieweeName}</span></p>
        <p className="text-sm text-gray-400 mb-3 truncate">{listingTitle}</p>
        <StarPicker value={rating} onChange={setRating} />
        {rating === 0 && <p className="text-xs text-gray-400 mt-1">Tap a star to rate</p>}
      </div>
      <div>
        <textarea
          rows={3}
          placeholder={`How was your experience ${reviewerType === 'renter' ? 'renting this equipment' : 'with this renter'}?`}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 resize-none"
        />
      </div>
      <button
        type="submit"
        disabled={rating === 0 || saving}
        className="w-full py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition-colors disabled:opacity-40"
      >
        {saving ? 'Submitting…' : 'Submit Review'}
      </button>
    </form>
  )
}
