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
  return signInWithEmailAndPassword(auth, email, password)
}

export async function sendPasswordReset(email: string) {
  if (!auth) {
    throw new Error(configErrorMessage)
  }

  await sendPasswordResetEmail(auth, email)
}

export async function signUp(email: string, password: string, nomeCompleto: string) {
  if (!auth || !db) {
    throw new Error(configErrorMessage)
  }

  const credential = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(credential.user, { displayName: nomeCompleto })

  const profile: UserProfile = {
    uid: credential.user.uid,
    email,
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
