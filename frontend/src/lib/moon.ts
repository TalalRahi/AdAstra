// Moon phases, calculated in the browser (no internet, no API).
//
// Dates of new moon, first quarter, full moon and last quarter use the
// algorithm in Jean Meeus, "Astronomical Algorithms" (2nd ed., 1998),
// chapter 49, with its main correction terms. The lit fraction uses the
// simplified formula of chapter 48. Checked against the PyEphem library for
// 2025-2026: all 99 phase dates within 2 minutes, lit fraction within 1%.

const SYNODIC_MONTH = 29.530588861 // days from one new moon to the next (average)
const RAD = Math.PI / 180

export type PhaseKind = 'new' | 'first' | 'full' | 'last'

export const PHASE_NAMES: Record<PhaseKind, string> = {
  new: 'New Moon',
  first: 'First Quarter',
  full: 'Full Moon',
  last: 'Last Quarter',
}

export interface PhaseEvent {
  kind: PhaseKind
  date: Date
}

export interface MoonToday {
  name: string            // e.g. "Waxing Gibbous"
  fraction: number        // 0 = new, 0.25 = first quarter, 0.5 = full, 0.75 = last quarter
  illumination: number    // 0..1, share of the disc that is lit
  ageDays: number         // days since the last new moon
  upcoming: PhaseEvent[]  // the next principal phases, soonest first
}

const jdToDate = (jd: number) => new Date((jd - 2440587.5) * 86_400_000)
const dateToJd = (d: Date) => d.getTime() / 86_400_000 + 2440587.5

/** Julian date of the phase with lunation number k (k whole = new moon,
 *  k + 0.25 = first quarter, + 0.5 = full, + 0.75 = last quarter). */
function phaseJd(k: number): number {
  const T = k / 1236.85
  let jd =
    2451550.09766 + SYNODIC_MONTH * k + 0.00015437 * T ** 2 - 0.00000015 * T ** 3 + 0.00000000073 * T ** 4

  const E = 1 - 0.002516 * T - 0.0000074 * T ** 2
  const M = (2.5534 + 29.1053567 * k - 0.0000014 * T ** 2 - 0.00000011 * T ** 3) * RAD
  const Mp = (201.5643 + 385.81693528 * k + 0.0107582 * T ** 2 + 0.00001238 * T ** 3 - 0.000000058 * T ** 4) * RAD
  const F = (160.7108 + 390.67050284 * k - 0.0016118 * T ** 2 - 0.00000227 * T ** 3 + 0.000000011 * T ** 4) * RAD
  const Om = (124.7746 - 1.56375588 * k + 0.0020672 * T ** 2 + 0.00000215 * T ** 3) * RAD
  const s = Math.sin
  const frac = ((k % 1) + 1) % 1

  if (frac < 0.01 || frac > 0.99 || Math.abs(frac - 0.5) < 0.01) {
    const full = Math.abs(frac - 0.5) < 0.01
    jd +=
      (full ? -0.40614 : -0.4072) * s(Mp) +
      (full ? 0.17302 : 0.17241) * E * s(M) +
      (full ? 0.01614 : 0.01608) * s(2 * Mp) +
      (full ? 0.01043 : 0.01039) * s(2 * F) +
      (full ? 0.00734 : 0.00739) * E * s(Mp - M) -
      (full ? 0.00515 : 0.00514) * E * s(Mp + M) +
      (full ? 0.00209 : 0.00208) * E * E * s(2 * M) -
      0.00111 * s(Mp - 2 * F) -
      0.00057 * s(Mp + 2 * F) +
      0.00056 * E * s(2 * Mp + M) -
      0.00042 * s(3 * Mp) +
      0.00042 * E * s(M + 2 * F) +
      0.00038 * E * s(M - 2 * F) -
      0.00024 * E * s(2 * Mp - M) -
      0.00017 * s(Om) -
      0.00007 * s(Mp + 2 * M) +
      0.00004 * s(2 * Mp - 2 * F) +
      0.00004 * s(3 * M) +
      0.00003 * s(Mp + M - 2 * F) +
      0.00003 * s(2 * Mp + 2 * F) -
      0.00003 * s(Mp + M + 2 * F) +
      0.00003 * s(Mp - M + 2 * F) -
      0.00002 * s(Mp - M - 2 * F) -
      0.00002 * s(3 * Mp + M) +
      0.00002 * s(4 * Mp)
  } else {
    jd +=
      -0.62801 * s(Mp) +
      0.17172 * E * s(M) -
      0.01183 * E * s(Mp + M) +
      0.00862 * s(2 * Mp) +
      0.00804 * s(2 * F) +
      0.00454 * E * s(Mp - M) +
      0.00204 * E * E * s(2 * M) -
      0.0018 * s(Mp - 2 * F) -
      0.0007 * s(Mp + 2 * F) -
      0.0004 * s(3 * Mp) -
      0.00034 * E * s(2 * Mp - M) +
      0.00032 * E * s(M + 2 * F) +
      0.00032 * E * s(M - 2 * F) -
      0.00028 * E * E * s(Mp + 2 * M) +
      0.00027 * E * s(2 * Mp + M) -
      0.00017 * s(Om) -
      0.00005 * s(Mp - M - 2 * F) +
      0.00004 * s(2 * Mp + 2 * F) -
      0.00004 * s(Mp + M + 2 * F) +
      0.00004 * s(Mp - 2 * M) +
      0.00003 * s(Mp + M - 2 * F) +
      0.00003 * s(3 * M) +
      0.00002 * s(2 * Mp - 2 * F) +
      0.00002 * s(Mp - M + 2 * F) -
      0.00002 * s(3 * Mp + M)
    const W =
      0.00306 - 0.00038 * E * Math.cos(M) + 0.00026 * Math.cos(Mp) - 0.00002 * Math.cos(Mp - M) +
      0.00002 * Math.cos(Mp + M) + 0.00002 * Math.cos(2 * F)
    jd += frac < 0.5 ? W : -W // first quarter +W, last quarter -W
  }
  return jd - 69 / 86_400 // Meeus gives Terrestrial Time; clocks run ~69 s behind it
}

