import { useRef } from 'react'
import { FileText, History, Info, Landmark, Link2, ListChecks, Power, PowerOff } from 'lucide-react'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import { StatusPill } from '../../../components/ui/StatusPill'
import { ENVIRONMENT_LABEL, formatTime, providerOf, type WhitelabelFinanceSettings } from '../../finance-gateways/financeModel'
import fin from '../../finance-gateways/sections/FinanceSections.module.css'
import type { Whitelabel } from '../../whitelabels/prototypeWhitelabels'
import { SettingsSection } from '../../whitelabel-settings/SettingsSection'
import { useSectionEditor } from '../../whitelabel-settings/useSectionEditor'
import fields from '../../whitelabel-settings/sections/fields.module.css'
import {
  CHOICE_CONCEPTS,
  CHOICE_LABEL,
  GATEWAY_DEPENDENCY_META,
  MODALITY_DISPLAY_META,
  PENDING_CONCEPTS,
  RULE_CATEGORIES,
  RULE_CONCEPTS,
  describeRuleChanges,
  gatewayDependency,
  isEnabled,
  localOverrides,
  modalityDisplay,
  rulesOrigin,
  servingGateways,
  type ModalityActivity,
  type ModalityDraftKey,
  type ModalityMeta,
  type ModalityRuleConfig,
  type RuleChoice,
  type RuleConcept,
} from '../modalitiesModel'
import { addModalityActivity, saveModalityRules } from '../modalitiesStore'
import styles from './ModalitySections.module.css'

const gatewaysHref = (id: string) => `#/whitelabels/${id}/finance/gateways`

/* ---------- Visão geral ---------- */

export function ModalityOverview({
  whitelabel,
  modality,
  settings,
  rules,
  lastChange,
  onEnable,
  onRequestDisable,
}: {
  whitelabel: Whitelabel
  modality: ModalityMeta
  settings: WhitelabelFinanceSettings
  rules: ModalityRuleConfig
  lastChange?: ModalityActivity
  onEnable: () => void
  onRequestDisable: () => void
}) {
  const display = MODALITY_DISPLAY_META[modalityDisplay(settings, modality.id)]
  const dependency = GATEWAY_DEPENDENCY_META[gatewayDependency(settings, modality.id)]
  const enabled = isEnabled(settings, modality.id)
  const overrides = localOverrides(rules)
  return (
    <>
      <SettingsSection
        id="mod-overview"
        title="Informações principais"
        subtitle="Estado local desta modalidade para o Whitelabel. Nenhum valor é confirmado pelo Backend."
      >
        <dl className={fields.rows}>
          <div className={fields.row}>
            <dt>Status</dt>
            <dd>
              <StatusPill tone={display.tone} label={display.label} />
            </dd>
          </div>
          <div className={fields.row}>
            <dt>Descrição</dt>
            <dd>
              <span className={fields.value}>{modality.description}</span>
            </dd>
          </div>
          <div className={fields.row}>
            <dt>Escopo</dt>
            <dd>
              <span className={fields.value}>
                Whitelabel {whitelabel.name} · {whitelabel.id}
              </span>
            </dd>
          </div>
          <div className={fields.row}>
            <dt>Origem da configuração</dt>
            <dd>
              <span className={fields.source}>Padrão da plataforma não definido</span>
              <span className={fields.source} data-source="tenant">
                Configuração local do protótipo
              </span>
            </dd>
          </div>
          <div className={fields.row}>
            <dt>Regras</dt>
            <dd>
              <span className={fields.value}>
                {overrides} de {CHOICE_CONCEPTS.length} conceitos editáveis com override local · {PENDING_CONCEPTS.length} aguardando
                definição
              </span>
            </dd>
          </div>
          <div className={fields.row}>
            <dt>Dependência de gateway</dt>
            <dd>
              <StatusPill tone={dependency.tone} label={dependency.label} />
            </dd>
          </div>
          <div className={fields.row}>
            <dt>Integração</dt>
            <dd>
              <StatusPill tone="neutral" label="Aguardando Backend" />
            </dd>
          </div>
          <div className={fields.row}>
            <dt>Última alteração</dt>
            <dd>
              {lastChange ? (
                <span className={fields.value}>Às {formatTime(lastChange.at)} · nesta sessão</span>
              ) : (
                <span className={fields.empty}>Nenhuma nesta sessão</span>
              )}
            </dd>
          </div>
        </dl>
      </SettingsSection>
      <div className={styles.toggleRow}>
        {enabled ? (
          <OutlineButton className={`${fin.actionButton} ${fin.dangerButton}`} onClick={onRequestDisable} data-modality-toggle>
            <PowerOff size={15} strokeWidth={1.9} aria-hidden="true" />
            Desabilitar modalidade
          </OutlineButton>
        ) : (
          <OutlineButton className={`${fin.actionButton} ${fin.activateButton}`} onClick={onEnable} data-modality-toggle>
            <Power size={15} strokeWidth={1.9} aria-hidden="true" />
            Habilitar modalidade
          </OutlineButton>
        )}
        <span className={styles.toggleHint}>Altera apenas o estado local deste protótipo.</span>
      </div>
    </>
  )
}

