'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getListing } from '@/lib/storage'
import { saveInspection, getInspectionsForListing } from '@/lib/inspections'
import { generateId } from '@/lib/utils'
import type { Listing, InspectionPhoto, RentalInspection } from '@/lib/types'

export default function InspectPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [listing, setListing]         = useState<Listing | null>(null)
  const [renterName, setRenterName]   = useState('')
  const [photos, setPhotos]           = useState<InspectionPhoto[]>([])
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [noteText, setNoteText]       = useState('')
  const [saved, setSaved]             = useState(false)
  const [sessionId]                   = useState(generateId)
  const [pastCount, setPastCount]     = useState(0)

  useEffect(() => {
    const found = getListing(id)
    if (!found) { router.push('/listings'); return }
    setListing(found)
    setPastCount(getInspectionsForListing(id).length)
  }, [id, router])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        setPhotos((prev) => [...prev, { id: generateId(), dataUrl: ev.target?.result as string, note: '', capturedAt: new Date().toISOString() }])
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  function handleSave() {
    if (!listing || photos.length === 0) return
    saveInspection({ id: sessionId, listingId: listing.id, listingTitle: listing.title, renterName: renterName.trim() || 'Anonymous', createdAt: new Date().toISOString(), photos })
    setSaved(true)
  }

  if (!listing) return null

  if (saved) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Inspection Saved</h2>
          <p className="text-gray-500 mt-2">{photos.length} photo{photos.length !== 1 ? 's' : ''} documented for <strong>{listing.title}</strong>.</p>
          <p className="text-sm text-gray-400 mt-1">Saved locally on this device.</p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href={`/listings/${listing.id}`} className="px-5 py-3 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 transition-colors">Back to Listing</Link>
            <Link href={`/inspections/${listing.id}`} className="px-5 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors">View All Inspections</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner */}
      <div className="bg-gradient-to-r from-brand-600 to-orange-600 text-white px-4 pt-6 pb-10">
        <div className="max-w-2xl mx-auto">
          <Link href={`/listings/${listing.id}`} className="inline-flex items-center gap-1 text-sm text-orange-200 hover:text-white mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to listing
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Pre-Rental Inspection</h1>
              <p className="text-orange-100 text-sm mt-1">{listing.title}</p>
            </div>
            {pastCount > 0 && (
              <Link href={`/inspections/${listing.id}`} className="shrink-0 text-sm text-orange-200 hover:text-white underline underline-offset-2">
                {pastCount} past {pastCount === 1 ? 'inspection' : 'inspections'}
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 -mt-4 pb-10 space-y-4">

        {/* Your name */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50/60">
            <span className="w-7 h-7 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center shrink-0">1</span>
            <span className="font-semibold text-gray-900">👤 Your Name</span>
            <span className="text-gray-400 text-sm font-normal">(optional)</span>
          </div>
          <div className="px-5 py-5">
            <input
              type="text"
              placeholder="e.g. John Smith"
              value={renterName}
              onChange={(e) => setRenterName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400"
            />
            <p className="text-xs text-gray-400 mt-2">Used to label this inspection record.</p>
          </div>
        </div>

        {/* Take photos */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50/60">
            <span className="w-7 h-7 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center shrink-0">2</span>
            <span className="font-semibold text-gray-900">📷 Take Photos</span>
          </div>
          <div className="px-5 py-5">
            <p className="text-sm text-gray-500 mb-4">
              Document the equipment&apos;s condition <strong>before</strong> you take it. These photos are saved on your device as proof of pre-existing damage.
            </p>
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handleFileChange} />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-3 py-10 border-2 border-dashed border-gray-200 rounded-2xl hover:border-brand-400 hover:bg-brand-50 transition-all text-gray-400 hover:text-brand-600"
            >
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div className="text-center">
                <p className="font-semibold">Take a Photo</p>
                <p className="text-xs mt-0.5">Opens camera on mobile · or choose from files</p>
              </div>
            </button>
          </div>
        </div>

        {/* Captured photos */}
        {photos.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50/60">
              <span className="w-7 h-7 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center shrink-0">3</span>
              <span className="font-semibold text-gray-900">🖼 Captured Photos</span>
              <span className="ml-auto text-sm text-gray-400">{photos.length} photo{photos.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="px-5 py-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {photos.map((photo, i) => (
                  <div key={photo.id} className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                    <img src={photo.dataUrl} alt={`Photo ${i + 1}`} className="w-full aspect-square object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button onClick={() => { setEditingNote(photo.id); setNoteText(photo.note) }} className="bg-white text-gray-800 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-100">
                        {photo.note ? 'Edit note' : '+ Note'}
                      </button>
                      <button onClick={() => setPhotos((p) => p.filter((x) => x.id !== photo.id))} className="bg-red-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-red-600">Remove</button>
                    </div>
                    {photo.note && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                        <p className="text-white text-xs line-clamp-1">{photo.note}</p>
                      </div>
                    )}
                    <span className="absolute top-1.5 left-1.5 bg-black/50 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">{i + 1}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => fileInputRef.current?.click()} className="w-full py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors">
                + Add more photos
              </button>
            </div>
          </div>
        )}

        {/* Save */}
        {photos.length > 0 && (
          <>
            <button
              onClick={handleSave}
              className="w-full py-4 bg-brand-600 text-white font-bold rounded-2xl hover:bg-brand-700 active:scale-[0.98] transition-all shadow-lg shadow-brand-600/20"
            >
              Save Inspection ({photos.length} photo{photos.length !== 1 ? 's' : ''}) →
            </button>
            <p className="text-center text-xs text-gray-400 pb-4">Saved locally on this device. Screenshot or export to preserve long-term.</p>
          </>
        )}
      </div>

      {/* Note editor modal */}
      {editingNote && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h3 className="font-semibold text-gray-900 mb-1">Add a note</h3>
            <p className="text-xs text-gray-500 mb-3">Describe any existing damage, scratches, or wear visible in this photo.</p>
            <textarea
              autoFocus rows={3}
              placeholder="e.g. Scratch on left panel, pre-existing dent on bumper…"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 resize-none"
            />
            <div className="flex gap-2 mt-4">
              <button onClick={() => setEditingNote(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button
                onClick={() => {
                  setPhotos((p) => p.map((x) => x.id === editingNote ? { ...x, note: noteText } : x))
                  setEditingNote(null); setNoteText('')
                }}
                className="flex-1 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
