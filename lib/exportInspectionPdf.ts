import type { RentalInspection } from './types'

export async function exportInspectionPdf(inspection: RentalInspection, listingTitle: string) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })

  const PAGE_W   = 612
  const PAGE_H   = 792
  const MARGIN   = 40
  const COL_W    = PAGE_W - MARGIN * 2
  const BRAND    = '#f05b00'
  const DARK     = '#111827'
  const MUTED    = '#6b7280'
  const LIGHT    = '#f9fafb'

  let y = 0

  function newPage() {
    doc.addPage()
    y = MARGIN
  }

  function checkSpace(needed: number) {
    if (y + needed > PAGE_H - MARGIN) newPage()
  }

  // ── Header banner ──────────────────────────────────────
  doc.setFillColor(BRAND)
  doc.rect(0, 0, PAGE_W, 72, 'F')

  doc.setTextColor('#ffffff')
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('RentLocal', MARGIN, 30)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text('Pre-Rental Inspection Report', MARGIN, 50)

  y = 90

  // ── Equipment info box ─────────────────────────────────
  doc.setFillColor(LIGHT)
  doc.roundedRect(MARGIN, y, COL_W, 80, 6, 6, 'F')

  doc.setTextColor(MUTED)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('EQUIPMENT', MARGIN + 16, y + 18)
  doc.text('RENTER', MARGIN + 16, y + 42)
  doc.text('DATE', MARGIN + 16, y + 62)

  doc.setTextColor(DARK)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(listingTitle, MARGIN + 110, y + 18)
  doc.setFont('helvetica', 'normal')
  doc.text(inspection.renterName, MARGIN + 110, y + 42)
  doc.text(new Date(inspection.createdAt).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  }), MARGIN + 110, y + 62)

  y += 96

  // ── Photo count ────────────────────────────────────────
  doc.setTextColor(MUTED)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`${inspection.photos.length} photo${inspection.photos.length !== 1 ? 's' : ''} documented`, MARGIN, y)
  y += 20

  // ── Photos ─────────────────────────────────────────────
  const PHOTO_W  = (COL_W - 12) / 2
  const PHOTO_H  = PHOTO_W * 0.65
  const NOTE_H   = 28

  for (let i = 0; i < inspection.photos.length; i++) {
    const photo = inspection.photos[i]
    const col   = i % 2
    const x     = MARGIN + col * (PHOTO_W + 12)

    if (col === 0) {
      checkSpace(PHOTO_H + NOTE_H + 16)
      if (i > 0) y += 8
    }

    // Photo border
    doc.setDrawColor('#e5e7eb')
    doc.setLineWidth(1)
    doc.roundedRect(x, y, PHOTO_W, PHOTO_H, 4, 4, 'S')

    // Embed image
    try {
      const imgData = photo.dataUrl
      const fmt     = imgData.startsWith('data:image/png') ? 'PNG' : 'JPEG'
      doc.addImage(imgData, fmt, x + 1, y + 1, PHOTO_W - 2, PHOTO_H - 2, undefined, 'FAST')
    } catch {
      // If image fails, show placeholder
      doc.setFillColor('#f3f4f6')
      doc.rect(x + 1, y + 1, PHOTO_W - 2, PHOTO_H - 2, 'F')
      doc.setTextColor(MUTED)
      doc.setFontSize(9)
      doc.text('Photo unavailable', x + PHOTO_W / 2, y + PHOTO_H / 2, { align: 'center' })
    }

    // Photo number badge
    doc.setFillColor(BRAND)
    doc.roundedRect(x + 6, y + 6, 22, 16, 3, 3, 'F')
    doc.setTextColor('#ffffff')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(String(i + 1), x + 17, y + 17, { align: 'center' })

    // Note below photo
    const noteY = y + PHOTO_H + 6
    if (photo.note) {
      doc.setFillColor('#fff7ed')
      doc.roundedRect(x, noteY, PHOTO_W, NOTE_H - 4, 3, 3, 'F')
      doc.setTextColor('#92400e')
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'normal')
      const lines = doc.splitTextToSize(photo.note, PHOTO_W - 12)
      doc.text(lines[0], x + 6, noteY + 11)
      if (lines[1]) doc.text(lines[1], x + 6, noteY + 21)
    } else {
      doc.setTextColor(MUTED)
      doc.setFontSize(8)
      doc.text('No notes', x + 6, noteY + 11)
    }

    // Advance y after right column or last photo
    if (col === 1 || i === inspection.photos.length - 1) {
      y += PHOTO_H + NOTE_H + 4
    }
  }

  // ── Footer on every page ───────────────────────────────
  const totalPages = (doc as any).internal.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setDrawColor('#e5e7eb')
    doc.setLineWidth(0.5)
    doc.line(MARGIN, PAGE_H - 32, PAGE_W - MARGIN, PAGE_H - 32)
    doc.setTextColor(MUTED)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('RentLocal — Pre-Rental Inspection Report', MARGIN, PAGE_H - 18)
    doc.text(`Page ${p} of ${totalPages}`, PAGE_W - MARGIN, PAGE_H - 18, { align: 'right' })
    doc.text(`Generated ${new Date().toLocaleDateString()}`, PAGE_W / 2, PAGE_H - 18, { align: 'center' })
  }

  const filename = `inspection-${listingTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${inspection.renterName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`
  doc.save(filename)
}
