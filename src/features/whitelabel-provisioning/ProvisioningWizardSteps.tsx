import { TriangleAlert } from 'lucide-react'
import { OutlineButton } from '../../components/ui/OutlineButton'
import type { WhitelabelRecord } from '../whitelabels/whitelabelApi'
import { MAIN_AREA_PAGES, type MainAreaPage } from './provisioningApi'
import { BASE_URL_MAX, BRAND_LOGO_URL_MAX, NAME_MAX, SLUG_MAX, formatFileSize, type DraftErrors, type ProvisioningDraft } from './provisioningForm'
import { CheckField, TextAreaField, TextField } from './ProvisioningUi'
import styles from './Provisioning.module.css'

export type StepProps = {
  draft: ProvisioningDraft
  errors: DraftErrors
  set: <K extends keyof ProvisioningDraft>(key: K, value: ProvisioningDraft[K]) => void
}

const MAIN_AREA_PAGE_LABELS: Record<MainAreaPage, string> = {
  login: 'Login',
  register: 'Cadastro',
  quick_profile: 'Perfil rápido',
}

export function ClientStep({ draft, errors, set }: StepProps) {
  return (
    <div className={styles.formGrid}>
      <TextField id="prov-name" label="Nome do Whitelabel" value={draft.name} maxLength={NAME_MAX * 2} autoComplete="off" error={errors.name} onChange={(e) => set('name', e.target.value)} full />
      <TextField id="prov-slug" label="Identificador (slug)" value={draft.slug} maxLength={SLUG_MAX + 20} autoComplete="off" spellCheck={false} error={errors.slug} hint="Letras minúsculas, números e hífens. A edição do slug não está disponível depois da criação." onChange={(e) => set('slug', e.target.value)} />
      <TextField id="prov-base-url" label="URL base" value={draft.baseUrl} maxLength={BASE_URL_MAX} autoComplete="off" spellCheck={false} placeholder="https://homolog.loor.vc/w/shared-fe-demo-a" error={errors.baseUrl} hint="Homolog PATH: URL do Investor compartilhado + /w/{slug} (ex.: https://homolog.loor.vc/w/shared-fe-demo-a). O slug do cliente vem do path/Core — não de VITE_PLATFORM_SLUG no Netlify." onChange={(e) => set('baseUrl', e.target.value)} />
    </div>
  )
}

/** Contracted FE environments (Finapop-style: Investor+Admin without Entrepreneur). */
export function EnvironmentsStep({ draft, errors, set }: StepProps) {
  return (
    <div className={styles.fieldset} style={{ marginTop: 8 }}>
      <p className={styles.hint} style={{ marginBottom: 12 }}>
        Marque somente os ambientes contratados. Ambientes não marcados ficam como “não contratado” nos gates e na entrega.
      </p>
      <CheckField id="prov-env-investor" label="Investidor" checked={draft.envInvestor} onChange={(e) => set('envInvestor', e.target.checked)} />
      <CheckField id="prov-env-entrepreneur" label="Empreendedor" checked={draft.envEntrepreneur} onChange={(e) => set('envEntrepreneur', e.target.checked)} />
      <CheckField id="prov-env-admin" label="Admin" checked={draft.envAdmin} onChange={(e) => set('envAdmin', e.target.checked)} />
      {errors.envInvestor ? (
        <span className={styles.error} role="alert" style={{ display: 'block', marginTop: 8 }}>
          {errors.envInvestor}
        </span>
      ) : null}
    </div>
  )
}

export type TemplateOptions =
  | { status: 'loading' }
  | { status: 'error'; message: string; retry: () => void }
  | { status: 'ready'; rows: WhitelabelRecord[]; truncated: boolean }

export function TemplateStep({ draft, errors, set, options }: StepProps & { options: TemplateOptions }) {
  return (
    <div className={styles.formGrid} data-single="true">
      <div className={styles.field}>
        <label htmlFor="prov-template">Copiar configurações de (opcional)</label>
        <select
          id="prov-template"
          value={draft.templateFromWhitelabelId}
          disabled={options.status !== 'ready'}
          aria-invalid={errors.templateFromWhitelabelId ? true : undefined}
          aria-describedby="prov-template-hint"
          onChange={(e) => set('templateFromWhitelabelId', e.target.value)}
        >
          <option value="">Sem template (configuração em branco)</option>
          {options.status === 'ready'
            ? options.rows.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name} · {row.slug || `ID ${row.id}`}
                </option>
              ))
            : null}
        </select>
        <span id="prov-template-hint" className={styles.hint}>
          {options.status === 'loading' ? 'Carregando Whitelabels ativos…' : 'Apenas Whitelabels ativos são listados como template.'}
        </span>
        {options.status === 'ready' && options.truncated ? <span className={styles.hint}>A lista foi limitada aos primeiros resultados do Control Plane.</span> : null}
        {errors.templateFromWhitelabelId ? <span className={styles.error} role="alert">{errors.templateFromWhitelabelId}</span> : null}
        {options.status === 'error' ? (
          <>
            <span className={styles.error} role="alert">{options.message}</span>
            <OutlineButton onClick={options.retry}>Tentar novamente</OutlineButton>
          </>
        ) : null}
      </div>
    </div>
  )
}

