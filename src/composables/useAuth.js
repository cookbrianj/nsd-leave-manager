import { ref, readonly } from 'vue'
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { auth, googleProvider, db } from '@/firebase'

const user = ref(null)
const loading = ref(true)
const error = ref(null)

// Initialize and listen to auth state changes
onAuthStateChanged(auth, async (firebaseUser) => {
  loading.value = true
  error.value = null

  if (firebaseUser) {
    const email = firebaseUser.email.toLowerCase()
    
    // Domain & Security rule verification (neoshosd.org or explicit allow-list)
    const isAllowedDomain = email.endsWith('@neoshosd.org')
    
    if (!isAllowedDomain) {
      error.value = 'Access Denied: Only @neoshosd.org accounts are allowed.'
      await signOut(auth)
      user.value = null
      loading.value = false
      return
    }

    try {
      const userRef = doc(db, 'users', email)
      const userSnap = await getDoc(userRef)

      if (userSnap.exists()) {
        const userData = userSnap.data()
        
        // If the user's Auth UID is not saved yet (first login after CSV import),
        // write it to link the Auth record with the Firestore record.
        if (userData.uid !== firebaseUser.uid) {
          await updateDoc(userRef, { uid: firebaseUser.uid })
        }
        
        user.value = {
          uid: firebaseUser.uid,
          email: email,
          firstName: userData.firstName || firebaseUser.displayName?.split(' ')[0] || '',
          lastName: userData.lastName || firebaseUser.displayName?.split(' ')[1] || '',
          buildingId: userData.buildingId || '',
          role: userData.role || 'employee',
        }
      } else {
        // First-time login and user wasn't pre-provisioned via CSV.
        // We initialize them with default "employee" role.
        const defaultUser = {
          uid: firebaseUser.uid,
          email: email,
          firstName: firebaseUser.displayName?.split(' ')[0] || '',
          lastName: firebaseUser.displayName?.split(' ')[1] || '',
          buildingId: 'default', // Can be updated by admin later
          role: 'employee',
        }
        await setDoc(userRef, defaultUser)
        user.value = defaultUser
      }
    } catch (err) {
      console.error('Error fetching user document:', err)
      error.value = 'Failed to load user profile. Please contact an administrator.'
      await signOut(auth)
      user.value = null
    }
  } else {
    user.value = null
  }
  loading.value = false
})

/**
 * Log in using Google Provider popup.
 */
async function login() {
  loading.value = true
  error.value = null
  try {
    await signInWithPopup(auth, googleProvider)
  } catch (err) {
    console.error('Login error:', err)
    error.value = err.message || 'Login failed.'
    loading.value = false
  }
}

/**
 * Log out current session.
 */
async function logout() {
  loading.value = true
  try {
    await signOut(auth)
  } catch (err) {
    console.error('Logout error:', err)
  } finally {
    loading.value = false
  }
}

export function useAuth() {
  return {
    user: readonly(user),
    loading: readonly(loading),
    error: readonly(error),
    login,
    logout,
  }
}
