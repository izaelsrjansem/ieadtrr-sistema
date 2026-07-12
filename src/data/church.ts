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

export const brazilStates = [
  { uf: 'AC', nome: 'Acre' },
  { uf: 'AL', nome: 'Alagoas' },
  { uf: 'AP', nome: 'Amapá' },
  { uf: 'AM', nome: 'Amazonas' },
  { uf: 'BA', nome: 'Bahia' },
  { uf: 'CE', nome: 'Ceará' },
  { uf: 'DF', nome: 'Distrito Federal' },
  { uf: 'ES', nome: 'Espírito Santo' },
  { uf: 'GO', nome: 'Goiás' },
  { uf: 'MA', nome: 'Maranhão' },
  { uf: 'MT', nome: 'Mato Grosso' },
  { uf: 'MS', nome: 'Mato Grosso do Sul' },
  { uf: 'MG', nome: 'Minas Gerais' },
  { uf: 'PA', nome: 'Pará' },
  { uf: 'PB', nome: 'Paraíba' },
  { uf: 'PR', nome: 'Paraná' },
  { uf: 'PE', nome: 'Pernambuco' },
  { uf: 'PI', nome: 'Piauí' },
  { uf: 'RJ', nome: 'Rio de Janeiro' },
  { uf: 'RN', nome: 'Rio Grande do Norte' },
  { uf: 'RS', nome: 'Rio Grande do Sul' },
  { uf: 'RO', nome: 'Rondônia' },
  { uf: 'RR', nome: 'Roraima' },
  { uf: 'SC', nome: 'Santa Catarina' },
  { uf: 'SP', nome: 'São Paulo' },
  { uf: 'SE', nome: 'Sergipe' },
  { uf: 'TO', nome: 'Tocantins' },
]

export const roraimaMunicipalities = [
  'Alto Alegre',
  'Amajari',
  'Boa Vista',
  'Bonfim',
  'Cantá',
  'Caracaraí',
  'Caroebe',
  'Iracema',
  'Mucajaí',
  'Normandia',
  'Pacaraima',
  'Rorainópolis',
  'São João da Baliza',
  'São Luiz',
  'Uiramutã',
]

export const boaVistaNeighborhoods = [
  '13 de Setembro',
  'Aeroporto',
  'Alvorada',
  'Aparecida',
  'Asa Branca',
  'Bela Vista',
  'Buritis',
  'Caçari',
  'Calungá',
  'Cambará',
  'Canarinho',
  'Caranã',
  'Cauamé',
  'Centenário',
  'Centro',
  'Cinturão Verde',
  'Cidade Satélite',
  'Cinturão Verde',
  'Cruviana',
  'Distrito Industrial',
  'Dos Estados',
  'Equatorial',
  'Jardim Caranã',
  'Jardim Equatorial',
  'Jardim Floresta',
  'Jardim Primavera',
  'Jóquei Clube',
  'Liberdade',
  'Mecejana',
  'Nova Canaã',
  'Nova Cidade',
  'Olímpico',
  'Operário',
  'Paraviana',
  'Pintolândia',
  'Pricumã',
  'Raiar do Sol',
  'Santa Luzia',
  'Santa Tereza',
  'São Bento',
  'São Francisco',
  'São Pedro',
  'Senador Hélio Campos',
  'Tancredo Neves',
  'União',
  '31 de Março',
].filter((item, index, list) => list.indexOf(item) === index)

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
    categoria: 'capital',
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
    categoria: 'capital',
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
    categoria: 'interior',
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
