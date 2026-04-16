import { createClient } from './supabase'

function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
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
      canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.72)
    }
    img.src = url
  })
}

export async function uploadListingImage(userId: string, file: File): Promise<string> {
  const blob = await compressImage(file)
  const ext = 'jpg'
  const path = `${userId}/${Date.now()}.${ext}`
  const supabase = createClient()

  const { error } = await supabase.storage
    .from('listings')
    .upload(path, blob, { contentType: 'image/jpeg', upsert: false })

  if (error) throw error

  const { data } = supabase.storage.from('listings').getPublicUrl(path)
  return data.publicUrl
}

export async function deleteListingImage(imageUrl: string): Promise<void> {
  // Extract path from URL: .../storage/v1/object/public/listings/{path}
  const match = imageUrl.match(/\/listings\/(.+)$/)
  if (!match) return
  const supabase = createClient()
  await supabase.storage.from('listings').remove([match[1]])
}