export function AdminStep({ draft, errors, set }: StepProps) {
  return (
    <>
      <div className={styles.fieldset} style={{ marginTop: 18 }}>
        <CheckField id="prov-skip-admin" label="Não criar administrador inicial agora" hint="O tenant será criado sem administrador; será preciso criá-lo depois." checked={!draft.adminEnabled} onChange={(e) => set('adminEnabled', !e.target.checked)} />
      </div>
      {draft.adminEnabled ? (
        <div className={styles.formGrid}>
          <TextField id="prov-admin-name" label="Nome (opcional)" value={draft.adminName} autoComplete="off" error={errors.adminName} onChange={(e) => set('adminName', e.target.value)} />
          <TextField id="prov-admin-email" label="E-mail do administrador" type="email" value={draft.adminEmail} autoComplete="off" error={errors.adminEmail} onChange={(e) => set('adminEmail', e.target.value)} />
          <TextField
            id="prov-admin-password"
            label={<>Senha temporária <span className={styles.required}>(obrigatória)</span></>}
            type="password"
            value={draft.adminTemporaryPassword}
            autoComplete="new-password"
            error={errors.adminTemporaryPassword}
            hint="Exigida pelo Control Plane para criar o administrador. Informe-a ao cliente por canal seguro; ela não é exibida novamente."
            onChange={(e) => set('adminTemporaryPassword', e.target.value)}
            full
          />
        </div>
      ) : null}
    </>
  )
}

