import {
  createUserWithEmailAndPassword,
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db, isFirebaseConfigured } from '../lib/firebase'
import type { UserProfile } from '../types'

const configErrorMessage = 'Firebase ainda não está configurado nesta instalação.'

export async function signIn(email: string, password: string, rememberLogin = false) {
  if (!auth) {
    throw new Error(configErrorMessage)
  }

  await setPersistence(auth, rememberLogin ? browserLocalPersistence : browserSessionPersistence)
  return signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password)
}

export async function sendPasswordReset(email: string) {
  if (!auth) {
    throw new Error(configErrorMessage)
  }

  await sendPasswordResetEmail(auth, email.trim().toLowerCase())
}

export async function signUp(email: string, password: string, nomeCompleto: string) {
  if (!auth || !db) {
    throw new Error(configErrorMessage)
  }

  const normalizedEmail = email.trim().toLowerCase()
  const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password)
  await updateProfile(credential.user, { displayName: nomeCompleto })

  const profile: UserProfile = {
    uid: credential.user.uid,
    email: normalizedEmail,
    emailLower: normalizedEmail,
    nomeCompleto,
    role: 'pendente',
    createdAt: new Date().toISOString(),
  }

  await setDoc(doc(db, 'users', credential.user.uid), profile)
}

export async function signOutUser() {
  if (!auth) {
    return
  }

  await signOut(auth)
}

export { isFirebaseConfigured }
