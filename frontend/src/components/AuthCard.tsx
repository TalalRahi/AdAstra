// Shared look for the Sign up and Sign in pages.
import type { ReactNode } from 'react'

export const inputClass =
  'mt-1 w-full rounded-md border border-line bg-panel px-3 py-2 placeholder:text-muted focus:border-halpha'

export default function AuthCard({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-md py-8">
      <h1 className="font-display text-4xl">{title}</h1>
      <p className="mt-2 text-muted">{intro}</p>
      <div className="mt-8 rounded-lg border border-line bg-panel/70 p-6">{children}</div>
    </div>
  )
}