'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { fetchServiceListings } from '@/lib/serviceDb'
import type { ServiceListing } from '@/lib/types'
import ServiceCard from '@/components/ServiceCard'

const categories = [
  { id: 'backhoe_operator', label: 'Backhoe Operator',      icon: '🚜' },
  { id: 'box_truck_driver', label: 'Box Truck Driver',       icon: '🚚' },
  { id: 'trailer_hauler',   label: 'Trailer Hauler',         icon: '🚛' },
  { id: 'general_labor',    label: 'General Labor',          icon: '🔧' },
  { id: 'landscaping',      label: 'Landscaping',            icon: '🌿' },
  { id: 'tree_service',     label: 'Tree Service',           icon: '🌳' },
  { id: 'snow_removal',     label: 'Snow Removal',           icon: '❄️' },
  { id: 'pressure_washing', label: 'Pressure Washing',       icon: '💧' },
  { id: 'painting',         label: 'Painting',               icon: '🎨' },
  { id: 'moving',           label: 'Moving Help',            icon: '📦' },
  { id: 'hauling',          label: 'Hauling & Junk Removal', icon: '🗑️' },
  { id: 'concrete',         label: 'Concrete & Masonry',     icon: '🧱' },
]

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceListing[]>([])
  const [category, setCategory] = useState('')
  const [query, setQuery]       = useState('')
  const [sort, setSort]         = useState('newest')

  useEffect(() => {
    fetchServiceListings().then(setServices)
  }, [])

  const filtered = useMemo(() => {
    let list = services
    if (category) list = list.filter((s) => s.category === category)
    if (query) {
      const lower = query.toLowerCase()
      list = list.filter((s) =>
        s.title.toLowerCase().includes(lower) ||
        s.description.toLowerCase().includes(lower) ||
        s.location.toLowerCase().includes(lower)
      )
    }
    if (sort === 'rate_asc')  list = [...list].sort((a, b) => a.rate - b.rate)
    if (sort === 'rate_desc') list = [...list].sort((a, b) => b.rate - a.rate)
    return list
  }, [services, category, query, sort])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-teal-600 to-brand-600 text-white py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-bold">Find Local Help</h1>
          <p className="mt-2 text-teal-100 text-lg">Hire experienced operators, drivers, and laborers in your area.</p>
          <div className="mt-6 flex gap-2 max-w-lg mx-auto">
            <input
              type="text"
              placeholder="Search services…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl text-gray-900 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-white/50 shadow-lg"
            />
            <Link
              href="/services/post"
              className="px-5 py-3 bg-white text-teal-700 font-semibold rounded-xl hover:bg-teal-50 transition-colors shadow-lg text-sm shrink-0"
            >
              + Offer a Service
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <button
            onClick={() => setCategory('')}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              category === '' ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-200 hover:border-teal-400'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(category === cat.id ? '' : cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                category === cat.id ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-200 hover:border-teal-400'
              }`}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="ml-auto px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-200"
          >
            <option value="newest">Newest</option>
            <option value="rate_asc">Rate: Low → High</option>
            <option value="rate_desc">Rate: High → Low</option>
          </select>
        </div>

        <p className="text-sm text-gray-500 mb-5">{filtered.length} {filtered.length === 1 ? 'service' : 'services'}</p>

        {filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-5xl mb-3">👷</p>
            <p className="font-semibold text-gray-700">No services found.</p>
            <Link href="/services/post" className="mt-4 inline-block text-sm text-teal-600 hover:underline">
              Be the first to offer a service →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((s) => <ServiceCard key={s.id} service={s} />)}
          </div>
        )}
      </div>
    </div>
  )
}
