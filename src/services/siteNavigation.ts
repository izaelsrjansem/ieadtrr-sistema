import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { NavigationIconKey, NavigationItem } from '../types'

const localStorageKey = 'ieadtrr-site-navigation'
const navigationIconKeys: NavigationIconKey[] = ['none', 'home', 'church', 'calendar', 'book', 'users', 'file', 'megaphone', 'map']

export const defaultNavigationItems: NavigationItem[] = [
  {
    id: 'inicio',
    label: 'Início',
    path: '/',
    icon: 'home',
    order: 0,
    visible: true,
    menuFontSize: 15,
    menuBold: true,
    pageTitle: 'Igreja Evangélica Assembleia de Deus Tradicional de Roraima',
    pageContent:
      'Um lugar de fé, comunhão e acolhimento. Aqui você encontra a agenda dos cultos, nossas congregações e as portas sempre abertas para caminhar conosco.',
    titleFontSize: 54,
    titleBold: true,
  },
  {
    id: 'congregacoes',
    label: 'Congregações',
    path: '/congregacoes',
    icon: 'church',
    order: 1,
    visible: true,
    menuFontSize: 15,
    menuBold: true,
    pageTitle: 'Congregações',
    pageContent: 'Conheça a sede e as congregações da IEADTRR.',
    titleFontSize: 48,
    titleBold: false,
  },
  {
    id: 'agenda',
    label: 'Agenda',
    path: '/agenda',
    icon: 'calendar',
    order: 2,
    visible: true,
    menuFontSize: 15,
    menuBold: true,
    pageTitle: 'Agenda de cultos e atividades',
    pageContent: 'Acompanhe os cultos, reuniões, missões e atividades da igreja.',
    titleFontSize: 48,
    titleBold: false,
  },
  {
    id: 'doutrina',
    label: 'Doutrina',
    path: '/doutrina',
    icon: 'book',
    order: 3,
    visible: true,
    menuFontSize: 15,
    menuBold: true,
    pageTitle: 'Doutrina',
    pageContent:
      'Princípios de fé e prática para visitantes, novos membros e pessoas interessadas em conhecer a igreja.',
    titleFontSize: 48,
    titleBold: false,
  },
  {
    id: 'diretoria',
    label: 'Diretoria',
    path: '/diretoria-publica',
    icon: 'users',
    order: 4,
    visible: true,
    menuFontSize: 15,
    menuBold: true,
    pageTitle: 'Relação pública da liderança',
    pageContent: 'Conheça a liderança responsável pela administração e pelo cuidado da igreja.',
    titleFontSize: 48,
    titleBold: false,
  },
]

function normalizedItems(value: unknown): NavigationItem[] {
  if (!Array.isArray(value) || value.length === 0) {
    return defaultNavigationItems
  }

  return value
    .filter((item): item is Partial<NavigationItem> => Boolean(item && typeof item === 'object'))
    .map((item, index) => {
      const icon = navigationIconKeys.includes(item.icon as NavigationIconKey) ? (item.icon as NavigationIconKey) : 'file'

      return {
        id: String(item.id || `item-${index}`),
        label: String(item.label || 'Novo item'),
        path: String(item.path || `/pagina-${index + 1}`),
        icon,
        order: Number.isFinite(Number(item.order)) ? Number(item.order) : index,
        visible: item.visible !== false,
        menuFontSize: Number(item.menuFontSize) || 15,
        menuBold: item.menuBold !== false,
        pageTitle: String(item.pageTitle || item.label || 'Nova página'),
        pageContent: String(item.pageContent || ''),
        titleFontSize: Number(item.titleFontSize) || 48,
        titleBold: item.titleBold === true,
      }
    })
}

export function subscribeNavigationItems(
  onData: (items: NavigationItem[]) => void,
  onError?: (error: Error) => void,
): () => void {
  if (!db) {
    const saved = localStorage.getItem(localStorageKey)
    onData(saved ? normalizedItems(JSON.parse(saved)) : defaultNavigationItems)
    return () => {}
  }

  return onSnapshot(
    doc(db, 'siteSettings', 'navigation'),
    (snapshot) => {
      onData(snapshot.exists() ? normalizedItems(snapshot.data().items) : defaultNavigationItems)
    },
    (error) => onError?.(error),
  )
}

export async function saveNavigationItems(items: NavigationItem[], adminUid: string): Promise<void> {
  const normalized = normalizedItems(items)

  if (!db) {
    localStorage.setItem(localStorageKey, JSON.stringify(normalized))
    return
  }

  await setDoc(doc(db, 'siteSettings', 'navigation'), {
    items: normalized,
    updatedAt: serverTimestamp(),
    updatedBy: adminUid,
  })
}
