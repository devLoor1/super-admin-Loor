import type { ReactNode } from 'react'
import { Lock, ShieldAlert } from 'lucide-react'
import { AppShell } from '../../../components/shell/AppShell'
import type { Breadcrumb } from '../../../components/shell/TopHeader'
import { useWhitelabelRecord } from '../../operation/shared/whitelabelContext'
import { DotMatrixBackground } from '../../whitelabels/visuals/DotMatrixBackground'
import { showcaseAvailableFor } from '../showcaseAccess'
import { SHOWCASE_SIMULATION, SIMULATED_ENVIRONMENT_LABELS } from '../showcaseMapping'
import { useShowcaseActor, useSimulation } from './editorHooks'
import styles from './ShowcaseEditor.module.css'
import '../fixtures/seedAssets'

const { logicalOwner, mockTenant } = SHOWCASE_SIMULATION

/** Persistent scope: the owner never changes inside the Vitrine. */
export function ScopeBar() {
  return (
    <p className={styles.scopeBar}>
      <Lock size={17} aria-hidden="true" />
      <strong>{logicalOwner.label} somente</strong>
      <span aria-hidden="true">·</span><span>WL{logicalOwner.whitelabelId}</span>
      <span aria-hidden="true">·</span><span>{logicalOwner.slug}</span>
      <small>Simulação: representado pela fixture mock #{mockTenant.id} ({mockTenant.slug}). Não é a identidade real.</small>
    </p>
  )
}

function Blocked({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={styles.blocked} role="alert">
      <ShieldAlert size={24} aria-hidden="true" />
      <h2>{title}</h2>
      {children}
    </div>
  )
}

/**
 * Shell + presentation gates shared by the Vitrine screens. The tenant is
 * confirmed through the existing record contract (mock transport); role and
 * context gates only decide what this mock renders — they are not authorization.
 */
export function ShowcaseFrame({ tenantId, title, crumbs, children }: { tenantId: string; title: string; crumbs: Breadcrumb[]; children: ReactNode }) {
  const { canView } = useShowcaseActor()
  const { environment } = useSimulation()
  const contextAllowed = showcaseAvailableFor({ tenantId, environment })
  const record = useWhitelabelRecord(canView && contextAllowed ? tenantId : null)
  const confirmed = record.state.status === 'success' && showcaseAvailableFor({ tenantId, tenantSlug: record.state.data.slug, environment })

  let content: ReactNode
  if (!canView) {
    content = <Blocked title="Acesso não permitido"><p>Este perfil não pode consultar a Vitrine de White Labels nesta simulação. A autorização real dependerá do Backend.</p></Blocked>
  } else if (!contextAllowed) {
    content = (
      <Blocked title="Vitrine de White Labels indisponível neste contexto">
        <p>Esta configuração existe somente para {logicalOwner.label} (WL{logicalOwner.whitelabelId} · {logicalOwner.slug}) no ambiente de homologação. Nenhum dado da vitrine foi carregado.</p>
        <p className={styles.hint}>Contexto atual: Whitelabel #{tenantId} · {SIMULATED_ENVIRONMENT_LABELS[environment]}. Esta verificação é apenas de apresentação; o bloqueio definitivo precisa existir no servidor.</p>
        <a className={styles.inlineLink} href={`#/whitelabels/${encodeURIComponent(tenantId)}/settings`}>Voltar às configurações deste Whitelabel</a>
      </Blocked>
    )
  } else if (record.state.status === 'error') {
    content = <Blocked title="Não foi possível confirmar o Whitelabel"><p>A leitura do cadastro falhou. Nada foi alterado.</p><button type="button" className={styles.linkButton} onClick={record.reload}>Tentar novamente</button></Blocked>
  } else if (!confirmed) {
    content = record.state.status === 'success'
      ? <Blocked title="Vitrine de White Labels indisponível neste contexto"><p>O registro confirmado não corresponde à fixture que representa {logicalOwner.label}.</p></Blocked>
      : <p role="status" className={styles.loading}>Confirmando Whitelabel…</p>
  } else {
    content = children
  }

  return (
    <AppShell
      activeNav="plataformas"
      activeSubNav="whitelabel-settings"
      subNavHrefs={{ contas: `#/whitelabels/${encodeURIComponent(tenantId)}/accounts`, 'whitelabel-settings': `#/whitelabels/${encodeURIComponent(tenantId)}/settings` }}
      title={title}
      location="Configurações"
      breadcrumbs={crumbs}
    >
      <div className={styles.page}>
        <DotMatrixBackground />
        <div className={styles.layout}>{content}</div>
      </div>
    </AppShell>
  )
}

