import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore'
import { publicEvents as initialEvents } from '../data/church'
import { db } from '../lib/firebase'
import type { ChurchEvent } from '../types'

export type ChurchEventInput = Omit<ChurchEvent, 'id'>

export function subscribeEvents(
  onData: (events: ChurchEvent[]) => void,
  onError?: (error: Error) => void,
): () => void {
  if (!db) {
    onData(initialEvents)
    return () => {}
  }

  return onSnapshot(
    collection(db, 'events'),
    (snapshot) => {
      const items = snapshot.docs.map(
        (docSnapshot) =>
          ({
            id: docSnapshot.id,
            ...docSnapshot.data(),
          }) as ChurchEvent,
      )

      onData(items.length > 0 ? items : initialEvents)
    },
    (error) => onError?.(error),
  )
}

export async function createEvent(data: ChurchEventInput): Promise<void> {
  if (!db) {
    throw new Error('Firebase não configurado.')
  }

  await addDoc(collection(db, 'events'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function updateEvent(id: string, data: ChurchEventInput): Promise<void> {
  if (!db) {
    throw new Error('Firebase não configurado.')
  }

  await updateDoc(doc(db, 'events', id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteEvent(id: string): Promise<void> {
  if (!db) {
    throw new Error('Firebase não configurado.')
  }

  await deleteDoc(doc(db, 'events', id))
}
