export type PublicPersonType = 'visitante' | 'membro' | 'convidado'

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

export type SystemRole = 'pendente' | 'visitante' | 'membro' | 'diretoria' | 'admin'

export type UserProfile = {
  uid: string
  email: string
  nomeCompleto: string
  role: SystemRole
  createdAt: string
  tipoPessoa?: PublicPersonType
  congregacao?: string
  convidadoPor?: string
  telefone?: string
  dataNascimento?: string
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
  telefone: string
  possuiWhatsapp: boolean
  convidadoPor?: string
  cpf: string
  rg: string
  dataNascimento: string
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
  status: MembershipRequestStatus
  createdAt?: FirestoreDate
  decididoEm?: FirestoreDate
  decididoPor?: string
}

export type Congregation = {
  id: string
  nome: string
  tipo: 'sede' | 'congregacao'
  endereco: string
  pastorResponsavel: string
  telefone: string
}

export type ChurchEvent = {
  id: string
  titulo: string
  data: string
  horario: string
  local: string
  categoria: 'culto' | 'missao' | 'campanha' | 'reuniao'
}
