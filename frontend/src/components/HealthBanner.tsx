import { useEffect, useState } from 'react'
import { getHealth } from '../lib/api'
import type { HealthResponse } from '../lib/types'

const NAMES: Record<string, string> = {
  classifier: 'Classifier',
  knowledge_base: 'Knowledge base',
  llm: 'Explanations (Gemma)',
  accounts: 'Accounts',
  database: 'Database',
}

export default function HealthBanner() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getHealth().then(setHealth).catch((e: Error) => setError(e.message))
  }, [])

  if (error) {
    return (
      <p role="status" className="rounded-md border border-halpha/60 bg-halpha/10 px-4 py-3 text-sm">
        {error}
      </p>
    )
  }
  if (!health) {
    return <p role="status" className="text-sm text-muted">Checking the server…</p>
  }

  const slots = Object.entries(health.slots)
  const allLive = slots.every(([, s]) => s.status === 'live')
  return (
    <div role="status" className="text-sm">
      <p className={allLive ? 'text-oiii' : 'text-amber'}>
        {allLive
          ? 'All components are running with real models.'
          : 'Running in demo mode. Results are placeholders until the missing parts are added.'}
      </p>
      <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-muted">
        {slots.map(([key, slot]) => (
          <li key={key} title={slot.detail} className="flex items-center gap-2">
            <span
              aria-hidden
              className={`inline-block size-2 rounded-full ${slot.status === 'live' ? 'bg-oiii' : 'bg-amber'}`}
            />
            {NAMES[key] ?? key}: {slot.status === 'live' ? 'ready' : 'not connected'}
          </li>
        ))}
      </ul>
    </div>
  )
}