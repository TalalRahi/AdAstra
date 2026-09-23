// Draws the Moon's lit part for a phase fraction (0 = new, 0.5 = full),
// as seen from the Northern Hemisphere (lit on the right while waxing).

interface Props {
  fraction: number
  illumination: number
  size?: number
}

export default function MoonIcon({ fraction, illumination, size = 120 }: Props) {
  const r = 50
  const waxing = fraction < 0.5
  const rx = r * Math.abs(1 - 2 * illumination) // half-width of the shadow boundary
  // Outer edge: half circle on the lit side. Inner edge: the shadow boundary,
  // bulging towards the lit side for a crescent and away from it for a gibbous moon.
  const outerSweep = waxing ? 1 : 0
  const innerSweep = waxing === illumination < 0.5 ? 0 : 1
  const lit = `M 50 0 A ${r} ${r} 0 0 ${outerSweep} 50 100 A ${rx} ${r} 0 0 ${innerSweep} 50 0 Z`

  return (
    <svg
      viewBox="-2 -2 104 104"
      width={size}
      height={size}
      role="img"
      aria-label={`Moon, ${Math.round(illumination * 100)}% lit`}
    >
      <circle cx="50" cy="50" r={r} fill="var(--color-panel)" stroke="var(--color-line)" strokeWidth="1.5" />
      {illumination > 0.005 && <path d={lit} fill="var(--color-ink)" />}
    </svg>
  )
}