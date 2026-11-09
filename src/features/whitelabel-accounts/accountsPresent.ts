import { ApiError } from '../../lib/api'
import type { ApiErrorView } from '../../lib/apiErrors'
import { profileMeta } from '../operation/entrepreneurs/entrepreneurApi'
import { validationMeta } from '../operation/investors/investorApi'
import { initials } from './accountModel'
import { rawTokenMeta, type AccountDetail, type AccountKind, type AccountRow } from './accountsApi'

/*
 * Accounts presentation helpers (no data, no requests). Registration states
 * keep their own vocabulary per kind and are never labelled KYC or Company.
 */

export const TYPE_TABS_ID = 'acc-type'

/** Heading of the registration / invitation state per kind — never "KYC" or "Empresa". */
export const BUSINESS_HEADING: Record<AccountKind, string> = {
  investor: 'Validação do cadastro',
  entrepreneur: 'Situação do cadastro',
  admin: 'Situação do acesso',
}

/** Registration / invitation state of an account (tokens outside the known vocabulary are shown as sent). */
export function businessView(row: AccountRow | AccountDetail) {
  if (row.kind === 'investor') return validationMeta(row.record.businessState)
  if (row.kind === 'entrepreneur') return profileMeta(row.record.businessState)
  return rawTokenMeta(row.record.businessState)
}

/** Avatar monogram: name initials, else the e-mail's first letter, else "?". Decorative. */
export function accountInitials(record: { fullName: string | null; email: string | null }) {
  if (record.fullName) return initials(record.fullName)
  const first = record.email?.trim().charAt(0).toLocaleUpperCase('pt-BR')
  return first && /\p{L}|\p{N}/u.test(first) ? first : '?'
}

/** Scope / identity guard failures get their own wording (nothing of another account or tenant is shown). */
export function scopedErrorView(error: unknown, view: ApiErrorView, subject: 'list' | 'detail', plural = 'contas'): ApiErrorView {
  if (!(error instanceof ApiError) || error.code !== 'SCOPE_MISMATCH') return view
  return subject === 'list'
    ? {
        ...view,
        title: 'Escopo do Whitelabel não confirmado',
        description: `O Control Plane retornou ${plural} de outro Whitelabel; nada foi exibido para não misturar Whitelabels.`,
      }
    : { ...view, title: 'Conta não confirmada', description: 'O Control Plane retornou uma conta diferente da solicitada; nada foi exibido.' }
}
