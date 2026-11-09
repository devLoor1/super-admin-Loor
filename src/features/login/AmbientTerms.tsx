import styles from './LoginVisualPanel.module.css'

const TERMS = [
  'LOOR',
  'SUPER ADMIN',
  'STARTUPS',
  'WHITE LABELS',
  'CONTROL',
  'PLATFORM',
  'CONNECTION',
]

// A quieter, multi-word adaptation of the supplied OriginKit Appear Text grid.
// This is decorative texture only; the existing SVG remains the focal point.
export function AmbientTerms() {
  return (
    <div className={styles.ambientTerms} aria-hidden="true">
      {TERMS.map((term, index) => (
        <span key={term} className={styles.ambientTerm} data-term={index}>
          {term}
        </span>
      ))}
    </div>
  )
}
