// Mirrors backend/adastra/schemas.py. If you change one, change the other.

export type Level = 'beginner' | 'intermediate' | 'advanced'
export type Mode = 'live' | 'demo'

export interface ClassProbability {
  label: string
  probability: number
}

export interface ModelInfo {
  architecture: string
  weights_loaded: boolean
  classes: string[]
}

export interface Classification {
  predicted_class: string
  confidence: number
  probabilities: ClassProbability[]
  top_k: ClassProbability[]
  uncertain: boolean
  uncertainty_reason: string | null
  model: ModelInfo
}

// An independent, pretrained-only check run BEFORE the classifier: does this
// even look like an astronomical image? When likely_astronomical is false,
// classification/galaxy_morphology/explanation on the response are all null
// — nothing downstream ran — and `message` is what to show the user instead.
export interface ClipGate {
  weights_loaded: boolean
  architecture: string
  astro_score: number
  threshold: number
  likely_astronomical: boolean
  zero_shot_top3: ClassProbability[]
  agrees_with_classifier: boolean | null
  message: string | null
}

export interface GalaxyMorphology {
  enabled: boolean
  ran: boolean
  predicted_class: string | null
  confidence: number | null
  probabilities: ClassProbability[] | null
  model: ModelInfo | null
  reason: string | null
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
  clip: ClipGate
  // All three are null when clip.likely_astronomical is false.
  classification: Classification | null
  galaxy_morphology: GalaxyMorphology | null
  explanation: Explanation | null
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

export interface Profile {
  uid: string
  email: string | null
  email_verified: boolean
  name: string
  email_updates: { opted_in: boolean; updated_at: string }
  created_at: string
}

// ---------------------------------------------------------------- history
// The server's shape for one saved analysis (snake_case, straight off the
// wire). lib/history.ts converts this to its own camelCase HistoryEntry —
// pages never see ServerHistoryEntry directly.
export interface ServerHistoryEntry {
  id: string
  result: ClassifyResponse
  file_name: string
  thumbnail: string | null
  saved_at: string
}

export interface HistoryListResponse {
  entries: ServerHistoryEntry[]
}