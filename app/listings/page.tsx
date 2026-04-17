'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { fetchListings } from '@/lib/db'
import { distanceMiles } from '@/lib/geocode'
import type { Listing, Category } from '@/lib/types'
import ListingCard from '@/components/ListingCard'
import dynamic from 'next/dynamic'

const ListingsMap = dynamic(() => import('@/components/ListingsMap'), { ssr: false })

const CATEGORIES: { value: Category | ''; label: string; icon: string }[] = [
  { value: '',          label: 'All',        icon: '🏷️' },
  { value: 'trailer',   label: 'Trailers',   icon: '🚛' },
  { value: 'backhoe',   label: 'Backhoes',   icon: '🚜' },
  { value: 'tool',      label: 'Tools',      icon: '🔧' },
  { value: 'box_truck', label: 'Box Trucks', icon: '🚚' },
]

const CONDITIONS = [
  { value: '',          label: 'Any' },
  { value: 'excellent', label: 'Excellent' },
  { value: 'good',      label: 'Good' },
  { value: 'fair',      label: 'Fair' },
]

function ListingsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [listings, setListings]               = useState<Listing[]>([])
  const [query, setQuery]                     = useState(searchParams.get('q') ?? '')
  const [category, setCategory]               = useState<Category | ''>((searchParams.get('category') as Category) ?? '')
  const [condition, setCondition]             = useState(searchParams.get('condition') ?? '')
  const [maxPrice, setMaxPrice]               = useState(searchParams.get('maxPrice') ?? '')
  const [sortBy, setSortBy]                   = useState(searchParams.get('sort') ?? 'newest')
  const [maxDistance, setMaxDistance]         = useState(searchParams.get('distance') ?? '')
  const [showUnavailable, setShowUnavailable] = useState(false)
  const [filtersOpen, setFiltersOpen]         = useState(false)
  const [viewMode, setViewMode]               = useState<'grid' | 'map'>('grid')
  const [userLocation, setUserLocation]       = useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating]               = useState(false)

  useEffect(() => { fetchListings().then(setListings) }, [])

  useEffect(() => {
    const p = new URLSearchParams()
    if (query)    p.set('q', query)
    if (category) p.set('category', category)
    if (condition) p.set('condition', condition)
    if (maxPrice) p.set('maxPrice', maxPrice)
    if (sortBy && sortBy !== 'newest') p.set('sort', sortBy)
    if (maxDistance) p.set('distance', maxDistance)
    router.replace(`/listings${p.toString() ? '?' + p.toString() : ''}`, { scroll: false })
  }, [query, category, condition, maxPrice, sortBy, maxDistance, router])

  const filtered = useMemo(() => {
    const lower = query.toLowerCase()
    return listings
      .filter((l) => !lower || l.title.toLowerCase().includes(lower) || l.description.toLowerCase().includes(lower) || l.location.toLowerCase().includes(lower))
      .filter((l) => !category  || l.category  === category)
      .filter((l) => !condition || l.condition === condition)
      .filter((l) => !maxPrice  || l.pricePerDay <= Number(maxPrice))
      .filter((l) => showUnavailable || l.available)
      .filter((l) => {
        if (!maxDistance || !userLocation || !l.lat || !l.lng) return true
        return distanceMiles(userLocation.lat, userLocation.lng, l.lat, l.lng) <= Number(maxDistance)
      })
      .sort((a, b) => {
        if (sortBy === 'price_asc')  return a.pricePerDay - b.pricePerDay
        if (sortBy === 'price_desc') return b.pricePerDay - a.pricePerDay
        if (sortBy === 'oldest')     return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
  }, [listings, query, category, condition, maxPrice, showUnavailable, sortBy, maxDistance, userLocation])

  function requestLocation() {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false) },
      () => setLocating(false)
    )
  }

  const activeFilterCount = [category, condition, maxPrice].filter(Boolean).length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-brand-600 to-orange-600 text-white px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold mb-4">Browse Equipment</h1>
          <div className="flex gap-2 max-w-2xl">
            <div className="relative flex-1">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
              </svg>
              <input type="text" placeholder="Search trailers, backhoes, tools..." value={query} onChange={(e) => setQuery(e.target.value)} className="w-full pl-10 pr-9 py-3 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-white/50 shadow-sm text-sm" />
              {query && <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">✕</button>}
            </div>
            <button onClick={() => setFiltersOpen(!filtersOpen)} className={`sm:hidden flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-colors shadow-sm ${filtersOpen || activeFilterCount > 0 ? 'bg-white text-brand-600' : 'bg-white/20 text-white border border-white/30'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
              {activeFilterCount > 0 ? `Filters (${activeFilterCount})` : 'Filters'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {CATEGORIES.map((c) => (
              <button key={c.value} onClick={() => setCategory(c.value as Category | '')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${category === c.value ? 'bg-white text-brand-600 shadow-sm' : 'bg-white/20 text-white hover:bg-white/30'}`}>
                <span>{c.icon}</span>{c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Map / Grid toggle */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 flex justify-end">
        <div className="inline-flex rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${viewMode === 'grid' ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Grid
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${viewMode === 'map' ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Map
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex gap-6">
        <aside className={`${filtersOpen ? 'block' : 'hidden'} sm:block w-full sm:w-56 shrink-0`}>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/60">
              <p className="text-sm font-semibold text-gray-700">Filters</p>
            </div>
            <div className="p-4 space-y-5">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Condition</p>
                <div className="space-y-1">
                  {CONDITIONS.map((c) => (
                    <button key={c.value} onClick={() => setCondition(c.value)} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${condition === c.value ? 'bg-brand-50 text-brand-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Max Price / Day</p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input type="number" placeholder="Any" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="w-full pl-7 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200" />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Distance</p>
                <div className="space-y-1">
                  {[['', 'Any distance'], ['10', 'Within 10 mi'], ['25', 'Within 25 mi'], ['50', 'Within 50 mi'], ['100', 'Within 100 mi']].map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => { setMaxDistance(val); if (val && !userLocation) requestLocation() }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${maxDistance === val ? 'bg-brand-50 text-brand-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {maxDistance && !userLocation && (
                  <button onClick={requestLocation} disabled={locating} className="mt-2 w-full py-2 text-xs text-brand-600 border border-brand-200 rounded-lg hover:bg-brand-50 transition-colors disabled:opacity-50">
                    {locating ? 'Getting location…' : '📍 Share my location'}
                  </button>
                )}
                {userLocation && (
                  <p className="mt-1 text-xs text-green-600 font-medium">📍 Location set</p>
                )}
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" checked={showUnavailable} onChange={(e) => setShowUnavailable(e.target.checked)} className="rounded text-brand-600" />
                Show unavailable
              </label>
              {(activeFilterCount > 0 || maxDistance) && (
                <button onClick={() => { setCategory(''); setCondition(''); setMaxPrice(''); setMaxDistance('') }} className="w-full py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  Clear all filters
                </button>
              )}
            </div>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          {viewMode === 'map' ? (
            <div className="h-[600px]">
              <ListingsMap
                listings={filtered}
                userLocation={userLocation ?? undefined}
                onSelect={(l) => window.open(`/listings/${l.id}`, '_blank')}
              />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4 gap-3">
                <p className="text-sm text-gray-500">
                  <span className="font-semibold text-gray-900">{filtered.length}</span> {filtered.length === 1 ? 'listing' : 'listings'} found
                  {query && <span> for "<strong>{query}</strong>"</span>}
                </p>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-200 shrink-0">
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="price_asc">Price: low to high</option>
                  <option value="price_desc">Price: high to low</option>
                </select>
              </div>

              {filtered.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-20">
                  <p className="text-5xl mb-3">🔍</p>
                  <p className="font-semibold text-gray-700">No listings match your search.</p>
                  <p className="text-sm text-gray-400 mt-1">Try different keywords or clear your filters.</p>
                  {(activeFilterCount > 0 || maxDistance) && (
                    <button onClick={() => { setCategory(''); setCondition(''); setMaxPrice(''); setQuery(''); setMaxDistance('') }} className="mt-4 text-sm text-brand-600 hover:underline">Clear all</button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filtered.map((l) => <ListingCard key={l.id} listing={l} />)}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ListingsPage() {
  return <Suspense><ListingsContent /></Suspense>
}
