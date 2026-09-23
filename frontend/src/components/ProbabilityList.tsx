import { pct } from '../lib/format'
import type { ClassProbability } from '../lib/types'

export default function ProbabilityList({ items }: { items: ClassProbability[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item, i) => (
        <li key={item.label}>
          <div className="flex justify-between text-sm">
            <span className={i === 0 ? 'font-semibold' : 'text-muted'}>{item.label}</span>
            <span className="tabular-nums text-muted">{pct(item.probability)}</span>
          </div>
          <div
            className="mt-1 h-1.5 rounded-full bg-line"
            role="meter"
            aria-label={item.label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(item.probability * 100)}
          >
            <div
              className={`h-full rounded-full ${i === 0 ? 'bg-halpha' : 'bg-muted/60'}`}
              style={{ width: `${Math.max(item.probability * 100, 1)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}