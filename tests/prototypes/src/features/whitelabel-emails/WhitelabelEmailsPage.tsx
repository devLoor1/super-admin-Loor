import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Building2 } from 'lucide-react'
import { useUnsavedChangesGuard } from '../../app/useUnsavedChangesGuard'
import { AppShell } from '../../components/shell/AppShell'
import { usePrototypeNotice } from '../../components/shell/prototypeNotice'
import { DetailTransition } from '../../components/ui/DetailTransition'
import { EmptyState } from '../../components/ui/EmptyState'
import { DotMatrixBackground } from '../whitelabels/visuals/DotMatrixBackground'
import { PROTOTYPE_WHITELABELS, type Whitelabel } from '../whitelabels/prototypeWhitelabels'
import { WhitelabelContextSelector } from '../whitelabel-accounts/WhitelabelContextSelector'
import { UnsavedChangesDialog } from '../whitelabel-settings/dialogs/UnsavedChangesDialog'
import { EMAIL_SECTION_LABEL, type EmailSectionKey, type EmailsSection } from './emailModel'
import { useEmailActivity, useWhitelabelEmailSettings } from './emailStore'
import { EventsSection } from './sections/EventsSection'
import { SessionActivity } from './sections/SessionActivity'
import { SmtpSection } from './sections/SmtpSection'
import { TemplatesSummary } from './sections/TemplatesSummary'
import styles from './WhitelabelEmailsPage.module.css'

const emailsHref = (id: string) => `#/whitelabels/${id}/emails`
const SECTION_ANCHOR: Record<EmailsSection, string> = {
  smtp: 'emails-smtp',
  envios: 'emails-events',
  templates: 'emails-templates',
}

/**
 * Whitelabel E-mails V1 — SMTP (how the Whitelabel sends), automatic events
 * (when the platform sends) and a Templates summary (what is sent).
 * Frontend-only prototype: saves are local to this session, the test send is
 * simulated, no e-mail is sent and nothing reaches a Backend.
 */
export function WhitelabelEmailsPage({ whitelabelId, section }: { whitelabelId: string; section?: EmailsSection }) {
  const whitelabel = PROTOTYPE_WHITELABELS.find((item) => item.id === whitelabelId)
  return (
    <AppShell
      activeNav="plataformas"
      activeSubNav="whitelabel-emails"
      subNavHrefs={{
        contas: `#/whitelabels/${whitelabelId}/accounts`,
        'whitelabel-settings': `#/whitelabels/${whitelabelId}/settings`,
        'whitelabel-emails': emailsHref(whitelabelId),
        financeiro: `#/whitelabels/${whitelabelId}/finance/gateways`,
      }}
      title="E-mails"
      location="E-mails"
      breadcrumbs={[
        { label: 'Plataformas' },
        { label: 'Whitelabels', href: '#/whitelabels' },
        { label: whitelabel?.name ?? 'Whitelabel não encontrado' },
        { label: 'E-mails' },
      ]}
    >
      {whitelabel ? (
        <EmailsContent whitelabel={whitelabel} section={section} />
      ) : (
        <div className={styles.notFound}>
          <EmptyState
            icon={Building2}
            title="Whitelabel não encontrado"
            description={
              <>
                Nenhum Whitelabel ilustrativo usa o ID “{whitelabelId}”.{' '}
                <a href="#/whitelabels" className={styles.inlineLink}>
                  Voltar para Whitelabels
                </a>
              </>
            }
          />
        </div>
      )}
    </AppShell>
  )
}

