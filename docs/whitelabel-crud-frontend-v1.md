# Whitelabel CRUD Frontend V1

Frontend-only unit, implemented by Cloud from `dev` `38a9a02` and preserved
for Codex review on `feature/whitelabel-crud-frontend-v1`. It prepares the UX for **creating, editing and
deactivating / removing** a Whitelabel while the Backend team validates the
mutation contracts.

> **NO LIVE MUTATIONS ARE ENABLED.**
>
> The frontend sends no `POST`, `PATCH`, `PUT` or `DELETE` for Whitelabels.
> Every flow stops at a review / confirmation step whose final button is
> `aria-disabled` and announced as pending. No record is created, changed
> or removed — not even locally.

**Read is unchanged and authoritative:** `GET /api/whitelabels` and
`GET /api/whitelabels/:id`, with:

- URL-backed page / search / status;
- the detail panel;
- reload and Back / Forward.

The dialogs receive the loaded record and never write to the list or detail
state.

## Evidence

| Class | What it is |
| --- | --- |
| **A. Contract evidence** | Cloud's read-only draft inspection, independently rechecked by Codex through GitHub file GETs at the pinned `backend-super-admin-Loor` `0177437`. It covers `whitelabel.controller.ts`, `whitelabel.service.ts`, `dto/create-whitelabel.dto.ts` and `dto/update-whitelabel.dto.ts`. This is **draft source evidence**, not a live mutation contract or proof of Core capability. **No mutation endpoint was called.** |
| **B. Local implemented UI** | Cloud's earlier standalone Chromium report is historical. Codex independently exercised the production build using **only the Codex built-in browser** against an external loopback-only synthetic read fixture. Whitelabel writes are rejected with 405 and logged; zero were attempted. The ordinary login UI used synthetic local-only credentials/token, never real credentials or tokens. This is **not reviewed-branch UI-to-live-Backend E2E**. |
| **C. Synthetic edge cases** | Long names, invalid input, keyboard-only use, narrow viewports, and the future error mapping (400 / 401 / 403 / 404 / 409 / 422 / 5xx / network / timeout / malformed) as unit checks. |

### Draft Backend source (0177437) — what it suggests, still pending validation

| Draft route | Body | Notes |
| --- | --- | --- |
| `POST /whitelabels` (`SUPER_ADMIN`) | `name` (string, 2–120), `slug` (`^[a-z0-9-]+$`, ≤ 80), `baseUrl?` (`IsUrl({ require_tld: false })`) | forwarded to Core `POST /internal/super-admin/v1/whitelabels`; audit `CREATE_WHITELABEL` (success / failed) |
| `PATCH /whitelabels/:id` | `name?` (2–120), `baseUrl?` | **no `slug`**; audit `UPDATE_WHITELABEL` |
| `PATCH /whitelabels/:id/activate`, `/deactivate` | none | Core `PATCH …/status { active }`; audit `ENABLE_WHITELABEL` / `DISABLE_WHITELABEL` |
| `DELETE /whitelabels/:id` | — | **does not exist** |

The service comment itself says "Create/update/status still go to Core when
endpoints exist; Product Q-WL-01–03 open". Whether the Core endpoints exist,
and their responses and error codes, is **unknown**.

## Where the actions live

| Place | Action | Behaviour |
| --- | --- | --- |
| List header | **Novo Whitelabel** (existing primary button) | opens the create dialog |
| Detail › Informações principais | **Editar** (existing button) | opens the edit dialog with the loaded values |
| Detail header ⋮ (menu button) | **Editar dados** · **Desativar ou remover…** | WAI-ARIA menu with arrows / Home / End / Escape / Tab, closes on an outside press |
| List row "…" | — | selects that Whitelabel and moves focus to its detail actions menu; **no destructive control in rows** |

The four Whitelabel KPI cards and the detail quick actions are unchanged.

## Create

**Fields:**

