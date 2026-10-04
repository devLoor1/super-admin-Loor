import { GlobalOverviewIllustration } from './GlobalOverviewIllustration'
import styles from './GlobalOverviewPanel.module.css'

/** Prominent explanatory panel: what the Super Admin control plane is for. */
export function GlobalOverviewPanel() {
  return (
    <section className={styles.panel} aria-labelledby="overview-title">
      <div className={styles.copy}>
        <span className={styles.accentBar} aria-hidden="true" />
        <h2 id="overview-title" className={styles.title}>
          Supervisão global em um só lugar
        </h2>
        <p className={styles.text}>
          Este dashboard centraliza a visão estratégica e operacional de todas as whitelabels, permitindo o
          acompanhamento unificado de métricas, operações, conformidade e crescimento.
        </p>
      </div>

      <div className={styles.art} aria-hidden="true">
        <GlobalOverviewIllustration className={styles.artSvg} />
      </div>

      <ul className={styles.statements}>
        <li>Visão unificada</li>
        <li>Operação centralizada</li>
        <li>Mais controle</li>
        <li>Crescimento sustentável</li>
      </ul>
    </section>
  )
}
