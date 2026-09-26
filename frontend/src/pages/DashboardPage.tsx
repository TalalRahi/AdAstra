import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import HealthBanner from '../components/HealthBanner'
import MoonIcon from '../components/MoonIcon'
import { dateTime, fromNow, pct } from '../lib/format'
import { loadHistory, type HistoryEntry } from '../lib/history'
import { moonToday, PHASE_NAMES } from '../lib/moon'
import { useStore } from '../lib/store'

export default function DashboardPage() {
  // loadHistory() is now async (server-backed when signed in), so this loads
  // in an effect instead of the old synchronous `loadHistory().slice(0, 4)`.
  const [recent, setRecent] = useState<HistoryEntry[]>([])
  useEffect(() => {
    loadHistory().then((all) => setRecent(all.slice(0, 4)))
  }, [])

  const moon = moonToday(new Date(), 2)
  const { setAnalysis } = useStore()
  const navigate = useNavigate()

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-display text-4xl sm:text-5xl">Dashboard</h1>
        <p className="mt-2 text-muted">Your recent analyses, tonight's Moon, and the system status.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-lg border border-line bg-panel/60 p-6 lg:col-span-2">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl">Recent analyses</h2>
            <Link to="/history" className="text-sm text-muted underline hover:text-ink">
              See all
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="mt-4 text-muted">Nothing analysed yet.</p>
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {recent.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setAnalysis(e.result, e.thumbnail)
                      navigate('/results')
                    }}
                    className="flex w-full items-center gap-3 rounded-md border border-line p-2 text-left hover:border-muted"
                  >
                    {e.thumbnail ? (
                      <img src={e.thumbnail} alt="" className="size-14 rounded object-cover" />
                    ) : (
                      <span className="grid size-14 place-items-center rounded bg-night text-xs text-muted">TIFF</span>
                    )}
                    <span className="min-w-0">
                      {e.result.classification ? (
                        <>
                          <span className="block truncate font-medium">{e.result.classification.predicted_class}</span>
                          <span className="block text-xs text-muted">
                            {pct(e.result.classification.confidence)}, {dateTime(e.savedAt)}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="block truncate font-medium text-muted">Not classified</span>
                          <span className="block text-xs text-muted">{dateTime(e.savedAt)}</span>
                        </>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Link to="/" className="mt-6 inline-block rounded-md bg-halpha px-4 py-2 font-semibold text-night">
            Analyse a new image
          </Link>
        </section>

        <section className="rounded-lg border border-line bg-panel/60 p-6">
          <h2 className="font-display text-2xl">The Moon</h2>
          <div className="mt-4 flex items-center gap-4">
            <MoonIcon fraction={moon.fraction} illumination={moon.illumination} size={84} />
            <div>
              <p className="font-medium">{moon.name}</p>
              <p className="text-sm text-muted">{pct(moon.illumination)} lit</p>
            </div>
          </div>
          <ul className="mt-4 space-y-1 text-sm">
            {moon.upcoming.map((e) => (
              <li key={e.date.toISOString()}>
                {PHASE_NAMES[e.kind]} <span className="text-muted">{fromNow(e.date)}</span>
              </li>
            ))}
          </ul>
          <Link to="/moon" className="mt-4 inline-block text-sm text-muted underline hover:text-ink">
            More Moon dates
          </Link>
        </section>

        <section className="rounded-lg border border-line bg-panel/60 p-6 lg:col-span-2">
          <h2 className="font-display text-2xl">Ask the astronomy assistant</h2>
          <p className="mt-2 text-muted">Questions are answered from the curated knowledge base, with sources.</p>
          <Link to="/chat" className="mt-4 inline-block rounded-md border border-line px-4 py-2 hover:border-muted">
            Open the chat
          </Link>
        </section>

        <section className="rounded-lg border border-line bg-panel/60 p-6">
          <h2 className="mb-3 font-display text-2xl">System status</h2>
          <HealthBanner />
        </section>
      </div>
    </div>
  )
}