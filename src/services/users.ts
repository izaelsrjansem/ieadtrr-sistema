import { collection, deleteField, doc, getDoc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { ChurchRole, MemberRegistration, SystemRole, UserProfile, VisitPersonType } from '../types'

type VisitorProfileData = {
  email: string
  nomeCompleto: string
  tipoPessoa: VisitPersonType
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

type CongregadoProfileData = MemberRegistration & {
  tipoPessoa: 'congregado'
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

  const updates: Record<string, unknown> = {
    role,
    updatedAt: serverTimestamp(),
  }

  if (role === 'congregado') {
    Object.assign(updates, {
      tipoPessoa: 'congregado',
      possuiCargo: false,
      cargo: deleteField(),
      outroCargo: '',
      dataBatismo: '',
    })
  }

  await updateDoc(doc(db, 'users', uid), updates)
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
    throw new Error('Firebase não configurado.')
  }

  await updateDoc(doc(db, 'users', uid), {
    ...data,
    role: 'visitante',
    updatedAt: serverTimestamp(),
  })
}

export async function completeCongregadoProfile(uid: string, data: CongregadoProfileData): Promise<void> {
  if (!db) {
    throw new Error('Firebase não configurado.')
  }

  await updateDoc(doc(db, 'users', uid), {
    ...data,
    role: 'congregado',
    tipoPessoa: 'congregado',
    possuiCargo: false,
    cargo: deleteField(),
    outroCargo: '',
    dataBatismo: '',
    updatedAt: serverTimestamp(),
  })
}

export async function markMemberRegistrationProfile(uid: string, data: MemberProfileData): Promise<void> {
  if (!db) {
    throw new Error('Firebase não configurado.')
  }

  await updateDoc(doc(db, 'users', uid), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function promoteVisitorToCongregado(uid: string): Promise<void> {
  if (!db) {
    throw new Error('Firebase não configurado.')
  }

  await updateDoc(doc(db, 'users', uid), {
    role: 'congregado',
    tipoPessoa: 'congregado',
    possuiCargo: false,
    cargo: deleteField(),
    outroCargo: '',
    dataBatismo: '',
    updatedAt: serverTimestamp(),
  })
}

export async function promoteCongregadoToMembro(uid: string, dataBatismo: string): Promise<void> {
  if (!db) {
    throw new Error('Firebase não configurado.')
  }

  await updateDoc(doc(db, 'users', uid), {
    role: 'membro',
    tipoPessoa: 'membro',
    dataBatismo,
    updatedAt: serverTimestamp(),
  })
}

export async function updateMemberChurchRole(uid: string, cargo?: ChurchRole, outroCargo?: string): Promise<void> {
  if (!db) {
    throw new Error('Firebase não configurado.')
  }

  await updateDoc(doc(db, 'users', uid), {
    possuiCargo: Boolean(cargo),
    cargo: cargo ?? deleteField(),
    outroCargo: cargo === 'outro' ? outroCargo : '',
    updatedAt: serverTimestamp(),
  })
}
