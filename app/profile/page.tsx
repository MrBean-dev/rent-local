'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { fetchProfile, upsertProfile } from '@/lib/db'
import { useAuth } from '@/components/AuthProvider'
import { uploadAvatar } from '@/lib/uploadImage'
import { createClient } from '@/lib/supabase'

interface Form { name: string; phone: string; location: string; bio: string }
interface Errors { [k: string]: string }
const blank: Form = { name: '', phone: '', location: '', bio: '' }

export default function ProfilePage() {
  const { user, loading, signOut } = useAuth()
  const [form, setForm]       = useState<Form>(blank)
  const [errors, setErrors]   = useState<Errors>({})
  const [saved, setSaved]     = useState(false)
  const [editing, setEditing] = useState(false)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user) return
    fetchProfile(user.id).then((p) => {
      if (p) {
        setForm({ name: p.name || '', phone: p.phone || '', location: p.location || '', bio: p.bio || '' })
        if (p.avatar_url) setAvatarUrl(p.avatar_url)
        setEditing(!p.name)
      } else {
        setEditing(true)
      }
      setProfileLoaded(true)
    })
  }, [user])

  function set(field: keyof Form, value: string) {
    setForm((p) => ({ ...p, [field]: value }))
    if (errors[field]) setErrors((p) => { const e = { ...p }; delete e[field]; return e })
  }

  function validate() {
    const e: Errors = {}
    if (!form.name.trim()) e.name = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploadingAvatar(true)
    try {
      const url = await uploadAvatar(user.id, file)
      setAvatarUrl(url)
      await (createClient().from('profiles') as any).update({ avatar_url: url }).eq('id', user.id)
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function handleSave(ev: React.FormEvent) {
    ev.preventDefault()
    if (!validate() || !user) return
    await upsertProfile(user.id, { name: form.name.trim(), phone: form.phone.trim(), location: form.location.trim(), bio: form.bio.trim() })
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const inp = (field: keyof Form, extra = '') =>
    `w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-colors ${extra} ${errors[field] ? 'border-red-400 bg-red-50 focus:ring-red-200' : 'border-gray-200 bg-white focus:ring-brand-200 focus:border-brand-400'}`

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>

  if (!user) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-5xl">👤</p>
      <p className="font-semibold text-gray-700 text-lg">Sign in to view your profile</p>
      <div className="flex gap-3 mt-2">
        <Link href="/login" className="px-5 py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors">Sign in</Link>
        <Link href="/register" className="px-5 py-3 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 transition-colors">Create account</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-brand-600 to-orange-600 text-white px-4 pt-6 pb-10">
        <div className="max-w-xl mx-auto">
          <h1 className="text-2xl font-bold">My Profile</h1>
          <p className="text-orange-100 text-sm mt-1">{user.email}</p>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 sm:px-6 -mt-4 pb-10 space-y-4">

        {/* Profile card */}
        {!editing && form.name && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 flex items-center gap-4">
              <div className="relative shrink-0">
                <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                <div className="w-16 h-16 rounded-full bg-brand-600 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                  {avatarUrl
                    ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    : form.name.charAt(0).toUpperCase()
                  }
                </div>
                <button
                  onClick={() => avatarRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute -bottom-1 -right-1 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-xs hover:bg-brand-700 transition-colors disabled:opacity-50"
                  title="Change photo"
                >
                  {uploadingAvatar ? '…' : '✏️'}
                </button>
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold text-gray-900">{form.name}</p>
                {form.location && <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">📍 {form.location}</p>}
                {form.bio && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{form.bio}</p>}
              </div>
            </div>
            {form.phone && (
              <div className="border-t border-gray-100 px-6 py-3 text-sm">
                <a href={`tel:${form.phone}`} className="text-brand-600 hover:underline">📞 {form.phone}</a>
              </div>
            )}
          </div>
        )}

        {/* Quick links */}
        {!editing && (
          <div className="grid grid-cols-2 gap-3">
            <Link href="/profile/listings" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
              <span className="text-2xl">📋</span>
              <div><p className="font-semibold text-gray-900 text-sm">My Listings</p><p className="text-xs text-gray-400">Equipment you posted</p></div>
            </Link>
            <Link href="/profile/requests" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
              <span className="text-2xl">📅</span>
              <div><p className="font-semibold text-gray-900 text-sm">My Requests</p><p className="text-xs text-gray-400">Rentals you requested</p></div>
            </Link>
            <Link href="/profile/services" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
              <span className="text-2xl">👷</span>
              <div><p className="font-semibold text-gray-900 text-sm">My Services</p><p className="text-xs text-gray-400">Services you offer</p></div>
            </Link>
            <Link href="/profile/hire-requests" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
              <span className="text-2xl">🤝</span>
              <div><p className="font-semibold text-gray-900 text-sm">My Hire Requests</p><p className="text-xs text-gray-400">Services you've requested</p></div>
            </Link>
          </div>
        )}

        {/* Edit form */}
        {editing && (
          <form onSubmit={handleSave} noValidate className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50/60">
                <span className="font-semibold text-gray-900">👤 Your Info</span>
              </div>
              <div className="px-5 py-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Display Name <span className="text-red-500">*</span></label>
                  <input type="text" placeholder="Your name or business name" value={form.name} onChange={(e) => set('name', e.target.value)} className={inp('name')} />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                  <input type="tel" placeholder="(406) 555-0100" value={form.phone} onChange={(e) => set('phone', e.target.value)} className={inp('phone')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Location</label>
                  <input type="text" placeholder="City, ST" value={form.location} onChange={(e) => set('location', e.target.value)} className={inp('location')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Bio <span className="text-gray-400 font-normal text-xs">(optional)</span></label>
                  <textarea rows={2} placeholder="A little about yourself or your business…" value={form.bio} onChange={(e) => set('bio', e.target.value)} className={`${inp('bio')} resize-none`} />
                </div>
              </div>
            </div>
            <button type="submit" className="w-full py-4 bg-brand-600 text-white font-bold rounded-2xl hover:bg-brand-700 active:scale-[0.98] transition-all shadow-lg shadow-brand-600/20">
              Save Profile →
            </button>
            {form.name && <button type="button" onClick={() => setEditing(false)} className="w-full py-3 border border-gray-200 text-gray-600 font-medium rounded-2xl hover:bg-gray-50 transition-colors">Cancel</button>}
          </form>
        )}

        {/* Actions */}
        {!editing && (
          <div className="space-y-3">
            {saved && <div className="bg-green-50 border border-green-200 text-green-700 text-sm font-medium px-4 py-3 rounded-xl text-center">✓ Profile saved</div>}
            <button onClick={() => setEditing(true)} className="w-full py-3 border border-gray-200 text-gray-700 font-medium rounded-2xl hover:bg-gray-50 transition-colors">Edit Profile</button>
            <button onClick={signOut} className="w-full py-3 text-red-400 text-sm hover:text-red-600 hover:underline transition-colors">Sign out</button>
          </div>
        )}
      </div>
    </div>
  )
}
