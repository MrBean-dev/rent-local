'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getProfile, saveProfile, clearProfile } from '@/lib/profile'
import { generateId } from '@/lib/utils'
import type { UserProfile } from '@/lib/types'

interface Form { name: string; phone: string; email: string; location: string; bio: string }
interface Errors { [k: string]: string }

const blank: Form = { name: '', phone: '', email: '', location: '', bio: '' }

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [form, setForm]       = useState<Form>(blank)
  const [errors, setErrors]   = useState<Errors>({})
  const [saved, setSaved]     = useState(false)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    const p = getProfile()
    if (p) { setProfile(p); setForm({ name: p.name, phone: p.phone, email: p.email, location: p.location, bio: p.bio }) }
    else setEditing(true)
  }, [])

  function set(field: keyof Form, value: string) {
    setForm((p) => ({ ...p, [field]: value }))
    if (errors[field]) setErrors((p) => { const e = { ...p }; delete e[field]; return e })
  }

  function validate() {
    const e: Errors = {}
    if (!form.name.trim()) e.name = 'Required'
    if (!form.phone.trim() && !form.email.trim()) e.phone = 'Provide phone or email'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSave(ev: React.FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    const p: UserProfile = {
      id: profile?.id ?? generateId(),
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      location: form.location.trim(),
      bio: form.bio.trim(),
      createdAt: profile?.createdAt ?? new Date().toISOString(),
    }
    saveProfile(p)
    setProfile(p)
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function handleClear() {
    if (!confirm('Remove your profile from this device?')) return
    clearProfile()
    setProfile(null)
    setForm(blank)
    setEditing(true)
  }

  const inp = (field: keyof Form, extra = '') =>
    `w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-colors ${extra} ${
      errors[field] ? 'border-red-400 bg-red-50 focus:ring-red-200' : 'border-gray-200 bg-white focus:ring-brand-200 focus:border-brand-400'
    }`

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner */}
      <div className="bg-gradient-to-r from-brand-600 to-orange-600 text-white px-4 pt-6 pb-10">
        <div className="max-w-xl mx-auto">
          <h1 className="text-2xl font-bold">{profile ? 'My Profile' : 'Create Profile'}</h1>
          <p className="text-orange-100 text-sm mt-1">
            {profile ? 'Your saved contact info and listings.' : 'Set up your profile to speed up posting and renting.'}
          </p>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 sm:px-6 -mt-4 pb-10 space-y-4">

        {/* Avatar + name card (when not editing) */}
        {profile && !editing && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-brand-600 flex items-center justify-center text-white text-2xl font-bold shrink-0">
                {profile.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold text-gray-900">{profile.name}</p>
                {profile.location && <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">📍 {profile.location}</p>}
                {profile.bio && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{profile.bio}</p>}
              </div>
            </div>
            <div className="border-t border-gray-100 px-6 py-3 flex gap-4 text-sm">
              {profile.phone && <a href={`tel:${profile.phone}`} className="text-brand-600 hover:underline">📞 {profile.phone}</a>}
              {profile.email && <a href={`mailto:${profile.email}`} className="text-brand-600 hover:underline">✉️ {profile.email}</a>}
            </div>
          </div>
        )}

        {/* Quick links when profile exists */}
        {profile && !editing && (
          <div className="grid grid-cols-2 gap-3">
            <Link href="/profile/listings" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
              <span className="text-2xl">📋</span>
              <div>
                <p className="font-semibold text-gray-900 text-sm">My Listings</p>
                <p className="text-xs text-gray-400">Equipment you posted</p>
              </div>
            </Link>
            <Link href="/profile/requests" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
              <span className="text-2xl">📅</span>
              <div>
                <p className="font-semibold text-gray-900 text-sm">My Requests</p>
                <p className="text-xs text-gray-400">Rentals you requested</p>
              </div>
            </Link>
          </div>
        )}

        {/* Edit / create form */}
        {editing && (
          <form onSubmit={handleSave} noValidate className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50/60">
                <span className="w-7 h-7 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center shrink-0">1</span>
                <span className="font-semibold text-gray-900">👤 Basic Info</span>
              </div>
              <div className="px-5 py-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name <span className="text-red-500">*</span></label>
                  <input type="text" placeholder="Your name or business name" value={form.name} onChange={(e) => set('name', e.target.value)} className={inp('name')} />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Location</label>
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <input type="text" placeholder="City, ST" value={form.location} onChange={(e) => set('location', e.target.value)} className={inp('location', 'pl-9')} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Bio <span className="text-gray-400 font-normal text-xs">(optional)</span></label>
                  <textarea rows={2} placeholder="A little about yourself or your business…" value={form.bio} onChange={(e) => set('bio', e.target.value)} className={`${inp('bio')} resize-none`} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50/60">
                <span className="w-7 h-7 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center shrink-0">2</span>
                <span className="font-semibold text-gray-900">📞 Contact</span>
              </div>
              <div className="px-5 py-5 space-y-4">
                <p className="text-xs text-gray-500">Used to pre-fill forms when you post or request equipment.</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <input type="tel" placeholder="(406) 555-0100" value={form.phone} onChange={(e) => set('phone', e.target.value)} className={inp('phone', 'pl-9')} />
                    </div>
                    {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <input type="email" placeholder="you@example.com" value={form.email} onChange={(e) => set('email', e.target.value)} className={inp('email', 'pl-9')} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button type="submit" className="w-full py-4 bg-brand-600 text-white font-bold rounded-2xl hover:bg-brand-700 active:scale-[0.98] transition-all shadow-lg shadow-brand-600/20">
              {profile ? 'Save Changes →' : 'Create Profile →'}
            </button>
            {profile && (
              <button type="button" onClick={() => setEditing(false)} className="w-full py-3 border border-gray-200 text-gray-600 font-medium rounded-2xl hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            )}
          </form>
        )}

        {/* Edit / danger zone when not editing */}
        {profile && !editing && (
          <div className="space-y-3">
            {saved && (
              <div className="bg-green-50 border border-green-200 text-green-700 text-sm font-medium px-4 py-3 rounded-xl text-center">
                ✓ Profile saved
              </div>
            )}
            <button onClick={() => setEditing(true)} className="w-full py-3 border border-gray-200 text-gray-700 font-medium rounded-2xl hover:bg-gray-50 transition-colors">
              Edit Profile
            </button>
            <button onClick={handleClear} className="w-full py-3 text-red-400 text-sm hover:text-red-600 hover:underline transition-colors">
              Remove profile from this device
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
