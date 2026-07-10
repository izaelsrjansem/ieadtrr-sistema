export type PublicPersonType = 'visitante' | 'membro' | 'convidado' | 'congregado'
export type VisitPersonType = 'visitante' | 'convidado'
export type CadastroSexo = 'masculino' | 'feminino'

export type ChurchRole =
  | 'pastor'
  | 'presbitero'
  | 'diacono'
  | 'diaconisa'
  | 'missionario'
  | 'missionaria'
  | 'evangelista'
  | 'cooperador'
  | 'obreiro'
  | 'secretario'
  | 'tesoureiro'
  | 'dirigente'
  | 'professor_ebd'
  | 'lider_jovens'
  | 'lider_mulheres'
  | 'lider_louvor'
  | 'outro'

export type SystemRole = 'pendente' | 'visitante' | 'congregado' | 'membro' | 'diretoria' | 'admin'

export type AdminSectionKey =
  | 'cadastros'
  | 'membros'
  | 'presencas'
  | 'congregacoes'
  | 'usuarios'
  | 'auditoria'
  | 'site'

export type UserProfile = {
  uid: string
  email: string
  emailLower?: string
  nomeCompleto: string
  role: SystemRole
  adminSectionAccess?: AdminSectionKey[]
  createdAt: string
  tipoPessoa?: PublicPersonType
  congregacao?: string
  convidadoPor?: string
  telefone?: string
  dataNascimento?: string
  sexo?: CadastroSexo
  possuiWhatsapp?: boolean
  cpf?: string
  cpfDigits?: string
  rg?: string
  endereco?: Address
  dataAceitacao?: string
  dataBatismo?: string
  possuiCargo?: boolean
  cargo?: ChurchRole
  outroCargo?: string
  fotoModo?: 'unica' | 'frente_verso'
  fotoArquivo?: string
  fotoVersoArquivo?: string
  cartaMudancaPaginas?: DocumentoPaginas
  cartaMudancaArquivo?: string
  cartaRecomendacaoPaginas?: DocumentoPaginas
  cartaRecomendacaoArquivo?: string
  observacoes?: string
  updatedAt?: FirestoreDate
}

export type Address = {
  tipoLogradouro: string
  cep: string
  rua: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  estado: string
}

export type DocumentoPaginas = 'unica' | 'multiplas'

export type MemberRegistration = {
  nomeCompleto: string
  email: string
  emailLower?: string
  telefone: string
  possuiWhatsapp: boolean
  convidadoPor?: string
  cpf: string
  cpfDigits?: string
  rg: string
  dataNascimento: string
  sexo: CadastroSexo | ''
  tipoPessoa: PublicPersonType
  possuiCargo: boolean
  cargo?: ChurchRole
  outroCargo?: string
  congregacao: string
  endereco: Address
  dataBatismo?: string
  dataAceitacao?: string
  fotoModo: 'unica' | 'frente_verso'
  fotoArquivo?: string
  fotoVersoArquivo?: string
  cartaMudancaPaginas: DocumentoPaginas
  cartaMudancaArquivo?: string
  cartaRecomendacaoPaginas: DocumentoPaginas
  cartaRecomendacaoArquivo?: string
  observacoes?: string
  consentimentoLgpd: boolean
}

export type MembershipRequestStatus = 'pendente' | 'aprovado' | 'rejeitado'

export type FirestoreDate = { toDate: () => Date } | string

export type MembershipRequest = MemberRegistration & {
  id: string
  userId?: string
  status: MembershipRequestStatus
  createdAt?: FirestoreDate
  decididoEm?: FirestoreDate
  decididoPor?: string
  linkedUserUid?: string
}

export type OfficialMember = MemberRegistration & {
  id: string
  userId?: string
  membershipRequestId?: string
  status: 'ativo' | 'inativo'
  createdAt?: FirestoreDate
  updatedAt?: FirestoreDate
  approvedAt?: FirestoreDate
  approvedBy?: string
}

export type AuditLog = {
  id: string
  action: string
  entityType: string
  entityId: string
  entityName?: string
  actorUid: string
  actorName?: string
  actorEmail?: string
  summary: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  changedFields?: string[]
  createdAt?: FirestoreDate
}

export type CongregationCategory = 'capital' | 'interior' | 'zona_rural'

export type Congregation = {
  id: string
  nome: string
  tipo: 'sede' | 'congregacao'
  categoria?: CongregationCategory
  endereco: string
  pastorResponsavel: string
  telefone: string
  latitude?: number
  longitude?: number
  ativa?: boolean
  createdAt?: FirestoreDate
  updatedAt?: FirestoreDate
}

export type VisitSession = 'regular' | 'ebd' | 'culto_noite'

export type VisitRecord = {
  id: string
  userId: string
  nomeCompleto: string
  tipoPessoa: VisitPersonType
  convidadoPor?: string
  congregationId: string
  congregationName: string
  visitDate: string
  session: VisitSession
  source?: 'self' | 'admin'
  recordedBy?: string
  registeredAt?: FirestoreDate
  updatedAt?: FirestoreDate
}

export type ChurchEvent = {
  id: string
  titulo: string
  data: string
  horario: string
  local: string
  categoria: 'culto' | 'missao' | 'campanha' | 'reuniao'
}

export type NavigationIconKey =
  | 'none'
  | 'home'
  | 'church'
  | 'calendar'
  | 'book'
  | 'users'
  | 'file'
  | 'megaphone'
  | 'map'
  | 'autofalante'
  | 'phone'
  | 'mail'
  | 'message'
  | 'heart'
  | 'star'
  | 'gift'
  | 'clock'
  | 'info'
  | 'handshake'
  | 'help'
  | 'music'
  | 'video'
  | 'sparkles'

export type NavigationItem = {
  id: string
  label: string
  path: string
  icon: NavigationIconKey
  order: number
  visible: boolean
  menuFontSize: number
  menuBold: boolean
  pageTitle: string
  pageContent: string
  titleFontSize: number
  titleBold: boolean
}
