// The "Sky" tab: the Solar System and four galaxies, drawn.
//   hover        → a small tooltip next to the object (the card does NOT change)
//   click / tap  → select the object: the card shows its full details
//   "Ask AdAstra" → opens the chat with a question about the SELECTED object
// Keeping "looking" (hover) separate from "choosing" (click) means moving the
// mouse to the Ask button never changes the selection on the way.
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
  const [selected, setSelected] = useState<CelestialObject>(PLANETS[2]) // start with Earth
  const details = useRef<HTMLElement>(null)
  const navigate = useNavigate()
  const shortName = selected.name.replace(/ \(.*\)/, '') // "Andromeda (M31)" -> "Andromeda"

  const select = (obj: CelestialObject) => () => {
    setSelected(obj)
    // On phones the card is below the pictures: scroll to it after a tap.
    if (window.matchMedia('(hover: none)').matches) {
      details.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }

  const objectButton = (obj: CelestialObject, art: React.ReactNode) => {
    const isSelected = selected.id === obj.id
    return (
      <button
        key={obj.id}
        type="button"
        onClick={select(obj)}
        aria-pressed={isSelected}
        aria-label={`${obj.name}: select`}
        className={`group relative flex shrink-0 flex-col items-center gap-2 rounded-lg px-1 py-1.5 transition-transform duration-200 hover:scale-105 focus-visible:scale-105 ${
          isSelected ? 'bg-halpha/10 ring-1 ring-halpha' : ''
        }`}
      >
        {art}
        <span className={`text-xs ${isSelected ? 'text-ink' : 'text-muted group-hover:text-ink'}`}>
          {isSelected ? `${obj.name} ✓` : obj.name}
        </span>
        {/* Tooltip: shown on hover / keyboard focus; it never changes the selection */}
        <span
          role="tooltip"
          className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 w-52 -translate-x-1/2 rounded-md border border-line bg-night/95 p-3 text-left text-xs opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          <span className="block font-semibold text-ink">{obj.name}</span>
          <span className="block text-halpha">{obj.type}</span>
          <span className="mt-1 block text-muted">{obj.blurb}</span>
          <span className="mt-2 block text-muted">{isSelected ? 'Selected' : 'Click to select'}</span>
        </span>
      </button>
    )
  }

  return (
    <div className="space-y-10">
      <CelestialDefs />
      <header>
        <h1 className="font-display text-4xl">The sky</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Hover over a planet or galaxy for a quick look, and click (or tap) it to select it and see all its details.
          The pictures are illustrations; the planets are not drawn to scale.
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

        <aside ref={details} aria-live="polite" aria-label="Selected object" className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-xl border border-line bg-panel/80 p-6">
            <p className="flex items-center justify-between text-xs uppercase tracking-wide text-halpha">
              <span>{selected.type}</span>
              <span className="rounded-full border border-halpha/50 px-2 py-0.5 normal-case tracking-normal">Selected</span>
            </p>
            <h2 className="mt-1 font-display text-3xl">{selected.name}</h2>
            <p className="mt-3 text-sm leading-relaxed">{selected.blurb}</p>
            <dl className="mt-4 divide-y divide-line text-sm">
              {selected.facts.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2">
                  <dt className="shrink-0 text-muted">{k}</dt>
                  <dd className="text-right">{v}</dd>
                </div>
              ))}
            </dl>
            {selected.note && <p className="mt-3 text-xs text-amber">{selected.note}</p>}
            <button
              type="button"
              onClick={() => navigate('/chat', { state: { ask: `Tell me about ${shortName}` } })}
              title={`Ask AdAstra about ${shortName}`}
              className="mt-5 flex h-11 w-full items-center justify-center rounded-md bg-halpha px-4 font-semibold text-night"
            >
              {/* one line, fixed height: the button is the same size for every object */}
              <span className="truncate whitespace-nowrap">Ask about {shortName}</span>
            </button>
            <a href={selected.wiki} target="_blank" rel="noreferrer" className="mt-3 block text-center text-xs text-muted underline">
              Source: Wikipedia
            </a>
          </div>
        </aside>
      </div>
    </div>
  )
}