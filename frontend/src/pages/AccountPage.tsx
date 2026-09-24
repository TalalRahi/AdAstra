import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { friendlyError, useAuth } from '../lib/auth'
import { dateTime } from '../lib/format'

export default function AccountPage() {
  const { enabled, loading, user, profile, profileError, signOut, resendVerification, setEmailUpdates, deleteAccount } =
    useAuth()
  const navigate = useNavigate()
  const justSignedUp = (useLocation().state as { justSignedUp?: boolean } | null)?.justSignedUp
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!enabled) return <p className="py-16 text-muted">Accounts are not set up on this site yet.</p>
  if (loading) return <p className="py-16 text-muted">Loading your account…</p>
  if (!user) {
    return (
      <div className="py-16">
        <h1 className="font-display text-3xl">You're not signed in</h1>
        <Link to="/signin" className="mt-6 inline-block rounded-md bg-halpha px-4 py-2 font-semibold text-night">
          Sign in
        </Link>
      </div>
    )
  }

  const run = async (action: () => Promise<void>, done?: string) => {
    setError(null)
    setMessage(null)
    setSaving(true)
    try {
      await action()
      if (done) setMessage(done)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="font-display text-4xl">Your account</h1>
        {justSignedUp && (
          <div className="mt-3 rounded-md border border-oiii/50 bg-oiii/10 px-4 py-3 text-sm text-oiii">
            <p>Welcome to AdAstra! We've sent a verification link to {user.email}.</p>
            <Link to="/dashboard" className="mt-3 inline-block rounded-md bg-halpha px-4 py-2 font-semibold text-night">
              Start exploring
            </Link>
          </div>
        )}
      </header>

      <section className="space-y-3 rounded-lg border border-line bg-panel/70 p-6">
        <p><span className="text-muted">Name:</span> {profile?.name ?? user.displayName ?? '…'}</p>
        <p>
          <span className="text-muted">Email:</span> {user.email}{' '}
          {user.emailVerified ? (
            <span className="text-sm text-oiii">(verified)</span>
          ) : (
            <span className="text-sm text-amber">
              (not verified){' '}
              <button type="button" disabled={saving} className="underline"
                onClick={() => run(resendVerification, 'Verification email sent. Check your inbox.')}>
                send again
              </button>
            </span>
          )}
        </p>
        {profile && <p className="text-sm text-muted">Member since {dateTime(profile.created_at)}</p>}
        {profileError && <p className="text-sm text-halpha">Could not load your profile: {profileError}</p>}
      </section>

      {profile && (
        <section className="rounded-lg border border-line bg-panel/70 p-6">
          <h2 className="font-display text-2xl">Emails</h2>
          <label className="mt-4 flex items-start gap-3 text-sm">
            <input type="checkbox" checked={profile.email_updates.opted_in} disabled={saving}
              onChange={(e) => run(() => setEmailUpdates(e.target.checked), 'Saved.')}
              className="mt-1 accent-[var(--color-halpha)]" />
            <span>
              Send me emails about AdAstra updates.
              <span className="block text-xs text-muted">
                Last changed {dateTime(profile.email_updates.updated_at)}.
              </span>
            </span>
          </label>
        </section>
      )}

      {message && <p role="status" className="text-sm text-oiii">{message}</p>}
      {error && <p role="alert" className="text-sm text-halpha">{error}</p>}

      <section className="flex flex-wrap gap-3">
        <button type="button" disabled={saving}
          onClick={() => run(async () => { await signOut(); navigate('/welcome') })}
          className="rounded-md border border-line px-4 py-2 hover:border-muted">
          Sign out
        </button>
        <button type="button" disabled={saving}
          onClick={() => {
            if (window.confirm('Delete your account and all data AdAstra stores about you? This cannot be undone.')) {
              run(async () => { await deleteAccount(); navigate('/welcome') })
            }
          }}
          className="rounded-md border border-halpha/60 px-4 py-2 text-halpha hover:bg-halpha/10">
          Delete account
        </button>
      </section>
    </div>
  )
}