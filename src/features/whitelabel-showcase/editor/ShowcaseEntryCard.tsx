import { ChevronRight, LayoutTemplate } from 'lucide-react'
import { showcaseAvailableFor } from '../showcaseAccess'
import { SHOWCASE_SIMULATION, showcaseEditorHref } from '../showcaseMapping'
import { useShowcaseActor, useSimulation } from './editorHooks'
import styles from './ShowcaseEntryCard.module.css'

/**
 * Contextual entry "Plataforma → Vitrine de White Labels" on the owner's
 * settings page. Rendered only for the mapped owner fixture in the simulated
 * homolog environment and for roles that can read settings. Hiding it is
 * presentation only; direct URLs are gated by the Vitrine screens themselves.
 */
export function ShowcaseEntryCard({ record }: { record: { id: string; slug: string } }) {
  const { canView } = useShowcaseActor()
  const { environment } = useSimulation()
  if (!canView || !showcaseAvailableFor({ tenantId: record.id, tenantSlug: record.slug, environment })) return null
  const { logicalOwner } = SHOWCASE_SIMULATION
  return (
    <section className={styles.entry} aria-labelledby="plataforma-vitrine-titulo">
      <p className={styles.eyebrow}>Plataforma</p>
      <a className={styles.link} href={showcaseEditorHref(record.id)}>
        <span className={styles.icon} aria-hidden="true"><LayoutTemplate size={20} /></span>
        <span className={styles.text}>
          <strong id="plataforma-vitrine-titulo">Vitrine de White Labels</strong>
          <span>Banner principal, conteúdo introdutório e cards da vitrine pública. Somente {logicalOwner.label} · WL{logicalOwner.whitelabelId} · {logicalOwner.slug} (protótipo simulado).</span>
        </span>
        <ChevronRight size={18} aria-hidden="true" />
      </a>
    </section>
  )
}