/* ---------- Dependências ---------- */

export function ModalityDependencies({
  whitelabelId,
  modality,
  settings,
  rules,
}: {
  whitelabelId: string
  modality: ModalityMeta
  settings: WhitelabelFinanceSettings
  rules: ModalityRuleConfig
}) {
  const dependency = gatewayDependency(settings, modality.id)
  const gateways = servingGateways(settings, modality.id)
  const activeAccounts = settings.bankAccounts.filter((account) => account.status === 'active').length
  const overrides = localOverrides(rules)
  const gatewayDetail =
    dependency === 'not_evaluated'
      ? `${modality.name} não está habilitada para este Whitelabel.`
      : gateways.length
        ? `Atendida por ${gateways
            .map((gateway) => `${providerOf(gateway.providerId).name} (${ENVIRONMENT_LABEL[gateway.environment]})`)
            .join(', ')}.`
        : `Nenhum gateway ativo marcado para ${modality.name} em Gateways e contas.`

  return (
    <section className={fin.activityBox} aria-labelledby="mod-deps-title">
      <h3 id="mod-deps-title" className={fin.cardTitleSm}>
        Dependências conceituais
      </h3>
      <p className={fin.activityIntro}>
        Derivadas da configuração local de Gateways e contas. Somente o gateway é verificado localmente e conta como pendência; nada
        aqui indica prontidão do Backend.
      </p>
      <ul className={styles.depList}>
        <li className={styles.dep} data-dependency="gateway">
          <span className={styles.depIcon} aria-hidden="true">
            <Link2 size={16} strokeWidth={1.8} />
          </span>
          <div className={styles.depText}>
            <p className={styles.depTitle}>Gateway ativo</p>
            <p className={styles.depDetail}>{gatewayDetail}</p>
            <p className={styles.depNote}>
              Regra de demonstração: qualquer gateway local ativo, inclusive Sandbox, conta. Isso não comprova prontidão em
              Produção. Qual gateway atende cada modalidade — e se Sandbox satisfaz a dependência real — é decisão de Produto e
              Backend.
            </p>
            <a className={styles.depLink} href={gatewaysHref(whitelabelId)}>
              Gerenciar em Gateways e contas
            </a>
          </div>
          <StatusPill tone={GATEWAY_DEPENDENCY_META[dependency].tone} label={GATEWAY_DEPENDENCY_META[dependency].label} />
        </li>
        <li className={styles.dep} data-dependency="bank">
          <span className={styles.depIcon} aria-hidden="true">
            <Landmark size={16} strokeWidth={1.8} />
          </span>
          <div className={styles.depText}>
            <p className={styles.depTitle}>Conta bancária</p>
            <p className={styles.depDetail}>
              {activeAccounts
                ? `${activeAccounts} ${activeAccounts === 1 ? 'conta ativa cadastrada' : 'contas ativas cadastradas'} em Gateways e contas.`
                : 'Nenhuma conta ativa cadastrada em Gateways e contas.'}
            </p>
            <p className={styles.depNote}>Se a modalidade exige conta bancária — e qual — é decisão de Produto e Backend.</p>
          </div>
          <StatusPill tone="neutral" label="Relação não definida" />
        </li>
        <li className={styles.dep} data-dependency="rules">
          <span className={styles.depIcon} aria-hidden="true">
            <ListChecks size={16} strokeWidth={1.8} />
          </span>
          <div className={styles.depText}>
            <p className={styles.depTitle}>Regras</p>
            <p className={styles.depDetail}>
              {overrides} de {CHOICE_CONCEPTS.length} conceitos editáveis com configuração local; {PENDING_CONCEPTS.length} aguardando
              definição.
            </p>
            <p className={styles.depNote}>Não bloqueia neste protótipo: o catálogo oficial de regras ainda não existe.</p>
          </div>
          <StatusPill tone={overrides ? 'neutral' : 'muted'} label={overrides ? 'Configuração local' : 'Padrão não definido'} />
        </li>
        <li className={styles.dep} data-dependency="documents">
          <span className={styles.depIcon} aria-hidden="true">
            <FileText size={16} strokeWidth={1.8} />
          </span>
          <div className={styles.depText}>
            <p className={styles.depTitle}>Documentação e requisitos</p>
            <p className={styles.depDetail}>Requisitos documentais desta modalidade ainda não definidos.</p>
          </div>
          <StatusPill tone="muted" label="Definição pendente" />
        </li>
      </ul>
    </section>
  )
}

