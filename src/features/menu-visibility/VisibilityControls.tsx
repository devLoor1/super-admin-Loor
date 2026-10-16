import { Lock } from 'lucide-react'
import { Switch } from '../../components/ui/Switch'
import fin from '../finance-gateways/sections/FinanceSections.module.css'
import { MENU_TREE, menuEntry, type MenuEntry, type MenuId } from './menuRegistry'
import { effectiveState, type VisibilityMap } from './visibilityModel'
import { isProtectedMenuId, PROTECTED_EXPLANATION } from './visibilityPolicy'
import styles from './MenuVisibility.module.css'

/**
 * Hierarchical preference controls, in real sidebar order. `base` is the
 * persisted configuration read from the Control Plane; `draft` the local
 * edit. Every switch edits only its own draft preference: a child stays
 * editable while its parent is hidden, and the effective result ("Oculto pelo
 * item pai") is shown next to it (rule 8). The hierarchy is the frontend
 * navigation's: the Control Plane stores the 23 IDs as a flat map.
 *
 * Approved rules applied here:
 * - Dashboard and Configurações are LOCKED (rules 1, 2): their switch is
 *   `aria-disabled`, never changes the draft, and states why. A persisted
 *   `false` stays visible as `false` (reported, not rewritten).
 * - `readOnly` (SUPPORT_ADMIN / READ_ONLY — rule 7): no switches at all, only
 *   the state of each module.
 */
export function VisibilityControls({
  base,
  draft,
  onChange,
  onLockedAttempt,
  readOnly = false,
}: {
  base: VisibilityMap
  draft: VisibilityMap
  onChange: (id: MenuId, visible: boolean) => void
  /** A locked (protected) switch was activated: explain, change nothing. */
  onLockedAttempt?: (id: MenuId) => void
  readOnly?: boolean
}) {
  const rowProps = { base, draft, onChange, onLockedAttempt, readOnly }
  return (
    <div className={styles.main} data-visibility-controls data-read-only={readOnly || undefined}>
      <div className={styles.areaHead}>
        <h2 className={styles.areaTitle} id="mv-primary-title">
          Navegação principal
        </h2>
        <p className={styles.areaText}>Mesmos módulos, nomes, ordem e hierarquia do menu lateral atual.</p>
      </div>
      {MENU_TREE.primary.map((entry) => (
        <section key={entry.id} className={`${fin.card} ${styles.group}`} aria-label={`Grupo ${entry.label}`} data-group={entry.id}>
          <ul className={styles.rows}>
            <Row entry={entry} {...rowProps} />
          </ul>
          {entry.children.length ? (
            <ul className={styles.children} aria-label={`Telas de ${entry.label}`}>
              {entry.children.map((child) => (
                <Row key={child.id} entry={child} {...rowProps} />
              ))}
            </ul>
          ) : null}
          {entry.id === 'operacao' ? (
            <p className={styles.groupNote} data-companies-note>
              Empresas é uma visão contextual (protótipo) dentro de Empreendedores e não tem ID de visibilidade aprovado: não aparece nesta
              lista e não recebe comportamento próprio aqui.
            </p>
          ) : null}
        </section>
      ))}

      <div className={styles.areaHead}>
        <h2 className={styles.areaTitle} id="mv-utility-title">
          Utilitários
        </h2>
        <p className={styles.areaText} data-independence-note>
          Sistema, Configurações e Ajuda são independentes (regra aprovada): nenhum deles é item pai dos outros, e ocultar Sistema não afeta
          Configurações nem Ajuda.
        </p>
      </div>
      <section className={`${fin.card} ${styles.group}`} aria-labelledby="mv-utility-title" data-group="utility">
        <ul className={styles.rows}>
          {MENU_TREE.utility.map((entry) => (
            <Row key={entry.id} entry={entry} {...rowProps} />
          ))}
        </ul>
      </section>
    </div>
  )
}

