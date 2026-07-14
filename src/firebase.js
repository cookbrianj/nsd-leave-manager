/**
 * Firebase SDK initialization.
 *
 * ⚠️  Replace the placeholder values below with your actual Firebase project config.
 *     You can find these in the Firebase Console → Project Settings → General →
 *     "Your apps" → Web app config snippet.
 */

import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'YOUR_API_KEY',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'YOUR_PROJECT.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'YOUR_PROJECT_ID',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? 'YOUR_PROJECT.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '000000000000',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '1:000000000000:web:0000000000000000',
}

/** Firebase app instance. */
export const app = initializeApp(firebaseConfig)

/** Firebase Auth instance, pre-configured with Google provider. */
export const auth = getAuth(app)

/** Google Auth provider – restricts to neoshosd.org domain hint. */
export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ hd: 'neoshosd.org' })

/** Firestore database instance. */
export const db = getFirestore(app)
