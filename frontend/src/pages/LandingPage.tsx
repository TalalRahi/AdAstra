// The public front page: what AdAstra does, and the way in (sign up / sign in).
import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router'
import MoonIcon from '../components/MoonIcon'
import ProbabilityList from '../components/ProbabilityList'
import RichText from '../components/RichText'
import { getHealth } from '../lib/api'
import { useAuth } from '../lib/auth'
import { fromNow, pct } from '../lib/format'
import { moonToday, PHASE_NAMES } from '../lib/moon'

// A sample result, shown as a preview. Clearly labelled "Example" on the page.
const EXAMPLE_BARS = [
  { label: 'Spiral galaxy', probability: 0.87 },
  { label: 'Nebula', probability: 0.08 },
  { label: 'Star', probability: 0.05 },
]
const EXAMPLE_TEXT =
  'A **spiral galaxy** is a flat, rotating disk of stars, gas and dust with a bright central bulge [1]. ' +
  'Its bright arms are places where new stars are forming [2].'

const FEATURES = [
  {
    title: 'Identify what you see',
    text: 'Upload a telescope or space image. AdAstra names the object, shows how confident it is and the top alternatives, and says clearly when it is unsure.',
  },
  {
    title: 'Explained at your level',
    text: 'Choose Beginner, Intermediate or Advanced. Explanations are written by Gemma using only passages from a curated astronomy knowledge base.',
  },
  {
    title: 'Every fact has a source',
    text: 'Numbered citations link each sentence to its source. Citations that don’t match a real source are removed automatically.',
  },
  {
    title: 'Ask follow-up questions',
    text: 'An astronomy assistant answers your questions from the same knowledge base, and tells you when the sources don’t cover something.',
  },
  {
    title: 'History and reports',
    text: 'Reopen earlier analyses at any time, and save any result as a clean PDF report with its sources.',
  },
  {
    title: 'Tonight’s Moon',
    text: 'The current phase, how much is lit, and the next full and new moon, in your own time zone.',
  },
]

const STEPS = [
  { title: 'Upload', text: 'Drop in a PNG, JPEG, WebP or TIFF image.' },
  { title: 'Identify', text: 'The classifier returns the most likely object and its confidence.' },
  { title: 'Understand', text: 'Relevant passages are retrieved and turned into a cited explanation.' },
]

export default function LandingPage() {
  const { enabled, user } = useAuth()
  const [classifierLive, setClassifierLive] = useState<boolean | null>(null)
  const moon = moonToday(new Date(), 2)

  useEffect(() => {
    getHealth()
      .then((h) => setClassifierLive(h.slots.classifier?.status === 'live'))
      .catch(() => setClassifierLive(null))
  }, [])

  if (enabled && user) return <Navigate to="/dashboard" replace />

  return (
    <div className="space-y-24 pt-6">
      {/* Hero */}
      <section className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="text-sm tracking-wide text-halpha">Astronomical image analysis</p>
          <h1 className="mt-3 font-display text-5xl leading-[1.05] sm:text-6xl">
            Know what you’re looking at in the sky.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted">
            Upload a telescope or space image. AdAstra identifies the object, tells you how sure it is, and explains
            it at your level, with a source for every fact.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/signup" className="rounded-md bg-halpha px-6 py-3 font-semibold text-night">
              Create a free account
            </Link>
            <Link to="/signin" className="rounded-md border border-line px-6 py-3 hover:border-muted">
              Sign in
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted">Free. You only need an email address.</p>
        </div>

        {/* Example result card, built from the same components the app uses */}
        <figure className="rounded-xl border border-line bg-panel/80 p-6 shadow-2xl shadow-black/30">
          <figcaption className="mb-4 flex items-center justify-between text-xs text-muted">
            <span>Example result</span>
            <span className="rounded-full border border-line px-2 py-0.5">Beginner level</span>
          </figcaption>
          <p className="text-sm text-muted">Most likely</p>
          <p className="font-display text-4xl leading-none">Spiral galaxy</p>
          <p className="mt-2">{pct(0.87)} confident</p>
          <div className="mt-5">
            <ProbabilityList items={EXAMPLE_BARS} />
          </div>
          <div className="mt-6 border-t border-line pt-5 text-sm">
            <RichText text={EXAMPLE_TEXT} />
          </div>
          <ol className="mt-4 space-y-1 text-xs text-muted">
            <li>[1] Spiral galaxy, Wikipedia</li>
            <li>[2] Galaxy, Wikipedia</li>
          </ol>
        </figure>
      </section>

      {/* Features */}
      <section aria-labelledby="features">
        <h2 id="features" className="font-display text-3xl sm:text-4xl">What you can do</h2>
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <li key={f.title} className="rounded-lg border border-line bg-panel/60 p-6">
              <p className="font-display text-2xl text-halpha">{String(i + 1).padStart(2, '0')}</p>
              <h3 className="mt-2 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.text}</p>
              {i === FEATURES.length - 1 && (
                <div className="mt-4 flex items-center gap-4 border-t border-line pt-4">
                  <MoonIcon fraction={moon.fraction} illumination={moon.illumination} size={56} />
                  <div className="text-sm">
                    <p>
                      Right now: <span className="font-medium">{moon.name}</span>, {pct(moon.illumination)} lit
                    </p>
                    {moon.upcoming[0] && (
                      <p className="text-muted">
                        {PHASE_NAMES[moon.upcoming[0].kind]} {fromNow(moon.upcoming[0].date)}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* How it works */}
      <section aria-labelledby="how">
        <h2 id="how" className="font-display text-3xl sm:text-4xl">How it works</h2>
        <ol className="mt-8 grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative rounded-lg border border-line p-6">
              <span className="grid size-9 place-items-center rounded-full bg-halpha/15 font-semibold text-halpha">
                {i + 1}
              </span>
              <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 max-w-3xl text-sm text-muted">
          Under the hood: a FastAPI backend, a FAISS search index over curated Wikipedia articles, and Google’s Gemma
          model orchestrated with LangChain. Explanations use only the retrieved passages, so every claim can be
          checked.
        </p>
      </section>

      {/* Honest status note */}
      {classifierLive === false && (
        <section className="rounded-lg border border-amber/50 bg-amber/10 p-5 text-sm text-amber">
          Research preview: the image classifier is currently in demo mode while the trained model is being
          finalised. Explanations, sources, the assistant, history, reports and the Moon tracker are fully working.
        </section>
      )}

      {/* Final call to action */}
      <section className="rounded-xl border border-line bg-panel/70 px-6 py-12 text-center">
        <h2 className="font-display text-3xl sm:text-4xl">Ready to explore?</h2>
        <p className="mx-auto mt-3 max-w-lg text-muted">
          Create a free account to analyse images, ask questions and keep your results.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/signup" className="rounded-md bg-halpha px-6 py-3 font-semibold text-night">
            Create a free account
          </Link>
          <Link to="/signin" className="rounded-md border border-line px-6 py-3 hover:border-muted">
            I already have an account
          </Link>
        </div>
      </section>
    </div>
  )
}