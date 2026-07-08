import { collection, onSnapshot } from 'firebase/firestore'
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
