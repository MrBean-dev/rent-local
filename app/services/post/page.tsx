'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import { insertServiceListing } from '@/lib/serviceDb'
import { uploadListingImage } from '@/lib/uploadImage'
import { geocodeLocation } from '@/lib/geocode'

const categories = [
  { id: 'backhoe_operator', label: 'Backhoe Operator',      icon: '🚜', desc: 'Excavation, grading, trenching' },
  { id: 'box_truck_driver', label: 'Box Truck Driver',       icon: '🚚', desc: 'Moving, hauling, deliveries' },
  { id: 'trailer_hauler',   label: 'Trailer Hauler',         icon: '🚛', desc: 'Towing trailers & equipment' },
  { id: 'general_labor',    label: 'General Labor',          icon: '🔧', desc: 'Tools, setup, and more' },
  { id: 'landscaping',      label: 'Landscaping',            icon: '🌿', desc: 'Mowing, mulching, cleanup' },
  { id: 'tree_service',     label: 'Tree Service',           icon: '🌳', desc: 'Trimming, removal, stump grinding' },
  { id: 'snow_removal',     label: 'Snow Removal',           icon: '❄️', desc: 'Plowing, shoveling, salting' },
  { id: 'pressure_washing', label: 'Pressure Washing',       icon: '💧', desc: 'Driveways, decks, siding' },
  { id: 'painting',         label: 'Painting',               icon: '🎨', desc: 'Interior & exterior painting' },
  { id: 'moving',           label: 'Moving Help',            icon: '📦', desc: 'Loading, unloading, furniture' },
  { id: 'hauling',          label: 'Hauling & Junk Removal', icon: '🗑️', desc: 'Debris, appliances, cleanouts' },
  { id: 'concrete',         label: 'Concrete & Masonry',     icon: '🧱', desc: 'Pouring, patching, brickwork' },
]

interface Form {
  title: string
  category: string
  description: string
  rate: string
  rateType: string
  location: string
  yearsExperience: string
  serviceRadius: string
}

const blank: Form = { title: '', category: '', description: '', rate: '', rateType: 'hourly', location: '', yearsExperience: '', serviceRadius: '25' }

