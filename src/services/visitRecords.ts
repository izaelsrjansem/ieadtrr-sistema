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

function visitWeekdayInfo(visitDate: string): { visitWeekday: number; visitWeekdayLabel: string } {
  const date = new Date(`${visitDate}T12:00:00`)
  const visitWeekday = Number.isNaN(date.getTime()) ? 0 : date.getDay()
  const visitWeekdayLabel = Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('pt-BR', { weekday: 'long' })

  return { visitWeekday, visitWeekdayLabel }
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
      ...visitWeekdayInfo(data.visitDate),
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
    ...visitWeekdayInfo(data.visitDate),
    userId: `nominal-${data.recordedBy}`,
    source: 'admin',
    registeredAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return docRef.id
}
