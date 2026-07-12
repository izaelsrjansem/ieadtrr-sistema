import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, FileUp, MessageCircle, Send, ShieldCheck, UserRound, X } from 'lucide-react'
import { z } from 'zod'
import { useAuth } from '../context/AuthContext'
import {
  brazilStates,
  churchRoleOptions,
  congregations as fallbackCongregations,
  logradouroOptions,
  personTypeOptions,
  roraimaMunicipalities,
} from '../data/church'
import { NeighborhoodCombobox, OptionsCombobox } from './NeighborhoodCombobox'
import {
  findExistingRegistrationByEmail,
  findExistingRegistrationByCpf,
  submitMembershipRequest,
  type ExistingEmailRegistration,
  type ExistingCpfRegistration,
} from '../services/membership'
import { subscribeCongregations } from '../services/congregations'
import { completeCongregadoProfile, completeVisitorProfile, markMemberRegistrationProfile } from '../services/users'
import type { ChurchRole, Congregation, MemberRegistration, PublicPersonType } from '../types'

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

function maskCpf(value: string): string {
  const digits = onlyDigits(value).slice(0, 11)
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function maskPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, 11)

  if (digits.length <= 2) {
    return digits
  }

  if (digits.length <= 6) {
    return digits.replace(/(\d{2})(\d+)/, '($1) $2')
  }

  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d{4})(\d+)/, '($1) $2-$3')
  }

  return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
}

function maskCep(value: string): string {
  const digits = onlyDigits(value).slice(0, 8)
  return digits.replace(/(\d{5})(\d)/, '$1-$2')
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

function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value)

  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false
  }

  let sum = 0
  for (let i = 0; i < 9; i += 1) {
    sum += Number(cpf[i]) * (10 - i)
  }
  let firstDigit = 11 - (sum % 11)
  if (firstDigit >= 10) {
    firstDigit = 0
  }
  if (firstDigit !== Number(cpf[9])) {
    return false
  }

  sum = 0
  for (let i = 0; i < 10; i += 1) {
    sum += Number(cpf[i]) * (11 - i)
  }
  let secondDigit = 11 - (sum % 11)
  if (secondDigit >= 10) {
    secondDigit = 0
  }

  return secondDigit === Number(cpf[10])
}

function ageBetween(birthDate: string, referenceDate: string): number | null {
  if (!birthDate || !referenceDate) {
    return null
  }

  const birth = new Date(birthDate)
  const reference = new Date(referenceDate)

  if (Number.isNaN(birth.getTime()) || Number.isNaN(reference.getTime())) {
    return null
  }

  let age = reference.getFullYear() - birth.getFullYear()
  const monthDiff = reference.getMonth() - birth.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && reference.getDate() < birth.getDate())) {
    age -= 1
  }

  return age
}

function todayDateKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function memberBaptismBlockMessage(data: MemberRegistration): string {
  if (data.tipoPessoa !== 'membro' || !data.dataNascimento) {
    return ''
  }

  const referenceDate = data.dataBatismo || todayDateKey()
  const birth = new Date(data.dataNascimento)
  const reference = new Date(referenceDate)

  if (Number.isNaN(birth.getTime()) || Number.isNaN(reference.getTime()) || birth > reference) {
    return ''
  }

  const age = ageBetween(data.dataNascimento, referenceDate)

  if (age === null || age >= 12) {
    return ''
  }

  return data.dataBatismo
    ? 'Esta pessoa não pode ser cadastrada como membro, porque na data informada para o batismo ela ainda não tinha 12 anos. Pela doutrina da igreja, o batismo nas águas ocorre a partir dos 12 anos.'
    : 'Esta pessoa não pode ser cadastrada como membro neste momento, porque ainda não tem idade doutrinária para o batismo nas águas ou ainda não foi batizada. Cadastre como congregado até preencher esse requisito.'
}

const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

