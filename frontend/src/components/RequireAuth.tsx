// The gate: pages inside it need a signed-in user.
// Signed-out visitors are sent to the landing page, and after signing in
// they come back to the page they wanted.
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from '../lib/auth'

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { enabled, loading, user } = useAuth()
  const location = useLocation()

  if (!enabled) return <>{children}</> // accounts not configured: site stays open (local testing)
  if (loading) {
    return <p className="grid min-h-screen place-items-center text-muted">Loading…</p>
  }
  if (!user) return <Navigate to="/welcome" replace state={{ from: location.pathname }} />
  return <>{children}</>
}