import type { ChurchEvent, ChurchRole, Congregation, PublicPersonType } from '../types'

export const churchName = 'Igreja Evangélica Assembleia de Deus Tradicional no Estado de Roraima'

export const churchDisplayName = 'Igreja Evangélica Assembleia de Deus Tradicional de Roraima'

export type WeeklyService = {
  id: string
  dia: string
  titulo: string
  horario: string
  descricao: string
  local: string
  image: string
  alt: string
}

export const weeklyServices: WeeklyService[] = [
  {
    id: 'doutrina',
    dia: 'Segunda-feira',
    titulo: 'Culto de doutrina',
    horario: '19h30',
    descricao: 'Ensino da Palavra e fundamentos da fé para toda a igreja.',
    local: 'Sede Administrativa',
    image: '/images/banner-biblia.png',
    alt: 'Bíblia aberta durante estudo doutrinário',
  },
  {
    id: 'familia',
    dia: 'Sexta-feira',
    titulo: 'Culto da família',
    horario: '19h30',
    descricao: 'Um tempo de comunhão, oração e edificação para as famílias.',
    local: 'Sede Administrativa',
    image: '/images/banner-comunhao.png',
    alt: 'Famílias reunidas em comunhão na igreja',
  },
  {
    id: 'ebd',
    dia: 'Domingo',
    titulo: 'Escola bíblica',
    horario: '09h00',
    descricao: 'Estudo bíblico por classes para todas as idades.',
    local: 'Sede Administrativa',
    image: '/images/banner-biblia.png',
    alt: 'Estudo bíblico da escola dominical',
  },
  {
    id: 'celebracao',
    dia: 'Domingo',
    titulo: 'Culto de celebração',
    horario: '19h30',
    descricao: 'Adoração, louvor e proclamação da Palavra à noite.',
    local: 'Sede Administrativa',
    image: '/images/banner-culto.png',
    alt: 'Congregação reunida em culto de celebração',
  },
]

export type HomeAnnouncement = {
  id: string
  tag: string
  titulo: string
  accent: 'gold' | 'green' | 'blue'
  icon: 'flame' | 'family' | 'book'
}

export const homeAnnouncements: HomeAnnouncement[] = [
  { id: 'ceia', tag: 'Campanha', titulo: 'Santa Ceia do mês', accent: 'gold', icon: 'flame' },
  { id: 'familias', tag: 'Evento', titulo: 'Encontro de famílias', accent: 'green', icon: 'family' },
  { id: 'ebd', tag: 'Ensino', titulo: 'Escola bíblica dominical', accent: 'blue', icon: 'book' },
]

export const personTypeOptions: Array<{ value: PublicPersonType; label: string }> = [
  { value: 'visitante', label: 'Visitante' },
  { value: 'membro', label: 'Membro' },
  { value: 'convidado', label: 'Convidado' },
]

export const logradouroOptions = [
  'Rua',
  'Avenida',
  'Alameda',
  'Travessa',
  'Estrada',
  'Rodovia',
  'Praça',
  'Quadra',
  'Viela',
  'Passagem',
  'Vila',
  'Ladeira',
  'Beco',
]

export const churchRoleOptions: Array<{ value: ChurchRole; label: string }> = [
  { value: 'pastor', label: 'Pastor' },
  { value: 'presbitero', label: 'Presbítero' },
  { value: 'diacono', label: 'Diácono' },
  { value: 'diaconisa', label: 'Diaconisa' },
  { value: 'missionario', label: 'Missionário' },
  { value: 'missionaria', label: 'Missionária' },
  { value: 'evangelista', label: 'Evangelista' },
  { value: 'cooperador', label: 'Cooperador' },
  { value: 'obreiro', label: 'Obreiro' },
  { value: 'secretario', label: 'Secretário' },
  { value: 'tesoureiro', label: 'Tesoureiro' },
  { value: 'dirigente', label: 'Dirigente de congregação' },
  { value: 'professor_ebd', label: 'Professor(a) de EBD' },
  { value: 'lider_jovens', label: 'Líder de jovens' },
  { value: 'lider_mulheres', label: 'Líder de mulheres' },
  { value: 'lider_louvor', label: 'Líder de louvor' },
  { value: 'outro', label: 'Outra função' },
]

export const congregations: Congregation[] = [
  {
    id: 'sede',
    nome: 'Templo Sede',
    tipo: 'sede',
    categoria: 'capital_sede',
    endereco: 'BR-174, Km 32, Nº 320, PA Nova Amazônia, Boa Vista - RR',
    pastorResponsavel: 'Pastor Sebastião Salazar Jansem',
    telefone: '(95) 00000-0000',
    latitude: 2.8235,
    longitude: -60.6758,
    ativa: true,
  },
  {
    id: 'cong-01',
    nome: 'Congregação Zona Oeste',
    tipo: 'congregacao',
    categoria: 'capital_filial',
    endereco: 'Boa Vista, RR',
    pastorResponsavel: 'Dirigente Local',
    telefone: '(95) 00000-0000',
    latitude: 2.8197,
    longitude: -60.7146,
    ativa: true,
  },
  {
    id: 'cong-02',
    nome: 'Congregação Interior',
    tipo: 'congregacao',
    categoria: 'interior_filial',
    endereco: 'Roraima',
    pastorResponsavel: 'Dirigente Local',
    telefone: '(95) 00000-0000',
    latitude: 2.7376,
    longitude: -62.0751,
    ativa: true,
  },
]

export const publicEvents: ChurchEvent[] = [
  {
    id: 'domingo',
    titulo: 'Culto de celebração',
    data: 'Domingo',
    horario: '19h00',
    local: 'Templo Sede',
    categoria: 'culto',
  },
  {
    id: 'ensino',
    titulo: 'Culto de ensino',
    data: 'Quarta-feira',
    horario: '19h30',
    local: 'Templo Sede',
    categoria: 'culto',
  },
  {
    id: 'missao',
    titulo: 'Reunião de missões',
    data: 'Sábado',
    horario: '17h00',
    local: 'Sala de apoio',
    categoria: 'missao',
  },
]

export const leadership = [
  { nome: 'Pastor Presidente', cargo: 'Presidência' },
  { nome: 'Vice-presidente', cargo: 'Vice-presidência' },
  { nome: 'Secretaria Geral', cargo: 'Secretaria' },
  { nome: 'Tesouraria Geral', cargo: 'Tesouraria' },
]

export const serviceScale = [
  { data: 'Domingo', culto: 'Celebração', dirigente: 'Presbítero responsável', pregador: 'Pastor convidado' },
  { data: 'Quarta-feira', culto: 'Ensino', dirigente: 'Diácono responsável', pregador: 'Pastor local' },
  { data: '1º Domingo', culto: 'Santa Ceia', dirigente: 'Diretoria', pregador: 'Pastor Presidente' },
]