export default function PostServicePage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  const [form, setForm]         = useState<Form>(blank)
  const [errors, setErrors]     = useState<Partial<Form>>({})
  const [insured, setInsured]   = useState(false)
  const [imageFile, setImage]   = useState<File | null>(null)
  const [preview, setPreview]   = useState('')
  const [submitting, setSub]    = useState(false)
  const fileRef                 = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  function set(field: keyof Form, value: string) {
    setForm((p) => ({ ...p, [field]: value }))
    if (errors[field]) setErrors((p) => { const e = { ...p }; delete e[field]; return e })
  }

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImage(file)
    setPreview(URL.createObjectURL(file))
  }

  function validate() {
    const e: Partial<Form> = {}
    if (!form.title.trim())       e.title       = 'Required'
    if (!form.category)           e.category    = 'Required'
    if (!form.description.trim()) e.description = 'Required'
    if (!form.rate || isNaN(Number(form.rate)) || Number(form.rate) <= 0) e.rate = 'Enter a valid rate'
    if (!form.location.trim())    e.location    = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate() || !user) return
    setSub(true)
    try {
      let imageUrl: string | undefined
      if (imageFile) {
        const result = await uploadListingImage(user.id, imageFile)
        imageUrl = result.url
      }

      let lat: number | undefined
      let lng: number | undefined
      const geo = await geocodeLocation(form.location.trim())
      if (geo) { lat = geo.lat; lng = geo.lng }

      const id = await insertServiceListing(user.id, {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        rate: Number(form.rate),
        rateType: form.rateType,
        location: form.location.trim(),
        imageUrl,
        available: true,
        insured,
        yearsExperience: form.yearsExperience ? Number(form.yearsExperience) : undefined,
        serviceRadius: Number(form.serviceRadius) || 25,
        lat,
        lng,
      })
      if (id) router.push(`/services/${id}`)
    } finally {
      setSub(false)
    }
  }

  const inp = (field: keyof Form, extra = '') =>
    `w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-colors ${extra} ${
      errors[field]
        ? 'border-red-400 bg-red-50 focus:ring-red-200'
        : 'border-gray-200 bg-white focus:ring-teal-200 focus:border-teal-400'
    }`

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>
  if (!user)   return null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-teal-600 to-brand-600 text-white px-4 pt-6 pb-10">
        <div className="max-w-2xl mx-auto">
          <Link href="/services" className="inline-flex items-center gap-1 text-sm text-teal-200 hover:text-white mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Browse services
          </Link>
          <h1 className="text-2xl font-bold">Offer a Service</h1>
          <p className="text-teal-100 text-sm mt-1">Let people in your area hire you.</p>
        </div>
      </div>

      <form onSubmit={submit} noValidate className="max-w-2xl mx-auto px-4 sm:px-6 -mt-4 pb-12 space-y-5">

        {/* Details */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50/60">
            <span className="w-7 h-7 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center shrink-0">1</span>
            <span className="font-semibold text-gray-900">Service Details</span>
          </div>
          <div className="px-5 py-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Title <span className="text-red-500">*</span></label>
              <input type="text" placeholder="e.g. Experienced Backhoe Operator" value={form.title} onChange={(e) => set('title', e.target.value)} className={inp('title')} />
              {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-2 gap-3">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => set('category', cat.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                      form.category === cat.id
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-gray-200 hover:border-teal-300 bg-white'
                    }`}
                  >
                    <span className="text-2xl">{cat.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{cat.label}</p>
                      <p className="text-xs text-gray-500">{cat.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
              {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description <span className="text-red-500">*</span></label>
              <textarea
                rows={4}
                placeholder="Describe your experience, certifications, equipment you can operate, availability…"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                className={inp('description') + ' resize-none'}
              />
              {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
            </div>
          </div>
        </div>

        {/* Rate */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50/60">
            <span className="w-7 h-7 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center shrink-0">2</span>
            <span className="font-semibold text-gray-900">💵 Rate</span>
          </div>
          <div className="px-5 py-5">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                  <input
                    type="number"
                    min="1"
                    placeholder="0"
                    value={form.rate}
                    onChange={(e) => set('rate', e.target.value)}
                    className={inp('rate') + ' pl-8'}
                  />
                </div>
                {errors.rate && <p className="text-red-500 text-xs mt-1">{errors.rate}</p>}
              </div>
              <div className="w-40">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Per</label>
                <select
                  value={form.rateType}
                  onChange={(e) => set('rateType', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-400"
                >
                  <option value="hourly">Hour</option>
                  <option value="per_job">Job</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50/60">
            <span className="w-7 h-7 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center shrink-0">4</span>
            <span className="font-semibold text-gray-900">📍 Location</span>
          </div>
          <div className="px-5 py-5">
            <input
              type="text"
              placeholder="City, State or ZIP"
              value={form.location}
              onChange={(e) => set('location', e.target.value)}
              className={inp('location')}
            />
            {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location}</p>}
          </div>
        </div>

        {/* Experience & Radius */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50/60">
            <span className="w-7 h-7 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center shrink-0">3</span>
            <span className="font-semibold text-gray-900">Experience & Coverage</span>
          </div>
          <div className="px-5 py-5 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Years of Experience</label>
              <input type="number" min="0" placeholder="e.g. 5" value={form.yearsExperience} onChange={(e) => set('yearsExperience', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Service Radius</label>
              <select value={form.serviceRadius} onChange={(e) => set('serviceRadius', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-400">
                <option value="10">10 miles</option>
                <option value="25">25 miles</option>
                <option value="50">50 miles</option>
                <option value="100">100 miles</option>
                <option value="999">Any distance</option>
              </select>
            </div>
          </div>
        </div>

        {/* Insured */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <button
            type="button"
            onClick={() => setInsured((v) => !v)}
            className="w-full flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🛡️</span>
              <div className="text-left">
                <p className="font-semibold text-gray-900">Insured</p>
                <p className="text-xs text-gray-500">Let hirers know you carry liability insurance</p>
              </div>
            </div>
            <div className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${insured ? 'bg-teal-500' : 'bg-gray-200'}`}>
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${insured ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </div>
          </button>
        </div>

        {/* Photo */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50/60">
            <span className="w-7 h-7 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center shrink-0">5</span>
            <span className="font-semibold text-gray-900">📸 Photo <span className="text-gray-400 font-normal text-sm">(optional)</span></span>
          </div>
          <div className="px-5 py-5">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
            {preview ? (
              <div className="relative rounded-xl overflow-hidden border border-gray-200">
                <img src={preview} alt="Preview" className="w-full h-52 object-cover" />
                <button
                  type="button"
                  onClick={() => { setImage(null); setPreview('') }}
                  className="absolute top-2 right-2 bg-red-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full flex flex-col items-center justify-center gap-3 py-8 border-2 border-dashed border-gray-200 rounded-xl hover:border-teal-400 hover:bg-teal-50 transition-all text-gray-400 hover:text-teal-600"
              >
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div className="text-center">
                  <p className="font-semibold text-sm">Upload a photo</p>
                  <p className="text-xs mt-0.5">Show your work or your equipment</p>
                </div>
              </button>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 bg-teal-600 text-white font-bold rounded-2xl hover:bg-teal-700 active:scale-[0.98] transition-all text-base shadow-lg shadow-teal-600/20 disabled:opacity-60"
        >
          {submitting ? 'Posting…' : 'Post My Service →'}
        </button>
      </form>
    </div>
  )
}
