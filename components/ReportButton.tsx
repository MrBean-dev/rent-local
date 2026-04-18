'use client'

import { useState } from 'react'
import { useAuth } from './AuthProvider'
import { createClient } from '@/lib/supabase'

const reasons = [
  'Spam or fake listing',
  'Inappropriate content',
  'Misleading information',
  'Prohibited item or service',
  'Suspected scam',
  'Other',
]

export default function ReportButton({ targetType, targetId }: { targetType: string; targetId: string }) {
  const { user } = useAuth()
  const [open, setOpen]       = useState(false)
  const [reason, setReason]   = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone]       = useState(false)

  if (!user) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!reason || !user) return
    setSending(true)
    await (createClient().from('reports') as any).insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      reason,
    })
    setSending(false)
    setDone(true)
    setTimeout(() => { setOpen(false); setDone(false); setReason('') }, 2000)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-gray-400 hover:text-red-500 transition-colors"
      >
        🚩 Report this listing
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            {done ? (
              <div className="text-center py-4">
                <p className="text-3xl mb-2">✅</p>
                <p className="font-semibold text-gray-900">Report submitted</p>
                <p className="text-sm text-gray-500 mt-1">Thanks — we'll review it shortly.</p>
              </div>
            ) : (
              <>
                <h3 className="font-bold text-gray-900 mb-4">Report this listing</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    {reasons.map((r) => (
                      <label key={r} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-red-300 cursor-pointer transition-colors has-[:checked]:border-red-400 has-[:checked]:bg-red-50">
                        <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="accent-red-500" />
                        <span className="text-sm text-gray-700">{r}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
                      Cancel
                    </button>
                    <button type="submit" disabled={!reason || sending} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50">
                      {sending ? 'Sending…' : 'Submit Report'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
