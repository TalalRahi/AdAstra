// Drawn (not photographed) planets and galaxies, as SVG. Stylised but
// physically inspired: shading on the night side, Jupiter's bands and Great Red
// Spot, Saturn's rings, Uranus tipped on its side, and galaxies built from dots
// placed along logarithmic spiral arms (the shape real spiral arms follow).

const SHADE = 'celestial-shade'

function makeRandom(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function CelestialDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" className="absolute">
      <defs>
        {/* light from the upper left, dark night side at the lower right */}
        <radialGradient id={SHADE} cx="35%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="45%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.72" />
        </radialGradient>
        <radialGradient id="sun-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff7d6" />
          <stop offset="35%" stopColor="#ffd35c" />
          <stop offset="70%" stopColor="#ff9d2e" />
          <stop offset="100%" stopColor="#ff6a1a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="galaxy-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff4d8" stopOpacity="1" />
          <stop offset="40%" stopColor="#ffd9a0" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffd9a0" stopOpacity="0" />
        </radialGradient>
        <clipPath id="clip-planet"><circle cx="50" cy="50" r="46" /></clipPath>
        <filter id="neb-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
      </defs>
    </svg>
  )
}

function Sphere({ children }: { children: React.ReactNode }) {
  return (
    <>
      <g clipPath="url(#clip-planet)">{children}</g>
      <circle cx="50" cy="50" r="46" fill={`url(#${SHADE})`} />
    </>
  )
}

function Bands({ colors }: { colors: string[] }) {
  const h = 92 / colors.length
  return (
    <>
      {colors.map((c, i) => (
        <rect key={i} x="0" y={4 + i * h} width="100" height={h + 0.5} fill={c} />
      ))}
    </>
  )
}

