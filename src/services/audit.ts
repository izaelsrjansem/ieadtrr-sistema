import { addDoc, collection, limit, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { AuditLog } from '../types'

export type AuditActor = {
  uid: string
  nomeCompleto?: string
  email?: string
}

export type AuditLogInput = {
  action: string
  entityType: string
  entityId: string
  entityName?: string
  actor: AuditActor
  summary: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  changedFields?: string[]
}

export async function createAuditLog(input: AuditLogInput): Promise<void> {
  if (!db) {
    return
  }

  try {
    await addDoc(collection(db, 'auditLogs'), {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      entityName: input.entityName ?? '',
      actorUid: input.actor.uid,
      actorName: input.actor.nomeCompleto ?? '',
      actorEmail: input.actor.email ?? '',
      summary: input.summary,
      before: input.before ?? {},
      after: input.after ?? {},
      changedFields: input.changedFields ?? [],
      createdAt: serverTimestamp(),
    })
  } catch (error) {
    console.warn('Audit log was not saved.', error)
  }
}

export function subscribeAuditLogs(
  onData: (logs: AuditLog[]) => void,
  onError?: (error: Error) => void,
): () => void {
  if (!db) {
    onData([])
    return () => {}
  }

  return onSnapshot(
    query(collection(db, 'auditLogs'), orderBy('createdAt', 'desc'), limit(200)),
    (snapshot) => {
      onData(snapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }) as AuditLog))
    },
    (error) => onError?.(error),
  )
}
