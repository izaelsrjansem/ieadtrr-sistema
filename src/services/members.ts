import { collection, deleteField, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { OfficialMember } from '../types'

export function subscribeMembers(
  onData: (members: OfficialMember[]) => void,
  onError?: (error: Error) => void,
): () => void {
  if (!db) {
    onData([])
    return () => {}
  }

  return onSnapshot(
    collection(db, 'members'),
    (snapshot) => {
      onData(
        snapshot.docs.map(
          (memberSnapshot) =>
            ({ id: memberSnapshot.id, ...memberSnapshot.data() }) as OfficialMember,
        ),
      )
    },
    (error) => onError?.(error),
  )
}

export async function updateOfficialMember(
  memberId: string,
  data: Partial<Omit<OfficialMember, 'id' | 'createdAt' | 'approvedAt' | 'approvedBy'>>,
): Promise<void> {
  if (!db) {
    throw new Error('Firebase não configurado.')
  }

  await updateDoc(doc(db, 'members', memberId), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function updateOfficialMemberStatus(
  memberId: string,
  status: OfficialMember['status'],
  changedBy?: string,
): Promise<void> {
  if (!db) {
    throw new Error('Firebase nÃ£o configurado.')
  }

  await updateDoc(doc(db, 'members', memberId), {
    status,
    statusChangedAt: serverTimestamp(),
    statusChangedBy: changedBy ?? null,
    deletedAt: status === 'ativo' ? deleteField() : serverTimestamp(),
    deletedBy: status === 'ativo' ? deleteField() : changedBy ?? null,
    updatedAt: serverTimestamp(),
  })
}

export async function deactivateOfficialMember(memberId: string, deletedBy?: string): Promise<void> {
  if (!db) {
    throw new Error('Firebase nÃ£o configurado.')
  }

  await updateDoc(doc(db, 'members', memberId), {
    status: 'inativo',
    deletedAt: serverTimestamp(),
    deletedBy: deletedBy ?? null,
    updatedAt: serverTimestamp(),
  })
}
