import { Landmark, Pencil, Plus, Power, PowerOff, Trash2 } from 'lucide-react'
import { EmptyState } from '../../../components/ui/EmptyState'
import { PrimaryButton } from '../../../components/ui/PrimaryButton'
import { StatusPill } from '../../../components/ui/StatusPill'
import {
  ACCOUNT_TYPE_LABEL,
  BANK_STATUS_META,
  PIX_TYPE_LABEL,
  bankName,
  formatTime,
  maskedAccount,
  type BankAccount,
  type FinanceActivity,
} from '../financeModel'
import styles from './FinanceSections.module.css'

type Props = {
  whitelabelName: string
  accounts: BankAccount[]
  activity: FinanceActivity[]
  onCreate: () => void
  onEdit: (account: BankAccount) => void
  onDeactivate: (account: BankAccount) => void
  onReactivate: (account: BankAccount) => void
  onRemove: (account: BankAccount) => void
}

/**
 * Contas bancárias do Whitelabel — masked, illustrative accounts. Ownership at
 * Whitelabel level is a prototype premise (see implementation note).
 */
export function BankAccounts({ whitelabelName, accounts, activity, onCreate, onEdit, onDeactivate, onReactivate, onRemove }: Props) {
  const recent = activity.filter((entry) => entry.kind.startsWith('bank_')).slice(0, 3)
  return (
    <section className={styles.card} aria-labelledby="fin-banks-title" data-detail-stage>
      <header className={styles.cardHeader}>
        <div className={styles.cardHeading}>
          <h2 id="fin-banks-title" className={styles.cardTitle}>
            Contas bancárias do Whitelabel
          </h2>
          <p className={styles.cardSubtitle}>Contas usadas para recebimentos e pagamentos de {whitelabelName}. Dados mascarados.</p>
        </div>
        <PrimaryButton className={styles.headerButton} onClick={onCreate} data-create-bank>
          <Plus size={17} strokeWidth={2} aria-hidden="true" />
          Cadastrar conta bancária
        </PrimaryButton>
      </header>

      {accounts.length ? (
        <div className={styles.tableArea}>
          <table className={`${styles.table} ${styles.bankTable}`}>
            <caption className="visually-hidden">Contas bancárias de {whitelabelName}</caption>
            <thead>
              <tr>
                <th scope="col">Banco</th>
                <th scope="col" className={styles.colHolder}>
                  Titular
                </th>
                <th scope="col" className={styles.colType}>
                  Tipo
                </th>
                <th scope="col" className={styles.colPix}>
                  Pix
                </th>
                <th scope="col" className={styles.colBankStatus}>
                  Status
                </th>
                <th scope="col" className={styles.colBankActions}>
                  <span className="visually-hidden">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => {
                const status = BANK_STATUS_META[account.status]
                const label = `${bankName(account.bankCode)} ${maskedAccount(account)}`
                return (
                  <tr key={account.id} className={styles.row} data-bank-row={account.id}>
                    <td>
                      <span className={styles.bankCell}>
                        <span className={styles.bankIcon} aria-hidden="true">
                          <Landmark size={16} strokeWidth={1.7} />
                        </span>
                        <span className={styles.rowName}>
                          {bankName(account.bankCode)}
                          <span className={styles.rowMeta}>
                            Ag. {account.agency} · <span className={styles.nowrap}>{maskedAccount(account)}</span>
                          </span>
                          <span className={styles.bankInline}>
                            <span>
                              {account.holder} · {ACCOUNT_TYPE_LABEL[account.type]}
                            </span>
                            <span className={styles.bankInlineStatus}>
                              {account.pixType ? `Pix: ${PIX_TYPE_LABEL[account.pixType]} ${account.pixHint}` : 'Sem chave Pix'}
                            </span>
                            <span className={styles.bankInlineStatus}>
                              <StatusPill tone={status.tone} label={status.label} />
                            </span>
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className={styles.colHolder}>{account.holder}</td>
                    <td className={styles.colType}>
                      <span className={styles.chip}>{ACCOUNT_TYPE_LABEL[account.type]}</span>
                    </td>
                    <td className={styles.colPix}>
                      {account.pixType ? (
                        <span className={styles.pix}>
                          {PIX_TYPE_LABEL[account.pixType]}
                          <span className={styles.rowMeta}>{account.pixHint}</span>
                        </span>
                      ) : (
                        <span className={styles.muted}>Sem chave</span>
                      )}
                    </td>
                    <td className={styles.colBankStatus}>
                      <StatusPill tone={status.tone} label={status.label} />
                    </td>
                    <td className={styles.colBankActions}>
                      <span className={styles.rowActions}>
                        <button type="button" className={styles.iconButton} onClick={() => onEdit(account)} aria-label={`Editar ${label}`}>
                          <Pencil size={15} strokeWidth={1.8} aria-hidden="true" />
                        </button>
                        {account.status === 'active' ? (
                          <button
                            type="button"
                            className={styles.iconButton}
                            onClick={() => onDeactivate(account)}
                            aria-label={`Desativar ${label}`}
                            data-bank-toggle
                          >
                            <PowerOff size={15} strokeWidth={1.8} aria-hidden="true" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={styles.iconButton}
                            onClick={() => onReactivate(account)}
                            aria-label={`Reativar ${label}`}
                            data-bank-toggle
                          >
                            <Power size={15} strokeWidth={1.8} aria-hidden="true" />
                          </button>
                        )}
                        <button
                          type="button"
                          className={`${styles.iconButton} ${styles.iconDanger}`}
                          onClick={() => onRemove(account)}
                          aria-label={`Remover ${label}`}
                        >
                          <Trash2 size={15} strokeWidth={1.8} aria-hidden="true" />
                        </button>
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={styles.emptyBox}>
          <EmptyState
            icon={Landmark}
            title="Nenhuma conta bancária"
            description={`${whitelabelName} ainda não tem contas bancárias neste protótipo.`}
          />
        </div>
      )}

      {recent.length ? (
        <div className={styles.recent}>
          <p className={styles.recentTitle}>Atividade local recente (sessão)</p>
          <ul className={styles.recentList}>
            {recent.map((entry) => (
              <li key={entry.id}>
                <span>{entry.title}</span>
                <time dateTime={entry.at}>{formatTime(entry.at)}</time>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
