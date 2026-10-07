import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Building2 } from 'lucide-react'
import { useUnsavedChangesGuard } from '../../app/useUnsavedChangesGuard'
import { AppShell } from '../../components/shell/AppShell'
import { usePrototypeNotice } from '../../components/shell/prototypeNotice'
import { DetailTransition } from '../../components/ui/DetailTransition'
import { EmptyState } from '../../components/ui/EmptyState'
import { DotMatrixBackground } from '../whitelabels/visuals/DotMatrixBackground'
import { PROTOTYPE_WHITELABELS, type Whitelabel } from '../whitelabels/prototypeWhitelabels'
import { WhitelabelContextSelector } from '../whitelabel-accounts/WhitelabelContextSelector'
import { PublishTermsDialog, TermsRevisionDialog } from './dialogs/TermsDialogs'
import { UnsavedChangesDialog } from './dialogs/UnsavedChangesDialog'
import { ExperienceSection } from './sections/ExperienceSection'
import { FeaturesSection } from './sections/FeaturesSection'
import { GeneralSection } from './sections/GeneralSection'
import { IdentitySection } from './sections/IdentitySection'
import { SmtpSummary } from './sections/SmtpSummary'
import { TermsSection } from './sections/TermsSection'
import { SECTIONS, type SectionKey, type TermsRevision } from './settingsModel'
import { updateWhitelabelSettings, useWhitelabelSettings } from './settingsStore'
import styles from './WhitelabelSettingsPage.module.css'

const settingsHref = (id: string) => `#/whitelabels/${id}/settings`

type TermsDialog = { kind: 'view'; revision: TermsRevision } | { kind: 'publish' } | null

/**
 * Whitelabel Settings V1 — per-tenant configuration in independent sections
 * (Geral, Identidade, Experiência, Funcionalidades, Termos de Uso) plus an
 * SMTP summary. Frontend-only prototype: every save is local to this session;
 * nothing is fetched, persisted or sent to a Backend.
 */
