import { useState } from 'react'
import { useNavigate } from 'react-router'
import Dropzone from '../components/Dropzone'
import HealthBanner from '../components/HealthBanner'
import { classify } from '../lib/api'
import { prepareUpload } from '../lib/downscale'
import { LEVELS } from '../lib/format'
import { addToHistory, makeThumbnail } from '../lib/history'
import { useStore } from '../lib/store'
import type { Level } from '../lib/types'

export default function UploadPage() {
  const navigate = useNavigate()
  const { setAnalysis } = useStore()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [level, setLevel] = useState<Level>('beginner')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pick = (f: File) => {
    setError(null)
    setFile(f)
    // Browsers can't show TIFF, so no preview for it.
    setPreview(f.type === 'image/tiff' ? null : URL.createObjectURL(f))
  }

  const analyse = async () => {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const prepared = await prepareUpload(file)
      const result = await classify(prepared.blob, prepared.filename, level)
      if (prepared.resized) {
        result.warnings.unshift('The image was shrunk in your browser before upload.')
      }
      await addToHistory(result, file.name, await makeThumbnail(file)) // saved to your account
      setAnalysis(result, preview)
      navigate('/results')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_18rem]">
      <section>
        <h1 className="font-display text-4xl leading-tight sm:text-5xl">What is in your image?</h1>
        <p className="mt-3 max-w-xl text-muted">
          Upload a telescope or space image. AdAstra names the object, says how sure it is, and explains it
          using passages from astronomy sources.
        </p>
        <div className="mt-8">
          <Dropzone previewUrl={preview} fileName={file?.name ?? null} onFile={pick} />
          {file && !preview && <p className="mt-2 text-sm text-muted">Selected {file.name} (no preview for TIFF).</p>}
        </div>
      </section>

      <aside className="space-y-8 lg:pt-24">
        <fieldset>
          <legend className="font-display text-lg">Explanation level</legend>
          <div className="mt-3 space-y-2">
            {LEVELS.map((l) => (
              <label
                key={l.value}
                className={`block cursor-pointer rounded-md border px-3 py-2 ${
                  level === l.value ? 'border-halpha bg-halpha/10' : 'border-line hover:border-muted'
                }`}
              >
                <input
                  type="radio"
                  name="level"
                  value={l.value}
                  checked={level === l.value}
                  onChange={() => setLevel(l.value)}
                  className="sr-only"
                />
                <span className="block text-sm font-medium">{l.label}</span>
                <span className="block text-xs text-muted">{l.hint}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <button
            type="button"
            onClick={analyse}
            disabled={!file || busy}
            className="w-full rounded-md bg-halpha px-4 py-3 font-semibold text-night disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? 'Analysing… (up to 30 seconds)' : 'Analyse image'}
          </button>
          {error && (
            <p role="alert" className="mt-3 text-sm text-halpha">
              {error}
            </p>
          )}
        </div>

        <HealthBanner />
      </aside>
    </div>
  )
}