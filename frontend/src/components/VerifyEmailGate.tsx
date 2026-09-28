// Shown instead of the app to a signed-in user whose email isn't verified yet.
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { friendlyError, useAuth } from '../lib/auth'
import StarField from './StarField'

export default function VerifyEmailGate() {
  const { user, resendVerification, refreshVerification, signOut } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // When the user comes back to this tab after clicking the link in their
  // email, check again automatically.
  useEffect(() => {
    const onFocus = () => {
      refreshVerification().catch(() => {})
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const run = async (action: () => Promise<void>) => {
    setError(null)
    setMessage(null)
    setBusy(true)
    try {
      await action()
    } catch (e) {
      setError(friendlyError(e))
    } finally {
      setBusy(false)
    }
  }

  const check = () =>
    run(async () => {
      const ok = await refreshVerification()
      if (!ok) setMessage('Not verified yet. Click the link in the email first, then try again.')
    })

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <StarField />
      <h1 className="font-display text-4xl">Verify your email</h1>
      <p className="mt-3 text-muted">
        We sent a verification link to <strong className="text-ink">{user?.email}</strong>. Click it, then come
        back here. Check your spam folder if you can&apos;t find it.
      </p>

      <div className="mt-8 space-y-3 rounded-lg border border-line bg-panel/70 p-6">
        <button
          type="button"
          disabled={busy}
          onClick={check}
          className="w-full rounded-md bg-halpha px-4 py-3 font-semibold text-night disabled:opacity-40"
        >
          I&apos;ve verified my email
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            run(async () => {
              await resendVerification()
              setMessage('Verification email sent. Check your inbox and spam folder.')
            })
          }
          className="w-full rounded-md border border-line px-4 py-3 hover:border-muted disabled:opacity-40"
        >
          Send the email again
        </button>
        {message && <p role="status" className="text-sm text-oiii">{message}</p>}
        {error && <p role="alert" className="text-sm text-halpha">{error}</p>}
      </div>

      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            run(async () => {
              await signOut()
              navigate('/welcome')
            })
          }
          className="underline hover:text-ink"
        >
          Sign out
        </button>
        <Link to="/account" className="underline hover:text-ink">
          Manage account
        </Link>
      </div>
    </div>
  )
}