export function WhitelabelSettingsPage({ whitelabelId }: { whitelabelId: string }) {
  const whitelabel = PROTOTYPE_WHITELABELS.find((item) => item.id === whitelabelId)
  return (
    <AppShell
      activeNav="plataformas"
      activeSubNav="whitelabel-settings"
      subNavHrefs={{
        contas: `#/whitelabels/${whitelabelId}/accounts`,
        'whitelabel-settings': settingsHref(whitelabelId),
        'whitelabel-emails': `#/whitelabels/${whitelabelId}/emails`,
        financeiro: `#/whitelabels/${whitelabelId}/finance/gateways`,
      }}
      title="Configurações do Whitelabel"
      location="Configurações"
      breadcrumbs={[
        { label: 'Plataformas' },
        { label: 'Whitelabels', href: '#/whitelabels' },
        { label: whitelabel?.name ?? 'Whitelabel não encontrado' },
        { label: 'Configurações' },
      ]}
    >
      {whitelabel ? (
        <SettingsContent whitelabel={whitelabel} />
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

function SettingsContent({ whitelabel }: { whitelabel: Whitelabel }) {
  const notify = usePrototypeNotice()
  const [dirty, setDirty] = useState<Partial<Record<SectionKey, boolean>>>({})
  const [draftReset, setDraftReset] = useState(0)
  const [termsDialog, setTermsDialog] = useState<TermsDialog>(null)
  const [activeSection, setActiveSection] = useState<SectionKey>('general')
  // Id of the Whitelabel whose sections are mounted (lags during the switch transition).
  const [displayedId, setDisplayedId] = useState(whitelabel.id)

  const dirtySections = SECTIONS.filter((section) => dirty[section.key])
  const hasUnsaved = dirtySections.length > 0
  const onDirtyChange = useCallback((section: SectionKey, value: boolean) => {
    setDirty((current) => (Boolean(current[section]) === value ? current : { ...current, [section]: value }))
  }, [])
  const onTermsDraftChange = useCallback((value: boolean) => onDirtyChange('terms', value), [onDirtyChange])

  // Shared guard: in-app links, Back/Forward, reload/tab close and the selector.
  const { pending, requestNavigation, stay, discardAndContinue } = useUnsavedChangesGuard(hasUnsaved, () => {
    setDirty({})
    setTermsDialog(null)
    setDraftReset((value) => value + 1)
  })

  // Section navigation: highlight the section currently in view. After a click
  // the chosen section stays highlighted until the user scrolls again (the
  // last cards may never reach the top of the viewport).
  const navLock = useRef(false)
  useEffect(() => {
    const release = () => {
      navLock.current = false
    }
    const options = { passive: true, capture: true }
    window.addEventListener('wheel', release, options)
    window.addEventListener('touchmove', release, options)
    window.addEventListener('keydown', release, options)
    return () => {
      window.removeEventListener('wheel', release, options)
      window.removeEventListener('touchmove', release, options)
      window.removeEventListener('keydown', release, options)
    }
  }, [])

  useEffect(() => {
    const elements = SECTIONS.map((section) => document.getElementById(section.anchor)).filter(
      (element): element is HTMLElement => Boolean(element),
    )
    if (!elements.length || !('IntersectionObserver' in window)) return
    const visible = new Map<string, number>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) visible.set(entry.target.id, entry.isIntersecting ? entry.boundingClientRect.top : Infinity)
        if (navLock.current) return
        const top = [...visible.entries()].filter(([, value]) => value !== Infinity).sort((a, b) => a[1] - b[1])[0]
        const match = SECTIONS.find((section) => section.anchor === top?.[0])
        if (match) setActiveSection(match.key)
      },
      { rootMargin: '-15% 0px -55% 0px' },
    )
    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [displayedId])

  function goToSection(key: SectionKey) {
    const section = SECTIONS.find((item) => item.key === key)
    const element = section && document.getElementById(section.anchor)
    if (!element) return
    navLock.current = true
    setActiveSection(key)
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    element.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' })
    element.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true })
  }

  async function copy(value: string, what: string) {
    try {
      await navigator.clipboard.writeText(value)
      notify(`${what.charAt(0).toUpperCase()}${what.slice(1)} copiado: ${value}`)
    } catch {
      notify(`Não foi possível copiar ${what} automaticamente. Valor: ${value}`)
    }
  }

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
              Configure identidade, textos, funcionalidades e Termos de Uso do Whitelabel selecionado. Cada seção é
              salva separadamente.
            </p>
          </div>
          <WhitelabelContextSelector
            current={whitelabel}
            options={PROTOTYPE_WHITELABELS}
            onSelect={(id) => {
              const target = PROTOTYPE_WHITELABELS.find((item) => item.id === id)
              requestNavigation(settingsHref(id), `trocar para ${target?.name ?? id}`)
            }}
          />
        </section>

        <div className={styles.toolbar}>
          <nav className={styles.sectionNav} aria-label="Seções das configurações">
            <ul className={styles.sectionList}>
              {SECTIONS.map((section) => (
                <li key={section.key}>
                  <button
                    type="button"
                    className={styles.sectionLink}
                    aria-current={activeSection === section.key ? 'true' : undefined}
                    onClick={() => goToSection(section.key)}
                  >
                    {section.label}
                    {dirty[section.key] ? (
                      <>
                        <span className={styles.dirtyDot} aria-hidden="true" />
                        <span className="visually-hidden"> (alterações não salvas)</span>
                      </>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <p className={styles.legend}>
            <span className={styles.legendTag}>Padrão global</span>
            <span>herdado da configuração global</span>
            <span className={styles.legendTag} data-source="tenant">
              Personalizado
            </span>
            <span>definido para este Whitelabel</span>
          </p>
        </div>

        <DetailTransition
          item={whitelabel}
          className={styles.content}
          sectionId="whitelabel-settings"
          labelledBy="whitelabel-settings-label"
          onDisplay={setDisplayedId}
        >
          {(displayed) => <SettingsSections key={`${displayed.id}:${draftReset}`} whitelabel={displayed} onDirtyChange={onDirtyChange} onCopy={copy} onTerms={setTermsDialog} />}
        </DetailTransition>
      </div>

      {pending ? (
        <UnsavedChangesDialog
          sections={dirtySections.map((section) => section.label)}
          destination={pending.destination}
          onStay={stay}
          onDiscard={discardAndContinue}
        />
      ) : null}

      <TermsDialogs
        whitelabel={whitelabel}
        dialog={termsDialog}
        onClose={() => setTermsDialog(null)}
        onDraftChange={onTermsDraftChange}
        onPublished={(revision) => {
          setTermsDialog(null)
          notify(`Revisão ${revision} publicada localmente e agora vigente. Nenhum novo aceite foi solicitado.`)
        }}
      />
    </div>
  )
}

function SettingsSections({
  whitelabel,
  onDirtyChange,
  onCopy,
  onTerms,
}: {
  whitelabel: Whitelabel
  onDirtyChange: (section: SectionKey, dirty: boolean) => void
  onCopy: (value: string, what: string) => void
  onTerms: (dialog: TermsDialog) => void
}) {
  const notify = usePrototypeNotice()
  const settings = useWhitelabelSettings(whitelabel.id)
  if (!settings) {
    return (
      <div className={styles.notFound} data-detail-stage>
        <p id="whitelabel-settings-label" className="visually-hidden">
          Configurações de {whitelabel.name}
        </p>
        <EmptyState icon={Building2} title="Configurações indisponíveis" description="Não há configurações ilustrativas para este Whitelabel." />
      </div>
    )
  }
  const save = (change: Parameters<typeof updateWhitelabelSettings>[1]) => updateWhitelabelSettings(whitelabel.id, change)

  return (
    <>
      <p id="whitelabel-settings-label" className="visually-hidden">
        Configurações de {whitelabel.name}
      </p>
      <div className={styles.columns}>
        <div className={styles.stack}>
          <GeneralSection whitelabel={whitelabel} lastLocalChange={settings.lastLocalChange} onCopy={onCopy} />
          <IdentitySection
            whitelabel={whitelabel}
            saved={settings.identity}
            publicName={settings.experience.publicName.value}
            ctaLabel={settings.experience.ctaLabel.value}
            onCommit={(identity) => save(() => ({ identity }))}
            onDirtyChange={onDirtyChange}
            notify={notify}
          />
        </div>
        <div className={styles.stack}>
          <ExperienceSection
            whitelabelName={whitelabel.name}
            saved={settings.experience}
            onCommit={(experience) => save(() => ({ experience }))}
            onDirtyChange={onDirtyChange}
            notify={notify}
          />
          <FeaturesSection
            saved={settings.features}
            onCommit={(features) => save(() => ({ features }))}
            onDirtyChange={onDirtyChange}
            notify={notify}
          />
        </div>
      </div>
      <div className={styles.bottomRow}>
        <TermsSection
          terms={settings.terms}
          onView={(revision) => onTerms({ kind: 'view', revision })}
          onPublish={() => onTerms({ kind: 'publish' })}
        />
        <SmtpSummary whitelabelId={whitelabel.id} />
      </div>
    </>
  )
}

function TermsDialogs({
  whitelabel,
  dialog,
  onClose,
  onDraftChange,
  onPublished,
}: {
  whitelabel: Whitelabel
  dialog: TermsDialog
  onClose: () => void
  onDraftChange: (dirty: boolean) => void
  onPublished: (revision: number) => void
}) {
  const settings = useWhitelabelSettings(whitelabel.id)
  if (!dialog || !settings) return null
  const { current } = settings.terms
  const focusTerms = () =>
    document.querySelector<HTMLElement>('#settings-terms [data-terms-publish]') ??
    document.querySelector<HTMLElement>('#settings-terms h2')

  if (dialog.kind === 'view') {
    return (
      <TermsRevisionDialog
        revision={dialog.revision}
        isCurrent={dialog.revision.id === current?.id}
        onClose={onClose}
        fallbackFocus={focusTerms}
      />
    )
  }

  return (
    <PublishTermsDialog
      whitelabelName={whitelabel.name}
      platformName={settings.experience.publicName.value}
      current={current}
      onCancel={onClose}
      onDirtyChange={onDraftChange}
      fallbackFocus={focusTerms}
      onPublish={({ title, content }) => {
        const revision = (current?.revision ?? 0) + 1
        updateWhitelabelSettings(whitelabel.id, (value) => ({
          terms: {
            current: {
              id: `${whitelabel.id}_terms_rev_${revision}_local`,
              revision,
              title,
              content,
              publishedAt: new Date().toISOString(),
              local: true,
            },
            history: value.terms.current ? [value.terms.current, ...value.terms.history] : value.terms.history,
          },
        }))
        onPublished(revision)
      }}
    />
  )
}
