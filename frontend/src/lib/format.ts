export const pct = (p: number) => `${Math.round(p * 100)}%`

export const LEVELS = [
  { value: 'beginner', label: 'Beginner', hint: 'Plain language, no jargon' },
  { value: 'intermediate', label: 'Intermediate', hint: 'Key terms explained' },
  { value: 'advanced', label: 'Advanced', hint: 'Technical detail' },
] as const

/** e.g. "Sat 26 Sep, 22:49" in the viewer's own time zone. */
export const dateTime = (d: Date | string) =>
  new Date(d).toLocaleString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })

/** e.g. "in 2 days" / "in 5 hours". */
export function fromNow(d: Date): string {
  const hours = (d.getTime() - Date.now()) / 3_600_000
  if (hours < 1) return 'within the hour'
  if (hours < 36) return `in ${Math.round(hours)} hours`
  return `in ${Math.round(hours / 24)} days`
}