export function PlanetArt({ id, size }: { id: string; size: number }) {
  if (id === 'saturn') {
    // wider box so the rings fit; ring drawn in two halves around the planet
    return (
      <svg viewBox="-30 0 160 100" width={size * 1.6} height={size} aria-hidden="true">
        <g transform="rotate(-18 50 50)">
          <ellipse cx="50" cy="50" rx="76" ry="16" fill="none" stroke="#d9c7a0" strokeWidth="7" opacity="0.55" />
          <ellipse cx="50" cy="50" rx="64" ry="13" fill="none" stroke="#bfa877" strokeWidth="4" opacity="0.6" />
        </g>
        <Sphere>
          <Bands colors={['#e9d7a6', '#dcc488', '#e7d3a0', '#cdb277', '#e3cc94', '#d6bd82']} />
        </Sphere>
        {/* front half of the rings, drawn over the planet */}
        <g transform="rotate(-18 50 50)">
          <path d="M -26 50 A 76 16 0 0 0 126 50" fill="none" stroke="#e6d6b0" strokeWidth="7" opacity="0.85" />
          <path d="M -14 50 A 64 13 0 0 0 114 50" fill="none" stroke="#c9b283" strokeWidth="4" opacity="0.8" />
        </g>
      </svg>
    )
  }

  let body: React.ReactNode
  switch (id) {
    case 'mercury':
      body = (
        <>
          <rect width="100" height="100" fill="#a19b95" />
          {[[30, 35, 6], [62, 28, 4], [55, 60, 8], [28, 66, 5], [75, 55, 3], [45, 45, 3]].map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} fill="#7f7a75" stroke="#b7b1ab" strokeWidth="0.8" />
          ))}
        </>
      )
      break
    case 'venus':
      body = (
        <>
          <rect width="100" height="100" fill="#e6cf9a" />
          <path d="M0 35 Q 30 25 55 38 T 100 30 V 45 Q 70 52 45 44 T 0 50 Z" fill="#d9bb7c" opacity="0.7" />
          <path d="M0 62 Q 35 55 60 66 T 100 60 V 72 Q 65 78 40 70 T 0 76 Z" fill="#f1dfb4" opacity="0.7" />
        </>
      )
      break
    case 'earth':
      body = (
        <>
          <rect width="100" height="100" fill="#2f6fd6" />
          <path d="M18 30 Q 30 18 44 26 Q 50 38 40 46 Q 30 52 24 44 Z" fill="#3f9b5a" />
          <path d="M55 45 Q 70 38 80 50 Q 78 66 66 72 Q 56 64 58 55 Z" fill="#4aa564" />
          <path d="M30 62 Q 38 60 42 68 Q 38 76 30 72 Z" fill="#3f9b5a" />
          <path d="M5 22 Q 40 14 70 22" stroke="#fff" strokeWidth="4" fill="none" opacity="0.7" strokeLinecap="round" />
          <path d="M20 84 Q 50 78 85 84" stroke="#fff" strokeWidth="3" fill="none" opacity="0.6" strokeLinecap="round" />
          <ellipse cx="50" cy="6" rx="30" ry="6" fill="#f4f8ff" />
        </>
      )
      break
    case 'mars':
      body = (
        <>
          <rect width="100" height="100" fill="#c4562f" />
          <path d="M20 45 Q 40 38 60 48 Q 50 58 30 56 Z" fill="#9c3f21" opacity="0.8" />
          <path d="M55 65 Q 70 60 82 68 Q 72 76 58 73 Z" fill="#a8472a" opacity="0.8" />
          <ellipse cx="50" cy="7" rx="18" ry="5" fill="#f3ede6" />
        </>
      )
      break
    case 'jupiter':
      body = (
        <>
          <Bands colors={['#d9c3a0', '#b7875a', '#ead8b8', '#a8744b', '#e4cfaa', '#c49469', '#ecdcbf', '#b98a60']} />
          <ellipse cx="64" cy="62" rx="10" ry="6" fill="#c0502e" stroke="#e7a17a" strokeWidth="1.2" />
        </>
      )
      break
    case 'uranus':
      body = (
        <>
          <rect width="100" height="100" fill="#9fe0e3" />
          <rect x="0" y="0" width="100" height="30" fill="#b6ecee" opacity="0.6" />
        </>
      )
      break
    case 'neptune':
      body = (
        <>
          <rect width="100" height="100" fill="#3c63d8" />
          <path d="M0 40 Q 50 34 100 42" stroke="#5b80ea" strokeWidth="5" fill="none" />
          <ellipse cx="62" cy="58" rx="8" ry="5" fill="#243e9c" />
        </>
      )
      break
    default:
      body = <rect width="100" height="100" fill="#888" />
  }

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      {id === 'uranus' && (
        // Uranus's faint rings, nearly vertical because the planet is tipped on its side
        <ellipse cx="50" cy="50" rx="10" ry="49" fill="none" stroke="#cfeff0" strokeWidth="1.2" opacity="0.6" />
      )}
      <Sphere>{body}</Sphere>
    </svg>
  )
}

export function SunArt({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <circle cx="50" cy="50" r="50" fill="url(#sun-glow)" />
      <circle cx="50" cy="50" r="34" fill="#ffc94a" />
      <circle cx="50" cy="50" r="34" fill="url(#sun-glow)" opacity="0.8" />
    </svg>
  )
}

// ---------------------------------------------------------------- galaxies
interface Dot { x: number; y: number; r: number; o: number; c: string }

interface GalaxyShape {
  arms: number
  tightness: number   // b in r = a·e^(bθ): smaller = more tightly wound
  spread: number      // how far stars scatter from the arm
  bar?: number        // length of the central bar (Milky Way)
  companion?: boolean // Whirlpool's companion galaxy
  seed: number
}

const SHAPES: Record<string, GalaxyShape> = {
  milkyway: { arms: 4, tightness: 0.22, spread: 5, bar: 12, seed: 11 },
  andromeda: { arms: 2, tightness: 0.16, spread: 4, seed: 23 },
  triangulum: { arms: 3, tightness: 0.3, spread: 7, seed: 37 },
  whirlpool: { arms: 2, tightness: 0.24, spread: 3.2, companion: true, seed: 51 },
}

