// Who is signed in, shared with every page.
// Firebase handles the account and password; our backend stores the profile
// (name + email-updates choice) in MongoDB.
import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { deleteMe, getMe, saveMe, setTokenProvider } from './api'
import { auth, firebaseEnabled } from './firebase'
import type { Profile } from './types'

interface AuthState {
  enabled: boolean          // false if Firebase isn't configured
  loading: boolean          // true until we know whether someone is signed in
  user: User | null
  profile: Profile | null
  profileError: string | null
  signUp: (name: string, email: string, password: string, emailUpdates: boolean) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  resendVerification: () => Promise<void>
  setEmailUpdates: (optedIn: boolean) => Promise<void>
  deleteAccount: () => Promise<void>
}

const Ctx = createContext<AuthState | null>(null)

/** Turns Firebase's error codes into sentences people understand. */
export function friendlyError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? ''
  const messages: Record<string, string> = {
    'auth/email-already-in-use': 'An account with this email already exists. Try signing in.',
    'auth/invalid-email': 'That email address doesn’t look right.',
    'auth/weak-password': 'Please use a password with at least 8 characters.',
    'auth/invalid-credential': 'Email or password is wrong.',
    'auth/wrong-password': 'Email or password is wrong.',
    'auth/user-not-found': 'Email or password is wrong.',
    'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
    'auth/network-request-failed': 'No internet connection. Check your network and try again.',
    'auth/requires-recent-login': 'For safety, please sign out, sign in again, and then retry.',
    'auth/unauthorized-domain': 'This website address is not allowed in Firebase (Authorized domains).',
  }
  return messages[code] ?? (e as Error)?.message ?? 'Something went wrong.'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [loading, setLoading] = useState(firebaseEnabled)
  const signingUp = useRef(false) // stops a race between sign-up and the automatic profile load

  useEffect(() => {
    const firebaseAuth = auth
    if (!firebaseAuth) return
    // Every request to our backend carries the current pass (Firebase renews it automatically).
    setTokenProvider(async () => (firebaseAuth.currentUser ? firebaseAuth.currentUser.getIdToken() : null))
    return onAuthStateChanged(firebaseAuth, async (u) => {
      setUser(u)
      setProfileError(null)
      if (!u) {
        setProfile(null)
      } else if (!signingUp.current) {
        try {
          setProfile(await getMe())
        } catch (e) {
          setProfileError((e as Error).message)
        }
      }
      setLoading(false)
    })
  }, [])

  const need = () => {
    if (!auth) throw new Error('Sign-in is not set up on this site.')
    return auth
  }

  const value: AuthState = {
    enabled: firebaseEnabled,
    loading,
    user,
    profile,
    profileError,

    async signUp(name, email, password, emailUpdates) {
      signingUp.current = true
      try {
        const cred = await createUserWithEmailAndPassword(need(), email, password)
        await updateProfile(cred.user, { displayName: name })
        sendEmailVerification(cred.user).catch(() => {}) // a failed email must not block sign-up
        setProfile(await saveMe(name, emailUpdates))
      } finally {
        signingUp.current = false
      }
    },

    async signIn(email, password) {
      await signInWithEmailAndPassword(need(), email, password)
    },

    async signOut() {
      await firebaseSignOut(need())
    },

    async resetPassword(email) {
      await sendPasswordResetEmail(need(), email)
    },

    async resendVerification() {
      if (need().currentUser) await sendEmailVerification(need().currentUser!)
    },

    async setEmailUpdates(optedIn) {
      if (!profile) return
      setProfile(await saveMe(profile.name, optedIn))
    },

    async deleteAccount() {
      const current = need().currentUser
      if (!current) return
      await deleteMe()           // 1. our database (needs the pass, so it goes first)
      await deleteUser(current)  // 2. the Firebase account itself
    },
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}