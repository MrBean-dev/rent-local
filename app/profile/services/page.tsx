'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { fetchMyServiceListings, patchServiceListing, removeServiceListing } from '@/lib/serviceDb'
import { formatRate, formatDate } from '@/lib/utils'
import type { ServiceListing } from '@/lib/types'

const categoryLabels: Record<string, string> = {
  backhoe_operator: 'Backhoe Operator',
  box_truck_driver: 'Box Truck Driver',
  trailer_hauler:   'Trailer Hauler',
  general_labor:    'General Labor',
  landscaping:      'Landscaping',
  tree_service:     'Tree Service',
  snow_removal:     'Snow Removal',
  pressure_washing: 'Pressure Washing',
  painting:         'Painting',
  moving:           'Moving Help',
  hauling:          'Hauling & Junk Removal',
  concrete:         'Concrete & Masonry',
}

const categoryColors: Record<string, string> = {
  backhoe_operator: 'bg-orange-100 text-orange-700',
  box_truck_driver: 'bg-purple-100 text-purple-700',
  trailer_hauler:   'bg-blue-100 text-blue-700',
  general_labor:    'bg-green-100 text-green-700',
  landscaping:      'bg-lime-100 text-lime-700',
  tree_service:     'bg-emerald-100 text-emerald-700',
  snow_removal:     'bg-sky-100 text-sky-700',
  pressure_washing: 'bg-cyan-100 text-cyan-700',
  painting:         'bg-pink-100 text-pink-700',
  moving:           'bg-amber-100 text-amber-700',
  hauling:          'bg-red-100 text-red-700',
  concrete:         'bg-stone-100 text-stone-700',
}

export default function MyServicesPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [services, setServices] = useState<ServiceListing[]>([])
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) { router.push('/login'); return }
    if (user) fetchMyServiceListings(user.id).then(setServices)
  }, [user, loading, router])

  async function handleToggle(s: ServiceListing) {
    setToggling(s.id)
    await patchServiceListing(s.id, { available: !s.available })
    setServices((prev) => prev.map((x) => x.id === s.id ? { ...x, available: !x.available } : x))
    setToggling(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this service listing?')) return
    await removeServiceListing(id)
    setServices((prev) => prev.filter((s) => s.id !== id))
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>
  if (!user)   return null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-teal-600 to-brand-600 text-white px-4 pt-6 pb-10">
        <div className="max-w-3xl mx-auto">
          <Link href="/profile" className="inline-flex items-center gap-1 text-sm text-teal-200 hover:text-white mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to profile
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">My Services</h1>
              <p className="text-teal-100 text-sm mt-1">{services.length} service{services.length !== 1 ? 's' : ''} listed</p>
            </div>
            <Link
              href="/services/post"
              className="shrink-0 px-4 py-2.5 bg-white text-teal-700 text-sm font-semibold rounded-xl hover:bg-teal-50 transition-colors shadow-sm"
            >
              + New Service
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-4 pb-10">
        {services.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-20">
            <p className="text-5xl mb-3">👷</p>
            <p className="font-semibold text-gray-700">No services posted yet.</p>
            <Link href="/services/post" className="mt-4 inline-block text-sm text-teal-600 hover:underline">
              Post your first service →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {services.map((s) => (
              <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex gap-4 p-4">
                  <div className="w-16 h-16 rounded-xl bg-teal-50 flex items-center justify-center text-3xl shrink-0 overflow-hidden">
                    {s.imageUrl
                      ? <img src={s.imageUrl} alt={s.title} className="w-full h-full object-cover" />
                      : ({ backhoe_operator: '🚜', box_truck_driver: '🚚', trailer_hauler: '🚛', landscaping: '🌿', tree_service: '🌳', snow_removal: '❄️', pressure_washing: '💧', painting: '🎨', moving: '📦', hauling: '🗑️', concrete: '🧱' } as Record<string,string>)[s.category] ?? '🔧'
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/services/${s.id}`} className="font-semibold text-gray-900 hover:text-teal-600 transition-colors line-clamp-1">
                        {s.title}
                      </Link>
                      <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${s.available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {s.available ? 'Available' : 'Unavailable'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${categoryColors[s.category]}`}>
                        {categoryLabels[s.category]}
                      </span>
                      <span className="text-teal-600 font-bold text-sm">{formatRate(s.rate, s.rateType)}</span>
                      <span className="text-xs text-gray-400">{s.location}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Posted {formatDate(s.createdAt)}</p>
                  </div>
                </div>

                <div className="border-t border-gray-50 px-4 py-3 flex items-center gap-3 bg-gray-50/40">
                  <button
                    onClick={() => handleToggle(s)}
                    disabled={toggling === s.id}
                    className="text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
                  >
                    {toggling === s.id ? '…' : s.available ? '⏸ Mark Unavailable' : '▶️ Mark Available'}
                  </button>
                  <span className="text-gray-200">|</span>
                  <Link href={`/services/${s.id}/requests`} className="text-xs font-medium text-teal-600 hover:text-teal-700 transition-colors">
                    View Requests
                  </Link>
                  <span className="text-gray-200">|</span>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="text-xs font-medium text-red-400 hover:text-red-600 transition-colors ml-auto"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
