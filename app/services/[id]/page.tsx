'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import { fetchServiceListing, removeServiceListing, patchServiceListing } from '@/lib/serviceDb'
import { formatRate, formatDate } from '@/lib/utils'
import type { ServiceListing } from '@/lib/types'
import { createClient } from '@/lib/supabase'
import ServiceReviewSection from '@/components/ServiceReviewSection'
import ReportButton from '@/components/ReportButton'

const categoryLabels: Record<string, string> = {
  backhoe_operator: 'Backhoe Operator',
  box_truck_driver: 'Box Truck Driver',
  trailer_hauler:   'Trailer Hauler',
  general_labor:    'General Labor',
}

const categoryColors: Record<string, string> = {
  backhoe_operator: 'bg-orange-100 text-orange-700',
  box_truck_driver: 'bg-purple-100 text-purple-700',
  trailer_hauler:   'bg-blue-100 text-blue-700',
  general_labor:    'bg-green-100 text-green-700',
}

const categoryIcons: Record<string, string> = {
  backhoe_operator: '🚜',
  box_truck_driver: '🚚',
  trailer_hauler:   '🚛',
  general_labor:    '🔧',
}

export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()

  const [service, setService]   = useState<ServiceListing | null>(null)
  const [ownerId, setOwnerId]   = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    fetchServiceListing(id).then((s) => {
      if (!s) { router.push('/services'); return }
      setService(s)
    })
    // Fetch owner_id separately
    ;(createClient().from('service_listings') as any)
      .select('owner_id')
      .eq('id', id)
      .single()
      .then(({ data }: any) => setOwnerId(data?.owner_id ?? null))
  }, [id, router])

  async function handleDelete() {
    if (!confirm('Delete this service listing?')) return
    setDeleting(true)
    await removeServiceListing(id)
    router.push('/profile/services')
  }

  async function handleToggle() {
    if (!service) return
    setToggling(true)
    await patchServiceListing(id, { available: !service.available })
    setService((s) => s ? { ...s, available: !s.available } : s)
    setToggling(false)
  }

  if (!service) return null

  const isOwner = user?.id === ownerId

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="relative h-72 bg-teal-50 overflow-hidden">
        {service.imageUrl ? (
          <img src={service.imageUrl} alt={service.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-8xl">
            {categoryIcons[service.category] ?? '👷'}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <div className="max-w-3xl mx-auto flex items-end justify-between gap-4">
            <div>
              <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-2 ${categoryColors[service.category]}`}>
                {categoryLabels[service.category]}
              </span>
              <h1 className="text-2xl font-bold text-white">{service.title}</h1>
            </div>
            <div className="text-right shrink-0">
              <p className="text-3xl font-bold text-white">{formatRate(service.rate, service.rateType)}</p>
            </div>
          </div>
        </div>
        <Link
          href="/services"
          className="absolute top-4 left-4 bg-black/30 hover:bg-black/50 text-white p-2 rounded-xl transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-5">
        {/* Provider card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-xl shrink-0">
            {service.contactName.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900">{service.contactName || 'Provider'}</p>
            <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {service.location}
            </div>
          </div>
          <div className="shrink-0 text-right space-y-1">
            {service.insured ? (
              <span className="inline-block text-xs font-semibold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">🛡️ Insured</span>
            ) : (
              <span className="inline-block text-xs font-semibold bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">Not Insured</span>
            )}
            {service.yearsExperience && (
              <p className="text-xs text-gray-500">{service.yearsExperience} yr{service.yearsExperience !== 1 ? 's' : ''} experience</p>
            )}
            {service.serviceRadius && (
              <p className="text-xs text-gray-400">📍 {service.serviceRadius === 999 ? 'Any distance' : `Up to ${service.serviceRadius} mi`}</p>
            )}
          </div>
        </div>

        {/* Availability */}
        {!service.available && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
            <span className="text-2xl">🚫</span>
            <p className="text-sm font-medium text-red-700">This provider is currently not available for hire.</p>
          </div>
        )}

        {/* Description */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-900 mb-3">About</h2>
          <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">{service.description}</p>
        </div>

        {/* CTA */}
        {!isOwner && (
          service.available ? (
            user ? (
              <Link
                href={`/services/${id}/request`}
                className="block w-full py-4 bg-teal-600 text-white font-bold rounded-2xl hover:bg-teal-700 active:scale-[0.98] transition-all text-base shadow-lg shadow-teal-600/20 text-center"
              >
                Request to Hire →
              </Link>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
                <p className="text-gray-600 text-sm mb-4">Sign in to request this service.</p>
                <div className="flex gap-3 justify-center">
                  <Link href="/login"    className="px-5 py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors">Sign in</Link>
                  <Link href="/register" className="px-5 py-3 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 transition-colors">Create account</Link>
                </div>
              </div>
            )
          ) : null
        )}

        {/* Reviews */}
        <ServiceReviewSection serviceId={id} />

        {/* Report */}
        {!isOwner && (
          <div className="flex justify-center pb-2">
            <ReportButton targetType="service" targetId={id} />
          </div>
        )}

        {/* Owner controls */}
        {isOwner && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <p className="text-sm font-semibold text-gray-700">Your listing</p>
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/services/${id}/edit`}
                className="flex-1 py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-center text-sm"
              >
                ✏️ Edit
              </Link>
              <button
                onClick={handleToggle}
                disabled={toggling}
                className="flex-1 py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm disabled:opacity-50"
              >
                {service.available ? '⏸ Mark Unavailable' : '▶️ Mark Available'}
              </button>
              <Link
                href={`/services/${id}/requests`}
                className="flex-1 py-3 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 transition-colors text-center text-sm"
              >
                📋 View Requests
              </Link>
            </div>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-full py-2 text-xs text-red-400 hover:text-red-600 hover:underline transition-colors disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : 'Delete this listing'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
