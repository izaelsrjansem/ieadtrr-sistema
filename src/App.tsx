import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Building2,
  Flame,
  FileText,
  FileUp,
  Gift,
  Handshake,
  Heart,
  HelpCircle,
  Home,
  Hourglass,
  Info,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Mail,
  MapPinned,
  MapPin,
  Megaphone,
  MessageCircle,
  Music,
  Navigation,
  Pencil,
  Phone,
  PlusCircle,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  UserPlus,
  UsersRound,
  Video,
  Volume2,
  X,
} from 'lucide-react'
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { NeighborhoodCombobox, OptionsCombobox } from './components/NeighborhoodCombobox'
import { ProtectedRoute } from './components/ProtectedRoute'
import { RegistrationForm } from './components/RegistrationForm'
import { useAuth } from './context/AuthContext'
import {
  churchDisplayName,
  churchRoleOptions,
  brazilStates,
  congregations as fallbackCongregations,
  homeAnnouncements,
  leadership,
  logradouroOptions,
  personTypeOptions,
  publicEvents,
  roraimaMunicipalities,
  serviceScale,
  weeklyServices,
} from './data/church'
import {
  churchAddresses,
  historicalFoundingMembers,
  historicalMembersSourceNote,
  institutionalInfo,
  publicChurchPrinciples,
} from './data/institutional'
import {
  isFirebaseConfigured,
  refreshCurrentUserEmailVerification,
  requestAccessEmailChange,
  sendCurrentUserVerificationEmail,
  sendPasswordReset,
  signIn,
  signOutUser,
  signUp,
} from './services/auth'
import { createAuditLog, subscribeAuditLogs, type AuditActor } from './services/audit'
import {
  createCongregation,
  subscribeCongregations,
  suppressCongregation,
  updateCongregation,
  type CongregationInput,
} from './services/congregations'
import { deactivateOfficialMember, subscribeMembers, updateOfficialMember, updateOfficialMemberStatus } from './services/members'
import {
  claimExistingRegistrationByEmail,
  decideMembershipRequest,
  promoteNominalCongregadoRequestToMembro,
  subscribeMembershipRequests,
  updateMembershipRequestProfile,
} from './services/membership'
import { defaultNavigationItems, saveNavigationItems, subscribeNavigationItems } from './services/siteNavigation'
import {
  promoteCongregadoToMembro,
  promoteVisitorToCongregado,
  syncUserAccessEmail,
  subscribeUsers,
  updateUserAdminSectionAccess,
  updateMemberChurchRole,
  updateUserRegistrationProfile,
  updateUserRole,
  updateVisitorCongregacao,
} from './services/users'
import {
  createNominalVisitRecord,
  subscribeUserVisitRecords,
  subscribeVisitRecords,
  upsertVisitRecord,
} from './services/visitRecords'
import type {
  Congregation,
  CongregationCategory,
  FirestoreDate,
  ChurchRole,
  AdminSectionKey,
  AuditLog,
  MembershipRequest,
  MembershipRequestStatus,
  NavigationIconKey,
  NavigationItem,
  MemberRegistration,
  OfficialMember,
  SystemRole,
  UserProfile,
  VisitRecord,
  VisitSession,
  VisitPersonType,
} from './types'

const announcementIcons = {
  flame: Flame,
  family: UsersRound,
  book: BookOpen,
} as const

const systemRoleLabels: Record<SystemRole, string> = {
  pendente: 'Pendente',
  visitante: 'Visitante',
  congregado: 'Congregado',
  membro: 'Membro',
  diretoria: 'Diretoria',
  admin: 'Administrador',
}

const assignableRoles: SystemRole[] = ['pendente', 'congregado', 'membro', 'diretoria', 'admin']

type AdminSectionDefinition = {
  key: AdminSectionKey
  title: string
  description: string
  icon: typeof Home
}

const adminSections: AdminSectionDefinition[] = [
  {
    key: 'cadastros',
    title: 'Cadastro',
    description: 'Membros e congregados',
    icon: CheckCircle2,
  },
  {
    key: 'aprovacao_cadastros',
    title: 'Aprovação de cadastro',
    description: 'Conferir e aprovar membros',
    icon: ShieldCheck,
  },
  {
    key: 'membros',
    title: 'Membros',
    description: 'Relação oficial, perfis e cargos',
    icon: UsersRound,
  },
  {
    key: 'presencas',
    title: 'Registro',
    description: 'Visitantes e convidados',
    icon: Clock,
  },
  {
    key: 'dashboard_registros',
    title: 'Dashboard de registros',
    description: 'Gestão e análise dos registros',
    icon: BarChart3,
  },
  {
    key: 'relatorio_visitantes',
    title: 'Relatório de visitantes',
    description: 'Leitura nominal no culto',
    icon: Megaphone,
  },
  {
    key: 'congregacoes',
    title: 'Congregações',
    description: 'Igrejas, endereços e mapas',
    icon: Building2,
  },
  {
    key: 'usuarios',
    title: 'Usuários',
    description: 'Perfis e acesso por seção',
    icon: ShieldCheck,
  },
  {
    key: 'auditoria',
    title: 'Auditoria',
    description: 'Quem alterou, quando e o que mudou',
    icon: ScrollText,
  },
  {
    key: 'site',
    title: 'Site público',
    description: 'Menus, páginas e banner',
    icon: LayoutDashboard,
  },
]

const requestStatusFilters: Array<{ value: MembershipRequestStatus | 'todos'; label: string }> = [
  { value: 'pendente', label: 'Pendentes' },
  { value: 'aprovado', label: 'Aprovados' },
  { value: 'rejeitado', label: 'Rejeitados' },
  { value: 'todos', label: 'Todos' },
]

type ProgressionFilter = 'todos' | 'visitante' | 'convidado' | 'congregado' | 'membro'

const progressionFilters: Array<{ value: ProgressionFilter; label: string }> = [
  { value: 'todos', label: 'Todos' },
  { value: 'visitante', label: 'Visitantes' },
  { value: 'convidado', label: 'Convidados' },
  { value: 'congregado', label: 'Congregados' },
  { value: 'membro', label: 'Membros' },
]

const congregationCategoryLabels: Record<CongregationCategory, string> = {
  capital: 'Capital',
  interior: 'Interior',
  zona_rural: 'Zona Rural de Boa Vista',
}

const congregationAreaFilters: Array<{ value: 'todas' | CongregationCategory; label: string }> = [
  { value: 'todas', label: 'Todas' },
  { value: 'capital', label: 'Capital' },
  { value: 'interior', label: 'Interior' },
  { value: 'zona_rural', label: 'Zona Rural' },
]

const visitTypeLabels: Record<VisitPersonType, string> = {
  visitante: 'Visitante',
  convidado: 'Convidado',
}

function VisitTypeSelector({
  value,
  onChange,
  name,
}: {
  value: VisitPersonType
  onChange: (value: VisitPersonType) => void
  name: string
}) {
  return (
    <div className="record-type-selector">
      <span>Tipo de registro</span>
      <div className="type-picker">
        {(['visitante', 'convidado'] as VisitPersonType[]).map((type) => (
          <label className={value === type ? 'active' : undefined} key={type}>
            <input
              checked={value === type}
              name={name}
              onChange={() => onChange(type)}
              type="radio"
            />
            {visitTypeLabels[type]}
          </label>
        ))}
      </div>
      <p className="selection-note">
        {value === 'convidado'
          ? 'Convidado é a pessoa que veio por indicação ou convite de alguém da igreja.'
          : 'Visitante é a pessoa que veio por iniciativa própria ou está conhecendo a igreja.'}
      </p>
    </div>
  )
}

const visitSessionLabels: Record<VisitSession, string> = {
  regular: 'Visita do dia',
  ebd: 'Escola bíblica dominical',
  culto_noite: 'Culto à noite',
}

function firestoreDateValue(value?: FirestoreDate): number {
  if (!value) {
    return 0
  }

  const date = typeof value === 'string' ? new Date(value) : value.toDate?.()
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0
}

function formatFirestoreDate(value?: FirestoreDate): string {
  const time = firestoreDateValue(value)
  return time ? new Date(time).toLocaleDateString('pt-BR') : '—'
}

