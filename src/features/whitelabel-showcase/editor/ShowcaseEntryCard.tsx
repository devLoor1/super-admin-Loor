import { ChevronRight, LayoutTemplate } from 'lucide-react'
import { showcaseAvailableFor } from '../showcaseAccess'
import { showcaseEnvironment, showcaseEditorHref } from '../showcaseMapping'
import { useShowcaseActor } from './editorHooks'
import styles from './ShowcaseEntryCard.module.css'

export function ShowcaseEntryCard({ record }: { record: { id: string; slug: string } }) {
  const { canView } = useShowcaseActor()
  if (!canView || !showcaseAvailableFor({ tenantId: record.id, tenantSlug: record.slug, environment: showcaseEnvironment() })) return null
  return <section className={styles.entry} aria-labelledby="plataforma-vitrine-titulo">
    <p className={styles.eyebrow}>Plataforma</p>
    <a className={styles.link} href={showcaseEditorHref(record.id)}>
      <span className={styles.icon} aria-hidden="true"><LayoutTemplate size={20} /></span>
      <span className={styles.text}><strong id="plataforma-vitrine-titulo">Vitrine de White Labels</strong><span>Banner principal, conteúdo introdutório e cards. Homolog Loor · WL6 · homologacao.</span></span>
      <ChevronRight size={18} aria-hidden="true" />
    </a>
  </section>
}