| Field | Class | UI rule | Source of the rule |
| --- | --- | --- | --- |
| Nome | **A** required **in this provisional review** | 2–120 characters after whitespace normalization (trim + collapse internal runs, on blur and before review) | draft DTO — **PENDING BACKEND CONTRACT CONFIRMATION** |
| Identificador (slug) | **A** required **in this provisional review** | lowercase letters without accents, digits and hyphens, ≤ 80; trimmed | draft DTO (`@Matches`, `@MaxLength`) — **PENDING BACKEND CONTRACT CONFIRMATION** |
| URL base | **B** optional **in this provisional review** | absolute `https://` / `http://` URL when given; trimmed | stricter presentation choice than the draft DTO's `IsUrl({ require_tld: false })` — **PENDING BACKEND CONTRACT CONFIRMATION** for requiredness, protocol rules and nullability |
| Status inicial, ID, domínio, datas | **C** Backend | not collected; "Definidos pelo Backend"; initial status not defined in the contract | — |

**Behaviour:**

- The form validates on submit. Errors are associated with each field
  (`aria-invalid`, `aria-describedby` = hint + error), focus moves to the first
  invalid field, and typing clears that field's error. Character counters show
  `n/120` and `n/80`.
- **Revisar criação** opens a review step showing:
  - the normalized values;
  - "Status inicial: definido pelo Backend (contrato pendente)";
  - the pending notice "Criação aguardando integração do Backend … Nada foi
    enviado ao Control Plane e nenhum dado foi salvo";
  - a collapsed "Corpo previsto da requisição (não enviado)" with the
    draft-DTO body.
- **Criar Whitelabel (pendente)** is `aria-disabled`, focusable and described by the
  pending notice. Activating it does nothing.
- **Voltar e editar** keeps the values.
- **Unsaved changes:** Cancel, ×, Escape or a backdrop press with typed data
  asks "Descartar os dados digitados? Nada foi salvo." ("Continuar editando"
  is focused). While data is typed, reload or tab close triggers the browser's
  `beforeunload` confirmation. A pristine form closes immediately.
- No record is appended to the list. The list, detail and URL are unchanged.

## Edit

- Opened from a **real, loaded** Whitelabel (`GET /whitelabels/:id`). Nome and
  URL base start from the authoritative values.
- **Editable candidates** (draft `UpdateWhitelabelDto`):
  - **Nome** — same rules as create;
  - **URL base** — same rules as create.
- **Not editable in this review**, shown under "Dados preservados nesta revisão":

  | Field | Note shown |
  | --- | --- |
  | ID | Imutável |
  | Identificador (slug) | "Preservado; possibilidade de alteração ainda não confirmada" |
  | Status | "Valor atual; regra de alteração ainda pendente no Backend" |
  | Domínio | "Valor atual do Control Plane; não editado nesta revisão" |
  | Criado em | Imutável |
  | Última atualização | "Definida pelo Backend" |

- **Clearing an existing URL base is blocked** with "A remoção da URL base
  ainda não tem contrato no Backend". It is pending, not guessed.
- Submitting without changes shows "Nenhuma alteração em relação aos valores
  atuais do Control Plane" and stays on the form.
- **Revisar alterações** shows only the changed fields (before → after), the
  pending notice "Edição aguardando integração do Backend", and the request
  preview with changed candidates only.
- **Salvar alterações (pendente)** is `aria-disabled`. The detail and list keep the
  server values.

## Deactivate / remove

**"Desativar ou remover Whitelabel"** (from the ⋮ menu) does **not** assume the
final rule:

- The dialog lists *Desativação* (stays, status Inativo), *Exclusão lógica* and
  *Exclusão definitiva* as **undecided**: "A regra definitiva ainda não foi
  definida pelo Backend … Esta tela não presume nenhuma delas".
