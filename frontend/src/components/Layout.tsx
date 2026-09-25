import { NavLink, Outlet } from 'react-router'
import { useAuth } from '../lib/auth'
import StarField from './StarField'

const link = ({ isActive }: { isActive: boolean }) =>
  `text-sm ${isActive ? 'text-ink underline decoration-halpha decoration-2 underline-offset-8' : 'text-muted hover:text-ink'}`

export default function Layout() {
  const { enabled, user, profile } = useAuth()
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-5 sm:px-8 print:max-w-none print:px-0">
      <StarField />
      <header className="flex flex-wrap items-baseline justify-between gap-4 py-6 print:hidden">
        <NavLink to="/dashboard" className="font-display text-2xl font-semibold">
          AdAstra
        </NavLink>
        <nav aria-label="Main" className="flex flex-wrap gap-x-6 gap-y-2">
          <NavLink to="/dashboard" className={link}>Dashboard</NavLink>
          <NavLink to="/" end className={link}>Analyse</NavLink>
          <NavLink to="/results" className={link}>Results</NavLink>
          <NavLink to="/chat" className={link}>Ask</NavLink>
          <NavLink to="/history" className={link}>History</NavLink>
          <NavLink to="/moon" className={link}>Moon</NavLink>
          <NavLink to="/sky" className={link}>Sky</NavLink>
          {enabled && user && (
            <NavLink to="/account" className={link}>
              {profile?.name ?? user.displayName ?? 'Account'}
            </NavLink>
          )}
        </nav>
      </header>
      <main className="flex-1 pb-16 print:pb-0">
        <Outlet />
      </main>
      <footer className="border-t border-line py-6 text-xs text-muted print:hidden">
        BRACU CSE400 project. Classifications can be wrong; explanations cite their sources.
      </footer>
    </div>
  )
}