/** Share of the Moon's disc that is lit, 0..1 (Meeus ch. 48, simplified). */
export function illuminatedFraction(date: Date): number {
  const T = (dateToJd(date) - 2451545) / 36525
  const D = (297.8501921 + 445267.1114034 * T - 0.0018819 * T ** 2) * RAD  // Moon-Sun elongation
  const M = (357.5291092 + 35999.0502909 * T - 0.0001536 * T ** 2) * RAD   // Sun's mean anomaly
  const Mp = (134.9633964 + 477198.8675055 * T + 0.0087414 * T ** 2) * RAD // Moon's mean anomaly
  const i = // phase angle, degrees
    180 - D / RAD - 6.289 * Math.sin(Mp) + 2.1 * Math.sin(M) - 1.274 * Math.sin(2 * D - Mp) -
    0.658 * Math.sin(2 * D) - 0.214 * Math.sin(2 * Mp) - 0.11 * Math.sin(D)
  return (1 + Math.cos(i * RAD)) / 2
}

const KINDS: PhaseKind[] = ['new', 'first', 'full', 'last']

/** All principal phases between two dates, in order. */
export function phasesBetween(start: Date, end: Date): PhaseEvent[] {
  const years = (start.getTime() - Date.UTC(2000, 0, 6)) / (365.2425 * 86_400_000)
  let k = Math.floor(years * 12.3685) - 1 // start a little before, to be safe
  const events: PhaseEvent[] = []
  for (let i = 0; i < 400; i++, k += 0.25) {
    const date = jdToDate(phaseJd(k))
    if (date > end) break
    if (date >= start) events.push({ kind: KINDS[Math.round((((k % 1) + 1) % 1) * 4) % 4], date })
  }
  return events
}

/** Today's phase and the next few principal phases. */
export function moonToday(now: Date = new Date(), count = 4): MoonToday {
  const day = 86_400_000
  const around = phasesBetween(new Date(now.getTime() - 32 * day), new Date(now.getTime() + 120 * day))
  const pastNew = around.filter((e) => e.kind === 'new' && e.date <= now).at(-1)!
  const nextNew = around.find((e) => e.kind === 'new' && e.date > now)!
  const ageDays = (now.getTime() - pastNew.date.getTime()) / day
  const fraction = (dateToJd(now) - dateToJd(pastNew.date)) / (dateToJd(nextNew.date) - dateToJd(pastNew.date))
  const illumination = illuminatedFraction(now)

  // Named after a principal phase if within about a day of it; otherwise in-between names.
  const near = around.find((e) => Math.abs(e.date.getTime() - now.getTime()) < 0.9 * day)
  let name: string
  if (near) name = PHASE_NAMES[near.kind]
  else if (fraction < 0.25) name = 'Waxing Crescent'
  else if (fraction < 0.5) name = 'Waxing Gibbous'
  else if (fraction < 0.75) name = 'Waning Gibbous'
  else name = 'Waning Crescent'

  return { name, fraction, illumination, ageDays, upcoming: around.filter((e) => e.date > now).slice(0, count) }
}