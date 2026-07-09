import { useEffect, useState } from 'react'
import {
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Building2,
  Flame,
  FileText,
  Home,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  MapPinned,
  MapPin,
  Megaphone,
  Navigation,
  Pencil,
  PlusCircle,
  ScrollText,
  Trash2,
  UserPlus,
  UsersRound,
  X,
} from 'lucide-react'
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { RegistrationForm } from './components/RegistrationForm'
import { useAuth } from './context/AuthContext'
import {
  churchDisplayName,
  churchRoleOptions,
  congregations as fallbackCongregations,
  homeAnnouncements,
  leadership,
  personTypeOptions,
  publicEvents,
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
import { isFirebaseConfigured, sendPasswordReset, signIn, signOutUser, signUp } from './services/auth'
import {
  createCongregation,
  subscribeCongregations,
  suppressCongregation,
  updateCongregation,
  type CongregationInput,
} from './services/congregations'
import { subscribeMembers } from './services/members'
import { decideMembershipRequest, subscribeMembershipRequests } from './services/membership'
import { defaultNavigationItems, saveNavigationItems, subscribeNavigationItems } from './services/siteNavigation'
import {
  getUserProfile,
  promoteCongregadoToMembro,
  promoteVisitorToCongregado,
  subscribeUsers,
  updateMemberChurchRole,
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
  MembershipRequest,
  MembershipRequestStatus,
  NavigationIconKey,
  NavigationItem,
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

const requestStatusFilters: Array<{ value: MembershipRequestStatus | 'todos'; label: string }> = [
  { value: 'pendente', label: 'Pendentes' },
  { value: 'aprovado', label: 'Aprovados' },
  { value: 'rejeitado', label: 'Rejeitados' },
  { value: 'todos', label: 'Todos' },
]

const congregationCategoryLabels: Record<CongregationCategory, string> = {
  capital_sede: 'Igreja da capital',
  capital_filial: 'Filial na capital',
  interior_filial: 'Filial no interior',
}

const congregationAreaFilters: Array<{ value: 'todas' | 'capital' | 'interior'; label: string }> = [
  { value: 'todas', label: 'Todas' },
  { value: 'capital', label: 'Capital' },
  { value: 'interior', label: 'Interior' },
]

const visitTypeLabels: Record<VisitPersonType, string> = {
  visitante: 'Visitante',
  convidado: 'Convidado',
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

function hasCoordinates(congregation?: Congregation | null): congregation is Congregation & {
  latitude: number
  longitude: number
} {
  return typeof congregation?.latitude === 'number' && typeof congregation.longitude === 'number'
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

function App() {
  const [navigationItems, setNavigationItems] = useState<NavigationItem[]>(defaultNavigationItems)
  const navItems = sortedVisibleNavigationItems(navigationItems)

  useEffect(() => subscribeNavigationItems(setNavigationItems), [])

  return (
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
                <MemberDashboard />
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
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard navigationItems={navigationItems} />
              </ProtectedRoute>
            }
          />
          <Route path="/:customSlug" element={<CustomPublicPage navigationItems={navigationItems} />} />
        </Routes>
      </main>

      <SiteFooter />
    </div>
  )
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

  async function handleSignOut() {
    await signOutUser()
    navigate('/')
  }

  const isAdmin = profile?.role === 'admin'

  return (
    <div className="header-account">
      {isAdmin ? (
        <NavLink
          className={({ isActive }) => `panel-link admin-panel-link${isActive ? ' active' : ''}`}
          to="/admin"
        >
          <LayoutDashboard aria-hidden="true" />
          Painel Administrativo
        </NavLink>
      ) : null}
      <span className="header-account-name">{profile?.nomeCompleto || firebaseUser.email}</span>
      <button className="login-link" onClick={handleSignOut} type="button">
        <LogOut aria-hidden="true" />
        Sair
      </button>
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

    if (nomeCompleto.trim().split(/\s+/).filter(Boolean).length < 2) {
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
      await signUp(email.trim(), senha, nomeCompleto.trim())
      setStatus('success')
    } catch (error) {
      const code = (error as { code?: string }).code
      setStatus('error')
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
      <h2>Novo acesso</h2>

      {!isFirebaseConfigured ? (
        <div className="form-alert error">Firebase ainda não está configurado nesta instalação.</div>
      ) : null}

      <label>
        Nome completo
        <input onChange={(event) => setNomeCompleto(event.target.value)} required value={nomeCompleto} />
      </label>

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
        {status === 'sending' ? 'Criando...' : 'Criar acesso'}
        <UserPlus aria-hidden="true" />
      </button>

      <p className="source-note">
        Já tem cadastro? <Link to="/login">Entre com e-mail e senha</Link>.
      </p>

      {status === 'success' ? (
        <div className="form-alert success">
          <CheckCircle2 aria-hidden="true" />
          Acesso criado. Agora complete seu cadastro abaixo.
        </div>
      ) : null}
      {status === 'error' ? <div className="form-alert error">{errorMessage}</div> : null}
    </form>
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
            <span>{congregationCategoryLabels[congregation.categoria ?? 'capital_filial']}</span>
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
  const [status, setStatus] = useState<'idle' | 'sending' | 'reset-sent' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const requestedPath = (location.state as { from?: string } | null)?.from

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('sending')
    setErrorMessage('')

    try {
      const credential = await signIn(email.trim(), senha)
      const loggedProfile = await getUserProfile(credential.user.uid)
      navigate(requestedPath ?? profilePanelPath(loggedProfile), { replace: true })
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
          <p className="eyebrow">Registro de presença</p>
          <h2>Informe sua presença de hoje</h2>
          <p>Você pode alterar o registro do dia. Aos domingos, há um registro para EBD e outro para o culto à noite.</p>
        </div>

        <div className="form-grid">
          <label>
            Tipo
            <select
              value={visitType}
              onChange={(event) => {
                setVisitType(event.target.value as VisitPersonType)
                setStatus('idle')
              }}
            >
              <option value="visitante">Visitante</option>
              <option value="convidado">Convidado</option>
            </select>
          </label>

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
          {status === 'saving' ? 'Salvando...' : existingRecord ? 'Alterar registro' : 'Registrar presença'}
          <CheckCircle2 aria-hidden="true" />
        </button>

        {status === 'saved' ? <div className="form-alert success">Registro de presença salvo.</div> : null}
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
  return (
    <section className="content-section dashboard-page">
      <DashboardHeader
        hideEyebrow
        title="Administração"
        subtitle="Usuários, membros, cargos, congregações e configurações"
      />
      <div className="admin-grid">
        <AdminItem title="Aprovar cadastros" value="Solicitações pendentes" />
        <AdminItem title="Cadastro de membros" value="Registro nominal completo" />
        <AdminItem title="Permissões" value="Membro, diretoria e admin" />
        <AdminItem title="Configurações" value="Dados públicos do site" />
      </div>
      <NavigationManager navigationItems={navigationItems} />
      <AdminPresenceRegistration />
      <VisitorTracking />
      <AdminNominalRegistration />
      <MembershipApprovals />
      <MemberDirectory />
      <CongregationManager />
      <ProfileProgressionManager />
      <UserAccessManager />
      <BannerManager />
      <div className="table-panel">
        <h2>Campos do cadastro nominal</h2>
        <table>
          <tbody>
            <tr>
              <td>Identificação</td>
              <td>Nome, CPF, RG, foto e tipo de pessoa</td>
            </tr>
            <tr>
              <td>Endereço</td>
              <td>CEP, rua, número, bairro, cidade, estado e complemento</td>
            </tr>
            <tr>
              <td>Vida cristã</td>
              <td>Cargo/função, batismo, aceitação, carta de mudança e recomendação</td>
            </tr>
          </tbody>
        </table>
      </div>
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

      {error ? <div className="form-alert error">{error}</div> : null}
      {status === 'saved' ? <div className="form-alert success">Menu público atualizado.</div> : null}

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

  const sessionOptions = visitSessionsForDate(visitDate)
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
      setError('Informe o nome e a igreja da presença.')
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
      setNomeCompleto('')
      setConvidadoPor('')
      setStatus('saved')
    } catch {
      setStatus('error')
      setError('Não foi possível registrar a presença.')
    }
  }

  return (
    <section className="admin-panel-block">
      <div className="section-heading">
        <p className="eyebrow">Presenças</p>
        <h2>Registrar presença sem login</h2>
        <p>Lançamento rápido para visitante ou convidado que ainda não tem acesso ao sistema.</p>
      </div>

      {error ? <div className="form-alert error">{error}</div> : null}
      {status === 'saved' ? <div className="form-alert success">Presença registrada.</div> : null}

      <form className="congregation-editor" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>
            Nome
            <input value={nomeCompleto} onChange={(event) => setNomeCompleto(event.target.value)} />
          </label>

          <label>
            Tipo
            <select value={visitType} onChange={(event) => setVisitType(event.target.value as VisitPersonType)}>
              <option value="visitante">Visitante</option>
              <option value="convidado">Convidado</option>
            </select>
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
          {status === 'saving' ? 'Salvando...' : 'Registrar presença'}
        </button>
      </form>
    </section>
  )
}

function AdminNominalRegistration() {
  const [open, setOpen] = useState(false)

  return (
    <section className="admin-panel-block">
      <div className="section-heading admin-block-heading">
        <div>
          <p className="eyebrow">Cadastro nominal</p>
          <h2>Registrar pessoa sem login e senha</h2>
          <p>Use para registrar presença ou dados iniciais de visitante, convidado ou membro pela administração.</p>
        </div>
        <button className="primary-action" type="button" onClick={() => setOpen((current) => !current)}>
          <UserPlus aria-hidden="true" />
          {open ? 'Fechar cadastro' : 'Abrir cadastro'}
        </button>
      </div>

      {open ? <RegistrationForm mode="admin" /> : null}
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
  categoria: 'capital_filial',
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
  const [areaFilter, setAreaFilter] = useState<'todas' | 'capital' | 'interior'>('todas')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState('')

  useEffect(() => subscribeCongregations(setItems), [])

  const selectedMapCongregation: Congregation = {
    id: editingId ?? 'preview',
    ...congregationFormToInput(form),
  }
  const filteredItems = items.filter((congregation) => {
    if (areaFilter === 'todas') {
      return true
    }

    const category = congregation.categoria ?? 'capital_filial'
    if (areaFilter === 'capital') {
      return category === 'capital_sede' || category === 'capital_filial'
    }

    return category === 'interior_filial'
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
      categoria: congregation.categoria ?? 'capital_filial',
      endereco: congregation.endereco,
      pastorResponsavel: congregation.pastorResponsavel,
      telefone: congregation.telefone,
      latitude: typeof congregation.latitude === 'number' ? String(congregation.latitude) : '',
      longitude: typeof congregation.longitude === 'number' ? String(congregation.longitude) : '',
    })
    setStatus('idle')
    setError('')
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError('O navegador não liberou geolocalização.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateForm('latitude', position.coords.latitude.toFixed(6))
        updateForm('longitude', position.coords.longitude.toFixed(6))
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

      {error ? <div className="form-alert error">{error}</div> : null}
      {status === 'saved' ? <div className="form-alert success">Congregação atualizada.</div> : null}

      <form className="congregation-editor" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>
            Nome da igreja
            <input value={form.nome} onChange={(event) => updateForm('nome', event.target.value)} />
          </label>

          <label>
            Classificação
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
              <option value="sede">Sede</option>
              <option value="congregacao">Congregação</option>
            </select>
          </label>

          <label>
            Telefone
            <input value={form.telefone} onChange={(event) => updateForm('telefone', event.target.value)} />
          </label>

          <label className="wide-field">
            Endereço
            <input value={form.endereco} onChange={(event) => updateForm('endereco', event.target.value)} />
          </label>

          <label>
            Responsável
            <input value={form.pastorResponsavel} onChange={(event) => updateForm('pastorResponsavel', event.target.value)} />
          </label>

          <label>
            Latitude
            <input value={form.latitude} onChange={(event) => updateForm('latitude', event.target.value)} inputMode="decimal" />
          </label>

          <label>
            Longitude
            <input value={form.longitude} onChange={(event) => updateForm('longitude', event.target.value)} inputMode="decimal" />
          </label>
        </div>

        <div className="editor-actions">
          <button className="secondary-admin-action" type="button" onClick={useCurrentLocation}>
            <Navigation aria-hidden="true" />
            Usar localização atual
          </button>
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
              <span>{congregationCategoryLabels[congregation.categoria ?? 'capital_filial']}</span>
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
  const [filter, setFilter] = useState<MembershipRequestStatus | 'todos'>('pendente')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

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

  async function decide(request: MembershipRequest, status: 'aprovado' | 'rejeitado') {
    if (!firebaseUser) {
      return
    }

    setBusyId(request.id)
    setError('')
    setNotice('')

    try {
      const result = await decideMembershipRequest(request, status, firebaseUser.uid)
      if (status === 'aprovado') {
        setNotice(
          result.linkedUserUid
            ? 'Membro oficial criado e acesso promovido para membro.'
            : 'Membro oficial criado. Nenhum acesso com este e-mail foi encontrado para vincular.',
        )
      } else {
        setNotice('Solicitação rejeitada.')
      }
    } catch {
      setError('Não foi possível atualizar a solicitação.')
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
                    <span>{request.congregacao || 'Congregação não informada'}</span>
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
                      onClick={() => decide(request, 'aprovado')}
                      type="button"
                    >
                      <Check aria-hidden="true" />
                      Aprovar
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
    </section>
  )
}

function MemberDirectory() {
  const [members, setMembers] = useState<OfficialMember[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  const normalizedSearch = search.trim().toLowerCase()
  const activeMembers = members
    .filter((member) => member.status !== 'inativo')
    .filter((member) => {
      if (!normalizedSearch) {
        return true
      }

      return [member.nomeCompleto, member.congregacao, member.email, member.telefone].some((value) =>
        value?.toLowerCase().includes(normalizedSearch),
      )
    })
    .sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto, 'pt-BR'))

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

      {error ? <div className="form-alert error">{error}</div> : null}

      {loading ? (
        <p className="source-note">Carregando membros...</p>
      ) : activeMembers.length === 0 ? (
        <p className="source-note">
          {normalizedSearch ? 'Nenhum membro encontrado nesta busca.' : 'Nenhum membro oficial cadastrado ainda.'}
        </p>
      ) : (
        <div className="request-list">
          {activeMembers.map((member) => (
            <article className="request-card" key={member.id}>
              <div className="request-main">
                <div className="request-head">
                  <strong>{member.nomeCompleto}</strong>
                  <span className="status-badge status-aprovado">ativo</span>
                </div>
                <div className="request-meta">
                  <span>{member.congregacao || 'Congregação não informada'}</span>
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
    </section>
  )
}

function hasCongregadoRequiredData(user: UserProfile): boolean {
  return Boolean(
    user.cpf &&
      user.rg &&
      user.telefone &&
      user.dataNascimento &&
      user.dataAceitacao &&
      user.endereco?.rua &&
      user.endereco?.numero &&
      user.endereco?.bairro &&
      user.endereco?.cidade &&
      user.endereco?.estado,
  )
}

function ProfileProgressionManager() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [busyUid, setBusyUid] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [baptismDates, setBaptismDates] = useState<Record<string, string>>({})
  const [cargoByUid, setCargoByUid] = useState<Record<string, ChurchRole | ''>>({})
  const [otherCargoByUid, setOtherCargoByUid] = useState<Record<string, string>>({})

  useEffect(() => {
    const unsubscribe = subscribeUsers(
      (items) => {
        setUsers(items)
        setLoading(false)
      },
      () => {
        setError('Não foi possível carregar os perfis.')
        setLoading(false)
      },
    )

    return unsubscribe
  }, [])

  const visible = users
    .filter((user) => ['visitante', 'congregado', 'membro'].includes(user.role))
    .sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto, 'pt-BR'))

  async function runAction(uid: string, action: () => Promise<void>) {
    setBusyUid(uid)
    setError('')

    try {
      await action()
    } catch {
      setError('Não foi possível atualizar este perfil.')
    } finally {
      setBusyUid(null)
    }
  }

  return (
    <section className="admin-panel-block">
      <div className="section-heading">
        <p className="eyebrow">Perfis</p>
        <h2>Progressão espiritual e cargos</h2>
        <p>Promova visitante/convidado para congregado, congregado para membro e membro para função ministerial.</p>
      </div>

      {error ? <div className="form-alert error">{error}</div> : null}

      {loading ? (
        <p className="source-note">Carregando perfis...</p>
      ) : visible.length === 0 ? (
        <p className="source-note">Nenhum perfil elegível no momento.</p>
      ) : (
        <div className="progression-list">
          {visible.map((user) => {
            const isCongregadoComplete = hasCongregadoRequiredData(user)
            const selectedCargo = cargoByUid[user.uid] ?? user.cargo ?? ''
            const currentOtherCargo = otherCargoByUid[user.uid] ?? user.outroCargo ?? ''

            return (
              <article className="progression-row" key={user.uid}>
                <div>
                  <strong>{user.nomeCompleto}</strong>
                  <span>{user.email}</span>
                  <span className={`status-badge status-${user.role}`}>{systemRoleLabels[user.role]}</span>
                </div>

                {user.role === 'visitante' ? (
                  <button
                    className="primary-action"
                    disabled={busyUid === user.uid}
                    onClick={() => runAction(user.uid, () => promoteVisitorToCongregado(user.uid))}
                    type="button"
                  >
                    Tornar congregado
                  </button>
                ) : null}

                {user.role === 'congregado' ? (
                  <div className="progression-actions">
                    <span className={isCongregadoComplete ? 'ready-note' : 'pending-note'}>
                      {isCongregadoComplete ? 'Dados completos' : 'Aguardando dados completos do usuário'}
                    </span>
                    <label>
                      Data de batismo
                      <input
                        type="date"
                        value={baptismDates[user.uid] ?? ''}
                        onChange={(event) =>
                          setBaptismDates((current) => ({ ...current, [user.uid]: event.target.value }))
                        }
                      />
                    </label>
                    <button
                      className="primary-action"
                      disabled={busyUid === user.uid || !isCongregadoComplete || !baptismDates[user.uid]}
                      onClick={() => runAction(user.uid, () => promoteCongregadoToMembro(user.uid, baptismDates[user.uid]))}
                      type="button"
                    >
                      Promover a membro
                    </button>
                  </div>
                ) : null}

                {user.role === 'membro' ? (
                  <div className="progression-actions">
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
                          value={currentOtherCargo}
                          onChange={(event) =>
                            setOtherCargoByUid((current) => ({ ...current, [user.uid]: event.target.value }))
                          }
                        />
                      </label>
                    ) : null}
                    <button
                      className="primary-action"
                      disabled={busyUid === user.uid || (selectedCargo === 'outro' && !currentOtherCargo.trim())}
                      onClick={() =>
                        runAction(user.uid, () =>
                          updateMemberChurchRole(
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
    </section>
  )
}

function UserAccessManager() {
  const { firebaseUser } = useAuth()
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

  const sorted = users
    .filter((user) => user.role !== 'visitante')
    .sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto, 'pt-BR'))

  return (
    <section className="admin-panel-block">
      <div className="section-heading">
        <p className="eyebrow">Acessos</p>
        <h2>Perfis de acesso</h2>
        <p>Defina quem é membro, diretoria ou administrador. Para tornar alguém administrador, altere o perfil aqui.</p>
      </div>

      {error ? <div className="form-alert error">{error}</div> : null}

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
                      disabled={busyUid === user.uid || isSelf}
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
        <h2>Análise de presenças</h2>
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
        <p className="source-note">Nenhuma presença registrada para os filtros atuais.</p>
      ) : (
        <div className="table-panel">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Data</th>
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
                    <td>{formatFirestoreTime(record.registeredAt)}</td>
                    <td>{visitSessionLabels[record.session]}</td>
                    <td>{congregation?.nome ?? record.congregationName}</td>
                    <td>{congregationCategoryLabels[congregation?.categoria ?? 'capital_filial']}</td>
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

function AdminItem({ title, value }: { title: string; value: string }) {
  return (
    <article className="admin-item">
      <Home aria-hidden="true" />
      <h2>{title}</h2>
      <p>{value}</p>
    </article>
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
