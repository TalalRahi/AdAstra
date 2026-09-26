import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import RichText from '../components/RichText'
import SourceList from '../components/SourceList'
import { askQuestion } from '../lib/api'
import { pct } from '../lib/format'
import { useStore } from '../lib/store'
import type { ChatResponse, ChatTurn } from '../lib/types'

interface Message {
  id: string
  question: string
  response: ChatResponse | null // null while waiting
  error: string | null
}

const KEY = 'adastra:chat'
const SUGGESTIONS = [
  'What is a nebula?',
  'How do stars form?',
  'What is the difference between spiral and elliptical galaxies?',
  'Why does the Moon have phases?',
]

function loadSaved(): Message[] {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Message[]) : []
  } catch {
    return []
  }
}

export default function ChatPage() {
  const { result } = useStore()
  const location = useLocation()
  const navigate = useNavigate()
  // A question sent from another page, e.g. "Ask AdAstra about Jupiter" on the Sky page.
  const incoming = (location.state as { ask?: string } | null)?.ask
  const sentIncoming = useRef(false)
  const [messages, setMessages] = useState<Message[]>(loadSaved)
  const [text, setText] = useState('')
  const [k, setK] = useState(4)
  const [useResult, setUseResult] = useState(!incoming) // a Sky question isn't about your last image
  const busy = messages.some((m) => m.response === null && m.error === null)
  const bottom = useRef<HTMLDivElement>(null)

  // Keep the conversation for this browser tab (no database).
  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(messages.filter((m) => m.response || m.error)))
    } catch {
      /* storage full or disabled: the chat still works on this page */
    }
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  const send = async (question: string) => {
    const q = question.trim()
    if (q.length < 3 || busy) return
    setText('')

    // The last two exchanges, so Gemma understands follow-ups like "how big are they?"
    const history: ChatTurn[] = messages
      .filter((m) => m.response)
      .slice(-2)
      .flatMap((m) => [
        { role: 'user' as const, content: m.question },
        { role: 'assistant' as const, content: m.response!.answer.text },
      ])

    const id = `m${Date.now()}`
    setMessages((old) => [...old, { id, question: q, response: null, error: null }])
    try {
      // result.classification is null when the last image failed the
      // astronomical-image check — nothing to attach as context then.
      const context = useResult && result?.classification ? result.classification : null
      const response = await askQuestion(q, k, history, context)
      setMessages((old) => old.map((m) => (m.id === id ? { ...m, response } : m)))
    } catch (e) {
      setMessages((old) => old.map((m) => (m.id === id ? { ...m, error: (e as Error).message } : m)))
    }
  }

  // Send the incoming question once, then clear it so a page refresh doesn't send it again.
  useEffect(() => {
    if (incoming && !sentIncoming.current) {
      sentIncoming.current = true
      navigate('.', { replace: true, state: null })
      send(incoming)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault() // Enter sends; Shift+Enter makes a new line
      send(text)
    }
  }

  const jumpTo = (messageId: string, n: number) => {
    const el = document.getElementById(`${messageId}-${n}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    el?.focus()
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="font-display text-4xl">Ask about astronomy</h1>
        <p className="mt-2 text-muted">
          Answers come only from the curated knowledge base, with the source of each claim. If the sources
          don't cover a question, the assistant says so.
        </p>
      </header>

      {result?.classification && (
        <label className="flex items-start gap-3 rounded-md border border-line p-3 text-sm">
          <input
            type="checkbox"
            checked={useResult}
            onChange={(e) => setUseResult(e.target.checked)}
            className="mt-1 accent-[var(--color-halpha)]"
          />
          <span>
            Ask about my last result: <strong>{result.classification.predicted_class}</strong> (
            {pct(result.classification.confidence)}
            {result.classification.uncertain ? ', uncertain' : ''})
          </span>
        </label>
      )}

      {messages.length === 0 && (
        <div>
          <p className="mb-3 text-sm text-muted">Try one of these:</p>
          <div className="flex flex-wrap gap-2">
            {(result?.classification && useResult
              ? [`Tell me more about ${result.classification.predicted_class}`]
              : []
            )
              .concat(SUGGESTIONS)
              .map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-line px-3 py-1.5 text-sm hover:border-halpha"
                >
                  {s}
                </button>
              ))}
          </div>
        </div>
      )}

      <ol className="space-y-10" aria-live="polite">
        {messages.map((m) => (
          <li key={m.id} className="space-y-4">
            <p className="ml-auto w-fit max-w-[85%] rounded-lg bg-panel px-4 py-2">{m.question}</p>

            {m.response === null && m.error === null && (
              <p className="text-muted">Searching the knowledge base and asking Gemma… (up to 30 seconds)</p>
            )}
            {m.error && <p className="text-halpha">{m.error}</p>}

            {m.response && (
              <div className="space-y-4">
                {m.response.answer.mode === 'demo' && (
                  <p className="text-sm text-amber">Placeholder answer: Gemma was not used.</p>
                )}
                <RichText text={m.response.answer.text} onCite={(n) => jumpTo(m.id, n)} />
                {m.response.warnings.length > 0 && (
                  <ul className="list-disc space-y-1 pl-5 text-sm text-amber">
                    {m.response.warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                )}
                <details className="text-sm" open={m.response.answer.cited_ids.length > 0}>
                  <summary className="cursor-pointer text-muted">
                    Sources ({m.response.sources.length}), answered in{' '}
                    {(m.response.latency_ms / 1000).toFixed(1)} s
                  </summary>
                  <div className="mt-3">
                    <SourceList
                      sources={m.response.sources}
                      citedIds={m.response.answer.cited_ids}
                      idPrefix={m.id}
                    />
                  </div>
                </details>
              </div>
            )}
          </li>
        ))}
      </ol>
      <div ref={bottom} />

      <div className="sticky bottom-0 space-y-2 bg-night pb-4 pt-2">
        <div className="flex gap-2">
          <label htmlFor="question" className="sr-only">
            Your question
          </label>
          <textarea
            id="question"
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            maxLength={1000}
            placeholder="Ask a question about astronomy…"
            className="flex-1 resize-none rounded-md border border-line bg-panel px-3 py-2 placeholder:text-muted"
          />
          <button
            type="button"
            onClick={() => send(text)}
            disabled={busy || text.trim().length < 3}
            className="rounded-md bg-halpha px-4 font-semibold text-night disabled:opacity-40"
          >
            Send
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <label className="flex items-center gap-2">
            Passages to search
            <select
              value={k}
              onChange={(e) => setK(Number(e.target.value))}
              className="rounded border border-line bg-panel px-1 py-0.5 text-ink"
            >
              {[2, 4, 6, 8].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <span>Enter to send, Shift+Enter for a new line</span>
          {messages.length > 0 && (
            <button type="button" onClick={() => setMessages([])} className="underline hover:text-ink">
              Clear conversation
            </button>
          )}
        </div>
      </div>
    </div>
  )
}