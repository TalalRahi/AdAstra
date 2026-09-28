import { describe, expect, it } from 'vitest'
import { MAX_SIDE, fitWithin } from './downscale'
import { pct } from './format'
import { illuminatedFraction, moonToday, phasesBetween } from './moon'

describe('fitWithin (upload downscaling)', () => {
  it('shrinks a large image to fit MAX_SIDE, keeping its shape', () => {
    expect(fitWithin(4000, 2000)).toEqual({ width: MAX_SIDE, height: 800 })
  })
  it('leaves a small image alone', () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 })
  })
})

describe('pct', () => {
  it('rounds a probability to a whole percent', () => {
    expect(pct(0.876)).toBe('88%')
    expect(pct(0.5)).toBe('50%')
    expect(pct(0)).toBe('0%')
  })
})

describe('moon calculator', () => {
  it('finds about 8 principal phases in two months, in order, cycling new-first-full-last', () => {
    const events = phasesBetween(new Date('2026-01-01T00:00:00Z'), new Date('2026-03-01T00:00:00Z'))
    expect(events.length).toBeGreaterThanOrEqual(7)
    expect(events.length).toBeLessThanOrEqual(9)
    const order = ['new', 'first', 'full', 'last']
    for (let i = 1; i < events.length; i++) {
      expect(events[i].date.getTime()).toBeGreaterThan(events[i - 1].date.getTime())
      const step = (order.indexOf(events[i].kind) - order.indexOf(events[i - 1].kind) + 4) % 4
      expect(step).toBe(1)
    }
  })

  it('is nearly dark at a new moon and nearly fully lit at a full moon', () => {
    const events = phasesBetween(new Date('2026-01-01T00:00:00Z'), new Date('2026-04-01T00:00:00Z'))
    const newMoon = events.find((e) => e.kind === 'new')!
    const fullMoon = events.find((e) => e.kind === 'full')!
    expect(illuminatedFraction(newMoon.date)).toBeLessThan(0.03)
    expect(illuminatedFraction(fullMoon.date)).toBeGreaterThan(0.97)
  })

  it('gives sensible values for today', () => {
    const moon = moonToday(new Date('2026-09-29T12:00:00Z'))
    expect(moon.illumination).toBeGreaterThanOrEqual(0)
    expect(moon.illumination).toBeLessThanOrEqual(1)
    expect(moon.fraction).toBeGreaterThanOrEqual(0)
    expect(moon.fraction).toBeLessThan(1)
    expect(moon.ageDays).toBeGreaterThanOrEqual(0)
    expect(moon.ageDays).toBeLessThan(30)
    expect(moon.upcoming).toHaveLength(4)
  })
})