import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function isAdminRequest(req: NextRequest): Promise<boolean> {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return false
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: { user } } = await sb.auth.getUser(token)
  if (!user) return false
  const { data } = await (sb.from('profiles') as any).select('role').eq('id', user.id).single()
  return data?.role === 'admin'
}
