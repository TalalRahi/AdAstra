// The "Sky" tab: the Solar System and four galaxies, drawn. Hover (or tap on a
// phone, or Tab with the keyboard) to see details; "Ask AdAstra" opens the chat
// with a question answered from the knowledge base, with sources.
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { CelestialDefs, GalaxyArt, PlanetArt, SunArt } from '../components/CelestialArt'
import { GALAXIES, PLANETS, SUN, type CelestialObject } from '../lib/celestial'

// Drawing sizes in pixels. Real sizes differ far too much to show to scale
// (Jupiter is 29× wider than Mercury), so these keep the order but compress it.
const PLANET_SIZE: Record<string, number> = {
  mercury: 18, venus: 30, earth: 32, mars: 24, jupiter: 68, saturn: 52, uranus: 40, neptune: 38,
}

export default function SkyPage() {
  const [active, setActive] = useState<CelestialObject>(PLANETS[2]) // start with Earth
  const details = useRef<HTMLElement>(null)
  const navigate = useNavigate()

  const pick = (obj: CelestialObject) => () => setActive(obj)
  // On phones there is no hover: a tap selects and scrolls the card into view.
  const tap = (obj: CelestialObject) => () => {
    setActive(obj)
    if (window.matchMedia('(hover: none)').matches) {
      details.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }

  const objectButton = (obj: CelestialObject, art: React.ReactNode, label = true) => (
    <button
      key={obj.id}
      type="button"
      onMouseEnter={pick(obj)}
      onFocus={pick(obj)}
      onClick={tap(obj)}
      aria-pressed={active.id === obj.id}
      aria-label={`${obj.name}: show details`}
      className={`group flex shrink-0 flex-col items-center gap-2 rounded-lg px-1 py-1.5 transition-transform duration-200 hover:scale-105 focus-visible:scale-105 ${
        active.id === obj.id ? 'bg-halpha/10' : ''
      }`}
    >
      {art}
      {label && (
        <span className={`text-xs ${active.id === obj.id ? 'text-ink' : 'text-muted group-hover:text-ink'}`}>
          {obj.name}
        </span>
      )}
    </button>
  )

  return (
    <div className="space-y-10">
      <CelestialDefs />
      <header>
        <h1 className="font-display text-4xl">The sky</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Hover over a planet or galaxy (or tap it) to see its details. The pictures are illustrations; the planets
          are not drawn to scale.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 space-y-8">
          <section aria-labelledby="solar" className="rounded-xl border border-line bg-panel/40 p-4">
            <h2 id="solar" className="mb-2 font-display text-2xl">Our Solar System</h2>
            <div className="flex flex-wrap items-center justify-center gap-x-0.5 gap-y-3 pb-2 lg:flex-nowrap lg:justify-between">
              {objectButton(SUN, <SunArt size={70} />)}
              {PLANETS.map((p) => objectButton(p, <PlanetArt id={p.id} size={PLANET_SIZE[p.id]} />))}
            </div>
          </section>

          <section aria-labelledby="galaxies" className="rounded-xl border border-line bg-panel/40 p-4">
            <h2 id="galaxies" className="mb-2 font-display text-2xl">Galaxies</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {GALAXIES.map((g) => objectButton(g, <GalaxyArt id={g.id} size={132} />))}
            </div>
          </section>
        </div>

        <aside ref={details} aria-live="polite" className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-xl border border-line bg-panel/80 p-6">
            <p className="text-xs uppercase tracking-wide text-halpha">{active.type}</p>
            <h2 className="mt-1 font-display text-3xl">{active.name}</h2>
            <p className="mt-3 text-sm leading-relaxed">{active.blurb}</p>
            <dl className="mt-4 divide-y divide-line text-sm">
              {active.facts.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2">
                  <dt className="shrink-0 text-muted">{k}</dt>
                  <dd className="text-right">{v}</dd>
                </div>
              ))}
            </dl>
            {active.note && <p className="mt-3 text-xs text-amber">{active.note}</p>}
            <button
              type="button"
              onClick={() => navigate('/chat', { state: { ask: `Tell me about ${active.name.replace(/ \(.*\)/, '')}` } })}
              className="mt-5 w-full rounded-md bg-halpha px-4 py-2.5 font-semibold text-night"
            >
              Ask AdAstra about {active.name.replace(/ \(.*\)/, '')}
            </button>
            <a href={active.wiki} target="_blank" rel="noreferrer" className="mt-3 block text-center text-xs text-muted underline">
              Source: Wikipedia
            </a>
          </div>
        </aside>
      </div>
    </div>
  )
}