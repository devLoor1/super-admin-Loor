import { Info, Plus, Trash2 } from 'lucide-react'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import type { ShowcaseIntroduction } from '../showcaseModel'
import { removeIntroduction, restoreIntroduction, updateDraft } from '../showcaseStore'
import { fieldIds, type ShowcaseIssue } from '../showcaseValidation'
import { useShowcaseActor } from './editorHooks'
import { MarkdownField } from './MarkdownField'
import styles from './ShowcaseEditor.module.css'

/** Board 04: optional section between the banner and the cards. */
export function IntroTab({ introduction, issues, showErrors }: { introduction: ShowcaseIntroduction | null; issues: readonly ShowcaseIssue[]; showErrors: boolean }) {
  const { actor, canEdit } = useShowcaseActor()
  const set = (patch: Partial<ShowcaseIntroduction>) => updateDraft(actor, draft => draft.introduction ? { ...draft, introduction: { ...draft.introduction, ...patch } } : draft)
  const invalid = (fieldId: string) => showErrors && issues.some(issue => issue.fieldId === fieldId)

  return (
    <section className={styles.panel} aria-labelledby="vitrine-intro-titulo-painel">
      <header className={styles.panelHead}>
        <div className={styles.titleWithChip}>
          <h2 className={styles.panelTitle} id="vitrine-intro-titulo-painel">Conteúdo introdutório</h2>
          <span className={styles.chip}>Opcional</span>
        </div>
        {canEdit && introduction && <OutlineButton onClick={() => removeIntroduction(actor)}><Trash2 size={15} aria-hidden="true" />Remover seção</OutlineButton>}
      </header>
      {introduction ? (
        <div className={styles.form}>
          <label className={styles.field}>Título
            <input id={fieldIds.introTitle} value={introduction.title} readOnly={!canEdit} aria-invalid={invalid(fieldIds.introTitle) || undefined} onChange={event => set({ title: event.target.value })} />
            <small className={styles.hint}>Obrigatório enquanto a seção estiver ativa. Texto simples.</small>
          </label>
          <label className={styles.field}>Subtítulo (opcional)
            <input value={introduction.subtitle} readOnly={!canEdit} onChange={event => set({ subtitle: event.target.value })} />
          </label>
          <div className={styles.field}>
            <label htmlFor={fieldIds.introBody}>Texto em Markdown</label>
            <MarkdownField id={fieldIds.introBody} value={introduction.bodyMarkdown} readOnly={!canEdit} invalid={invalid(fieldIds.introBody)} onChange={bodyMarkdown => set({ bodyMarkdown })} />
          </div>
        </div>
      ) : (
        <div className={styles.emptyState}>
          <h3>Seção removida</h3>
          <p>O banner é seguido diretamente pelos cards. O título dos cards permanece.</p>
          {canEdit && <OutlineButton onClick={() => restoreIntroduction(actor)}><Plus size={16} aria-hidden="true" />Adicionar seção introdutória</OutlineButton>}
        </div>
      )}
      <p className={styles.panelFoot}><Info size={16} aria-hidden="true" />Remover a seção não altera o banner nem os cards.</p>
    </section>
  )
}
