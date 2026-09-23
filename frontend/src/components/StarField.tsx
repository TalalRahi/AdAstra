// Astronomy background: randomly scattered stars behind every page.
// A fixed "seed" makes the pattern the same on every visit.
// Drawn once as SVG; no image file, nothing to download.

function makeRandom(seed: number) {
  // Tiny pseudo-random number generator (mulberry32): same seed, same numbers.
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const random = makeRandom(400)
const TINTS = ['#ffffff', '#ffffff', '#ffffff', '#dce6ff', '#fff0dc'] // mostly white, some blue/warm stars

const STARS = Array.from({ length: 260 }, () => {
  const big = random() < 0.06 // a few brighter stars
  return {
    x: random() * 1000,
    y: random() * 1000,
    r: big ? 1.2 + random() * 0.8 : 0.3 + random() * 0.7,
    opacity: big ? 0.8 + random() * 0.2 : 0.25 + random() * 0.5,
    color: TINTS[Math.floor(random() * TINTS.length)],
  }
})

export default function StarField() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full print:hidden"
      viewBox="0 0 1000 1000"
      preserveAspectRatio="xMidYMid slice"
    >
      {STARS.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={s.color} opacity={s.opacity} />
      ))}
    </svg>
  )
}