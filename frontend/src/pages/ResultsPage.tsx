import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import ProbabilityList from '../components/ProbabilityList'
import RichText from '../components/RichText'
import { explain } from '../lib/api'
import { LEVELS, pct } from '../lib/format'
import { findThumbnail } from '../lib/history'
import { useStore } from '../lib/store'
import type { ExplainResponse, Level } from '../lib/types'

export default function ResultsPage() {
  const { result, previewUrl, clear } = useStore()
  const navigate = useNavigate()
  const sourcesRef = useRef<HTMLOListElement>(null)

  // One explanation per level, fetched the first time that level is chosen.
  const [byLevel, setByLevel] = useState<Partial<Record<Level, ExplainResponse>>>(() =>
    result
      ? { [result.explanation.level]: { explanation: result.explanation, sources: result.sources, warnings: [] } }
      : {},
  )
  const [level, setLevel] = useState<Level>(result?.explanation.level ?? 'beginner')
  const [loadingLevel, setLoadingLevel] = useState<Level | null>(null)
  const [explainError, setExplainError] = useState<string | null>(null)

  if (!result) {
    return (
      <div className="py-16">
        <h1 className="font-display text-3xl">No analysis yet</h1>
        <p className="mt-2 text-muted">Upload an image to see its classification and explanation here.</p>
        <Link to="/" className="mt-6 inline-block rounded-md bg-halpha px-4 py-2 font-semibold text-night">
          Analyse an image
        </Link>
      </div>
    )
  }

  const c = result.classification
  const current = byLevel[level]
  const image = previewUrl ?? findThumbnail(result.request_id) // after a reload, use the saved thumbnail
  const total = Object.values(result.timings_ms).reduce((a, b) => a + b, 0)

  const chooseLevel = async (next: Level) => {
    setLevel(next)
    setExplainError(null)
    if (byLevel[next] || loadingLevel) return // already have it, or busy
    setLoadingLevel(next)
    try {
      const response = await explain(c, next)
      setByLevel((old) => ({ ...old, [next]: response }))
    } catch (e) {
      setExplainError((e as Error).message)
    } finally {
      setLoadingLevel(null)
    }
  }

  // Clicking a [n] chip scrolls to source n and focuses it.
  const showSource = (id: number) => {
    const el = sourcesRef.current?.querySelector<HTMLElement>(`[data-source="${id}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    el?.focus()
  }

  return (
    <div className="space-y-12">
      {!c.model.weights_loaded && (
        <p className="rounded-md border border-amber/60 bg-amber/10 px-4 py-3 text-sm text-amber">
          Demo classifier: no trained model is loaded yet, so the class and confidence below are
          placeholders, not real predictions.
        </p>
      )}

      <section className="grid items-start gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-lg border border-line bg-panel/60">
          {image ? (
            <img src={image} alt="The analysed image" className="max-h-96 w-full object-contain" />
          ) : (
            <p className="grid min-h-48 place-items-center p-6 text-center text-sm text-muted">
              No preview available for this image.
            </p>
          )}
        </div>

        <div>
          <p className="text-sm text-muted">Most likely</p>
          <h1 className="font-display text-5xl leading-none">{c.predicted_class}</h1>
          <p className="mt-3 text-lg">
            {pct(c.confidence)} confident
            {c.uncertain && <span className="text-amber">, but uncertain</span>}
          </p>
          {c.uncertain && c.uncertainty_reason && (
            <p className="mt-2 text-sm text-amber">
              {c.uncertainty_reason} It could also be {c.top_k[1]?.label}.
            </p>
          )}
          <div className="mt-8">
            <h2 className="mb-3 font-display text-lg">All classes</h2>
            <ProbabilityList items={c.probabilities} />
          </div>
        </div>
      </section>

      <section className="grid gap-8 md:grid-cols-[minmax(0,1fr)_18rem]">
        <div>
          <h2 className="font-display text-2xl">Explanation</h2>

          <div role="tablist" aria-label="Explanation level" className="mt-3 flex flex-wrap gap-2">
            {LEVELS.map((l) => (
              <button
                key={l.value}
                type="button"
                role="tab"
                aria-selected={level === l.value}
                onClick={() => chooseLevel(l.value)}
                className={`rounded-md border px-3 py-1.5 text-sm ${
                  level === l.value ? 'border-halpha bg-halpha/10 text-ink' : 'border-line text-muted hover:border-muted'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          <div className="mt-5 max-w-prose" aria-live="polite">
            {loadingLevel === level && (
              <p className="text-muted">Gemma is writing the {level} explanation… this can take about 30 seconds.</p>
            )}
            {explainError && !current && <p className="text-halpha">{explainError}</p>}
            {current && (
              <>
                {current.explanation.mode === 'demo' && (
                  <p className="mb-3 text-sm text-amber">Placeholder text: Gemma was not used for this explanation.</p>
                )}
                <RichText text={current.explanation.text} onCite={showSource} />
                {current.warnings.length > 0 && (
                  <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-amber">
                    {current.warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>

        <aside>
          <h2 className="font-display text-lg">Sources</h2>
          {current && current.sources.length === 0 && (
            <p className="mt-3 text-sm text-muted">No passage in the knowledge base matched this result.</p>
          )}
          <ol ref={sourcesRef} className="mt-3 space-y-3">
            {current?.sources.map((s) => (
              <li
                key={s.id}
                data-source={s.id}
                tabIndex={-1}
                className={`rounded-md border border-line p-3 text-sm ${
                  current.explanation.cited_ids.includes(s.id) ? '' : 'opacity-50'
                }`}
              >
                <p className="font-medium">
                  [{s.id}]{' '}
                  {s.url ? (
                    <a href={s.url} target="_blank" rel="noreferrer" className="underline">
                      {s.title}
                    </a>
                  ) : (
                    s.title
                  )}
                  {s.page != null && <span className="text-muted">, p. {s.page}</span>}
                  <span className="ml-2 text-xs text-muted">{s.kind}</span>
                </p>
                <p className="mt-1 text-muted">{s.snippet}</p>
                {!current.explanation.cited_ids.includes(s.id) && (
                  <p className="mt-1 text-xs text-muted">Retrieved but not cited.</p>
                )}
              </li>
            ))}
          </ol>
        </aside>
      </section>

      <section className="border-t border-line pt-6 text-sm text-muted">
        {result.warnings.length > 0 && (
          <ul className="mb-4 list-disc space-y-1 pl-5 text-amber">
            {result.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        )}
        <p>
          Processed in {Math.round(total)} ms (
          {Object.entries(result.timings_ms).map(([k, v]) => `${k} ${v} ms`).join(', ')}). Image{' '}
          {result.image.width}×{result.image.height} {result.image.format}. Request {result.request_id}.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate('/report', { state: { explained: current } })}
            className="rounded-md bg-halpha px-4 py-2 font-semibold text-night"
          >
            Download report
          </button>
          <button
            type="button"
            onClick={() => {
              clear()
              navigate('/')
            }}
            className="rounded-md border border-line px-4 py-2 text-ink hover:border-muted"
          >
            Analyse a new image
          </button>
        </div>
      </section>
    </div>
  )
}