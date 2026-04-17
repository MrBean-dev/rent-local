import { NextRequest, NextResponse } from 'next/server'
import { sendNewMessage } from '@/lib/email'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    let recipientEmail = body.recipientEmail
    let recipientName  = body.recipientName ?? ''

    if (body.recipientId && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
      const { data: userData } = await admin.auth.admin.getUserById(body.recipientId)
      if (userData.user?.email) recipientEmail = userData.user.email

      // Get display name from profiles
      const { data: profile } = await (admin.from('profiles') as any)
        .select('name')
        .eq('id', body.recipientId)
        .single()
      if (profile?.name) recipientName = profile.name
    }

    if (!recipientEmail) return NextResponse.json({ ok: true }) // no email, skip silently

    await sendNewMessage({ ...body, recipientEmail, recipientName })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
