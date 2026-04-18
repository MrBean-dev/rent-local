import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'RentLocal <onboarding@resend.dev>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

function base(title: string, body: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
    <div style="background:linear-gradient(135deg,#f05b00,#ea580c);padding:28px 32px">
      <p style="margin:0;color:#fff;font-size:22px;font-weight:700">🔧 RentLocal</p>
    </div>
    <div style="padding:32px">
      <h1 style="margin:0 0 16px;font-size:20px;color:#111827">${title}</h1>
      ${body}
    </div>
    <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #f3f4f6">
      <p style="margin:0;font-size:12px;color:#9ca3af">RentLocal — Equipment Rentals Near You</p>
    </div>
  </div>
</body>
</html>`
}

function btn(label: string, url: string) {
  return `<a href="${url}" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#f05b00;color:#fff;font-weight:700;font-size:14px;border-radius:10px;text-decoration:none">${label}</a>`
}

function detail(label: string, value: string) {
  return `<tr><td style="padding:6px 0;color:#6b7280;font-size:14px;width:130px">${label}</td><td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600">${value}</td></tr>`
}

function table(rows: string) {
  return `<table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:10px;padding:8px;margin:16px 0"><tbody>${rows}</tbody></table>`
}

// ── Email senders ──────────────────────────────────────────

export async function sendRequestReceived(opts: {
  ownerEmail: string; ownerName: string; renterName: string
  listingTitle: string; startDate: string; endDate: string
  message: string; listingId: string; requestId: string
}) {
  const days = Math.max(1, Math.round((new Date(opts.endDate).getTime() - new Date(opts.startDate).getTime()) / 86400000) + 1)
  await resend.emails.send({
    from: FROM,
    to: opts.ownerEmail,
    subject: `New rental request for "${opts.listingTitle}"`,
    html: base(
      `New Request from ${opts.renterName}`,
      `<p style="color:#374151;font-size:15px">Someone wants to rent your equipment!</p>
      ${table(
        detail('Equipment', opts.listingTitle) +
        detail('Renter', opts.renterName) +
        detail('Dates', `${opts.startDate} → ${opts.endDate}`) +
        detail('Duration', `${days} day${days !== 1 ? 's' : ''}`) +
        (opts.message ? detail('Message', opts.message) : '')
      )}
      ${btn('Review Request →', `${APP_URL}/listings/${opts.listingId}/requests`)}`
    ),
  })
}

export async function sendRequestStatusUpdate(opts: {
  renterEmail: string; renterName: string; ownerName: string
  listingTitle: string; status: 'approved' | 'declined'
  startDate: string; endDate: string; listingId: string; requestId: string
}) {
  const approved = opts.status === 'approved'
  await resend.emails.send({
    from: FROM,
    to: opts.renterEmail,
    subject: `Your request for "${opts.listingTitle}" was ${opts.status}`,
    html: base(
      approved ? `🎉 Request Approved!` : `Request Declined`,
      `<p style="color:#374151;font-size:15px">
        ${approved
          ? `<strong>${opts.ownerName}</strong> approved your rental request.`
          : `Unfortunately, <strong>${opts.ownerName}</strong> declined your request.`}
      </p>
      ${table(
        detail('Equipment', opts.listingTitle) +
        detail('Owner', opts.ownerName) +
        detail('Dates', `${opts.startDate} → ${opts.endDate}`)
      )}
      ${approved
        ? btn('View Listing & Pickup Info →', `${APP_URL}/listings/${opts.listingId}`)
        : btn('Browse Other Equipment →', `${APP_URL}/listings`)}`
    ),
  })
}

export async function sendServiceRequestReceived(opts: {
  providerEmail: string; providerName: string; hirerName: string
  serviceTitle: string; startDate: string; endDate: string
  message: string; serviceId: string
}) {
  await resend.emails.send({
    from: FROM,
    to: opts.providerEmail,
    subject: `New hire request for "${opts.serviceTitle}"`,
    html: base(
      `New Request from ${opts.hirerName}`,
      `<p style="color:#374151;font-size:15px">Someone wants to hire you!</p>
      ${table(
        detail('Service', opts.serviceTitle) +
        detail('From', opts.hirerName) +
        detail('Dates', `${opts.startDate} → ${opts.endDate}`) +
        (opts.message ? detail('Message', opts.message) : '')
      )}
      ${btn('Review Request →', `${APP_URL}/services/${opts.serviceId}/requests`)}`
    ),
  })
}

export async function sendServiceRequestStatusUpdate(opts: {
  hirerEmail: string; hirerName: string; providerName: string
  serviceTitle: string; status: 'approved' | 'declined'
  startDate: string; endDate: string; serviceId: string; requestId: string
}) {
  const approved = opts.status === 'approved'
  await resend.emails.send({
    from: FROM,
    to: opts.hirerEmail,
    subject: `Your request for "${opts.serviceTitle}" was ${opts.status}`,
    html: base(
      approved ? `🎉 Hire Request Approved!` : `Hire Request Declined`,
      `<p style="color:#374151;font-size:15px">
        ${approved
          ? `<strong>${opts.providerName}</strong> approved your hire request.`
          : `Unfortunately, <strong>${opts.providerName}</strong> declined your request.`}
      </p>
      ${table(
        detail('Service', opts.serviceTitle) +
        detail('Provider', opts.providerName) +
        detail('Dates', `${opts.startDate} → ${opts.endDate}`)
      )}
      ${approved
        ? btn('Message Provider →', `${APP_URL}/services/messages/${opts.requestId}`)
        : btn('Browse Other Services →', `${APP_URL}/services`)}`
    ),
  })
}

export async function sendNewMessage(opts: {
  recipientEmail: string; recipientName: string; senderName: string
  listingTitle: string; messagePreview: string; requestId: string
}) {
  await resend.emails.send({
    from: FROM,
    to: opts.recipientEmail,
    subject: `New message from ${opts.senderName}`,
    html: base(
      `Message from ${opts.senderName}`,
      `<p style="color:#374151;font-size:15px">You have a new message about <strong>${opts.listingTitle}</strong>.</p>
      <div style="background:#f9fafb;border-left:3px solid #f05b00;padding:12px 16px;border-radius:0 8px 8px 0;margin:16px 0">
        <p style="margin:0;color:#374151;font-size:14px;font-style:italic">"${opts.messagePreview}"</p>
      </div>
      ${btn('Reply →', `${APP_URL}/messages/${opts.requestId}`)}`
    ),
  })
}
