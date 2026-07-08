import { useEffect, useState } from 'react'
import {
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Flame,
  FileText,
  Home,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  MapPin,
  Megaphone,
  ScrollText,
  UserPlus,
  UsersRound,
  X,
} from 'lucide-react'
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { RegistrationForm } from './components/RegistrationForm'
import { useAuth } from './context/AuthContext'
import {
  churchDisplayName,
  churchRoleOptions,
  congregations,
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
import { decideMembershipRequest, subscribeMembershipRequests } from './services/membership'
import { getUserProfile, subscribeUsers, updateUserRole, updateVisitorCongregacao } from './services/users'
import type { FirestoreDate, MembershipRequest, MembershipRequestStatus, SystemRole, UserProfile } from './types'

const announcementIcons = {
  flame: Flame,
  family: UsersRound,
  book: BookOpen,
} as const

const systemRoleLabels: Record<SystemRole, string> = {
  pendente: 'Pendente',
  visitante: 'Visitante',
  membro: 'Membro',
  diretoria: 'Diretoria',
  admin: 'Administrador',
}

const assignableRoles: SystemRole[] = ['pendente', 'membro', 'diretoria', 'admin']

const requestStatusFilters: Array<{ value: MembershipRequestStatus | 'todos'; label: string }> = [
  { value: 'pendente', label: 'Pendentes' },
  { value: 'aprovado', label: 'Aprovados' },
  { value: 'rejeitado', label: 'Rejeitados' },
  { value: 'todos', label: 'Todos' },
]

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

function congregacaoLabel(id: string): string {
  if (!id) {
    return 'Não informada'
  }

  return congregations.find((congregation) => congregation.id === id)?.nome ?? id
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

  if (profile.role === 'membro' || profile.tipoPessoa === 'membro') {
    return '/membro'
  }

  return '/cadastro'
}

const navItems = [
  { to: '/', label: 'Início' },
  { to: '/congregacoes', label: 'Congregações' },
  { to: '/agenda', label: 'Agenda' },
  { to: '/doutrina', label: 'Doutrina' },
  { to: '/diretoria-publica', label: 'Diretoria' },
]

function App() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <Link className="brand" to="/">
          <img src="/images/ieadtrr-logo.jpeg" alt="" />
          <span>IEADTRR</span>
        </Link>

        <nav aria-label="Navegação principal">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'active' : undefined)}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <HeaderAccess />
      </header>

      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/congregacoes" element={<CongregationsPage />} />
          <Route path="/agenda" element={<AgendaPage />} />
          <Route path="/doutrina" element={<PublicDoctrinePage />} />
          <Route path="/regras" element={<Navigate replace to="/doutrina" />} />
          <Route path="/diretoria-publica" element={<PublicLeadershipPage />} />
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
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
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
        <Link className="panel-link" to="/admin">
          <LayoutDashboard aria-hidden="true" />
          Meu painel
        </Link>
      ) : null}
      <span className="header-account-name">{profile?.nomeCompleto || firebaseUser.email}</span>
      <button className="login-link" onClick={handleSignOut} type="button">
        <LogOut aria-hidden="true" />
        Sair
      </button>
    </div>
  )
}

