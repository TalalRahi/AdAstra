import { useEffect, useState } from 'react'
import MoonIcon from '../components/MoonIcon'
import { dateTime, fromNow, pct } from '../lib/format'
import { moonToday, PHASE_NAMES } from '../lib/moon'

export default function MoonPage() {
  const [now, setNow] = useState(() => new Date())

  // Refresh once a minute so the page stays correct if left open.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])

  const moon = moonToday(now, 8)

  return (
    <div className="space-y-12">
      <header>
        <h1 className="font-display text-4xl">The Moon tonight</h1>
        <p className="mt-2 text-muted">Calculated in your browser for {dateTime(now)} (your local time).</p>
      </header>

      <section className="flex flex-wrap items-center gap-10">
        <MoonIcon fraction={moon.fraction} illumination={moon.illumination} size={180} />
        <div>
          <p className="font-display text-5xl leading-none">{moon.name}</p>
          <p className="mt-4 text-lg">{pct(moon.illumination)} of the disc is lit</p>
          <p className="mt-1 text-muted">{moon.ageDays.toFixed(1)} days since the last new moon</p>
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-display text-2xl">Upcoming phases</h2>
        <ol className="divide-y divide-line rounded-lg border border-line">
          {moon.upcoming.map((e) => (
            <li key={e.date.toISOString()} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3">
              <span className="font-medium">{PHASE_NAMES[e.kind]}</span>
              <span className="text-muted">
                {dateTime(e.date)} <span className="ml-2 text-xs">({fromNow(e.date)})</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <p className="text-xs text-muted">
        Method: Meeus, <em>Astronomical Algorithms</em> (1998), chapters 48–49. Checked against the PyEphem library:
        phase times within about 2 minutes. The picture shows the Moon as seen from the Northern Hemisphere.
      </p>
    </div>
  )
}