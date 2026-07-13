import { collection, doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { MemberCard } from '../types'

export type MemberCardData = {
  nomeCompleto: string
  congregacao?: string
  cargo?: string
}

export function subscribeMemberCard(
  uid: string,
  onData: (card: MemberCard | null) => void,
  onError?: (error: Error) => void,
): () => void {
  if (!db || !uid) {
    onData(null)
    return () => {}
  }

  return onSnapshot(
    doc(db, 'memberCards', uid),
    (snapshot) => onData(snapshot.exists() ? ({ uid: snapshot.id, ...snapshot.data() } as MemberCard) : null),
    (error) => onError?.(error),
  )
}

export function subscribeAllMemberCards(
  onData: (cards: MemberCard[]) => void,
  onError?: (error: Error) => void,
): () => void {
  if (!db) {
    onData([])
    return () => {}
  }

  return onSnapshot(
    collection(db, 'memberCards'),
    (snapshot) => onData(snapshot.docs.map((docSnapshot) => ({ uid: docSnapshot.id, ...docSnapshot.data() }) as MemberCard)),
    (error) => onError?.(error),
  )
}

export async function requestMemberCard(
  uid: string,
  data: MemberCardData,
  signature: string,
  correctionNote = '',
): Promise<void> {
  if (!db) {
    throw new Error('Firebase não configurado.')
  }

  await setDoc(
    doc(db, 'memberCards', uid),
    {
      uid,
      nomeCompleto: data.nomeCompleto,
      congregacao: data.congregacao ?? '',
      cargo: data.cargo ?? '',
      status: 'solicitado',
      memberSignature: signature,
      memberSignedAt: serverTimestamp(),
      requestedAt: serverTimestamp(),
      adminSignature: '',
      adminSignerName: '',
      correctionNote,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

export async function signMemberCardAsAdmin(
  uid: string,
  adminSignature: string,
  adminSignerName: string,
): Promise<void> {
  if (!db) {
    throw new Error('Firebase não configurado.')
  }

  await updateDoc(doc(db, 'memberCards', uid), {
    status: 'emitido',
    adminSignature,
    adminSignerName,
    adminSignedAt: serverTimestamp(),
    correctionNote: '',
    updatedAt: serverTimestamp(),
  })
}
