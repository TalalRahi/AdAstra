// Connects the website to your Firebase project (accounts).
// The values come from frontend/.env.local (and Vercel's settings when deployed).
// They identify the project; they are not secrets.
import { initializeApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

/** False if the Firebase settings are missing: the site then works without accounts. */
export const firebaseEnabled = Boolean(config.apiKey && config.authDomain && config.projectId)

export const auth: Auth | null = firebaseEnabled ? getAuth(initializeApp(config)) : null