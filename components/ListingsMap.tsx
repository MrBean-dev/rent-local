'use client'

import { useEffect, useRef } from 'react'
import type { Listing } from '@/lib/types'
import { formatPrice } from '@/lib/utils'

interface Props {
  listings: Listing[]
  onSelect?: (listing: Listing) => void
  userLocation?: { lat: number; lng: number }
}

const categoryColor: Record<string, string> = {
  trailer: '#3b82f6',
  backhoe: '#f97316',
  tool:    '#22c55e',
}

export default function ListingsMap({ listings, onSelect, userLocation }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<any>(null)
  const markersRef   = useRef<any[]>([])

  const mapped = listings.filter((l) => l.lat != null && l.lng != null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    import('mapbox-gl').then((mapboxgl) => {
      mapboxgl.default.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

      // Center on first listing with coords, or user location, or US center
      const center = userLocation
        ? [userLocation.lng, userLocation.lat]
        : mapped[0]
        ? [mapped[0].lng!, mapped[0].lat!]
        : [-98.5795, 39.8283]

      const map = new mapboxgl.default.Map({
        container: containerRef.current!,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: center as [number, number],
        zoom: mapped.length > 0 ? 9 : 4,
      })

      mapRef.current = map

      // User location marker
      if (userLocation) {
        const el = document.createElement('div')
        el.className = 'w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-lg'
        new mapboxgl.default.Marker({ element: el })
          .setLngLat([userLocation.lng, userLocation.lat])
          .addTo(map)
      }

      map.on('load', () => addMarkers(map, mapboxgl.default, mapped, onSelect))
      map.addControl(new mapboxgl.default.NavigationControl(), 'top-right')
    })

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  // Update markers when listings change
  useEffect(() => {
    if (!mapRef.current) return
    import('mapbox-gl').then((mapboxgl) => {
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []
      addMarkers(mapRef.current, mapboxgl.default, mapped, onSelect, markersRef.current)
    })
  }, [listings])

  function addMarkers(map: any, mapboxgl: any, items: Listing[], onSelect?: (l: Listing) => void, store?: any[]) {
    items.forEach((listing) => {
      const el = document.createElement('div')
      el.className = 'cursor-pointer select-none'
      el.innerHTML = `
        <div style="background:${categoryColor[listing.category] ?? '#6b7280'}" class="text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg whitespace-nowrap hover:scale-110 transition-transform">
          ${formatPrice(listing.pricePerDay)}
        </div>
      `
      el.addEventListener('click', () => onSelect?.(listing))

      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false, maxWidth: '220px' })
        .setHTML(`
          <div style="font-family:sans-serif;padding:4px">
            <p style="font-weight:700;font-size:13px;margin:0 0 4px">${listing.title}</p>
            <p style="color:#6b7280;font-size:12px;margin:0 0 4px">📍 ${listing.location}</p>
            <p style="color:#f05b00;font-weight:700;font-size:14px;margin:0">${formatPrice(listing.pricePerDay)}/day</p>
          </div>
        `)

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([listing.lng!, listing.lat!])
        .setPopup(popup)
        .addTo(map)

      store?.push(marker)
      markersRef.current.push(marker)
    })

    // Fit bounds to all markers
    if (items.length > 1) {
      const bounds = items.reduce((b, l) => b.extend([l.lng!, l.lat!] as any), new mapboxgl.LngLatBounds([items[0].lng!, items[0].lat!], [items[0].lng!, items[0].lat!]))
      map.fitBounds(bounds, { padding: 60, maxZoom: 13 })
    }
  }

  if (mapped.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-2xl text-gray-400">
        <div className="text-center">
          <p className="text-3xl mb-2">🗺️</p>
          <p className="text-sm">No listings with location data yet.</p>
        </div>
      </div>
    )
  }

  return <div ref={containerRef} className="w-full h-full rounded-2xl overflow-hidden" />
}
