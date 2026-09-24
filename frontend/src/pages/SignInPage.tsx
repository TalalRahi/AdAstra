import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import AuthCard, { inputClass } from '../components/AuthCard'
import { friendlyError, useAuth } from '../lib/auth'

export default function SignInPage() {
  const { enabled, user, signIn, resetPassword } = useAuth()
  const navigate = useNavigate()
  // Where to go after signing in: the page they tried to open, or the dashboard.
  const next = (useLocation().state as { from?: string } | null)?.from ?? '/dashboard'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  if (!enabled) return <AuthCard title="Sign in" intro="Accounts are not set up on this site yet.">{null}</AuthCard>
  if (user) return <Navigate to={next} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setBusy(true)
    try {
      await signIn(email.trim(), password)
      navigate(next, { replace: true })
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  const forgot = async () => {
    setError(null)
    if (!email.trim()) return setError('Type your email above first, then click "Forgot password?".')
    try {
      await resetPassword(email.trim())
    } catch {
      /* same message either way, so nobody can test which emails have accounts */
    }
    setNotice('If an account exists for this email, a password reset link has been sent. Check your inbox.')
  }

  return (
    <AuthCard title="Sign in" intro="Welcome back.">
      <form onSubmit={submit} className="space-y-5">
        <label className="block text-sm">
          Email
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            autoComplete="email" className={inputClass} />
        </label>
        <label className="block text-sm">
          Password
          <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password" className={inputClass} />
        </label>

        {error && <p role="alert" className="text-sm text-halpha">{error}</p>}
        {notice && <p role="status" className="text-sm text-oiii">{notice}</p>}

        <button type="submit" disabled={busy}
          className="w-full rounded-md bg-halpha px-4 py-3 font-semibold text-night disabled:opacity-40">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <button type="button" onClick={forgot} className="text-sm text-muted underline hover:text-ink">
          Forgot password?
        </button>
      </form>
      <p className="mt-6 text-sm text-muted">
        New here?{' '}
        <Link to="/signup" state={{ from: next }} className="text-ink underline">Create an account</Link>
      </p>
    </AuthCard>
  )
}