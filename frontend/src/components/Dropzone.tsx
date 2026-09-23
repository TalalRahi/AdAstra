import { useRef, useState, type DragEvent } from 'react'

const ACCEPT = 'image/png,image/jpeg,image/webp,image/tiff'

interface Props {
  previewUrl: string | null
  fileName: string | null
  onFile: (file: File) => void
}

export default function Dropzone({ previewUrl, fileName, onFile }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const onDrop = (e: DragEvent) => {
    e.preventDefault() // stop the browser from opening the image itself
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault() // required, otherwise dropping is not allowed
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`relative grid min-h-72 place-items-center overflow-hidden rounded-lg border-2 border-dashed transition-colors ${
        dragging ? 'border-halpha bg-halpha/5' : 'border-line bg-panel/60'
      }`}
    >
      {previewUrl ? (
        <img src={previewUrl} alt={`Preview of ${fileName ?? 'uploaded image'}`} className="max-h-96 w-full object-contain" />
      ) : (
        <div className="px-6 py-10 text-center">
          <p className="font-display text-2xl">Drop a telescope image here</p>
          <p className="mt-2 text-sm text-muted">PNG, JPEG, WebP or TIFF. Large photos are shrunk before upload.</p>
        </div>
      )}
      <div className={previewUrl ? 'absolute bottom-3 right-3' : 'pb-8'}>
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="rounded-md border border-line bg-night/90 px-4 py-2 text-sm hover:border-muted"
        >
          {previewUrl ? 'Choose another image' : 'Choose an image'}
        </button>
      </div>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        aria-label="Choose an image file"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFile(file)
          e.target.value = '' // allows picking the same file again
        }}
      />
    </div>
  )
}