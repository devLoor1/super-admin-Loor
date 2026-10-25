import { SettingsSection } from './SettingsSection'
import type { PlatformPresentationCapability, PresentationReading } from './platformPresentationRead'
import styles from './SettingsRead.module.css'

function Reading({ reading }: { reading: PresentationReading }) {
  if (reading.state === 'value') return <>{typeof reading.value === 'boolean' ? reading.value ? 'Sim' : 'Não' : reading.value}</>
  return <span className={styles.missing}>{reading.state === 'missing' ? 'Não informado pela API' : reading.state === 'null' ? 'Sem valor (null)' : 'Formato incompatível com o contrato qualificado'}</span>
}

export function PlatformPresentationRead({ capabilities }: { capabilities: PlatformPresentationCapability[] }) {
  return <>
    <p className={styles.notice}>Apresentação pública configurada para este Whitelabel. Esta leitura não substitui valores ausentes por padrões locais e não comprova a aplicação imediata nos consumidores.</p>
    {capabilities.map(capability => <SettingsSection key={capability.id} id={`platform-${capability.id}`} title={capability.title} subtitle={`Fonte: ${capability.source}. Somente os campos qualificados são apresentados.`} status="readonly">
      {capability.state !== 'value' ? <p className={styles.missing}>{capability.state === 'missing' ? 'Esta configuração não foi informada pela API.' : capability.state === 'null' ? 'Nenhuma configuração retornada (null).' : 'Configuração incompatível com a versão qualificada. Outras seções permanecem disponíveis.'}</p> : <dl className={styles.list}>{capability.fields.map(field => <div className={styles.row} key={field.key}><dt>{field.label}</dt><dd><Reading reading={field.reading} /></dd></div>)}</dl>}
    </SettingsSection>)}
    <p className={styles.missing}>Cores e disposição das páginas de entrada não representam branding global. A identidade do e-mail é específica de mensagens transacionais; a referência do logo não é carregada. Aliases e cores fora do formato canônico não são convertidos nesta leitura. Ativos de imagem, favicon e publicação de configurações compostas continuam fora desta leitura.</p>
  </>
}
