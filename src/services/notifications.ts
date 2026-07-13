import { addDoc, arrayUnion, collection, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { AppNotification } from '../types'

export async function createAdminNotification(input: {
  type: AppNotification['type']
  title: string
  message: string
  relatedUid?: string
  createdBy?: string
}): Promise<void> {
  if (!db) {
    return
  }

  await addDoc(collection(db, 'notifications'), {
    type: input.type,
    title: input.title,
    message: input.message,
    audience: 'admin',
    relatedUid: input.relatedUid ?? '',
    createdBy: input.createdBy ?? '',
    createdAt: serverTimestamp(),
    readBy: [],
  })
}

export function subscribeAdminNotifications(
  onData: (notifications: AppNotification[]) => void,
  onError?: (error: Error) => void,
): () => void {
  if (!db) {
    onData([])
    return () => {}
  }

  return onSnapshot(
    collection(db, 'notifications'),
    (snapshot) => onData(snapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }) as AppNotification)),
    (error) => onError?.(error),
  )
}

export async function markNotificationRead(id: string, uid: string): Promise<void> {
  if (!db) {
    return
  }

  await updateDoc(doc(db, 'notifications', id), { readBy: arrayUnion(uid) })
}
