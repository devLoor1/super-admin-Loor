import { EyeOff } from 'lucide-react'
import fin from '../finance-gateways/sections/FinanceSections.module.css'
import { MENU_ENTRIES, MENU_TREE, menuEntry, menuLabelWithParent, type MenuEntry } from './menuRegistry'
import { effectiveState, isEffectivelyVisible, type VisibilityMap } from './visibilityModel'
import styles from './MenuVisibility.module.css'

/**
 * "Prévia" — the effective result of the DRAFT, drawn as an isolated
 * sidebar-like list inside this screen. Plain text, no links and no shared
 * state: it never touches the real sidebar, routes or any global store.
 * Hidden entries are listed with their reason (visibility language only).
 */
export function VisibilityPreview({ draft }: { draft: VisibilityMap }) {
  const hidden = MENU_ENTRIES.filter((entry) => !isEffectivelyVisible(draft, entry.id))
  return (
    <section className={fin.card} aria-labelledby="mv-preview-title" data-visibility-preview>
      <h2 id="mv-preview-title" className={fin.cardTitleSm}>
        Prévia da navegação
      </h2>
      <p className={fin.cardSubtitle}>Resultado efetivo do rascunho. Apenas uma prévia: o menu lateral real não muda.</p>
      <div className={styles.previewBox} role="group" aria-label="Prévia do menu com o rascunho">
        <PreviewList entries={MENU_TREE.primary} draft={draft} label="Prévia: navegação principal" />
        <PreviewList entries={MENU_TREE.utility} draft={draft} label="Prévia: utilitários" />
      </div>

      <h3 className={styles.hiddenTitle}>Ocultos no rascunho ({hidden.length})</h3>
      {hidden.length ? (
        <ul className={styles.hiddenList} data-preview-hidden>
          {hidden.map((entry) => {
            const state = effectiveState(draft, entry.id)
            return (
              <li key={entry.id} className={styles.hiddenItem} data-preview-hidden-id={entry.id} data-reason={state.state}>
                <EyeOff size={14} strokeWidth={1.8} aria-hidden="true" />
                <span>
                  <strong>{menuLabelWithParent(entry.id)}</strong>
                  <span className={styles.hiddenReason}>
                    {state.state === 'hidden-by-parent'
                      ? `Oculto por ${menuEntry(state.hiddenBy).label} · preferência própria mantida: visível`
                      : 'Oculto pela própria preferência'}
                  </span>
                </span>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className={styles.previewEmpty}>Nenhum módulo oculto no rascunho.</p>
      )}
    </section>
  )
}

function PreviewList({ entries, draft, label }: { entries: readonly MenuEntry[]; draft: VisibilityMap; label: string }) {
  const visible = entries.filter((entry) => isEffectivelyVisible(draft, entry.id))
  if (!visible.length) {
    return (
      <ul className={styles.previewList} aria-label={label}>
        <li className={styles.previewEmpty}>Nenhum item visível nesta área.</li>
      </ul>
    )
  }
  return (
    <ul className={styles.previewList} aria-label={label}>
      {visible.map((entry) => {
        const Icon = entry.icon
        const children = entry.children.filter((child) => isEffectivelyVisible(draft, child.id))
        return (
          <li key={entry.id} data-preview-id={entry.id}>
            <span className={styles.previewItem}>
              <Icon size={16} strokeWidth={1.7} aria-hidden="true" />
              {entry.label}
            </span>
            {children.length ? (
              <ul className={styles.previewChildren} aria-label={`Telas de ${entry.label}`}>
                {children.map((child) => {
                  const ChildIcon = child.icon
                  return (
                    <li key={child.id} className={styles.previewItem} data-preview-id={child.id}>
                      <ChildIcon size={14} strokeWidth={1.7} aria-hidden="true" />
                      {child.label}
                    </li>
                  )
                })}
              </ul>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
