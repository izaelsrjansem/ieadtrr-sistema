import { addDoc, collection, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore'
import { congregations as initialCongregations } from '../data/church'
import { db } from '../lib/firebase'
import type { Congregation, CongregationCategory } from '../types'

export type CongregationInput = Omit<Congregation, 'id' | 'createdAt' | 'updatedAt'>

const legacyCategoryMap: Record<string, CongregationCategory> = {
  capital_sede: 'capital',
  capital_filial: 'capital',
  interior_filial: 'interior',
}

export function normalizeCongregationCategory(value: unknown): CongregationCategory {
  if (value === 'capital' || value === 'interior' || value === 'zona_rural') {
    return value
  }

  return legacyCategoryMap[String(value)] ?? 'capital'
}

function normalizeCongregations(items: Congregation[]): Congregation[] {
  return items
    .map((item) => ({
      ...item,
      categoria: normalizeCongregationCategory(item.categoria),
      ativa: item.ativa !== false,
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

export function subscribeCongregations(
  onData: (congregations: Congregation[]) => void,
  onError?: (error: Error) => void,
): () => void {
  if (!db) {
    onData(normalizeCongregations(initialCongregations))
    return () => {}
  }

  return onSnapshot(
    collection(db, 'congregations'),
    (snapshot) => {
      const items = snapshot.docs.map(
        (docSnapshot) =>
          ({
            id: docSnapshot.id,
            ...docSnapshot.data(),
          }) as Congregation,
      )

      onData(normalizeCongregations(items.length > 0 ? items : initialCongregations))
    },
    (error) => onError?.(error),
  )
}

export async function createCongregation(data: CongregationInput): Promise<void> {
  if (!db) {
    throw new Error('Firebase não configurado.')
  }

  await addDoc(collection(db, 'congregations'), {
    ...data,
    ativa: data.ativa !== false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function updateCongregation(id: string, data: CongregationInput): Promise<void> {
  if (!db) {
    throw new Error('Firebase não configurado.')
  }

  await updateDoc(doc(db, 'congregations', id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function suppressCongregation(id: string): Promise<void> {
  if (!db) {
    throw new Error('Firebase não configurado.')
  }

  await updateDoc(doc(db, 'congregations', id), {
    ativa: false,
    updatedAt: serverTimestamp(),
  })
}
