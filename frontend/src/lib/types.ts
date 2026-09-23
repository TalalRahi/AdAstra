// Mirrors backend/adastra/schemas.py. If you change one, change the other.

export type Level = 'beginner' | 'intermediate' | 'advanced'
export type Mode = 'live' | 'demo'

export interface ClassProbability {
  label: string
  probability: number
}

export interface Classification {
  predicted_class: string
  confidence: number
  probabilities: ClassProbability[]
  top_k: ClassProbability[]
  uncertain: boolean
  uncertainty_reason: string | null
  model: { architecture: string; weights_loaded: boolean; classes: string[] }
}

export interface Source {
  id: number
  title: string
  kind: 'paper' | 'book' | 'wikipedia' | 'other'
  page: number | null
  url: string | null
  snippet: string
}

export interface Explanation {
  level: Level
  text: string
  cited_ids: number[]
  mode: Mode
}

export interface ClassifyResponse {
  mode: Mode
  request_id: string
  image: { width: number; height: number; format: string; sha256: string }
  classification: Classification
  explanation: Explanation
  sources: Source[]
  timings_ms: Record<string, number>
  warnings: string[]
}

export interface SlotStatus {
  status: 'live' | 'missing'
  detail: string
}

export interface HealthResponse {
  ok: boolean
  version: string
  demo_mode: string
  classes: string[]
  slots: Record<string, SlotStatus>
}

export interface ExplainResponse {
  explanation: Explanation
  sources: Source[]
  warnings: string[]
}

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatAnswer {
  text: string
  cited_ids: number[]
  mode: Mode
}

export interface ChatResponse {
  answer: ChatAnswer
  sources: Source[]
  warnings: string[]
  latency_ms: number
}