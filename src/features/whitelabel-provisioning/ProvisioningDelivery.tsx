import type { ReactNode } from 'react'
import { Copy } from 'lucide-react'
import { useNotice } from '../../components/shell/notice'
import { formatWhitelabelDate } from '../whitelabels/whitelabelApi'
import type { ProvisioningDelivery as Delivery } from './provisioningApi'
import styles from './Provisioning.module.css'

/** Delivery summary of a COMPLETED run. Never shows passwords or secrets (the API parser rejects them). */
export function DeliveryPanel({ delivery }: { delivery: Delivery }) {
  const notify = useNotice()

  function copy(value: string, label: string) {
    if (!navigator.clipboard) {
      notify(`Não foi possível copiar (${label}) neste navegador.`)
      return
    }
    navigator.clipboard.writeText(value).then(
      () => notify(`Copiado (${label}): ${value}`),
      () => notify(`Não foi possível copiar (${label}). Selecione o texto e copie manualmente.`),
    )
  }

  const enabled = delivery.enabledEnvironments ?? (
    [
      delivery.urls.investor !== undefined ? 'INVESTOR' : null,
      delivery.urls.entrepreneur !== undefined ? 'ENTREPRENEUR' : null,
      delivery.urls.admin !== undefined ? 'ADMIN' : null,
    ].filter(Boolean) as Array<'INVESTOR' | 'ENTREPRENEUR' | 'ADMIN'>
  )
  const has = (cap: 'INVESTOR' | 'ENTREPRENEUR' | 'ADMIN') => enabled.includes(cap)
  const confirmed =
    (!has('INVESTOR') || Boolean(delivery.urls.investor)) &&
    (!has('ENTREPRENEUR') || Boolean(delivery.urls.entrepreneur)) &&
    (!has('ADMIN') || Boolean(delivery.urls.admin))

  const rows: { label: string; value: string | null; copyable?: boolean; link?: boolean }[] = [
    { label: 'Nome', value: delivery.name },
    { label: 'Slug', value: delivery.slug, copyable: true },
    { label: 'Ambientes contratados', value: enabled.length ? enabled.join(', ') : null },
    { label: 'URL base (Core)', value: delivery.baseUrl, copyable: true, link: true },
    { label: 'URL principal', value: delivery.urls.primary, copyable: true, link: true },
    ...(has('INVESTOR')
      ? [{ label: 'Investidor (confirmada)', value: delivery.urls.investor ?? null, copyable: true, link: true }]
      : [{ label: 'Investidor', value: 'NÃO CONTRATADO' }]),
    ...(has('ENTREPRENEUR')
      ? [{ label: 'Empreendedor (confirmada)', value: delivery.urls.entrepreneur ?? null, copyable: true, link: true }]
      : [{ label: 'Empreendedor', value: 'NÃO CONTRATADO' }]),
    ...(has('ADMIN')
      ? [{ label: 'Admin (confirmada)', value: delivery.urls.admin ?? null, copyable: true, link: true }]
      : [{ label: 'Admin', value: 'NÃO CONTRATADO' }]),
    ...(!confirmed
      ? [
          ...(has('INVESTOR') && delivery.suggestedUrls.investor
            ? [{ label: 'Investidor (sugestão)', value: delivery.suggestedUrls.investor, copyable: true }]
            : []),
          ...(has('ENTREPRENEUR') && delivery.suggestedUrls.entrepreneur
            ? [{ label: 'Empreendedor (sugestão)', value: delivery.suggestedUrls.entrepreneur, copyable: true }]
            : []),
          ...(has('ADMIN') && delivery.suggestedUrls.admin
            ? [{ label: 'Admin (sugestão)', value: delivery.suggestedUrls.admin, copyable: true }]
            : []),
        ]
      : []),
    { label: 'ID do Whitelabel', value: delivery.whitelabelId === null ? null : String(delivery.whitelabelId), copyable: true },
    { label: 'Administrador', value: delivery.admin ? [delivery.admin.name, delivery.admin.email].filter(Boolean).join(' · ') : null },
    { label: 'E-mail do administrador', value: delivery.admin?.email ?? null, copyable: true },
    { label: 'Gerado em', value: formatWhitelabelDate(delivery.generatedAt, true) },
    { label: 'Correlação', value: delivery.correlationId, copyable: true },
  ]

  return (
    <section className={`${styles.panel} ${styles.delivery}`} aria-labelledby="prov-delivery-title">
      <h2 id="prov-delivery-title" className={styles.title}>Entrega da implantação</h2>
      <p className={styles.subtitle}>
        {confirmed
          ? 'URLs confirmadas nos gates FE_DEPLOY_CHECK / DNS_CHECK. Nenhuma senha é exibida aqui.'
          : 'Gates de frontend/DNS foram pulados — só a convenção de nomes aparece abaixo. Não compartilhe sugestões como se fossem live.'}
      </p>
      <dl className={styles.deliveryList}>
        {rows.map((row) => (
          <div key={row.label} className={styles.deliveryRow}>
            <dt>{row.label}</dt>
            <dd>
              {row.value ? (
                <>
                  <ValueText value={row.value} link={row.link === true} />
                  {row.copyable ? (
                    <button type="button" className={styles.copyButton} onClick={() => copy(row.value!, row.label)} aria-label={`Copiar ${row.label.toLocaleLowerCase('pt-BR')}`}>
                      <Copy size={15} strokeWidth={1.8} aria-hidden="true" />
                    </button>
                  ) : null}
                </>
              ) : (
                <>
                  <span aria-hidden="true">—</span>
                  <span className="visually-hidden">sem dados</span>
                </>
              )}
            </dd>
          </div>
        ))}
      </dl>
      {delivery.suggestedUrls.note ? <p className={styles.hint} style={{ marginTop: 10 }}>{delivery.suggestedUrls.note}</p> : null}
      {delivery.credentialsNote ? (
        <p className={styles.warning} role="note" style={{ marginTop: 14 }}>
          <span>{delivery.credentialsNote}</span>
        </p>
      ) : null}
    </section>
  )
}

function ValueText({ value, link }: { value: string; link: boolean }): ReactNode {
  if (link && /^https:\/\//i.test(value)) {
    return (
      <a className={styles.link} href={value} target="_blank" rel="noopener noreferrer">
        {value}
      </a>
    )
  }
  return <span>{value}</span>
}