- **Vínculos verificados pelo Backend** lists the domains the Backend may check
  (Contas, Investidores, Empreendedores, Empresas, Oportunidades,
  Investimentos, Pagamentos, Wallets) **without any count**. The frontend never
  calculates whether removal is allowed.
- Initial focus is on **Cancelar**.
- Typing the slug (or the ID when there is no slug) confirms intent. The live
  status reads "Confirmação conferida. A ação será liberada quando o contrato
  do Backend estiver integrado".
- **Desativar ou remover (pendente)** stays `aria-disabled` either way, with "Desativação
  ou remoção aguardando integração do Backend … O Whitelabel continua listado
  com os dados atuais do Control Plane".
- **Dependency-blocked state:** prepared as a `MutationErrorView` of kind
  `dependencies` (from a 409 on this action). It reads "Este Whitelabel possui
  dependências e não pode ser removido ou desativado agora. O Backend decide
  quais vínculos bloqueiam a operação", with no counts. The dialog has a
  `failure` slot for it; nothing sets it in this version.

## Future mutation error mapping (prepared, not bound to any request)

`describeMutationError(error, action)` in `crud/whitelabelMutationContract.ts`:

| Response | Kind | Copy (title) | Retry |
| --- | --- | --- | --- |
| 400 / 422 | `invalid` | Dados recusados pelo Control Plane | no |
| 401 | `session` | Sessão encerrada (the central session layer signs out) | no |
| 403 | `forbidden` | Ação não permitida | no |
| 404 | `not-found` | Whitelabel não encontrado ("não existe mais") | no |
| 409 on create | `conflict` | Conflito com um registro existente (e.g. slug already used) | no |
| 409 on edit | `conflict` | Conflito com um registro existente | no |
| 409 on deactivate / remove | `dependencies` | Operação bloqueada pelo Backend | no |
| 5xx / Nest 502 / network / timeout / malformed | `unavailable` | Não foi possível concluir a operação ("a tentativa não foi confirmada … pode ou não ter sido criado / aplicado: confira antes de tentar novamente") | yes |

Backend messages are never rendered; the correlation id is shown as the
diagnostic code. `MutationErrorNotice` renders these views, and the form
dialog's step union has a `failed` state for them.

## Audit expectation

The draft source writes an audit row for every mutation attempt (success and
failure). The frontend **does not generate or simulate audit events**.
Successful future mutations are expected to appear in Auditoria
(`GET /api/audit`) from the Control Plane.

## Architecture (narrow future integration)

| File | Role |
| --- | --- |
| `crud/whitelabelForm.ts` | form schema / presentation: field classes, limits, normalization, validation, change detection, read-only facts |
| `crud/whitelabelMutationContract.ts` | draft request **types**, `WHITELABEL_MUTATIONS` availability (all `available: false`), request previews, dependency domains, error mapping. **No request code** |
| `crud/WhitelabelFormDialog.tsx` | create / edit dialog: form → review (→ failed) |
| `crud/WhitelabelLifecycleDialog.tsx` | deactivate / remove confirmation |
| `crud/WhitelabelActionsMenu.tsx` | detail ⋮ menu button |
| `crud/MutationStates.tsx` | pending notice, `aria-disabled` pending button, error notice |
| `crud/WhitelabelCrud.module.css` | dialog content styles. Form controls and footers reuse `whitelabel-settings/dialogs/SettingsDialogs.module.css`; the modal is the shared `components/ui/Dialog` (native `<dialog>`: focus containment, inert background, Escape owned by React, focus return / fallback) |
| `WhitelabelsPage.tsx`, `WhitelabelListPanel.tsx`, `WhitelabelDetailPanel.tsx` | wiring only. The read adapter `whitelabelApi.ts` is unchanged and GET-only |
| `scripts/check-whitelabel-crud.mjs` | 42 maintained synthetic checks: form/preview/error rules, no request code in `crud/`, source-level write boundaries, and actual Create/Edit/lifecycle event handlers under a small in-memory hook harness. Tests cover submit/Enter-equivalent/programmatic handler paths and inert final actions. Native DOM behavior is tested separately in the built-in browser. Windows/Unix paths are normalized in the login-only POST allowlist; the allowlist remains strict. |