function Row({
  entry,
  base,
  draft,
  onChange,
  onLockedAttempt,
  readOnly,
}: {
  entry: MenuEntry
  base: VisibilityMap
  draft: VisibilityMap
  onChange: (id: MenuId, visible: boolean) => void
  onLockedAttempt?: (id: MenuId) => void
  readOnly: boolean
}) {
  const Icon = entry.icon
  const isProtected = isProtectedMenuId(entry.id)
  const preference = draft[entry.id]
  const violation = isProtected && !preference
  const effective = effectiveState(draft, entry.id)
  const changed = base[entry.id] !== draft[entry.id]
  const parent = entry.parentId ? menuEntry(entry.parentId) : null
  const stateId = `mv-state-${entry.id}`
  const name = parent ? `${entry.label} (${parent.label})` : entry.label
  const inheritedHidden = entry.children.filter((child) => draft[child.id]).length

  const stateKey = isProtected ? (violation ? 'violation' : 'protected') : effective.state
  const stateLabel = isProtected
    ? violation
      ? 'Conflito'
      : 'Sempre visível'
    : effective.state === 'visible'
      ? 'Visível'
      : effective.state === 'hidden'
        ? 'Oculto'
        : 'Oculto pelo item pai'
  const stateDescription = isProtected
    ? `${PROTECTED_EXPLANATION[entry.id as keyof typeof PROTECTED_EXPLANATION]}${
        violation ? ' A configuração persistida está como oculto, o que viola a regra; o valor não foi alterado e precisa de correção no servidor.' : ''
      }`
    : effective.state === 'hidden-by-parent'
      ? `Preferência: visível. Resultado: oculto porque ${menuEntry(effective.hiddenBy).label} está oculto.`
      : `Preferência: ${preference ? 'visível' : 'oculto'}.`

  return (
    <li
      className={styles.row}
      data-menu-id={entry.id}
      data-child={parent ? '' : undefined}
      data-effective={effective.state}
      data-changed={changed || undefined}
      data-protected={isProtected || undefined}
      data-violation={violation || undefined}
    >
      <span className={styles.rowIcon} aria-hidden="true">
        <Icon size={parent ? 15 : 17} strokeWidth={1.7} />
      </span>
      <span className={styles.rowText}>
        <span className={styles.rowLabel}>
          {entry.label}
          {changed ? <span className={styles.changed}>Alterado</span> : null}
        </span>
        <span className={styles.rowId}>{entry.id}</span>
        {changed ? (
          <span className={styles.rowNote} data-persisted-value={base[entry.id] ? 'visible' : 'hidden'}>
            Configuração persistida: {base[entry.id] ? 'visível' : 'oculto'}.
          </span>
        ) : null}
        {isProtected ? (
          <span className={styles.rowNote} data-protected-note>
            <Lock size={12} strokeWidth={2} aria-hidden="true" className={styles.noteIcon} />
            {PROTECTED_EXPLANATION[entry.id as keyof typeof PROTECTED_EXPLANATION]}
          </span>
        ) : null}
        {violation ? (
          <span className={styles.rowNote} data-tone="danger" data-violation-note>
            {base[entry.id] === false
              ? 'Conflito: a configuração persistida está como oculto, contrariando a regra. O valor do servidor não foi alterado; correção no servidor necessária.'
              : 'Conflito: este módulo está oculto no rascunho, contrariando a regra.'}
          </span>
        ) : null}
        {effective.state === 'hidden-by-parent' ? <span className={styles.rowNote}>Preferência própria mantida: visível.</span> : null}
        {!preference && entry.children.length ? (
          <span className={styles.rowNote}>
            {inheritedHidden
              ? `${inheritedHidden === 1 ? '1 tela fica oculta' : `${inheritedHidden} telas ficam ocultas`} enquanto ${entry.label} estiver oculto; as preferências das telas são mantidas.`
              : 'As telas abaixo também estão ocultas pela própria preferência.'}
          </span>
        ) : null}
        {entry.id === 'sistema' ? <span className={styles.rowNote}>Sem telas próprias na navegação atual.</span> : null}
        <span id={stateId} className="visually-hidden">
          {stateDescription}
          {changed ? ` Alterado no rascunho; configuração persistida: ${base[entry.id] ? 'visível' : 'oculto'}.` : ''}
        </span>
      </span>
      <span className={styles.rowControl}>
        <span className={styles.state} data-state={stateKey} aria-hidden="true">
          {isProtected ? <Lock size={11} strokeWidth={2.2} aria-hidden="true" /> : null}
          {stateLabel}
        </span>
        {readOnly ? (
          <span className="visually-hidden" data-read-only-state={entry.id}>
            {name}: {stateDescription}
          </span>
        ) : isProtected ? (
          <Switch
            checked={preference}
            onCheckedChange={() => onLockedAttempt?.(entry.id)}
            aria-disabled="true"
            className={styles.lockedSwitch}
            aria-label={`Mostrar ${name} na navegação (bloqueado)`}
            aria-describedby={stateId}
            data-visibility-switch={entry.id}
            data-locked=""
          />
        ) : (
          <Switch
            checked={preference}
            onCheckedChange={(visible) => onChange(entry.id, visible)}
            aria-label={`Mostrar ${name} na navegação`}
            aria-describedby={stateId}
            data-visibility-switch={entry.id}
          />
        )}
      </span>
    </li>
  )
}
