import { SettingsSection } from './SettingsSection'
import type { AppContentReading, AppTextReading } from './appContentRead'
import styles from './SettingsRead.module.css'

function TextReading({ reading }: { reading: AppTextReading }) {
  if (reading.state === 'value') return <>{reading.value}</>
  return <span className={styles.missing}>{reading.state === 'missing' ? 'Não informado pela API' : reading.state === 'null' ? 'Sem valor (null)' : 'Formato incompatível com o contrato App V1'}</span>
}
export function PlatformAppRead({ entry, authenticated }: { entry: AppContentReading; authenticated: AppContentReading }) {
  return <>
    <p className={styles.notice}>Textos públicos do aplicativo, no contrato V1 em português. Valores ausentes não são preenchidos com exemplos nem com os padrões locais do consumidor. Os aplicativos podem usar seus próprios fallbacks e caches.</p>
    {([['entry', 'Acesso e cadastro', entry], ['authenticated', 'Área autenticada', authenticated]] as const).map(([id, title, data]) => <SettingsSection key={id} id={`app-${id}`} title={title} subtitle="Conteúdo retornado para este Whitelabel pelo Control Plane." status="readonly">
      {data.state !== 'value' ? <p className={styles.missing}>{data.state === 'incompatible' ? 'Configuração incompatível com o contrato App V1. Nenhum conteúdo inválido é apresentado como configuração válida.' : data.state === 'null' ? 'Nenhuma configuração retornada (null).' : 'Esta configuração não foi informada pela API.'}</p> : data.groups.map(group => <section key={group.id} aria-labelledby={`app-${id}-${group.id}`}>
        <h3 id={`app-${id}-${group.id}`}>{group.label}</h3><p className={styles.missing}>{group.description}</p>
        <dl className={styles.list}>{group.fields.map(field => <div className={styles.row} key={field.key}><dt>{field.label}</dt><dd><TextReading reading={field.reading} /></dd></div>)}</dl>
      </section>)}
    </SettingsSection>)}
    <p className={styles.missing}>Terminologia compartilhada é consultada em Plataforma. Logo, favicon, ícones de PWA e cores globais não fazem parte destes contratos textuais. Edição de objetos completos depende da preservação de campos desconhecidos; permanece indisponível nesta entrega.</p>
  </>
}
