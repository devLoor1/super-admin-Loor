import { Switch } from '../../components/ui/Switch'
import fin from '../finance-gateways/sections/FinanceSections.module.css'
import { MENU_TREE, menuEntry, type MenuEntry, type MenuId } from './menuRegistry'
import { effectiveState, type VisibilityMap } from './visibilityModel'
import styles from './MenuVisibility.module.css'

/**
 * Hierarchical preference controls, in real sidebar order. `base` is the
 * persisted configuration read from the Control Plane; `draft` the local
 * edit. Every switch edits only its own draft preference: a child stays
 * editable while its parent is hidden, and the effective result ("Oculto pelo
 * item pai") is shown next to it. The hierarchy is the frontend navigation's:
 * the Control Plane stores the 23 IDs as a flat map.
 */
export function VisibilityControls({
  base,
  draft,
  onChange,
}: {
  base: VisibilityMap
  draft: VisibilityMap
  onChange: (id: MenuId, visible: boolean) => void
}) {
  return (
    <div className={styles.main} data-visibility-controls>
      <div className={styles.areaHead}>
        <h2 className={styles.areaTitle} id="mv-primary-title">
          Navegação principal
        </h2>
        <p className={styles.areaText}>Mesmos módulos, nomes, ordem e hierarquia do menu lateral atual.</p>
      </div>
      {MENU_TREE.primary.map((entry) => (
        <section key={entry.id} className={`${fin.card} ${styles.group}`} aria-label={`Grupo ${entry.label}`} data-group={entry.id}>
          <ul className={styles.rows}>
            <Row entry={entry} base={base} draft={draft} onChange={onChange} />
          </ul>
          {entry.children.length ? (
            <ul className={styles.children} aria-label={`Telas de ${entry.label}`}>
              {entry.children.map((child) => (
                <Row key={child.id} entry={child} base={base} draft={draft} onChange={onChange} />
              ))}
            </ul>
          ) : null}
          {entry.id === 'operacao' ? (
            <p className={styles.groupNote} data-companies-note>
              Empresas é uma visão contextual (protótipo) dentro de Empreendedores e não tem ID de visibilidade aprovado: não aparece nesta
              lista e não recebe comportamento próprio aqui.
            </p>
          ) : null}
        </section>
      ))}

      <div className={styles.areaHead}>
        <h2 className={styles.areaTitle} id="mv-utility-title">
          Utilitários
        </h2>
        <p className={styles.areaText}>
          Na navegação atual, Configurações e Ajuda ficam em Utilitários, sem item pai, e o Control Plane guarda cada ID de forma independente.
          Por isso, ocultar Sistema não afeta esses itens na prévia — uma relação Sistema › Configurações / Ajuda não foi definida.
        </p>
      </div>
      <section className={`${fin.card} ${styles.group}`} aria-labelledby="mv-utility-title" data-group="utility">
        <ul className={styles.rows}>
          {MENU_TREE.utility.map((entry) => (
            <Row key={entry.id} entry={entry} base={base} draft={draft} onChange={onChange} />
          ))}
        </ul>
      </section>
    </div>
  )
}

function Row({
  entry,
  base,
  draft,
  onChange,
}: {
  entry: MenuEntry
  base: VisibilityMap
  draft: VisibilityMap
  onChange: (id: MenuId, visible: boolean) => void
}) {
  const Icon = entry.icon
  const effective = effectiveState(draft, entry.id)
  const changed = base[entry.id] !== draft[entry.id]
  const parent = entry.parentId ? menuEntry(entry.parentId) : null
  const stateId = `mv-state-${entry.id}`
  const name = parent ? `${entry.label} (${parent.label})` : entry.label
  const inheritedHidden = entry.children.filter((child) => draft[child.id]).length

  const stateLabel =
    effective.state === 'visible' ? 'Visível' : effective.state === 'hidden' ? 'Oculto' : 'Oculto pelo item pai'
  const stateDescription =
    effective.state === 'hidden-by-parent'
      ? `Preferência: visível. Resultado: oculto porque ${menuEntry(effective.hiddenBy).label} está oculto.`
      : `Preferência: ${draft[entry.id] ? 'visível' : 'oculto'}.`

  return (
    <li
      className={styles.row}
      data-menu-id={entry.id}
      data-child={parent ? '' : undefined}
      data-effective={effective.state}
      data-changed={changed || undefined}
    >
      <span className={styles.rowIcon} aria-hidden="true">
        <Icon size={parent ? 15 : 17} strokeWidth={1.7} />
      </span>
      <span className={styles.rowText}>
        <span className={styles.rowLabel}>
          {entry.label}
          {changed ? <span className={styles.changed}>Alterado</span> : null}
        </span>
        <span className={styles.rowId}>{entry.id}</span>
        {changed ? (
          <span className={styles.rowNote} data-persisted-value={base[entry.id] ? 'visible' : 'hidden'}>
            Configuração persistida: {base[entry.id] ? 'visível' : 'oculto'}.
          </span>
        ) : null}
        {effective.state === 'hidden-by-parent' ? (
          <span className={styles.rowNote}>Preferência própria mantida: visível.</span>
        ) : null}
        {!draft[entry.id] && entry.children.length ? (
          <span className={styles.rowNote}>
            {inheritedHidden
              ? `${inheritedHidden === 1 ? '1 tela fica oculta' : `${inheritedHidden} telas ficam ocultas`} enquanto ${entry.label} estiver oculto; as preferências das telas são mantidas.`
              : 'As telas abaixo também estão ocultas pela própria preferência.'}
          </span>
        ) : null}
        {entry.id === 'sistema' ? <span className={styles.rowNote}>Sem telas próprias na navegação atual.</span> : null}
        {entry.id === 'configuracoes' && !draft.configuracoes ? (
          <span className={styles.rowNote} data-tone="warning">
            Esta tela fica em Configurações: ocultá-lo também ocultaria este acesso no menu. Regra e forma de recuperação não definidas por
            Produto e Backend.
          </span>
        ) : null}
        {entry.id === 'dashboard' && !draft.dashboard ? (
          <span className={styles.rowNote} data-tone="warning">
            Dashboard é o destino inicial após o login; o comportamento com o módulo oculto não foi definido por Produto e Backend.
          </span>
        ) : null}
        <span id={stateId} className="visually-hidden">
          {stateDescription}
          {changed ? ` Alterado no rascunho; configuração persistida: ${base[entry.id] ? 'visível' : 'oculto'}.` : ''}
        </span>
      </span>
      <span className={styles.rowControl}>
        <span className={styles.state} data-state={effective.state} aria-hidden="true">
          {stateLabel}
        </span>
        <Switch
          checked={draft[entry.id]}
          onCheckedChange={(visible) => onChange(entry.id, visible)}
          aria-label={`Mostrar ${name} na navegação`}
          aria-describedby={stateId}
          data-visibility-switch={entry.id}
        />
      </span>
    </li>
  )
}