export function OptionalStep({ draft, errors, set }: StepProps) {
  return (
    <>
      <fieldset className={styles.fieldset}>
        <legend>Termos de uso</legend>
        <CheckField id="prov-terms" label="Publicar Termos de uso iniciais" checked={draft.termsEnabled} onChange={(e) => set('termsEnabled', e.target.checked)} />
        {draft.termsEnabled ? (
          <div className={styles.formGrid} data-single="true">
            <TextField id="prov-terms-title" label="Título" value={draft.termsTitle} error={errors.termsTitle} onChange={(e) => set('termsTitle', e.target.value)} />
            <TextAreaField id="prov-terms-md" label="Conteúdo (Markdown)" value={draft.termsMarkdown} error={errors.termsMarkdown} onChange={(e) => set('termsMarkdown', e.target.value)} />
          </div>
        ) : null}
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend>SMTP</legend>
        <CheckField id="prov-smtp" label="Configurar SMTP do cliente" checked={draft.smtpEnabled} onChange={(e) => set('smtpEnabled', e.target.checked)} />
        {draft.smtpEnabled ? (
          <div className={styles.formGrid}>
            <TextField id="prov-smtp-host" label="Host" value={draft.smtpHost} autoComplete="off" spellCheck={false} error={errors.smtpHost} onChange={(e) => set('smtpHost', e.target.value)} />
            <TextField id="prov-smtp-port" label="Porta" inputMode="numeric" value={draft.smtpPort} autoComplete="off" error={errors.smtpPort} onChange={(e) => set('smtpPort', e.target.value)} />
            <TextField id="prov-smtp-user" label="Usuário" value={draft.smtpUsername} autoComplete="off" error={errors.smtpUsername} onChange={(e) => set('smtpUsername', e.target.value)} />
            <TextField id="prov-smtp-password" label="Senha" type="password" value={draft.smtpPassword} autoComplete="new-password" error={errors.smtpPassword} hint="Enviada uma única vez ao Control Plane; nunca é exibida novamente." onChange={(e) => set('smtpPassword', e.target.value)} />
            <TextField id="prov-smtp-from" label="E-mail remetente" type="email" value={draft.smtpFromEmail} autoComplete="off" error={errors.smtpFromEmail} onChange={(e) => set('smtpFromEmail', e.target.value)} />
            <TextField id="prov-smtp-from-name" label="Nome do remetente (opcional)" value={draft.smtpFromName} autoComplete="off" onChange={(e) => set('smtpFromName', e.target.value)} />
            <div className={styles.fieldFull}>
              <CheckField id="prov-smtp-secure" label="Conexão segura (TLS)" checked={draft.smtpSecure} onChange={(e) => set('smtpSecure', e.target.checked)} />
            </div>
          </div>
        ) : null}
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend>Marca do cliente</legend>
        <CheckField id="prov-branding" label="Aplicar marca do cliente (e-mail, painel de login e imagem principal)" checked={draft.brandingEnabled} onChange={(e) => set('brandingEnabled', e.target.checked)} />
        <p className={styles.hint} role="note" data-prov-brand-note>
          Logo institucional, favicon e ícones PWA são definidos no build do frontend e não fazem parte desta etapa.
        </p>
        {draft.brandingEnabled ? (
          <div className={styles.formGrid}>
            <TextField id="prov-brand-email-color" label="E-mail · cor primária (opcional)" value={draft.brandEmailPrimaryColor} autoComplete="off" spellCheck={false} placeholder="#1a2b3c" maxLength={7} error={errors.brandEmailPrimaryColor} hint="Formato #rrggbb." onChange={(e) => set('brandEmailPrimaryColor', e.target.value)} />
            <TextField id="prov-brand-email-logo" label="E-mail · URL do logo (opcional)" type="url" value={draft.brandEmailLogoUrl} autoComplete="off" spellCheck={false} placeholder="https://cdn.cliente.com.br/logo.png" maxLength={BRAND_LOGO_URL_MAX} error={errors.brandEmailLogoUrl} hint="URL pública http(s), sem usuário/senha." onChange={(e) => set('brandEmailLogoUrl', e.target.value)} />
            <TextField id="prov-brand-login-color" label="Login · cor do texto do painel (opcional)" value={draft.brandLoginTextColor} autoComplete="off" spellCheck={false} placeholder="#ffffff" maxLength={7} error={errors.brandLoginTextColor} hint="Formato #rrggbb." onChange={(e) => set('brandLoginTextColor', e.target.value)} />
            <TextField id="prov-brand-main-area" label="Imagem principal (opcional)" type="file" accept="image/png,image/jpeg" error={errors.brandMainAreaFile} hint="JPG ou PNG, até 20 MB. Enviada uma única vez ao Control Plane; não é armazenada nele." onChange={(e) => set('brandMainAreaFile', e.target.files?.[0] ?? null)} />
            {draft.brandMainAreaFile ? (
              <div className={styles.fieldFull}>
                <p className={styles.hint} data-prov-brand-file>
                  Selecionado: {draft.brandMainAreaFile.name} ({formatFileSize(draft.brandMainAreaFile.size)})
                </p>
                <OutlineButton onClick={() => set('brandMainAreaFile', null)}>Remover imagem</OutlineButton>
                <fieldset className={styles.fieldset} aria-describedby={errors.brandMainAreaPages ? 'prov-brand-pages-error' : undefined}>
                  <legend>Aplicar a imagem nas páginas</legend>
                  {MAIN_AREA_PAGES.map((page) => (
                    <CheckField
                      key={page}
                      id={`prov-brand-page-${page}`}
                      label={MAIN_AREA_PAGE_LABELS[page]}
                      checked={draft.brandMainAreaPages.includes(page)}
                      onChange={(e) =>
                        set(
                          'brandMainAreaPages',
                          e.target.checked
                            ? MAIN_AREA_PAGES.filter((item) => item === page || draft.brandMainAreaPages.includes(item))
                            : draft.brandMainAreaPages.filter((item) => item !== page),
                        )
                      }
                    />
                  ))}
                  {errors.brandMainAreaPages ? <span id="prov-brand-pages-error" className={styles.error} role="alert">{errors.brandMainAreaPages}</span> : null}
                </fieldset>
              </div>
            ) : null}
          </div>
        ) : null}
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend>Conferências manuais (uso de Ops)</legend>
        <p className={styles.warning} role="note">
          <TriangleAlert size={16} aria-hidden="true" />
          <span>
            Pular uma conferência faz a implantação seguir sem confirmar que os frontends foram publicados ou que o DNS/HTTPS responde. Use apenas quando Ops já validou isso por fora.
          </span>
        </p>
        <CheckField id="prov-skip-fe" label="Pular conferência dos frontends (investidor, empreendedor e admin)" checked={draft.skipFeDeployCheck} onChange={(e) => set('skipFeDeployCheck', e.target.checked)} />
        <CheckField id="prov-skip-dns" label="Pular conferência de DNS / HTTPS" checked={draft.skipDnsCheck} onChange={(e) => set('skipDnsCheck', e.target.checked)} />
      </fieldset>
    </>
  )
}
