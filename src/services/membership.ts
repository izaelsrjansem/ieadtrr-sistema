import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { MemberRegistration, MembershipRequest, PublicPersonType } from '../types'

type SubmissionResult = {
  id: string
  mode: 'firebase' | 'local'
}

export type ExistingCpfRegistration = {
  id: string
  source: 'members' | 'membershipRequests' | 'users'
  nomeCompleto: string
  tipoPessoa?: PublicPersonType
  status?: string
  email?: string
  telefone?: string
}

const localStorageKey = 'adtrr-membership-requests'

function onlyDigits(value: string) {
  return value.replace(/\D/g, '')
}

function toExistingCpfRegistration(
  id: string,
  source: ExistingCpfRegistration['source'],
  data: Partial<MemberRegistration> & { status?: string },
): ExistingCpfRegistration {
  return {
    id,
    source,
    nomeCompleto: data.nomeCompleto ?? 'Cadastro sem nome',
    tipoPessoa: data.tipoPessoa,
    status: data.status,
    email: data.email,
    telefone: data.telefone,
  }
}

export async function findExistingRegistrationByCpf(cpf: string): Promise<ExistingCpfRegistration | null> {
  const cpfDigits = onlyDigits(cpf)

  if (cpfDigits.length !== 11) {
    return null
  }

  if (!db) {
    const saved = JSON.parse(localStorage.getItem(localStorageKey) ?? '[]') as Array<
      MemberRegistration & { id: string; status?: string }
    >
    const existing = saved.find((item) => onlyDigits(item.cpf) === cpfDigits && item.status !== 'rejeitado')
    return existing ? toExistingCpfRegistration(existing.id, 'membershipRequests', existing) : null
  }

  const lookups = [
    { source: 'members' as const, field: 'cpfDigits', value: cpfDigits },
    { source: 'members' as const, field: 'cpf', value: cpf },
    { source: 'membershipRequests' as const, field: 'cpfDigits', value: cpfDigits },
    { source: 'membershipRequests' as const, field: 'cpf', value: cpf },
    { source: 'users' as const, field: 'cpfDigits', value: cpfDigits },
    { source: 'users' as const, field: 'cpf', value: cpf },
  ]

  const officialMemberSnapshot = await getDoc(doc(db, 'members', cpfDigits))
  if (officialMemberSnapshot.exists() && officialMemberSnapshot.data().status !== 'rejeitado') {
    return toExistingCpfRegistration(
      officialMemberSnapshot.id,
      'members',
      officialMemberSnapshot.data() as Partial<MemberRegistration> & { status?: string },
    )
  }

  for (const lookup of lookups) {
    try {
      const snapshot = await getDocs(
        query(collection(db, lookup.source), where(lookup.field, '==', lookup.value)),
      )
      const match = snapshot.docs.find((docSnapshot) => docSnapshot.data().status !== 'rejeitado')

      if (match) {
        return toExistingCpfRegistration(
          match.id,
          lookup.source,
          match.data() as Partial<MemberRegistration> & { status?: string },
        )
      }
    } catch {
      // Some section-limited users may not read every collection; continue with the allowed checks.
    }
  }

  return null
}

export async function submitMembershipRequest(
  data: MemberRegistration,
  userId?: string,
): Promise<SubmissionResult> {
  const cpfDigits = onlyDigits(data.cpf)
  const payload = {
    ...data,
    cpfDigits,
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
  localStorage.setItem(localStorageKey, JSON.stringify([...saved, { ...data, cpfDigits, id }]))
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
  const memberDocumentId = registration.cpf ? onlyDigits(registration.cpf) : request.id

  batch.set(
    doc(db, 'members', memberDocumentId),
    {
      ...registration,
      tipoPessoa: 'membro',
      cpfDigits: onlyDigits(registration.cpf),
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