const EDGE = 44 // arms stop at this radius (the drawing is 100 × 100)

function galaxyDots(shape: GalaxyShape): Dot[] {
  const random = makeRandom(shape.seed)
  const dots: Dot[] = []
  const a = shape.bar ?? 4
  for (let arm = 0; arm < shape.arms; arm++) {
    const offset = (arm / shape.arms) * Math.PI * 2
    // follow the logarithmic spiral outwards until it reaches the edge
    for (let t = 0; t < 12 * Math.PI; t += 0.035) {
      const r = a * Math.exp(shape.tightness * t)
      if (r > EDGE) break
      const angle = t + offset
      const jitter = shape.spread * (0.4 + r / EDGE)
      const x = 50 + r * Math.cos(angle) + (random() - 0.5) * jitter
      const y = 50 + r * Math.sin(angle) + (random() - 0.5) * jitter
      const pink = random() < 0.08 // star-forming regions glow pink (hydrogen-alpha)
      dots.push({ x, y, r: 0.35 + random() * 0.9, o: 0.35 + random() * 0.6, c: pink ? '#f0607e' : random() < 0.3 ? '#cfe0ff' : '#ffffff' })
    }
  }
  // a diffuse halo of scattered stars
  for (let i = 0; i < 220; i++) {
    const ang = random() * Math.PI * 2
    const rr = Math.sqrt(random()) * 42
    dots.push({ x: 50 + rr * Math.cos(ang), y: 50 + rr * Math.sin(ang), r: 0.3 + random() * 0.5, o: 0.15 + random() * 0.3, c: '#ffffff' })
  }
  return dots
}

const DOTS: Record<string, Dot[]> = Object.fromEntries(Object.entries(SHAPES).map(([k, s]) => [k, galaxyDots(s)]))

/** How each galaxy is seen from Earth: face-on, or tilted. */
const VIEW: Record<string, string> = {
  milkyway: 'rotate(-20 50 50)',
  andromeda: 'rotate(-35 50 50) translate(0 32) scale(1 0.36)',
  triangulum: 'rotate(15 50 50) translate(0 12) scale(1 0.76)',
  whirlpool: 'rotate(10 50 50)',
}

export function GalaxyArt({ id, size }: { id: string; size: number }) {
  const shape = SHAPES[id]
  if (!shape) return null
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <g transform={VIEW[id]}>
        {DOTS[id].map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={d.c} opacity={d.o} />
        ))}
        {shape.bar && (
          <ellipse cx="50" cy="50" rx={shape.bar * 1.1} ry={shape.bar * 0.35} fill="url(#galaxy-core)" opacity="0.9" />
        )}
        <circle cx="50" cy="50" r={shape.bar ? 10 : 12} fill="url(#galaxy-core)" />
      </g>
      {shape.companion && <circle cx="80" cy="22" r="6" fill="url(#galaxy-core)" />}
    </svg>
  )
}

