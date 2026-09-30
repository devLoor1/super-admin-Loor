import { PlatformIllustration } from './PlatformIllustration'
import styles from './LoginVisualPanel.module.css'

/**
 * Dark institutional panel. Communicates centralized control over multiple
 * white-label products without depending on any single brand identity.
 * Everything here is static copy or decoration — no data.
 */
export function LoginVisualPanel() {
  return (
    <aside className={styles.panel} aria-label="Super Admin">
      <PanelBackdrop />

      <div className={styles.header}>
        <span className={styles.accentBar} aria-hidden="true" />
        {/* Written in title case and uppercased via CSS so screen readers don't spell it out. */}
        <p className={styles.title}>Super Admin</p>
        <p className={styles.subtitle}>
          Administração centralizada de
          <br />
          white labels e operações
        </p>
      </div>

      <div className={styles.illustration} aria-hidden="true">
        <PlatformIllustration className={styles.illustrationArt} />
      </div>

      <div className={styles.footer}>
        <span className={styles.footerDash} aria-hidden="true" />
        <ul className={styles.pillars}>
          <li>Mais controle</li>
          <li>Mais possibilidades</li>
          <li>Mais crescimento</li>
        </ul>
      </div>
    </aside>
  )
}

/**
 * Large translucent spheres clipped by the panel's right edge, a faint diagonal
 * light line and a dot grid (the dot grid lives in CSS). The SVG uses the
 * reference image's panel coordinates (787 × 941) and "slice" anchored to the
 * right, so the spheres keep hugging the right edge at any panel size.
 */
function PanelBackdrop() {
  return (
    <svg
      className={styles.backdrop}
      viewBox="0 0 787 941"
      preserveAspectRatio="xMaxYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="bd-sphere-fill" cx="0.3" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#8f86ff" stopOpacity="0.1" />
          <stop offset="0.7" stopColor="#5b53b8" stopOpacity="0.04" />
          <stop offset="1" stopColor="#8f86ff" stopOpacity="0.12" />
        </radialGradient>
        <linearGradient id="bd-sphere-rim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#b1a9ff" stopOpacity="0.42" />
          <stop offset="0.45" stopColor="#8f86ff" stopOpacity="0.14" />
          <stop offset="1" stopColor="#8f86ff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <line x1="0" y1="652" x2="787" y2="915" stroke="#ffffff" strokeOpacity="0.045" />
      <line x1="520" y1="545" x2="787" y2="392" stroke="#ffffff" strokeOpacity="0.03" />

      <circle cx="800" cy="18" r="208" fill="url(#bd-sphere-fill)" stroke="url(#bd-sphere-rim)" />
      <circle cx="862" cy="268" r="246" fill="url(#bd-sphere-fill)" stroke="url(#bd-sphere-rim)" />
      <circle cx="880" cy="818" r="250" fill="url(#bd-sphere-fill)" stroke="url(#bd-sphere-rim)" />
      <circle cx="800" cy="1268" r="520" fill="url(#bd-sphere-fill)" stroke="url(#bd-sphere-rim)" />
    </svg>
  )
}
