import { EyeOff, Lock } from 'lucide-react'
import fin from '../finance-gateways/sections/FinanceSections.module.css'
import { menuEntry, menuLabelWithParent } from './menuRegistry'
import type { VisibilityMap } from './visibilityModel'
import { resolveVisibility, type SidebarNode } from './visibilityResolver'
import styles from './MenuVisibility.module.css'

/**
 * "Prévia" — the SIDEBAR the given map would produce, computed by the pure
 * resolver (`visibilityResolver.ts`) and drawn as an isolated list inside this
 * screen. Plain text, no links and no shared state: it never touches the real
 * sidebar, routes, shortcuts or any global store. Hidden entries are listed
 * with their reason; protected modules are always present (rules 1, 2, 6) and a
 * stored `false` on them is flagged as a conflict.
 */
export function VisibilityPreview({ draft, subject = 'rascunho' }: { draft: VisibilityMap; subject?: 'rascunho' | 'configuração persistida' }) {
  const resolution = resolveVisibility(draft)
  return (
    <section className={fin.card} aria-labelledby="mv-preview-title" data-visibility-preview data-preview-subject={subject}>
      <h2 id="mv-preview-title" className={fin.cardTitleSm}>
        Prévia do menu lateral
      </h2>
      <p className={fin.cardSubtitle}>
        Resultado efetivo {subject === 'rascunho' ? 'do rascunho' : 'da configuração persistida'} no menu lateral. Esta prévia não altera o menu
        real: ele usa apenas a leitura autoritativa. Rotas diretas, atalhos e links internos continuam disponíveis.
      </p>
      <div className={styles.previewBox} role="group" aria-label={`Prévia do menu com ${subject === 'rascunho' ? 'o rascunho' : 'a configuração persistida'}`}>
        <PreviewList nodes={resolution.sidebar.primary} label="Prévia: navegação principal" resolution={resolution} />
        <PreviewList nodes={resolution.sidebar.utility} label="Prévia: utilitários" resolution={resolution} />
      </div>

      <h3 className={styles.hiddenTitle}>Fora do menu lateral ({resolution.hidden.length})</h3>
      {resolution.hidden.length ? (
        <ul className={styles.hiddenList} data-preview-hidden>
          {resolution.hidden.map((entry) => (
            <li key={entry.id} className={styles.hiddenItem} data-preview-hidden-id={entry.id} data-reason={entry.reason === 'hidden-by-parent' ? 'hidden-by-parent' : 'hidden'}>
              <EyeOff size={14} strokeWidth={1.8} aria-hidden="true" />
              <span>
                <strong>{menuLabelWithParent(entry.id)}</strong>
                <span className={styles.hiddenReason}>
                  {entry.reason === 'hidden-by-parent' && entry.hiddenBy
                    ? `Oculto por ${menuEntry(entry.hiddenBy).label} · preferência própria mantida: visível`
                    : 'Oculto pela própria preferência'}{' '}
                  · acesso direto mantido
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.previewEmpty}>Nenhum módulo fora do menu lateral.</p>
      )}
      {resolution.violations.length ? (
        <p className={styles.panelNote} data-tone="danger" data-preview-violations={resolution.violations.length}>
          <Lock size={14} strokeWidth={1.9} aria-hidden="true" />
          <span>
            {resolution.violations.map((violation) => menuEntry(violation.id).label).join(' e ')}{' '}
            {resolution.violations.length === 1 ? 'aparece' : 'aparecem'} na prévia porque {resolution.violations.length === 1 ? 'é' : 'são'} sempre
            {resolution.violations.length === 1 ? ' visível' : ' visíveis'}, embora a preferência esteja como oculto (conflito com a regra).
          </span>
        </p>
      ) : null}
    </section>
  )
}

function PreviewList({ nodes, label, resolution }: { nodes: readonly SidebarNode[]; label: string; resolution: ReturnType<typeof resolveVisibility> }) {
  if (!nodes.length) {
    return (
      <ul className={styles.previewList} aria-label={label}>
        <li className={styles.previewEmpty}>Nenhum item visível nesta área.</li>
      </ul>
    )
  }
  return (
    <ul className={styles.previewList} aria-label={label}>
      {nodes.map((node) => {
        const entry = menuEntry(node.id)
        const Icon = entry.icon
        const resolved = resolution.byId[node.id]
        return (
          <li key={node.id} data-preview-id={node.id} data-preview-protected={resolved.protected || undefined} data-preview-conflict={resolved.policyViolation || undefined}>
            <span className={styles.previewItem}>
              <Icon size={16} strokeWidth={1.7} aria-hidden="true" />
              <span>
                {entry.label}
                {resolved.protected ? (
                  <span className={styles.previewLock} title="Sempre visível">
                    <Lock size={11} strokeWidth={2.2} aria-hidden="true" />
                    <span className="visually-hidden"> (sempre visível{resolved.policyViolation ? '; conflito com a preferência persistida' : ''})</span>
                  </span>
                ) : null}
              </span>
            </span>
            {node.children.length ? (
              <ul className={styles.previewChildren} aria-label={`Telas de ${entry.label}`}>
                {node.children.map((child) => {
                  const childEntry = menuEntry(child.id)
                  const ChildIcon = childEntry.icon
                  return (
                    <li key={child.id} className={styles.previewItem} data-preview-id={child.id}>
                      <ChildIcon size={14} strokeWidth={1.7} aria-hidden="true" />
                      {childEntry.label}
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
