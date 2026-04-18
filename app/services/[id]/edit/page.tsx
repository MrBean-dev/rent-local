'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import { fetchServiceListing, patchServiceListing } from '@/lib/serviceDb'
import { uploadListingImage } from '@/lib/uploadImage'
import { geocodeLocation } from '@/lib/geocode'
import { createClient } from '@/lib/supabase'

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

export default function EditServicePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user, loading } = useAuth()

  const [title, setTitle]       = useState('')
  const [category, setCategory] = useState('')
  const [description, setDesc]  = useState('')
  const [rate, setRate]         = useState('')
  const [rateType, setRateType] = useState('hourly')
  const [location, setLocation] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [newImage, setNewImage] = useState<File | null>(null)
  const [preview, setPreview]   = useState('')
  const [insured, setInsured]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [errors, setErrors]     = useState<Record<string, string>>({})
  const fileRef                 = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user) return
    fetchServiceListing(id).then((s) => {
      if (!s) { router.push('/services'); return }
      setTitle(s.title)
      setCategory(s.category)
      setDesc(s.description)
      setRate(String(s.rate))
      setRateType(s.rateType)
      setLocation(s.location)
      setInsured(s.insured)
      setImageUrl(s.imageUrl ?? '')
    })
    // Verify ownership
    ;(createClient().from('service_listings') as any)
      .select('owner_id').eq('id', id).single()
      .then(({ data }: any) => {
        if (data?.owner_id && data.owner_id !== user.id) router.push('/services')
      })
  }, [id, user, router])

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setNewImage(file)
    setPreview(URL.createObjectURL(file))
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!title.trim())       e.title       = 'Required'
    if (!category)           e.category    = 'Required'
    if (!description.trim()) e.description = 'Required'
    if (!rate || isNaN(Number(rate)) || Number(rate) <= 0) e.rate = 'Enter a valid rate'
    if (!location.trim())    e.location    = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      let finalImageUrl: string | undefined = imageUrl || undefined
      if (newImage) {
        const result = await uploadListingImage(user!.id, newImage)
        finalImageUrl = result.url
      }

      let lat: number | undefined
      let lng: number | undefined
      const geo = await geocodeLocation(location.trim())
      if (geo) { lat = geo.lat; lng = geo.lng }

      await patchServiceListing(id, {
        title: title.trim(),
        category,
        description: description.trim(),
        rate: Number(rate),
        rate_type: rateType,
        location: location.trim(),
        image_url: finalImageUrl ?? null,
        insured,
        lat: lat ?? null,
        lng: lng ?? null,
      })
      router.push(`/services/${id}`)
    } finally {
      setSaving(false)
    }
  }

  const inp = (field: string, extra = '') =>
    `w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-colors ${extra} ${
      errors[field]
        ? 'border-red-400 bg-red-50 focus:ring-red-200'
        : 'border-gray-200 bg-white focus:ring-teal-200 focus:border-teal-400'
    }`

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-teal-600 to-brand-600 text-white px-4 pt-6 pb-10">
        <div className="max-w-2xl mx-auto">
          <Link href={`/services/${id}`} className="inline-flex items-center gap-1 text-sm text-teal-200 hover:text-white mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to listing
          </Link>
          <h1 className="text-2xl font-bold">Edit Service</h1>
        </div>
      </div>

      <form onSubmit={handleSave} noValidate className="max-w-2xl mx-auto px-4 sm:px-6 -mt-4 pb-12 space-y-5">
        {/* Details */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Title <span className="text-red-500">*</span></label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inp('title')} />
              {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-2 gap-3">
                {categories.map((cat) => (
                  <button key={cat.id} type="button" onClick={() => setCategory(cat.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${category === cat.id ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-teal-300 bg-white'}`}
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
              <textarea rows={4} value={description} onChange={(e) => setDesc(e.target.value)} className={inp('description') + ' resize-none'} />
              {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
            </div>
          </div>
        </div>

        {/* Rate */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <label className="block text-sm font-medium text-gray-700 mb-3">💵 Rate <span className="text-red-500">*</span></label>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
              <input type="number" min="1" value={rate} onChange={(e) => setRate(e.target.value)} className={inp('rate') + ' pl-8'} />
            </div>
            <select value={rateType} onChange={(e) => setRateType(e.target.value)}
              className="w-40 px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-200"
            >
              <option value="hourly">Per Hour</option>
              <option value="per_job">Per Job</option>
            </select>
          </div>
          {errors.rate && <p className="text-red-500 text-xs mt-1">{errors.rate}</p>}
        </div>

        {/* Location */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">📍 Location <span className="text-red-500">*</span></label>
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className={inp('location')} />
          {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location}</p>}
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
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <label className="block text-sm font-medium text-gray-700 mb-3">📸 Photo</label>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
          {(preview || imageUrl) ? (
            <div className="relative rounded-xl overflow-hidden border border-gray-200">
              <img src={preview || imageUrl} alt="Preview" className="w-full h-48 object-cover" />
              <button type="button" onClick={() => { setNewImage(null); setPreview(''); setImageUrl('') }}
                className="absolute top-2 right-2 bg-red-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
              >
                Remove
              </button>
              <button type="button" onClick={() => fileRef.current?.click()}
                className="absolute bottom-2 right-2 bg-black/50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-black/70"
              >
                Change
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed border-gray-200 rounded-xl hover:border-teal-400 hover:bg-teal-50 transition-all text-gray-400 hover:text-teal-600"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm font-medium">Upload a photo</p>
            </button>
          )}
        </div>

        <button type="submit" disabled={saving}
          className="w-full py-4 bg-teal-600 text-white font-bold rounded-2xl hover:bg-teal-700 active:scale-[0.98] transition-all text-base disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}
