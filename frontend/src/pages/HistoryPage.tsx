import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { dateTime, pct } from '../lib/format'
import { clearHistory, loadHistory, removeFromHistory, type HistoryEntry } from '../lib/history'
import { useStore } from '../lib/store'

export default function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const { setAnalysis } = useStore()
  const navigate = useNavigate()

  useEffect(() => {
    loadHistory().then((all) => {
      setEntries(all)
      setLoading(false)
    })
  }, [])

  const open = (e: HistoryEntry) => {
    setAnalysis(e.result, e.thumbnail)
    navigate('/results')
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">History</h1>
          <p className="mt-2 text-muted">
            Your last {entries.length > 0 ? entries.length : ''} analyses, saved to your account.
          </p>
        </div>
        {entries.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Delete all saved analyses?')) {
                clearHistory()
                setEntries([])
              }
            }}
            className="rounded-md border border-line px-3 py-1.5 text-sm text-muted hover:border-halpha hover:text-ink"
          >
            Clear history
          </button>
        )}
      </header>

      {!loading && entries.length === 0 ? (
        <div className="py-10">
          <p className="text-muted">No analyses yet.</p>
          <Link to="/" className="mt-4 inline-block rounded-md bg-halpha px-4 py-2 font-semibold text-night">
            Analyse an image
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((e) => {
            // Null when this saved image failed the astronomical-image check
            // — nothing was classified, so there's nothing to show but that.
            const c = e.result.classification
            return (
              <li key={e.id} className="overflow-hidden rounded-lg border border-line bg-panel/60">
                <button type="button" onClick={() => open(e)} className="block w-full text-left">
                  {e.thumbnail ? (
                    <img src={e.thumbnail} alt={`Thumbnail of ${e.fileName}`} className="h-40 w-full object-cover" />
                  ) : (
                    <div className="grid h-40 place-items-center text-sm text-muted">No preview (TIFF)</div>
                  )}
                  <div className="p-4">
                    {c ? (
                      <>
                        <p className="font-display text-xl">{c.predicted_class}</p>
                        <p className="text-sm">
                          {pct(c.confidence)}
                          {c.uncertain && <span className="text-amber">, uncertain</span>}
                          {!c.model.weights_loaded && <span className="text-amber">, demo</span>}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-display text-xl text-muted">Not classified</p>
                        <p className="text-sm text-amber">Not an astronomical image</p>
                      </>
                    )}
                    <p className="mt-2 truncate text-xs text-muted">
                      {dateTime(e.savedAt)}, {e.fileName}
                    </p>
                  </div>
                </button>
                <div className="border-t border-line px-4 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => {
                      removeFromHistory(e.id).then(setEntries)
                    }}
                    className="text-xs text-muted underline hover:text-halpha"
                  >
                    Delete
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}