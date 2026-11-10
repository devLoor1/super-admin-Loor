import { showcaseEnvironment } from '../showcaseMapping'
import { useEffect, type ReactNode } from 'react'
import { Lock, ShieldAlert } from 'lucide-react'
import { AppShell } from '../../../components/shell/AppShell'
import type { Breadcrumb } from '../../../components/shell/TopHeader'
import { useWhitelabelRecord } from '../../operation/shared/whitelabelContext'
import { DotMatrixBackground } from '../../whitelabels/visuals/DotMatrixBackground'
import { showcaseAvailableFor } from '../showcaseAccess'
import { getShowcaseState, loadShowcase, useShowcaseState } from '../showcaseStore'
import { useShowcaseActor } from './editorHooks'
import styles from './ShowcaseEditor.module.css'

export function ScopeBar() {
  return <p className={styles.scopeBar}><Lock size={17} aria-hidden="true" /><strong>Homolog Loor somente</strong><span aria-hidden="true">·</span><span>WL6</span><span aria-hidden="true">·</span><span>homologacao</span></p>
}

function Blocked({ title, children }: { title: string; children: ReactNode }) {
  return <div className={styles.blocked} role="alert"><ShieldAlert size={24} aria-hidden="true" /><h2>{title}</h2>{children}</div>
}

/** Confirm the actual owner before loading the administrative configuration. */
export function ShowcaseFrame({ tenantId, title, crumbs, children }: { tenantId: string; title: string; crumbs: Breadcrumb[]; children: ReactNode }) {
  const { canView, actor } = useShowcaseActor()
  const state = useShowcaseState()
  const environment = showcaseEnvironment()
  const contextAllowed = showcaseAvailableFor({ tenantId, tenantSlug: 'homologacao', environment })
  const record = useWhitelabelRecord(canView && contextAllowed ? tenantId : null)
  const confirmed = record.state.status === 'success' && record.state.data.id === tenantId && showcaseAvailableFor({ tenantId, tenantSlug: record.state.data.slug, environment })
  useEffect(() => {
    if (canView && confirmed && getShowcaseState().loadPhase === 'idle') void loadShowcase(actor)
  }, [canView, confirmed, actor])

  let content: ReactNode
  if (!canView) content = <Blocked title="Acesso não permitido"><p>Este perfil não pode consultar a Vitrine de White Labels.</p></Blocked>
  else if (!contextAllowed) content = <Blocked title="Vitrine de White Labels indisponível neste contexto"><p>Esta configuração está disponível apenas no contexto habilitado de Homolog Loor, WL6 · homologacao.</p><a className={styles.inlineLink} href={`#/whitelabels/${encodeURIComponent(tenantId)}/settings`}>Voltar às configurações deste Whitelabel</a></Blocked>
  else if (record.state.status === 'error') content = <Blocked title="Não foi possível confirmar o Whitelabel"><p>A consulta falhou. Nenhum dado de exemplo será exibido.</p><button type="button" className={styles.linkButton} onClick={record.reload}>Tentar novamente</button></Blocked>
  else if (!confirmed) content = record.state.status === 'success'
    ? <Blocked title="Vitrine indisponível"><p>O registro confirmado não corresponde ao proprietário desta configuração.</p></Blocked>
    : <p role="status" className={styles.loading}>Confirmando Whitelabel…</p>
  else if (state.loadPhase === 'error') content = <Blocked title="Não foi possível carregar a vitrine"><p>{state.message || 'O serviço não disponibilizou uma configuração válida. Nenhuma alteração foi feita.'}</p><button type="button" className={styles.linkButton} onClick={() => void loadShowcase(actor)}>Tentar novamente</button></Blocked>
  else if (state.loadPhase !== 'ready') content = <p role="status" className={styles.loading}>Carregando configuração da vitrine…</p>
  else content = children

  return <AppShell activeNav="plataformas" activeSubNav="whitelabel-settings"
    subNavHrefs={{ contas: `#/whitelabels/${encodeURIComponent(tenantId)}/accounts`, 'whitelabel-settings': `#/whitelabels/${encodeURIComponent(tenantId)}/settings` }}
    title={canView && confirmed && state.loadPhase === 'ready' ? title : 'Vitrine de White Labels'} location="Configurações" breadcrumbs={crumbs}>
    <div className={styles.page}><DotMatrixBackground /><div className={styles.layout}>{content}</div></div>
  </AppShell>
}