/* ---------- Regras ---------- */

const ORIGIN: Record<RuleConcept['kind'], string> = {
  derived: 'Derivado da habilitação',
  choice: '',
  pending: 'Aguardando Backend',
}

const MARKERS: Record<RuleConcept['kind'], string[]> = {
  derived: ['Configuração de protótipo', 'Decisão de Produto pendente', 'Contrato de Backend pendente'],
  choice: ['Configuração de protótipo', 'Decisão de Produto pendente', 'Contrato de Backend pendente'],
  pending: ['Decisão de Produto pendente', 'Contrato de Backend pendente'],
}

const CHOICES: RuleChoice[] = ['default', 'yes', 'no']
const CHOICE_OPTION: Record<RuleChoice, string> = {
  default: 'Padrão não definido',
  yes: 'Sim (override local)',
  no: 'Não (override local)',
}

export function ModalityRules({
  whitelabelId,
  modality,
  enabled,
  rules,
  onDirtyChange,
  notify,
}: {
  whitelabelId: string
  modality: ModalityMeta
  enabled: boolean
  rules: ModalityRuleConfig
  onDirtyChange: (key: ModalityDraftKey, dirty: boolean) => void
  notify: (message: string) => void
}) {
  const editRef = useRef<HTMLButtonElement>(null)
  const editor = useSectionEditor<ModalityRuleConfig, ModalityDraftKey>({
    section: 'modality-rules',
    label: `Regras de ${modality.name}`,
    saved: rules,
    onDirtyChange,
    notify,
    onCommit: (draft) => {
      const changes = describeRuleChanges(rules, draft)
      saveModalityRules(whitelabelId, modality.id, draft)
      addModalityActivity(whitelabelId, {
        kind: 'rules_updated',
        modalityId: modality.id,
        title: `Regras de ${modality.name} alteradas localmente`,
        detail: changes || undefined,
      })
    },
  })
  const values = editor.editing ? editor.draft : rules

  return (
    <SettingsSection
      id="mod-rules"
      title="Regras da modalidade"
      subtitle="Conceitos estruturais de protótipo — não são regras de negócio confirmadas."
      status={rulesOrigin(rules)}
      editLabel="Editar regras"
      editButtonRef={editRef}
      editor={{
        ...editor,
        startEditing: () => {
          editor.startEditing()
          window.requestAnimationFrame(() => document.getElementById(`mod-rule-${CHOICE_CONCEPTS[0].key}`)?.focus())
        },
        discard: () => {
          if (editor.dirty) {
            addModalityActivity(whitelabelId, {
              kind: 'rules_discarded',
              modalityId: modality.id,
              title: `Alterações nas regras de ${modality.name} descartadas`,
            })
          }
          editor.discard()
          window.requestAnimationFrame(() => editRef.current?.focus())
        },
        save: () => {
          editor.save()
        },
      }}
    >
      <ul className={styles.ruleList}>
        {RULE_CATEGORIES.map((category) =>
          RULE_CONCEPTS.filter((concept) => concept.category === category.id).map((concept) => {
            const id = `mod-rule-${concept.key}`
            return (
              <li key={concept.key} className={styles.rule} data-rule={concept.key}>
                <span className={styles.ruleCategory}>{category.label}</span>
                <div className={styles.ruleText}>
                  {concept.kind === 'choice' && editor.editing ? (
                    <label htmlFor={id} className={styles.ruleLabel}>
                      {concept.label}
                    </label>
                  ) : (
                    <span className={styles.ruleLabel}>{concept.label}</span>
                  )}
                  <span id={`${id}-desc`} className={styles.ruleDescription}>
                    {concept.description}
                  </span>
                </div>
                {concept.kind === 'choice' ? (
                  editor.editing ? (
                    <select
                      id={id}
                      className={styles.ruleSelect}
                      value={values[concept.key]}
                      aria-describedby={`${id}-desc`}
                      onChange={(event) => {
                        const value = event.target.value as RuleChoice
                        editor.update((current) => ({ ...current, [concept.key]: value }))
                      }}
                    >
                      {CHOICES.map((choice) => (
                        <option key={choice} value={choice}>
                          {CHOICE_OPTION[choice]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className={styles.ruleValue} data-empty={values[concept.key] === 'default' || undefined}>
                      {values[concept.key] === 'default' ? (
                        <>
                          —<span className="visually-hidden"> (padrão não definido)</span>
                        </>
                      ) : (
                        CHOICE_LABEL[values[concept.key]]
                      )}
                    </span>
                  )
                ) : concept.kind === 'derived' ? (
                  <span className={styles.ruleValue}>{enabled ? 'Sim' : 'Não'}</span>
                ) : (
                  <span className={styles.ruleValue} data-empty>
                    —<span className="visually-hidden"> (sem definição)</span>
                  </span>
                )}
                <span className={styles.tags}>
                  {concept.kind === 'choice' ? (
                    values[concept.key] === 'default' ? (
                      <span className={fields.source}>Padrão não definido</span>
                    ) : (
                      <span className={fields.source} data-source="tenant">
                        Override do Whitelabel
                      </span>
                    )
                  ) : (
                    <span className={fields.source}>{ORIGIN[concept.kind]}</span>
                  )}
                  <span className={styles.markers}>{MARKERS[concept.kind].join(' · ')}</span>
                </span>
              </li>
            )
          }),
        )}
      </ul>
      <p className={fields.note}>
        <Info size={14} strokeWidth={1.8} aria-hidden="true" />
        <span>
          Taxas, percentuais, valores mínimos, prazos, amortização, cronogramas e cálculos de retorno não são configurados aqui.
          Padrão da plataforma, herança e o catálogo oficial de regras por modalidade dependem de Produto e Backend.
        </span>
      </p>
    </SettingsSection>
  )
}

/* ---------- Atividade da sessão ---------- */

export function ModalityActivityPanel({ entries }: { entries: ModalityActivity[] }) {
  return (
    <section className={fin.activityBox} aria-labelledby="mod-activity-title">
      <h3 id="mod-activity-title" className={fin.cardTitleSm}>
        Atividade da sessão
      </h3>
      <p className={fin.activityIntro}>Somente ações locais desta sessão do navegador — não é trilha de auditoria.</p>
      {entries.length ? (
        <ol className={fin.activityList}>
          {entries.map((entry) => (
            <li key={entry.id} className={fin.activityItem}>
              <div>
                <p className={fin.activityTitle}>{entry.title}</p>
                {entry.detail ? <p className={fin.activityDetail}>{entry.detail}</p> : null}
              </div>
              <time className={fin.activityTime} dateTime={entry.at}>
                {formatTime(entry.at)}
              </time>
            </li>
          ))}
        </ol>
      ) : (
        <p className={fin.activityEmpty}>
          <History size={15} strokeWidth={1.8} aria-hidden="true" />
          Nenhuma alteração local nesta sessão.
        </p>
      )}
    </section>
  )
}
