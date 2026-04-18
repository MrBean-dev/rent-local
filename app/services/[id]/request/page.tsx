'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import { fetchServiceListing, insertServiceRequest } from '@/lib/serviceDb'
import { fetchProfile } from '@/lib/db'
import { formatRate } from '@/lib/utils'
import type { ServiceListing } from '@/lib/types'

const categoryIcons: Record<string, string> = {
  backhoe_operator: '🚜',
  box_truck_driver: '🚚',
  trailer_hauler:   '🚛',
  general_labor:    '🔧',
}

interface Form { startDate: string; endDate: string; message: string }
const blank: Form = { startDate: '', endDate: '', message: '' }

export default function ServiceRequestPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user, loading } = useAuth()

  const [service, setService]       = useState<ServiceListing | null>(null)
  const [form, setForm]             = useState<Form>(blank)
  const [errors, setErrors]         = useState<Partial<Form>>({})
  const [submitted, setSubmitted]   = useState(false)
  const [hirerName, setHirerName]   = useState('')

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    fetchServiceListing(id).then((s) => {
      if (!s) { router.push('/services'); return }
      setService(s)
    })
  }, [id, router])

  useEffect(() => {
    if (!user) return
    fetchProfile(user.id).then((p) => { if (p?.name) setHirerName(p.name) })
  }, [user])

  function set(field: keyof Form, value: string) {
    setForm((p) => ({ ...p, [field]: value }))
    if (errors[field]) setErrors((p) => { const e = { ...p }; delete e[field]; return e })
  }

  function validate() {
    const e: Partial<Form> = {}
    if (!form.startDate) e.startDate = 'Required'
    if (!form.endDate)   e.endDate   = 'Required'
    if (form.startDate && form.endDate && form.endDate < form.startDate) e.endDate = 'Must be after start'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate() || !service || !user) return
    await insertServiceRequest(user.id, {
      serviceId:  service.id,
      startDate:  form.startDate,
      endDate:    form.endDate,
      message:    form.message.trim(),
    })
    // Notify provider by email (fire and forget)
    const { data: ownerData } = await (await import('@/lib/supabase')).createClient()
      .from('service_listings' as any)
      .select('owner_id, profiles(email:id)')
      .eq('id', service.id)
      .single() as any
    if (ownerData?.owner_id) {
      const { data: profile } = await (await import('@/lib/supabase')).createClient()
        .from('profiles' as any).select('email').eq('id', ownerData.owner_id).single() as any
      if (profile?.email) {
        fetch('/api/notify/service-request-received', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            providerEmail: profile.email,
            providerName: service.contactName,
            hirerName: hirerName || user.email,
            serviceTitle: service.title,
            startDate: form.startDate,
            endDate: form.endDate,
            message: form.message.trim(),
            serviceId: service.id,
          }),
        }).catch(() => {})
      }
    }
    setSubmitted(true)
  }

  const inp = (field: keyof Form, extra = '') =>
    `w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-colors ${extra} ${
      errors[field]
        ? 'border-red-400 bg-red-50 focus:ring-red-200'
        : 'border-gray-200 bg-white focus:ring-teal-200 focus:border-teal-400'
    }`

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <p className="text-5xl mb-4">🔒</p>
        <h2 className="text-xl font-bold text-gray-900">Sign in to request</h2>
        <p className="text-gray-500 text-sm mt-2">You need an account to hire someone.</p>
        <div className="flex gap-3 justify-center mt-6">
          <Link href="/login"    className="px-5 py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors">Sign in</Link>
          <Link href="/register" className="px-5 py-3 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 transition-colors">Create account</Link>
        </div>
      </div>
    </div>
  )

  if (!service) return null

  if (submitted) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Request Sent!</h2>
        <p className="text-gray-500 mt-2">The provider will review your request and get back to you.</p>
        <div className="mt-6 bg-gray-50 rounded-xl p-4 text-left text-sm space-y-1.5 text-gray-600">
          <p><span className="font-medium text-gray-900">Service:</span> {service.title}</p>
          <p><span className="font-medium text-gray-900">Dates:</span> {form.startDate} → {form.endDate}</p>
        </div>
        <Link href={`/services/${service.id}`} className="mt-6 inline-block px-6 py-3 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 transition-colors">
          Back to Service
        </Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-xl mx-auto px-4 sm:px-6 py-4">
          <Link href={`/services/${service.id}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-3">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-teal-50 flex items-center justify-center text-2xl shrink-0">
              {categoryIcons[service.category] ?? '👷'}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-gray-900 truncate">{service.title}</p>
              <p className="text-sm text-gray-500">{service.location} · <span className="text-teal-600 font-semibold">{formatRate(service.rate, service.rateType)}</span></p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={submit} noValidate className="max-w-xl mx-auto px-4 sm:px-6 py-8 space-y-5">
        {/* Dates */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50/60">
            <span className="w-7 h-7 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center shrink-0">1</span>
            <span className="font-semibold text-gray-900">📅 Dates Needed</span>
          </div>
          <div className="px-5 py-5">
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
          </div>
        </div>

        {/* Your info */}
        {hirerName && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm shrink-0">
              {hirerName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{hirerName}</p>
              <p className="text-xs text-gray-400">{user?.email}</p>
            </div>
          </div>
        )}

        {/* Message */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50/60">
            <span className="w-7 h-7 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center shrink-0">2</span>
            <span className="font-semibold text-gray-900">💬 Message <span className="text-gray-400 font-normal text-sm">(optional)</span></span>
          </div>
          <div className="px-5 py-5">
            <textarea
              rows={3}
              placeholder="Describe the job, location, what equipment is needed…"
              value={form.message}
              onChange={(e) => set('message', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-400 resize-none"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-4 bg-teal-600 text-white font-bold rounded-2xl hover:bg-teal-700 active:scale-[0.98] transition-all text-base shadow-lg shadow-teal-600/20"
        >
          Send Hire Request →
        </button>
        <p className="text-center text-xs text-gray-400 pb-4">The provider will review and confirm. No payment collected here.</p>
      </form>
    </div>
  )
}