const registrationSchema = z
  .object({
    nomeCompleto: z.string(),
    email: z.string(),
    telefone: z.string(),
    possuiWhatsapp: z.boolean(),
    convidadoPor: z.string().optional(),
    cpf: z.string(),
    rg: z.string(),
    rgUf: z.string(),
    dataNascimento: z.string(),
    sexo: z.enum(['', 'masculino', 'feminino']),
    tipoPessoa: z.enum(['visitante', 'membro', 'convidado', 'congregado']),
    possuiCargo: z.boolean(),
    cargo: z.string().optional(),
    outroCargo: z.string().optional(),
    congregacao: z.string(),
    endereco: z.object({
      pais: z.string(),
      tipoLogradouro: z.string(),
      cep: z.string(),
      rua: z.string(),
      numero: z.string(),
      complemento: z.string(),
      bairro: z.string(),
      cidade: z.string(),
      estado: z.string(),
    }),
    dataBatismo: z.string().optional(),
    dataAceitacao: z.string().optional(),
    fotoModo: z.enum(['unica', 'frente_verso']),
    fotoArquivo: z.string().optional(),
    fotoVersoArquivo: z.string().optional(),
    cartaMudancaPaginas: z.enum(['unica', 'multiplas']),
    cartaMudancaArquivo: z.string().optional(),
    cartaRecomendacaoPaginas: z.enum(['unica', 'multiplas']),
    cartaRecomendacaoArquivo: z.string().optional(),
    observacoes: z.string().optional(),
    consentimentoLgpd: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.nomeCompleto.trim().split(/\s+/).filter(Boolean).length < 2) {
      ctx.addIssue({ code: 'custom', path: ['nomeCompleto'], message: 'Informe o nome completo (nome e sobrenome).' })
    }

    if (!emailPattern.test(data.email.trim())) {
      ctx.addIssue({ code: 'custom', path: ['email'], message: 'Informe um e-mail válido.' })
    }

    if (onlyDigits(data.telefone).length < 10) {
      ctx.addIssue({ code: 'custom', path: ['telefone'], message: 'Informe um telefone com DDD.' })
    }

    if (!data.dataNascimento) {
      ctx.addIssue({ code: 'custom', path: ['dataNascimento'], message: 'Informe a data de nascimento.' })
    } else if (new Date(data.dataNascimento) > new Date()) {
      ctx.addIssue({ code: 'custom', path: ['dataNascimento'], message: 'A data de nascimento não pode ser futura.' })
    }

    if (!data.sexo) {
      ctx.addIssue({ code: 'custom', path: ['sexo'], message: 'Selecione o sexo.' })
    }

    if (!data.congregacao) {
      ctx.addIssue({ code: 'custom', path: ['congregacao'], message: 'Selecione a congregação.' })
    }

    if (data.tipoPessoa === 'convidado' && !data.convidadoPor?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['convidadoPor'], message: 'Informe quem convidou.' })
    }

    if (data.consentimentoLgpd !== true) {
      ctx.addIssue({
        code: 'custom',
        path: ['consentimentoLgpd'],
        message: 'É necessário autorizar o uso dos dados para fins administrativos da igreja.',
      })
    }

    if (data.tipoPessoa === 'membro' || data.tipoPessoa === 'congregado') {
      if (!isValidCpf(data.cpf)) {
        ctx.addIssue({ code: 'custom', path: ['cpf'], message: 'Informe um CPF válido.' })
      }

      if (!data.endereco.pais.trim()) {
        ctx.addIssue({ code: 'custom', path: ['endereco', 'pais'], message: 'Informe o país.' })
      }

      if (!data.endereco.tipoLogradouro) {
        ctx.addIssue({ code: 'custom', path: ['endereco', 'tipoLogradouro'], message: 'Selecione o tipo de logradouro.' })
      }

      if (data.endereco.rua.trim().length < 3) {
        ctx.addIssue({ code: 'custom', path: ['endereco', 'rua'], message: 'Informe o nome do logradouro.' })
      }

      if (!data.endereco.numero.trim()) {
        ctx.addIssue({ code: 'custom', path: ['endereco', 'numero'], message: 'Informe o número.' })
      }

      if (data.endereco.bairro.trim().length < 2) {
        ctx.addIssue({ code: 'custom', path: ['endereco', 'bairro'], message: 'Informe o bairro.' })
      }

      if (data.endereco.cidade.trim().length < 2) {
        ctx.addIssue({ code: 'custom', path: ['endereco', 'cidade'], message: 'Informe a cidade.' })
      }

      if (data.endereco.estado.trim().length < 2) {
        ctx.addIssue({ code: 'custom', path: ['endereco', 'estado'], message: 'Informe o estado.' })
      }

      if (data.tipoPessoa === 'congregado' && !data.dataAceitacao) {
        ctx.addIssue({ code: 'custom', path: ['dataAceitacao'], message: 'Informe a data de aceitação.' })
      }

      if (data.tipoPessoa === 'membro' && !data.dataBatismo) {
        ctx.addIssue({ code: 'custom', path: ['dataBatismo'], message: 'Informe a data de batismo para cadastrar como membro.' })
      }

      if (data.dataBatismo) {
        const age = ageBetween(data.dataNascimento, data.dataBatismo)
        if (age !== null && age < 12) {
          ctx.addIssue({
            code: 'custom',
            path: ['dataBatismo'],
            message: 'O batismo, por doutrina da igreja, só ocorre a partir dos 12 anos de idade.',
          })
        }
      }

      if (data.tipoPessoa === 'congregado' && data.possuiCargo) {
        ctx.addIssue({ code: 'custom', path: ['possuiCargo'], message: 'Cargo/função é permitido somente para membro batizado.' })
      }

      if (data.tipoPessoa === 'membro' && data.possuiCargo && !data.cargo) {
        ctx.addIssue({ code: 'custom', path: ['cargo'], message: 'Selecione a função/cargo.' })
      }

      if (data.tipoPessoa === 'membro' && data.possuiCargo && data.cargo === 'outro' && !data.outroCargo?.trim()) {
        ctx.addIssue({ code: 'custom', path: ['outroCargo'], message: 'Especifique a outra função.' })
      }
    }
  })

type ErrorMap = Record<string, string>

type RegistrationFormProps = {
  mode?: 'self' | 'admin'
  fixedTipoPessoa?: PublicPersonType
  allowedPersonTypes?: PublicPersonType[]
  onSuccess?: (result: { protocol: string; nomeCompleto: string; tipoPessoa: PublicPersonType }) => void
}

const initialForm: MemberRegistration = {
  nomeCompleto: '',
  email: '',
  telefone: '',
  possuiWhatsapp: false,
  convidadoPor: '',
  cpf: '',
  rg: '',
  rgUf: 'RR',
  dataNascimento: '',
  sexo: '',
  tipoPessoa: 'visitante',
  possuiCargo: false,
  cargo: undefined,
  outroCargo: '',
  congregacao: '',
  endereco: {
    pais: 'Brasil',
    tipoLogradouro: '',
    cep: '',
    rua: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: 'Boa Vista',
    estado: 'RR',
  },
  dataBatismo: '',
  dataAceitacao: '',
  fotoModo: 'unica',
  fotoArquivo: '',
  fotoVersoArquivo: '',
  cartaMudancaPaginas: 'unica',
  cartaMudancaArquivo: '',
  cartaRecomendacaoPaginas: 'unica',
  cartaRecomendacaoArquivo: '',
  observacoes: '',
  consentimentoLgpd: false,
}

