'use client'

import { useState } from 'react'
import type { RentalRequest } from '@/lib/types'

interface Props {
  requests: RentalRequest[]
}

function getDatesInRange(start: string, end: string): Set<string> {
  const result = new Set<string>()
  const cur = new Date(start + 'T00:00:00')
  const last = new Date(end + 'T00:00:00')
  while (cur <= last) {
    result.add(cur.toISOString().split('T')[0])
    cur.setDate(cur.getDate() + 1)
  }
  return result
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function AvailabilityCalendar({ requests }: Props) {
  const today = new Date()
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  // Build sets of booked and pending dates
  const bookedDates  = new Set<string>()
  const pendingDates = new Set<string>()
  for (const r of requests) {
    const dates = getDatesInRange(r.startDate, r.endDate)
    if (r.status === 'approved') dates.forEach((d) => bookedDates.add(d))
    else if (r.status === 'pending') dates.forEach((d) => pendingDates.add(d))
  }

  function prev() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1) }
    else setMonth((m) => m - 1)
  }
  function next() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1) }
    else setMonth((m) => m + 1)
  }

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayStr = today.toISOString().split('T')[0]

  // Build grid cells (leading blanks + day numbers)
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null)

  function dateStr(day: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  return (
    <div>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prev}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="font-semibold text-gray-800 text-sm">{MONTHS[month]} {year}</span>
        <button
          onClick={next}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const ds = dateStr(day)
          const isToday   = ds === todayStr
          const isBooked  = bookedDates.has(ds)
          const isPending = !isBooked && pendingDates.has(ds)
          const isPast    = ds < todayStr

          let cellClass = 'w-8 h-8 mx-auto flex items-center justify-center rounded-full text-xs transition-colors '
          if (isBooked)       cellClass += 'bg-red-100 text-red-600 font-semibold cursor-default'
          else if (isPending) cellClass += 'bg-yellow-100 text-yellow-700 font-semibold cursor-default'
          else if (isToday)   cellClass += 'bg-brand-600 text-white font-bold'
          else if (isPast)    cellClass += 'text-gray-300 cursor-default'
          else                cellClass += 'text-gray-700 hover:bg-gray-100'

          return (
            <div key={i} className="flex justify-center">
              <div className={cellClass} title={isBooked ? 'Booked' : isPending ? 'Pending request' : ''}>
                {day}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-200 inline-block" />
          Booked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-yellow-200 inline-block" />
          Pending
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-brand-600 inline-block" />
          Today
        </span>
      </div>
    </div>
  )
}
