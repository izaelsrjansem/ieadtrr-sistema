import { Hourglass, ShieldAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { SystemRole } from '../types'

const roleLabels: Record<SystemRole, string> = {
  pendente: 'Pendente de aprovação',
  visitante: 'Visitante',
  congregado: 'Congregado',
  membro: 'Membro',
  diretoria: 'Diretoria',
  admin: 'Administração',
}

export function ProtectedRoute({ allowedRoles, children }: { allowedRoles: SystemRole[]; children: ReactNode }) {
  const { firebaseUser, profile, loading } = useAuth()
  const location = useLocation()
  const memberRequestPending = profile?.tipoPessoa === 'membro'

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

  if (!profile || profile.role === 'pendente') {
    return (
      <section className="auth-page">
        <div className="auth-panel status-panel">
          <Hourglass aria-hidden="true" />
          <h1>{memberRequestPending ? 'Cadastro em análise' : 'Complete seu cadastro'}</h1>
          <p>
            {memberRequestPending
              ? 'Seu cadastro de membro foi enviado e aguarda análise da administração.'
              : 'Seu acesso foi criado. Informe se você é visitante, convidado ou membro para o sistema liberar o fluxo correto.'}
          </p>
          {!memberRequestPending ? (
            <Link className="primary-action" to="/cadastro">
              Ir para cadastro
            </Link>
          ) : null}
        </div>
      </section>
    )
  }

  if (!allowedRoles.includes(profile.role)) {
    return (
      <section className="auth-page">
        <div className="auth-panel status-panel">
          <ShieldAlert aria-hidden="true" />
          <h1>Acesso não permitido</h1>
          <p>Seu perfil atual ({roleLabels[profile.role]}) não tem permissão para acessar esta área.</p>
        </div>
      </section>
    )
  }

  return <>{children}</>
}
