import { useEffect, useState } from 'react'
import { Dialog } from '../../components/ui/Dialog'
import { OutlineButton } from '../../components/ui/OutlineButton'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { useUnsavedChangesGuard } from '../../app/useUnsavedChangesGuard'
import { CompositeConfigurationEditor } from '../whitelabel-settings/ConfigurationEditor'
import type { Json } from '../whitelabel-settings/configurationContract'
import { useSettingsRead } from '../whitelabel-settings/useSettingsRead'
import { EmailServerPreview } from './EmailTemplatesWorkspace'
import { getEmailTemplates, getEmailTypes, type EmailPreviewCommand, type EmailTemplate } from './emailTemplatesApi'
import { emailBrandingPreviewDraft } from './emailBrandingDisplay'
import s from '../whitelabel-settings/ConfigurationStudio.module.css'

/** Email branding is independent from platform identity and SMTP metadata. */
export function EmailBrandingWorkspace({ tenantId }: { tenantId: string }) {
  const remote = useSettingsRead(tenantId), [held, setHeld] = useState({ dirty: false, busy: false }), [generation, setGeneration] = useState(0)
  const [template, setTemplate] = useState<EmailTemplate | null>(null), [failed, setFailed] = useState(false)
  const guard = useUnsavedChangesGuard(held.dirty || held.busy, () => { setHeld({ dirty: false, busy: false }); setGeneration(n => n + 1) })
  useEffect(() => {
    const controller = new AbortController()
    void getEmailTypes(tenantId, controller.signal).then(async types => {
      const type = types.find(row => row.type === 'email_confirmation')?.type ?? types[0]?.type
      if (!type) return null
      const rows = await getEmailTemplates(tenantId, type, controller.signal)
      return rows.find(row => row.active && !row.is_default) ?? rows.find(row => row.active && row.is_default) ?? rows[0] ?? null
    }).then(result => { if (!controller.signal.aborted) setTemplate(result) }).catch(() => { if (!controller.signal.aborted) setFailed(true) })
    return () => controller.abort()
  }, [tenantId])
  function preview(value: Json, saved: boolean) {
    let command: EmailPreviewCommand | null = template ? { type: template.type, subject: template.subject, body_html: template.body_html } : null
    if (command && !saved) {
      const branding = emailBrandingPreviewDraft(value)
      if (!branding) command = null
      else command.brandingDraft = branding
    }
    return <>{failed && <p role="status" className={s.note}>O template de exemplo do servidor não está disponível; a prévia não usa conteúdo simulado.</p>}<EmailServerPreview tenantId={tenantId} command={command} label={saved ? 'Identidade salva' : 'Rascunho de identidade'} /></>
  }
  const data = remote.state.status === 'success' ? remote.state.data : null
  const origin = data?.configuration['email_branding.config']
  return <section className={s.studio} aria-label="Identidade visual dos e-mails"><header className={s.heading}><div><span className={s.eyebrow}>E-MAIL · IDENTIDADE</span><h2>Identidade visual dos e-mails</h2><p>Cor e logo das mensagens transacionais, independentes da identidade Web e App.</p></div><span className={s.local}>Whitelabel #{tenantId}</span></header>
    {remote.state.status === 'error' ? <div className={s.editor} role="alert"><p>Não foi possível consultar a identidade deste Whitelabel.</p><OutlineButton onClick={remote.reload}>Consultar novamente</OutlineButton></div> : data && origin ? <CompositeConfigurationEditor key={`${tenantId}:${generation}:${origin.version}:${JSON.stringify(origin)}`} id={tenantId} data={data} cell="email_branding.config" onReload={remote.reload} onState={setHeld} renderPreview={preview} /> : data ? <p className={s.editor}>O servidor não retornou a origem desta configuração. A edição permanece indisponível.</p> : <p className={s.editor} role="status">Consultando identidade de e-mail…</p>}
    {guard.pending && <Dialog title="Descartar rascunho de identidade?" onClose={guard.stay} footer={<><OutlineButton onClick={guard.stay}>Continuar aqui</OutlineButton><PrimaryButton disabled={held.busy} onClick={guard.discardAndContinue}>Descartar e continuar</PrimaryButton></>}><p>{held.busy ? 'Aguarde a conclusão da solicitação.' : 'Apenas as alterações locais serão descartadas.'}</p></Dialog>}
  </section>
}
