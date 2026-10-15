import styles from './EntrepreneurViews.module.css'

export type EntrepreneurView = 'entrepreneurs' | 'companies'

/**
 * Contextual switch under Operação › Empreendedores: Empreendedores (Control
 * Plane) and Empresas (prototype, pending Backend). Plain links — no data and
 * no menu entry of its own: the sidebar keeps the stable
 * `operation-entrepreneurs` item for both pages.
 */
export function EntrepreneurViewSwitch({ current }: { current: EntrepreneurView }) {
  return (
    <nav className={styles.switch} aria-label="Visões operacionais de Empreendedores e Empresas" data-entrepreneur-views>
      <a
        href="#/operation/entrepreneurs"
        className={styles.link}
        aria-current={current === 'entrepreneurs' ? 'page' : undefined}
        data-view-link="entrepreneurs"
      >
        Empreendedores
      </a>
      <a
        href="#/operation/companies"
        className={styles.link}
        aria-current={current === 'companies' ? 'page' : undefined}
        data-view-link="companies"
      >
        Empresas
        <span className={styles.tag}>Protótipo</span>
      </a>
    </nav>
  )
}
