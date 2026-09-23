// Holds the current result for the Results page. The result survives a page
// reload (sessionStorage); the image preview does not. No database anywhere.
import { createContext, useContext, useState, type ReactNode } from 'react'
import type { ClassifyResponse } from './types'

const KEY = 'adastra:last-result'

interface Store {
  result: ClassifyResponse | null
  previewUrl: string | null
  setAnalysis: (result: ClassifyResponse, previewUrl: string | null) => void
  clear: () => void
}

const Ctx = createContext<Store | null>(null)

function readSaved(): ClassifyResponse | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as ClassifyResponse) : null
  } catch {
    return null
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [result, setResult] = useState<ClassifyResponse | null>(readSaved)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const setAnalysis = (r: ClassifyResponse, url: string | null) => {
    setResult(r)
    setPreviewUrl((old) => {
      if (old && old !== url) URL.revokeObjectURL(old) // free the old preview's memory
      return url
    })
    try {
      sessionStorage.setItem(KEY, JSON.stringify(r))
    } catch {
      /* storage full or disabled: the result still works for this page view */
    }
  }

  const clear = () => {
    setResult(null)
    setPreviewUrl((old) => {
      if (old) URL.revokeObjectURL(old)
      return null
    })
    try {
      sessionStorage.removeItem(KEY)
    } catch {
      /* ignore */
    }
  }

  return <Ctx.Provider value={{ result, previewUrl, setAnalysis, clear }}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}