**To enable one action later:**

1. Confirm its contract.
2. Add the request to the shared API layer (`authenticatedGet` is GET-only by
   design; a mutation client must be added deliberately).
3. Set the action's availability.
4. Replace `PendingActionButton` with a submitting button.
5. Map failures with `describeMutationError`.
6. Refresh the authoritative reads after success.

No second Whitelabel data source exists.

## Codex review — 2026-10-15

### Findings and minimal corrections

1. **Draft rules sounded final in some form copy.** The form now explicitly
   labels its requiredness, length and format checks as provisional. Slug
   generation/uniqueness/mutability and URL rules remain pending. The edit
   status note no longer asserts that deactivation/removal is its only possible
   transition. No domain rule was resolved by frontend inference.
2. **Pending final actions needed immediate visible qualification.** Their
   labels now include `(pendente)` alongside the existing lock, dashed muted
   styling, `aria-disabled` and associated explanation. They remain focusable
   for that explanation, `type="button"`, and have no persistence callback.
   The button can grow when its label wraps on narrow screens.
3. **Mobile row-action focus was overwritten.** The existing scroll/reveal
   effect could steal the new handoff from the loaded menu back to the detail
   region. It now preserves the more specific menu focus, and the already-
   selected row also reveals its below-list panel. Changed-row and same-row
   paths were independently retested. The read adapter/query semantics did
   not change.
4. **The new suite assumed Unix paths.** Only path normalization was corrected;
   its prohibition of every non-login POST and every PUT/PATCH/DELETE was not
   relaxed. Actual-handler no-write checks and a focus-regression guard were added.

### Independent browser validation

- **Create:** pristine cancel; required errors with first-invalid focus and
  associated hints/errors; whitespace normalization; optional URL; Enter to
  review; request preview labelled **not sent**; final native Enter and direct
  programmatic click remain inert; `requestSubmit()` stops at review. Native
  `HTMLFormElement.submit()` bypasses React but only performs default **GET**
  navigation and restores the unchanged read screen — no mutation capability.
- **Edit:** values originate from the loaded read response; unchanged submit
  remains in the form; clearing an existing URL stays explicitly pending;
  only changed candidates appear in before/after review; final activation and
  discard leave the server-sourced list/detail unchanged.
- **Lifecycle:** Cancel initially focused; incorrect and matching slugs never
  enable the final action; no dependency counts or final delete semantics are
  invented; closing returns focus to the detail menu trigger.
- **Menus:** arrow keys, Home/End, Escape, Tab and outside press; semantically
  named detail/row/header controls are independent. No generic "first menu
  button" targeting or auth/logout assertion weakening was introduced.
- **Unsaved drafts:** Cancel, close, Escape and backdrop are guarded; safe
  "Continuar editando" focus; native `beforeunload` opening/dismissal observed;
  exactly one dirty listener and none after close/discard. No global stale guard.
- **Native dialog:** background page content is inert; focus returns on close.
  Browser chrome remains reachable at a Tab boundary and Tab re-enters the
  dialog. This is the existing native Dialog behavior, not a strict
  application-level keyboard loop or a claim of WCAG certification.
- **Read regression:** server pagination, debounced search/page reset, status
  filter, direct reload and Back/Forward retained. The adapter, read hooks,
  route parser and auth/session implementation are unchanged.
- **Responsive:** eight states × six widths = **48 layout checks** at 1672,
  1440, 1024, 768, 390 and 320 CSS px. Covered list/new action, Create, errors,
  Create review, Edit, Edit review, lifecycle and discard warning, including
  long names/slugs/URLs. No document/modal horizontal overflow or clipped
  footer; scrollable bodies and controls remained reachable.
