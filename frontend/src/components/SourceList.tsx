// A numbered list of sources. `idPrefix` keeps ids unique when several lists
// are on one page (one per chat answer), so [n] chips jump to the right one.
import type { Source } from '../lib/types'

interface Props {
  sources: Source[]
  citedIds: number[]
  idPrefix: string
}

export default function SourceList({ sources, citedIds, idPrefix }: Props) {
  if (sources.length === 0) {
    return <p className="text-sm text-muted">No passage in the knowledge base matched.</p>
  }
  return (
    <ol className="space-y-2">
      {sources.map((s) => {
        const cited = citedIds.includes(s.id)
        return (
          <li
            key={s.id}
            id={`${idPrefix}-${s.id}`}
            tabIndex={-1}
            className={`rounded-md border border-line p-3 text-sm ${cited ? '' : 'opacity-50'}`}
          >
            <p className="font-medium">
              [{s.id}]{' '}
              {s.url ? (
                <a href={s.url} target="_blank" rel="noreferrer" className="underline">
                  {s.title}
                </a>
              ) : (
                s.title
              )}
              {s.page != null && <span className="text-muted">, p. {s.page}</span>}
              <span className="ml-2 text-xs text-muted">{s.kind}</span>
            </p>
            <p className="mt-1 text-muted">{s.snippet}</p>
            {!cited && <p className="mt-1 text-xs text-muted">Retrieved but not cited.</p>}
          </li>
        )
      })}
    </ol>
  )
}