import { onAuthStateChanged, type User } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { auth, db, isFirebaseConfigured } from '../lib/firebase'
import type { UserProfile } from '../types'

type AuthContextValue = {
  firebaseUser: User | null
  profile: UserProfile | null
  loading: boolean
  isFirebaseConfigured: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(isFirebaseConfigured)

  useEffect(() => {
    if (!auth) {
      setLoading(false)
      return
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user)

      if (!user) {
        setProfile(null)
        setLoading(false)
      }
    })

    return unsubscribeAuth
  }, [])

  useEffect(() => {
    if (!db || !firebaseUser) {
      return
    }

    setLoading(true)
    const unsubscribeProfile = onSnapshot(doc(db, 'users', firebaseUser.uid), (snapshot) => {
      setProfile(snapshot.exists() ? (snapshot.data() as UserProfile) : null)
      setLoading(false)
    })

    return unsubscribeProfile
  }, [firebaseUser])

  const value = useMemo(
    () => ({ firebaseUser, profile, loading, isFirebaseConfigured }),
    [firebaseUser, profile, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider.')
  }

  return context
}