- Screenshots are saved **outside Git**. Captures incorrectly framed against
  document origin while scrolled were rejected; accepted `reviewed-*` captures
  use the actual current viewport. Earlier scratch-selector/measurement
  mistakes were reconciled separately from product findings.

**Evidence limit:** the reviewed branch has not been pushed or deployed. New
CRUD UI behavior was validated locally with synthetic read fixtures, not
through live mutation endpoints. Existing live read integration remains the
single production data source; no mock/auth helper is included in source or
the feature commit. Live CRUD still requires confirmed Backend contracts,
deliberate integration, authorization and a separately scoped E2E.

### Final validation result

TypeScript, oxlint, production Vite build and `git diff --check`: **PASS**.
The inherited >500 kB chunk-size advisory remains non-blocking.

| Maintained suite | Passed |
| --- | ---: |
| Whitelabel CRUD (actual handlers + source/domain boundaries) | 42 |
| Whitelabel reads / Auth-session | 49 |
| Accounts reads | 33 |
| Investor reads | 42 |
| Entrepreneur reads | 45 |
| Dashboard reads | 45 |
| Audit reads | 97 |
| Compliance / KYC / Audit boundaries | 400 |
| Operation / Finance / Investor regression | 285 |
| Navigation / URL search lifecycle | 14 |
| **Total** | **1,052** |

Independent loopback server ledger: **25 Whitelabel GETs, zero Whitelabel
mutation attempts, zero other business-write attempts**, unchanged fixture.
The only non-GET was the ordinary synthetic local login. Browser inspection
also found **zero external API requests, zero runtime exceptions and no
captured console errors/warnings**. This is local/synthetic runtime evidence,
not live CRUD E2E. Future error-state presentation remains unit-only and is
not bound to fake production requests.

The feature is ready for **separate promotion authorization as frontend-only,
pending integration**. `dev` remains `38a9a02`; main and backend-handoff are
unchanged. No push, deployment, Backend/configuration or live data change is
part of this review.

## Backend contract details still required

**Create:**

1. Does Core `POST /internal/super-admin/v1/whitelabels` exist?
2. Final required fields: is `slug` required or generated? Is `baseUrl`
   required?
3. Final slug rules: uniqueness scope; reserved words; case and accents;
   maximum length.
4. `baseUrl` format: protocol required? Uniqueness? How is `domain` derived?
5. Initial status (active or inactive?).
6. Success response shape (`{ data }`?) and status (201?).
7. Error codes: duplicate slug / name → 409? Validation → 400 with which `code`?

**Edit:**

8. Does Core `PATCH …/whitelabels/:id` exist?
9. Editable fields: `name`, `baseUrl` only? Can the slug ever change?
10. Can `baseUrl` be cleared (null vs empty)?
11. Concurrency: is there a version / `updatedAt` precondition, and what is the
    409 behaviour?
12. Response shape.

**Deactivate / remove:**

13. Canonical action: deactivate (`/deactivate` exists in the draft), soft
    delete or hard delete? Is there a DELETE at all?
14. Dependency rules: which domains block? Is the response 409 with a stable
    `code` (e.g. `WHITELABEL_HAS_DEPENDENCIES`) and a safe summary?
15. Effects of deactivation on tenant logins, accounts, opportunities and
    payments.
16. Reactivation (`/activate`) — in or out of V1?

**All actions:**

17. Roles: the draft allows `SUPER_ADMIN` only — confirm.
18. Audit actions and payload: the draft writes `afterData` with the submitted
    fields.
19. Idempotency / retry safety for timeouts on non-idempotent POST.

## Out of scope (unchanged)

- Whitelabel KPI cards.
- Detail tabs (Administradores / Aplicações / Integrações).
- Quick actions.
- Tenant prototype modules (Config. / E-mails / Financeiro).
- Opportunities, Finance and KYC prototypes.
- The Empresas requirement.
- Backend, database, Netlify and the canonical handoff branch.
