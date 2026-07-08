import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, FileUp, Send, ShieldCheck, UserRound } from 'lucide-react'
import { z } from 'zod'
import { useAuth } from '../context/AuthContext'
import { churchRoleOptions, congregations as fallbackCongregations, logradouroOptions, personTypeOptions } from '../data/church'
import { submitMembershipRequest } from '../services/membership'
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
    dataNascimento: z.string(),
    tipoPessoa: z.enum(['visitante', 'membro', 'convidado', 'congregado']),
    possuiCargo: z.boolean(),
    cargo: z.string().optional(),
    outroCargo: z.string().optional(),
    congregacao: z.string(),
    endereco: z.object({
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

      if (data.rg.trim().length < 4) {
        ctx.addIssue({ code: 'custom', path: ['rg'], message: 'Informe o RG.' })
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
}

const initialForm: MemberRegistration = {
  nomeCompleto: '',
  email: '',
  telefone: '',
  possuiWhatsapp: false,
  convidadoPor: '',
  cpf: '',
  rg: '',
  dataNascimento: '',
  tipoPessoa: 'visitante',
  possuiCargo: false,
  cargo: undefined,
  outroCargo: '',
  congregacao: '',
  endereco: {
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

export function RegistrationForm({ mode = 'self', fixedTipoPessoa }: RegistrationFormProps) {
  const { firebaseUser, profile } = useAuth()
  const isAdminMode = mode === 'admin'
  const accountEmail = isAdminMode ? '' : (firebaseUser?.email ?? profile?.email ?? '')
  const accountName = isAdminMode ? '' : (profile?.nomeCompleto ?? firebaseUser?.displayName ?? '')
  const [form, setForm] = useState<MemberRegistration>(initialForm)
  const [errors, setErrors] = useState<ErrorMap>({})
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [lastProtocol, setLastProtocol] = useState<string>('')
  const [cepStatus, setCepStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [congregationList, setCongregationList] = useState<Congregation[]>(fallbackCongregations)

  const isMembro = form.tipoPessoa === 'membro'
  const isCongregado = form.tipoPessoa === 'congregado'
  const isFullCadastro = isMembro || isCongregado
  const canAdminAssignCargo = isAdminMode && isMembro
  const isConvidado = form.tipoPessoa === 'convidado'
  const activeCongregations = congregationList.filter((congregation) => congregation.ativa !== false)

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
    if (isAdminMode) {
      return
    }

    setForm((current) => {
      if (!current.possuiCargo && !current.cargo && !current.outroCargo) {
        return current
      }

      return {
        ...current,
        possuiCargo: false,
        cargo: undefined,
        outroCargo: '',
      }
    })
  }, [isAdminMode, form.tipoPessoa])

  useEffect(() => subscribeCongregations(setCongregationList), [])

  function updateField<K extends keyof MemberRegistration>(field: K, value: MemberRegistration[K]) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function updateAddress(field: keyof MemberRegistration['endereco'], value: string) {
    setForm((current) => ({
      ...current,
      endereco: {
        ...current.endereco,
        [field]: value,
      },
    }))
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

      setForm((current) => ({
        ...current,
        endereco: {
          ...current.endereco,
          rua: data.logradouro || current.endereco.rua,
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

  function fieldError(name: string) {
    return errors[name] ? <span className="field-error">{errors[name]}</span> : null
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('sending')
    setErrors({})

    const formForValidation = isAdminMode
      ? form
      : {
          ...form,
          possuiCargo: false,
          cargo: undefined,
          outroCargo: '',
        }

    const parsed = registrationSchema.safeParse(formForValidation)

    if (!parsed.success) {
      setErrors(mapErrors(parsed.error))
      setStatus('idle')
      return
    }

    try {
      const currentUid = firebaseUser?.uid ?? ''

      if (!isAdminMode && !currentUid) {
        throw new Error('auth-required')
      }

      const data = {
        ...parsed.data,
        email: isAdminMode ? parsed.data.email.trim() : accountEmail || parsed.data.email.trim(),
      }

      if (!isAdminMode) {
        data.possuiCargo = false
        data.cargo = undefined
        data.outroCargo = ''
      }

      if (isAdminMode) {
        const result = await submitMembershipRequest(data as MemberRegistration)
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
        await markMemberRegistrationProfile(currentUid, {
          email: data.email,
          nomeCompleto: data.nomeCompleto.trim(),
          tipoPessoa: 'membro',
          congregacao: data.congregacao,
          telefone: data.telefone,
          dataNascimento: data.dataNascimento,
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
          convidadoPor: isConvidado ? data.convidadoPor?.trim() : undefined,
          observacoes: data.observacoes?.trim() || undefined,
        })
      }

      setStatus('success')
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
          <h2>Dados do membro, visitante ou convidado</h2>
        </div>
        <UserRound aria-hidden="true" />
      </div>

      <fieldset>
        <legend>Tipo de cadastro</legend>
        <div className="type-picker">
          {fixedTipoPessoa ? (
            <label className="active">
              <input type="radio" name="tipoPessoa" value={fixedTipoPessoa} checked readOnly />
              {fixedTipoPessoa === 'congregado' ? 'Congregado' : fixedTipoPessoa}
            </label>
          ) : (
            personTypeOptions.map((option) => (
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
            ? 'Registro feito pela administração, sem criar acesso de login para a pessoa.'
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
            <input value={form.nomeCompleto} onChange={(event) => updateField('nomeCompleto', event.target.value)} />
            {fieldError('nomeCompleto')}
          </label>

          {isConvidado ? (
            <label className="wide-field">
              Convidado por
              <input
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
                <input
                  value={form.cpf}
                  onChange={(event) => updateField('cpf', maskCpf(event.target.value))}
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                />
                {fieldError('cpf')}
              </label>

              <label>
                RG
                <input value={form.rg} onChange={(event) => updateField('rg', event.target.value)} />
                {fieldError('rg')}
              </label>
            </>
          ) : null}

          <label>
            Data de nascimento
            <input
              type="date"
              value={form.dataNascimento}
              onChange={(event) => updateField('dataNascimento', event.target.value)}
            />
            {fieldError('dataNascimento')}
          </label>

          <label>
            Congregação
            <select value={form.congregacao} onChange={(event) => updateField('congregacao', event.target.value)}>
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
            <input
              value={form.telefone}
              onChange={(event) => updateField('telefone', maskPhone(event.target.value))}
              inputMode="numeric"
              placeholder="(95) 99999-9999"
            />
            {fieldError('telefone')}
          </label>

          {isFullCadastro ? (
            <label className="checkbox-line">
              <input
                type="checkbox"
                checked={form.possuiWhatsapp}
                onChange={(event) => updateField('possuiWhatsapp', event.target.checked)}
              />
              Este número tem WhatsApp
            </label>
          ) : null}

          <label>
            {isAdminMode ? 'E-mail de contato' : 'E-mail do acesso'}
            <input
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
            {fieldError('email')}
          </label>

          {isFullCadastro ? (
            <>
              <label>
                CEP
                <input
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
                      : 'Preenche rua, bairro, cidade e estado automaticamente.'}
                </small>
              </label>

              <label>
                Tipo de logradouro
                <select
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
                <input value={form.endereco.rua} onChange={(event) => updateAddress('rua', event.target.value)} />
                {fieldError('endereco.rua')}
              </label>

              <label>
                Número
                <input value={form.endereco.numero} onChange={(event) => updateAddress('numero', event.target.value)} />
                {fieldError('endereco.numero')}
              </label>

              <label>
                Complemento
                <input
                  value={form.endereco.complemento}
                  onChange={(event) => updateAddress('complemento', event.target.value)}
                />
              </label>

              <label>
                Bairro
                <input value={form.endereco.bairro} onChange={(event) => updateAddress('bairro', event.target.value)} />
                {fieldError('endereco.bairro')}
              </label>

              <label>
                Cidade
                <input value={form.endereco.cidade} onChange={(event) => updateAddress('cidade', event.target.value)} />
                {fieldError('endereco.cidade')}
              </label>

              <label>
                Estado
                <input value={form.endereco.estado} onChange={(event) => updateAddress('estado', event.target.value)} />
                {fieldError('endereco.estado')}
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
                <label className="checkbox-line wide-field">
                  <input
                    type="checkbox"
                    checked={form.possuiCargo}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        possuiCargo: event.target.checked,
                        cargo: event.target.checked ? current.cargo : undefined,
                        outroCargo: event.target.checked ? current.outroCargo : '',
                      }))
                    }
                  />
                  Possui cargo ou função ministerial
                </label>

                {form.possuiCargo ? (
                  <>
                    <label>
                      Cargo/função
                      <select
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
                        <input value={form.outroCargo} onChange={(event) => updateField('outroCargo', event.target.value)} />
                        {fieldError('outroCargo')}
                      </label>
                    ) : null}
                  </>
                ) : null}

                <label>
                  Data de batismo
                  <input
                    type="date"
                    value={form.dataBatismo}
                    onChange={(event) => updateField('dataBatismo', event.target.value)}
                  />
                  {fieldError('dataBatismo')}
                </label>
              </>
            ) : isMembro ? (
              <>
                <p className="selection-note wide-field">
                  Cargo ou função ministerial será atribuído pela administração após a aprovação do cadastro.
                </p>
                <label>
                  Data de batismo
                  <input
                    type="date"
                    value={form.dataBatismo}
                    onChange={(event) => updateField('dataBatismo', event.target.value)}
                  />
                  {fieldError('dataBatismo')}
                </label>
              </>
            ) : (
              <p className="selection-note wide-field">
                Congregado ainda não recebe cargo. A função ministerial só pode ser atribuída após promoção a membro.
              </p>
            )}

            <label>
              Data de aceitação
              <input
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
          <textarea value={form.observacoes} onChange={(event) => updateField('observacoes', event.target.value)} rows={4} />
        </label>
      </fieldset>

      <label className="privacy-line">
        <input
          type="checkbox"
          checked={form.consentimentoLgpd}
          onChange={(event) => updateField('consentimentoLgpd', event.target.checked)}
        />
        <ShieldCheck aria-hidden="true" />
        Autorizo o uso desses dados para fins de cadastro, organização interna e comunicação da igreja.
      </label>
      {fieldError('consentimentoLgpd')}

      <button className="primary-action" type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'Enviando...' : 'Enviar cadastro'}
        <Send aria-hidden="true" />
      </button>

      {status === 'success' ? (
        <div className="form-alert success">
          <CheckCircle2 aria-hidden="true" />
          {isAdminMode
            ? `Cadastro nominal registrado. Protocolo: ${lastProtocol}`
            : isMembro
              ? `Cadastro enviado para aprovação. Protocolo: ${lastProtocol}`
              : 'Cadastro concluído. Acompanhe suas informações pela área correspondente.'}
        </div>
      ) : null}

      {status === 'error' ? <div className="form-alert error">Não foi possível enviar agora. Tente novamente.</div> : null}
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
