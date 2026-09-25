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

/** Shared gradients, rendered once on the page. */
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