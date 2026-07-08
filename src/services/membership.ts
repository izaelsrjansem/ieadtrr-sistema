import { addDoc, collection, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { MemberRegistration, MembershipRequest } from '../types'

type SubmissionResult = {
  id: string
  mode: 'firebase' | 'local'
}

const localStorageKey = 'adtrr-membership-requests'

export async function submitMembershipRequest(data: MemberRegistration): Promise<SubmissionResult> {
  const payload = {
    ...data,
    status: 'pendente',
    createdAt: db ? serverTimestamp() : new Date().toISOString(),
  }

  if (db) {
    const docRef = await addDoc(collection(db, 'membershipRequests'), payload)
    return { id: docRef.id, mode: 'firebase' }
  }

  const saved = JSON.parse(localStorage.getItem(localStorageKey) ?? '[]') as Array<MemberRegistration & { id: string }>
  const id = crypto.randomUUID()
  localStorage.setItem(localStorageKey, JSON.stringify([...saved, { ...data, id }]))
  return { id, mode: 'local' }
}

export function subscribeMembershipRequests(
  onData: (requests: MembershipRequest[]) => void,
  onError?: (error: Error) => void,
): () => void {
  if (!db) {
    onData([])
    return () => {}
  }

  return onSnapshot(
    collection(db, 'membershipRequests'),
    (snapshot) => {
      const items = snapshot.docs.map(
        (docSnapshot) =>
          ({ id: docSnapshot.id, ...docSnapshot.data() }) as MembershipRequest,
      )
      onData(items)
    },
    (error) => onError?.(error),
  )
}

export async function decideMembershipRequest(
  id: string,
  status: 'aprovado' | 'rejeitado',
  adminUid: string,
): Promise<void> {
  if (!db) {
    throw new Error('Firebase não configurado.')
  }

  await updateDoc(doc(db, 'membershipRequests', id), {
    status,
    decididoEm: serverTimestamp(),
    decididoPor: adminUid,
  })
}