function HomePage() {
  return (
    <>
      <section className="hero-section">
        <div className="hero-pattern" aria-hidden="true" />
        <div className="hero-content">
          <p className="eyebrow">Bem-vindo à nossa casa</p>
          <h1 className="hero-title">{churchDisplayName}</h1>
          <p>
            Um lugar de fé, comunhão e acolhimento. Aqui você encontra a agenda dos cultos, nossas congregações e as
            portas sempre abertas para caminhar conosco.
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

function CongregationsPage() {
  return (
    <section className="content-section">
      <div className="section-heading">
        <p className="eyebrow">Sede e congregações</p>
        <h1>Campos de atendimento</h1>
      </div>
      <div className="card-grid">
        {congregations.map((congregation) => (
          <article className="info-card" key={congregation.id}>
            <MapPin aria-hidden="true" />
            <h2>{congregation.nome}</h2>
            <p>{congregation.endereco}</p>
            <span>{congregation.pastorResponsavel}</span>
            <span>{congregation.telefone}</span>
          </article>
        ))}
      </div>
    </section>
  )
}

function AgendaPage() {
  return (
    <section className="content-section">
      <div className="section-heading">
        <p className="eyebrow">Calendário público</p>
        <h1>Agenda de cultos e atividades</h1>
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

function PublicDoctrinePage() {
  return (
    <section className="content-section">
      <div className="section-heading">
        <p className="eyebrow">Institucional</p>
        <h1>Doutrina</h1>
        <p>
          Princípios de fé e prática para visitantes, novos membros e pessoas interessadas em conhecer a igreja.
        </p>
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

function PublicLeadershipPage() {
  return (
    <section className="content-section">
      <div className="section-heading">
        <p className="eyebrow">Diretoria</p>
        <h1>Relação pública da liderança</h1>
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
  const [congregacao, setCongregacao] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (profile && !initialized) {
      setCongregacao(profile.congregacao ?? '')
      setInitialized(true)
    }
  }, [profile, initialized])

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!firebaseUser) {
      return
    }

    setStatus('saving')

    try {
      await updateVisitorCongregacao(firebaseUser.uid, congregacao)
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
          <p className="eyebrow">Sua visita</p>
          <h2>Congregação que está visitando</h2>
          <p>Atualize sempre que estiver visitando uma congregação diferente.</p>
        </div>

        <label>
          Congregação
          <select
            value={congregacao}
            onChange={(event) => {
              setCongregacao(event.target.value)
              setStatus('idle')
            }}
          >
            <option value="">Selecione</option>
            {congregations.map((congregation) => (
              <option key={congregation.id} value={congregation.id}>
                {congregation.nome}
              </option>
            ))}
          </select>
        </label>

        <button className="primary-action" type="submit" disabled={status === 'saving' || !congregacao}>
          {status === 'saving' ? 'Salvando...' : 'Salvar congregação'}
          <CheckCircle2 aria-hidden="true" />
        </button>

        {status === 'saved' ? <div className="form-alert success">Congregação atualizada.</div> : null}
        {status === 'error' ? <div className="form-alert error">Não foi possível salvar. Tente novamente.</div> : null}
      </form>
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

function AdminDashboard() {
  return (
    <section className="content-section dashboard-page">
      <DashboardHeader title="Administração" subtitle="Usuários, membros, cargos, congregações e configurações" />
      <div className="admin-grid">
        <AdminItem title="Aprovar cadastros" value="Solicitações pendentes" />
        <AdminItem title="Cadastro de membros" value="Registro nominal completo" />
        <AdminItem title="Permissões" value="Membro, diretoria e admin" />
        <AdminItem title="Configurações" value="Dados públicos do site" />
      </div>
      <AdminNominalRegistration />
      <MembershipApprovals />
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

function MembershipApprovals() {
  const { firebaseUser } = useAuth()
  const [requests, setRequests] = useState<MembershipRequest[]>([])
  const [filter, setFilter] = useState<MembershipRequestStatus | 'todos'>('pendente')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
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

  async function decide(id: string, status: 'aprovado' | 'rejeitado') {
    if (!firebaseUser) {
      return
    }

    setBusyId(id)
    setError('')

    try {
      await decideMembershipRequest(id, status, firebaseUser.uid)
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
                      onClick={() => decide(request.id, 'aprovado')}
                      type="button"
                    >
                      <Check aria-hidden="true" />
                      Aprovar
                    </button>
                    <button
                      className="reject-btn"
                      disabled={busyId === request.id}
                      onClick={() => decide(request.id, 'rejeitado')}
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
  const [users, setUsers] = useState<UserProfile[]>([])
  const [nominalRequests, setNominalRequests] = useState<MembershipRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let usersLoaded = false
    let requestsLoaded = false

    function finishLoading() {
      if (usersLoaded && requestsLoaded) {
        setLoading(false)
      }
    }

    const unsubscribeUsers = subscribeUsers(
      (items) => {
        setUsers(items)
        usersLoaded = true
        finishLoading()
      },
      () => {
        setError('Não foi possível carregar o acompanhamento.')
        usersLoaded = true
        finishLoading()
      },
    )

    const unsubscribeRequests = subscribeMembershipRequests(
      (items) => {
        setNominalRequests(items)
        requestsLoaded = true
        finishLoading()
      },
      () => {
        setError('Não foi possível carregar todos os registros nominais.')
        requestsLoaded = true
        finishLoading()
      },
    )

    return () => {
      unsubscribeUsers()
      unsubscribeRequests()
    }
  }, [])

  const tracked = [
    ...users
      .filter((user) => user.role === 'visitante')
      .map((user) => ({
        id: `user-${user.uid}`,
        nomeCompleto: user.nomeCompleto,
        tipoPessoa: user.tipoPessoa,
        congregacao: user.congregacao,
        convidadoPor: user.convidadoPor,
        telefone: user.telefone,
        email: user.email,
        createdAt: user.createdAt,
      })),
    ...nominalRequests
      .filter((request) => request.tipoPessoa !== 'membro')
      .map((request) => ({
        id: `nominal-${request.id}`,
        nomeCompleto: request.nomeCompleto,
        tipoPessoa: request.tipoPessoa,
        congregacao: request.congregacao,
        convidadoPor: request.convidadoPor,
        telefone: request.telefone,
        email: request.email,
        createdAt: request.createdAt,
      })),
  ].sort((a, b) => firestoreDateValue(b.createdAt) - firestoreDateValue(a.createdAt))

  const totalVisitantes = tracked.filter((user) => user.tipoPessoa !== 'convidado').length
  const totalConvidados = tracked.filter((user) => user.tipoPessoa === 'convidado').length

  const porCongregacao = Object.entries(
    tracked.reduce<Record<string, number>>((acc, user) => {
      const key = user.congregacao || ''
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    }, {}),
  ).sort((a, b) => b[1] - a[1])

  return (
    <section className="admin-panel-block">
      <div className="section-heading">
        <p className="eyebrow">Acompanhamento</p>
        <h2>Visitantes e convidados</h2>
        <p>Registro para acompanhamento da diretoria. Não passam por aprovação.</p>
      </div>

      {error ? <div className="form-alert error">{error}</div> : null}

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
          <span>Total</span>
          <strong>{tracked.length}</strong>
        </div>
      </div>

      {porCongregacao.length > 0 ? (
        <div className="tracking-by-cong">
          <p className="doc-title">Por congregação</p>
          <div className="cong-chips">
            {porCongregacao.map(([id, count]) => (
              <span key={id || 'nao-informada'}>
                {congregacaoLabel(id)} <b>{count}</b>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {loading ? (
        <p className="source-note">Carregando acompanhamento...</p>
      ) : tracked.length === 0 ? (
        <p className="source-note">Nenhum visitante ou convidado registrado ainda.</p>
      ) : (
        <div className="table-panel">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Congregação</th>
                <th>Convidado por</th>
                <th>Contato</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {tracked.map((user) => (
                <tr key={user.id}>
                  <td>{user.nomeCompleto}</td>
                  <td>{user.tipoPessoa === 'convidado' ? 'Convidado' : 'Visitante'}</td>
                  <td>{congregacaoLabel(user.congregacao ?? '')}</td>
                  <td>{user.tipoPessoa === 'convidado' ? user.convidadoPor || '—' : '—'}</td>
                  <td>{user.telefone || user.email || '—'}</td>
                  <td>{formatFirestoreDate(user.createdAt)}</td>
                </tr>
              ))}
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

function DashboardHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="section-heading">
      <p className="eyebrow">Área restrita</p>
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
