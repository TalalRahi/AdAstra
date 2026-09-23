// The only file that talks to the backend.
import type {
  ChatResponse,
  ChatTurn,
  Classification,
  ClassifyResponse,
  ExplainResponse,
  HealthResponse,
  Level,
} from './types'

const BASE = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api').replace(/\/$/, '')
const TIMEOUT_MS = 130_000

export class ApiError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // Give up after TIMEOUT_MS so the page never waits forever.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, { ...init, signal: controller.signal })
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new ApiError('timeout', 'The server took too long to answer. Try again.')
    }
    throw new ApiError('unreachable', `Cannot reach the backend at ${BASE}. Is it running?`)
  } finally {
    clearTimeout(timer)
  }

  if (!res.ok) {
    // Our backend sends {"error": {"code", "message"}}; FastAPI's own
    // validation errors send {"detail": [...]}. Handle both.
    let message = `Request failed with status ${res.status}.`
    let code = `http_${res.status}`
    try {
      const body = await res.json()
      if (body?.error) {
        message = body.error.message
        code = body.error.code
      } else if (Array.isArray(body?.detail)) {
        message = body.detail.map((d: { msg: string }) => d.msg).join('; ')
      }
    } catch {
      /* body was not JSON; keep the generic message */
    }
    throw new ApiError(code, message)
  }
  return res.json() as Promise<T>
}

export function getHealth(): Promise<HealthResponse> {
  return request('/health')
}

export function classify(file: Blob, filename: string, level: Level): Promise<ClassifyResponse> {
  const form = new FormData()
  form.append('file', file, filename)
  form.append('level', level)
  return request('/classify', { method: 'POST', body: form })
}

/** Re-explain an earlier result at another level (no re-upload needed). */
export function explain(classification: Classification, level: Level): Promise<ExplainResponse> {
  return request('/explain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ classification, level }),
  })
}

/** The "Ask" page: a question for the astronomy assistant. */
export function askQuestion(
  question: string,
  k: number,
  history: ChatTurn[],
  analysisContext: Classification | null,
): Promise<ChatResponse> {
  return request('/rag-query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, k, history, analysis_context: analysisContext }),
  })
}