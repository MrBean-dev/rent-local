// Detects phone numbers in an image using OCR and blurs those regions.
// Returns a new canvas with any phone numbers blurred out.

const PHONE_PATTERN = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g

interface Box { x0: number; y0: number; x1: number; y1: number }

export async function redactPhoneNumbers(
  file: File,
  onProgress?: (pct: number) => void
): Promise<{ blob: Blob; redacted: number }> {
  // Draw original image onto a canvas
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width  = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0)

  // Lazy-load Tesseract so it doesn't bloat the initial bundle
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng', 1, {
    logger: (m: any) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100))
      }
    },
  })

  const { data } = await worker.recognize(canvas)
  await worker.terminate()

  // Collect bounding boxes of words that look like phone numbers
  const boxes: Box[] = []
  const fullText = data.text

  // Check if the full text contains a phone number
  if (!PHONE_PATTERN.test(fullText)) {
    // No phone numbers found — return original compressed image
    const blob = await canvasToBlob(canvas)
    return { blob, redacted: 0 }
  }

  // Find word-level bounding boxes that are part of phone patterns
  // Tesseract returns words; phone numbers may span multiple words
  // We'll blur any word whose text contributes to a phone number match
  PHONE_PATTERN.lastIndex = 0

  // Build a char-indexed map of which chars are inside a phone match
  const phoneChars = new Set<number>()
  let match: RegExpExecArray | null
  while ((match = PHONE_PATTERN.exec(fullText)) !== null) {
    for (let i = match.index; i < match.index + match[0].length; i++) {
      phoneChars.add(i)
    }
  }

  // Walk words and find those whose text offset overlaps with phone chars
  let offset = 0
  for (const block of data.blocks ?? []) {
    for (const para of block.paragraphs ?? []) {
      for (const line of para.lines ?? []) {
        for (const word of line.words ?? []) {
          const wordStart = fullText.indexOf(word.text, offset)
          if (wordStart !== -1) {
            const wordEnd = wordStart + word.text.length
            let overlaps = false
            for (let i = wordStart; i < wordEnd; i++) {
              if (phoneChars.has(i)) { overlaps = true; break }
            }
            if (overlaps && word.bbox) {
              boxes.push({
                x0: word.bbox.x0,
                y0: word.bbox.y0,
                x1: word.bbox.x1,
                y1: word.bbox.y1,
              })
              offset = wordEnd
            }
          }
        }
      }
    }
  }

  // Blur each box by pixelating: scale down then scale back up
  for (const box of boxes) {
    const pad = 6
    const x = Math.max(0, box.x0 - pad)
    const y = Math.max(0, box.y0 - pad)
    const w = Math.min(canvas.width  - x, (box.x1 - box.x0) + pad * 2)
    const h = Math.min(canvas.height - y, (box.y1 - box.y0) + pad * 2)
    if (w <= 0 || h <= 0) continue

    // Pixelate by drawing at 1/8 size then scaling back up
    const tmp = document.createElement('canvas')
    const SCALE = 8
    tmp.width  = Math.max(1, Math.round(w / SCALE))
    tmp.height = Math.max(1, Math.round(h / SCALE))
    const tctx = tmp.getContext('2d')!
    tctx.drawImage(canvas, x, y, w, h, 0, 0, tmp.width, tmp.height)

    ctx.save()
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(tmp, 0, 0, tmp.width, tmp.height, x, y, w, h)
    ctx.restore()

    // Dark overlay so it's clearly redacted
    ctx.save()
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(x, y, w, h)
    ctx.restore()
  }

  const blob = await canvasToBlob(canvas)
  return { blob, redacted: boxes.length }
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => b ? resolve(b) : reject(new Error('canvas toBlob failed')), 'image/jpeg', 0.82)
  })
}
