import { addDoc, collection, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { VisitRecord, VisitSession } from '../types'

export type VisitRecordInput = Omit<VisitRecord, 'id' | 'registeredAt' | 'updatedAt'>
export type NominalVisitRecordInput = Omit<VisitRecordInput, 'userId'> & {
  recordedBy: string
}

export function visitRecordId(userId: string, visitDate: string, session: VisitSession): string {
  return `${userId}_${visitDate}_${session}`
}

export function subscribeVisitRecords(
  onData: (records: VisitRecord[]) => void,
  onError?: (error: Error) => void,
): () => void {
  if (!db) {
    onData([])
    return () => {}
  }

  return onSnapshot(
    collection(db, 'visitRecords'),
    (snapshot) => {
      onData(
        snapshot.docs.map(
          (docSnapshot) =>
            ({
              id: docSnapshot.id,
              ...docSnapshot.data(),
            }) as VisitRecord,
        ),
      )
    },
    (error) => onError?.(error),
  )
}

export function subscribeUserVisitRecords(
  userId: string,
  onData: (records: VisitRecord[]) => void,
  onError?: (error: Error) => void,
): () => void {
  if (!db) {
    onData([])
    return () => {}
  }

  return onSnapshot(
    query(collection(db, 'visitRecords'), where('userId', '==', userId)),
    (snapshot) => {
      onData(
        snapshot.docs.map(
          (docSnapshot) =>
            ({
              id: docSnapshot.id,
              ...docSnapshot.data(),
            }) as VisitRecord,
        ),
      )
    },
    (error) => onError?.(error),
  )
}

export async function upsertVisitRecord(data: VisitRecordInput): Promise<string> {
  if (!db) {
    throw new Error('Firebase não configurado.')
  }

  const id = visitRecordId(data.userId, data.visitDate, data.session)
  const ref = doc(db, 'visitRecords', id)
  const existing = await getDoc(ref)

  await setDoc(
    ref,
    {
      ...data,
      registeredAt: existing.exists() ? existing.data().registeredAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )

  return id
}

export async function createNominalVisitRecord(data: NominalVisitRecordInput): Promise<string> {
  if (!db) {
    throw new Error('Firebase não configurado.')
  }

  const docRef = await addDoc(collection(db, 'visitRecords'), {
    ...data,
    userId: `nominal-${data.recordedBy}`,
    source: 'admin',
    registeredAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return docRef.id
}