function EmailsContent({ whitelabel, section }: { whitelabel: Whitelabel; section?: EmailsSection }) {
  const [dirty, setDirty] = useState<Partial<Record<EmailSectionKey, boolean>>>({})
  const [draftReset, setDraftReset] = useState(0)
  // Id of the Whitelabel whose sections are mounted (lags during the switch transition).
  const [displayedId, setDisplayedId] = useState(whitelabel.id)

  const dirtyLabels = (Object.keys(EMAIL_SECTION_LABEL) as EmailSectionKey[])
    .filter((key) => dirty[key])
    .map((key) => EMAIL_SECTION_LABEL[key])

  const onDirtyChange = useCallback((key: EmailSectionKey, value: boolean) => {
    setDirty((current) => (Boolean(current[key]) === value ? current : { ...current, [key]: value }))
  }, [])

  // Same guard as Config. do Whitelabel: links, Back/Forward, reload and the selector.
  const { pending, requestNavigation, stay, discardAndContinue } = useUnsavedChangesGuard(dirtyLabels.length > 0, () => {
    setDirty({})
    // A section-only hash change keeps this page mounted: discard the drafts too.
    setDraftReset((value) => value + 1)
  })

  // `?section=` (e.g. from the Config. do Whitelabel SMTP shortcut) focuses that card once displayed.
  useEffect(() => {
    if (!section || displayedId !== whitelabel.id) return
    const element = document.getElementById(SECTION_ANCHOR[section])
    if (!element) return
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    element.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' })
    element.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true })
  }, [section, displayedId, whitelabel.id])

  return (
    <div className={styles.page}>
      <DotMatrixBackground />

      <div className={styles.layout}>
        <section className={styles.context} aria-label="Contexto da página">
          <div className={styles.intro}>
            <a href="#/whitelabels" className={styles.back}>
              <ArrowLeft size={15} strokeWidth={1.9} aria-hidden="true" />
              Voltar para Whitelabels
            </a>
            <p className={styles.subtitle}>
              Configure o SMTP e os envios de e-mails automáticos do Whitelabel selecionado. Cada seção é salva
              separadamente.
            </p>
          </div>
          <WhitelabelContextSelector
            current={whitelabel}
            options={PROTOTYPE_WHITELABELS}
            onSelect={(id) => {
              const target = PROTOTYPE_WHITELABELS.find((item) => item.id === id)
              requestNavigation(emailsHref(id), `trocar para ${target?.name ?? id}`)
            }}
          />
        </section>

        <DetailTransition
          item={whitelabel}
          className={styles.content}
          sectionId="whitelabel-emails"
          labelledBy="whitelabel-emails-label"
          onDisplay={setDisplayedId}
        >
          {(displayed) => <EmailSections key={`${displayed.id}:${draftReset}`} whitelabel={displayed} onDirtyChange={onDirtyChange} />}
        </DetailTransition>
      </div>

      {pending ? (
        <UnsavedChangesDialog
          sections={dirtyLabels}
          destination={pending.destination}
          onStay={stay}
          onDiscard={discardAndContinue}
        />
      ) : null}
    </div>
  )
}

function EmailSections({
  whitelabel,
  onDirtyChange,
}: {
  whitelabel: Whitelabel
  onDirtyChange: (section: EmailSectionKey, dirty: boolean) => void
}) {
  const notify = usePrototypeNotice()
  const settings = useWhitelabelEmailSettings(whitelabel.id)
  const activity = useEmailActivity(whitelabel.id)

  if (!settings) {
    return (
      <div className={styles.notFound} data-detail-stage>
        <p id="whitelabel-emails-label" className="visually-hidden">
          E-mails de {whitelabel.name}
        </p>
        <EmptyState icon={Building2} title="E-mails indisponíveis" description="Não há configurações ilustrativas de e-mail para este Whitelabel." />
      </div>
    )
  }

  return (
    <>
      <p id="whitelabel-emails-label" className="visually-hidden">
        E-mails de {whitelabel.name}
      </p>
      <div className={styles.columns}>
        <div className={styles.main}>
          <SmtpSection whitelabelId={whitelabel.id} saved={settings.smtp} onDirtyChange={onDirtyChange} notify={notify} />
          <EventsSection
            whitelabelId={whitelabel.id}
            whitelabelName={whitelabel.name}
            saved={settings.eventPreferences}
            smtpConfigured={settings.smtp.status === 'configured'}
            onDirtyChange={onDirtyChange}
            notify={notify}
          />
        </div>
        <div className={styles.aside}>
          <TemplatesSummary
            whitelabelId={whitelabel.id}
            summary={settings.templateSummary}
            smtp={settings.smtp}
            onManage={() =>
              notify('Gerenciamento de templates: próximo bloco do protótipo. Nenhum modelo é editado aqui.')
            }
          />
          <SessionActivity entries={activity} />
        </div>
      </div>
    </>
  )
}
