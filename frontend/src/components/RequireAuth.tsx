// The gate: pages inside it need a signed-in user with a verified email.
// Signed-out visitors are sent to the landing page, and after signing in
// they come back to the page they wanted. Signed-in users who haven't
// verified their email see the "verify your email" screen instead of the app
// (except the Account page, so they can sign out or delete their account).
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from '../lib/auth'
import VerifyEmailGate from './VerifyEmailGate'

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { enabled, loading, user, verified } = useAuth()
  const location = useLocation()

  if (!enabled) return <>{children}</> // accounts not configured: site stays open (local testing)
  if (loading) {
    return <p className="grid min-h-screen place-items-center text-muted">Loading…</p>
  }
  if (!user) return <Navigate to="/welcome" replace state={{ from: location.pathname }} />
  if (!verified && location.pathname !== '/account') return <VerifyEmailGate />
  return <>{children}</>
}