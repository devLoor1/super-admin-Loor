import { canEditShowcase, type ShowcaseActor } from '../showcaseAccess'
import { isShowcaseFamilyHash } from '../showcaseMapping'
import { hasUncertainUpload } from '../showcaseMedia'
import { discardDraft, getShowcaseState, hasPendingDraft } from '../showcaseStore'
import type { ShowcaseTab } from '../showcaseValidation'
import type { LeavePrompt } from './useShowcaseLeaveGuard'

export const SHOWCASE_TABS: { value: ShowcaseTab; label: string }[] = [
  { value: 'banner', label: 'Banner principal' },
  { value: 'cards', label: 'Conteúdo da vitrine' },
]

export function parseShowcaseTab(value: string | null | undefined): ShowcaseTab {
  return value === 'banner' ? 'banner' : 'cards'
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
  if (isShowcaseFamilyHash(hash) || !hasPendingDraft() || !canEditShowcase(actor.roles)) return null
  if (state.phase === 'uncertain' || state.phase === 'saving' || state.phase === 'reconciling' || hasUncertainUpload()) return pendingLeavePrompt()
  return {
    title: 'Descartar alterações não salvas?',
    description: 'Ao sair da Vitrine de White Labels, o rascunho desta aba será descartado. A última versão salva no servidor continua disponível.',
    confirmLabel: 'Descartar e sair',
    onConfirm: () => discardDraft(actor),
  }
}


export function pendingLeavePrompt(localDirty = false): LeavePrompt {
  return {
    title: 'Sair com uma operação pendente?',
    description: `${localDirty ? 'Campos deste card ainda não aplicados serão perdidos. ' : ''}O rascunho da vitrine e a conferência pendente permanecem nesta sessão. Sair desta tela não cancela um envio já iniciado. Confira a versão salva antes de um novo envio.`,
    confirmLabel: 'Sair e manter conferência pendente',
    onConfirm: () => true,
  }
}

/** Session cleanup occurs only when the confirmed logout actually proceeds. */
export function logoutPrompt(actor: ShowcaseActor, localDirty = false): LeavePrompt | null {
  if (!canEditShowcase(actor.roles) || (!hasPendingDraft() && !localDirty)) return null
  return {
    title: 'Sair com alterações não salvas?',
    description: 'Ao sair da conta, o rascunho desta sessão e os campos ainda não aplicados serão removidos. A configuração já salva no servidor permanece. Um envio iniciado pode ter sido aplicado; confira a versão ao entrar novamente.',
    confirmLabel: 'Descartar alterações locais e sair',
    onConfirm: () => true,
  }
}


export const LOGIN_HASH = '#/login'

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