// ---------------------------------------------------------------- moons
// Spheres like the planets, with each moon's real surface character.
export function MoonArt({ id, size }: { id: string; size: number }) {
  let body: React.ReactNode
  switch (id) {
    case 'europa':
      body = (
        <>
          <rect width="100" height="100" fill="#e7dfce" />
          <path d="M10 20 Q 40 35 30 60 T 60 90" stroke="#b7ab8e" strokeWidth="2" fill="none" opacity="0.7" />
          <path d="M85 15 Q 55 40 70 65 T 40 95" stroke="#c9bd9e" strokeWidth="1.6" fill="none" opacity="0.6" />
          <path d="M5 60 Q 35 55 55 68" stroke="#b7ab8e" strokeWidth="1.4" fill="none" opacity="0.5" />
        </>
      )
      break
    case 'titan':
      body = (
        <>
          <rect width="100" height="100" fill="#e0a24a" />
          <ellipse cx="50" cy="50" rx="50" ry="50" fill="#f0bf6f" opacity="0.35" />
          <ellipse cx="35" cy="60" rx="18" ry="8" fill="#c47f2e" opacity="0.4" />
        </>
      )
      break
    case 'io':
      body = (
        <>
          <rect width="100" height="100" fill="#e8d24a" />
          <circle cx="30" cy="35" r="7" fill="#c25a2a" />
          <circle cx="62" cy="55" r="10" fill="#d97a30" />
          <circle cx="45" cy="72" r="5" fill="#b8471f" />
          <circle cx="70" cy="25" r="4" fill="#e0912f" />
        </>
      )
      break
    case 'enceladus':
      body = (
        <>
          <rect width="100" height="100" fill="#f2f6f8" />
          <path d="M20 70 Q 35 60 50 68 Q 65 76 80 66" stroke="#c9dbe0" strokeWidth="2" fill="none" opacity="0.6" />
        </>
      )
      break
    case 'triton':
      body = (
        <>
          <rect width="100" height="100" fill="#e9c8c2" />
          <ellipse cx="50" cy="12" rx="34" ry="12" fill="#f7ece9" />
          <path d="M15 55 Q 40 50 60 58 T 95 55" stroke="#d3a8a0" strokeWidth="1.6" fill="none" opacity="0.5" />
        </>
      )
      break
    default:
      body = <rect width="100" height="100" fill="#999" />
  }
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <Sphere>{body}</Sphere>
    </svg>
  )
}

// ---------------------------------------------------------------- meteor showers
// Streaks radiating out from one point (the "radiant"), as a shower looks in the sky.
export function ShowerArt({ seed, size }: { seed: number; size: number }) {
  const random = makeRandom(seed)
  const streaks = Array.from({ length: 14 }, () => {
    const angle = random() * Math.PI * 2
    const len = 30 + random() * 40
    const start = 6 + random() * 6
    return {
      x1: 50 + Math.cos(angle) * start, y1: 50 + Math.sin(angle) * start,
      x2: 50 + Math.cos(angle) * (start + len), y2: 50 + Math.sin(angle) * (start + len),
      o: 0.4 + random() * 0.5, w: 0.6 + random() * 0.9,
    }
  })
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      {Array.from({ length: 60 }, (_, i) => {
        const rand2 = makeRandom(seed + 900 + i)
        return <circle key={i} cx={rand2() * 100} cy={rand2() * 100} r={rand2() * 0.6} fill="#fff" opacity={rand2() * 0.5} />
      })}
      {streaks.map((s, i) => (
        <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke="#fff7d6" strokeWidth={s.w} strokeLinecap="round" opacity={s.o} />
      ))}
      <circle cx="50" cy="50" r="3.5" fill="#fff" opacity="0.9" />
    </svg>
  )
}

// ---------------------------------------------------------------- comets
export function CometArt({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <path d="M50 50 L 15 22" stroke="#cfe0ff" strokeWidth="10" strokeLinecap="round" opacity="0.18" />
      <path d="M50 50 L 15 22" stroke="#e8f2ff" strokeWidth="4" strokeLinecap="round" opacity="0.35" />
      <circle cx="50" cy="50" r="8" fill="#eaf3ff" />
      <circle cx="50" cy="50" r="8" fill="url(#sun-glow)" opacity="0.7" />
    </svg>
  )
}

