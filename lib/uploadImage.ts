import { createClient } from './supabase'
import { redactPhoneNumbers } from './redactImage'

async function compressBlob(blob: Blob): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(blob)
    img.onload = () => {
      const MAX = 1200
      let { width, height } = img
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round((height * MAX) / width); width = MAX }
        else { width = Math.round((width * MAX) / height); height = MAX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(url)
      canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.72)
    }
    img.src = url
  })
}

export async function uploadListingImage(
  userId: string,
  file: File,
  onProgress?: (stage: string, pct?: number) => void
): Promise<{ url: string; redacted: number }> {
  // Step 1: OCR scan + redact phone numbers
  onProgress?.('Scanning for contact info…', 0)
  const { blob: redactedBlob, redacted } = await redactPhoneNumbers(file, (pct) => {
    onProgress?.('Scanning for contact info…', pct)
  })

  // Step 2: Compress
  onProgress?.('Compressing…')
  const blob = await compressBlob(redactedBlob)
  const path = `${userId}/${Date.now()}.jpg`
  const supabase = createClient()

  // Step 3: Upload
  onProgress?.('Uploading…')
  const { error } = await supabase.storage
    .from('listings')
    .upload(path, blob, { contentType: 'image/jpeg', upsert: false })

  if (error) throw error

  const { data } = supabase.storage.from('listings').getPublicUrl(path)
  return { url: data.publicUrl, redacted }
}

export async function deleteListingImage(imageUrl: string): Promise<void> {
  // Extract path from URL: .../storage/v1/object/public/listings/{path}
  const match = imageUrl.match(/\/listings\/(.+)$/)
  if (!match) return
  const supabase = createClient()
  await supabase.storage.from('listings').remove([match[1]])
}
