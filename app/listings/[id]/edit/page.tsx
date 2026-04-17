'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { fetchListing, patchListing } from '@/lib/db'
import { uploadListingImage, deleteListingImage } from '@/lib/uploadImage'
import { geocodeLocation } from '@/lib/geocode'

import { useAuth } from '@/components/AuthProvider'
import type { Category, Condition, Listing } from '@/lib/types'

interface FormData {
  title: string
  description: string
  category: Category | ''
  condition: Condition | ''
  pricePerDay: string
  location: string
  contactName: string
  contactPhone: string
  contactEmail: string
  pickupAddress: string
  imageUrl: string
  available: boolean
}

interface Errors { [key: string]: string }

const CATEGORIES: { value: Category; label: string; icon: string; desc: string; color: string; active: string }[] = [
  { value: 'trailer',   label: 'Trailer',   icon: '🚛', desc: 'Utility, dump, car hauler', color: 'border-gray-200 hover:border-blue-300 hover:bg-blue-50',     active: 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' },
  { value: 'backhoe',   label: 'Backhoe',   icon: '🚜', desc: 'Excavator, skid steer',      color: 'border-gray-200 hover:border-orange-300 hover:bg-orange-50', active: 'border-orange-500 bg-orange-50 ring-2 ring-orange-200' },
  { value: 'tool',      label: 'Tool',      icon: '🔧', desc: 'Power tools, generators',    color: 'border-gray-200 hover:border-green-300 hover:bg-green-50',   active: 'border-green-500 bg-green-50 ring-2 ring-green-200' },
  { value: 'box_truck', label: 'Box Truck', icon: '🚚', desc: '10ft, 16ft, 26ft trucks',    color: 'border-gray-200 hover:border-purple-300 hover:bg-purple-50', active: 'border-purple-500 bg-purple-50 ring-2 ring-purple-200' },
]

const CONDITIONS: { value: Condition; label: string; desc: string; dot: string; active: string }[] = [
  { value: 'excellent', label: 'Excellent', desc: 'Like new',         dot: 'bg-green-500',  active: 'border-green-500 bg-green-50 ring-2 ring-green-200' },
  { value: 'good',      label: 'Good',      desc: 'Normal wear',      dot: 'bg-yellow-400', active: 'border-yellow-400 bg-yellow-50 ring-2 ring-yellow-200' },
  { value: 'fair',      label: 'Fair',      desc: 'Functional, worn', dot: 'bg-orange-400', active: 'border-orange-400 bg-orange-50 ring-2 ring-orange-200' },
]

function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50/60">
        <span className="text-base font-semibold text-gray-900">{icon} {title}</span>
      </div>
      <div className="px-5 py-5 space-y-4">{children}</div>
    </div>
  )
}

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [original, setOriginal] = useState<Listing | null>(null)
  const [form, setForm] = useState<FormData | null>(null)
  const [imageFile, setImageFile]   = useState<File | null>(null)
  const [errors, setErrors]         = useState<Errors>({})
  const [saved, setSaved]           = useState(false)
  const [photoLoading, setPhotoLoading] = useState(false)
  const [uploadStage, setUploadStage] = useState('')
  const [uploadPct, setUploadPct]   = useState(0)
  const [redactedCount, setRedactedCount] = useState(0)

  useEffect(() => {
    fetchListing(id).then((listing) => {
    if (!listing) return
    setOriginal(listing)
    setForm({
      title:        listing.title,
      description:  listing.description,
      category:     listing.category,
      condition:    listing.condition,
      pricePerDay:  String(listing.pricePerDay),
      location:     listing.location,
      contactName:  listing.contactName,
      contactPhone: listing.contactPhone,
      contactEmail: listing.contactEmail,
      pickupAddress: listing.pickupAddress ?? '',
      imageUrl:     listing.imageUrl ?? '',
      available:    listing.available,
    })
    })
  }, [id])

  function set(field: keyof FormData, value: string | boolean) {
    setForm((prev) => prev ? { ...prev, [field]: value } : prev)
    if (errors[field as string]) setErrors((prev) => { const e = { ...prev }; delete e[field as string]; return e })
  }

  function validate(): boolean {
    if (!form) return false
    const e: Errors = {}
    if (!form.title.trim()) e.title = 'Required'
    if (!form.description.trim()) e.description = 'Required'
    if (!form.category) e.category = 'Pick a category'
    if (!form.condition) e.condition = 'Pick a condition'
    if (!form.pricePerDay || isNaN(Number(form.pricePerDay)) || Number(form.pricePerDay) <= 0) e.pricePerDay = 'Enter a valid price'
    if (!form.location.trim()) e.location = 'Required'
    if (!form.contactName.trim()) e.contactName = 'Required'
    if (!form.contactPhone.trim() && !form.contactEmail.trim()) e.contactPhone = 'Provide phone or email'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoLoading(true)
    setImageFile(file)
    set('imageUrl', URL.createObjectURL(file))
    setPhotoLoading(false)
    e.target.value = ''
  }

  async function handleSubmit() {
    if (!form || !original || !validate() || !user) return
    setPhotoLoading(true)
    let image_url = form.imageUrl.trim() || null

    if (imageFile) {
      // Delete old image if it was a hosted URL
      if (original.imageUrl?.includes('supabase')) {
        await deleteListingImage(original.imageUrl).catch(() => {})
      }
      try {
        const result = await uploadListingImage(user.id, imageFile, (stage, pct) => {
          setUploadStage(stage)
          setUploadPct(pct ?? 0)
        })
        image_url = result.url
        setRedactedCount(result.redacted)
      } catch {}
    } else if (!form.imageUrl) {
      // User removed the image
      if (original.imageUrl?.includes('supabase')) {
        await deleteListingImage(original.imageUrl).catch(() => {})
      }
      image_url = null
    }

    setPhotoLoading(false)
    setUploadStage('')
    const coords = form.location.trim() !== original.location
      ? await geocodeLocation(form.location.trim())
      : { lat: original.lat, lng: original.lng }
    await patchListing(id, {
      title:         form.title.trim(),
      description:   form.description.trim(),
      category:      form.category as Category,
      condition:     form.condition as Condition,
      price_per_day:    Number(form.pricePerDay),
      location:         form.location.trim(),
      pickup_address:   form.pickupAddress.trim() || null,
      image_url,
      available:        form.available,
      lat:              coords?.lat ?? null,
      lng:              coords?.lng ?? null,
    })
    setSaved(true)
    setTimeout(() => router.push(`/listings/${id}`), 1500)
  }

  if (!form || !original) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3">
        <p className="text-4xl">🤔</p>
        <p className="font-semibold text-gray-700">Listing not found</p>
        <Link href="/profile/listings" className="text-sm text-brand-600 hover:underline">← My Listings</Link>
      </div>
    )
  }

  if (saved) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Changes Saved!</h2>
          <p className="text-gray-500 mt-2 text-sm">Redirecting back to listing…</p>
        </div>
      </div>
    )
  }

  const inp = (field: keyof FormData, extra = '') =>
    `w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-colors ${extra} ${
      errors[field as string]
        ? 'border-red-400 bg-red-50 focus:ring-red-200'
        : 'border-gray-200 bg-white focus:ring-brand-200 focus:border-brand-400'
    }`

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-brand-600 to-orange-600 text-white px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Link href={`/listings/${id}`} className="inline-flex items-center gap-1 text-sm text-orange-200 hover:text-white mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to listing
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold">Edit Listing</h1>
          <p className="mt-1 text-orange-100 text-sm">Update your equipment details.</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-5">

        {/* Availability toggle */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-gray-900 text-sm">Availability</p>
            <p className="text-xs text-gray-500 mt-0.5">Toggle off to hide from renters without deleting.</p>
          </div>
          <button
            type="button"
            onClick={() => set('available', !form.available)}
            className={`relative inline-flex h-7 w-13 items-center rounded-full transition-colors focus:outline-none ${
              form.available ? 'bg-brand-600' : 'bg-gray-300'
            }`}
            style={{ width: '3.25rem' }}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                form.available ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`text-sm font-semibold ${form.available ? 'text-green-600' : 'text-gray-400'}`}>
            {form.available ? 'Available' : 'Unavailable'}
          </span>
        </div>

        {/* Equipment details */}
        <SectionCard title="Equipment Details" icon="🔩">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              className={inp('title')}
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => set('category', c.value)}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all text-center ${
                    form.category === c.value ? c.active : c.color
                  }`}
                >
                  <span className="text-2xl">{c.icon}</span>
                  <span className="text-xs font-semibold text-gray-800">{c.label}</span>
                  <span className="text-xs text-gray-400 leading-tight hidden sm:block">{c.desc}</span>
                </button>
              ))}
            </div>
            {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Condition <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CONDITIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => set('condition', c.value)}
                  className={`flex items-center gap-2 py-3 px-3 rounded-xl border-2 transition-all ${
                    form.condition === c.value ? c.active : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${c.dot}`} />
                  <div className="text-left min-w-0">
                    <p className="text-xs font-semibold text-gray-800">{c.label}</p>
                    <p className="text-xs text-gray-400 hidden sm:block">{c.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            {errors.condition && <p className="text-red-500 text-xs mt-1">{errors.condition}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              className={`${inp('description')} resize-none`}
            />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
          </div>
        </SectionCard>

        {/* Pricing & Location */}
        <SectionCard title="Pricing & Location" icon="📍">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Price / Day <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">$</span>
                <input
                  type="number"
                  min="1"
                  value={form.pricePerDay}
                  onChange={(e) => set('pricePerDay', e.target.value)}
                  className={`${inp('pricePerDay', 'pl-8')}`}
                />
              </div>
              {errors.pricePerDay && <p className="text-red-500 text-xs mt-1">{errors.pricePerDay}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Location <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="City, ST"
                  value={form.location}
                  onChange={(e) => set('location', e.target.value)}
                  className={`${inp('location', 'pl-9')}`}
                />
              </div>
              {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Pickup / Drop-off Address
              <span className="ml-1.5 text-xs font-normal text-gray-400">(only shown after request is approved)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. 123 Main St, Bozeman MT — or meet at hardware store on 5th"
              value={form.pickupAddress}
              onChange={(e) => set('pickupAddress', e.target.value)}
              className={inp('pickupAddress')}
            />
          </div>

          {/* Photo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photo <span className="text-gray-400 font-normal text-xs">(optional)</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoChange}
            />
            {form.imageUrl ? (
              <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-100">
                <img src={form.imageUrl} alt="Equipment photo" className="w-full h-48 object-cover" />
                <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-gray-800 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-gray-100"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => { set('imageUrl', ''); setImageFile(null) }}
                    className="bg-red-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-red-600"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={photoLoading}
                className="w-full flex flex-col items-center justify-center gap-3 py-10 border-2 border-dashed border-gray-200 rounded-2xl hover:border-brand-400 hover:bg-brand-50 transition-all text-gray-400 hover:text-brand-600 disabled:opacity-50"
              >
                {photoLoading ? (
                  <svg className="w-8 h-8 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ) : (
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
                <div className="text-center">
                  <p className="font-semibold text-sm">{photoLoading ? 'Processing…' : 'Take or Upload a Photo'}</p>
                  <p className="text-xs mt-0.5">Opens camera on mobile · or choose from files</p>
                </div>
              </button>
            )}
          </div>
        </SectionCard>

        {/* Contact */}
        <SectionCard title="Contact Info" icon="👤">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Your Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.contactName}
              onChange={(e) => set('contactName', e.target.value)}
              className={inp('contactName')}
            />
            {errors.contactName && <p className="text-red-500 text-xs mt-1">{errors.contactName}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
              <input
                type="tel"
                value={form.contactPhone}
                onChange={(e) => set('contactPhone', e.target.value)}
                className={inp('contactPhone')}
              />
              {errors.contactPhone && <p className="text-red-500 text-xs mt-1">{errors.contactPhone}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={form.contactEmail}
                onChange={(e) => set('contactEmail', e.target.value)}
                className={inp('contactEmail')}
              />
            </div>
          </div>
        </SectionCard>

        {/* Upload progress */}
        {photoLoading && uploadStage && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
              <svg className="w-4 h-4 animate-spin shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {uploadStage}
            </div>
            {uploadPct > 0 && uploadPct < 100 && (
              <div className="w-full bg-blue-100 rounded-full h-1.5">
                <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${uploadPct}%` }} />
              </div>
            )}
          </div>
        )}

        {redactedCount > 0 && !photoLoading && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 flex items-start gap-3 text-sm text-amber-700">
            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>We detected and blurred <strong>{redactedCount} phone number{redactedCount !== 1 ? 's' : ''}</strong> in your photo.</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={photoLoading}
          className="w-full py-4 bg-brand-600 text-white font-bold rounded-2xl hover:bg-brand-700 active:scale-[0.98] transition-all text-base shadow-lg shadow-brand-600/20 disabled:opacity-60"
        >
          {photoLoading ? 'Processing image…' : 'Save Changes →'}
        </button>

        {Object.keys(errors).length > 0 && (
          <p className="text-center text-sm text-red-500">Please fix the errors above before saving.</p>
        )}

        <p className="text-center text-xs text-gray-400 pb-4">Changes are saved to your account.</p>
      </div>
    </div>
  )
}
