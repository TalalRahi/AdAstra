// Tiny renderer: paragraphs, **bold**, and [n] citation chips.
import type { ReactNode } from 'react'

function inline(text: string, onCite?: (id: number) => void): ReactNode[] {
  // The brackets in the regex keep the matched pieces in the result.
  return text.split(/(\*\*[^*]+\*\*|\[\d+\])/g).map((part, i) => {
    const bold = part.match(/^\*\*(.+)\*\*$/)
    if (bold) return <strong key={i}>{bold[1]}</strong>

    const cite = part.match(/^\[(\d+)\]$/)
    if (cite) {
      const id = Number(cite[1])
      return (
        <button
          key={i}
          type="button"
          onClick={() => onCite?.(id)}
          className="mx-0.5 rounded bg-halpha/15 px-1.5 align-super text-xs font-semibold text-halpha hover:bg-halpha/30"
          aria-label={`Source ${id}`}
        >
          {id}
        </button>
      )
    }
    return part
  })
}

export default function RichText({ text, onCite }: { text: string; onCite?: (id: number) => void }) {
  return (
    <div className="space-y-4 leading-relaxed">
      {text.split(/\n{2,}/).map((para, i) => (
        <p key={i}>{inline(para, onCite)}</p>
      ))}
    </div>
  )
}