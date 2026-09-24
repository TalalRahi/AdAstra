// The only file that talks to the backend.
import type {
  ChatResponse,
  ChatTurn,
  Classification,
  ClassifyResponse,
  ExplainResponse,
  HealthResponse,
  Level,
  Profile,
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

// When someone is signed in, lib/auth.tsx sets this to a function that returns
// their Firebase pass (ID token). It is sent with every request.
type TokenProvider = () => Promise<string | null>
let getToken: TokenProvider = async () => null
export function setTokenProvider(provider: TokenProvider) {
  getToken = provider
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // Give up after TIMEOUT_MS so the page never waits forever.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  const headers = new Headers(init?.headers)
  const token = await getToken().catch(() => null)
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers, signal: controller.signal })
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

/** The signed-in user's profile (created on the server on first visit). */
export function getMe(): Promise<Profile> {
  return request('/me')
}

/** Save the name and the email-updates choice. */
export function saveMe(name: string, emailUpdates: boolean): Promise<Profile> {
  return request('/me', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email_updates: emailUpdates }),
  })
}

/** Delete everything AdAstra stores about the signed-in user. */
export function deleteMe(): Promise<{ deleted: boolean }> {
  return request('/me', { method: 'DELETE' })
}