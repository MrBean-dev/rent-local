'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import { createClient } from '@/lib/supabase'
import { formatPrice } from '@/lib/utils'

interface Stats {
  users: { total: number; recent: number }
  listings: { total: number; available: number; recent: number }
  requests: { total: number; pending: number; approved: number }
  reviews: { total: number }
  messages: { total: number }
}

interface UserRow {
  id: string; email: string; name: string; location: string
  role: string; createdAt: string; lastSignIn: string; banned: boolean
}

interface ListingRow {
  id: string; title: string; category: string; price_per_day: number
  location: string; available: boolean; created_at: string
  profiles: { name: string }
}

interface ServiceRow {
  id: string; title: string; category: string; rate: number; rate_type: string
  location: string; available: boolean; created_at: string
  profiles: { name: string }
}

type Tab = 'overview' | 'users' | 'listings' | 'services'

function StatCard({ label, value, sub, icon, color }: { label: string; value: number; sub?: string; icon: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value.toLocaleString()}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <span className={`text-3xl p-2 rounded-xl ${color}`}>{icon}</span>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const { user, loading } = useAuth()
  const [isAdmin, setIsAdmin]   = useState<boolean | null>(null)
  const [tab, setTab]           = useState<Tab>('overview')
  const [stats, setStats]       = useState<Stats | null>(null)
  const [users, setUsers]           = useState<UserRow[]>([])
  const [listings, setListings]     = useState<ListingRow[]>([])
  const [services, setServices]     = useState<ServiceRow[]>([])
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [search, setSearch]         = useState('')

  async function adminFetch(url: string, init?: RequestInit) {
    const { data: { session } } = await createClient().auth.getSession()
    return fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers, 'Authorization': `Bearer ${session?.access_token ?? ''}` },
    })
  }

  // Check admin role
  useEffect(() => {
    if (!user) return
    ;(createClient().from('profiles') as any)
      .select('role')
      .eq('id', user.id)
      .single()
      .then(({ data }: any) => setIsAdmin(data?.role === 'admin'))
  }, [user])

  // Load stats
  useEffect(() => {
    if (!isAdmin) return
    adminFetch('/api/admin/stats').then((r) => r.json()).then(setStats)
  }, [isAdmin])

  // Load tab data
  useEffect(() => {
    if (!isAdmin) return
    if (tab === 'users' && users.length === 0) {
      adminFetch('/api/admin/users').then((r) => r.json()).then(setUsers)
    }
    if (tab === 'listings' && listings.length === 0) {
      adminFetch('/api/admin/listings').then((r) => r.json()).then(setListings)
    }
    if (tab === 'services' && services.length === 0) {
      adminFetch('/api/admin/services').then((r) => r.json()).then(setServices)
    }
  }, [tab, isAdmin])

  async function userAction(userId: string, action: string) {
    setActionLoading(`${userId}-${action}`)
    await adminFetch('/api/admin/users', { method: 'POST', body: JSON.stringify({ userId, action }) })
    adminFetch('/api/admin/users').then((r) => r.json()).then(setUsers)
    setActionLoading(null)
  }

  async function listingAction(listingId: string, action: string) {
    setActionLoading(`${listingId}-${action}`)
    await adminFetch('/api/admin/listings', { method: 'POST', body: JSON.stringify({ listingId, action }) })
    adminFetch('/api/admin/listings').then((r) => r.json()).then(setListings)
    setActionLoading(null)
  }

  async function serviceAction(serviceId: string, action: string) {
    setActionLoading(`${serviceId}-${action}`)
    await adminFetch('/api/admin/services', { method: 'POST', body: JSON.stringify({ serviceId, action }) })
    adminFetch('/api/admin/services').then((r) => r.json()).then(setServices)
    setActionLoading(null)
  }

  if (loading || isAdmin === null) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>
  )

  if (!user || !isAdmin) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-5xl">🔒</p>
      <p className="text-xl font-bold text-gray-900">Admin access only</p>
      <Link href="/" className="text-sm text-brand-600 hover:underline">← Back to home</Link>
    </div>
  )

  const filteredUsers = users.filter((u) =>
    !search || u.email.toLowerCase().includes(search.toLowerCase()) || u.name.toLowerCase().includes(search.toLowerCase())
  )
  const filteredListings = listings.filter((l) =>
    !search || l.title.toLowerCase().includes(search.toLowerCase()) || l.profiles?.name?.toLowerCase().includes(search.toLowerCase())
  )
  const filteredServices = services.filter((s) =>
    !search || s.title.toLowerCase().includes(search.toLowerCase()) || s.profiles?.name?.toLowerCase().includes(search.toLowerCase())
  )

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'overview',  label: 'Overview',  icon: '📊' },
    { id: 'users',     label: 'Users',     icon: '👥' },
    { id: 'listings',  label: 'Equipment', icon: '📋' },
    { id: 'services',  label: 'Services',  icon: '👷' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-700 text-white px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">RentLocal</p>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            </div>
            <Link href="/" className="text-sm text-gray-300 hover:text-white transition-colors">← Back to app</Link>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-6">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setSearch('') }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === t.id ? 'bg-white text-gray-900' : 'text-gray-300 hover:bg-white/10'}`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* Overview */}
        {tab === 'overview' && (
          <div className="space-y-6">
            {stats ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  <StatCard label="Total Users"    value={stats.users.total}     sub={`+${stats.users.recent} this month`}     icon="👥" color="bg-blue-50" />
                  <StatCard label="Listings"       value={stats.listings.total}  sub={`${stats.listings.available} available`} icon="📋" color="bg-orange-50" />
                  <StatCard label="Requests"       value={stats.requests.total}  sub={`${stats.requests.pending} pending`}     icon="📅" color="bg-yellow-50" />
                  <StatCard label="Reviews"        value={stats.reviews.total}   icon="⭐" color="bg-amber-50" />
                  <StatCard label="Messages"       value={stats.messages.total}  icon="💬" color="bg-green-50" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <p className="text-sm font-semibold text-gray-500 mb-3">Request Status</p>
                    <div className="space-y-2">
                      {[
                        { label: 'Pending',  count: stats.requests.pending,  color: 'bg-yellow-400' },
                        { label: 'Approved', count: stats.requests.approved, color: 'bg-green-500' },
                        { label: 'Declined', count: stats.requests.total - stats.requests.pending - stats.requests.approved, color: 'bg-red-400' },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center gap-3">
                          <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                          <span className="text-sm text-gray-600 flex-1">{item.label}</span>
                          <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <p className="text-sm font-semibold text-gray-500 mb-3">Listing Health</p>
                    <div className="space-y-2">
                      {[
                        { label: 'Available',   count: stats.listings.available,                         color: 'bg-green-500' },
                        { label: 'Unavailable', count: stats.listings.total - stats.listings.available,  color: 'bg-gray-400' },
                        { label: 'New (30d)',   count: stats.listings.recent,                            color: 'bg-blue-500' },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center gap-3">
                          <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                          <span className="text-sm text-gray-600 flex-1">{item.label}</span>
                          <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <p className="text-sm font-semibold text-gray-500 mb-3">Quick Actions</p>
                    <div className="space-y-2">
                      <button onClick={() => setTab('users')}    className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-gray-50 text-brand-600 font-medium transition-colors">Manage users →</button>
                      <button onClick={() => setTab('listings')} className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-gray-50 text-brand-600 font-medium transition-colors">Manage listings →</button>
                      <Link href="/listings" className="block text-sm px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors">View public site →</Link>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-20 text-gray-400">Loading stats…</div>
            )}
          </div>
        )}

        {/* Users */}
        {tab === 'users' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Search users by name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
              <span className="text-sm text-gray-500 shrink-0">{filteredUsers.length} users</span>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">User</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600 hidden sm:table-cell">Location</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600 hidden md:table-cell">Joined</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Role</th>
                    <th className="text-right px-5 py-3 font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className={u.banned ? 'bg-red-50/40' : ''}>
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-900">{u.name || <span className="text-gray-400 italic">No name</span>}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </td>
                      <td className="px-5 py-3 text-gray-500 hidden sm:table-cell">{u.location || '—'}</td>
                      <td className="px-5 py-3 text-gray-400 hidden md:table-cell">
                        {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : u.banned ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                          {u.banned ? 'Banned' : u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          {u.id !== user.id && (
                            <>
                              {u.banned ? (
                                <button onClick={() => userAction(u.id, 'unban')} disabled={actionLoading === `${u.id}-unban`} className="text-xs text-green-600 hover:underline disabled:opacity-50">Unban</button>
                              ) : (
                                <button onClick={() => userAction(u.id, 'ban')} disabled={actionLoading === `${u.id}-ban`} className="text-xs text-red-500 hover:underline disabled:opacity-50">Ban</button>
                              )}
                              {u.role === 'admin' ? (
                                <button onClick={() => userAction(u.id, 'remove_admin')} disabled={actionLoading === `${u.id}-remove_admin`} className="text-xs text-gray-500 hover:underline disabled:opacity-50">Remove admin</button>
                              ) : (
                                <button onClick={() => userAction(u.id, 'make_admin')} disabled={actionLoading === `${u.id}-make_admin`} className="text-xs text-purple-600 hover:underline disabled:opacity-50">Make admin</button>
                              )}
                            </>
                          )}
                          {u.id === user.id && <span className="text-xs text-gray-400">You</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Listings */}
        {tab === 'listings' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Search listings by title or owner…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
              <span className="text-sm text-gray-500 shrink-0">{filteredListings.length} listings</span>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Listing</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600 hidden sm:table-cell">Owner</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600 hidden md:table-cell">Price</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Status</th>
                    <th className="text-right px-5 py-3 font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredListings.map((l) => (
                    <tr key={l.id}>
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-900 truncate max-w-[180px]">{l.title}</p>
                        <p className="text-xs text-gray-400">📍 {l.location}</p>
                      </td>
                      <td className="px-5 py-3 text-gray-500 hidden sm:table-cell">{l.profiles?.name || '—'}</td>
                      <td className="px-5 py-3 text-gray-700 hidden md:table-cell font-medium">{formatPrice(l.price_per_day)}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${l.available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {l.available ? 'Available' : 'Hidden'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-3">
                          <Link href={`/listings/${l.id}`} className="text-xs text-brand-600 hover:underline" target="_blank">View</Link>
                          {l.available ? (
                            <button onClick={() => listingAction(l.id, 'hide')} disabled={actionLoading === `${l.id}-hide`} className="text-xs text-yellow-600 hover:underline disabled:opacity-50">Hide</button>
                          ) : (
                            <button onClick={() => listingAction(l.id, 'show')} disabled={actionLoading === `${l.id}-show`} className="text-xs text-green-600 hover:underline disabled:opacity-50">Show</button>
                          )}
                          <button onClick={() => listingAction(l.id, 'delete')} disabled={actionLoading === `${l.id}-delete`} className="text-xs text-red-500 hover:underline disabled:opacity-50">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Services */}
        {tab === 'services' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Search services by title or provider…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
              <span className="text-sm text-gray-500 shrink-0">{filteredServices.length} services</span>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Service</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600 hidden sm:table-cell">Provider</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600 hidden md:table-cell">Rate</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Status</th>
                    <th className="text-right px-5 py-3 font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredServices.map((s) => (
                    <tr key={s.id}>
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-900 truncate max-w-[180px]">{s.title}</p>
                        <p className="text-xs text-gray-400">📍 {s.location}</p>
                      </td>
                      <td className="px-5 py-3 text-gray-500 hidden sm:table-cell">{s.profiles?.name || '—'}</td>
                      <td className="px-5 py-3 text-gray-700 hidden md:table-cell font-medium">${s.rate}/{s.rate_type === 'per_job' ? 'job' : 'hr'}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${s.available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {s.available ? 'Available' : 'Hidden'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-3">
                          <Link href={`/services/${s.id}`} className="text-xs text-teal-600 hover:underline" target="_blank">View</Link>
                          {s.available ? (
                            <button onClick={() => serviceAction(s.id, 'hide')} disabled={actionLoading === `${s.id}-hide`} className="text-xs text-yellow-600 hover:underline disabled:opacity-50">Hide</button>
                          ) : (
                            <button onClick={() => serviceAction(s.id, 'show')} disabled={actionLoading === `${s.id}-show`} className="text-xs text-green-600 hover:underline disabled:opacity-50">Show</button>
                          )}
                          <button onClick={() => serviceAction(s.id, 'delete')} disabled={actionLoading === `${s.id}-delete`} className="text-xs text-red-500 hover:underline disabled:opacity-50">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