// ---------------------------------------------------------------- constellations
// Simplified stick figures: stars placed to resemble each pattern, joined by lines.
// (Illustrative, not a precise star chart.)
const CONSTELLATION_STARS: Record<string, { pts: [number, number, number][]; lines: [number, number][] }> = {
  orion: {
    pts: [[30, 10, 2.6], [70, 12, 3], [50, 35, 1.4], [42, 50, 1.6], [50, 52, 1.6], [58, 50, 1.6], [25, 75, 2], [75, 78, 1.8]],
    lines: [[0, 3], [3, 4], [4, 5], [5, 1], [0, 2], [1, 2], [2, 6], [2, 7]],
  },
  'ursa-major': {
    pts: [[10, 60, 2], [28, 55, 1.8], [46, 58, 1.8], [62, 50, 2.2], [66, 30, 1.6], [82, 25, 1.6], [92, 35, 2]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]],
  },
  cassiopeia: {
    pts: [[10, 60, 1.8], [30, 30, 2], [50, 55, 2.2], [70, 25, 1.8], [90, 50, 1.8]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4]],
  },
  scorpius: {
    pts: [[10, 20, 1.6], [22, 30, 1.6], [34, 38, 2.6], [46, 48, 1.6], [56, 58, 1.6], [64, 70, 1.6], [70, 82, 1.6], [78, 88, 1.8]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]],
  },
  'southern-cross': {
    pts: [[50, 8, 2.4], [50, 88, 2], [15, 48, 1.8], [85, 48, 1.6]],
    lines: [[0, 1], [2, 3]],
  },
}

export function ConstellationArt({ id, size }: { id: string; size: number }) {
  const shape = CONSTELLATION_STARS[id]
  if (!shape) return null
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      {Array.from({ length: 40 }, (_, i) => {
        const r = makeRandom(id.length * 97 + i)
        return <circle key={i} cx={r() * 100} cy={r() * 100} r={r() * 0.5} fill="#fff" opacity={r() * 0.3} />
      })}
      {shape.lines.map(([a, b], i) => (
        <line
          key={i}
          x1={shape.pts[a][0]} y1={shape.pts[a][1]} x2={shape.pts[b][0]} y2={shape.pts[b][1]}
          stroke="#95a3c4" strokeWidth="0.8" opacity="0.55"
        />
      ))}
      {shape.pts.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#fff" />
      ))}
    </svg>
  )
}

// ---------------------------------------------------------------- nebulae
// Each nebula gets a drawing style closer to how it actually looks, not just
// a plain glowing ball: wispy overlapping clouds, a filament web for a
// supernova remnant, dark dust pillars for the Eagle, and a true ring shape
// for the two planetary nebulae (Helix, Ring), which really do look like rings.
const NEBULA_COLOR: Record<string, { c1: string; c2: string; c3: string }> = {
  'orion-nebula': { c1: '#f0607e', c2: '#8a5cff', c3: '#ffb37a' },
  'crab-nebula': { c1: '#5cc8c0', c2: '#f0607e', c3: '#8a5cff' },
  'eagle-nebula': { c1: '#e0a24a', c2: '#c9793a', c3: '#5cc8c0' },
  'helix-nebula': { c1: '#5cc8c0', c2: '#8a5cff', c3: '#3a6ea5' },
  'ring-nebula': { c1: '#8a5cff', c2: '#5cc8c0', c3: '#f0607e' },
}

/** A handful of soft, overlapping glowing blobs — the base "gas cloud" look. */
function cloudBlobs(id: string, colors: string[]) {
  const random = makeRandom(id.length * 131)
  return Array.from({ length: 6 }, (_, i) => {
    const color = colors[i % colors.length]
    const cx = 30 + random() * 40
    const cy = 30 + random() * 40
    const rx = 18 + random() * 20
    const ry = 14 + random() * 18
    const rot = random() * 180
    return (
      <ellipse
        key={i} cx={cx} cy={cy} rx={rx} ry={ry} fill={color}
        opacity={0.22 + random() * 0.2} transform={`rotate(${rot} ${cx} ${cy})`}
        filter="url(#neb-blur)"
      />
    )
  })
}

function scatteredStars(id: string, count = 45) {
  const random = makeRandom(id.length * 271)
  return Array.from({ length: count }, (_, i) => (
    <circle key={i} cx={random() * 100} cy={random() * 100} r={random() * 0.6} fill="#fff" opacity={random() * 0.6} />
  ))
}

