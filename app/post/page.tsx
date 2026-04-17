'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { insertListing } from '@/lib/db'
import { useAuth } from '@/components/AuthProvider'
import { uploadListingImage } from '@/lib/uploadImage'
import { geocodeLocation } from '@/lib/geocode'
import { formatPrice } from '@/lib/utils'
import type { Category, Condition } from '@/lib/types'

interface FormData {
  title: string; description: string; category: Category | ''; condition: Condition | ''
  pricePerDay: string; location: string; pickupAddress: string; imageUrl: string
}
interface Errors { [key: string]: string }

const initialForm: FormData = { title: '', description: '', category: '', condition: '', pricePerDay: '', location: '', pickupAddress: '', imageUrl: '' }


const CATEGORIES: { value: Category; label: string; icon: string; desc: string; color: string; active: string }[] = [
  { value: 'trailer', label: 'Trailer', icon: '🚛', desc: 'Utility, dump, car hauler', color: 'border-gray-200 hover:border-blue-300 hover:bg-blue-50',   active: 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' },
  { value: 'backhoe', label: 'Backhoe', icon: '🚜', desc: 'Excavator, skid steer',    color: 'border-gray-200 hover:border-orange-300 hover:bg-orange-50', active: 'border-orange-500 bg-orange-50 ring-2 ring-orange-200' },
  { value: 'tool',    label: 'Tool',    icon: '🔧', desc: 'Power tools, generators',  color: 'border-gray-200 hover:border-green-300 hover:bg-green-50',  active: 'border-green-500 bg-green-50 ring-2 ring-green-200' },
]
const CONDITIONS: { value: Condition; label: string; desc: string; dot: string; active: string }[] = [
  { value: 'excellent', label: 'Excellent', desc: 'Like new',         dot: 'bg-green-500',  active: 'border-green-500 bg-green-50 ring-2 ring-green-200' },
  { value: 'good',      label: 'Good',      desc: 'Normal wear',      dot: 'bg-yellow-400', active: 'border-yellow-400 bg-yellow-50 ring-2 ring-yellow-200' },
  { value: 'fair',      label: 'Fair',      desc: 'Functional, worn', dot: 'bg-orange-400', active: 'border-orange-400 bg-orange-50 ring-2 ring-orange-200' },
]

function SectionCard({ step, title, icon, children }: { step: number; title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50/60">
        <span className="w-7 h-7 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{step}</span>
        <span className="text-base font-semibold text-gray-900">{icon} {title}</span>
      </div>
      <div className="px-5 py-5 space-y-4">{children}</div>
    </div>
  )
}

export default function PostPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm]             = useState<FormData>(initialForm)
  const [imageFile, setImageFile]   = useState<File | null>(null)
  const [errors, setErrors]         = useState<Errors>({})
  const [submitted, setSubmitted]   = useState(false)
  const [photoLoading, setPhotoLoading] = useState(false)
  const [uploadStage, setUploadStage] = useState('')
  const [uploadPct, setUploadPct]   = useState(0)
  const [redactedCount, setRedactedCount] = useState(0)
  const [profile, setProfile]       = useState<{ name: string; phone: string; location: string } | null>(null)

  useEffect(() => {
    if (!user) return
    import('@/lib/db').then(({ fetchProfile }) => {
      fetchProfile(user.id).then((p) => {
        if (p) {
          setProfile(p)
          setForm((prev) => ({
            ...prev,
            location: prev.location || p.location || '',
          }))
        }
      })
    })
  }, [user])

  function set(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => { const e = { ...prev }; delete e[field]; return e })
  }

  function validate(): boolean {
    const e: Errors = {}
    if (!form.title.trim()) e.title = 'Required'
    if (!form.description.trim()) e.description = 'Required'
    if (!form.category) e.category = 'Pick a category'
    if (!form.condition) e.condition = 'Pick a condition'
    if (!form.pricePerDay || isNaN(Number(form.pricePerDay)) || Number(form.pricePerDay) <= 0) e.pricePerDay = 'Enter a valid price'
    if (!form.location.trim()) e.location = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoLoading(true)
    setImageFile(file)
    // Show a local preview while we wait for upload on submit
    const preview = URL.createObjectURL(file)
    set('imageUrl', preview)
    setPhotoLoading(false)
    e.target.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate() || !user) return
    setPhotoLoading(true)
    let imageUrl: string | undefined
    if (imageFile) {
      try {
        const result = await uploadListingImage(user.id, imageFile, (stage, pct) => {
          setUploadStage(stage)
          setUploadPct(pct ?? 0)
        })
        imageUrl = result.url
        setRedactedCount(result.redacted)
      } catch {}
    }
    setPhotoLoading(false)
    setUploadStage('')
    const coords = await geocodeLocation(form.location.trim())
    await insertListing(user.id, {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category as Category,
      condition: form.condition as Condition,
      pricePerDay: Number(form.pricePerDay),
      location: form.location.trim(),
      pickupAddress: form.pickupAddress.trim() || undefined,
      imageUrl,
      available: true,
      lat: coords?.lat,
      lng: coords?.lng,
    })
    setSubmitted(true)
    setTimeout(() => router.push('/listings'), 2000)
  }

  const inp = (field: keyof FormData, extra = '') =>
    `w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-colors ${extra} ${errors[field] ? 'border-red-400 bg-red-50 focus:ring-red-200' : 'border-gray-200 bg-white focus:ring-brand-200 focus:border-brand-400'}`

  const catObj  = CATEGORIES.find(c => c.value === form.category)
  const condObj = CONDITIONS.find(c => c.value === form.condition)

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <p className="text-5xl mb-4">🔒</p>
        <h2 className="text-xl font-bold text-gray-900">Sign in to post</h2>
        <p className="text-gray-500 text-sm mt-2">You need an account to list equipment.</p>
        <div className="flex gap-3 justify-center mt-6">
          <Link href="/login" className="px-5 py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors">Sign in</Link>
          <Link href="/register" className="px-5 py-3 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 transition-colors">Create account</Link>
        </div>
      </div>
    </div>
  )

  if (submitted) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Listing Posted!</h2>
        <p className="text-gray-500 mt-2">Your equipment is now live.</p>
        <p className="text-sm text-gray-400 mt-1">Redirecting to browse page…</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-brand-600 to-orange-600 text-white px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold">List Your Equipment</h1>
          <p className="mt-1 text-orange-100 text-sm">Reach local renters — free to post, no fees.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-5">
        <SectionCard step={1} title="Equipment Details" icon="🔩">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Title <span className="text-red-500">*</span></label>
            <input type="text" placeholder="e.g. 20ft Utility Trailer" value={form.title} onChange={(e) => set('title', e.target.value)} className={inp('title')} />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((c) => (
                <button key={c.value} type="button" onClick={() => set('category', c.value)} className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all text-center ${form.category === c.value ? c.active : c.color}`}>
                  <span className="text-2xl">{c.icon}</span>
                  <span className="text-xs font-semibold text-gray-800">{c.label}</span>
                  <span className="text-xs text-gray-400 leading-tight hidden sm:block">{c.desc}</span>
                </button>
              ))}
            </div>
            {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Condition <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-3 gap-2">
              {CONDITIONS.map((c) => (
                <button key={c.value} type="button" onClick={() => set('condition', c.value)} className={`flex items-center gap-2 py-3 px-3 rounded-xl border-2 transition-all ${form.condition === c.value ? c.active : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
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
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description <span className="text-red-500">*</span></label>
            <textarea rows={4} placeholder="Describe the equipment, attachments, requirements…" value={form.description} onChange={(e) => set('description', e.target.value)} className={`${inp('description')} resize-none`} />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
          </div>
        </SectionCard>

        <SectionCard step={2} title="Pricing & Location" icon="📍">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Price / Day <span className="text-red-500">*</span></label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">$</span>
                <input type="number" placeholder="75" min="1" value={form.pricePerDay} onChange={(e) => set('pricePerDay', e.target.value)} className={`${inp('pricePerDay', 'pl-8')}`} />
              </div>
              {errors.pricePerDay && <p className="text-red-500 text-xs mt-1">{errors.pricePerDay}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Location <span className="text-red-500">*</span></label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <input type="text" placeholder="City, ST" value={form.location} onChange={(e) => set('location', e.target.value)} className={`${inp('location', 'pl-9')}`} />
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Photo <span className="text-gray-400 font-normal text-xs">(optional)</span></label>
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange} />
            {form.imageUrl ? (
              <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-100">
                <img src={form.imageUrl} alt="preview" className="w-full h-48 object-cover" />
                <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 hover:opacity-100">
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="bg-white text-gray-800 text-xs font-semibold px-3 py-1.5 rounded-lg">Replace</button>
                  <button type="button" onClick={() => { set('imageUrl', ''); setImageFile(null) }} className="bg-red-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">Remove</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={photoLoading} className="w-full flex flex-col items-center justify-center gap-3 py-10 border-2 border-dashed border-gray-200 rounded-2xl hover:border-brand-400 hover:bg-brand-50 transition-all text-gray-400 hover:text-brand-600 disabled:opacity-50">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div className="text-center">
                  <p className="font-semibold text-sm">{photoLoading ? 'Processing…' : 'Take or Upload a Photo'}</p>
                  <p className="text-xs mt-0.5">Opens camera on mobile · or choose from files</p>
                </div>
              </button>
            )}
          </div>
        </SectionCard>

        {/* Preview */}
        {(form.title || form.category || form.pricePerDay) && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50/60">
              <span className="text-sm font-semibold text-gray-600">👁 Listing Preview</span>
            </div>
            <div className="p-5">
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                {form.imageUrl && <div className="h-36 bg-gray-100 overflow-hidden"><img src={form.imageUrl} alt="preview" className="w-full h-full object-cover" /></div>}
                <div className="p-4">
                  {catObj && <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${form.category === 'trailer' ? 'bg-blue-100 text-blue-700' : form.category === 'backhoe' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>{catObj.icon} {catObj.label}</span>}
                  <p className="font-semibold text-gray-900 mt-2 text-base">{form.title || <span className="text-gray-400 font-normal italic">Your listing title</span>}</p>
                  {form.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{form.description}</p>}
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-brand-600 font-bold">{form.pricePerDay ? formatPrice(Number(form.pricePerDay)) : <span className="text-gray-400 font-normal text-sm">$—/day</span>}</span>
                    {condObj && <div className="flex items-center gap-1.5 text-xs text-gray-500"><span className={`w-2 h-2 rounded-full ${condObj.dot}`} />{condObj.label}</div>}
                  </div>
                  {form.location && <p className="text-xs text-gray-400 mt-1.5">📍 {form.location}</p>}
                </div>
              </div>
            </div>
          </div>
        )}

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

        {/* Redaction notice */}
        {redactedCount > 0 && !photoLoading && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 flex items-start gap-3 text-sm text-amber-700">
            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>We detected and blurred <strong>{redactedCount} phone number{redactedCount !== 1 ? 's' : ''}</strong> in your photo to protect your privacy.</p>
          </div>
        )}

        <button
          type="submit"
          disabled={photoLoading}
          className="w-full py-4 bg-brand-600 text-white font-bold rounded-2xl hover:bg-brand-700 active:scale-[0.98] transition-all text-base shadow-lg shadow-brand-600/20 disabled:opacity-60"
        >
          {photoLoading ? 'Processing image…' : 'Post Listing →'}
        </button>
        {Object.keys(errors).length > 0 && <p className="text-center text-sm text-red-500">Please fix the errors above before posting.</p>}
        <p className="text-center text-xs text-gray-400 pb-4">Free to list · No account required</p>
      </form>
    </div>
  )
}
