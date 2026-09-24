// Layout for the pages you can see without an account: landing, sign in, sign up.
import { Link, NavLink, Outlet } from 'react-router'
import StarField from './StarField'

export default function PublicLayout() {
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-5 sm:px-8">
      <StarField />
      <header className="flex items-center justify-between gap-4 py-6">
        <Link to="/welcome" className="font-display text-2xl font-semibold">
          AdAstra
        </Link>
        <nav aria-label="Account" className="flex items-center gap-3">
          <NavLink to="/signin" className="rounded-md px-3 py-2 text-sm text-muted hover:text-ink">
            Sign in
          </NavLink>
          <NavLink to="/signup" className="rounded-md bg-halpha px-4 py-2 text-sm font-semibold text-night">
            Create account
          </NavLink>
        </nav>
      </header>
      <main className="flex-1 pb-16">
        <Outlet />
      </main>
      <footer className="border-t border-line py-6 text-xs text-muted">
        BRACU CSE400 project. Classifications can be wrong; explanations cite their sources.
      </footer>
    </div>
  )
}