import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import AuthCard, { inputClass } from '../components/AuthCard'
import { friendlyError, useAuth } from '../lib/auth'

export default function SignUpPage() {
  const { enabled, user, signUp } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [emailUpdates, setEmailUpdates] = useState(false) // unticked by default: people choose to opt in
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!enabled) return <AuthCard title="Sign up" intro="Accounts are not set up on this site yet.">{null}</AuthCard>
  if (user && !busy) return <Navigate to="/dashboard" replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) return setError('Please use a password with at least 8 characters.')
    setBusy(true)
    try {
      await signUp(name.trim(), email.trim(), password, emailUpdates)
      navigate('/account', { state: { justSignedUp: true } })
    } catch (err) {
      setError(friendlyError(err))
      setBusy(false)
    }
  }

  return (
    <AuthCard title="Create an account" intro="Save your analyses and questions and see them on any device.">
      <form onSubmit={submit} className="space-y-5">
        <label className="block text-sm">
          Name
          <input required maxLength={80} value={name} onChange={(e) => setName(e.target.value)}
            autoComplete="name" className={inputClass} />
        </label>
        <label className="block text-sm">
          Email
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            autoComplete="email" className={inputClass} />
        </label>
        <label className="block text-sm">
          Password (at least 8 characters)
          <div className="flex gap-2">
            <input required minLength={8} type={showPassword ? 'text' : 'password'} value={password}
              onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className={inputClass} />
            <button type="button" onClick={() => setShowPassword((s) => !s)}
              className="mt-1 shrink-0 rounded-md border border-line px-3 text-xs text-muted hover:text-ink">
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </label>

        <label className="flex items-start gap-3 rounded-md border border-line p-3 text-sm">
          <input type="checkbox" checked={emailUpdates} onChange={(e) => setEmailUpdates(e.target.checked)}
            className="mt-1 accent-[var(--color-halpha)]" />
          <span>
            Yes, I'd like to receive emails about AdAstra updates.
            <span className="block text-xs text-muted">Optional. You can change this any time on your account page.</span>
          </span>
        </label>

        {error && <p role="alert" className="text-sm text-halpha">{error}</p>}

        <button type="submit" disabled={busy}
          className="w-full rounded-md bg-halpha px-4 py-3 font-semibold text-night disabled:opacity-40">
          {busy ? 'Creating your account…' : 'Create account'}
        </button>

        <p className="text-xs text-muted">
          AdAstra stores your name, email and your email choice. Passwords are handled by Firebase (Google) and are
          never seen or stored by AdAstra. You can delete your account and data at any time.
        </p>
      </form>
      <p className="mt-6 text-sm text-muted">
        Already have an account? <Link to="/signin" className="text-ink underline">Sign in</Link>
      </p>
    </AuthCard>
  )
}