function formatFirestoreTime(value?: FirestoreDate): string {
  const time = firestoreDateValue(value)
  return time ? new Date(time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'
}

function formatDateKey(value?: string): string {
  if (!value) {
    return '—'
  }

  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('pt-BR')
}

function weekdayLabelFromDateKey(value?: string): string {
  if (!value) {
    return ''
  }

  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('pt-BR', { weekday: 'long' })
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function isSunday(dateKey: string): boolean {
  return new Date(`${dateKey}T12:00:00`).getDay() === 0
}

function visitSessionsForDate(dateKey: string): Array<{ value: VisitSession; label: string }> {
  if (isSunday(dateKey)) {
    return [
      { value: 'ebd', label: visitSessionLabels.ebd },
      { value: 'culto_noite', label: visitSessionLabels.culto_noite },
    ]
  }

  return [{ value: 'regular', label: visitSessionLabels.regular }]
}

function profilePanelPath(profile: UserProfile | null): string {
  if (!profile) {
    return '/cadastro'
  }

  if (profile.role === 'admin') {
    return '/admin'
  }

  if (profile.role === 'diretoria') {
    return '/diretoria'
  }

  if (profile.role === 'visitante') {
    return '/visitante'
  }

  if (profile.role === 'congregado') {
    return '/congregado'
  }

  if (profile.role === 'membro' || profile.tipoPessoa === 'membro') {
    return '/membro'
  }

  return '/cadastro'
}

function adminAccessSections(profile: UserProfile | null): AdminSectionKey[] {
  if (!profile) {
    return []
  }

  if (profile.role === 'admin') {
    return adminSections.map((section) => section.key)
  }

  return profile.adminSectionAccess ?? []
}

function hasAdminPanelAccess(profile: UserProfile | null): boolean {
  return adminAccessSections(profile).length > 0
}

function hasCoordinates(congregation?: Congregation | null): congregation is Congregation & {
  latitude: number
  longitude: number
} {
  return typeof congregation?.latitude === 'number' && typeof congregation.longitude === 'number'
}

function RequiredHint() {
  return <span className="required-hint">Campo obrigatório</span>
}

const BOA_VISTA_COORDS: [number, number] = [2.8235, -60.6758]

function MapPicker({
  latitude,
  longitude,
  onPick,
}: {
  latitude?: number
  longitude?: number
  onPick: (lat: number, lng: number) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<{ remove: () => void } | null>(null)
  const onPickRef = useRef(onPick)
  onPickRef.current = onPick

  useEffect(() => {
    const leaflet = (window as unknown as { L?: any }).L
    if (!leaflet || !containerRef.current || mapRef.current) {
      return
    }

    const hasStart = typeof latitude === 'number' && typeof longitude === 'number'
    const start: [number, number] = hasStart ? [latitude as number, longitude as number] : BOA_VISTA_COORDS
    const map = leaflet.map(containerRef.current).setView(start, hasStart ? 15 : 12)
    leaflet
      .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap',
      })
      .addTo(map)

    let marker = hasStart ? leaflet.marker(start).addTo(map) : null

    map.on('click', (event: { latlng: { lat: number; lng: number } }) => {
      const lat = Number(event.latlng.lat.toFixed(6))
      const lng = Number(event.latlng.lng.toFixed(6))
      if (marker) {
        marker.setLatLng([lat, lng])
      } else {
        marker = leaflet.marker([lat, lng]).addTo(map)
      }
      onPickRef.current(lat, lng)
    })

    mapRef.current = map
    window.setTimeout(() => map.invalidateSize(), 120)

    return () => {
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="map-picker">
      <div className="map-picker-canvas" ref={containerRef} />
      <p className="field-hint">Clique no mapa para marcar o local exato da igreja.</p>
    </div>
  )
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=pt-BR`
  const response = await fetch(url, { headers: { Accept: 'application/json' } })
  const data = (await response.json()) as {
    address?: {
      road?: string
      pedestrian?: string
      footway?: string
      house_number?: string
      suburb?: string
      neighbourhood?: string
      quarter?: string
      city_district?: string
      city?: string
      town?: string
      municipality?: string
    }
  }

  const address = data.address ?? {}
  const road = address.road || address.pedestrian || address.footway || ''
  const numero = address.house_number || ''
  const bairro = address.suburb || address.neighbourhood || address.quarter || address.city_district || ''
  const cidade = address.city || address.town || address.municipality || ''

  return [road ? (numero ? `${road}, ${numero}` : road) : '', bairro, cidade].filter(Boolean).join(', ')
}

function CongregationMiniMap({ congregation }: { congregation?: Congregation | null }) {
  if (!hasCoordinates(congregation)) {
    return (
      <div className="mini-map empty-map">
        <MapPinned aria-hidden="true" />
        <span>Geolocalização ainda não informada.</span>
      </div>
    )
  }

  const delta = 0.01
  const { latitude, longitude } = congregation
  const bbox = `${longitude - delta}%2C${latitude - delta}%2C${longitude + delta}%2C${latitude + delta}`

  return (
    <iframe
      className="mini-map"
      title={`Mapa - ${congregation.nome}`}
      src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude}%2C${longitude}`}
      loading="lazy"
    />
  )
}

const navigationIconComponents: Record<NavigationIconKey, typeof Home | null> = {
  none: null,
  home: Home,
  church: Building2,
  calendar: CalendarDays,
  book: BookOpen,
  users: UsersRound,
  file: FileText,
  megaphone: Megaphone,
  map: MapPin,
  autofalante: Volume2,
  phone: Phone,
  mail: Mail,
  message: MessageCircle,
  heart: Heart,
  star: Star,
  gift: Gift,
  clock: Clock,
  info: Info,
  handshake: Handshake,
  help: HelpCircle,
  music: Music,
  video: Video,
  sparkles: Sparkles,
}

const navigationIconOptions: Array<{ value: NavigationIconKey; label: string }> = [
  { value: 'none', label: 'Sem ícone' },
  { value: 'home', label: 'Início' },
  { value: 'church', label: 'Igreja' },
  { value: 'calendar', label: 'Calendário' },
  { value: 'book', label: 'Livro' },
  { value: 'users', label: 'Pessoas' },
  { value: 'file', label: 'Página' },
  { value: 'megaphone', label: 'Aviso' },
  { value: 'map', label: 'Mapa' },
  { value: 'autofalante', label: 'Autofalante' },
  { value: 'phone', label: 'Telefone' },
  { value: 'mail', label: 'E-mail' },
  { value: 'message', label: 'Mensagem' },
  { value: 'heart', label: 'Coração' },
  { value: 'star', label: 'Estrela' },
  { value: 'gift', label: 'Presente' },
  { value: 'clock', label: 'Horário' },
  { value: 'info', label: 'Informação' },
  { value: 'handshake', label: 'Aperto de mãos' },
  { value: 'help', label: 'Ajuda' },
  { value: 'music', label: 'Música' },
  { value: 'video', label: 'Vídeo' },
  { value: 'sparkles', label: 'Destaque' },
]

const builtInNavigationIds = new Set(defaultNavigationItems.map((item) => item.id))
const reservedNavigationPaths = new Set([
  '/cadastro',
  '/login',
  '/visitante',
  '/congregado',
  '/membro',
  '/membro/fundadores',
  '/diretoria',
  '/admin',
  '/regras',
])

function sortedVisibleNavigationItems(items: NavigationItem[]): NavigationItem[] {
  return [...items].filter((item) => item.visible).sort((a, b) => a.order - b.order)
}

function navigationSettingsFor(items: NavigationItem[], path: string): NavigationItem | undefined {
  return items.find((item) => item.path === path) ?? defaultNavigationItems.find((item) => item.path === path)
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function menuStyleFor(item: NavigationItem): React.CSSProperties {
  return {
    fontSize: `${clampNumber(item.menuFontSize || 15, 12, 22)}px`,
    fontWeight: item.menuBold ? 800 : 600,
  }
}

function pageTitleStyleFor(item?: NavigationItem): React.CSSProperties {
  return {
    fontSize: `${clampNumber(item?.titleFontSize ?? 48, 28, 72)}px`,
    fontWeight: item?.titleBold ? 800 : 500,
  }
}

function normalizeNavigationPath(value: string): string {
  if (!value.trim() || value.trim() === '/') {
    return '/'
  }

  const slug = value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/^\/+/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return slug ? `/${slug}` : '/'
}

function renderPageContent(content?: string) {
  const paragraphs = content
    ?.split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (!paragraphs?.length) {
    return null
  }

  return (
    <div className="custom-page-content">
      {paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </div>
  )
}

function newNavigationItem(items: NavigationItem[]): NavigationItem {
  const nextOrder = Math.max(-1, ...items.map((item) => item.order)) + 1

  return {
    id: `custom-${Date.now()}`,
    label: 'Nova página',
    path: `/nova-pagina-${nextOrder + 1}`,
    icon: 'file',
    order: nextOrder,
    visible: true,
    menuFontSize: 15,
    menuBold: true,
    pageTitle: 'Nova página',
    pageContent: 'Escreva aqui o conteúdo que aparecerá para o público.',
    titleFontSize: 48,
    titleBold: false,
  }
}

const JUST_LOGGED_IN_KEY = 'ieadtrr-just-logged-in'

function profileNeedsCompletion(profile: UserProfile | null): boolean {
  if (!profile) {
    return false
  }

  if (profile.role === 'pendente' && !profile.tipoPessoa) {
    return true
  }

  if (profile.tipoPessoa === 'membro' || profile.tipoPessoa === 'congregado') {
    return memberEditorMissingRequiredFields(editableRecordToForm(profile)).size > 0
  }

  return false
}

type SessionUiValue = {
  openSelfEditor: (highlightMissing?: boolean) => void
}

const SessionUiContext = createContext<SessionUiValue | null>(null)

function useSessionUi(): SessionUiValue {
  const context = useContext(SessionUiContext)
  if (!context) {
    throw new Error('useSessionUi deve ser usado dentro de SessionUiProvider.')
  }
  return context
}

function SessionUiProvider({ children }: { children: ReactNode }) {
  const { firebaseUser, profile, loading } = useAuth()
  const navigate = useNavigate()
  const [welcomeVisible, setWelcomeVisible] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [highlightMissing, setHighlightMissing] = useState(false)
  const [reminderDismissed, setReminderDismissed] = useState(false)

  useEffect(() => {
    if (loading || !firebaseUser) {
      return
    }

    if (sessionStorage.getItem(JUST_LOGGED_IN_KEY) !== '1') {
      return
    }

    sessionStorage.removeItem(JUST_LOGGED_IN_KEY)
    setWelcomeVisible(true)
  }, [firebaseUser, loading])

  useEffect(() => {
    if (!welcomeVisible) {
      return
    }

    const timer = window.setTimeout(() => setWelcomeVisible(false), 1600)
    return () => window.clearTimeout(timer)
  }, [welcomeVisible])

  function openSelfEditor(highlight = false) {
    setHighlightMissing(highlight)
    setEditorOpen(true)
  }

  function handleCompletar() {
    if (profile && profile.role === 'pendente' && !profile.tipoPessoa) {
      navigate('/cadastro')
      return
    }
    openSelfEditor(true)
  }

  const displayName = profile?.nomeCompleto || firebaseUser?.email || ''
  const showReminder =
    Boolean(firebaseUser && profile) &&
    profileNeedsCompletion(profile) &&
    !welcomeVisible &&
    !editorOpen &&
    !reminderDismissed

  return (
    <SessionUiContext.Provider value={{ openSelfEditor }}>
      {children}

      {welcomeVisible ? (
        <div className="session-modal-overlay welcome-overlay">
          <div className="welcome-card">
            <CheckCircle2 aria-hidden="true" />
            <strong>Login realizado com sucesso!</strong>
            <span>Bem-vindo(a), {displayName}.</span>
          </div>
        </div>
      ) : null}

      {showReminder ? (
        <div className="complete-reminder">
          <div className="complete-reminder-text">
            <Info aria-hidden="true" />
            <div>
              <strong>Seu cadastro está incompleto</strong>
              <p>Faltam informações obrigatórias. Complete para concluir seu cadastro.</p>
            </div>
          </div>
          <div className="complete-reminder-actions">
            <button className="primary-action" type="button" onClick={handleCompletar}>
              <Pencil aria-hidden="true" />
              Completar cadastro
            </button>
            <button className="link-button" type="button" onClick={() => setReminderDismissed(true)}>
              Agora não
            </button>
          </div>
        </div>
      ) : null}

      {editorOpen && firebaseUser && profile ? (
        <div className="session-modal-overlay" role="dialog" aria-modal="true">
          <div className="session-modal-panel">
            <div className="session-modal-head">
              <h2>Editar cadastro</h2>
              <button
                className="icon-button"
                type="button"
                aria-label="Fechar"
                onClick={() => setEditorOpen(false)}
              >
                <X aria-hidden="true" />
              </button>
            </div>
            <div className="session-modal-body">
              <MemberCadastroEditor
                mode="self"
                record={profile}
                highlightMissingRequired={highlightMissing}
                onSave={async (data) => {
                  await updateUserRegistrationProfile(firebaseUser.uid, data)
                }}
                onCancel={() => setEditorOpen(false)}
              />
            </div>
          </div>
        </div>
      ) : null}
    </SessionUiContext.Provider>
  )
}

function App() {
  const [navigationItems, setNavigationItems] = useState<NavigationItem[]>(defaultNavigationItems)
  const navItems = sortedVisibleNavigationItems(navigationItems)

  useEffect(() => subscribeNavigationItems(setNavigationItems), [])

  return (
    <SessionUiProvider>
    <div className="app-shell">
      <header className="site-header">
        <Link className="brand" to="/">
          <img src="/images/ieadtrr-logo.jpeg" alt="" />
          <span>IEADTRR</span>
        </Link>

        <nav aria-label="Navegação principal">
          {navItems.map((item) => {
            const Icon = navigationIconComponents[item.icon]

            return (
              <NavLink
                end={item.path === '/'}
                key={item.id}
                to={item.path}
                className={({ isActive }) => (isActive ? 'active' : undefined)}
                style={menuStyleFor(item)}
              >
                {Icon ? <Icon className="nav-item-icon" aria-hidden="true" /> : null}
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        <HeaderAccess />
      </header>

      <main>
        <Routes>
          <Route path="/" element={<HomePage settings={navigationSettingsFor(navigationItems, '/')} />} />
          <Route
            path="/congregacoes"
            element={<CongregationsPage settings={navigationSettingsFor(navigationItems, '/congregacoes')} />}
          />
          <Route path="/agenda" element={<AgendaPage settings={navigationSettingsFor(navigationItems, '/agenda')} />} />
          <Route
            path="/doutrina"
            element={<PublicDoctrinePage settings={navigationSettingsFor(navigationItems, '/doutrina')} />}
          />
          <Route path="/regras" element={<Navigate replace to="/doutrina" />} />
          <Route
            path="/diretoria-publica"
            element={<PublicLeadershipPage settings={navigationSettingsFor(navigationItems, '/diretoria-publica')} />}
          />
          <Route path="/cadastro" element={<RegistrationPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/visitante"
            element={
              <ProtectedRoute allowedRoles={['visitante']}>
                <VisitorPanel />
              </ProtectedRoute>
            }
          />
          <Route
            path="/congregado"
            element={
              <ProtectedRoute allowedRoles={['congregado']}>
                <CongregadoPanel />
              </ProtectedRoute>
            }
          />
          <Route
            path="/membro"
            element={
              <ProtectedRoute allowedRoles={['membro', 'diretoria', 'admin']}>
                <EnhancedMemberDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/membro/fundadores"
            element={
              <ProtectedRoute allowedRoles={['membro', 'diretoria', 'admin']}>
                <FoundingMembersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/diretoria"
            element={
              <ProtectedRoute allowedRoles={['diretoria', 'admin']}>
                <BoardDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminAccessRoute>
                <AdminDashboard navigationItems={navigationItems} />
              </AdminAccessRoute>
            }
          />
          <Route path="/:customSlug" element={<CustomPublicPage navigationItems={navigationItems} />} />
        </Routes>
      </main>

      <SiteFooter />
    </div>
    </SessionUiProvider>
  )
}

function AdminAccessRoute({ children }: { children: React.ReactNode }) {
  const { firebaseUser, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <section className="auth-page">
        <div className="auth-panel status-panel">
          <p>Carregando...</p>
        </div>
      </section>
    )
  }

  if (!firebaseUser) {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />
  }

  if (!hasAdminPanelAccess(profile)) {
    return (
      <section className="auth-page">
        <div className="auth-panel status-panel">
          <LockKeyhole aria-hidden="true" />
          <h1>Acesso administrativo não liberado</h1>
          <p>Seu usuário ainda não tem uma seção administrativa liberada.</p>
        </div>
      </section>
    )
  }

  return <>{children}</>
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <img src="/images/ieadtrr-logo.jpeg" alt="" />
        <div>
          <strong>{churchDisplayName}</strong>
          <span>CNPJ {institutionalInfo.cnpj}</span>
        </div>
      </div>
      <div className="footer-addresses">
        <article>
          <span>{churchAddresses.missionaria.label}</span>
          <p>{churchAddresses.missionaria.endereco}</p>
        </article>
        <article>
          <span>{churchAddresses.administrativa.label}</span>
          <p>{churchAddresses.administrativa.endereco}</p>
        </article>
      </div>
      <p className="footer-note">
        Fundada em {institutionalInfo.foundedAt} · {institutionalInfo.president}
      </p>
    </footer>
  )
}

function HeaderAccess() {
  const { firebaseUser, profile } = useAuth()
  const navigate = useNavigate()

  if (!firebaseUser) {
    return (
      <div className="header-account auth-actions">
        <Link className="panel-link" to="/cadastro">
          <UserPlus aria-hidden="true" />
          Cadastre-se
        </Link>
        <Link className="login-link" to="/login">
          <LockKeyhole aria-hidden="true" />
          Entre
        </Link>
      </div>
    )
  }

  return <LoggedHeaderAccount firebaseUser={firebaseUser} profile={profile} navigate={navigate} />
}

function LoggedHeaderAccount({
  firebaseUser,
  profile,
  navigate,
}: {
  firebaseUser: NonNullable<ReturnType<typeof useAuth>['firebaseUser']>
  profile: UserProfile | null
  navigate: ReturnType<typeof useNavigate>
}) {
  const { openSelfEditor } = useSessionUi()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) {
      return
    }

    function handleOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [menuOpen])

  async function handleSignOut() {
    setMenuOpen(false)
    await signOutUser()
    navigate('/')
  }

  const canOpenAdminPanel = hasAdminPanelAccess(profile)
  const displayName = profile?.nomeCompleto || firebaseUser.email || 'Minha conta'
  const photoSrc = displayablePhotoSrc(profile?.selfieArquivo)
  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?'

  return (
    <div className="header-account">
      {canOpenAdminPanel ? (
        <NavLink
          className={({ isActive }) => `panel-link admin-panel-link${isActive ? ' active' : ''}`}
          to="/admin"
        >
          <LayoutDashboard aria-hidden="true" />
          Painel Administrativo
        </NavLink>
      ) : (
        <NavLink className={({ isActive }) => `panel-link${isActive ? ' active' : ''}`} to={profilePanelPath(profile)}>
          <LayoutDashboard aria-hidden="true" />
          Meu painel
        </NavLink>
      )}

      <div className="user-menu" ref={menuRef}>
        <button
          className="user-menu-trigger"
          type="button"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((current) => !current)}
        >
          <span className="user-avatar">
            {photoSrc ? <img src={photoSrc} alt="" /> : <span>{initials}</span>}
          </span>
          <span className="user-menu-name">{displayName}</span>
          <ChevronDown className="user-menu-caret" aria-hidden="true" />
        </button>

        {menuOpen ? (
          <div className="user-menu-dropdown">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false)
                openSelfEditor(false)
              }}
            >
              <Pencil aria-hidden="true" />
              Editar cadastro
            </button>
            <button type="button" onClick={handleSignOut}>
              <LogOut aria-hidden="true" />
              Sair
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function HomePage({ settings }: { settings?: NavigationItem }) {
  return (
    <>
      <section className="hero-section">
        <div className="hero-pattern" aria-hidden="true" />
        <div className="hero-content">
          <p className="eyebrow">Bem-vindo à nossa casa</p>
          <h1 className="hero-title" style={pageTitleStyleFor(settings)}>
            {settings?.pageTitle || churchDisplayName}
          </h1>
          <p>
            {settings?.pageContent ||
              'Um lugar de fé, comunhão e acolhimento. Aqui você encontra a agenda dos cultos, nossas congregações e as portas sempre abertas para caminhar conosco.'}
          </p>
          <p className="hero-invite">
            <Link to="/cadastro">Cadastre-se</Link> e participe desta grande família.
          </p>
          <div className="hero-actions">
            <Link className="secondary-action" to="/agenda">
              <CalendarDays aria-hidden="true" />
              Agenda da Igreja
            </Link>
          </div>
        </div>
        <PublicBanner />
      </section>

      <section className="content-section announcements-section" aria-label="Atendimento ao público">
        <div className="section-heading">
          <p className="eyebrow">Atendimento ao público</p>
        </div>
        <p className="announcements-lead">Acompanhe os próximos eventos, campanhas e comunicados da igreja.</p>
        <div className="announcement-grid">
          {homeAnnouncements.map((item) => {
            const Icon = announcementIcons[item.icon]
            return (
              <article className={`announcement-card accent-${item.accent}`} key={item.id}>
                <div className="announcement-media">
                  <Icon aria-hidden="true" />
                </div>
                <div className="announcement-body">
                  <span>{item.tag}</span>
                  <strong>{item.titulo}</strong>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <ContributionSection />
    </>
  )
}

function PublicBanner() {
  const [activeSlide, setActiveSlide] = useState(0)
  const currentSlide = weeklyServices[activeSlide]

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % weeklyServices.length)
    }, 5500)

    return () => window.clearInterval(timer)
  }, [])

  return (
    <aside className="hero-public-banner" aria-label="Cultos da semana em destaque">
      <div className="banner-stage">
        {weeklyServices.map((service, index) => (
          <img
            key={service.id}
            className={`banner-stage-photo${index === activeSlide ? ' active' : ''}`}
            src={service.image}
            alt={service.alt}
            aria-hidden={index === activeSlide ? undefined : true}
          />
        ))}
        <img className="banner-logo-corner" src="/images/ieadtrr-logo.jpeg" alt="" />
        <div className="banner-stage-overlay">
          <span className="banner-kicker">Notícias e avisos · Cultos da semana</span>
          <div className="banner-stage-meta">
            <span className="banner-day">{currentSlide.dia}</span>
            <strong>{currentSlide.titulo}</strong>
            <span className="banner-time">
              <Clock aria-hidden="true" />
              {currentSlide.horario} · {currentSlide.local}
            </span>
            <p>{currentSlide.descricao}</p>
          </div>
        </div>
      </div>

      <div className="banner-progress-list" aria-label="Selecionar culto em destaque">
        {weeklyServices.map((service, index) => (
          <button
            aria-label={`Mostrar ${service.titulo}, ${service.dia} às ${service.horario}`}
            className={index === activeSlide ? 'active' : undefined}
            key={service.id}
            onClick={() => setActiveSlide(index)}
            type="button"
          >
            <span>{service.dia}</span>
            <strong>{service.titulo}</strong>
            <em>{service.horario}</em>
            <i aria-hidden="true" />
          </button>
        ))}
      </div>
    </aside>
  )
}

function RegistrationPage() {
  const { firebaseUser, loading, profile } = useAuth()

  if (loading) {
    return (
      <section className="auth-page">
        <div className="auth-panel status-panel">
          <p>Carregando...</p>
        </div>
      </section>
    )
  }

  if (!firebaseUser) {
    return (
      <section className="content-section registration-page">
        <div className="section-heading">
          <p className="eyebrow">Cadastro</p>
          <h1>Crie seu acesso</h1>
          <p>Primeiro crie o login. Depois você informa se é visitante, convidado ou membro.</p>
        </div>
        <CreateAccessPanel />
      </section>
    )
  }

  if (profile?.role === 'admin') {
    return <Navigate replace to="/admin" />
  }

  if (profile?.role === 'pendente' && profile.pendingFirstAccess) {
    return <FirstAccessVerificationPanel />
  }

  if (profile?.role && profile.role !== 'pendente') {
    return <Navigate replace to={profilePanelPath(profile)} />
  }

  if (profile?.role === 'pendente' && profile?.tipoPessoa === 'membro') {
    return (
      <section className="auth-page">
        <div className="auth-panel status-panel">
          <Hourglass aria-hidden="true" />
          <h1>Cadastro em análise</h1>
          <p>
            Seu acesso já foi criado e o cadastro de membro foi enviado para validação da administração.
            As funções de membro serão liberadas após a aprovação.
          </p>
          <Link className="primary-action" to="/membro">
            Acompanhar cadastro
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="content-section registration-page">
      <div className="section-heading">
        <p className="eyebrow">Entrada de dados</p>
        <h1>Informe seu tipo de cadastro</h1>
        <p>Escolha se você é visitante, convidado ou membro e complete as informações necessárias.</p>
      </div>
      <RegistrationForm />
    </section>
  )
}

function CreateAccessPanel() {
  const [mode, setMode] = useState<'new' | 'first_access'>('new')
  const [nomeCompleto, setNomeCompleto] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('sending')
    setErrorMessage('')

    if (mode === 'new' && nomeCompleto.trim().split(/\s+/).filter(Boolean).length < 2) {
      setStatus('error')
      setErrorMessage('Informe nome e sobrenome.')
      return
    }

    if (senha.length < 6) {
      setStatus('error')
      setErrorMessage('Crie uma senha com no mínimo 6 caracteres.')
      return
    }

    if (senha !== confirmarSenha) {
      setStatus('error')
      setErrorMessage('A confirmação de senha precisa ser igual à senha.')
      return
    }

    try {
      await signUp(email.trim(), senha, mode === 'new' ? nomeCompleto.trim() : email.trim(), {
        sendVerificationEmail: mode === 'first_access',
        initialProfile:
          mode === 'first_access'
            ? {
                pendingFirstAccess: true,
              }
            : undefined,
      })
      setStatus('success')
    } catch (error) {
      const code = (error as { code?: string }).code
      setStatus('error')
      if (code === 'auth/email-already-in-use') {
        setErrorMessage(
          'Este e-mail já está cadastrado. Busque, recupere o seu acesso, use a opção de recuperar acesso, ou faça um cadastro com outro e-mail.',
        )
        return
      }
      setErrorMessage(
        code === 'auth/email-already-in-use'
          ? 'Este e-mail já tem cadastro. Use o botão Entre para acessar.'
          : 'Não foi possível criar o acesso agora.',
      )
    }
  }

  return (
    <form className="auth-panel access-create-panel" onSubmit={handleSubmit}>
      <UserPlus aria-hidden="true" />
      <h2>{mode === 'new' ? 'Novo acesso' : 'Primeiro acesso'}</h2>
      <div className="access-mode-tabs" role="tablist" aria-label="Tipo de criação de acesso">
        <button
          className={mode === 'new' ? 'active' : undefined}
          onClick={() => {
            setMode('new')
            setStatus('idle')
            setErrorMessage('')
          }}
          type="button"
        >
          Novo cadastro
        </button>
        <button
          className={mode === 'first_access' ? 'active' : undefined}
          onClick={() => {
            setMode('first_access')
            setStatus('idle')
            setErrorMessage('')
          }}
          type="button"
        >
          Já fui cadastrado
        </button>
      </div>

      {!isFirebaseConfigured ? (
        <div className="form-alert error">Firebase ainda não está configurado nesta instalação.</div>
      ) : null}

      {mode === 'first_access' ? (
        <div className="form-alert info">
          Clique aqui se você já foi cadastrado pela administração e ainda não gerou sua senha. O sistema enviará uma
          confirmação para o e-mail informado antes de vincular seu cadastro.
        </div>
      ) : null}

      {mode === 'new' ? (
        <label>
          Nome completo
          <input onChange={(event) => setNomeCompleto(event.target.value)} required value={nomeCompleto} />
        </label>
      ) : null}

      <label>
        E-mail
        <input
          onChange={(event) => setEmail(event.target.value)}
          placeholder="usuario@exemplo.com"
          required
          type="email"
          value={email}
        />
      </label>

      <label>
        Senha
        <input
          onChange={(event) => setSenha(event.target.value)}
          placeholder="Mínimo 6 caracteres"
          required
          type="password"
          value={senha}
        />
      </label>

      <label>
        Confirmar senha
        <input
          onChange={(event) => setConfirmarSenha(event.target.value)}
          placeholder="Digite a senha novamente"
          required
          type="password"
          value={confirmarSenha}
        />
      </label>

      <button className="primary-action" disabled={status === 'sending'} type="submit">
        {status === 'sending' ? 'Criando...' : mode === 'first_access' ? 'Criar senha e confirmar e-mail' : 'Criar acesso'}
        <UserPlus aria-hidden="true" />
      </button>

      <p className="source-note">
        Já tem cadastro? <Link to="/login">Entre com e-mail e senha</Link>.
      </p>

      {status === 'success' ? (
        <div className="form-alert success">
          <CheckCircle2 aria-hidden="true" />
          {mode === 'first_access'
            ? 'Enviamos uma confirmação para seu e-mail. Confirme o e-mail e volte ao sistema para concluir o vínculo.'
            : 'Acesso criado. Agora complete seu cadastro abaixo.'}
        </div>
      ) : null}
      {status === 'error' ? <div className="form-alert error">{errorMessage}</div> : null}
    </form>
  )
}

function FirstAccessVerificationPanel() {
  const { firebaseUser } = useAuth()
  const [status, setStatus] = useState<'idle' | 'checking' | 'sent' | 'linked' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleConfirmEmail() {
    if (!firebaseUser?.email) {
      setStatus('error')
      setMessage('Não foi possível identificar seu e-mail. Entre novamente no sistema.')
      return
    }

    setStatus('checking')
    setMessage('')

    try {
      const verified = await refreshCurrentUserEmailVerification()

      if (!verified) {
        setStatus('error')
        setMessage('Seu e-mail ainda não consta como confirmado. Abra o link enviado para seu e-mail e tente novamente.')
        return
      }

      const result = await claimExistingRegistrationByEmail(firebaseUser.uid, firebaseUser.email)

      if (!result.linked) {
        setStatus('error')
        setMessage('Não encontramos cadastro administrativo com este e-mail. Verifique o e-mail informado ou procure a administração.')
        return
      }

      setStatus('linked')
      setMessage('E-mail confirmado e cadastro vinculado. Seu painel será liberado automaticamente.')
    } catch {
      setStatus('error')
      setMessage('Não foi possível concluir o vínculo agora. Tente novamente em instantes.')
    }
  }

  async function handleResendEmail() {
    setStatus('checking')
    setMessage('')

    try {
      await sendCurrentUserVerificationEmail()
      setStatus('sent')
      setMessage('Enviamos novamente o e-mail de confirmação.')
    } catch {
      setStatus('error')
      setMessage('Não foi possível reenviar o e-mail de confirmação agora.')
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-panel status-panel first-access-confirmation">
        <Mail aria-hidden="true" />
        <h1>Confirme seu primeiro acesso</h1>
        <p>
          Enviamos uma confirmação para <strong>{firebaseUser?.email}</strong>. Depois de confirmar o e-mail, clique no
          botão abaixo para vincular seu acesso ao cadastro feito pela administração.
        </p>
        <div className="editor-actions">
          <button className="primary-action" disabled={status === 'checking'} onClick={handleConfirmEmail} type="button">
            {status === 'checking' ? 'Verificando...' : 'Já confirmei meu e-mail'}
          </button>
          <button className="secondary-admin-action" disabled={status === 'checking'} onClick={handleResendEmail} type="button">
            Reenviar confirmação
          </button>
          <button className="secondary-admin-action" onClick={() => signOutUser()} type="button">
            Sair
          </button>
        </div>
        {message ? (
          <div className={`form-alert ${status === 'linked' || status === 'sent' ? 'success' : 'error'}`}>
            {message}
          </div>
        ) : null}
      </div>
    </section>
  )
}

function CongregationsPage({ settings }: { settings?: NavigationItem }) {
  const [congregationList, setCongregationList] = useState<Congregation[]>(fallbackCongregations)

  useEffect(() => subscribeCongregations(setCongregationList), [])

  const activeCongregations = congregationList.filter((congregation) => congregation.ativa !== false)

  return (
    <section className="content-section">
      <div className="section-heading">
        <h1 style={pageTitleStyleFor(settings)}>{settings?.pageTitle || 'Congregações'}</h1>
        {renderPageContent(settings?.pageContent)}
      </div>
      <div className="card-grid">
        {activeCongregations.map((congregation) => (
          <article className="info-card" key={congregation.id}>
            <MapPin aria-hidden="true" />
            <h2>{congregation.nome}</h2>
            <span>{congregationCategoryLabels[congregation.categoria ?? 'capital']}</span>
            <p>{congregation.endereco}</p>
            <span>{congregation.pastorResponsavel}</span>
            <span>{congregation.telefone}</span>
            <CongregationMiniMap congregation={congregation} />
          </article>
        ))}
      </div>
    </section>
  )
}

function AgendaPage({ settings }: { settings?: NavigationItem }) {
  return (
    <section className="content-section">
      <div className="section-heading">
        <p className="eyebrow">Calendário público</p>
        <h1 style={pageTitleStyleFor(settings)}>{settings?.pageTitle || 'Agenda de cultos e atividades'}</h1>
        {renderPageContent(settings?.pageContent)}
      </div>
      <div className="timeline-list">
        {publicEvents.map((event) => (
          <article key={event.id} className="timeline-item">
            <div>
              <strong>{event.data}</strong>
              <span>{event.horario}</span>
            </div>
            <div>
              <h2>{event.titulo}</h2>
              <p>{event.local}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function PublicDoctrinePage({ settings }: { settings?: NavigationItem }) {
  return (
    <section className="content-section">
      <div className="section-heading">
        <p className="eyebrow">Institucional</p>
        <h1 style={pageTitleStyleFor(settings)}>{settings?.pageTitle || 'Doutrina'}</h1>
        {renderPageContent(
          settings?.pageContent ||
            'Princípios de fé e prática para visitantes, novos membros e pessoas interessadas em conhecer a igreja.',
        )}
      </div>

      <div className="institutional-band">
        <article>
          <span>Nome registrado</span>
          <strong>{institutionalInfo.legalName}</strong>
        </article>
        <article>
          <span>CNPJ</span>
          <strong>{institutionalInfo.cnpj}</strong>
        </article>
        <article>
          <span>Fundação informada no estatuto</span>
          <strong>{institutionalInfo.foundedAt}</strong>
        </article>
        <article>
          <span>Sede</span>
          <strong>{institutionalInfo.headquarters}</strong>
        </article>
      </div>

      <div className="rules-grid">
        {publicChurchPrinciples.map((principle) => (
          <article className="rule-card" key={principle.title}>
            <ScrollText aria-hidden="true" />
            <h2>{principle.title}</h2>
            <p>{principle.text}</p>
          </article>
        ))}
      </div>

      <ContributionSection compact />
    </section>
  )
}

function PublicLeadershipPage({ settings }: { settings?: NavigationItem }) {
  return (
    <section className="content-section">
      <div className="section-heading">
        <p className="eyebrow">Diretoria</p>
        <h1 style={pageTitleStyleFor(settings)}>{settings?.pageTitle || 'Relação pública da liderança'}</h1>
        {renderPageContent(settings?.pageContent)}
      </div>
      <div className="card-grid">
        {leadership.map((leader) => (
          <article className="person-card" key={leader.cargo}>
            <UsersRound aria-hidden="true" />
            <h2>{leader.cargo}</h2>
            <p>{leader.nome}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function CustomPublicPage({ navigationItems }: { navigationItems: NavigationItem[] }) {
  const { customSlug } = useParams()
  const path = normalizeNavigationPath(customSlug ?? '')
  const item = navigationItems.find((navigationItem) => navigationItem.visible && navigationItem.path === path)
  const Icon = item ? navigationIconComponents[item.icon] : null

  if (!item || defaultNavigationItems.some((defaultItem) => defaultItem.path === item.path)) {
    return <Navigate replace to="/" />
  }

  return (
    <section className="content-section custom-public-page">
      <div className="section-heading">
        <p className="eyebrow">IEADTRR</p>
        <h1 style={pageTitleStyleFor(item)}>{item.pageTitle || item.label}</h1>
        {renderPageContent(item.pageContent)}
      </div>
      <article className="info-card custom-page-card">
        {Icon ? <Icon aria-hidden="true" /> : <FileText aria-hidden="true" />}
        <h2>{item.label}</h2>
        <p>Conteúdo publicado pela administração da igreja.</p>
      </article>
    </section>
  )
}

function LoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [rememberLogin, setRememberLogin] = useState(false)
  const [status, setStatus] = useState<'idle' | 'sending' | 'reset-sent' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const navigate = useNavigate()

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('sending')
    setErrorMessage('')

    try {
      await signIn(email.trim(), senha, rememberLogin)
      sessionStorage.setItem(JUST_LOGGED_IN_KEY, '1')
      navigate('/', { replace: true })
    } catch {
      setStatus('error')
      setErrorMessage('Não foi possível entrar. Verifique e-mail e senha.')
    }
  }

  async function handlePasswordReset() {
    setStatus('sending')
    setErrorMessage('')

    if (!email.trim()) {
      setStatus('error')
      setErrorMessage('Informe seu e-mail para receber o link de recuperação.')
      return
    }

    try {
      await sendPasswordReset(email.trim())
      setStatus('reset-sent')
    } catch {
      setStatus('error')
      setErrorMessage('Não foi possível enviar o link de recuperação agora.')
    }
  }

  return (
    <section className="auth-page">
      <form className="auth-panel" onSubmit={handleSubmit}>
        <LockKeyhole aria-hidden="true" />
        <h1>Entrar</h1>

        {!isFirebaseConfigured ? (
          <div className="form-alert error">Firebase ainda não está configurado nesta instalação.</div>
        ) : null}

        <label>
          E-mail
          <input
            onChange={(event) => setEmail(event.target.value)}
            placeholder="usuario@exemplo.com"
            required
            type="email"
            value={email}
          />
        </label>
        <label>
          Senha
          <input
            onChange={(event) => setSenha(event.target.value)}
            placeholder="••••••••"
            required
            type="password"
            value={senha}
          />
        </label>

        <label className="checkbox-line login-remember-option">
          <input
            checked={rememberLogin}
            onChange={(event) => setRememberLogin(event.target.checked)}
            type="checkbox"
          />
          Salvar acesso para os próximos logins
        </label>

        <button className="primary-action" disabled={status === 'sending'} type="submit">
          {status === 'sending' ? 'Entrando...' : 'Entrar'}
          <LockKeyhole aria-hidden="true" />
        </button>

        <button className="link-button" onClick={handlePasswordReset} type="button">
          Esqueci, perdi ou não sei minha senha
        </button>

        <p className="source-note">
          Ainda não tem cadastro? <Link to="/cadastro">Cadastre-se</Link>.
        </p>

        {status === 'reset-sent' ? (
          <div className="form-alert success">Enviamos um link de recuperação para o e-mail informado.</div>
        ) : null}

        {status === 'error' ? <div className="form-alert error">{errorMessage}</div> : null}
      </form>
    </section>
  )
}

function MemberDashboard() {
  return (
    <DashboardShell
      title="Painel do membro"
      subtitle="Avisos, agenda, campanhas e dados cadastrais"
      cards={[
        ['Avisos', '2 comunicados ativos', <Megaphone key="avisos" />],
        ['Agenda', 'Próximos cultos e campanhas', <CalendarDays key="agenda" />],
        ['Cadastro', 'Dados pessoais e documentos', <FileText key="cadastro" />],
        ['Fundadores', 'Relação nominal histórica', <UsersRound key="fundadores" />],
      ]}
    />
  )
}

void MemberDashboard

const editableAddressFallback = {
  pais: 'Brasil',
  tipoLogradouro: '',
  cep: '',
  rua: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: 'Boa Vista',
  estado: 'RR',
}

type EditableRegistrationRecord = Partial<MemberRegistration> & {
  id?: string
  uid?: string
  userId?: string
  role?: SystemRole
  status?: string
}

function editableRecordToForm(record: EditableRegistrationRecord): MemberRegistration {
  return {
    nomeCompleto: record.nomeCompleto ?? '',
    email: record.email ?? '',
    emailLower: record.emailLower,
    telefone: record.telefone ?? '',
    possuiWhatsapp: Boolean(record.possuiWhatsapp),
    convidadoPor: record.convidadoPor ?? '',
    cpf: record.cpf ?? '',
    cpfDigits: record.cpfDigits,
    rg: record.rg ?? '',
    rgUf: record.rgUf ?? 'RR',
    dataNascimento: record.dataNascimento ?? '',
    sexo: record.sexo ?? '',
    tipoPessoa: record.tipoPessoa ?? (record.role === 'congregado' ? 'congregado' : 'membro'),
    possuiCargo: Boolean(record.possuiCargo),
    cargo: record.cargo,
    outroCargo: record.outroCargo ?? '',
    congregacao: record.congregacao ?? '',
    endereco: { ...editableAddressFallback, ...record.endereco },
    dataBatismo: record.dataBatismo ?? '',
    dataAceitacao: record.dataAceitacao ?? '',
    fotoModo: record.fotoModo ?? 'unica',
    selfieArquivo: record.selfieArquivo ?? '',
    fotoArquivo: record.fotoArquivo ?? '',
    fotoVersoArquivo: record.fotoVersoArquivo ?? '',
    cartaMudancaPaginas: record.cartaMudancaPaginas ?? 'unica',
    cartaMudancaArquivo: record.cartaMudancaArquivo ?? '',
    cartaRecomendacaoPaginas: record.cartaRecomendacaoPaginas ?? 'unica',
    cartaRecomendacaoArquivo: record.cartaRecomendacaoArquivo ?? '',
    observacoes: record.observacoes ?? '',
    consentimentoLgpd: true,
  }
}

function editablePayloadFromForm(form: MemberRegistration) {
  const email = form.email.trim().toLowerCase()

  return {
    nomeCompleto: form.nomeCompleto.trim(),
    telefone: form.telefone.trim(),
    possuiWhatsapp: form.possuiWhatsapp,
    cpf: form.cpf.trim(),
    cpfDigits: form.cpf.replace(/\D/g, ''),
    rg: form.rg.trim(),
    rgUf: form.rgUf,
    dataNascimento: form.dataNascimento,
    sexo: form.sexo || undefined,
    tipoPessoa: form.tipoPessoa,
    congregacao: form.congregacao,
    endereco: form.endereco,
    dataBatismo: form.tipoPessoa === 'membro' ? form.dataBatismo : '',
    dataAceitacao: form.dataAceitacao,
    fotoModo: form.fotoModo,
    selfieArquivo: form.selfieArquivo?.trim() || '',
    fotoArquivo: form.fotoArquivo?.trim() || '',
    fotoVersoArquivo: form.fotoModo === 'frente_verso' ? form.fotoVersoArquivo?.trim() || '' : '',
    cartaMudancaPaginas: form.cartaMudancaPaginas,
    cartaMudancaArquivo: form.cartaMudancaArquivo?.trim() || '',
    cartaRecomendacaoPaginas: form.cartaRecomendacaoPaginas,
    cartaRecomendacaoArquivo: form.cartaRecomendacaoArquivo?.trim() || '',
    observacoes: form.observacoes?.trim() || '',
    email,
    emailLower: email,
  }
}

type MemberEditorRequiredField =
  | 'nomeCompleto'
  | 'email'
  | 'cpf'
  | 'telefone'
  | 'dataNascimento'
  | 'sexo'
  | 'congregacao'
  | 'endereco.tipoLogradouro'
  | 'endereco.pais'
  | 'endereco.rua'
  | 'endereco.numero'
  | 'endereco.bairro'
  | 'endereco.cidade'
  | 'endereco.estado'
  | 'dataAceitacao'
  | 'dataBatismo'
  | 'selfieArquivo'

const memberEditorRequiredFieldLabels: Record<MemberEditorRequiredField, string> = {
  nomeCompleto: 'nome completo',
  email: 'e-mail de acesso',
  cpf: 'CPF',
  telefone: 'telefone',
  dataNascimento: 'data de nascimento',
  sexo: 'sexo',
  congregacao: 'congregação',
  'endereco.tipoLogradouro': 'tipo de logradouro',
  'endereco.pais': 'país',
  'endereco.rua': 'nome do logradouro',
  'endereco.numero': 'número do endereço',
  'endereco.bairro': 'bairro',
  'endereco.cidade': 'município',
  'endereco.estado': 'estado',
  dataAceitacao: 'data de aceitação',
  dataBatismo: 'data de batismo',
  selfieArquivo: 'foto/selfie',
}

function cpfDigits(value: string): string {
  return value.replace(/\D/g, '')
}

function emailLooksValid(value: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim())
}

function displayablePhotoSrc(value?: string): string {
  if (!value) {
    return ''
  }

  return /^(https?:\/\/|blob:|data:image\/|\/images\/)/.test(value) ? value : ''
}

function congregationDisplayName(value: string | undefined, congregationList: Congregation[]): string {
  if (!value) {
    return ''
  }

  return congregationList.find((congregation) => congregation.id === value)?.nome ?? value
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

function maskCep(value: string): string {
  const digits = onlyDigits(value).slice(0, 8)
  return digits.replace(/(\d{5})(\d)/, '$1-$2')
}

function maskCpf(value: string): string {
  const digits = onlyDigits(value).slice(0, 11)
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function splitStreetType(logradouro?: string): { tipoLogradouro: string; rua: string } {
  const street = logradouro?.trim() ?? ''

  if (!street) {
    return { tipoLogradouro: '', rua: '' }
  }

  const matchedType = logradouroOptions.find((option) => {
    const prefix = `${option} `
    return street.toLocaleLowerCase('pt-BR').startsWith(prefix.toLocaleLowerCase('pt-BR'))
  })

  if (!matchedType) {
    return { tipoLogradouro: '', rua: street }
  }

  return {
    tipoLogradouro: matchedType,
    rua: street.slice(matchedType.length).trim(),
  }
}

function fileNames(files: FileList | null): string {
  if (!files || files.length === 0) {
    return ''
  }

  return Array.from(files)
    .map((file) => file.name)
    .join(', ')
}

function EditableDocumentUpload({
  title,
  paginas,
  arquivo,
  onPaginasChange,
  onFilesChange,
}: {
  title: string
  paginas: 'unica' | 'multiplas'
  arquivo?: string
  onPaginasChange: (value: 'unica' | 'multiplas') => void
  onFilesChange: (value: string) => void
}) {
  const multiplas = paginas === 'multiplas'

  return (
    <div className="doc-block">
      <p className="doc-title">{title}</p>
      <label className="checkbox-line">
        <input
          checked={multiplas}
          onChange={(event) => onPaginasChange(event.target.checked ? 'multiplas' : 'unica')}
          type="checkbox"
        />
        Tem mais de uma página
      </label>
      <p className="field-hint">
        {multiplas ? 'Envie um PDF único com todas as páginas ou selecione vários arquivos.' : 'Envie a página única em imagem ou PDF.'}
      </p>
      <label className="file-input">
        <FileUp aria-hidden="true" />
        {multiplas ? 'Arquivos' : 'Arquivo'}
        <input
          accept=".pdf,image/*"
          multiple={multiplas}
          onChange={(event) => onFilesChange(fileNames(event.target.files))}
          type="file"
        />
        <span>{arquivo || 'Nenhum arquivo selecionado'}</span>
      </label>
    </div>
  )
}

function memberEditorMissingRequiredFields(form: MemberRegistration): Set<MemberEditorRequiredField> {
  const missing = new Set<MemberEditorRequiredField>()
  const requiresFullRegistration = form.tipoPessoa === 'membro' || form.tipoPessoa === 'congregado'

  if (form.nomeCompleto.trim().split(/\s+/).filter(Boolean).length < 2) missing.add('nomeCompleto')
  if (!emailLooksValid(form.email)) missing.add('email')
  if (cpfDigits(form.cpf).length !== 11) missing.add('cpf')
  if (cpfDigits(form.telefone).length < 10) missing.add('telefone')
  if (!form.dataNascimento) missing.add('dataNascimento')
  if (!form.sexo) missing.add('sexo')
  if (!form.congregacao) missing.add('congregacao')

  if (requiresFullRegistration) {
    if (!form.selfieArquivo?.trim()) missing.add('selfieArquivo')
    if (!form.endereco.tipoLogradouro) missing.add('endereco.tipoLogradouro')
    if (!form.endereco.pais.trim()) missing.add('endereco.pais')
    if (form.endereco.rua.trim().length < 3) missing.add('endereco.rua')
    if (!form.endereco.numero.trim()) missing.add('endereco.numero')
    if (form.endereco.bairro.trim().length < 2) missing.add('endereco.bairro')
    if (form.endereco.cidade.trim().length < 2) missing.add('endereco.cidade')
    if (form.endereco.estado.trim().length < 2) missing.add('endereco.estado')
  }

  if (form.tipoPessoa === 'congregado' && !form.dataAceitacao) {
    missing.add('dataAceitacao')
  }

  if (form.tipoPessoa === 'membro' && !form.dataBatismo) {
    missing.add('dataBatismo')
  }

  return missing
}

function AccessEmailChangeTool({ currentEmail }: { currentEmail: string }) {
  const [newEmail, setNewEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function submitEmailChange() {
    const normalizedEmail = newEmail.trim().toLowerCase()

    if (!normalizedEmail || normalizedEmail === currentEmail.trim().toLowerCase()) {
      setStatus('error')
      setMessage('Informe um e-mail novo, diferente do atual.')
      return
    }

    setStatus('sending')
    setMessage('')

    try {
      await requestAccessEmailChange(normalizedEmail)
      setStatus('sent')
      setMessage('Enviamos um link de confirmação para o novo e-mail. A troca só acontece depois da confirmação.')
      setNewEmail('')
    } catch (error) {
      const code = (error as { code?: string }).code
      setStatus('error')
      setMessage(
        code === 'auth/requires-recent-login'
          ? 'Por segurança, saia e entre novamente antes de solicitar a troca de e-mail.'
          : code === 'auth/email-already-in-use'
            ? 'Este e-mail já está cadastrado em outro acesso. Use outro e-mail ou recupere o acesso existente.'
            : 'Não foi possível iniciar a troca de e-mail agora.',
      )
    }
  }

  return (
    <div className="email-change-tool">
      <div>
        <strong>Trocar e-mail de acesso</strong>
        <p>O e-mail do login não é alterado no cadastro. Para segurança, o novo endereço precisa ser confirmado.</p>
      </div>
      <div className="email-change-row">
        <input
          onChange={(event) => {
            setNewEmail(event.target.value)
            setStatus('idle')
          }}
          placeholder="novoemail@exemplo.com"
          type="email"
          value={newEmail}
        />
        <button
          className="secondary-admin-action"
          disabled={status === 'sending'}
          type="button"
          onClick={submitEmailChange}
        >
          <Mail aria-hidden="true" />
          {status === 'sending' ? 'Enviando...' : 'Enviar confirmação'}
        </button>
      </div>
      {message ? <div className={`form-alert ${status === 'sent' ? 'success' : 'error'}`}>{message}</div> : null}
    </div>
  )
}

function MemberCadastroEditor({
  record,
  mode,
  onSave,
  onCancel,
  highlightMissingRequired = false,
  extraRequiredFields = [],
}: {
  record: EditableRegistrationRecord
  mode: 'admin' | 'self'
  onSave: (data: ReturnType<typeof editablePayloadFromForm>) => Promise<void>
  onCancel?: () => void
  highlightMissingRequired?: boolean
  extraRequiredFields?: MemberEditorRequiredField[]
}) {
  const [form, setForm] = useState<MemberRegistration>(() => editableRecordToForm(record))
  const [congregationList, setCongregationList] = useState<Congregation[]>(fallbackCongregations)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [submitMessage, setSubmitMessage] = useState('')
  const [showRequiredErrors, setShowRequiredErrors] = useState(false)
  const [cepStatus, setCepStatus] = useState<'idle' | 'loading' | 'error'>('idle')

  useEffect(() => {
    setForm(editableRecordToForm(record))
    setSubmitMessage('')
    setShowRequiredErrors(false)
    setCepStatus('idle')
  }, [record])
  useEffect(() => subscribeCongregations(setCongregationList), [])

  const missingRequiredFields = memberEditorMissingRequiredFields(form)
  if (extraRequiredFields.includes('dataBatismo') && !form.dataBatismo) {
    missingRequiredFields.add('dataBatismo')
  }

  function updateField<K extends keyof MemberRegistration>(field: K, value: MemberRegistration[K]) {
    setForm((current) => ({ ...current, [field]: value }))
    setStatus('idle')
    setSubmitMessage('')
  }

  function updateAddress(field: keyof MemberRegistration['endereco'], value: string) {
    setForm((current) => ({
      ...current,
      endereco: { ...current.endereco, [field]: value },
    }))
    setStatus('idle')
    setSubmitMessage('')
  }

  async function handleCepLookup(rawCep: string) {
    const cep = onlyDigits(rawCep)

    if (cep.length !== 8) {
      return
    }

    setCepStatus('loading')

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const data = (await response.json()) as {
        erro?: boolean
        logradouro?: string
        bairro?: string
        localidade?: string
        uf?: string
      }

      if (data.erro) {
        setCepStatus('error')
        return
      }

      const streetParts = splitStreetType(data.logradouro)

      setForm((current) => ({
        ...current,
        endereco: {
          ...current.endereco,
          pais: 'Brasil',
          tipoLogradouro: streetParts.tipoLogradouro || current.endereco.tipoLogradouro,
          rua: streetParts.rua || current.endereco.rua,
          bairro: data.bairro || current.endereco.bairro,
          cidade: data.localidade || current.endereco.cidade,
          estado: data.uf || current.endereco.estado,
        },
      }))
      setCepStatus('idle')
    } catch {
      setCepStatus('error')
    }
  }

  function fieldError(field: MemberEditorRequiredField) {
    return (highlightMissingRequired || showRequiredErrors) && missingRequiredFields.has(field) ? 'field-control-error' : undefined
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (missingRequiredFields.size > 0) {
      setStatus('error')
      setShowRequiredErrors(true)
      setSubmitMessage('Preencha os campos obrigatórios destacados para salvar o cadastro.')
      return
    }

    setStatus('saving')
    setSubmitMessage('')
    setShowRequiredErrors(false)

    try {
      await onSave(editablePayloadFromForm(form))
      setStatus('saved')
    } catch {
      setStatus('error')
    }
  }

  const activeCongregations = congregationList.filter((congregation) => congregation.ativa !== false)

  return (
    <form className="registration-form member-edit-form" onSubmit={handleSubmit}>
      <div className="form-band">
        <div>
          <p className="eyebrow">{mode === 'admin' ? 'Alteração administrativa' : 'Meu cadastro'}</p>
          <h2>{mode === 'admin' ? 'Alterar cadastro completo' : 'Conferir e alterar meus dados'}</h2>
        </div>
        <FileText aria-hidden="true" />
      </div>

      <fieldset>
        <legend>Identificação</legend>
        <div className="form-grid">
          <label className="wide-field">
            Nome completo
            <RequiredHint />
            <input
              className={fieldError('nomeCompleto')}
              value={form.nomeCompleto}
              onChange={(event) => updateField('nomeCompleto', event.target.value)}
              placeholder="Nome e sobrenome"
            />
            <small className="field-hint">Informe o nome civil completo da pessoa.</small>
          </label>
          <label>
            E-mail de acesso
            <RequiredHint />
            <input className={fieldError('email')} readOnly type="email" value={form.email} />
            <small className="field-hint">Este e-mail não pode ser alterado aqui.</small>
          </label>
          <label>
            Tipo
            <select
              disabled={mode === 'self'}
              value={form.tipoPessoa}
              onChange={(event) => updateField('tipoPessoa', event.target.value as MemberRegistration['tipoPessoa'])}
            >
              <option value="visitante">Visitante</option>
              <option value="convidado">Convidado</option>
              <option value="membro">Membro</option>
              <option value="congregado">Congregado</option>
            </select>
          </label>
          <label>
            CPF
            <RequiredHint />
            <input
              className={fieldError('cpf')}
              value={form.cpf}
              onChange={(event) => updateField('cpf', maskCpf(event.target.value))}
              inputMode="numeric"
              placeholder="000.000.000-00"
            />
            <small className="field-hint">Documento principal do cadastro.</small>
          </label>
          <label>
            RG
            <span className="optional-tag">(opcional)</span>
            <input value={form.rg} onChange={(event) => updateField('rg', onlyDigits(event.target.value))} inputMode="numeric" />
          </label>
          <label>
            UF do RG
            <span className="optional-tag">(opcional)</span>
            <select value={form.rgUf} onChange={(event) => updateField('rgUf', event.target.value)}>
              <option value="">Selecione</option>
              {brazilStates.map((state) => (
                <option key={state.uf} value={state.uf}>
                  {state.uf}
                </option>
              ))}
            </select>
          </label>
          <label>
            Data de nascimento
            <RequiredHint />
            <input
              className={fieldError('dataNascimento')}
              type="date"
              value={form.dataNascimento}
              onChange={(event) => updateField('dataNascimento', event.target.value)}
            />
            <small className="field-hint">Usada para validar idade e etapas do cadastro.</small>
          </label>
          <label>
            Sexo
            <RequiredHint />
            <select
              className={fieldError('sexo')}
              value={form.sexo}
              onChange={(event) => updateField('sexo', event.target.value as MemberRegistration['sexo'])}
            >
              <option value="">Selecione</option>
              <option value="masculino">Masculino</option>
              <option value="feminino">Feminino</option>
            </select>
          </label>
          <label>
            Congregação
            <RequiredHint />
            <select
              className={fieldError('congregacao')}
              value={form.congregacao}
              onChange={(event) => updateField('congregacao', event.target.value)}
            >
              <option value="">Selecione</option>
              {activeCongregations.map((congregation) => (
                <option key={congregation.id} value={congregation.id}>
                  {congregation.nome}
                </option>
              ))}
            </select>
            <small className="field-hint">Congregação que a pessoa frequenta ou está vinculada.</small>
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Contato e endereço</legend>
        <div className="form-grid">
          <label>
            Telefone
            <RequiredHint />
            <input
              className={fieldError('telefone')}
              value={form.telefone}
              onChange={(event) => updateField('telefone', event.target.value)}
              placeholder="(00) 00000-0000"
            />
            <small className="field-hint">Informe um telefone com DDD.</small>
          </label>
          <label className="checkbox-line whatsapp-option">
            <input
              checked={form.possuiWhatsapp}
              onChange={(event) => updateField('possuiWhatsapp', event.target.checked)}
              type="checkbox"
            />
            <MessageCircle aria-hidden="true" />
            Este número tem WhatsApp
          </label>
          <label>
            CEP
            <span className="optional-tag">(opcional)</span>
            <input
              value={form.endereco.cep}
              onBlur={(event) => handleCepLookup(event.target.value)}
              onChange={(event) => updateAddress('cep', maskCep(event.target.value))}
              inputMode="numeric"
              placeholder="00000-000"
            />
            <small className="field-hint">
              {cepStatus === 'loading'
                ? 'Buscando endereço...'
                : cepStatus === 'error'
                  ? 'CEP não encontrado. Preencha manualmente.'
                  : 'Preenche tipo de logradouro, rua, bairro, município e estado automaticamente.'}
            </small>
          </label>
          <label>
            País
            <RequiredHint />
            <input
              className={fieldError('endereco.pais')}
              value={form.endereco.pais}
              onChange={(event) => updateAddress('pais', event.target.value)}
            />
          </label>
          <label>
            Estado
            <RequiredHint />
            <select
              className={fieldError('endereco.estado')}
              value={form.endereco.estado}
              onChange={(event) => updateAddress('estado', event.target.value)}
            >
              <option value="">Selecione</option>
              {brazilStates.map((state) => (
                <option key={state.uf} value={state.uf}>
                  {state.uf} - {state.nome}
                </option>
              ))}
            </select>
          </label>
          <label>
            Município
            <RequiredHint />
            <OptionsCombobox
              className={fieldError('endereco.cidade')}
              value={form.endereco.cidade}
              onChange={(value) => updateAddress('cidade', value)}
              options={roraimaMunicipalities}
              placeholder="Digite para buscar o município"
              emptyText="Nenhum município encontrado"
            />
          </label>
          <label>
            Bairro
            <RequiredHint />
            <NeighborhoodCombobox
              className={fieldError('endereco.bairro')}
              value={form.endereco.bairro}
              onChange={(value) => updateAddress('bairro', value)}
            />
          </label>
          <label>
            Tipo de logradouro
            <RequiredHint />
            <select
              className={fieldError('endereco.tipoLogradouro')}
              value={form.endereco.tipoLogradouro}
              onChange={(event) => updateAddress('tipoLogradouro', event.target.value)}
            >
              <option value="">Selecione</option>
              {logradouroOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="wide-field">
            Nome do logradouro
            <RequiredHint />
            <input
              className={fieldError('endereco.rua')}
              value={form.endereco.rua}
              onChange={(event) => updateAddress('rua', event.target.value)}
              placeholder="Ex.: Avenida dos Imigrantes"
            />
          </label>
          <label>
            Número
            <RequiredHint />
            <input
              className={fieldError('endereco.numero')}
              value={form.endereco.numero}
              onChange={(event) => updateAddress('numero', event.target.value)}
            />
          </label>
          <label>
            Complemento
            <span className="optional-tag">(opcional)</span>
            <input value={form.endereco.complemento} onChange={(event) => updateAddress('complemento', event.target.value)} />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Vida cristã e documentos</legend>
        <div className="form-grid">
          {form.tipoPessoa === 'membro' ? (
            <label>
              Data de batismo
              <RequiredHint />
              <input
                className={fieldError('dataBatismo')}
                type="date"
                value={form.dataBatismo}
                onChange={(event) => updateField('dataBatismo', event.target.value)}
              />
              <small className="field-hint">
                Obrigatória para cadastro e aprovação de membro.
              </small>
            </label>
          ) : null}
          <label>
            Data de aceitação
            {form.tipoPessoa === 'congregado' ? <RequiredHint /> : <span className="optional-tag">(opcional)</span>}
            <input
              className={fieldError('dataAceitacao')}
              type="date"
              value={form.dataAceitacao}
              onChange={(event) => updateField('dataAceitacao', event.target.value)}
            />
          </label>
          <div className="doc-block wide-field">
            <p className="doc-title">Foto do membro (selfie)</p>
            <RequiredHint />
            <p className="field-hint">Imagem que ficará vinculada à ficha cadastral e à relação de membros.</p>
            <label className={`file-input ${fieldError('selfieArquivo') ?? ''}`}>
              <FileUp aria-hidden="true" />
              Enviar selfie
              <input accept="image/*" onChange={(event) => updateField('selfieArquivo', fileNames(event.target.files))} type="file" />
              <span>{form.selfieArquivo || 'Nenhum arquivo selecionado'}</span>
            </label>
          </div>

          <div className="doc-block wide-field">
            <p className="doc-title">Foto do documento</p>
            <div className="doc-mode">
              <label className={form.fotoModo === 'unica' ? 'active' : undefined}>
                <input
                  checked={form.fotoModo === 'unica'}
                  name="memberEditFotoModo"
                  onChange={() => updateField('fotoModo', 'unica')}
                  type="radio"
                />
                Foto única
              </label>
              <label className={form.fotoModo === 'frente_verso' ? 'active' : undefined}>
                <input
                  checked={form.fotoModo === 'frente_verso'}
                  name="memberEditFotoModo"
                  onChange={() => updateField('fotoModo', 'frente_verso')}
                  type="radio"
                />
                Frente e verso
              </label>
            </div>
            <div className="file-grid">
              <label className="file-input">
                <FileUp aria-hidden="true" />
                {form.fotoModo === 'frente_verso' ? 'Frente' : 'Foto'}
                <input accept="image/*" onChange={(event) => updateField('fotoArquivo', fileNames(event.target.files))} type="file" />
                <span>{form.fotoArquivo || 'Nenhum arquivo selecionado'}</span>
              </label>
              {form.fotoModo === 'frente_verso' ? (
                <label className="file-input">
                  <FileUp aria-hidden="true" />
                  Verso
                  <input accept="image/*" onChange={(event) => updateField('fotoVersoArquivo', fileNames(event.target.files))} type="file" />
                  <span>{form.fotoVersoArquivo || 'Nenhum arquivo selecionado'}</span>
                </label>
              ) : null}
            </div>
          </div>

          <div className="wide-field">
            <EditableDocumentUpload
              title="Carta de mudança"
              paginas={form.cartaMudancaPaginas}
              arquivo={form.cartaMudancaArquivo}
              onPaginasChange={(value) => updateField('cartaMudancaPaginas', value)}
              onFilesChange={(value) => updateField('cartaMudancaArquivo', value)}
            />
          </div>

          <div className="wide-field">
            <EditableDocumentUpload
              title="Carta de recomendação"
              paginas={form.cartaRecomendacaoPaginas}
              arquivo={form.cartaRecomendacaoArquivo}
              onPaginasChange={(value) => updateField('cartaRecomendacaoPaginas', value)}
              onFilesChange={(value) => updateField('cartaRecomendacaoArquivo', value)}
            />
          </div>
          <label className="wide-field">
            Observações
            <span className="optional-tag">(opcional)</span>
            <textarea value={form.observacoes} onChange={(event) => updateField('observacoes', event.target.value)} rows={4} />
          </label>
        </div>
      </fieldset>

      {mode === 'self' ? <AccessEmailChangeTool currentEmail={form.email} /> : null}

      <div className="member-edit-actions">
        {onCancel ? (
          <button className="secondary-admin-action" type="button" onClick={onCancel}>
            <X aria-hidden="true" />
            Fechar
          </button>
        ) : null}
        <button className="primary-action" disabled={status === 'saving'} type="submit">
          <Check aria-hidden="true" />
          {status === 'saving' ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>

      {status === 'saved' ? (
        <div className="form-alert success">Cadastro de {form.nomeCompleto || 'usuário'} atualizado.</div>
      ) : null}
      {status === 'error' ? (
        <div className="form-alert error">{submitMessage || 'Não foi possível salvar as alterações.'}</div>
      ) : null}
    </form>
  )
}

function EnhancedMemberDashboard() {
  const { firebaseUser, profile } = useAuth()
  const [memberSignature, setMemberSignature] = useState('')

  useEffect(() => {
    if (!firebaseUser?.email || !profile?.email || firebaseUser.email === profile.email) {
      return
    }

    void syncUserAccessEmail(firebaseUser.uid, firebaseUser.email)
  }, [firebaseUser, profile?.email])

  if (!profile || !firebaseUser) {
    return null
  }

  return (
    <section className="content-section dashboard-page">
      <DashboardHeader title="Painel do membro" subtitle="Avisos, agenda, campanhas e dados cadastrais" />
      <div className="card-grid">
        {[
          ['Avisos', '2 comunicados ativos', <Megaphone key="avisos" />],
          ['Agenda', 'Próximos cultos e campanhas', <CalendarDays key="agenda" />],
          ['Cadastro', 'Dados pessoais e documentos', <FileText key="cadastro" />],
          ['Cartão de membro', 'Gerar identificação do membro', <ShieldCheck key="cartao" />],
          ['Fundadores', 'Relação nominal histórica', <UsersRound key="fundadores" />],
        ].map(([cardTitle, cardText, icon]) => (
          <article className="info-card" key={String(cardTitle)}>
            {icon}
            <h2>{cardTitle}</h2>
            <p>{cardText}</p>
          </article>
        ))}
      </div>

      <MemberCadastroEditor
        mode="self"
        record={profile}
        onSave={(data) => updateUserRegistrationProfile(firebaseUser.uid, data)}
      />

      <MemberCardGenerator
        member={profile}
        signature={memberSignature}
        onSignatureChange={setMemberSignature}
      />
    </section>
  )
}

function MemberCardGenerator({
  member,
  signature,
  onSignatureChange,
}: {
  member: UserProfile
  signature: string
  onSignatureChange: (value: string) => void
}) {
  const [congregationList, setCongregationList] = useState<Congregation[]>(fallbackCongregations)
  const initials = member.nomeCompleto
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
  const congregationName = congregationDisplayName(member.congregacao, congregationList) || 'Congregação não informada'

  useEffect(() => subscribeCongregations(setCongregationList), [])

  return (
    <section className="member-card-generator">
      <div className="section-heading">
        <p className="eyebrow">Cartão de membro</p>
        <h2>Gerar cartão de identificação</h2>
        <p>Prévia do cartão com os dados do cadastro. A versão com QR Code, impressão e foto real entra quando o armazenamento de imagens estiver ativo.</p>
      </div>

      <label className="wide-field member-signature-input">
        Assinatura eletrônica do membro
        <input
          onChange={(event) => onSignatureChange(event.target.value)}
          placeholder="Digite seu nome como assinatura"
          value={signature}
        />
      </label>

      <article className="member-card-preview">
        <div className="member-card-brand">
          <img src="/images/ieadtrr-logo.jpeg" alt="" />
          <div>
            <strong>IEADTRR</strong>
            <span>Cartão de membro</span>
          </div>
        </div>

        <div className="member-card-body">
          <div className={member.selfieArquivo ? 'member-card-photo has-photo' : 'member-card-photo'}>
            {member.selfieArquivo ? 'Selfie' : initials || 'M'}
          </div>
          <div>
            <h3>{member.nomeCompleto}</h3>
            <p>{congregationName}</p>
            <span>CPF: {member.cpf || 'Não informado'}</span>
            <span>Batismo: {formatDateKey(member.dataBatismo)}</span>
          </div>
        </div>

        <div className="member-card-signatures">
          <div>
            <strong>{institutionalInfo.president}</strong>
            <span>Assinatura eletrônica do Pastor Presidente</span>
          </div>
          <div>
            <strong>{signature || member.nomeCompleto}</strong>
            <span>Assinatura eletrônica do membro</span>
          </div>
        </div>
      </article>
    </section>
  )
}

function VisitorPanel() {
  const { firebaseUser, profile } = useAuth()
  const [congregationList, setCongregationList] = useState<Congregation[]>(fallbackCongregations)
  const [records, setRecords] = useState<VisitRecord[]>([])
  const [congregationId, setCongregationId] = useState('')
  const [visitType, setVisitType] = useState<VisitPersonType>('visitante')
  const [convidadoPor, setConvidadoPor] = useState('')
  const [session, setSession] = useState<VisitSession>(visitSessionsForDate(todayKey())[0].value)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [initialized, setInitialized] = useState(false)

  const visitDate = todayKey()
  const sessionOptions = visitSessionsForDate(visitDate)
  const activeCongregations = congregationList.filter((congregation) => congregation.ativa !== false)
  const selectedCongregation = activeCongregations.find((congregation) => congregation.id === congregationId)
  const existingRecord = records.find((record) => record.visitDate === visitDate && record.session === session)

  useEffect(() => subscribeCongregations(setCongregationList), [])

  useEffect(() => {
    if (!firebaseUser) {
      return undefined
    }

    return subscribeUserVisitRecords(firebaseUser.uid, setRecords)
  }, [firebaseUser])

  useEffect(() => {
    if (profile && !initialized) {
      setCongregationId(profile.congregacao ?? '')
      setVisitType(profile.tipoPessoa === 'convidado' ? 'convidado' : 'visitante')
      setConvidadoPor(profile.convidadoPor ?? '')
      setInitialized(true)
    }
  }, [profile, initialized])

  useEffect(() => {
    if (existingRecord) {
      setCongregationId(existingRecord.congregationId)
      setVisitType(existingRecord.tipoPessoa)
      setConvidadoPor(existingRecord.convidadoPor ?? '')
      setStatus('idle')
    }
  }, [existingRecord])

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!firebaseUser || !profile || !selectedCongregation) {
      return
    }

    setStatus('saving')

    try {
      await upsertVisitRecord({
        userId: firebaseUser.uid,
        nomeCompleto: profile.nomeCompleto ?? firebaseUser.email ?? 'Visitante',
        tipoPessoa: visitType,
        convidadoPor: visitType === 'convidado' ? convidadoPor.trim() : undefined,
        congregationId,
        congregationName: selectedCongregation.nome,
        visitDate,
        session,
        source: 'self',
      })
      await updateVisitorCongregacao(firebaseUser.uid, congregationId)
      setStatus('saved')
    } catch {
      setStatus('error')
    }
  }

  const tipoLabel = profile?.tipoPessoa === 'convidado' ? 'Convidado' : 'Visitante'

  return (
    <section className="content-section dashboard-page">
      <DashboardHeader title={`Olá, ${profile?.nomeCompleto ?? 'visitante'}`} subtitle={`Acesso de ${tipoLabel.toLowerCase()}`} />
      <form className="visitor-panel" onSubmit={handleSave}>
        <div className="section-heading">
          <p className="eyebrow">Registro</p>
          <h2>Informe seu registro de hoje</h2>
          <p>Você pode alterar o registro do dia. Aos domingos, há um registro para EBD e outro para o culto à noite.</p>
        </div>

        <div className="form-grid">
          <div className="wide-field">
            <VisitTypeSelector
              name="visitorPanelVisitType"
              value={visitType}
              onChange={(value) => {
                setVisitType(value)
                setStatus('idle')
              }}
            />
          </div>

          <label>
            Culto/atividade
            <select
              value={session}
              onChange={(event) => {
                setSession(event.target.value as VisitSession)
                setStatus('idle')
              }}
            >
              {sessionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {visitType === 'convidado' ? (
            <label className="wide-field">
              Convidado por
              <input
                value={convidadoPor}
                onChange={(event) => {
                  setConvidadoPor(event.target.value)
                  setStatus('idle')
                }}
                placeholder="Nome de quem fez o convite"
              />
            </label>
          ) : null}

          <label className="wide-field">
            Igreja/congregação
            <select
              value={congregationId}
              onChange={(event) => {
                setCongregationId(event.target.value)
                setStatus('idle')
              }}
            >
              <option value="">Selecione</option>
              {activeCongregations.map((congregation) => (
                <option key={congregation.id} value={congregation.id}>
                  {congregation.nome}
                </option>
              ))}
            </select>
          </label>
        </div>

        <CongregationMiniMap congregation={selectedCongregation} />

        <div className="presence-slots">
          {sessionOptions.map((option) => {
            const saved = records.find((record) => record.visitDate === visitDate && record.session === option.value)
            return (
              <button
                className={session === option.value ? 'active' : undefined}
                key={option.value}
                onClick={() => setSession(option.value)}
                type="button"
              >
                <span>{option.label}</span>
                <strong>{saved ? 'Registrado' : 'Disponível'}</strong>
              </button>
            )
          })}
        </div>

        <button
          className="primary-action"
          type="submit"
          disabled={status === 'saving' || !congregationId || (visitType === 'convidado' && !convidadoPor.trim())}
        >
          {status === 'saving' ? 'Salvando...' : existingRecord ? 'Alterar registro' : 'Registrar'}
          <CheckCircle2 aria-hidden="true" />
        </button>

        {status === 'saved' ? (
          <div className="form-alert success">Registro de {profile?.nomeCompleto || 'visitante/convidado'} salvo.</div>
        ) : null}
        {status === 'error' ? <div className="form-alert error">Não foi possível salvar. Tente novamente.</div> : null}
      </form>
    </section>
  )
}

function CongregadoPanel() {
  const { profile } = useAuth()

  return (
    <section className="content-section dashboard-page">
      <DashboardHeader
        title={`Olá, ${profile?.nomeCompleto ?? 'congregado'}`}
        subtitle="Complete seu cadastro de congregado"
      />
      <div className="admin-panel-block">
        <div className="section-heading">
          <p className="eyebrow">Congregado</p>
          <h2>Dados necessários para acompanhamento</h2>
          <p>Preencha os dados completos. O batismo e a promoção para membro serão registrados pela administração.</p>
        </div>
        <RegistrationForm fixedTipoPessoa="congregado" />
      </div>
    </section>
  )
}

function FoundingMembersPage() {
  return (
    <section className="content-section dashboard-page">
      <DashboardHeader title="Membros fundadores" subtitle="Relação nominal para consulta interna dos membros" />
      <div className="founders-list">
        {historicalFoundingMembers.map((name, index) => (
          <article key={name}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <strong>{name}</strong>
          </article>
        ))}
      </div>
      <p className="source-note">{historicalMembersSourceNote}</p>
    </section>
  )
}

function BoardDashboard() {
  return (
    <section className="content-section dashboard-page">
      <DashboardHeader title="Painel da diretoria" subtitle="Acompanhamento de visitantes e convidados, escalas e cultos" />
      <VisitorTracking />
      <div className="table-panel">
        <h2>Escala dos cultos</h2>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Culto</th>
              <th>Dirigente</th>
              <th>Pregador</th>
            </tr>
          </thead>
          <tbody>
            {serviceScale.map((scale) => (
              <tr key={`${scale.data}-${scale.culto}`}>
                <td>{scale.data}</td>
                <td>{scale.culto}</td>
                <td>{scale.dirigente}</td>
                <td>{scale.pregador}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function AdminDashboard({ navigationItems }: { navigationItems: NavigationItem[] }) {
  const { profile } = useAuth()
  const availableSectionKeys = adminAccessSections(profile)
  const availableSections = adminSections.filter((section) => availableSectionKeys.includes(section.key))
  const [activeSection, setActiveSection] = useState<AdminSectionKey>(availableSections[0]?.key ?? 'cadastros')
  const activeDefinition = availableSections.find((section) => section.key === activeSection) ?? availableSections[0]
  const ActiveSectionIcon = activeDefinition?.icon

  useEffect(() => {
    if (!availableSectionKeys.includes(activeSection) && availableSectionKeys[0]) {
      setActiveSection(availableSectionKeys[0])
    }
  }, [activeSection, availableSectionKeys])

  function renderActiveSection() {
    switch (activeDefinition?.key) {
      case 'cadastros':
        return <AdminNominalRegistration />
      case 'aprovacao_cadastros':
        return <MembershipApprovals />
      case 'membros':
        return <MembersAdminSection />
      case 'presencas':
        return <AdminPresenceRegistration />
      case 'dashboard_registros':
        return <RecordsDashboard />
      case 'relatorio_visitantes':
        return <VisitorWorshipReport />
      case 'congregacoes':
        return <CongregationManager />
      case 'usuarios':
        return <UserAccessManager />
      case 'auditoria':
        return <AuditLogPanel />
      case 'site':
        return (
          <>
            <NavigationManager navigationItems={navigationItems} />
            <BannerManager />
          </>
        )
      default:
        return null
    }
  }

  return (
    <section className="content-section dashboard-page">
      <DashboardHeader
        hideEyebrow
        title="Administração"
        subtitle="Escolha uma seção para trabalhar com foco, sem mostrar todo o painel de uma vez."
      />

      {availableSections.length === 0 ? (
        <div className="auth-panel status-panel">
          <LockKeyhole aria-hidden="true" />
          <h2>Nenhuma seção liberada</h2>
          <p>Peça ao administrador para liberar pelo menos uma seção do painel.</p>
        </div>
      ) : (
        <>
          <div className="admin-section-tabs" role="tablist" aria-label="Seções administrativas">
            {availableSections.map((section) => (
              <AdminSectionButton
                active={activeDefinition?.key === section.key}
                key={section.key}
                section={section}
                onClick={() => setActiveSection(section.key)}
              />
            ))}
          </div>

          {activeDefinition ? (
            <div className="admin-active-section">
              <div className="admin-active-heading">
                {ActiveSectionIcon ? <ActiveSectionIcon aria-hidden="true" /> : null}
                <div>
                  <span>Seção selecionada</span>
                  <h2>{activeDefinition.title}</h2>
                  <p>{activeDefinition.description}</p>
                </div>
              </div>
              {renderActiveSection()}
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}

function NavigationManager({ navigationItems }: { navigationItems: NavigationItem[] }) {
  const { firebaseUser } = useAuth()
  const [draftItems, setDraftItems] = useState<NavigationItem[]>(navigationItems)
  const [editingItem, setEditingItem] = useState<NavigationItem | null>(null)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState('')

  useEffect(() => {
    setDraftItems(navigationItems)
    setEditingItem((current) => {
      if (!current) {
        return null
      }

      return navigationItems.find((item) => item.id === current.id) ?? null
    })
  }, [navigationItems])

  const orderedItems = [...draftItems].sort((a, b) => a.order - b.order)
  const editingIsBuiltIn = editingItem ? builtInNavigationIds.has(editingItem.id) : false

  function beginAdd() {
    setEditingItem(newNavigationItem(draftItems))
    setStatus('idle')
    setError('')
  }

  function beginEdit(item: NavigationItem) {
    setEditingItem({ ...item })
    setStatus('idle')
    setError('')
  }

  function updateEditing<K extends keyof NavigationItem>(field: K, value: NavigationItem[K]) {
    setEditingItem((current) => (current ? { ...current, [field]: value } : current))
    setStatus('idle')
  }

  function validateItem(item: NavigationItem): NavigationItem | null {
    const isBuiltIn = builtInNavigationIds.has(item.id)
    const path = isBuiltIn ? item.path : normalizeNavigationPath(item.path)

    if (!item.label.trim()) {
      setError('Informe o nome que aparece no menu.')
      return null
    }

    if (!item.pageTitle.trim()) {
      setError('Informe o título da página.')
      return null
    }

    if (!isBuiltIn && path === '/') {
      setError('A página inicial já usa o caminho "/". Escolha outro caminho para o novo menu.')
      return null
    }

    if (!isBuiltIn && reservedNavigationPaths.has(path)) {
      setError('Este caminho já é usado por uma área restrita do sistema. Escolha outro endereço.')
      return null
    }

    if (draftItems.some((draftItem) => draftItem.id !== item.id && draftItem.path === path)) {
      setError('Já existe um menu usando este caminho.')
      return null
    }

    return {
      ...item,
      label: item.label.trim(),
      path,
      order: Number.isFinite(Number(item.order)) ? Number(item.order) : draftItems.length,
      menuFontSize: clampNumber(Number(item.menuFontSize) || 15, 12, 22),
      pageTitle: item.pageTitle.trim(),
      pageContent: item.pageContent.trim(),
      titleFontSize: clampNumber(Number(item.titleFontSize) || 48, 28, 72),
    }
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!firebaseUser || !editingItem) {
      return
    }

    const validItem = validateItem(editingItem)
    if (!validItem) {
      setStatus('error')
      return
    }

    setStatus('saving')
    setError('')

    const nextItems = draftItems.some((item) => item.id === validItem.id)
      ? draftItems.map((item) => (item.id === validItem.id ? validItem : item))
      : [...draftItems, validItem]

    try {
      await saveNavigationItems(nextItems, firebaseUser.uid)
      setDraftItems(nextItems)
      setEditingItem(validItem)
      setStatus('saved')
    } catch {
      setStatus('error')
      setError('Não foi possível salvar o menu. Confira sua conexão e as regras do Firestore.')
    }
  }

  async function handleDelete(item: NavigationItem) {
    if (!firebaseUser || builtInNavigationIds.has(item.id)) {
      return
    }

    setStatus('saving')
    setError('')

    try {
      const nextItems = draftItems.filter((draftItem) => draftItem.id !== item.id)
      await saveNavigationItems(nextItems, firebaseUser.uid)
      setDraftItems(nextItems)
      setEditingItem(null)
      setStatus('saved')
    } catch {
      setStatus('error')
      setError('Não foi possível excluir este item.')
    }
  }

  return (
    <section className="admin-panel-block navigation-manager">
      <div className="admin-block-heading">
        <div className="section-heading">
          <p className="eyebrow">Site público</p>
          <h2>Menus e páginas públicas</h2>
          <p>Edite nome, ícone, ordem, visibilidade, título, tamanho, negrito e conteúdo dos menus públicos.</p>
        </div>
        <button className="primary-action" type="button" onClick={beginAdd}>
          <PlusCircle aria-hidden="true" />
          Novo item
        </button>
      </div>

      <div className="navigation-manager-layout">
        <div className="navigation-manager-list" aria-label="Menus cadastrados">
          {orderedItems.map((item) => {
            const Icon = navigationIconComponents[item.icon]

            return (
              <article className={editingItem?.id === item.id ? 'active' : undefined} key={item.id}>
                {Icon ? <Icon aria-hidden="true" /> : <FileText aria-hidden="true" />}
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.path}</span>
                  <em>{item.visible ? 'Visível no menu' : 'Oculto do menu'}</em>
                </div>
                <button className="secondary-admin-action" type="button" onClick={() => beginEdit(item)}>
                  <Pencil aria-hidden="true" />
                  Editar
                </button>
              </article>
            )
          })}
        </div>

        {editingItem ? (
          <form className="navigation-editor" onSubmit={handleSave}>
            <div className="form-grid">
              <label>
                Nome no menu
                <input value={editingItem.label} onChange={(event) => updateEditing('label', event.target.value)} />
              </label>

              <label>
                Caminho da página
                <input
                  disabled={editingIsBuiltIn}
                  value={editingItem.path}
                  onChange={(event) => updateEditing('path', event.target.value)}
                />
                {editingIsBuiltIn ? <span className="field-hint">Menu principal do sistema; o endereço fica fixo.</span> : null}
              </label>

              <label>
                Ícone
                <select
                  value={editingItem.icon}
                  onChange={(event) => updateEditing('icon', event.target.value as NavigationIconKey)}
                >
                  {navigationIconOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Ordem
                <input
                  inputMode="numeric"
                  type="number"
                  value={editingItem.order}
                  onChange={(event) => updateEditing('order', Number(event.target.value))}
                />
              </label>

              <label>
                Tamanho do menu
                <input
                  max={22}
                  min={12}
                  type="number"
                  value={editingItem.menuFontSize}
                  onChange={(event) => updateEditing('menuFontSize', Number(event.target.value))}
                />
              </label>

              <label>
                Tamanho do título
                <input
                  max={72}
                  min={28}
                  type="number"
                  value={editingItem.titleFontSize}
                  onChange={(event) => updateEditing('titleFontSize', Number(event.target.value))}
                />
              </label>

              <label className="wide-field">
                Título da página
                <input value={editingItem.pageTitle} onChange={(event) => updateEditing('pageTitle', event.target.value)} />
              </label>

              <label className="wide-field">
                Conteúdo da página
                <textarea
                  rows={5}
                  value={editingItem.pageContent}
                  onChange={(event) => updateEditing('pageContent', event.target.value)}
                />
              </label>
            </div>

            <div className="navigation-format-row">
              <label className="checkbox-line">
                <input
                  checked={editingItem.visible}
                  onChange={(event) => updateEditing('visible', event.target.checked)}
                  type="checkbox"
                />
                Exibir no menu
              </label>
              <label className="checkbox-line">
                <input
                  checked={editingItem.menuBold}
                  onChange={(event) => updateEditing('menuBold', event.target.checked)}
                  type="checkbox"
                />
                Menu em negrito
              </label>
              <label className="checkbox-line">
                <input
                  checked={editingItem.titleBold}
                  onChange={(event) => updateEditing('titleBold', event.target.checked)}
                  type="checkbox"
                />
                Título em negrito
              </label>
            </div>

            <div className="editor-actions">
              <button className="primary-action" disabled={status === 'saving'} type="submit">
                <CheckCircle2 aria-hidden="true" />
                {status === 'saving' ? 'Salvando...' : 'Salvar menu'}
              </button>
              <button className="secondary-admin-action" type="button" onClick={() => setEditingItem(null)}>
                <X aria-hidden="true" />
                Cancelar
              </button>
              {!editingIsBuiltIn ? (
                <button className="reject-btn" type="button" onClick={() => handleDelete(editingItem)}>
                  <Trash2 aria-hidden="true" />
                  Excluir item
                </button>
              ) : null}
            </div>

            {error ? <div className="form-alert error">{error}</div> : null}
            {status === 'saved' ? <div className="form-alert success">Menu público atualizado.</div> : null}
          </form>
        ) : (
          <div className="navigation-empty-state">
            <FileText aria-hidden="true" />
            <strong>Selecione um menu para editar</strong>
            <p>Você também pode criar uma nova página pública usando o botão Novo item.</p>
          </div>
        )}
      </div>
    </section>
  )
}

function AdminPresenceRegistration() {
  const { firebaseUser } = useAuth()
  const [congregationList, setCongregationList] = useState<Congregation[]>(fallbackCongregations)
  const [nomeCompleto, setNomeCompleto] = useState('')
  const [visitType, setVisitType] = useState<VisitPersonType>('visitante')
  const [convidadoPor, setConvidadoPor] = useState('')
  const [congregationId, setCongregationId] = useState('')
  const [visitDate, setVisitDate] = useState(todayKey())
  const [session, setSession] = useState<VisitSession>(visitSessionsForDate(todayKey())[0].value)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState('')
  const [lastRegisteredName, setLastRegisteredName] = useState('')

  const sessionOptions = visitSessionsForDate(visitDate)
  const visitWeekdayLabel = weekdayLabelFromDateKey(visitDate)
  const activeCongregations = congregationList.filter((congregation) => congregation.ativa !== false)
  const selectedCongregation = activeCongregations.find((congregation) => congregation.id === congregationId)

  useEffect(() => subscribeCongregations(setCongregationList), [])

  useEffect(() => {
    const allowed = visitSessionsForDate(visitDate)
    if (!allowed.some((option) => option.value === session)) {
      setSession(allowed[0].value)
    }
  }, [visitDate, session])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('saving')
    setError('')

    if (!firebaseUser || !selectedCongregation || !nomeCompleto.trim()) {
      setStatus('error')
      setError('Informe o nome e a igreja do registro.')
      return
    }

    if (visitType === 'convidado' && !convidadoPor.trim()) {
      setStatus('error')
      setError('Informe quem convidou.')
      return
    }

    try {
      await createNominalVisitRecord({
        recordedBy: firebaseUser.uid,
        nomeCompleto: nomeCompleto.trim(),
        tipoPessoa: visitType,
        convidadoPor: visitType === 'convidado' ? convidadoPor.trim() : undefined,
        congregationId,
        congregationName: selectedCongregation.nome,
        visitDate,
        session,
      })
      setLastRegisteredName(nomeCompleto.trim())
      setNomeCompleto('')
      setConvidadoPor('')
      setStatus('saved')
    } catch {
      setStatus('error')
      setError('Não foi possível salvar o registro.')
    }
  }

  return (
    <section className="admin-panel-block">
      <div className="section-heading">
        <p className="eyebrow">Registro</p>
        <h2>Registro</h2>
        <p>Visitantes e convidados</p>
      </div>

      <form className="congregation-editor" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="wide-field">
            <VisitTypeSelector name="adminVisitType" value={visitType} onChange={setVisitType} />
          </div>

          <label>
            Nome
            <input value={nomeCompleto} onChange={(event) => setNomeCompleto(event.target.value)} />
          </label>

          {visitType === 'convidado' ? (
            <label>
              Convidado por
              <input value={convidadoPor} onChange={(event) => setConvidadoPor(event.target.value)} />
            </label>
          ) : null}

          <label>
            Data
            <input type="date" value={visitDate} onChange={(event) => setVisitDate(event.target.value)} />
            <small className="field-hint">
              {visitWeekdayLabel ? `Dia da semana: ${visitWeekdayLabel}` : 'Informe a data para calcular o dia da semana.'}
            </small>
          </label>

          <label>
            Culto/atividade
            <select value={session} onChange={(event) => setSession(event.target.value as VisitSession)}>
              {sessionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="wide-field">
            Igreja/congregação
            <select value={congregationId} onChange={(event) => setCongregationId(event.target.value)}>
              <option value="">Selecione</option>
              {activeCongregations.map((congregation) => (
                <option key={congregation.id} value={congregation.id}>
                  {congregation.nome}
                </option>
              ))}
            </select>
          </label>
        </div>

        <CongregationMiniMap congregation={selectedCongregation} />

        <button className="primary-action" type="submit" disabled={status === 'saving'}>
          <CheckCircle2 aria-hidden="true" />
          {status === 'saving' ? 'Salvando...' : 'Registrar'}
        </button>

        {status === 'saved' ? (
          <div className="form-alert success">Registro de {lastRegisteredName || 'visitante/convidado'} realizado.</div>
        ) : null}
        {error ? <div className="form-alert error">{error}</div> : null}
      </form>
    </section>
  )
}

function AdminNominalRegistration() {
  const [open, setOpen] = useState(false)
  const [completedProtocol, setCompletedProtocol] = useState('')
  const [completedName, setCompletedName] = useState('')

  function closeModal() {
    setOpen(false)
    setCompletedProtocol('')
    setCompletedName('')
  }

  return (
    <section className="admin-panel-block">
      <div className="section-heading admin-block-heading">
        <div>
          <p className="eyebrow">Cadastro</p>
          <h2>Cadastrar membro ou congregado</h2>
          <p>Use esta seção para registrar dados completos e classificar a pessoa como membro ou congregado.</p>
        </div>
        <button
          className="primary-action admin-heading-action"
          type="button"
          onClick={() => {
            setCompletedProtocol('')
            setCompletedName('')
            setOpen(true)
          }}
        >
          <UserPlus aria-hidden="true" />
          Novo Cadastro
        </button>
      </div>

      {open ? (
        <div className="modal-backdrop registration-modal-backdrop" role="dialog" aria-modal="true" aria-label="Novo cadastro">
          <div className="registration-modal">
            <button className="modal-close-button" type="button" onClick={closeModal} aria-label="Fechar cadastro">
              <X aria-hidden="true" />
            </button>

            {completedProtocol ? (
              <div className="registration-complete-panel">
                <CheckCircle2 aria-hidden="true" />
                <h3>Cadastro concluído</h3>
                <p>O cadastro de {completedName || 'membro ou congregado'} foi registrado com sucesso.</p>
                <span>Protocolo: {completedProtocol}</span>
                <button className="primary-action" type="button" onClick={closeModal}>
                  Fechar tela
                </button>
              </div>
            ) : (
              <RegistrationForm
                mode="admin"
                allowedPersonTypes={['membro', 'congregado']}
                onSuccess={(result) => {
                  setCompletedName(result.nomeCompleto)
                  setCompletedProtocol(result.protocol || 'sem protocolo')
                }}
              />
            )}
          </div>
        </div>
      ) : null}
    </section>
  )
}

type CongregationFormState = {
  nome: string
  tipo: 'sede' | 'congregacao'
  categoria: CongregationCategory
  endereco: string
  pastorResponsavel: string
  telefone: string
  latitude: string
  longitude: string
}

const emptyCongregationForm: CongregationFormState = {
  nome: '',
  tipo: 'congregacao',
  categoria: 'capital',
  endereco: '',
  pastorResponsavel: '',
  telefone: '',
  latitude: '',
  longitude: '',
}

function congregationFormToInput(form: CongregationFormState): CongregationInput {
  return {
    nome: form.nome.trim(),
    tipo: form.tipo,
    categoria: form.categoria,
    endereco: form.endereco.trim(),
    pastorResponsavel: form.pastorResponsavel.trim(),
    telefone: form.telefone.trim(),
    latitude: form.latitude ? Number(form.latitude) : undefined,
    longitude: form.longitude ? Number(form.longitude) : undefined,
    ativa: true,
  }
}

function CongregationManager() {
  const [items, setItems] = useState<Congregation[]>(fallbackCongregations)
  const [form, setForm] = useState<CongregationFormState>(emptyCongregationForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [areaFilter, setAreaFilter] = useState<'todas' | CongregationCategory>('todas')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState('')
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [addressStatus, setAddressStatus] = useState<'idle' | 'loading' | 'error'>('idle')

  useEffect(() => subscribeCongregations(setItems), [])

  const selectedMapCongregation: Congregation = {
    id: editingId ?? 'preview',
    ...congregationFormToInput(form),
  }
  const filteredItems = items.filter((congregation) => {
    if (areaFilter === 'todas') {
      return true
    }

    return (congregation.categoria ?? 'capital') === areaFilter
  })

  function updateForm<K extends keyof CongregationFormState>(field: K, value: CongregationFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }))
    setStatus('idle')
  }

  function resetForm() {
    setForm(emptyCongregationForm)
    setEditingId(null)
    setStatus('idle')
    setError('')
  }

  function editCongregation(congregation: Congregation) {
    setEditingId(congregation.id)
    setForm({
      nome: congregation.nome,
      tipo: congregation.tipo,
      categoria: congregation.categoria ?? 'capital',
      endereco: congregation.endereco,
      pastorResponsavel: congregation.pastorResponsavel,
      telefone: congregation.telefone,
      latitude: typeof congregation.latitude === 'number' ? String(congregation.latitude) : '',
      longitude: typeof congregation.longitude === 'number' ? String(congregation.longitude) : '',
    })
    setStatus('idle')
    setError('')
  }

  async function applyCoordinates(lat: number, lng: number) {
    setForm((current) => ({ ...current, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }))
    setStatus('idle')
    setAddressStatus('loading')

    try {
      const address = await reverseGeocode(lat, lng)
      if (address) {
        setForm((current) => ({ ...current, endereco: address }))
      }
      setAddressStatus('idle')
    } catch {
      setAddressStatus('error')
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError('O navegador não liberou geolocalização.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        void applyCoordinates(position.coords.latitude, position.coords.longitude)
      },
      () => setError('Não foi possível obter a localização atual.'),
    )
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('saving')
    setError('')

    if (!form.nome.trim() || !form.endereco.trim()) {
      setStatus('error')
      setError('Informe pelo menos o nome e o endereço da igreja.')
      return
    }

    if ((form.latitude && Number.isNaN(Number(form.latitude))) || (form.longitude && Number.isNaN(Number(form.longitude)))) {
      setStatus('error')
      setError('Latitude e longitude precisam ser números válidos.')
      return
    }

    try {
      const payload = congregationFormToInput(form)
      if (editingId) {
        await updateCongregation(editingId, payload)
      } else {
        await createCongregation(payload)
      }
      resetForm()
      setStatus('saved')
    } catch {
      setStatus('error')
      setError('Não foi possível salvar a congregação. Confira as regras do Firestore.')
    }
  }

  async function handleSuppress(id: string) {
    setStatus('saving')
    setError('')

    try {
      await suppressCongregation(id)
      if (editingId === id) {
        resetForm()
      }
      setStatus('saved')
    } catch {
      setStatus('error')
      setError('Não foi possível suprimir a congregação.')
    }
  }

  return (
    <section className="admin-panel-block">
      <div className="section-heading">
        <p className="eyebrow">Igrejas</p>
        <h2>Cadastro de congregações</h2>
        <p>Inclua, edite ou suprima igrejas. O visitante escolhe apenas a igreja; a classificação fica aqui.</p>
      </div>

      <form className="congregation-editor" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>
            Nome da igreja
            <RequiredHint />
            <input
              value={form.nome}
              onChange={(event) => updateForm('nome', event.target.value)}
              placeholder="Ex.: Congregação Jardim Floresta"
            />
          </label>

          <label>
            Classificação
            <RequiredHint />
            <select
              value={form.categoria}
              onChange={(event) => updateForm('categoria', event.target.value as CongregationCategory)}
            >
              {Object.entries(congregationCategoryLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Tipo interno
            <select value={form.tipo} onChange={(event) => updateForm('tipo', event.target.value as 'sede' | 'congregacao')}>
              <option value="congregacao">Congregação</option>
              <option value="sede">Sede</option>
            </select>
          </label>

          <label>
            Telefone
            <input
              value={form.telefone}
              onChange={(event) => updateForm('telefone', event.target.value)}
              placeholder="(95) 99999-9999"
            />
          </label>

          <label className="wide-field">
            Endereço
            <RequiredHint />
            <input
              value={form.endereco}
              onChange={(event) => updateForm('endereco', event.target.value)}
              placeholder="Rua, número, bairro, cidade"
            />
            {addressStatus === 'loading' ? (
              <small className="field-hint">Buscando endereço pela localização...</small>
            ) : addressStatus === 'error' ? (
              <small className="field-hint">Não foi possível obter o endereço. Preencha manualmente.</small>
            ) : null}
          </label>

          <label>
            Responsável
            <input
              value={form.pastorResponsavel}
              onChange={(event) => updateForm('pastorResponsavel', event.target.value)}
              placeholder="Nome do dirigente ou pastor"
            />
          </label>

          <label>
            <span>Latitude <span className="optional-tag">(opcional)</span></span>
            <input
              value={form.latitude}
              onChange={(event) => updateForm('latitude', event.target.value)}
              inputMode="decimal"
              placeholder="Ex.: 2.823500"
            />
          </label>

          <label>
            <span>Longitude <span className="optional-tag">(opcional)</span></span>
            <input
              value={form.longitude}
              onChange={(event) => updateForm('longitude', event.target.value)}
              inputMode="decimal"
              placeholder="Ex.: -60.675800"
            />
          </label>
        </div>

        <div className="location-tools">
          <span className="location-tools-label">Localização (opcional):</span>
          <button className="secondary-admin-action" type="button" onClick={useCurrentLocation}>
            <Navigation aria-hidden="true" />
            Usar localização atual
          </button>
          <button
            className={showMapPicker ? 'secondary-admin-action active' : 'secondary-admin-action'}
            type="button"
            onClick={() => setShowMapPicker((current) => !current)}
          >
            <MapPin aria-hidden="true" />
            {showMapPicker ? 'Fechar mapa' : 'Indicar no mapa'}
          </button>
        </div>

        {showMapPicker ? (
          <MapPicker
            latitude={form.latitude ? Number(form.latitude) : undefined}
            longitude={form.longitude ? Number(form.longitude) : undefined}
            onPick={(lat, lng) => void applyCoordinates(lat, lng)}
          />
        ) : null}

        <div className="editor-actions">
          <button className="primary-action" type="submit" disabled={status === 'saving'}>
            <PlusCircle aria-hidden="true" />
            {editingId ? 'Salvar alteração' : 'Adicionar igreja'}
          </button>
          {editingId ? (
            <button className="secondary-admin-action" type="button" onClick={resetForm}>
              <X aria-hidden="true" />
              Cancelar
            </button>
          ) : null}
        </div>

        {error ? <div className="form-alert error">{error}</div> : null}
        {status === 'saved' ? <div className="form-alert success">Congregação atualizada.</div> : null}
      </form>

      <CongregationMiniMap congregation={selectedMapCongregation} />

      <div className="congregation-list-heading">
        <div>
          <strong>Igrejas cadastradas</strong>
          <span>{filteredItems.length} exibida(s) de {items.length}</span>
        </div>
        <div className="segmented-filter" aria-label="Filtrar igrejas por localidade">
          {congregationAreaFilters.map((filter) => (
            <button
              className={areaFilter === filter.value ? 'active' : undefined}
              key={filter.value}
              onClick={() => setAreaFilter(filter.value)}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="managed-congregations">
        {filteredItems.map((congregation) => (
          <article className={congregation.ativa === false ? 'inactive' : undefined} key={congregation.id}>
            <Building2 aria-hidden="true" />
            <div>
              <strong>{congregation.nome}</strong>
              <span>{congregationCategoryLabels[congregation.categoria ?? 'capital']}</span>
              <p>{congregation.endereco}</p>
            </div>
            <button className="secondary-admin-action" type="button" onClick={() => editCongregation(congregation)}>
              <Pencil aria-hidden="true" />
              Editar
            </button>
            {congregation.ativa === false ? null : (
              <button className="reject-btn" type="button" onClick={() => handleSuppress(congregation.id)}>
                <Trash2 aria-hidden="true" />
                Suprimir
              </button>
            )}
          </article>
        ))}
        {filteredItems.length === 0 ? <p className="source-note">Nenhuma igreja encontrada neste filtro.</p> : null}
      </div>
    </section>
  )
}

function MembershipApprovals() {
  const { firebaseUser } = useAuth()
  const [requests, setRequests] = useState<MembershipRequest[]>([])
  const [congregationList, setCongregationList] = useState<Congregation[]>(fallbackCongregations)
  const [filter, setFilter] = useState<MembershipRequestStatus | 'todos'>('pendente')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [reviewingRequest, setReviewingRequest] = useState<MembershipRequest | null>(null)
  const [reviewScrolledToEnd, setReviewScrolledToEnd] = useState(false)
  const [reviewMode, setReviewMode] = useState<'review' | 'edit'>('review')
  const [reviewEditConfirmation, setReviewEditConfirmation] = useState('')
  const reviewBodyRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const unsubscribe = subscribeMembershipRequests(
      (items) => {
        setRequests(items)
        setLoading(false)
      },
      () => {
        setError('Não foi possível carregar as solicitações.')
        setLoading(false)
      },
    )

    return unsubscribe
  }, [])

  useEffect(() => subscribeCongregations(setCongregationList), [])

  function cargoLabel(request: MembershipRequest): string {
    if (!request.possuiCargo) {
      return 'Sem cargo ministerial'
    }

    if (request.cargo === 'outro') {
      return request.outroCargo || 'Outra função'
    }

    return churchRoleOptions.find((option) => option.value === request.cargo)?.label ?? '—'
  }

  function tipoLabel(request: MembershipRequest): string {
    return personTypeOptions.find((option) => option.value === request.tipoPessoa)?.label ?? request.tipoPessoa
  }

  function requestCongregationName(request: MembershipRequest): string {
    return congregationDisplayName(request.congregacao, congregationList) || 'Congregação não informada'
  }

  useEffect(() => {
    if (!reviewingRequest) {
      return
    }

    setReviewScrolledToEnd(false)
    window.setTimeout(() => {
      const body = reviewBodyRef.current
      if (body && body.scrollHeight <= body.clientHeight + 8) {
        setReviewScrolledToEnd(true)
      }
    }, 80)
  }, [reviewingRequest])

  function openApprovalReview(request: MembershipRequest) {
    setError('')
    setNotice('')
    setReviewScrolledToEnd(false)
    setReviewMode('review')
    setReviewEditConfirmation('')
    setReviewingRequest(request)
  }

  function closeApprovalReview() {
    setReviewingRequest(null)
    setReviewScrolledToEnd(false)
    setReviewMode('review')
    setReviewEditConfirmation('')
  }

  function handleReviewScroll() {
    const body = reviewBodyRef.current
    if (!body) {
      return
    }

    if (body.scrollTop + body.clientHeight >= body.scrollHeight - 16) {
      setReviewScrolledToEnd(true)
    }
  }

  function formatRequestAddress(request: MembershipRequest) {
    const endereco = request.endereco
    if (!endereco) {
      return 'Endereço não informado'
    }

    return [
      `${endereco.tipoLogradouro || 'Logradouro'} ${endereco.rua || ''}`.trim(),
      endereco.numero ? `nº ${endereco.numero}` : '',
      endereco.complemento,
      endereco.bairro,
      endereco.cidade && endereco.estado ? `${endereco.cidade} - ${endereco.estado}` : endereco.cidade || endereco.estado,
      endereco.cep ? `CEP ${endereco.cep}` : '',
      endereco.pais,
    ]
      .filter(Boolean)
      .join(', ')
  }

  function documentSummary(request: MembershipRequest) {
    return [
      request.selfieArquivo ? `Selfie: ${request.selfieArquivo}` : 'Selfie não enviada',
      request.fotoArquivo ? `Foto: ${request.fotoArquivo}` : 'Foto não enviada',
      request.fotoVersoArquivo ? `Foto verso: ${request.fotoVersoArquivo}` : '',
      request.cartaMudancaArquivo ? `Carta de mudança: ${request.cartaMudancaArquivo}` : 'Carta de mudança não enviada',
      request.cartaRecomendacaoArquivo
        ? `Carta de recomendação: ${request.cartaRecomendacaoArquivo}`
        : 'Carta de recomendação não enviada',
    ]
      .filter(Boolean)
      .join(' · ')
  }

  function approvalPendingFields(request: MembershipRequest) {
    const missing = memberEditorMissingRequiredFields(editableRecordToForm(request))
    return Array.from(missing).map((field) => memberEditorRequiredFieldLabels[field])
  }

  async function saveReviewEdit(data: ReturnType<typeof editablePayloadFromForm>) {
    if (!reviewingRequest) {
      return
    }

    await updateMembershipRequestProfile(reviewingRequest.id, data)
    setReviewingRequest((current) =>
      current
        ? {
            ...current,
            ...data,
            sexo: data.sexo ?? current.sexo ?? '',
            consentimentoLgpd: current.consentimentoLgpd,
          }
        : current,
    )
    setReviewScrolledToEnd(false)
    setReviewMode('review')
    setReviewEditConfirmation(`Cadastro de ${data.nomeCompleto || reviewingRequest.nomeCompleto} atualizado para conferência.`)
  }

  async function decide(request: MembershipRequest, status: 'aprovado' | 'rejeitado') {
    if (!firebaseUser) {
      return false
    }

    setBusyId(request.id)
    setError('')
    setNotice('')

    try {
      if (status === 'aprovado') {
        const pendingFields = approvalPendingFields(request)
        if (pendingFields.length > 0) {
          setError(`Antes de aprovar, complete no cadastro: ${pendingFields.join(', ')}.`)
          return false
        }
      }

      const result = await decideMembershipRequest(request, status, firebaseUser.uid)
      if (status === 'aprovado') {
        setNotice(
          result.linkedUserUid
            ? `Cadastro de ${request.nomeCompleto} aprovado, membro oficial criado e acesso promovido para membro.`
            : `Cadastro de ${request.nomeCompleto} aprovado e membro oficial criado. Nenhum acesso com este e-mail foi encontrado para vincular.`,
        )
      } else {
        setNotice(`Solicitação de ${request.nomeCompleto} rejeitada.`)
      }
      return true
    } catch {
      setError('Não foi possível atualizar a solicitação.')
      return false
    } finally {
      setBusyId(null)
    }
  }

  const membroRequests = requests.filter((request) => request.tipoPessoa === 'membro')

  const counts = {
    pendente: membroRequests.filter((request) => (request.status ?? 'pendente') === 'pendente').length,
    aprovado: membroRequests.filter((request) => request.status === 'aprovado').length,
    rejeitado: membroRequests.filter((request) => request.status === 'rejeitado').length,
  }

  const visible = membroRequests
    .filter((request) => (filter === 'todos' ? true : (request.status ?? 'pendente') === filter))
    .sort((a, b) => firestoreDateValue(b.createdAt) - firestoreDateValue(a.createdAt))

  return (
    <section className="admin-panel-block">
      <div className="section-heading">
        <p className="eyebrow">Cadastros</p>
        <h2>Aprovar solicitações de membro</h2>
        <p>Somente cadastros do tipo membro passam por aprovação. Visitantes e convidados ficam no acompanhamento da diretoria.</p>
      </div>

      <div className="request-filters">
        {requestStatusFilters.map((option) => (
          <button
            className={filter === option.value ? 'active' : undefined}
            key={option.value}
            onClick={() => setFilter(option.value)}
            type="button"
          >
            {option.label}
            {option.value !== 'todos' ? <span>{counts[option.value]}</span> : null}
          </button>
        ))}
      </div>

      {error ? <div className="form-alert error">{error}</div> : null}
      {notice ? <div className="form-alert success">{notice}</div> : null}

      {loading ? (
        <p className="source-note">Carregando solicitações...</p>
      ) : visible.length === 0 ? (
        <p className="source-note">Nenhuma solicitação nesta lista no momento.</p>
      ) : (
        <div className="request-list">
          {visible.map((request) => {
            const status = request.status ?? 'pendente'

            return (
              <article className="request-card" key={request.id}>
                <div className="request-main">
                  <div className="request-head">
                    <strong>{request.nomeCompleto}</strong>
                    <span className={`status-badge status-${status}`}>{status}</span>
                  </div>
                  <div className="request-meta">
                    <span>{tipoLabel(request)}</span>
                    <span>{cargoLabel(request)}</span>
                    <span>{requestCongregationName(request)}</span>
                  </div>
                  <div className="request-contact">
                    <span>{request.email || 'Sem e-mail'}</span>
                    <span>{request.telefone || 'Sem telefone'}</span>
                    <span>Enviado em {formatFirestoreDate(request.createdAt)}</span>
                  </div>
                </div>
                {status === 'pendente' ? (
                  <div className="request-actions">
                    <button
                      className="approve-btn"
                      disabled={busyId === request.id}
                      onClick={() => openApprovalReview(request)}
                      type="button"
                    >
                      <FileText aria-hidden="true" />
                      Conferir e aprovar
                    </button>
                    <button
                      className="reject-btn"
                      disabled={busyId === request.id}
                      onClick={() => decide(request, 'rejeitado')}
                      type="button"
                    >
                      <X aria-hidden="true" />
                      Rejeitar
                    </button>
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      )}

      {reviewingRequest ? (
        <div className="member-edit-modal-backdrop" role="presentation">
          <div aria-modal="true" className="member-edit-modal approval-review-modal" role="dialog">
            <div className="member-edit-modal-head">
              <div>
                <p className="eyebrow">Conferência obrigatória</p>
                <h3>{reviewingRequest.nomeCompleto}</h3>
                <p>Revise todos os dados do cadastro antes de aprovar.</p>
              </div>
              <button aria-label="Fechar conferência" className="icon-close-button" onClick={closeApprovalReview} type="button">
                <X aria-hidden="true" />
              </button>
            </div>

            {reviewMode === 'edit' ? (
              <div className="approval-review-body approval-review-edit-body">
                <div className="approval-review-warning">
                  <Info aria-hidden="true" />
                  <span>Corrija os dados pendentes, salve e depois revise novamente antes de aprovar.</span>
                </div>
                <MemberCadastroEditor
                  extraRequiredFields={['dataBatismo']}
                  highlightMissingRequired
                  mode="admin"
                  record={reviewingRequest}
                  onCancel={() => setReviewMode('review')}
                  onSave={saveReviewEdit}
                />
              </div>
            ) : (
              <div className="approval-review-body" onScroll={handleReviewScroll} ref={reviewBodyRef}>
              {reviewEditConfirmation ? <div className="form-alert success">{reviewEditConfirmation}</div> : null}
              {approvalPendingFields(reviewingRequest).length > 0 ? (
                <div className="form-alert warning">
                  Complete antes de aprovar: {approvalPendingFields(reviewingRequest).join(', ')}.
                </div>
              ) : null}
              <div className="approval-review-warning">
                <Info aria-hidden="true" />
                <span>Role até o final da conferência para liberar o botão de aprovação.</span>
              </div>

              <div className="approval-review-section">
                <h4>Identificação</h4>
                <dl className="approval-review-grid">
                  <div>
                    <dt>Nome completo</dt>
                    <dd>{reviewingRequest.nomeCompleto || 'Não informado'}</dd>
                  </div>
                  <div>
                    <dt>Tipo</dt>
                    <dd>{tipoLabel(reviewingRequest)}</dd>
                  </div>
                  <div>
                    <dt>CPF</dt>
                    <dd>{reviewingRequest.cpf || 'Não informado'}</dd>
                  </div>
                  <div>
                    <dt>RG</dt>
                    <dd>
                      {[reviewingRequest.rg, reviewingRequest.rgUf].filter(Boolean).join(' / ') || 'Não informado'}
                    </dd>
                  </div>
                  <div>
                    <dt>Nascimento</dt>
                    <dd>{formatDateKey(reviewingRequest.dataNascimento) || 'Não informado'}</dd>
                  </div>
                  <div>
                    <dt>Sexo</dt>
                    <dd>{reviewingRequest.sexo || 'Não informado'}</dd>
                  </div>
                </dl>
              </div>

              <div className="approval-review-section">
                <h4>Contato e igreja</h4>
                <dl className="approval-review-grid">
                  <div>
                    <dt>E-mail</dt>
                    <dd>{reviewingRequest.email || 'Não informado'}</dd>
                  </div>
                  <div>
                    <dt>Telefone</dt>
                    <dd>
                      {reviewingRequest.telefone || 'Não informado'}
                      {reviewingRequest.possuiWhatsapp ? ' · WhatsApp' : ''}
                    </dd>
                  </div>
                  <div>
                    <dt>Congregação</dt>
                    <dd>{requestCongregationName(reviewingRequest)}</dd>
                  </div>
                  <div>
                    <dt>Enviado em</dt>
                    <dd>{formatFirestoreDate(reviewingRequest.createdAt)}</dd>
                  </div>
                </dl>
              </div>

              <div className="approval-review-section">
                <h4>Endereço</h4>
                <p>{formatRequestAddress(reviewingRequest)}</p>
              </div>

              <div className="approval-review-section">
                <h4>Vida cristã e função</h4>
                <dl className="approval-review-grid">
                  <div>
                    <dt>Data de aceitação</dt>
                    <dd>{formatDateKey(reviewingRequest.dataAceitacao) || 'Não informada'}</dd>
                  </div>
                  <div>
                    <dt>Data de batismo</dt>
                    <dd>{formatDateKey(reviewingRequest.dataBatismo) || 'Não informada'}</dd>
                  </div>
                  <div>
                    <dt>Cargo/função</dt>
                    <dd>{cargoLabel(reviewingRequest)}</dd>
                  </div>
                </dl>
              </div>

              <div className="approval-review-section">
                <h4>Documentos e observações</h4>
                <p>{documentSummary(reviewingRequest)}</p>
                <p>{reviewingRequest.observacoes || 'Sem observações registradas.'}</p>
                <p>Consentimento LGPD: {reviewingRequest.consentimentoLgpd ? 'sim' : 'não informado'}</p>
              </div>

              <div className="approval-review-footer">
                <button className="secondary-admin-action" onClick={closeApprovalReview} type="button">
                  <X aria-hidden="true" />
                  Fechar
                </button>
                <button
                  className="secondary-admin-action"
                  onClick={() => {
                    setReviewMode('edit')
                    setReviewScrolledToEnd(false)
                  }}
                  type="button"
                >
                  <Pencil aria-hidden="true" />
                  Editar cadastro
                </button>
                <button
                  className="approve-btn"
                  disabled={!reviewScrolledToEnd || approvalPendingFields(reviewingRequest).length > 0 || busyId === reviewingRequest.id}
                  onClick={async () => {
                    const approved = await decide(reviewingRequest, 'aprovado')
                    if (approved) {
                      closeApprovalReview()
                    }
                  }}
                  type="button"
                >
                  <Check aria-hidden="true" />
                  {busyId === reviewingRequest.id ? 'Aprovando...' : 'Confirmar aprovação'}
                </button>
              </div>
            </div>
            )}
          </div>
        </div>
      ) : null}

    </section>
  )
}

function auditActorFor(firebaseUser: { uid: string; email?: string | null } | null, profile: UserProfile | null): AuditActor | null {
  if (!firebaseUser) {
    return null
  }

  return {
    uid: firebaseUser.uid,
    nomeCompleto: profile?.nomeCompleto,
    email: firebaseUser.email ?? profile?.email,
  }
}

function auditChangedFields(before: Record<string, unknown>, after: Record<string, unknown>) {
  return Object.keys(after).filter((field) => JSON.stringify(before[field] ?? null) !== JSON.stringify(after[field] ?? null))
}

function MembersAdminSection() {
  const [activeTab, setActiveTab] = useState<'cadastro' | 'progressao'>('cadastro')

  return (
    <div className="members-admin-section">
      <div className="request-filters member-subtabs" role="tablist" aria-label="Seções de membros">
        <button
          aria-selected={activeTab === 'cadastro'}
          className={activeTab === 'cadastro' ? 'active' : undefined}
          onClick={() => setActiveTab('cadastro')}
          role="tab"
          type="button"
        >
          Cadastro de membros
        </button>
        <button
          aria-selected={activeTab === 'progressao'}
          className={activeTab === 'progressao' ? 'active' : undefined}
          onClick={() => setActiveTab('progressao')}
          role="tab"
          type="button"
        >
          Progressão espiritual
        </button>
      </div>

      {activeTab === 'cadastro' ? <MemberDirectory /> : <ProfileProgressionManager />}
    </div>
  )
}

function MemberDirectory() {
  const { firebaseUser, profile } = useAuth()
  const [members, setMembers] = useState<OfficialMember[]>([])
  const [congregationList, setCongregationList] = useState<Congregation[]>(fallbackCongregations)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<OfficialMember['status'] | 'todos'>('ativo')
  const [editingMember, setEditingMember] = useState<OfficialMember | null>(null)
  const [editConfirmation, setEditConfirmation] = useState('')
  const editCloseTimerRef = useRef<number | null>(null)
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    return subscribeMembers(
      (items) => {
        setMembers(items)
        setLoading(false)
      },
      () => {
        setError('Não foi possível carregar o cadastro oficial de membros.')
        setLoading(false)
      },
    )
  }, [])

  useEffect(() => subscribeCongregations(setCongregationList), [])

  useEffect(() => {
    return () => {
      if (editCloseTimerRef.current) {
        window.clearTimeout(editCloseTimerRef.current)
      }
    }
  }, [])

  function openMemberEditor(member: OfficialMember) {
    if (editCloseTimerRef.current) {
      window.clearTimeout(editCloseTimerRef.current)
    }

    setEditConfirmation('')
    setEditingMember(member)
  }

  function closeMemberEditor() {
    if (editCloseTimerRef.current) {
      window.clearTimeout(editCloseTimerRef.current)
    }

    setEditConfirmation('')
    setEditingMember(null)
  }

  const normalizedSearch = search.trim().toLowerCase()
  const memberCongregationName = (member: OfficialMember) =>
    congregationDisplayName(member.congregacao, congregationList) || 'Congregação não informada'
  const visibleMembers = members
    .filter((member) => {
      const status = member.status ?? 'ativo'
      return statusFilter === 'todos' ? true : status === statusFilter
    })
    .filter((member) => {
      if (!normalizedSearch) {
        return true
      }

      return [member.nomeCompleto, member.congregacao, memberCongregationName(member), member.email, member.telefone].some((value) =>
        value?.toLowerCase().includes(normalizedSearch),
      )
    })
    .sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto, 'pt-BR'))

  async function handleStatusChange(member: OfficialMember, nextStatus: OfficialMember['status']) {
    const currentStatus = member.status ?? 'ativo'

    if (currentStatus === nextStatus) {
      return
    }

    setDeletingMemberId(member.id)
    setError('')
    setNotice('')

    try {
      await updateOfficialMemberStatus(member.id, nextStatus, firebaseUser?.uid)
      const actor = auditActorFor(firebaseUser, profile)
      if (actor) {
        await createAuditLog({
          action: 'member_status_changed',
          entityType: 'members',
          entityId: member.id,
          entityName: member.nomeCompleto,
          actor,
          summary: `Status do membro alterado de ${currentStatus} para ${nextStatus}.`,
          before: { status: currentStatus },
          after: { status: nextStatus },
          changedFields: ['status'],
        })
      }
      setNotice(`Status do cadastro de ${member.nomeCompleto} alterado para ${nextStatus}.`)
    } catch {
      setError('Não foi possível alterar o status deste cadastro.')
    } finally {
      setDeletingMemberId(null)
    }
  }

  async function handleDeleteMember(member: OfficialMember) {
    const confirmed = window.confirm(
      `Excluir o cadastro de ${member.nomeCompleto}? Ele sairá da lista de membros ativos.`,
    )

    if (!confirmed) {
      return
    }

    setDeletingMemberId(member.id)
    setError('')
    setNotice('')

    try {
      await deactivateOfficialMember(member.id, firebaseUser?.uid)
      const actor = auditActorFor(firebaseUser, profile)
      if (actor) {
        await createAuditLog({
          action: 'member_deactivated',
          entityType: 'members',
          entityId: member.id,
          entityName: member.nomeCompleto,
          actor,
          summary: 'Cadastro de membro excluído da lista ativa por inativação.',
          before: { status: member.status ?? 'ativo' },
          after: { status: 'inativo' },
          changedFields: ['status'],
        })
      }
      if (member.userId) {
        try {
          await updateUserRole(member.userId, 'pendente')
        } catch {
          // Section-limited admins may not have permission to change user roles.
        }
      }
      if (editingMember?.id === member.id) {
        setEditingMember(null)
      }
      setNotice(`Cadastro de ${member.nomeCompleto} excluído da lista de membros ativos.`)
    } catch {
      setError('Não foi possível excluir este cadastro.')
    } finally {
      setDeletingMemberId(null)
    }
  }

  return (
    <section className="admin-panel-block" id="membros-oficiais">
      <div className="admin-block-heading">
        <div className="section-heading">
          <p className="eyebrow">Cadastro oficial</p>
          <h2>Membros da igreja</h2>
          <p>Os cadastros entram nesta relação após a aprovação da solicitação.</p>
        </div>
        <span className="directory-total">
          <UsersRound aria-hidden="true" />
          {members.filter((member) => member.status !== 'inativo').length} ativos
        </span>
      </div>

      <label className="directory-search">
        <span>Buscar membro</span>
        <input
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Nome, congregação, e-mail ou telefone"
          type="search"
          value={search}
        />
      </label>

      <div className="request-filters">
        {[
          { value: 'ativo', label: 'Ativos', count: members.filter((member) => (member.status ?? 'ativo') === 'ativo').length },
          { value: 'inativo', label: 'Inativos', count: members.filter((member) => member.status === 'inativo').length },
          { value: 'todos', label: 'Todos', count: members.length },
        ].map((option) => (
          <button
            className={statusFilter === option.value ? 'active' : undefined}
            key={option.value}
            onClick={() => setStatusFilter(option.value as OfficialMember['status'] | 'todos')}
            type="button"
          >
            {option.label}
            <span>{option.count}</span>
          </button>
        ))}
      </div>

      {error ? <div className="form-alert error">{error}</div> : null}
      {notice ? <div className="form-alert success">{notice}</div> : null}

      {!loading && visibleMembers.length > 0 ? (
        <div className="member-table-wrap">
          <table className="member-table">
            <colgroup>
              <col className="member-col-number" />
              <col className="member-col-name" />
              <col className="member-col-congregation" />
              <col className="member-col-phone" />
              <col className="member-col-baptism" />
              <col className="member-col-status" />
              <col className="member-col-edit" />
              <col className="member-col-delete" />
            </colgroup>
            <thead>
              <tr>
                <th>Nº</th>
                <th>Nome</th>
                <th>Congregação</th>
                <th>Telefone</th>
                <th>Batismo</th>
                <th>Status</th>
                <th>Editar</th>
                <th>Excluir</th>
              </tr>
            </thead>
            <tbody>
              {visibleMembers.map((member, index) => (
                <tr key={member.id}>
                  <td>{index + 1}</td>
                  <td>
                    <div className="member-name-cell">
                      <span className={member.selfieArquivo ? 'member-photo-badge has-photo' : 'member-photo-badge'}>
                        {member.selfieArquivo ? 'Foto' : member.nomeCompleto.slice(0, 1).toUpperCase()}
                      </span>
                      <div>
                        <strong>{member.nomeCompleto}</strong>
                        <span>{member.email || 'Sem e-mail'}</span>
                        {member.selfieArquivo ? <span>Selfie: {member.selfieArquivo}</span> : <span>Sem selfie</span>}
                      </div>
                    </div>
                  </td>
                  <td>{memberCongregationName(member)}</td>
                  <td>{member.telefone || 'Sem telefone'}</td>
                  <td>{formatDateKey(member.dataBatismo)}</td>
                  <td>
                    <select
                      className="member-status-select"
                      disabled={deletingMemberId === member.id}
                      value={member.status ?? 'ativo'}
                      onChange={(event) => handleStatusChange(member, event.target.value as OfficialMember['status'])}
                    >
                      <option value="ativo">Ativo</option>
                      <option value="inativo">Inativo</option>
                    </select>
                  </td>
                  <td>
                    <button className="secondary-admin-action member-table-button" type="button" onClick={() => openMemberEditor(member)}>
                      <Pencil aria-hidden="true" />
                      Editar Cadastro
                    </button>
                  </td>
                  <td>
                    <button
                      className="reject-btn member-table-button"
                      disabled={deletingMemberId === member.id}
                      type="button"
                      onClick={() => handleDeleteMember(member)}
                    >
                      <Trash2 aria-hidden="true" />
                      {deletingMemberId === member.id ? 'Excluindo...' : 'Excluir'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {loading ? (
        <p className="source-note">Carregando membros...</p>
      ) : visibleMembers.length === 0 ? (
        <p className="source-note">
          {normalizedSearch ? 'Nenhum membro encontrado nesta busca.' : 'Nenhum membro oficial cadastrado ainda.'}
        </p>
      ) : (
        <div className="request-list">
          {visibleMembers.map((member) => (
            <article className="request-card" key={member.id}>
              <div className="request-main">
                <div className="request-head">
                  <strong>{member.nomeCompleto}</strong>
                  <span className="status-badge status-aprovado">ativo</span>
                </div>
                <div className="request-meta">
                  <span>{memberCongregationName(member)}</span>
                  <span>Batismo: {formatDateKey(member.dataBatismo)}</span>
                </div>
                <div className="request-contact">
                  <span>{member.email || 'Sem e-mail'}</span>
                  <span>{member.telefone || 'Sem telefone'}</span>
                  <span>Aprovado em {formatFirestoreDate(member.approvedAt)}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {editingMember ? (
        <div className="member-edit-modal-backdrop" role="presentation">
          <div aria-modal="true" className="member-edit-modal" role="dialog">
            <div className="member-edit-modal-head">
              <div>
                <p className="eyebrow">Alteração cadastral</p>
                <h3>{editingMember.nomeCompleto}</h3>
              </div>
              <button aria-label="Fechar alteração cadastral" className="icon-close-button" onClick={closeMemberEditor} type="button">
                <X aria-hidden="true" />
              </button>
            </div>

            {editConfirmation ? (
              <div className="member-edit-confirmation">
                <CheckCircle2 aria-hidden="true" />
                <h3>Cadastro atualizado</h3>
                <p>{editConfirmation}</p>
              </div>
            ) : (
              <MemberCadastroEditor
                mode="admin"
                record={editingMember}
                onCancel={closeMemberEditor}
                onSave={async (data) => {
                  const before = Object.fromEntries(
                    Object.keys(data).map((field) => [field, (editingMember as unknown as Record<string, unknown>)[field]]),
                  )
                  const after = data as Record<string, unknown>
                  const changedFields = auditChangedFields(before, after)
                  await updateOfficialMember(editingMember.id, data)
                  if (editingMember.userId) {
                    try {
                      await updateUserRegistrationProfile(editingMember.userId, data)
                    } catch {
                      // Section-limited admins may update members without permission to edit users.
                    }
                  }
                  const actor = auditActorFor(firebaseUser, profile)
                  if (actor && changedFields.length > 0) {
                    await createAuditLog({
                      action: 'member_updated',
                      entityType: 'members',
                      entityId: editingMember.id,
                      entityName: editingMember.nomeCompleto,
                      actor,
                      summary: `Cadastro de membro atualizado. Campos alterados: ${changedFields.join(', ')}.`,
                      before,
                      after,
                      changedFields,
                    })
                  }
                  setEditConfirmation(
                    `As alterações no cadastro de ${data.nomeCompleto || editingMember.nomeCompleto} foram salvas com sucesso.`,
                  )
                }}
              />
            )}
          </div>
        </div>
      ) : null}
    </section>
  )
}

function AuditLogPanel() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    return subscribeAuditLogs(
      (items) => {
        setLogs(items)
        setLoading(false)
      },
      () => {
        setError('Não foi possível carregar a auditoria do sistema.')
        setLoading(false)
      },
    )
  }, [])

  const normalizedSearch = search.trim().toLowerCase()
  const visibleLogs = logs.filter((log) => {
    if (!normalizedSearch) {
      return true
    }

    return [
      log.summary,
      log.actorName,
      log.actorEmail,
      log.action,
      log.entityType,
      log.entityName,
      log.entityId,
      ...(log.changedFields ?? []),
    ].some((value) => value?.toLowerCase().includes(normalizedSearch))
  })

  return (
    <section className="admin-panel-block">
      <div className="admin-block-heading">
        <div className="section-heading">
          <p className="eyebrow">Auditoria</p>
          <h2>Auditoria do sistema</h2>
          <p>Registro das principais alterações administrativas, com usuário, data, entidade e campos alterados.</p>
        </div>
        <span className="directory-total">
          <ScrollText aria-hidden="true" />
          {logs.length} registros
        </span>
      </div>

      <label className="directory-search">
        <span>Buscar na auditoria</span>
        <input
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Usuário, ação, entidade ou campo alterado"
          type="search"
          value={search}
        />
      </label>

      {error ? <div className="form-alert error">{error}</div> : null}

      {loading ? (
        <p className="source-note">Carregando auditoria...</p>
      ) : visibleLogs.length === 0 ? (
        <p className="source-note">Nenhum registro de auditoria encontrado.</p>
      ) : (
        <div className="audit-log-list">
          {visibleLogs.map((log) => (
            <article className="audit-log-card" key={log.id}>
              <div className="audit-log-head">
                <div>
                  <strong>{log.summary}</strong>
                  <span>{formatFirestoreDate(log.createdAt)}</span>
                </div>
                <span className="status-badge status-aprovado">{log.action}</span>
              </div>
              <div className="audit-log-grid">
                <span><strong>Usuário:</strong> {log.actorName || log.actorEmail || log.actorUid}</span>
                <span><strong>E-mail:</strong> {log.actorEmail || 'Não informado'}</span>
                <span><strong>Entidade:</strong> {log.entityType}</span>
                <span><strong>ID:</strong> {log.entityId}</span>
                <span><strong>Nome:</strong> {log.entityName || 'Não informado'}</span>
                <span><strong>Campos:</strong> {log.changedFields?.join(', ') || 'Não informado'}</span>
              </div>
              <details className="audit-log-details">
                <summary>Ver antes e depois</summary>
                <div>
                  <pre>{JSON.stringify(log.before ?? {}, null, 2)}</pre>
                  <pre>{JSON.stringify(log.after ?? {}, null, 2)}</pre>
                </div>
              </details>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function missingCongregadoToMemberFields(user: UserProfile): string[] {
  const required: Array<[boolean, string]> = [
    [Boolean(user.nomeCompleto), 'nome completo'],
    [Boolean(user.email), 'e-mail'],
    [Boolean(user.cpf), 'CPF'],
    [Boolean(user.telefone), 'telefone'],
    [Boolean(user.dataNascimento), 'data de nascimento'],
    [Boolean(user.sexo), 'sexo'],
    [Boolean(user.congregacao), 'congregação'],
    [Boolean(user.dataAceitacao), 'data de aceitação'],
    [Boolean(user.endereco?.pais), 'país'],
    [Boolean(user.endereco?.tipoLogradouro), 'tipo de logradouro'],
    [Boolean(user.endereco?.rua), 'nome do logradouro'],
    [Boolean(user.endereco?.numero), 'número do endereço'],
    [Boolean(user.endereco?.bairro), 'bairro'],
    [Boolean(user.endereco?.cidade), 'cidade'],
    [Boolean(user.endereco?.estado), 'estado'],
  ]

  return required.filter(([ok]) => !ok).map(([, label]) => label)
}

function missingCongregadoProfileFields(user: UserProfile): string[] {
  return missingCongregadoToMemberFields(user)
}

function missingMemberRoleFields(user: UserProfile, selectedCargo: ChurchRole | '', currentOtherCargo: string): string[] {
  const missing: string[] = []

  if (user.role !== 'membro') {
    missing.push('perfil precisa estar como membro')
  }

  if (!user.dataBatismo) {
    missing.push('data de batismo')
  }

  if (selectedCargo === 'outro' && !currentOtherCargo.trim()) {
    missing.push('descrição da outra função')
  }

  return missing
}

type ProgressionPerson = UserProfile & {
  progressionSource: 'user' | 'request'
  requestId?: string
  request?: MembershipRequest
}

function requestToProgressionPerson(request: MembershipRequest): ProgressionPerson {
  const role: SystemRole =
    request.tipoPessoa === 'congregado'
      ? 'congregado'
      : request.tipoPessoa === 'membro'
        ? 'membro'
        : 'visitante'

  return {
    uid: `request:${request.id}`,
    email: request.email,
    emailLower: request.emailLower,
    nomeCompleto: request.nomeCompleto,
    role,
    createdAt: typeof request.createdAt === 'string' ? request.createdAt : '',
    tipoPessoa: request.tipoPessoa,
    congregacao: request.congregacao,
    convidadoPor: request.convidadoPor,
    telefone: request.telefone,
    dataNascimento: request.dataNascimento,
    sexo: request.sexo || undefined,
    possuiWhatsapp: request.possuiWhatsapp,
    cpf: request.cpf,
    cpfDigits: request.cpfDigits,
    rg: request.rg,
    endereco: request.endereco,
    dataAceitacao: request.dataAceitacao,
    dataBatismo: request.dataBatismo,
    possuiCargo: request.possuiCargo,
    cargo: request.cargo,
    outroCargo: request.outroCargo,
    fotoModo: request.fotoModo,
    selfieArquivo: request.selfieArquivo,
    fotoArquivo: request.fotoArquivo,
    fotoVersoArquivo: request.fotoVersoArquivo,
    cartaMudancaPaginas: request.cartaMudancaPaginas,
    cartaMudancaArquivo: request.cartaMudancaArquivo,
    cartaRecomendacaoPaginas: request.cartaRecomendacaoPaginas,
    cartaRecomendacaoArquivo: request.cartaRecomendacaoArquivo,
    observacoes: request.observacoes,
    progressionSource: 'request',
    requestId: request.id,
    request,
  }
}

function userToProgressionPerson(user: UserProfile): ProgressionPerson {
  return { ...user, progressionSource: 'user' }
}

function progressionPersonMatchesFilter(person: ProgressionPerson, filter: ProgressionFilter): boolean {
  if (filter === 'todos') {
    return true
  }

  if (filter === 'visitante') {
    return person.role === 'visitante' && person.tipoPessoa !== 'convidado'
  }

  if (filter === 'convidado') {
    return person.tipoPessoa === 'convidado'
  }

  return person.role === filter || person.tipoPessoa === filter
}

function progressionPersonLabel(person: ProgressionPerson): string {
  if (person.tipoPessoa === 'convidado') {
    return 'Convidado'
  }

  if (person.tipoPessoa === 'visitante') {
    return 'Visitante'
  }

  return systemRoleLabels[person.role]
}

function ProfileProgressionManager() {
  const { firebaseUser } = useAuth()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [nominalRequests, setNominalRequests] = useState<MembershipRequest[]>([])
  const [progressionFilter, setProgressionFilter] = useState<ProgressionFilter>('todos')
  const [loading, setLoading] = useState(true)
  const [busyUid, setBusyUid] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editingPendingUser, setEditingPendingUser] = useState<ProgressionPerson | null>(null)
  const [progressionEditConfirmation, setProgressionEditConfirmation] = useState('')
  const baptismInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const otherCargoInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [baptismDates, setBaptismDates] = useState<Record<string, string>>({})
  const [cargoByUid, setCargoByUid] = useState<Record<string, ChurchRole | ''>>({})
  const [otherCargoByUid, setOtherCargoByUid] = useState<Record<string, string>>({})

  useEffect(() => {
    let usersReady = false
    let requestsReady = false

    function markLoaded(source: 'users' | 'requests') {
      if (source === 'users') {
        usersReady = true
      } else {
        requestsReady = true
      }

      if (usersReady && requestsReady) {
        setLoading(false)
      }
    }

    const unsubscribe = subscribeUsers(
      (items) => {
        setUsers(items)
        markLoaded('users')
      },
      () => {
        setError('Não foi possível carregar os perfis.')
        markLoaded('users')
      },
    )

    const unsubscribeRequests = subscribeMembershipRequests(
      (items) => {
        setNominalRequests(items)
        markLoaded('requests')
      },
      () => {
        setError('Não foi possível carregar os cadastros nominais.')
        markLoaded('requests')
      },
    )

    return () => {
      unsubscribe()
      unsubscribeRequests()
    }
  }, [])

  const progressionPeople = [
    ...users
      .filter((user) => ['visitante', 'congregado', 'membro'].includes(user.role))
      .map(userToProgressionPerson),
    ...nominalRequests
      .filter((request) => !request.userId && request.status !== 'rejeitado')
      .filter((request) => ['visitante', 'convidado', 'congregado', 'membro'].includes(request.tipoPessoa))
      .map(requestToProgressionPerson),
  ].sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto, 'pt-BR'))

  const filterCounts = progressionFilters.reduce<Record<ProgressionFilter, number>>(
    (acc, filter) => {
      acc[filter.value] = progressionPeople.filter((person) => progressionPersonMatchesFilter(person, filter.value)).length
      return acc
    },
    { todos: 0, visitante: 0, convidado: 0, congregado: 0, membro: 0 },
  )

  const visible = progressionPeople
    .filter((person) => progressionPersonMatchesFilter(person, progressionFilter))
    .filter((user) => ['visitante', 'congregado', 'membro'].includes(user.role))

  async function runAction(uid: string, action: () => Promise<void>) {
    setBusyUid(uid)
    setError('')
    setNotice('')

    try {
      await action()
    } catch {
      setError('Não foi possível atualizar este perfil.')
    } finally {
      setBusyUid(null)
    }
  }

  function openPendingEditor(user: ProgressionPerson) {
    setError('')
    setNotice('')
    setProgressionEditConfirmation('')
    setEditingPendingUser(user)
  }

  function closeProgressionEditor() {
    setProgressionEditConfirmation('')
    setEditingPendingUser(null)
  }

  function focusPendingInput(input: HTMLInputElement | null | undefined) {
    if (!input) {
      return
    }

    setError('')
    setNotice('')
    input.scrollIntoView({ behavior: 'smooth', block: 'center' })
    window.setTimeout(() => input.focus(), 120)
  }

  return (
    <section className="admin-panel-block">
      <div className="section-heading">
        <p className="eyebrow">Perfis</p>
        <h2>Progressão espiritual e cargos</h2>
        <p>Promova visitante/convidado para congregado, congregado para membro e membro para função ministerial.</p>
      </div>

      <div className="request-filters progression-tabs" aria-label="Filtrar progressão espiritual">
        {progressionFilters.map((filter) => (
          <button
            className={progressionFilter === filter.value ? 'active' : undefined}
            key={filter.value}
            onClick={() => setProgressionFilter(filter.value)}
            type="button"
          >
            {filter.label}
            <span>{filterCounts[filter.value]}</span>
          </button>
        ))}
      </div>

      {error ? <div className="form-alert error">{error}</div> : null}
      {notice ? <div className="form-alert success">{notice}</div> : null}

      {loading ? (
        <p className="source-note">Carregando perfis...</p>
      ) : visible.length === 0 ? (
        <p className="source-note">Nenhum perfil elegível no momento.</p>
      ) : (
        <div className="progression-list">
          {visible.map((user, index) => {
            const selectedCargo = cargoByUid[user.uid] ?? user.cargo ?? ''
            const currentOtherCargo = otherCargoByUid[user.uid] ?? user.outroCargo ?? ''
            const congregadoMissingFields = missingCongregadoToMemberFields(user)
            const congregadoProfileMissingFields = missingCongregadoProfileFields(user)
            const roleMissingFields = missingMemberRoleFields(user, selectedCargo, currentOtherCargo)
            const isCongregadoComplete = congregadoMissingFields.length === 0
            const memberPromotionMissing = [
              ...congregadoMissingFields,
              ...(!baptismDates[user.uid] ? ['data de batismo para promoção'] : []),
            ]
            const shouldEditCongregadoProfile = congregadoMissingFields.length > 0
            const shouldEditMemberProfile = roleMissingFields.some((field) => field !== 'descrição da outra função')
            const photoSrc = displayablePhotoSrc(user.selfieArquivo)

            return (
              <article className="progression-row" key={user.uid}>
                <div className="progression-person">
                  <span className="progression-number">{index + 1}</span>
                  <span
                    className={
                      user.selfieArquivo
                        ? 'progression-photo-slot has-photo'
                        : 'progression-photo-slot empty-photo'
                    }
                    title={user.selfieArquivo ? `Foto cadastrada: ${user.selfieArquivo}` : 'Foto pendente'}
                  >
                    {photoSrc ? <img src={photoSrc} alt="" /> : user.selfieArquivo ? 'Foto' : null}
                  </span>
                  <div>
                    <strong>{user.nomeCompleto}</strong>
                    <span>{user.email}</span>
                    {user.selfieArquivo ? <span>Selfie: {user.selfieArquivo}</span> : <span>Foto pendente</span>}
                    <span className={`status-badge status-${user.tipoPessoa === 'convidado' ? 'convidado' : user.role}`}>
                      {progressionPersonLabel(user)}
                    </span>
                  </div>
                </div>

                {user.role === 'visitante' ? (
                  <div className="progression-actions">
                    <span className="ready-note">Pode ser tornado congregado agora.</span>
                    {congregadoProfileMissingFields.length === 0 ? (
                      <button className="secondary-admin-action" type="button" onClick={() => openPendingEditor(user)}>
                        <Pencil aria-hidden="true" />
                        Editar cadastro
                      </button>
                    ) : null}
                    {congregadoProfileMissingFields.length > 0 ? (
                      <div className="progression-pending-detail">
                        <strong>Depois da promoção, ainda precisará completar:</strong>
                        <span>{congregadoProfileMissingFields.join(', ')}</span>
                        <button className="secondary-admin-action" type="button" onClick={() => openPendingEditor(user)}>
                          <Pencil aria-hidden="true" />
                          Editar cadastro
                        </button>
                      </div>
                    ) : null}
                    <button
                      className="primary-action"
                      disabled={busyUid === user.uid}
                      onClick={() =>
                        runAction(user.uid, () =>
                          user.progressionSource === 'request' && user.requestId
                            ? updateMembershipRequestProfile(user.requestId, {
                                tipoPessoa: 'congregado',
                                possuiCargo: false,
                                cargo: undefined,
                                outroCargo: '',
                                dataBatismo: '',
                              })
                            : promoteVisitorToCongregado(user.uid),
                        )
                      }
                      type="button"
                    >
                      Tornar congregado
                    </button>
                  </div>
                ) : null}

                {user.role === 'congregado' ? (
                  <div className="progression-actions">
                    <span className={congregadoMissingFields.length === 0 ? 'ready-note' : 'pending-note'}>
                      {isCongregadoComplete ? 'Dados completos' : 'Aguardando dados completos do usuário'}
                    </span>
                    {congregadoMissingFields.length === 0 ? (
                      <button className="secondary-admin-action" type="button" onClick={() => openPendingEditor(user)}>
                        <Pencil aria-hidden="true" />
                        Editar cadastro
                      </button>
                    ) : null}
                    {memberPromotionMissing.length > 0 ? (
                      <div className="progression-pending-detail">
                        <strong>Falta preencher/informar:</strong>
                        <span>{memberPromotionMissing.join(', ')}</span>
                        <button
                          className="secondary-admin-action"
                          type="button"
                          onClick={() =>
                            shouldEditCongregadoProfile
                              ? openPendingEditor(user)
                              : focusPendingInput(baptismInputRefs.current[user.uid])
                          }
                        >
                          <Pencil aria-hidden="true" />
                          {shouldEditCongregadoProfile ? 'Resolver pendência' : 'Informar batismo'}
                        </button>
                      </div>
                    ) : null}
                    <label>
                      Data de batismo
                      <input
                        ref={(element) => {
                          baptismInputRefs.current[user.uid] = element
                        }}
                        type="date"
                        value={baptismDates[user.uid] ?? ''}
                        onChange={(event) =>
                          setBaptismDates((current) => ({ ...current, [user.uid]: event.target.value }))
                        }
                      />
                    </label>
                    <button
                      className="primary-action"
                      disabled={busyUid === user.uid || memberPromotionMissing.length > 0}
                      onClick={() =>
                        runAction(user.uid, () => {
                          if (user.progressionSource === 'request' && user.request && firebaseUser) {
                            return promoteNominalCongregadoRequestToMembro(user.request, baptismDates[user.uid], firebaseUser.uid)
                          }

                          return promoteCongregadoToMembro(user.uid, baptismDates[user.uid])
                        })
                      }
                      type="button"
                    >
                      Promover a membro
                    </button>
                  </div>
                ) : null}

                {user.role === 'membro' ? (
                  <div className="progression-actions">
                    {roleMissingFields.length > 0 ? (
                      <div className="progression-pending-detail">
                        <strong>Pendência para atribuir função/cargo:</strong>
                        <span>{roleMissingFields.join(', ')}</span>
                        <button
                          className="secondary-admin-action"
                          type="button"
                          onClick={() =>
                            shouldEditMemberProfile
                              ? openPendingEditor(user)
                              : focusPendingInput(otherCargoInputRefs.current[user.uid])
                          }
                        >
                          <Pencil aria-hidden="true" />
                          {shouldEditMemberProfile ? 'Resolver pendência' : 'Especificar função'}
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="ready-note">Membro apto para receber ou alterar função.</span>
                        <button className="secondary-admin-action" type="button" onClick={() => openPendingEditor(user)}>
                          <Pencil aria-hidden="true" />
                          Editar cadastro
                        </button>
                      </>
                    )}
                    <label>
                      Cargo/função
                      <select
                        value={selectedCargo}
                        onChange={(event) =>
                          setCargoByUid((current) => ({ ...current, [user.uid]: event.target.value as ChurchRole | '' }))
                        }
                      >
                        <option value="">Sem cargo</option>
                        {churchRoleOptions.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    {selectedCargo === 'outro' ? (
                      <label>
                        Especificar
                        <input
                          ref={(element) => {
                            otherCargoInputRefs.current[user.uid] = element
                          }}
                          value={currentOtherCargo}
                          onChange={(event) =>
                            setOtherCargoByUid((current) => ({ ...current, [user.uid]: event.target.value }))
                          }
                        />
                      </label>
                    ) : null}
                    <button
                      className="primary-action"
                      disabled={busyUid === user.uid || roleMissingFields.length > 0}
                      onClick={() =>
                        runAction(user.uid, () =>
                          user.progressionSource === 'request' && user.requestId
                            ? updateMembershipRequestProfile(user.requestId, {
                                possuiCargo: Boolean(selectedCargo),
                                cargo: selectedCargo || undefined,
                                outroCargo: selectedCargo === 'outro' ? currentOtherCargo : '',
                              })
                            : updateMemberChurchRole(
                                user.uid,
                                selectedCargo || undefined,
                                selectedCargo === 'outro' ? currentOtherCargo : undefined,
                              ),
                        )
                      }
                      type="button"
                    >
                      Salvar função
                    </button>
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      )}

      {editingPendingUser ? (
        <div className="member-edit-modal-backdrop" role="presentation">
          <div aria-modal="true" className="member-edit-modal" role="dialog">
            <div className="member-edit-modal-head">
              <div>
                <p className="eyebrow">Progressão espiritual</p>
                <h3>{editingPendingUser.nomeCompleto}</h3>
                <p>Atualize o cadastro para resolver pendências ou revisar os dados completos.</p>
              </div>
              <button aria-label="Fechar alteração cadastral" className="icon-close-button" onClick={closeProgressionEditor} type="button">
                <X aria-hidden="true" />
              </button>
            </div>

            {progressionEditConfirmation ? (
              <div className="member-edit-confirmation">
                <CheckCircle2 aria-hidden="true" />
                <h3>Cadastro atualizado</h3>
                <p>{progressionEditConfirmation}</p>
              </div>
            ) : (
              <MemberCadastroEditor
                extraRequiredFields={editingPendingUser.role === 'membro' ? ['dataBatismo'] : []}
                highlightMissingRequired
                mode="admin"
                record={editingPendingUser}
                onCancel={closeProgressionEditor}
                onSave={async (data) => {
                  if (editingPendingUser.progressionSource === 'request' && editingPendingUser.requestId) {
                    await updateMembershipRequestProfile(editingPendingUser.requestId, data)
                  } else {
                    await updateUserRegistrationProfile(editingPendingUser.uid, data)
                  }
                  setNotice('Pendência atualizada. Confira se a progressão já foi liberada.')
                  setProgressionEditConfirmation(
                    `As pendências de ${data.nomeCompleto || editingPendingUser.nomeCompleto} foram atualizadas com sucesso.`,
                  )
                }}
              />
            )}
          </div>
        </div>
      ) : null}
    </section>
  )
}

function UserAccessManager() {
  const { firebaseUser, profile } = useAuth()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyUid, setBusyUid] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = subscribeUsers(
      (items) => {
        setUsers(items)
        setLoading(false)
      },
      () => {
        setError('Não foi possível carregar os usuários.')
        setLoading(false)
      },
    )

    return unsubscribe
  }, [])

  async function changeRole(uid: string, role: SystemRole) {
    setBusyUid(uid)
    setError('')

    try {
      await updateUserRole(uid, role)
    } catch {
      setError('Não foi possível atualizar o perfil de acesso.')
    } finally {
      setBusyUid(null)
    }
  }

  async function toggleSectionAccess(user: UserProfile, section: AdminSectionKey) {
    setBusyUid(user.uid)
    setError('')

    const currentAccess = user.adminSectionAccess ?? []
    const nextAccess = currentAccess.includes(section)
      ? currentAccess.filter((item) => item !== section)
      : [...currentAccess, section]

    try {
      await updateUserAdminSectionAccess(user.uid, nextAccess)
    } catch {
      setError('NÃ£o foi possÃ­vel atualizar as seÃ§Ãµes deste usuÃ¡rio.')
    } finally {
      setBusyUid(null)
    }
  }

  const sorted = users
    .filter((user) => user.role !== 'visitante')
    .sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto, 'pt-BR'))
  const canManageUsers = profile?.role === 'admin'

  return (
    <section className="admin-panel-block">
      <div className="section-heading">
        <p className="eyebrow">Acessos</p>
        <h2>Usuários e permissões por seção</h2>
        <p>Defina o perfil do usuário e quais seções administrativas ele pode acessar.</p>
      </div>

      {error ? <div className="form-alert error">{error}</div> : null}
      {!canManageUsers ? (
        <div className="form-alert error">Somente administrador pode alterar perfis e permissÃµes de usuÃ¡rios.</div>
      ) : null}

      {loading ? (
        <p className="source-note">Carregando usuários...</p>
      ) : sorted.length === 0 ? (
        <p className="source-note">Nenhum acesso criado ainda.</p>
      ) : (
        <div className="access-list">
          {sorted.map((user) => {
            const isSelf = user.uid === firebaseUser?.uid

            return (
              <article className="access-row" key={user.uid}>
                <div className="access-person">
                  <strong>{user.nomeCompleto}</strong>
                  <span>{user.email}</span>
                </div>
                <div className="access-control">
                  <span className={`status-badge status-${user.role}`}>{systemRoleLabels[user.role]}</span>
                  <label>
                    Perfil
                    <select
                      disabled={busyUid === user.uid || isSelf || !canManageUsers}
                      onChange={(event) => changeRole(user.uid, event.target.value as SystemRole)}
                      value={user.role}
                    >
                      {assignableRoles.map((role) => (
                        <option key={role} value={role}>
                          {systemRoleLabels[role]}
                        </option>
                      ))}
                    </select>
                  </label>
                  {isSelf ? <small>Você não pode alterar o próprio perfil.</small> : null}
                  <div className="admin-section-access">
                    <strong>Seções liberadas</strong>
                    {user.role === 'admin' ? (
                      <span>Administrador acessa todas as seções automaticamente.</span>
                    ) : (
                      <div>
                        {adminSections.map((section) => (
                          <label className="checkbox-line" key={section.key}>
                            <input
                              checked={(user.adminSectionAccess ?? []).includes(section.key)}
                              disabled={busyUid === user.uid || isSelf || !canManageUsers}
                              onChange={() => toggleSectionAccess(user, section.key)}
                              type="checkbox"
                            />
                            {section.title}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

function VisitorTracking() {
  const [records, setRecords] = useState<VisitRecord[]>([])
  const [congregationList, setCongregationList] = useState<Congregation[]>(fallbackCongregations)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [congregationFilter, setCongregationFilter] = useState('todos')
  const [categoryFilter, setCategoryFilter] = useState<CongregationCategory | 'todos'>('todos')

  useEffect(() => {
    let recordsLoaded = false
    let congregationsLoaded = false

    function finishLoading() {
      if (recordsLoaded && congregationsLoaded) {
        setLoading(false)
      }
    }

    const unsubscribeRecords = subscribeVisitRecords(
      (items) => {
        setRecords(items)
        recordsLoaded = true
        finishLoading()
      },
      () => {
        setError('Não foi possível carregar os registros de presença.')
        recordsLoaded = true
        finishLoading()
      },
    )

    const unsubscribeCongregations = subscribeCongregations(
      (items) => {
        setCongregationList(items)
        congregationsLoaded = true
        finishLoading()
      },
      () => {
        setError('Não foi possível carregar as congregações.')
        congregationsLoaded = true
        finishLoading()
      },
    )

    return () => {
      unsubscribeRecords()
      unsubscribeCongregations()
    }
  }, [])

  const congregationById = new Map(congregationList.map((congregation) => [congregation.id, congregation]))

  const filteredRecords = records
    .filter((record) => (dateFilter ? record.visitDate === dateFilter : true))
    .filter((record) => (congregationFilter === 'todos' ? true : record.congregationId === congregationFilter))
    .filter((record) => {
      if (categoryFilter === 'todos') {
        return true
      }

      return congregationById.get(record.congregationId)?.categoria === categoryFilter
    })
    .sort((a, b) => firestoreDateValue(b.registeredAt) - firestoreDateValue(a.registeredAt))

  const totalVisitantes = filteredRecords.filter((record) => record.tipoPessoa === 'visitante').length
  const totalConvidados = filteredRecords.filter((record) => record.tipoPessoa === 'convidado').length
  const selectedMapCongregation =
    congregationFilter !== 'todos'
      ? congregationById.get(congregationFilter)
      : congregationById.get(filteredRecords[0]?.congregationId ?? '')

  return (
    <section className="admin-panel-block">
      <div className="section-heading">
        <p className="eyebrow">Dashboard</p>
        <h2>Análise de registros</h2>
        <p>Registros nominais de visitantes e convidados, por data, culto e igreja.</p>
      </div>

      {error ? <div className="form-alert error">{error}</div> : null}

      <div className="tracking-filters">
        <label>
          Data
          <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
        </label>
        <label>
          Classificação
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as CongregationCategory | 'todos')}>
            <option value="todos">Todas</option>
            {Object.entries(congregationCategoryLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Igreja
          <select value={congregationFilter} onChange={(event) => setCongregationFilter(event.target.value)}>
            <option value="todos">Todas</option>
            {congregationList
              .filter((congregation) => congregation.ativa !== false)
              .map((congregation) => (
                <option key={congregation.id} value={congregation.id}>
                  {congregation.nome}
                </option>
              ))}
          </select>
        </label>
      </div>

      <div className="tracking-metrics">
        <div>
          <span>Visitantes</span>
          <strong>{totalVisitantes}</strong>
        </div>
        <div>
          <span>Convidados</span>
          <strong>{totalConvidados}</strong>
        </div>
        <div>
          <span>Registros</span>
          <strong>{filteredRecords.length}</strong>
        </div>
      </div>

      <CongregationMiniMap congregation={selectedMapCongregation} />

      {loading ? (
        <p className="source-note">Carregando registros...</p>
      ) : filteredRecords.length === 0 ? (
        <p className="source-note">Nenhum registro encontrado para os filtros atuais.</p>
      ) : (
        <div className="table-panel">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Data</th>
                <th>Dia</th>
                <th>Hora</th>
                <th>Culto</th>
                <th>Igreja</th>
                <th>Classificação</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => {
                const congregation = congregationById.get(record.congregationId)
                return (
                  <tr key={record.id}>
                    <td>{record.nomeCompleto}</td>
                    <td>{visitTypeLabels[record.tipoPessoa]}</td>
                    <td>{new Date(`${record.visitDate}T12:00:00`).toLocaleDateString('pt-BR')}</td>
                    <td>{record.visitWeekdayLabel || weekdayLabelFromDateKey(record.visitDate)}</td>
                    <td>{formatFirestoreTime(record.registeredAt)}</td>
                    <td>{visitSessionLabels[record.session]}</td>
                    <td>{congregation?.nome ?? record.congregationName}</td>
                    <td>{congregationCategoryLabels[congregation?.categoria ?? 'capital']}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

const dashboardWeekdayOptions = [
  { value: '0', label: 'Domingo' },
  { value: '1', label: 'Segunda-feira' },
  { value: '2', label: 'Terça-feira' },
  { value: '3', label: 'Quarta-feira' },
  { value: '4', label: 'Quinta-feira' },
  { value: '5', label: 'Sexta-feira' },
  { value: '6', label: 'Sábado' },
]

const dashboardSourceLabels: Record<'self' | 'admin', string> = {
  self: 'Cadastro com login',
  admin: 'Lançado pela administração',
}

function normalizeDashboardSearch(value?: string): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function visitRecordSource(record: VisitRecord): 'self' | 'admin' {
  return record.source === 'admin' || record.userId?.startsWith('nominal-') ? 'admin' : 'self'
}

function visitRecordSourceLabel(record: VisitRecord): string {
  return dashboardSourceLabels[visitRecordSource(record)]
}

function csvCell(value: string | number | undefined): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

function topGroupedRecords(
  records: VisitRecord[],
  keyFor: (record: VisitRecord) => string,
  labelFor?: (key: string, firstRecord: VisitRecord) => string,
): Array<{ key: string; label: string; count: number }> {
  const groups = new Map<string, { key: string; label: string; count: number }>()

  records.forEach((record) => {
    const key = keyFor(record) || 'sem_informacao'
    const current = groups.get(key)

    if (current) {
      current.count += 1
      return
    }

    groups.set(key, {
      key,
      label: labelFor?.(key, record) ?? key,
      count: 1,
    })
  })

  return Array.from(groups.values()).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'pt-BR'))
}

function VisitorWorshipReport() {
  const [records, setRecords] = useState<VisitRecord[]>([])
  const [congregationList, setCongregationList] = useState<Congregation[]>(fallbackCongregations)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [reportDate, setReportDate] = useState(todayKey())
  const [sessionFilter, setSessionFilter] = useState<VisitSession | 'todos'>('todos')
  const [congregationFilter, setCongregationFilter] = useState('todos')
  const [categoryFilter, setCategoryFilter] = useState<CongregationCategory | 'todos'>('todos')
  const [typeFilter, setTypeFilter] = useState<VisitPersonType | 'todos'>('todos')

  useEffect(() => {
    let recordsLoaded = false
    let congregationsLoaded = false

    function finishLoading() {
      if (recordsLoaded && congregationsLoaded) {
        setLoading(false)
      }
    }

    const unsubscribeRecords = subscribeVisitRecords(
      (items) => {
        setRecords(items)
        recordsLoaded = true
        finishLoading()
      },
      () => {
        setError('Não foi possível carregar os registros para o relatório.')
        recordsLoaded = true
        finishLoading()
      },
    )

    const unsubscribeCongregations = subscribeCongregations(
      (items) => {
        setCongregationList(items)
        congregationsLoaded = true
        finishLoading()
      },
      () => {
        setError('Não foi possível carregar as congregações.')
        congregationsLoaded = true
        finishLoading()
      },
    )

    return () => {
      unsubscribeRecords()
      unsubscribeCongregations()
    }
  }, [])

  const congregationById = new Map(congregationList.map((congregation) => [congregation.id, congregation]))
  const activeCongregations = congregationList.filter((congregation) => congregation.ativa !== false)
  const reportRecords = records
    .filter((record) => record.visitDate === reportDate)
    .filter((record) => (sessionFilter === 'todos' ? true : record.session === sessionFilter))
    .filter((record) => (congregationFilter === 'todos' ? true : record.congregationId === congregationFilter))
    .filter((record) => {
      if (categoryFilter === 'todos') {
        return true
      }

      return congregationById.get(record.congregationId)?.categoria === categoryFilter
    })
    .filter((record) => (typeFilter === 'todos' ? true : record.tipoPessoa === typeFilter))
    .sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto, 'pt-BR'))

  const visitorRecords = reportRecords.filter((record) => record.tipoPessoa === 'visitante')
  const guestRecords = reportRecords.filter((record) => record.tipoPessoa === 'convidado')
  const selectedCongregation = congregationFilter !== 'todos' ? congregationById.get(congregationFilter) : undefined
  const selectedCategoryLabel =
    categoryFilter !== 'todos'
      ? congregationCategoryLabels[categoryFilter]
      : selectedCongregation
        ? congregationCategoryLabels[selectedCongregation.categoria ?? 'capital']
        : 'Todas as classificações'
  const selectedSessionLabel = sessionFilter === 'todos' ? 'Todos os cultos/atividades' : visitSessionLabels[sessionFilter]
  const reportTitle = `Relatório de visitantes e convidados - ${formatDateKey(reportDate)}`
  const reportReadText =
    reportRecords.length === 0
      ? `Nesta data, não há visitantes ou convidados registrados para os filtros selecionados.`
      : [
          `A igreja registra com alegria a presença de ${visitorRecords.length} visitante(s) e ${guestRecords.length} convidado(s) neste culto.`,
          visitorRecords.length ? `Visitante(s): ${visitorRecords.map((record) => record.nomeCompleto).join(', ')}.` : '',
          guestRecords.length
            ? `Convidado(s): ${guestRecords
                .map((record) => `${record.nomeCompleto}${record.convidadoPor ? `, convidado(a) por ${record.convidadoPor}` : ''}`)
                .join('; ')}.`
            : '',
          'Sejam todos bem-vindos em nome de Jesus.',
        ]
          .filter(Boolean)
          .join('\n')

  async function copyReportText() {
    try {
      await navigator.clipboard.writeText(reportReadText)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2500)
    } catch {
      setError('Não foi possível copiar o texto automaticamente.')
    }
  }

  return (
    <section className="admin-panel-block visitor-report-panel">
      <div className="section-heading">
        <p className="eyebrow">Relatório</p>
        <h2>Relatório de visitantes e convidados</h2>
        <p>Lista nominal e texto pronto para leitura durante o culto.</p>
      </div>

      {error ? <div className="form-alert error">{error}</div> : null}

      <div className="visitor-report-controls">
        <label>
          Data do culto
          <input type="date" value={reportDate} onChange={(event) => setReportDate(event.target.value)} />
        </label>
        <label>
          Culto/atividade
          <select value={sessionFilter} onChange={(event) => setSessionFilter(event.target.value as VisitSession | 'todos')}>
            <option value="todos">Todos</option>
            {Object.entries(visitSessionLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Igreja
          <select value={congregationFilter} onChange={(event) => setCongregationFilter(event.target.value)}>
            <option value="todos">Todas</option>
            {activeCongregations.map((congregation) => (
              <option key={congregation.id} value={congregation.id}>
                {congregation.nome}
              </option>
            ))}
          </select>
        </label>
        <label>
          Classificação
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as CongregationCategory | 'todos')}>
            <option value="todos">Todas</option>
            {Object.entries(congregationCategoryLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tipo
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as VisitPersonType | 'todos')}>
            <option value="todos">Todos</option>
            <option value="visitante">Visitantes</option>
            <option value="convidado">Convidados</option>
          </select>
        </label>
      </div>

      <div className="visitor-report-summary">
        <div>
          <span>Total</span>
          <strong>{reportRecords.length}</strong>
        </div>
        <div>
          <span>Visitantes</span>
          <strong>{visitorRecords.length}</strong>
        </div>
        <div>
          <span>Convidados</span>
          <strong>{guestRecords.length}</strong>
        </div>
      </div>

      <article className="worship-reading-card">
        <div className="worship-reading-heading">
          <div>
            <span>{reportTitle}</span>
            <h3>{selectedSessionLabel}</h3>
            <p>
              {selectedCongregation?.nome ?? 'Todas as igrejas/congregações'} · {selectedCategoryLabel}
            </p>
          </div>
          <div className="visitor-report-actions">
            <button className="secondary-admin-action" onClick={copyReportText} type="button">
              Copiar texto
            </button>
            <button className="secondary-admin-action" onClick={() => window.print()} type="button">
              Imprimir
            </button>
          </div>
        </div>
        <pre>{reportReadText}</pre>
        {copied ? <div className="form-alert success">Texto copiado para leitura.</div> : null}
      </article>

      {loading ? (
        <p className="source-note">Carregando registros...</p>
      ) : reportRecords.length === 0 ? (
        <p className="source-note">Nenhum visitante ou convidado encontrado para os filtros selecionados.</p>
      ) : (
        <div className="visitor-report-list">
          {reportRecords.map((record, index) => {
            const congregation = congregationById.get(record.congregationId)
            return (
              <article key={record.id}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <strong>{record.nomeCompleto}</strong>
                  <p>
                    {visitTypeLabels[record.tipoPessoa]} · {visitSessionLabels[record.session]} ·{' '}
                    {congregation?.nome ?? record.congregationName} ·{' '}
                    {congregation ? congregationCategoryLabels[congregation.categoria ?? 'capital'] : 'Sem classificação'}
                  </p>
                  {record.convidadoPor ? <small>Convidado por: {record.convidadoPor}</small> : null}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

function RecordsDashboard() {
  const [records, setRecords] = useState<VisitRecord[]>([])
  const [congregationList, setCongregationList] = useState<Congregation[]>(fallbackCongregations)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFromFilter, setDateFromFilter] = useState('')
  const [dateToFilter, setDateToFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<VisitPersonType | 'todos'>('todos')
  const [sessionFilter, setSessionFilter] = useState<VisitSession | 'todos'>('todos')
  const [weekdayFilter, setWeekdayFilter] = useState('todos')
  const [sourceFilter, setSourceFilter] = useState<'todos' | 'self' | 'admin'>('todos')
  const [congregationFilter, setCongregationFilter] = useState('todos')
  const [categoryFilter, setCategoryFilter] = useState<CongregationCategory | 'todos'>('todos')

  useEffect(() => {
    let recordsLoaded = false
    let congregationsLoaded = false

    function finishLoading() {
      if (recordsLoaded && congregationsLoaded) {
        setLoading(false)
      }
    }

    const unsubscribeRecords = subscribeVisitRecords(
      (items) => {
        setRecords(items)
        recordsLoaded = true
        finishLoading()
      },
      () => {
        setError('Não foi possível carregar os registros de presença.')
        recordsLoaded = true
        finishLoading()
      },
    )

    const unsubscribeCongregations = subscribeCongregations(
      (items) => {
        setCongregationList(items)
        congregationsLoaded = true
        finishLoading()
      },
      () => {
        setError('Não foi possível carregar as congregações.')
        congregationsLoaded = true
        finishLoading()
      },
    )

    return () => {
      unsubscribeRecords()
      unsubscribeCongregations()
    }
  }, [])

  const congregationById = new Map(congregationList.map((congregation) => [congregation.id, congregation]))
  const activeCongregations = congregationList.filter((congregation) => congregation.ativa !== false)
  const searchNeedle = normalizeDashboardSearch(searchTerm)

  const filteredRecords = records
    .filter((record) => (dateFromFilter ? record.visitDate >= dateFromFilter : true))
    .filter((record) => (dateToFilter ? record.visitDate <= dateToFilter : true))
    .filter((record) => (typeFilter === 'todos' ? true : record.tipoPessoa === typeFilter))
    .filter((record) => (sessionFilter === 'todos' ? true : record.session === sessionFilter))
    .filter((record) => {
      if (weekdayFilter === 'todos') {
        return true
      }

      const weekday = record.visitWeekday ?? new Date(`${record.visitDate}T12:00:00`).getDay()
      return String(weekday) === weekdayFilter
    })
    .filter((record) => (sourceFilter === 'todos' ? true : visitRecordSource(record) === sourceFilter))
    .filter((record) => (congregationFilter === 'todos' ? true : record.congregationId === congregationFilter))
    .filter((record) => {
      if (categoryFilter === 'todos') {
        return true
      }

      return congregationById.get(record.congregationId)?.categoria === categoryFilter
    })
    .filter((record) => {
      if (!searchNeedle) {
        return true
      }

      const congregation = congregationById.get(record.congregationId)
      const searchable = [
        record.nomeCompleto,
        visitTypeLabels[record.tipoPessoa],
        record.convidadoPor,
        record.congregationName,
        congregation?.nome,
        congregation?.endereco,
        congregation ? congregationCategoryLabels[congregation.categoria ?? 'capital'] : '',
        visitSessionLabels[record.session],
        record.visitWeekdayLabel || weekdayLabelFromDateKey(record.visitDate),
        visitRecordSourceLabel(record),
      ]

      return searchable.some((value) => normalizeDashboardSearch(value).includes(searchNeedle))
    })
    .sort((a, b) => {
      if (a.visitDate !== b.visitDate) {
        return b.visitDate.localeCompare(a.visitDate)
      }

      return firestoreDateValue(b.registeredAt) - firestoreDateValue(a.registeredAt)
    })

  const totalVisitantes = filteredRecords.filter((record) => record.tipoPessoa === 'visitante').length
  const totalConvidados = filteredRecords.filter((record) => record.tipoPessoa === 'convidado').length
  const uniquePeople = new Set(filteredRecords.map((record) => `${record.tipoPessoa}:${normalizeDashboardSearch(record.nomeCompleto)}`)).size
  const uniqueCongregations = new Set(filteredRecords.map((record) => record.congregationId || record.congregationName)).size
  const adminRecords = filteredRecords.filter((record) => visitRecordSource(record) === 'admin').length
  const selfRecords = filteredRecords.filter((record) => visitRecordSource(record) === 'self').length
  const topCongregationId = topGroupedRecords(filteredRecords, (record) => record.congregationId)[0]?.key
  const selectedMapCongregation =
    congregationFilter !== 'todos'
      ? congregationById.get(congregationFilter)
      : topCongregationId
        ? congregationById.get(topCongregationId)
        : congregationById.get(filteredRecords[0]?.congregationId ?? '')

  const byType = topGroupedRecords(filteredRecords, (record) => record.tipoPessoa, (key) => visitTypeLabels[key as VisitPersonType])
  const bySession = topGroupedRecords(filteredRecords, (record) => record.session, (key) => visitSessionLabels[key as VisitSession])
  const byWeekday = topGroupedRecords(
    filteredRecords,
    (record) => String(record.visitWeekday ?? new Date(`${record.visitDate}T12:00:00`).getDay()),
    (key) => dashboardWeekdayOptions.find((option) => option.value === key)?.label ?? key,
  )
  const bySource = topGroupedRecords(filteredRecords, (record) => visitRecordSource(record), (key) => dashboardSourceLabels[key as 'self' | 'admin'])
  const byCongregation = topGroupedRecords(
    filteredRecords,
    (record) => record.congregationId || record.congregationName,
    (key, record) => congregationById.get(key)?.nome ?? record.congregationName,
  )
  const byCategory = topGroupedRecords(
    filteredRecords,
    (record) => congregationById.get(record.congregationId)?.categoria ?? 'sem_categoria',
    (key) => (key === 'sem_categoria' ? 'Sem classificação' : congregationCategoryLabels[key as CongregationCategory]),
  )
  const recentRecords = filteredRecords.slice(0, 6)

  function resetFilters() {
    setSearchTerm('')
    setDateFromFilter('')
    setDateToFilter('')
    setTypeFilter('todos')
    setSessionFilter('todos')
    setWeekdayFilter('todos')
    setSourceFilter('todos')
    setCongregationFilter('todos')
    setCategoryFilter('todos')
  }

  function exportCsv() {
    const header = ['Nome', 'Tipo', 'Convidado por', 'Data', 'Dia', 'Hora', 'Culto', 'Igreja', 'Classificação', 'Origem']
    const rows = filteredRecords.map((record) => {
      const congregation = congregationById.get(record.congregationId)
      return [
        record.nomeCompleto,
        visitTypeLabels[record.tipoPessoa],
        record.convidadoPor ?? '',
        formatDateKey(record.visitDate),
        record.visitWeekdayLabel || weekdayLabelFromDateKey(record.visitDate),
        formatFirestoreTime(record.registeredAt),
        visitSessionLabels[record.session],
        congregation?.nome ?? record.congregationName,
        congregation ? congregationCategoryLabels[congregation.categoria ?? 'capital'] : '',
        visitRecordSourceLabel(record),
      ]
    })
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(';')).join('\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `dashboard-registros-${todayKey()}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  function renderBarList(title: string, items: Array<{ key: string; label: string; count: number }>) {
    const maxCount = Math.max(1, ...items.map((item) => item.count))

    return (
      <article className="analytics-card">
        <div className="analytics-card-heading">
          <h3>{title}</h3>
          <span>{items.length}</span>
        </div>
        {items.length === 0 ? (
          <p className="source-note">Sem dados nos filtros atuais.</p>
        ) : (
          <div className="bar-list">
            {items.map((item) => (
              <div className="bar-row" key={item.key}>
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.count} registro(s)</span>
                </div>
                <div className="bar-track" aria-hidden="true">
                  <span style={{ width: `${Math.max(8, (item.count / maxCount) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </article>
    )
  }

  return (
    <section className="admin-panel-block records-dashboard">
      <div className="section-heading">
        <p className="eyebrow">Dashboard</p>
        <h2>Gestão dos registros</h2>
        <p>Explore visitantes e convidados por período, tipo, culto, igreja, origem e dados nominais.</p>
      </div>

      {error ? <div className="form-alert error">{error}</div> : null}

      <div className="dashboard-toolbar">
        <div>
          <strong>{filteredRecords.length}</strong>
          <span>registro(s) encontrados de {records.length} no banco.</span>
        </div>
        <button className="secondary-admin-action" disabled={filteredRecords.length === 0} onClick={exportCsv} type="button">
          Exportar CSV
        </button>
      </div>

      <div className="records-filter-grid">
        <label className="wide-field">
          Buscar em todos os dados
          <input
            placeholder="Nome, convidante, igreja, culto, origem..."
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </label>
        <label>
          De
          <input type="date" value={dateFromFilter} onChange={(event) => setDateFromFilter(event.target.value)} />
        </label>
        <label>
          Até
          <input type="date" value={dateToFilter} onChange={(event) => setDateToFilter(event.target.value)} />
        </label>
        <label>
          Tipo
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as VisitPersonType | 'todos')}>
            <option value="todos">Todos</option>
            <option value="visitante">Visitante</option>
            <option value="convidado">Convidado</option>
          </select>
        </label>
        <label>
          Culto/atividade
          <select value={sessionFilter} onChange={(event) => setSessionFilter(event.target.value as VisitSession | 'todos')}>
            <option value="todos">Todos</option>
            {Object.entries(visitSessionLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Dia da semana
          <select value={weekdayFilter} onChange={(event) => setWeekdayFilter(event.target.value)}>
            <option value="todos">Todos</option>
            {dashboardWeekdayOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Classificação
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as CongregationCategory | 'todos')}>
            <option value="todos">Todas</option>
            {Object.entries(congregationCategoryLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Igreja
          <select value={congregationFilter} onChange={(event) => setCongregationFilter(event.target.value)}>
            <option value="todos">Todas</option>
            {activeCongregations.map((congregation) => (
              <option key={congregation.id} value={congregation.id}>
                {congregation.nome}
              </option>
            ))}
          </select>
        </label>
        <label>
          Origem
          <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as 'todos' | 'self' | 'admin')}>
            <option value="todos">Todas</option>
            <option value="self">Cadastro com login</option>
            <option value="admin">Lançado pela administração</option>
          </select>
        </label>
        <div className="filter-actions">
          <button className="secondary-admin-action" onClick={resetFilters} type="button">
            Limpar filtros
          </button>
        </div>
      </div>

      <div className="tracking-metrics records-metrics">
        <div>
          <span>Registros filtrados</span>
          <strong>{filteredRecords.length}</strong>
        </div>
        <div>
          <span>Visitantes</span>
          <strong>{totalVisitantes}</strong>
        </div>
        <div>
          <span>Convidados</span>
          <strong>{totalConvidados}</strong>
        </div>
        <div>
          <span>Pessoas únicas</span>
          <strong>{uniquePeople}</strong>
        </div>
        <div>
          <span>Congregações</span>
          <strong>{uniqueCongregations}</strong>
          <small>com registro</small>
        </div>
        <div>
          <span>Com login</span>
          <strong>{selfRecords}</strong>
        </div>
        <div>
          <span>Administração</span>
          <strong>{adminRecords}</strong>
        </div>
      </div>

      <CongregationMiniMap congregation={selectedMapCongregation} />

      <div className="analytics-grid">
        {renderBarList('Por tipo', byType)}
        {renderBarList('Por culto ou atividade', bySession)}
        {renderBarList('Por dia da semana', byWeekday)}
        {renderBarList('Por origem', bySource)}
        {renderBarList('Por classificação da igreja', byCategory)}
        {renderBarList('Ranking de congregações', byCongregation.slice(0, 8))}
      </div>

      <div className="recent-records">
        <div className="section-heading compact-heading">
          <p className="eyebrow">Últimos lançamentos</p>
          <h2>Registros recentes</h2>
        </div>
        {recentRecords.length === 0 ? (
          <p className="source-note">Nenhum lançamento recente para os filtros atuais.</p>
        ) : (
          <div className="recent-record-list">
            {recentRecords.map((record) => {
              const congregation = congregationById.get(record.congregationId)
              return (
                <article key={record.id}>
                  <strong>{record.nomeCompleto}</strong>
                  <span>
                    {visitTypeLabels[record.tipoPessoa]} · {formatDateKey(record.visitDate)} ·{' '}
                    {congregation?.nome ?? record.congregationName}
                  </span>
                </article>
              )
            })}
          </div>
        )}
      </div>

      {loading ? (
        <p className="source-note">Carregando registros...</p>
      ) : filteredRecords.length === 0 ? (
        <p className="source-note">Nenhum registro encontrado para os filtros atuais.</p>
      ) : (
        <div className="table-panel records-table-panel">
          <table>
            <thead>
              <tr>
                <th>Nº</th>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Convidado por</th>
                <th>Data</th>
                <th>Dia</th>
                <th>Hora</th>
                <th>Culto</th>
                <th>Igreja</th>
                <th>Classificação</th>
                <th>Origem</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record, index) => {
                const congregation = congregationById.get(record.congregationId)
                return (
                  <tr key={record.id}>
                    <td>{index + 1}</td>
                    <td>{record.nomeCompleto}</td>
                    <td>{visitTypeLabels[record.tipoPessoa]}</td>
                    <td>{record.convidadoPor || '—'}</td>
                    <td>{formatDateKey(record.visitDate)}</td>
                    <td>{record.visitWeekdayLabel || weekdayLabelFromDateKey(record.visitDate)}</td>
                    <td>{formatFirestoreTime(record.registeredAt)}</td>
                    <td>{visitSessionLabels[record.session]}</td>
                    <td>{congregation?.nome ?? record.congregationName}</td>
                    <td>{congregation ? congregationCategoryLabels[congregation.categoria ?? 'capital'] : '—'}</td>
                    <td>{visitRecordSourceLabel(record)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function BannerManager() {
  const [managedServices, setManagedServices] = useState(weeklyServices)

  function replacePhoto(id: string, event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const nextImage = URL.createObjectURL(file)
    setManagedServices((current) =>
      current.map((service) => (service.id === id ? { ...service, image: nextImage } : service)),
    )
  }

  return (
    <section className="admin-banner-panel">
      <div className="section-heading">
        <p className="eyebrow">Banner público</p>
        <h2>Notícias e avisos · Cultos da semana</h2>
        <p>As quatro fotos em destaque no banner principal do site. Troque a imagem de cada culto abaixo.</p>
      </div>

      <div className="managed-banner-list">
        {managedServices.map((service) => (
          <article key={service.id}>
            <img src={service.image} alt="" />
            <div>
              <span>
                {service.dia} · {service.horario}
              </span>
              <strong>{service.titulo}</strong>
              <label className="file-input">
                Trocar foto
                <input accept="image/*" onChange={(event) => replacePhoto(service.id, event)} type="file" />
              </label>
            </div>
          </article>
        ))}
      </div>
      <p className="source-note">
        A troca de foto aqui é apenas uma prévia local. A gravação definitiva será feita quando o Firebase Storage
        estiver configurado.
      </p>
    </section>
  )
}

function DashboardShell({
  title,
  subtitle,
  cards,
}: {
  title: string
  subtitle: string
  cards: Array<[string, string, React.ReactNode]>
}) {
  return (
    <section className="content-section dashboard-page">
      <DashboardHeader title={title} subtitle={subtitle} />
      <div className="card-grid">
        {cards.map(([cardTitle, cardText, icon]) => (
          <article className="info-card" key={cardTitle}>
            {icon}
            <h2>{cardTitle}</h2>
            <p>{cardText}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function DashboardHeader({
  title,
  subtitle,
  hideEyebrow = false,
}: {
  title: string
  subtitle: string
  hideEyebrow?: boolean
}) {
  return (
    <div className="section-heading">
      {hideEyebrow ? null : <p className="eyebrow">Área restrita</p>}
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  )
}

function AdminSectionButton({
  section,
  active,
  onClick,
}: {
  section: AdminSectionDefinition
  active: boolean
  onClick: () => void
}) {
  const Icon = section.icon

  return (
    <button
      aria-selected={active}
      className={`admin-section-tab${active ? ' active' : ''}`}
      onClick={onClick}
      role="tab"
      type="button"
    >
      <Icon aria-hidden="true" />
      <span>{section.title}</span>
      <small>{section.description}</small>
    </button>
  )
}

function ContributionSection({ compact = false }: { compact?: boolean }) {
  return (
    <section className={compact ? 'contribution-panel compact' : 'content-section contribution-panel'}>
      <div>
        <p className="eyebrow">Contribuições</p>
        <h2>Ofertas e apoio à obra</h2>
        <p>Dados públicos extraídos do carnê Pró-Terreno da igreja.</p>
      </div>
      <div className="pix-box">
        <span>Chave Pix {institutionalInfo.pixKeyType} · Banco {institutionalInfo.pixBank}</span>
        <strong>{institutionalInfo.pixKey}</strong>
        <small>{institutionalInfo.legalName}</small>
      </div>
    </section>
  )
}

export default App
