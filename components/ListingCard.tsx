import Link from 'next/link'
import type { Listing } from '@/lib/types'
import { formatPrice, formatDate } from '@/lib/utils'
import { StarDisplay } from './StarRating'

const categoryColors: Record<string, string> = {
  trailer:   'bg-blue-100 text-blue-700',
  backhoe:   'bg-orange-100 text-orange-700',
  tool:      'bg-green-100 text-green-700',
  box_truck: 'bg-purple-100 text-purple-700',
}

const categoryLabels: Record<string, string> = {
  trailer:   'Trailer',
  backhoe:   'Backhoe / Excavator',
  tool:      'Tool',
  box_truck: 'Box Truck',
}

const conditionDot: Record<string, string> = {
  excellent: 'bg-green-500',
  good: 'bg-yellow-400',
  fair: 'bg-orange-400',
}

export default function ListingCard({ listing, avgRating, reviewCount }: { listing: Listing; avgRating?: number; reviewCount?: number }) {
  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group block bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-100"
    >
      {/* Image */}
      <div className="relative h-48 bg-gray-200 overflow-hidden">
        {listing.imageUrl ? (
          <img
            src={listing.imageUrl}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-4xl">
            {listing.category === 'trailer' ? '🚛' : listing.category === 'backhoe' ? '🚜' : listing.category === 'box_truck' ? '🚚' : '🔧'}
          </div>
        )}
        {!listing.available && (
          <div className="absolute inset-0 bg-gray-900/60 flex items-center justify-center">
            <span className="bg-white text-gray-800 font-semibold px-3 py-1 rounded-full text-sm">
              Not Available
            </span>
          </div>
        )}
        <span className={`absolute top-3 left-3 text-xs font-semibold px-2 py-1 rounded-full ${categoryColors[listing.category]}`}>
          {categoryLabels[listing.category]}
        </span>
      </div>

      {/* Body */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 group-hover:text-brand-600 transition-colors line-clamp-1">
          {listing.title}
        </h3>
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{listing.description}</p>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-brand-600 font-bold text-lg">{formatPrice(listing.pricePerDay)}</span>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className={`w-2 h-2 rounded-full ${conditionDot[listing.condition]}`} />
            <span className="capitalize">{listing.condition}</span>
          </div>
        </div>

        {avgRating !== undefined && avgRating > 0 && (
          <div className="mt-2 flex items-center gap-1.5">
            <StarDisplay rating={avgRating} size="sm" />
            <span className="text-xs text-gray-500">{avgRating.toFixed(1)} ({reviewCount})</span>
          </div>
        )}

        <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>{listing.location}</span>
          <span className="ml-auto">{formatDate(listing.createdAt)}</span>
        </div>
      </div>
    </Link>
  )
}
