'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { fetchListing, insertRequest, fetchProfile } from '@/lib/db'
import { useAuth } from '@/components/AuthProvider'
import { uploadIdDocument } from '@/lib/uploadImage'
import { formatPrice } from '@/lib/utils'
import type { Listing } from '@/lib/types'

interface Form {
  startDate: string; endDate: string; message: string
}

const blank: Form = { startDate: '', endDate: '', message: '' }

export default function RequestPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user, loading } = useAuth()

  const [listing, setListing]       = useState<Listing | null>(null)
  const [form, setForm]             = useState<Form>(blank)
  const [errors, setErrors]         = useState<Partial<Form>>({})
  const [submitted, setSubmitted]   = useState(false)
  const [renterName, setRenterName] = useState('')
  const [idFile, setIdFile]         = useState<File | null>(null)
  const [idPreview, setIdPreview]   = useState<string>('')
  const [uploadingId, setUploadingId] = useState(false)
  const idInputRef                  = useRef<HTMLInputElement>(null)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    fetchListing(id).then((found) => {
      if (!found) { router.push('/listings'); return }
      setListing(found)
    })
  }, [id, router])

  useEffect(() => {
    if (!user) return
    fetchProfile(user.id).then((p) => {
      if (p?.name) setRenterName(p.name)
    })
  }, [user])

  function set(field: keyof Form, value: string) {
    setForm((p) => ({ ...p, [field]: value }))
    if (errors[field]) setErrors((p) => { const e = { ...p }; delete e[field]; return e })
  }

  function validate() {
    const e: Partial<Form> = {}
    if (!form.startDate) e.startDate = 'Required'
    if (!form.endDate) e.endDate = 'Required'
    if (form.startDate && form.endDate && form.endDate < form.startDate) e.endDate = 'Must be after start'
    setErrors(e)
    const needsId = listing?.category === 'box_truck'
    if (needsId && !idFile) return false
    return Object.keys(e).length === 0 && !(needsId && !idFile)
  }

  function handleIdChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setIdFile(file)
    setIdPreview(URL.createObjectURL(file))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate() || !listing || !user) return
    let idDocumentUrl: string | undefined
    if (idFile) {
      setUploadingId(true)
      try { idDocumentUrl = await uploadIdDocument(user.id, idFile) } catch {}
      setUploadingId(false)
    }
    await insertRequest(user.id, {
      listingId: listing.id,
      startDate: form.startDate,
      endDate: form.endDate,
      message: form.message.trim(),
      idDocumentUrl,
    })
    // Notify owner by email (fire and forget)
    fetch('/api/notify/request-received', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ownerEmail: listing.contactEmail || user.email,
        ownerName: listing.contactName,
        renterName: renterName || user.email,
        listingTitle: listing.title,
        startDate: form.startDate,
        endDate: form.endDate,
        message: form.message.trim(),
        listingId: listing.id,
        requestId: '',
      }),
    }).catch(() => {})
    setSubmitted(true)
  }

  const days = form.startDate && form.endDate && form.endDate >= form.startDate
    ? Math.max(1, Math.round((new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / 86400000) + 1)
    : null

  const inp = (field: keyof Form, extra = '') =>
    `w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-colors ${extra} ${errors[field] ? 'border-red-400 bg-red-50 focus:ring-red-200' : 'border-gray-200 bg-white focus:ring-brand-200 focus:border-brand-400'}`

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <p className="text-5xl mb-4">🔒</p>
        <h2 className="text-xl font-bold text-gray-900">Sign in to request</h2>
        <p className="text-gray-500 text-sm mt-2">You need an account to send rental requests.</p>
        <div className="flex gap-3 justify-center mt-6">
          <Link href="/login" className="px-5 py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors">Sign in</Link>
          <Link href="/register" className="px-5 py-3 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 transition-colors">Create account</Link>
        </div>
      </div>
    </div>
  )

  if (!listing) return null

  if (submitted) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Request Sent!</h2>
        <p className="text-gray-500 mt-2">Your request is pending review. You'll hear back through the app.</p>
        <div className="mt-6 bg-gray-50 rounded-xl p-4 text-left text-sm space-y-1.5 text-gray-600">
          <p><span className="font-medium text-gray-900">Equipment:</span> {listing.title}</p>
          <p><span className="font-medium text-gray-900">Dates:</span> {form.startDate} → {form.endDate}</p>
          {days && <p><span className="font-medium text-gray-900">Est. total:</span> {days} day{days !== 1 ? 's' : ''} × {formatPrice(listing.pricePerDay)} = <strong>${(days * listing.pricePerDay).toLocaleString()}</strong></p>}
        </div>
        <Link href={`/listings/${listing.id}`} className="mt-6 inline-block px-6 py-3 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 transition-colors">Back to Listing</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-xl mx-auto px-4 sm:px-6 py-4">
          <Link href={`/listings/${listing.id}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-3">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back
          </Link>
          <div className="flex items-center gap-3">
            {listing.imageUrl ? (
              <img src={listing.imageUrl} alt={listing.title} className="w-14 h-14 rounded-xl object-cover shrink-0 border border-gray-100" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-2xl shrink-0">
                {listing.category === 'trailer' ? '🚛' : listing.category === 'backhoe' ? '🚜' : listing.category === 'box_truck' ? '🚚' : '🔧'}
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
            {days && (
              <div className="bg-brand-50 border border-brand-100 rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-brand-700">{days} day{days !== 1 ? 's' : ''} × {formatPrice(listing.pricePerDay)}</span>
                <span className="font-bold text-brand-700 text-lg">${(days * listing.pricePerDay).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        {renterName && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm shrink-0">{renterName.charAt(0).toUpperCase()}</div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{renterName}</p>
              <p className="text-xs text-gray-400">{user?.email}</p>
            </div>
          </div>
        )}

        {/* ID upload — required for box trucks */}
        {listing.category === 'box_truck' && (
          <div className={`bg-white rounded-2xl shadow-sm overflow-hidden ${!idFile ? 'border-2 border-red-200' : 'border border-green-200'}`}>
            <div className={`flex items-center gap-3 px-5 py-4 border-b ${!idFile ? 'border-red-100 bg-red-50/60' : 'border-green-100 bg-green-50/60'}`}>
              <span className="w-7 h-7 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center shrink-0">2</span>
              <span className="font-semibold text-gray-900">🪪 Driver's License <span className="text-red-500 text-sm">*</span></span>
            </div>
            <div className="px-5 py-5">
              <p className="text-sm text-gray-500 mb-4">Box truck rentals require a valid driver's license. The owner will verify before approving.</p>
              <input ref={idInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleIdChange} />
              {idPreview ? (
                <div className="relative rounded-xl overflow-hidden border border-gray-200">
                  <img src={idPreview} alt="ID preview" className="w-full h-40 object-cover" />
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                    <button type="button" onClick={() => { setIdFile(null); setIdPreview('') }} className="bg-red-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">Remove</button>
                  </div>
                  <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">✓ Uploaded</div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => idInputRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-3 py-8 border-2 border-dashed border-red-200 rounded-xl hover:border-brand-400 hover:bg-brand-50 transition-all text-gray-400 hover:text-brand-600"
                >
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2" />
                  </svg>
                  <div className="text-center">
                    <p className="font-semibold text-sm">Take a photo or upload your ID</p>
                    <p className="text-xs mt-0.5">Driver's license front — JPG, PNG, or PDF</p>
                  </div>
                </button>
              )}
              {!idFile && <p className="text-red-500 text-xs mt-2">Required to rent a box truck</p>}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50/60">
            <span className="w-7 h-7 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{listing.category === 'box_truck' ? '3' : '2'}</span>
            <span className="font-semibold text-gray-900">💬 Message <span className="text-gray-400 font-normal text-sm">(optional)</span></span>
          </div>
          <div className="px-5 py-5">
            <textarea rows={3} placeholder="Introduce yourself, describe what you'll use it for…" value={form.message} onChange={(e) => set('message', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 resize-none" />
          </div>
        </div>

        <button
          type="submit"
          disabled={uploadingId}
          className="w-full py-4 bg-brand-600 text-white font-bold rounded-2xl hover:bg-brand-700 active:scale-[0.98] transition-all text-base shadow-lg shadow-brand-600/20 disabled:opacity-60"
        >
          {uploadingId ? 'Uploading ID…' : 'Send Rental Request →'}
        </button>
        <p className="text-center text-xs text-gray-400 pb-4">The owner will contact you to confirm. No payment collected here.</p>
      </form>
    </div>
  )
}
