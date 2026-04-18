import Link from 'next/link'
import type { ServiceListing } from '@/lib/types'
import { formatRate, formatDate } from '@/lib/utils'

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

const categoryIcons: Record<string, string> = {
  backhoe_operator: '🚜',
  box_truck_driver: '🚚',
  trailer_hauler:   '🚛',
  general_labor:    '🔧',
  landscaping:      '🌿',
  tree_service:     '🌳',
  snow_removal:     '❄️',
  pressure_washing: '💧',
  painting:         '🎨',
  moving:           '📦',
  hauling:          '🗑️',
  concrete:         '🧱',
}

export default function ServiceCard({ service }: { service: ServiceListing }) {
  return (
    <Link
      href={`/services/${service.id}`}
      className="group block bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-100"
    >
      <div className="relative h-48 bg-teal-50 overflow-hidden">
        {service.imageUrl ? (
          <img
            src={service.imageUrl}
            alt={service.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">
            {categoryIcons[service.category] ?? '👷'}
          </div>
        )}
        {!service.available && (
          <div className="absolute inset-0 bg-gray-900/60 flex items-center justify-center">
            <span className="bg-white text-gray-800 font-semibold px-3 py-1 rounded-full text-sm">Not Available</span>
          </div>
        )}
        <span className={`absolute top-3 left-3 text-xs font-semibold px-2 py-1 rounded-full ${categoryColors[service.category]}`}>
          {categoryLabels[service.category]}
        </span>
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-gray-900 group-hover:text-teal-600 transition-colors line-clamp-1">
          {service.title}
        </h3>
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{service.description}</p>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-teal-600 font-bold text-lg">{formatRate(service.rate, service.rateType)}</span>
          <div className="flex items-center gap-2">
            {service.insured && (
              <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">🛡️ Insured</span>
            )}
            <span className="text-xs text-gray-400">{service.contactName}</span>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>{service.location}</span>
          <span className="ml-auto">{formatDate(service.createdAt)}</span>
        </div>
      </div>
    </Link>
  )
}
