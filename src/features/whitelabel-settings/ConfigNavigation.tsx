import styles from './WhitelabelSettingsPage.module.css'
import { configHref, type ConfigArea } from './configRoute'
/** Existing tenant destinations; these are page sections, never new Menu Visibility IDs. */
export function ConfigNavigation({ id, active }: { id: string; active: ConfigArea | 'email' }) {
  const links = [
    ['platform', 'Plataforma', configHref(id)],
    ['app', 'Platform App', configHref(id, 'app')],
    ['email', 'E-mail', `#/whitelabels/${encodeURIComponent(id)}/emails?section=smtp`],
    ['terms', 'Termos de Uso', configHref(id, 'terms')],
    ['identity', 'Identidade visual', configHref(id, 'identity')],
  ]
  return <nav className={styles.sectionNav} aria-label="Áreas de configuração do Whitelabel"><ul className={styles.sectionList}>
    {links.map(([key, label, href]) => <li key={key}><a className={styles.sectionLink} href={href} aria-current={active === key ? 'page' : undefined}>{label}</a></li>)}
  </ul></nav>
}
