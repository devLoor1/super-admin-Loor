import { canEditShowcase, type ShowcaseActor } from '../showcaseAccess'
import { isShowcaseFamilyHash } from '../showcaseMapping'
import { discardDraft, getShowcaseState, isDraftDirty } from '../showcaseStore'
import type { ShowcaseTab } from '../showcaseValidation'
import type { LeavePrompt } from './useShowcaseLeaveGuard'

export const SHOWCASE_TABS: { value: ShowcaseTab; label: string }[] = [
  { value: 'banner', label: 'Banner principal' },
  { value: 'introducao', label: 'Conteúdo introdutório' },
  { value: 'cards', label: 'Cards de White Labels' },
]

export function parseShowcaseTab(value: string | null | undefined): ShowcaseTab {
  return value === 'banner' || value === 'introducao' || value === 'cards' ? value : 'cards'
}

/**
 * Leaving the Vitrine screens with a dirty draft asks first; moving between them
 * (editor, card editor, saved or draft projection) keeps the tab draft and asks
 * nothing. The question depends on the draft, not on the screen showing it.
 * A profile that cannot edit cannot discard either: its navigation keeps the tab
 * memory as it is, so no confirmation is needed (reload/close stay protected).
 */
export function leavePrompt(hash: string, actor: ShowcaseActor): LeavePrompt | null {
  const state = getShowcaseState()
  if (isShowcaseFamilyHash(hash) || !isDraftDirty(state) || !canEditShowcase(actor.roles)) return null
  return {
    title: 'Descartar alterações não salvas?',
    description: 'Ao sair da Vitrine de White Labels, o rascunho desta aba será descartado. A última versão salva na simulação continua disponível.',
    confirmLabel: 'Descartar e sair',
    onConfirm: () => discardDraft(actor),
  }
}


export const LOGIN_HASH = '#/login'

/**
 * Voluntary logout from the card editor. The tab draft stays in memory after
 * logout (documented policy), so only the card fields not yet applied would be
 * lost: the question exists only for them and says so. No autosave.
 */
export function cardLogoutPrompt(localDirty: boolean, discardLocal: () => void): LeavePrompt | null {
  if (!localDirty) return null
  return {
    title: 'Sair com alterações não aplicadas neste card?',
    description: 'Os campos editados neste card ainda não foram aplicados ao rascunho e serão descartados ao sair. Alterações já aplicadas ao rascunho da vitrine continuam na memória desta aba.',
    confirmLabel: 'Descartar alterações do card e sair',
    onConfirm: discardLocal,
  }
}

export type HeldLeave = { hash: string; resume: () => void; prompt: LeavePrompt }

/** Logout guard body (used by useShowcaseLeaveGuard and the offline checks): hold the logout while a prompt applies. */
export function holdLogoutWhenNeeded(assess: () => LeavePrompt | null, hold: (pending: HeldLeave) => void) {
  return (proceed: () => void) => {
    const prompt = assess()
    if (!prompt) return true
    hold({ hash: LOGIN_HASH, resume: proceed, prompt })
    return false
  }
}
