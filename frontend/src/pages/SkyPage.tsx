// The "Sky" tab: the Solar System, moons, galaxies, meteor showers, comets,
// constellations, nebulae and stars — all drawn in code, on one scrolling page.
//   hover        → a small tooltip next to the object (the card does NOT change)
//   click / tap  → select the object: the card shows its full details
//   related chip → selects and scrolls to that object elsewhere on the page
//   "Ask AdAstra" → opens the chat with a question about the SELECTED object
import { useNavigate } from 'react-router'
import { useRef, useState } from 'react'
import {
  CelestialDefs, CometArt, ConstellationArt, GalaxyArt, MoonArt, NebulaArt,
  PlanetArt, ShowerArt, StarArt, SunArt,
} from '../components/CelestialArt'
import {
  ALL_SKY_OBJECTS, COMETS, CONSTELLATIONS, GALAXIES, MOONS, NEBULAE, PLANETS,
  SHOWERS, STARS, SUN, type CelestialObject,
} from '../lib/celestial'

const PLANET_SIZE: Record<string, number> = {
  mercury: 18, venus: 30, earth: 32, mars: 24, jupiter: 68, saturn: 52, uranus: 40, neptune: 38,
}
const MOON_SIZE: Record<string, number> = { europa: 60, titan: 74, io: 56, enceladus: 44, triton: 58 }

interface Section {
  id: string
  title: string
  objects: CelestialObject[]
  art: (obj: CelestialObject) => React.ReactNode
  grid?: string
}

export default function SkyPage() {
  const [selected, setSelected] = useState<CelestialObject>(PLANETS[2]) // start with Earth
  const cardRef = useRef<HTMLElement>(null)
  const navigate = useNavigate()
  const shortName = selected.name.replace(/ \(.*\)/, '')
  const byId = Object.fromEntries(ALL_SKY_OBJECTS.map((o) => [o.id, o]))

  const select = (obj: CelestialObject, scrollToObj = false) => {
    setSelected(obj)
    if (scrollToObj) {
      document.getElementById(`sky-obj-${obj.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    } else if (window.matchMedia('(hover: none)').matches) {
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }

    // A tooltip centered under an object near the edge of the screen would have
  // half of it pushed off-screen. On hover/focus, nudge it back so it always
  // stays fully visible — works for every object, on any screen width.
  const keepTooltipOnScreen = (button: HTMLButtonElement) => {
    const tip = button.querySelector<HTMLElement>('[role="tooltip"]')
    if (!tip) return
    tip.style.transform = 'translateX(-50%)'
    const margin = 10
    const rect = tip.getBoundingClientRect()
    if (rect.left < margin) {
      tip.style.transform = `translateX(calc(-50% + ${margin - rect.left}px))`
    } else if (rect.right > window.innerWidth - margin) {
      tip.style.transform = `translateX(calc(-50% - ${rect.right - (window.innerWidth - margin)}px))`
    }
  }

  const objectButton = (obj: CelestialObject, art: React.ReactNode) => {
    const isSelected = selected.id === obj.id
    return (
      <button
        key={obj.id}
        id={`sky-obj-${obj.id}`}
        type="button"
        onClick={() => select(obj)}
        onMouseEnter={(e) => keepTooltipOnScreen(e.currentTarget)}
        onFocus={(e) => keepTooltipOnScreen(e.currentTarget)}
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

  const sections: Section[] = [
    { id: 'solar', title: 'Our Solar System', objects: [SUN, ...PLANETS], art: (o) => (o.id === 'sun' ? <SunArt size={70} /> : <PlanetArt id={o.id} size={PLANET_SIZE[o.id]} />) },
    { id: 'moons', title: 'Moons (beyond Earth\u2019s)', objects: MOONS, art: (o) => <MoonArt id={o.id} size={MOON_SIZE[o.id]} />, grid: 'grid grid-cols-2 gap-3 sm:grid-cols-5' },
    { id: 'galaxies', title: 'Galaxies', objects: GALAXIES, art: (o) => <GalaxyArt id={o.id} size={132} />, grid: 'grid grid-cols-2 gap-2 sm:grid-cols-4' },
    { id: 'showers', title: 'Meteor Showers', objects: SHOWERS, art: (o) => <ShowerArt seed={o.id.length * 71} size={96} />, grid: 'grid grid-cols-2 gap-3 sm:grid-cols-5' },
    { id: 'comets', title: 'Parent Comets', objects: COMETS, art: () => <CometArt size={80} />, grid: 'grid grid-cols-3 gap-3' },
    { id: 'constellations', title: 'Constellations', objects: CONSTELLATIONS, art: (o) => <ConstellationArt id={o.id} size={110} />, grid: 'grid grid-cols-2 gap-3 sm:grid-cols-5' },
    { id: 'nebulae', title: 'Nebulae', objects: NEBULAE, art: (o) => <NebulaArt id={o.id} size={110} />, grid: 'grid grid-cols-2 gap-3 sm:grid-cols-5' },
    { id: 'stars', title: 'Stars (beyond the Sun)', objects: STARS, art: (o) => <StarArt id={o.id} size={96} />, grid: 'grid grid-cols-2 gap-3 sm:grid-cols-5' },
  ]

  return (
    <div className="space-y-10">
      <CelestialDefs />
      <header>
        <h1 className="font-display text-4xl">The sky</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Hover over an object for a quick look, and click (or tap) it to select it and see all its details. The
          pictures are illustrations, not to scale or precise star charts.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 space-y-8">
          {sections.map((sec) => (
            <section key={sec.id} aria-labelledby={sec.id} className="rounded-xl border border-line bg-panel/40 p-4">
              <h2 id={sec.id} className="mb-2 font-display text-2xl">{sec.title}</h2>
              <div className={sec.grid ?? 'flex flex-wrap items-center justify-center gap-x-0.5 gap-y-3 pb-2 lg:flex-nowrap lg:justify-between'}>
                {sec.objects.map((o) => objectButton(o, sec.art(o)))}
              </div>
            </section>
          ))}
        </div>

        <aside ref={cardRef} aria-live="polite" aria-label="Selected object" className="lg:sticky lg:top-6 lg:self-start">
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

            {selected.related && selected.related.length > 0 && (
              <div className="mt-4">
                <p className="mb-1.5 text-xs text-muted">Related</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.related.map((id) => {
                    const rel = byId[id]
                    if (!rel) return null
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => select(rel, true)}
                        className="rounded-full border border-line px-2.5 py-1 text-xs hover:border-halpha hover:text-halpha"
                      >
                        {rel.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => navigate('/chat', { state: { ask: `Tell me about ${shortName}` } })}
              title={`Ask AdAstra about ${shortName}`}
              className="mt-5 flex h-11 w-full items-center justify-center rounded-md bg-halpha px-4 font-semibold text-night"
            >
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