export function NebulaArt({ id, size }: { id: string; size: number }) {
  const col = NEBULA_COLOR[id] ?? { c1: '#f0607e', c2: '#5cc8c0', c3: '#8a5cff' }

  // Planetary nebulae (Helix, Ring) really do appear as a glowing ring / "eye".
  if (id === 'helix-nebula' || id === 'ring-nebula') {
    return (
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
        {cloudBlobs(id, [col.c1, col.c2])}
        <circle cx="50" cy="50" r="30" fill="none" stroke={col.c1} strokeWidth="14" opacity="0.55" filter="url(#neb-blur)" />
        <circle cx="50" cy="50" r="30" fill="none" stroke={col.c2} strokeWidth="6" opacity="0.7" />
        <circle cx="50" cy="50" r="12" fill={col.c3} opacity="0.3" filter="url(#neb-blur)" />
        <circle cx="50" cy="50" r="3" fill="#fff" opacity="0.9" />
        {scatteredStars(id, 30)}
      </svg>
    )
  }

  // Crab Nebula: the tangled filaments of an exploded star, not a smooth cloud.
  if (id === 'crab-nebula') {
    const random = makeRandom(11)
    const filaments = Array.from({ length: 16 }, (_, i) => {
      const angle = (i / 16) * Math.PI * 2 + random() * 0.3
      const len = 22 + random() * 20
      const bend = (random() - 0.5) * 20
      const x2 = 50 + Math.cos(angle) * len, y2 = 50 + Math.sin(angle) * len
      const mx = 50 + Math.cos(angle) * len * 0.5 - Math.sin(angle) * bend
      const my = 50 + Math.sin(angle) * len * 0.5 + Math.cos(angle) * bend
      return <path key={i} d={`M50 50 Q ${mx} ${my} ${x2} ${y2}`} stroke={i % 2 ? col.c1 : col.c2} strokeWidth="2" fill="none" opacity="0.85" strokeLinecap="round" />
    })
    return (
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
        {cloudBlobs(id, [col.c1, col.c2])}
        {filaments}
        <circle cx="50" cy="50" r="3" fill="#fff" opacity="0.9" />
        {scatteredStars(id, 30)}
      </svg>
    )
  }

  // Eagle Nebula: dark dust "pillars" silhouetted against the glow, its most famous feature.
  if (id === 'eagle-nebula') {
    return (
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
        {cloudBlobs(id, [col.c1, col.c2, col.c3])}
        <path d="M38 78 L43 32 L49 33 L47 78 Z" fill="#150c22" opacity="0.9" />
        <path d="M50 80 L55 38 L60 39 L57 80 Z" fill="#150c22" opacity="0.85" />
        <path d="M33 80 L37 48 L42 49 L40 80 Z" fill="#150c22" opacity="0.8" />
        {scatteredStars(id, 35)}
      </svg>
    )
  }

  // Orion Nebula (default style): a bright, wispy star-forming cloud.
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      {cloudBlobs(id, [col.c1, col.c2, col.c3])}
      <circle cx="50" cy="50" r="6" fill="#fff" opacity="0.85" filter="url(#neb-blur)" />
      <circle cx="50" cy="50" r="2.2" fill="#fff" />
      {scatteredStars(id, 40)}
    </svg>
  )
}

// ---------------------------------------------------------------- stars
// A glowing disc, coloured by temperature and sized by the star's real class.
const STAR_LOOK: Record<string, { color: string; radius: number }> = {
  sirius: { color: '#eaf2ff', radius: 20 },
  betelgeuse: { color: '#ff7a4a', radius: 34 },
  'proxima-centauri': { color: '#ff8f6b', radius: 12 },
  rigel: { color: '#9dc4ff', radius: 30 },
  polaris: { color: '#fff3d6', radius: 22 },
}

export function StarArt({ id, size }: { id: string; size: number }) {
  const look = STAR_LOOK[id] ?? { color: '#fff', radius: 20 }
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <defs>
        <radialGradient id={`star-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="35%" stopColor={look.color} />
          <stop offset="100%" stopColor={look.color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill={`url(#star-${id})`} />
      <circle cx="50" cy="50" r={look.radius} fill={look.color} />
    </svg>
  )
}