import { collection, doc, getDoc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { PublicPersonType, SystemRole, UserProfile } from '../types'

type VisitorProfileData = {
  email: string
  nomeCompleto: string
  tipoPessoa: Exclude<PublicPersonType, 'membro'>
  congregacao: string
  telefone: string
  dataNascimento: string
  convidadoPor?: string
  observacoes?: string
}

type MemberProfileData = {
  email: string
  nomeCompleto: string
  tipoPessoa: 'membro'
  congregacao: string
  telefone: string
  dataNascimento: string
}

export function subscribeUsers(
  onData: (users: UserProfile[]) => void,
  onError?: (error: Error) => void,
): () => void {
  if (!db) {
    onData([])
    return () => {}
  }

  return onSnapshot(
    collection(db, 'users'),
    (snapshot) => {
      onData(snapshot.docs.map((docSnapshot) => docSnapshot.data() as UserProfile))
    },
    (error) => onError?.(error),
  )
}

export async function updateUserRole(uid: string, role: SystemRole): Promise<void> {
  if (!db) {
    throw new Error('Firebase não configurado.')
  }

  await updateDoc(doc(db, 'users', uid), { role })
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (!db) {
    return null
  }

  const snapshot = await getDoc(doc(db, 'users', uid))
  return snapshot.exists() ? (snapshot.data() as UserProfile) : null
}

export async function updateVisitorCongregacao(uid: string, congregacao: string): Promise<void> {
  if (!db) {
    throw new Error('Firebase não configurado.')
  }

  await updateDoc(doc(db, 'users', uid), { congregacao })
}

export async function completeVisitorProfile(uid: string, data: VisitorProfileData): Promise<void> {
  if (!db) {
    throw new Error('Firebase nÃ£o configurado.')
  }

  await updateDoc(doc(db, 'users', uid), {
    ...data,
    role: 'visitante',
    updatedAt: serverTimestamp(),
  })
}

export async function markMemberRegistrationProfile(uid: string, data: MemberProfileData): Promise<void> {
  if (!db) {
    throw new Error('Firebase nÃ£o configurado.')
  }

  await updateDoc(doc(db, 'users', uid), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}
