'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getListing } from '@/lib/storage'
import { saveRequest, getRequestsForListing } from '@/lib/requests'
import { getProfile } from '@/lib/profile'
import { generateId, formatPrice } from '@/lib/utils'
import type { Listing } from '@/lib/types'

interface Form {
  renterName: string
  renterPhone: string
  renterEmail: string
  startDate: string
  endDate: string
  message: string
}

const blank: Form = { renterName: '', renterPhone: '', renterEmail: '', startDate: '', endDate: '', message: '' }

export default function RequestPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [listing, setListing] = useState<Listing | null>(null)
  const [form, setForm] = useState<Form>(blank)
  const [errors, setErrors] = useState<Partial<Form>>({})
  const [submitted, setSubmitted] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    const found = getListing(id)
    if (!found) { router.push('/listings'); return }
    setListing(found)
    const profile = getProfile()
    if (profile) {
      setForm((prev) => ({
        ...prev,
        renterName:  prev.renterName  || profile.name,
        renterPhone: prev.renterPhone || profile.phone,
        renterEmail: prev.renterEmail || profile.email,
      }))
    }
  }, [id, router])

  function set(field: keyof Form, value: string) {
    setForm((p) => ({ ...p, [field]: value }))
    if (errors[field]) setErrors((p) => { const e = { ...p }; delete e[field]; return e })
  }

  function validate() {
    const e: Partial<Form> = {}
    if (!form.renterName.trim()) e.renterName = 'Required'
    if (!form.renterPhone.trim() && !form.renterEmail.trim()) e.renterPhone = 'Provide phone or email'
    if (!form.startDate) e.startDate = 'Required'
    if (!form.endDate) e.endDate = 'Required'
    if (form.startDate && form.endDate && form.endDate < form.startDate) e.endDate = 'Must be after start'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate() || !listing) return
    saveRequest({
      id: generateId(),
      listingId: listing.id,
      listingTitle: listing.title,
      ownerName:  listing.contactName,
      ownerPhone: listing.contactPhone,
      ownerEmail: listing.contactEmail,
      renterName: form.renterName.trim(),
      renterPhone: form.renterPhone.trim(),
      renterEmail: form.renterEmail.trim(),
      startDate: form.startDate,
      endDate: form.endDate,
      message: form.message.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    })
    setSubmitted(true)
  }

  const days =
    form.startDate && form.endDate && form.endDate >= form.startDate
      ? Math.max(1, Math.round((new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / 86400000) + 1)
      : null

  const inp = (field: keyof Form, extra = '') =>
    `w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-colors ${extra} ${
      errors[field] ? 'border-red-400 bg-red-50 focus:ring-red-200' : 'border-gray-200 bg-white focus:ring-brand-200 focus:border-brand-400'
    }`

  if (!listing) return null

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Request Sent!</h2>
          <p className="text-gray-500 mt-2">
            Your request is pending review. You'll hear back through the app.
          </p>
          <div className="mt-6 bg-gray-50 rounded-xl p-4 text-left text-sm space-y-1.5 text-gray-600">
            <p><span className="font-medium text-gray-900">Equipment:</span> {listing.title}</p>
            <p><span className="font-medium text-gray-900">Dates:</span> {form.startDate} → {form.endDate}</p>
            {days && listing && (
              <p><span className="font-medium text-gray-900">Est. total:</span> {days} day{days !== 1 ? 's' : ''} × {formatPrice(listing.pricePerDay)} = <strong>${(days * listing.pricePerDay).toLocaleString()}</strong></p>
            )}
          </div>
          <Link
            href={`/listings/${listing.id}`}
            className="mt-6 inline-block px-6 py-3 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 transition-colors"
          >
            Back to Listing
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-xl mx-auto px-4 sm:px-6 py-4">
          <Link href={`/listings/${listing.id}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-3">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
          {/* Listing summary */}
          <div className="flex items-center gap-3">
            {listing.imageUrl ? (
              <img src={listing.imageUrl} alt={listing.title} className="w-14 h-14 rounded-xl object-cover shrink-0 border border-gray-100" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-2xl shrink-0">
                {listing.category === 'trailer' ? '🚛' : listing.category === 'backhoe' ? '🚜' : '🔧'}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-bold text-gray-900 truncate">{listing.title}</p>
              <p className="text-sm text-gray-500">{listing.location} · <span className="text-brand-600 font-semibold">{formatPrice(listing.pricePerDay)}</span></p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={submit} noValidate className="max-w-xl mx-auto px-4 sm:px-6 py-8 space-y-5">

        {/* Dates */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50/60">
            <span className="w-7 h-7 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center shrink-0">1</span>
            <span className="font-semibold text-gray-900">📅 Rental Dates</span>
          </div>
          <div className="px-5 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Date <span className="text-red-500">*</span></label>
                <input type="date" min={today} value={form.startDate} onChange={(e) => set('startDate', e.target.value)} className={inp('startDate')} />
                {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">End Date <span className="text-red-500">*</span></label>
                <input type="date" min={form.startDate || today} value={form.endDate} onChange={(e) => set('endDate', e.target.value)} className={inp('endDate')} />
                {errors.endDate && <p className="text-red-500 text-xs mt-1">{errors.endDate}</p>}
              </div>
            </div>

            {/* Cost estimate */}
            {days && (
              <div className="bg-brand-50 border border-brand-100 rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-brand-700">{days} day{days !== 1 ? 's' : ''} × {formatPrice(listing.pricePerDay)}</span>
                <span className="font-bold text-brand-700 text-lg">${(days * listing.pricePerDay).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Your info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50/60">
            <span className="w-7 h-7 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center shrink-0">2</span>
            <span className="font-semibold text-gray-900">👤 Your Info</span>
          </div>
          <div className="px-5 py-5 space-y-4">
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-700">
              <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Your contact info is <strong>kept private</strong>. The owner responds through the app.
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Name <span className="text-red-500">*</span></label>
              <input type="text" placeholder="Full name" value={form.renterName} onChange={(e) => set('renterName', e.target.value)} className={inp('renterName')} />
              {errors.renterName && <p className="text-red-500 text-xs mt-1">{errors.renterName}</p>}
            </div>
            <p className="text-xs text-gray-500 -mb-1">Provide at least one way for the owner to reach you.</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                <input type="tel" placeholder="(406) 555-0100" value={form.renterPhone} onChange={(e) => set('renterPhone', e.target.value)} className={inp('renterPhone')} />
                {errors.renterPhone && <p className="text-red-500 text-xs mt-1">{errors.renterPhone}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input type="email" placeholder="you@example.com" value={form.renterEmail} onChange={(e) => set('renterEmail', e.target.value)} className={inp('renterEmail')} />
              </div>
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50/60">
            <span className="w-7 h-7 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center shrink-0">3</span>
            <span className="font-semibold text-gray-900">💬 Message <span className="text-gray-400 font-normal text-sm">(optional)</span></span>
          </div>
          <div className="px-5 py-5">
            <textarea
              rows={3}
              placeholder="Introduce yourself, describe what you'll use it for, ask any questions…"
              value={form.message}
              onChange={(e) => set('message', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 resize-none"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-4 bg-brand-600 text-white font-bold rounded-2xl hover:bg-brand-700 active:scale-[0.98] transition-all text-base shadow-lg shadow-brand-600/20"
        >
          Send Rental Request →
        </button>

        <p className="text-center text-xs text-gray-400 pb-4">
          The owner will contact you to confirm. No payment collected here.
        </p>
      </form>
    </div>
  )
}
