// Vercel rejects request bodies over 4.5 MB, so large photos are shrunk in the
// browser before upload. Small files are sent untouched.

export const MAX_SIDE = 1600
export const MAX_BYTES = 3_800_000
const CANVAS_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export interface Prepared {
  blob: Blob
  filename: string
  resized: boolean
}

/** The size that fits inside MAX_SIDE while keeping the shape. */
export function fitWithin(width: number, height: number, maxSide = MAX_SIDE) {
  const scale = Math.min(1, maxSide / Math.max(width, height))
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

export async function prepareUpload(file: File): Promise<Prepared> {
  // Browsers can't draw TIFF on a canvas, so TIFFs go as-is (server caps at 4 MB).
  if (!CANVAS_TYPES.includes(file.type)) {
    if (file.size > MAX_BYTES) {
      throw new Error('This TIFF is over 3.8 MB. Convert it to PNG or JPEG, or crop it first.')
    }
    return { blob: file, filename: file.name, resized: false }
  }

  const bitmap = await createImageBitmap(file)
  const target = fitWithin(bitmap.width, bitmap.height)
  const needsResize = target.width !== bitmap.width || target.height !== bitmap.height
  if (!needsResize && file.size <= MAX_BYTES) {
    bitmap.close()
    return { blob: file, filename: file.name, resized: false }
  }

  // Draw the image smaller on an invisible canvas, then save it as JPEG.
  const canvas = document.createElement('canvas')
  canvas.width = target.width
  canvas.height = target.height
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, target.width, target.height)
  bitmap.close()

  // Try lower JPEG quality until it fits.
  for (const quality of [0.9, 0.8, 0.7, 0.6]) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    )
    if (blob && blob.size <= MAX_BYTES) {
      const base = file.name.replace(/\.[^.]+$/, '')
      return { blob, filename: `${base}.jpg`, resized: true }
    }
  }
  throw new Error('Could not shrink this image below 3.8 MB.')
}