function mapErrors(error: z.ZodError): ErrorMap {
  return error.issues.reduce<ErrorMap>((acc, issue) => {
    acc[issue.path.join('.')] = issue.message
    return acc
  }, {})
}

function fileNames(files: FileList | null): string {
  if (!files || files.length === 0) {
    return ''
  }

  return Array.from(files)
    .map((file) => file.name)
    .join(', ')
}

function RequiredHint() {
  return <span className="required-hint">Campo obrigatório</span>
}

function personTypeLabel(value: PublicPersonType): string {
  if (value === 'congregado') {
    return 'Congregado'
  }

  return personTypeOptions.find((option) => option.value === value)?.label ?? value
}

export function RegistrationForm({ mode = 'self', fixedTipoPessoa, allowedPersonTypes, onSuccess }: RegistrationFormProps) {
  const { firebaseUser, profile } = useAuth()
  const isAdminMode = mode === 'admin'
  const accountEmail = isAdminMode ? '' : (firebaseUser?.email ?? profile?.email ?? '')
  const accountName = isAdminMode ? '' : (profile?.nomeCompleto ?? firebaseUser?.displayName ?? '')
  const [form, setForm] = useState<MemberRegistration>(initialForm)
  const [errors, setErrors] = useState<ErrorMap>({})
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [lastProtocol, setLastProtocol] = useState<string>('')
  const [lastSuccessName, setLastSuccessName] = useState<string>('')
  const [lastSuccessType, setLastSuccessType] = useState<PublicPersonType>('visitante')
  const [cepStatus, setCepStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [floatingNotice, setFloatingNotice] = useState('')
  const [existingCpfRegistration, setExistingCpfRegistration] = useState<ExistingCpfRegistration | null>(null)
  const [existingEmailRegistration, setExistingEmailRegistration] = useState<ExistingEmailRegistration | null>(null)
  const [congregationList, setCongregationList] = useState<Congregation[]>(fallbackCongregations)

  const isMembro = form.tipoPessoa === 'membro'
  const isCongregado = form.tipoPessoa === 'congregado'
  const isFullCadastro = isMembro || isCongregado
  const canAdminAssignCargo = isAdminMode && isMembro
  const isConvidado = form.tipoPessoa === 'convidado'
  const activeCongregations = congregationList.filter((congregation) => congregation.ativa !== false)
  const isMemberCongregadoOnly =
    allowedPersonTypes?.length ? allowedPersonTypes.every((type) => type === 'membro' || type === 'congregado') : false
  const availablePersonTypes = useMemo(
    () =>
      allowedPersonTypes
        ? allowedPersonTypes.map((value) => ({ value, label: personTypeLabel(value) }))
        : personTypeOptions,
    [allowedPersonTypes],
  )

  const selectedRoleLabel = useMemo(() => {
    if (!form.cargo) {
      return ''
    }

    if (form.cargo === 'outro') {
      return form.outroCargo ?? ''
    }

    return churchRoleOptions.find((role) => role.value === form.cargo)?.label ?? ''
  }, [form.cargo, form.outroCargo])

  useEffect(() => {
    if (isAdminMode || !firebaseUser) {
      return
    }

    setForm((current) => ({
      ...current,
      email: accountEmail || current.email,
      nomeCompleto: current.nomeCompleto || accountName,
      telefone: current.telefone || profile?.telefone || '',
      dataNascimento: current.dataNascimento || profile?.dataNascimento || '',
      sexo: current.sexo || profile?.sexo || '',
      congregacao: current.congregacao || profile?.congregacao || '',
      tipoPessoa:
        profile?.tipoPessoa === 'visitante' || profile?.tipoPessoa === 'convidado' || profile?.tipoPessoa === 'congregado'
          ? profile.tipoPessoa
          : current.tipoPessoa,
      convidadoPor: current.convidadoPor || profile?.convidadoPor || '',
      cpf: current.cpf || profile?.cpf || '',
      rg: current.rg || profile?.rg || '',
      possuiWhatsapp: current.possuiWhatsapp || profile?.possuiWhatsapp || false,
      endereco: profile?.endereco ? { ...current.endereco, ...profile.endereco } : current.endereco,
      dataAceitacao: current.dataAceitacao || profile?.dataAceitacao || '',
      observacoes: current.observacoes || profile?.observacoes || '',
    }))
  }, [
    accountEmail,
    accountName,
    firebaseUser,
    isAdminMode,
    profile?.congregacao,
    profile?.convidadoPor,
    profile?.dataNascimento,
    profile?.sexo,
    profile?.dataAceitacao,
    profile?.cpf,
    profile?.endereco,
    profile?.observacoes,
    profile?.possuiWhatsapp,
    profile?.rg,
    profile?.telefone,
    profile?.tipoPessoa,
  ])

  useEffect(() => {
    if (!fixedTipoPessoa) {
      return
    }

    setForm((current) => ({
      ...current,
      tipoPessoa: fixedTipoPessoa,
      possuiCargo: fixedTipoPessoa === 'membro' ? current.possuiCargo : false,
      cargo: fixedTipoPessoa === 'membro' ? current.cargo : undefined,
      outroCargo: fixedTipoPessoa === 'membro' ? current.outroCargo : '',
      dataBatismo: fixedTipoPessoa === 'membro' ? current.dataBatismo : '',
    }))
  }, [fixedTipoPessoa])

  useEffect(() => {
    if (fixedTipoPessoa || !allowedPersonTypes?.length || allowedPersonTypes.includes(form.tipoPessoa)) {
      return
    }

    const nextTipoPessoa = allowedPersonTypes[0]
    setForm((current) => ({
      ...current,
      tipoPessoa: nextTipoPessoa,
      possuiCargo: nextTipoPessoa === 'membro' ? current.possuiCargo : false,
      cargo: nextTipoPessoa === 'membro' ? current.cargo : undefined,
      outroCargo: nextTipoPessoa === 'membro' ? current.outroCargo : '',
      dataBatismo: nextTipoPessoa === 'membro' ? current.dataBatismo : '',
    }))
  }, [allowedPersonTypes, fixedTipoPessoa, form.tipoPessoa])

  useEffect(() => {
    if (isMembro && isAdminMode) {
      return
    }

    setForm((current) =>
      current.possuiCargo || current.cargo || current.outroCargo || (!isMembro && current.dataBatismo)
        ? {
            ...current,
            possuiCargo: false,
            cargo: undefined,
            outroCargo: '',
            dataBatismo: isMembro ? current.dataBatismo : '',
          }
        : current,
    )
  }, [isAdminMode, isMembro, form.tipoPessoa])

  useEffect(() => subscribeCongregations(setCongregationList), [])

  function clearFieldError(name: string) {
    setErrors((current) => {
      if (!current[name]) {
        return current
      }

      const { [name]: _removed, ...nextErrors } = current
      return nextErrors
    })
  }

  function updateField<K extends keyof MemberRegistration>(field: K, value: MemberRegistration[K]) {
    setForm((current) => ({ ...current, [field]: value }))
    if (field === 'cpf') {
      setExistingCpfRegistration(null)
    }

    if (field === 'email') {
      setExistingEmailRegistration(null)
    }

    if (field === 'tipoPessoa') {
      setErrors({})
      return
    }

    clearFieldError(String(field))
  }

  function updateAddress(field: keyof MemberRegistration['endereco'], value: string) {
    setForm((current) => ({
      ...current,
      endereco: {
        ...current.endereco,
        [field]: value,
      },
    }))
    clearFieldError(`endereco.${field}`)
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
      setErrors((current) => {
        const {
          ['endereco.pais']: _pais,
          ['endereco.tipoLogradouro']: _tipoLogradouro,
          ['endereco.rua']: _rua,
          ['endereco.bairro']: _bairro,
          ['endereco.cidade']: _cidade,
          ['endereco.estado']: _estado,
          ...nextErrors
        } = current
        return nextErrors
      })
      setCepStatus('idle')
    } catch {
      setCepStatus('error')
    }
  }

  function fieldError(name: string) {
    return errors[name] ? <span className="field-error">{errors[name]}</span> : null
  }

  function fieldErrorClass(name: string) {
    return errors[name] ? 'field-control-error' : undefined
  }

  function lineErrorClass(name: string, baseClass: string) {
    return errors[name] ? `${baseClass} required-field-missing-line` : baseClass
  }

  function existingCpfSourceLabel(registration: ExistingCpfRegistration) {
    if (registration.source === 'members') {
      return 'cadastro oficial'
    }

    if (registration.source === 'users') {
      return 'perfil de usuário'
    }

    return 'solicitação de cadastro'
  }

  function duplicateCpfAlert(compact = false) {
    if (!existingCpfRegistration) {
      return null
    }

    const AlertTag = compact ? 'span' : 'div'

    return (
      <AlertTag className={compact ? 'field-inline-alert duplicate-cpf-inline' : 'form-alert warning duplicate-cpf-alert'}>
        <ShieldCheck aria-hidden="true" />
        <span>
          CPF já cadastrado em {existingCpfSourceLabel(existingCpfRegistration)}:{' '}
          <strong>{existingCpfRegistration.nomeCompleto}</strong>
          {existingCpfRegistration.status ? ` (${existingCpfRegistration.status})` : ''}. Edite o cadastro existente em vez de criar um novo.
          <small>Protocolo/ID: {existingCpfRegistration.id}</small>
        </span>
      </AlertTag>
    )
  }

  function duplicateEmailAlert(compact = false) {
    if (!existingEmailRegistration) {
      return null
    }

    const AlertTag = compact ? 'span' : 'div'

    return (
      <AlertTag className={compact ? 'field-inline-alert duplicate-cpf-inline' : 'form-alert warning duplicate-cpf-alert'}>
        <ShieldCheck aria-hidden="true" />
        <span>
          Este e-mail jÃ¡ estÃ¡ cadastrado em {existingCpfSourceLabel(existingEmailRegistration)}:{' '}
          <strong>{existingEmailRegistration.nomeCompleto}</strong>
          {existingEmailRegistration.status ? ` (${existingEmailRegistration.status})` : ''}. Busque, recupere o seu acesso,
          use a opÃ§Ã£o de recuperar acesso, ou faÃ§a um cadastro com outro e-mail.
          <small>Protocolo/ID: {existingEmailRegistration.id}</small>
        </span>
      </AlertTag>
    )
  }

  function baptismDateField() {
    if (!isMembro) {
      return null
    }

    const baptismNotice = memberBaptismBlockMessage(form)

    return (
      <label className="baptism-date-field">
        <span>Data de batismo {isMembro ? <RequiredHint /> : <span className="optional-tag">(opcional)</span>}</span>
        <input
          className={fieldErrorClass('dataBatismo')}
          type="date"
          value={form.dataBatismo}
          onChange={(event) => updateField('dataBatismo', event.target.value)}
        />
        <small className="field-hint">
          Para congregado este campo não aparece. Para membro, a data de batismo é obrigatória e precisa respeitar a idade doutrinária.
        </small>
        {baptismNotice ? (
          <span className="field-inline-alert baptism-rule-alert">
            <ShieldCheck aria-hidden="true" />
            <span>{baptismNotice}</span>
          </span>
        ) : null}
        {fieldError('dataBatismo')}
      </label>
    )
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('sending')
    setErrors({})
    setFloatingNotice('')

    const formForValidation = isAdminMode
      ? form
      : {
          ...form,
          possuiCargo: false,
          cargo: undefined,
          outroCargo: '',
        }

    const baptismBlockMessage = memberBaptismBlockMessage(formForValidation as MemberRegistration)
    if (baptismBlockMessage) {
      setFloatingNotice(baptismBlockMessage)
      setStatus('idle')
      return
    }

    const parsed = registrationSchema.safeParse(formForValidation)

    if (!parsed.success) {
      setErrors(mapErrors(parsed.error))
      setStatus('idle')
      return
    }

    try {
      const currentUid = firebaseUser?.uid ?? ''
      let successProtocol = ''

      if (!isAdminMode && !currentUid) {
        throw new Error('auth-required')
      }

      const data = {
        ...parsed.data,
        email: (isAdminMode ? parsed.data.email.trim() : accountEmail || parsed.data.email.trim()).toLowerCase(),
      }

      const existingEmail = await findExistingRegistrationByEmail(data.email, currentUid)
      if (existingEmail) {
        setExistingEmailRegistration(existingEmail)
        setErrors({ email: 'Este e-mail jÃ¡ estÃ¡ cadastrado.' })
        setStatus('idle')
        return
      }

      if (isAdminMode && (data.tipoPessoa === 'membro' || data.tipoPessoa === 'congregado')) {
        const existingRegistration = await findExistingRegistrationByCpf(
          data.cpf,
          isAdminMode ? undefined : currentUid,
        )
        if (existingRegistration) {
          setExistingCpfRegistration(existingRegistration)
          setErrors({ cpf: 'Este CPF já possui cadastro no sistema.' })
          setStatus('idle')
          return
        }
      }

      if (!isAdminMode) {
        data.possuiCargo = false
        data.cargo = undefined
        data.outroCargo = ''
      }

      if (isAdminMode) {
        const result = await submitMembershipRequest(data as MemberRegistration)
        successProtocol = result.id
        setLastProtocol(result.id)
        setForm(initialForm)
      } else if (isCongregado) {
        await completeCongregadoProfile(currentUid, {
          ...(data as MemberRegistration),
          tipoPessoa: 'congregado',
          possuiCargo: false,
          cargo: undefined,
          outroCargo: '',
          dataBatismo: '',
        })
      } else if (isMembro) {
        const result = await submitMembershipRequest(data as MemberRegistration, currentUid)
        successProtocol = result.id
        await markMemberRegistrationProfile(currentUid, {
          email: data.email,
          nomeCompleto: data.nomeCompleto.trim(),
          tipoPessoa: 'membro',
          congregacao: data.congregacao,
          telefone: data.telefone,
          dataNascimento: data.dataNascimento,
          sexo: data.sexo,
        })
        setLastProtocol(result.id)
      } else {
        await completeVisitorProfile(currentUid, {
          email: data.email,
          nomeCompleto: data.nomeCompleto.trim(),
          tipoPessoa: data.tipoPessoa === 'convidado' ? 'convidado' : 'visitante',
          congregacao: data.congregacao,
          telefone: data.telefone,
          dataNascimento: data.dataNascimento,
          sexo: data.sexo,
          convidadoPor: isConvidado ? data.convidadoPor?.trim() : undefined,
          observacoes: data.observacoes?.trim() || undefined,
        })
      }

      setLastSuccessName(data.nomeCompleto.trim())
      setLastSuccessType(data.tipoPessoa)
      setStatus('success')
      onSuccess?.({ protocol: successProtocol, nomeCompleto: data.nomeCompleto.trim(), tipoPessoa: data.tipoPessoa })
    } catch (error) {
      const code = (error as { code?: string }).code

      if (code === 'permission-denied') {
        setErrors({ tipoPessoa: 'As regras do Firestore precisam ser republicadas para concluir este cadastro.' })
        setStatus('idle')
      } else {
        setStatus('error')
      }
    }
  }

  return (
    <form className="registration-form" onSubmit={handleSubmit}>
      <div className="form-band">
        <div>
          <p className="eyebrow">Cadastro nominal</p>
          <h2>{isMemberCongregadoOnly ? 'Dados de membros e congregados' : 'Dados do membro, visitante ou convidado'}</h2>
        </div>
        <UserRound aria-hidden="true" />
      </div>

      <fieldset>
        <legend>Tipo de cadastro</legend>
        <div className="type-picker">
          {fixedTipoPessoa ? (
            <label className="active">
              <input type="radio" name="tipoPessoa" value={fixedTipoPessoa} checked readOnly />
              {personTypeLabel(fixedTipoPessoa)}
            </label>
          ) : (
            availablePersonTypes.map((option) => (
              <label key={option.value} className={form.tipoPessoa === option.value ? 'active' : undefined}>
                <input
                  type="radio"
                  name="tipoPessoa"
                  value={option.value}
                  checked={form.tipoPessoa === option.value}
                  onChange={() => updateField('tipoPessoa', option.value)}
                />
                {option.label}
              </label>
            ))
          )}
        </div>
        <p className="selection-note">
          {isAdminMode
            ? isMemberCongregadoOnly
              ? 'Registro feito pela administração para classificar a pessoa como membro ou congregado, sem criar login e senha.'
              : 'Registro feito pela administração, sem criar acesso de login para a pessoa.'
            : isCongregado
              ? 'Preencha os dados de congregado. O batismo será informado pela administração quando houver promoção a membro.'
              : isMembro
              ? 'O cadastro de membro passa por aprovação da administração.'
              : 'Cadastro simples, sem necessidade de documentos.'}
        </p>
      </fieldset>

      <fieldset>
        <legend>Identificação</legend>
        <div className="form-grid">
          <label className={isFullCadastro ? undefined : 'wide-field'}>
            Nome completo
            <RequiredHint />
            <input
              className={fieldErrorClass('nomeCompleto')}
              value={form.nomeCompleto}
              onChange={(event) => updateField('nomeCompleto', event.target.value)}
              placeholder="Nome e sobrenome"
            />
            {fieldError('nomeCompleto')}
          </label>

          {isConvidado ? (
            <label className="wide-field">
              Convidado por
              <RequiredHint />
              <input
                className={fieldErrorClass('convidadoPor')}
                value={form.convidadoPor}
                onChange={(event) => updateField('convidadoPor', event.target.value)}
                placeholder="Nome do membro que convidou"
              />
              <small className="field-hint">Nome da pessoa/membro que fez o convite.</small>
              {fieldError('convidadoPor')}
            </label>
          ) : null}

          {isFullCadastro ? (
            <>
              <label>
                CPF
                <RequiredHint />
                <input
                  className={fieldErrorClass('cpf')}
                  value={form.cpf}
                  onChange={(event) => updateField('cpf', maskCpf(event.target.value))}
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                />
                {fieldError('cpf')}
                {duplicateCpfAlert(true)}
              </label>

              <label>
                RG
                <span className="optional-tag">(opcional)</span>
                <input
                  className={fieldErrorClass('rg')}
                  value={form.rg}
                  onChange={(event) => updateField('rg', onlyDigits(event.target.value))}
                  inputMode="numeric"
                  placeholder="Número do RG"
                />
                {fieldError('rg')}
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
            </>
          ) : null}

          <label>
            Data de nascimento
            <RequiredHint />
            <input
              className={fieldErrorClass('dataNascimento')}
              type="date"
              value={form.dataNascimento}
              onChange={(event) => updateField('dataNascimento', event.target.value)}
            />
            {fieldError('dataNascimento')}
          </label>

          <label>
            Sexo
            <RequiredHint />
            <select
              className={fieldErrorClass('sexo')}
              value={form.sexo}
              onChange={(event) => updateField('sexo', event.target.value as MemberRegistration['sexo'])}
            >
              <option value="">Selecione</option>
              <option value="masculino">Masculino</option>
              <option value="feminino">Feminino</option>
            </select>
            {fieldError('sexo')}
          </label>

          <label>
            Congregação
            <RequiredHint />
            <select
              className={fieldErrorClass('congregacao')}
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
            <small className="field-hint">
              {isFullCadastro ? 'Congregação que frequenta.' : 'Congregação que está visitando.'}
            </small>
            {fieldError('congregacao')}
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Contato{isFullCadastro ? ' e endereço' : ''}</legend>
        <div className="form-grid">
          <label>
            Telefone
            <RequiredHint />
            <input
              className={fieldErrorClass('telefone')}
              value={form.telefone}
              onChange={(event) => updateField('telefone', maskPhone(event.target.value))}
              inputMode="numeric"
              placeholder="(95) 99999-9999"
            />
            {fieldError('telefone')}
          </label>

          {isFullCadastro ? (
            <label className="checkbox-line whatsapp-option">
              <input
                type="checkbox"
                checked={form.possuiWhatsapp}
                onChange={(event) => updateField('possuiWhatsapp', event.target.checked)}
              />
              <MessageCircle aria-hidden="true" />
              Este número tem WhatsApp
            </label>
          ) : null}

          <label>
            {isAdminMode ? 'E-mail de contato' : 'E-mail do acesso'}
            <input
              className={fieldErrorClass('email')}
              type="email"
              value={form.email}
              readOnly={!isAdminMode}
              onChange={(event) => updateField('email', event.target.value)}
            />
            <small className="field-hint">
              {isAdminMode
                ? 'Este cadastro não cria login nem senha para a pessoa.'
                : 'Este e-mail vem do login usado para entrar no sistema.'}
            </small>
            {duplicateEmailAlert(true)}
            {fieldError('email')}
          </label>

          {isFullCadastro ? (
            <>
              <label>
                <span>CEP <span className="optional-tag">(opcional)</span></span>
                <input
                  className={fieldErrorClass('endereco.cep')}
                  value={form.endereco.cep}
                  onChange={(event) => updateAddress('cep', maskCep(event.target.value))}
                  onBlur={(event) => handleCepLookup(event.target.value)}
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
                  className={fieldErrorClass('endereco.pais')}
                  value={form.endereco.pais}
                  onChange={(event) => updateAddress('pais', event.target.value)}
                />
                {fieldError('endereco.pais')}
              </label>

              <label>
                Estado
                <RequiredHint />
                <select
                  className={fieldErrorClass('endereco.estado')}
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
                {fieldError('endereco.estado')}
              </label>

              <label>
                Município
                <RequiredHint />
                <OptionsCombobox
                  className={fieldErrorClass('endereco.cidade')}
                  value={form.endereco.cidade}
                  onChange={(value) => updateAddress('cidade', value)}
                  options={roraimaMunicipalities}
                  placeholder="Digite para buscar o município"
                  emptyText="Nenhum município encontrado"
                />
                {fieldError('endereco.cidade')}
              </label>

              <label>
                Bairro
                <RequiredHint />
                <NeighborhoodCombobox
                  className={fieldErrorClass('endereco.bairro')}
                  value={form.endereco.bairro}
                  onChange={(value) => updateAddress('bairro', value)}
                />
                {fieldError('endereco.bairro')}
              </label>

              <label>
                Tipo de logradouro
                <RequiredHint />
                <select
                  className={fieldErrorClass('endereco.tipoLogradouro')}
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
                {fieldError('endereco.tipoLogradouro')}
              </label>

              <label className="wide-field">
                Nome do logradouro
                <RequiredHint />
                <input
                  className={fieldErrorClass('endereco.rua')}
                  value={form.endereco.rua}
                  onChange={(event) => updateAddress('rua', event.target.value)}
                  placeholder="Ex.: das Flores"
                />
                {fieldError('endereco.rua')}
              </label>

              <label>
                Número
                <RequiredHint />
                <input
                  className={fieldErrorClass('endereco.numero')}
                  value={form.endereco.numero}
                  onChange={(event) => updateAddress('numero', event.target.value)}
                  placeholder="Nº"
                />
                {fieldError('endereco.numero')}
              </label>

              <label>
                <span>Complemento <span className="optional-tag">(opcional)</span></span>
                <input
                  className={fieldErrorClass('endereco.complemento')}
                  value={form.endereco.complemento}
                  onChange={(event) => updateAddress('complemento', event.target.value)}
                  placeholder="Apto, bloco, casa"
                />
              </label>

            </>
          ) : null}
        </div>
      </fieldset>

      {isFullCadastro ? (
        <fieldset>
          <legend>{isMembro ? 'Vida cristã e função eclesiástica' : 'Vida cristã'}</legend>
          <div className="form-grid">
            {canAdminAssignCargo ? (
              <>
                <div className="cargo-question wide-field">
                  <span className="cargo-question-label">Possui cargo ou função ministerial?</span>
                  <div className="doc-mode">
                    <label className={form.possuiCargo ? 'active' : undefined}>
                      <input
                        type="radio"
                        name="possuiCargo"
                        checked={form.possuiCargo === true}
                        onChange={() => setForm((current) => ({ ...current, possuiCargo: true }))}
                      />
                      Sim
                    </label>
                    <label className={form.possuiCargo === false ? 'active' : undefined}>
                      <input
                        type="radio"
                        name="possuiCargo"
                        checked={form.possuiCargo === false}
                        onChange={() =>
                          setForm((current) => ({ ...current, possuiCargo: false, cargo: undefined, outroCargo: '' }))
                        }
                      />
                      Não
                    </label>
                  </div>
                </div>

                {form.possuiCargo ? (
                  <>
                    <label>
                      Cargo/função
                      <RequiredHint />
                      <select
                        className={fieldErrorClass('cargo')}
                        value={form.cargo ?? ''}
                        onChange={(event) => updateField('cargo', event.target.value as ChurchRole)}
                      >
                        <option value="">Selecione</option>
                        {churchRoleOptions.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                      {fieldError('cargo')}
                    </label>

                    {form.cargo === 'outro' ? (
                      <label>
                        Especificar função
                        <RequiredHint />
                        <input
                          className={fieldErrorClass('outroCargo')}
                          value={form.outroCargo}
                          onChange={(event) => updateField('outroCargo', event.target.value)}
                        />
                        {fieldError('outroCargo')}
                      </label>
                    ) : null}
                  </>
                ) : null}
              </>
            ) : isMembro ? (
              <p className="selection-note wide-field">
                Cargo ou função ministerial será atribuído pela administração após a aprovação do cadastro.
              </p>
            ) : null}

            {baptismDateField()}

            <label>
              <span>Data de aceitação {isCongregado ? null : <span className="optional-tag">(opcional)</span>}</span>
              {isCongregado ? <RequiredHint /> : null}
              <input
                className={fieldErrorClass('dataAceitacao')}
                type="date"
                value={form.dataAceitacao}
                onChange={(event) => updateField('dataAceitacao', event.target.value)}
              />
              {fieldError('dataAceitacao')}
            </label>
          </div>

          {canAdminAssignCargo && selectedRoleLabel ? <p className="selection-note">Função informada: {selectedRoleLabel}</p> : null}
        </fieldset>
      ) : null}

      {isFullCadastro ? (
        <fieldset>
          <legend>Documentos</legend>

          <div className="doc-block">
            <p className="doc-title">Foto do documento</p>
            <div className="doc-mode">
              <label className={form.fotoModo === 'unica' ? 'active' : undefined}>
                <input
                  type="radio"
                  name="fotoModo"
                  checked={form.fotoModo === 'unica'}
                  onChange={() => updateField('fotoModo', 'unica')}
                />
                Foto única
              </label>
              <label className={form.fotoModo === 'frente_verso' ? 'active' : undefined}>
                <input
                  type="radio"
                  name="fotoModo"
                  checked={form.fotoModo === 'frente_verso'}
                  onChange={() => updateField('fotoModo', 'frente_verso')}
                />
                Frente e verso
              </label>
            </div>
            <div className="file-grid">
              <label className="file-input">
                <FileUp aria-hidden="true" />
                {form.fotoModo === 'frente_verso' ? 'Frente' : 'Foto'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => updateField('fotoArquivo', fileNames(event.target.files))}
                />
                <span>{form.fotoArquivo || 'Nenhum arquivo selecionado'}</span>
              </label>

              {form.fotoModo === 'frente_verso' ? (
                <label className="file-input">
                  <FileUp aria-hidden="true" />
                  Verso
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => updateField('fotoVersoArquivo', fileNames(event.target.files))}
                  />
                  <span>{form.fotoVersoArquivo || 'Nenhum arquivo selecionado'}</span>
                </label>
              ) : null}
            </div>
          </div>

          <DocumentUpload
            title="Carta de mudança"
            paginas={form.cartaMudancaPaginas}
            arquivo={form.cartaMudancaArquivo}
            onPaginasChange={(value) => updateField('cartaMudancaPaginas', value)}
            onFilesChange={(value) => updateField('cartaMudancaArquivo', value)}
          />

          <DocumentUpload
            title="Carta de recomendação"
            paginas={form.cartaRecomendacaoPaginas}
            arquivo={form.cartaRecomendacaoArquivo}
            onPaginasChange={(value) => updateField('cartaRecomendacaoPaginas', value)}
            onFilesChange={(value) => updateField('cartaRecomendacaoArquivo', value)}
          />
        </fieldset>
      ) : null}

      <fieldset>
        <legend>Observações</legend>
        <label className="wide-field notes-field">
          Observações (opcional)
          <textarea
            className={fieldErrorClass('observacoes')}
            value={form.observacoes}
            onChange={(event) => updateField('observacoes', event.target.value)}
            rows={4}
          />
        </label>
      </fieldset>

      <label className={lineErrorClass('consentimentoLgpd', 'privacy-line')}>
        <input
          type="checkbox"
          checked={form.consentimentoLgpd}
          onChange={(event) => updateField('consentimentoLgpd', event.target.checked)}
        />
        <ShieldCheck aria-hidden="true" />
        <span>
          Autorizo o uso desses dados para fins de cadastro, organização interna e comunicação da igreja.{' '}
          <span className="required-hint">Campo obrigatório</span>
        </span>
      </label>
      {fieldError('consentimentoLgpd')}

      {duplicateCpfAlert()}
      {duplicateEmailAlert()}

      <button className="primary-action" type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'Enviando...' : 'Enviar cadastro'}
        <Send aria-hidden="true" />
      </button>

      {status === 'success' ? (
        <div className="form-alert success">
          <CheckCircle2 aria-hidden="true" />
          {isAdminMode
            ? `Cadastro nominal de ${lastSuccessName || personTypeLabel(lastSuccessType)} registrado. Protocolo: ${lastProtocol}`
            : isMembro
              ? `Cadastro de ${lastSuccessName || 'membro'} enviado para aprovação. Seu login continua ativo, mas as funções de membro serão liberadas após validação da administração. Protocolo: ${lastProtocol}`
              : `Cadastro de ${lastSuccessName || personTypeLabel(lastSuccessType)} concluído. Acompanhe suas informações pela área correspondente.`}
        </div>
      ) : null}

      {status === 'error' ? <div className="form-alert error">Não foi possível enviar agora. Tente novamente.</div> : null}

      {floatingNotice ? (
        <div className="floating-notice-backdrop" role="presentation">
          <div className="floating-notice" role="dialog" aria-modal="true" aria-labelledby="baptism-notice-title">
            <button
              aria-label="Fechar aviso"
              className="floating-notice-close"
              onClick={() => setFloatingNotice('')}
              type="button"
            >
              <X aria-hidden="true" />
            </button>
            <ShieldCheck aria-hidden="true" />
            <h3 id="baptism-notice-title">Cadastro como membro não permitido</h3>
            <p>{floatingNotice}</p>
            <button className="primary-action" onClick={() => setFloatingNotice('')} type="button">
              Entendi
            </button>
          </div>
        </div>
      ) : null}
    </form>
  )
}

function DocumentUpload({
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
          type="checkbox"
          checked={multiplas}
          onChange={(event) => onPaginasChange(event.target.checked ? 'multiplas' : 'unica')}
        />
        Tem mais de uma página
      </label>
      <p className="field-hint">
        {multiplas
          ? 'Envie um PDF único com todas as páginas ou selecione vários arquivos.'
          : 'Envie a página única (imagem ou PDF).'}
      </p>
      <label className="file-input">
        <FileUp aria-hidden="true" />
        {multiplas ? 'Arquivos (PDF ou várias imagens)' : 'Arquivo'}
        <input
          type="file"
          accept=".pdf,image/*"
          multiple={multiplas}
          onChange={(event) => onFilesChange(fileNames(event.target.files))}
        />
        <span>{arquivo || 'Nenhum arquivo selecionado'}</span>
      </label>
    </div>
  )
}
