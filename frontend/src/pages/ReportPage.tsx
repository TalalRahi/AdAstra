// A printable report of one analysis. The browser's print window can save it
// as a PDF ("Save as PDF" as the destination), so no PDF library is needed.
import { Link, useLocation } from 'react-router'
import RichText from '../components/RichText'
import { dateTime, LEVELS, pct } from '../lib/format'
import { findThumbnail } from '../lib/history'
import { useStore } from '../lib/store'
import type { ExplainResponse } from '../lib/types'

export default function ReportPage() {
  const { result, previewUrl } = useStore()
  const location = useLocation()

  if (!result) {
    return (
      <div className="py-16">
        <h1 className="font-display text-3xl">No analysis to report</h1>
        <Link to="/" className="mt-4 inline-block underline">Analyse an image</Link>
      </div>
    )
  }

  // The results page passes the explanation level that was on screen; otherwise use the original.
  const chosen = (location.state as { explained?: ExplainResponse } | null)?.explained
  const explanation = chosen?.explanation ?? result.explanation
  const sources = chosen?.sources ?? result.sources
  const c = result.classification
  const image = previewUrl ?? findThumbnail(result.request_id)
  const levelLabel = LEVELS.find((l) => l.value === explanation.level)?.label

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md bg-halpha px-4 py-2 font-semibold text-night"
        >
          Save as PDF / Print
        </button>
        <Link to="/results" className="rounded-md border border-line px-4 py-2 text-sm hover:border-muted">
          Back to results
        </Link>
        <p className="text-sm text-muted">In the print window, choose "Save as PDF" as the destination.</p>
      </div>

      <article className="mx-auto max-w-3xl space-y-8 rounded-lg bg-white p-8 text-zinc-900 shadow print:max-w-none print:p-0 print:shadow-none">
        <header className="border-b border-zinc-300 pb-4">
          <p className="text-sm text-zinc-500">AdAstra analysis report</p>
          <h1 className="font-display text-4xl">{c.predicted_class}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Generated {dateTime(new Date())}. Request {result.request_id}.
          </p>
        </header>

        {!c.model.weights_loaded && (
          <p className="rounded border border-amber-500 bg-amber-50 p-3 text-sm text-amber-900">
            Demo classifier: no trained model was loaded, so the class and confidence are placeholders.
          </p>
        )}

        <section className="grid gap-6 sm:grid-cols-2">
          {image ? (
            <img src={image} alt="The analysed image" className="max-h-72 w-full rounded object-contain" />
          ) : (
            <p className="text-sm text-zinc-500">Image preview not available.</p>
          )}
          <div>
            <p className="text-lg">
              <strong>{pct(c.confidence)}</strong> confident{c.uncertain ? ', uncertain' : ''}
            </p>
            {c.uncertain && c.uncertainty_reason && (
              <p className="mt-1 text-sm text-zinc-600">{c.uncertainty_reason}</p>
            )}
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-300 text-left text-zinc-500">
                  <th className="py-1 font-normal">Class</th>
                  <th className="py-1 text-right font-normal">Probability</th>
                </tr>
              </thead>
              <tbody>
                {c.probabilities.map((p) => (
                  <tr key={p.label} className="border-b border-zinc-100">
                    <td className="py-1">{p.label}</td>
                    <td className="py-1 text-right tabular-nums">{pct(p.probability)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-zinc-500">
              Model: {c.model.architecture}. Image {result.image.width}×{result.image.height} {result.image.format}.
            </p>
          </div>
        </section>

        <section>
          <h2 className="font-display text-2xl">Explanation ({levelLabel} level)</h2>
          {explanation.mode === 'demo' && (
            <p className="mt-1 text-sm text-amber-800">Placeholder text: Gemma was not used.</p>
          )}
          <div className="mt-3">
            <RichText text={explanation.text} />
          </div>
        </section>

        <section>
          <h2 className="font-display text-2xl">Sources</h2>
          {sources.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">No sources matched this result.</p>
          ) : (
            <ol className="mt-3 space-y-3 text-sm">
              {sources.map((s) => (
                <li key={s.id} className={explanation.cited_ids.includes(s.id) ? '' : 'text-zinc-500'}>
                  <p className="font-medium">
                    [{s.id}] {s.title}
                    {s.page != null && `, p. ${s.page}`} ({s.kind})
                    {!explanation.cited_ids.includes(s.id) && ', retrieved but not cited'}
                  </p>
                  {s.url && <p className="break-all text-xs text-zinc-500">{s.url}</p>}
                  <p className="mt-1 text-zinc-600">{s.snippet}</p>
                </li>
              ))}
            </ol>
          )}
        </section>

        {result.warnings.length > 0 && (
          <section>
            <h2 className="font-display text-xl">Notes</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-600">
              {result.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </section>
        )}

        <footer className="border-t border-zinc-300 pt-3 text-xs text-zinc-500">
          AdAstra, CSE 400 thesis project. Classifications can be wrong; explanations are generated by Gemma
          from the listed sources and should be checked against them.
        </footer>
      </article>
    </div>
  )
}