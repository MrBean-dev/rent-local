'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { fetchListings } from '@/lib/db'
import type { Listing } from '@/lib/types'
import ListingCard from '@/components/ListingCard'

const categories = [
  { id: 'trailer',   label: 'Trailers',             icon: '🚛', description: 'Utility, dump, car haulers & more',       color: 'bg-blue-50 border-blue-200 hover:border-blue-400',     textColor: 'text-blue-700' },
  { id: 'backhoe',   label: 'Backhoes & Excavators', icon: '🚜', description: 'Mini excavators, skid steers, trenchers',  color: 'bg-orange-50 border-orange-200 hover:border-orange-400', textColor: 'text-orange-700' },
  { id: 'tool',      label: 'Tools',                icon: '🔧', description: 'Power tools, compactors, generators',      color: 'bg-green-50 border-green-200 hover:border-green-400',   textColor: 'text-green-700' },
  { id: 'box_truck', label: 'Box Trucks',           icon: '🚚', description: '10ft, 16ft, 26ft moving trucks',           color: 'bg-purple-50 border-purple-200 hover:border-purple-400', textColor: 'text-purple-700' },
]

export default function HomePage() {
  const router = useRouter()
  const [listings, setListings] = useState<Listing[]>([])
  const [query, setQuery] = useState('')

  useEffect(() => {
    fetchListings().then((all) => setListings(all.filter((l) => l.available)))
  }, [])

  const filtered = useMemo(() => {
    const lower = query.toLowerCase()
    return listings.filter((l) =>
      !lower || l.title.toLowerCase().includes(lower) ||
      l.description.toLowerCase().includes(lower) ||
      l.location.toLowerCase().includes(lower)
    )
  }, [listings, query])

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) router.push(`/listings?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <div>
      <section className="bg-gradient-to-br from-brand-600 to-orange-700 text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight">Rent Equipment<br />From Your Neighbors</h1>
          <p className="mt-4 text-lg text-orange-100">Find trailers, backhoes, and tools available right in your area.</p>
          <form onSubmit={handleSearchSubmit} className="mt-8 flex gap-2 max-w-xl mx-auto">
            <div className="relative flex-1">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
              </svg>
              <input type="text" placeholder="Search trailers, backhoes, tools..." value={query} onChange={(e) => setQuery(e.target.value)} className="w-full pl-11 pr-4 py-3.5 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-white/50 shadow-lg text-sm" />
              {query && <button type="button" onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">✕</button>}
            </div>
            <button type="submit" className="px-5 py-3.5 bg-white text-brand-600 font-semibold rounded-xl hover:bg-orange-50 transition-colors shadow-lg text-sm shrink-0">Search</button>
          </form>
          <div className="mt-4">
            <Link href="/post" className="text-sm text-orange-200 hover:text-white underline underline-offset-2">+ List your equipment for free</Link>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-4">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Browse by Category</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <Link key={cat.id} href={`/listings?category=${cat.id}`} className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all ${cat.color}`}>
              <span className="text-4xl">{cat.icon}</span>
              <div>
                <p className={`font-semibold text-base ${cat.textColor}`}>{cat.label}</p>
                <p className="text-sm text-gray-500">{cat.description}</p>
              </div>
              <svg className="w-4 h-4 text-gray-400 ml-auto shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 pt-4">
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-gray-500">
            {filtered.length} {filtered.length === 1 ? 'listing' : 'listings'}
            {query && <span className="ml-1">for "<strong>{query}</strong>"</span>}
          </p>
          {query && <button onClick={() => setQuery('')} className="text-sm text-brand-600 hover:underline">Clear</button>}
        </div>
        {filtered.length === 0 && listings.length > 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-5xl mb-3">🔍</p>
            <p className="font-medium text-gray-600">No listings match your search.</p>
            <button onClick={() => setQuery('')} className="mt-3 text-sm text-brand-600 hover:underline">Clear search</button>
          </div>
        ) : listings.length === 0 ? (
          <p className="text-gray-500 text-center py-12">No listings yet. Be the first to post!</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((listing) => <ListingCard key={listing.id} listing={listing} />)}
          </div>
        )}
      </section>
    </div>
  )
}
