import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { MemberRegistration, MembershipRequest } from '../types'

type SubmissionResult = {
  id: string
  mode: 'firebase' | 'local'
}

const localStorageKey = 'adtrr-membership-requests'

export async function submitMembershipRequest(
  data: MemberRegistration,
  userId?: string,
): Promise<SubmissionResult> {
  const payload = {
    ...data,
    ...(userId ? { userId } : {}),
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
  request: MembershipRequest,
  status: 'aprovado' | 'rejeitado',
  adminUid: string,
): Promise<{ linkedUserUid?: string }> {
  if (!db) {
    throw new Error('Firebase não configurado.')
  }

  const requestRef = doc(db, 'membershipRequests', request.id)

  if (status === 'rejeitado') {
    await updateDoc(requestRef, {
      status,
      decididoEm: serverTimestamp(),
      decididoPor: adminUid,
    })
    return {}
  }

  let linkedUser:
    | {
        uid: string
        role?: string
      }
    | undefined

  if (request.userId) {
    const userSnapshot = await getDoc(doc(db, 'users', request.userId))
    if (userSnapshot.exists()) {
      linkedUser = {
        uid: userSnapshot.id,
        role: userSnapshot.data().role as string | undefined,
      }
    }
  }

  if (!linkedUser && request.email) {
    const normalizedEmail = request.email.trim().toLowerCase()
    const usersSnapshot = await getDocs(collection(db, 'users'))
    const matchingUser = usersSnapshot.docs.find(
      (userSnapshot) =>
        String(userSnapshot.data().email ?? '')
          .trim()
          .toLowerCase() === normalizedEmail,
    )

    if (matchingUser) {
      linkedUser = {
        uid: matchingUser.id,
        role: matchingUser.data().role as string | undefined,
      }
    }
  }

  const {
    id: _id,
    status: _status,
    createdAt: requestCreatedAt,
    decididoEm: _decididoEm,
    decididoPor: _decididoPor,
    linkedUserUid: _linkedUserUid,
    ...registration
  } = request
  const batch = writeBatch(db)
  const decidedAt = serverTimestamp()

  batch.set(
    doc(db, 'members', request.id),
    {
      ...registration,
      tipoPessoa: 'membro',
      userId: linkedUser?.uid ?? request.userId ?? null,
      membershipRequestId: request.id,
      status: 'ativo',
      createdAt: requestCreatedAt ?? decidedAt,
      updatedAt: decidedAt,
      approvedAt: decidedAt,
      approvedBy: adminUid,
    },
    { merge: true },
  )

  batch.update(requestRef, {
    status: 'aprovado',
    decididoEm: decidedAt,
    decididoPor: adminUid,
    linkedUserUid: linkedUser?.uid ?? null,
  })

  if (linkedUser) {
    const accessRole =
      linkedUser.role === 'admin' || linkedUser.role === 'diretoria'
        ? linkedUser.role
        : 'membro'

    batch.update(doc(db, 'users', linkedUser.uid), {
      ...registration,
      role: accessRole,
      tipoPessoa: 'membro',
      updatedAt: decidedAt,
    })
  }

  await batch.commit()
  return { linkedUserUid: linkedUser?.uid }
}
