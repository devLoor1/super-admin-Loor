# Whitelabel CRUD Safe Preparation V1 — Create + name-only edit (mock-only)

> Historical preparation evidence. Current guarded transport, contract, activation boundary and
> fresh tests are documented in [Whitelabel CRUD Operational V1](whitelabel-crud-operational-v1.md).
> Statements below about the absence of a production transport describe the earlier preparation.

Frontend-only unit prepared by Cloud on `work/whitelabel-crud-safe-preparation`, based on `dev`
`e7c8683e760f552e4c69bf2ceebdae474ac3b8cd`, and left uncommitted for review. It supersedes the create /
edit / deactivate sections of [`whitelabel-crud-frontend-v1.md`](whitelabel-crud-frontend-v1.md).

> **Independent review closure (2026-10-17): QA PASSED for frontend-only safe preparation.** The
> existing isolated feature worktree and all prior fixes were preserved; the Cloud patch was not
> reapplied. Browser access was restored and the remaining review gate cleared. This reviewed unit
> is authorized for one LOCAL feature commit only. No push, promotion, deployment or live write.
> See §H for current evidence; §§F–G preserve the superseded interrupted checkpoint.
>
> **Evidence provenance:** Cloud's GET/browser/fuzz results below are supplied delivery evidence,
> not fresh independent runtime evidence. This review rechecks Nest source and deterministic tests;
> it does not inherit Cloud's browser pass counts as its own. Current source facts supersede the
> historical `b414963` snapshot where explicitly noted. Fresh independent browser evidence is §H.

```text
WHITELABEL CREATE UI / DTO: PREPARED.
WHITELABEL NAME-ONLY EDIT: PREPARED.
LIVE CREATE: NOT ENABLED.
LIVE UPDATE: NOT ENABLED.
ACTIVATE / DEACTIVATE / DELETE: NOT ENABLED.
```

> **No live mutation exists.** The frontend sends no `POST`, `PATCH`, `PUT` or `DELETE` for Whitelabels
> and has no production write transport. The final buttons are `aria-disabled` for **every role,
> SUPER_ADMIN included**. Every write behavior was tested only with the mock-only fake transport in
> `scripts/`. Mock responses are test fixtures, **not** proof of the real Core envelope.

---

## A. Contract and gate

### A.1 Baseline and isolation

| Item | Value |
| --- | --- |
| Frontend `origin/dev` (fetched live) | `e7c8683e760f552e4c69bf2ceebdae474ac3b8cd`, as expected |
| Cloud delivery branch | Reported `work/whitelabel-crud-safe-preparation`; complete implementation recovered from the supplied 24-file patch |
| Independent review branch / worktree | `feature/whitelabel-crud-safe-preparation-v1` / `C:/Users/User/Desktop/Loor/worktrees/super-admin-whitelabel-crud-safe-preparation-v1`; canonical dev untouched |
| Historical Nest snapshot | `b414963`: Whitelabel/controller/service/DTO/guards/Audit unchanged since `46bf79d`, independently confirmed by Git diff |
| Current Nest dev source (not deployment proof) | `aea5392a18b6a6df327590af38ecd254dadbb55c`: controller/DTOs unchanged; service now maps `E_SLUG_TAKEN` to 409 and catches Audit errors (best-effort) |
| Core write source | Not independently inspected. Current Backend-authored write-contract documentation is delivery evidence, not proof of deployed Core writes |

### A.2 Live read gate (GET only, structure only)

**Cloud-reported gate, not repeated by Codex:** it ran on 2026-10-16 from the operator's existing session. A read-only observer blocked any
non-GET request to `/whitelabels` and was removed afterwards. Only key names, types and counts were
recorded.

| Request | Result |
| --- | --- |
| `GET /api/whitelabels?page&perPage` | 200 `{ data, meta { page, perPage, total, lastPage } }`, 6 rows, the same 14 keys as at `627b1e0`. Slugs match `^[a-z0-9-]+$` (longest: 19 characters). Names are 7–21 characters. `baseUrl`: 4 `https`, 2 `http`. All rows `active`. |
| `GET /api/whitelabels/:id` | 200, a bare object with the list keys plus `overview`; `String(id) === idKey` |

No regression: the read adapter (`whitelabelApi.ts`) is unchanged.

### A.3 Contract used (Nest source, never live-write-verified)

| Operation | Route | Body | Roles | This unit |
| --- | --- | --- | --- | --- |
| Create | `POST /api/whitelabels` | `name` 2–120 · `slug` `^[a-z0-9-]+$` ≤ 80 · `baseUrl` `@IsUrl({ require_tld: false })` — **all required**; unknown keys → 400 | SUPER_ADMIN | Prepared: review only |
| Update | `PATCH /api/whitelabels/:id` | each field `@IsOptional`; **this UI sends `{ name }` only** | SUPER_ADMIN | Prepared: review only |
| Activate / Deactivate | `PATCH …/:id/activate`, `…/deactivate` | — | SUPER_ADMIN | **Not offered** |
| DELETE | `DELETE /api/whitelabels/:id` (alias of deactivate) | — | SUPER_ADMIN | **Not offered** |

`LoorCoreClient` (Nest `33e4646`) forwards a non-empty string Core body `code`, falling back to
`CORE_HTTP_ERROR`. Current Nest `aea5392` additionally converts `E_SLUG_TAKEN` to HTTP 409. The mock
outcome interpreter now understands both current 409 and historical 422 with this code; generic
422 and generic 409 remain distinct safe refusals. No duplicate-slug write was executed. Backend's
new write-contract document describes Core error/envelope behavior, but neither its deployed version
nor actual Core error production has been independently write-verified here.

### A.4 Gate status

`origin/dev` matched. The DTO is unchanged. Create needs no undocumented field. Name-only maps to the
`PATCH` partial DTO. No Core write assumption is needed to *prepare* the flows. GET did not regress, and
no real mutation was needed. The prototype cleanup touched only `src/features/whitelabels/`. No
production mutation path was introduced. **The initial Work-settings browser blocker was resolved;
independent browser review passed on 2026-10-17 (§H).**

---

## B. Create Whitelabel — prepared

### B.1 Flow

"Novo Whitelabel" (SUPER_ADMIN presentation) → form (Nome, Identificador (slug), URL base, all marked
*obrigatório*) → **Revisar criação** → review → final **Criar Whitelabel (pendente)**.

- **Form:** `noValidate`; the browser's URL validation is not used (`type="text"`, `inputMode="url"`).
  Errors are inline (`aria-invalid` + `aria-describedby`), and focus goes to the first invalid field.
  Typed values are kept until the operator discards them; a reload with typed data asks the browser
  first.
- **Review:**
  - exactly the values a request would carry;
  - a warning that **the slug and the URL base influence the tenant's identity and resolution** (which
    Whitelabel serves a registration, a public configuration or an e-mail link), and that changing them
    later needs separate authorization;
  - the notice **"Criação aguardando liberação da integração."**;
  - a collapsed "Requisição prevista (não enviada)" showing `POST /api/whitelabels` and the JSON body;
  - **Voltar e editar** (values kept) and **Descartar** (asks to confirm).
- **No fake success:** the final button only announces its pending state. No row is added and no
  success message exists.

### B.2 Pure payload builder — `crud/whitelabelCommands.ts`

`buildCreateCommand(draft)` returns `{ ok: true, command }` or `{ ok: false, errors }`.

- **Body:** exactly `{ name, slug, baseUrl }`, in that order.
  - `name`: whitespace trimmed and internal runs collapsed.
  - `slug` and `baseUrl`: trimmed only, **never rewritten** (no lower-casing, no trailing slash).
- **Never sent:** `id`, `status`, `active`, timestamps, relations, unknown keys or `null`, even if the
  input object carries them.
- **Guarantees:** deterministic, frozen, no network, and the draft (form state) is never changed.

### B.3 Validation, aligned with the DTO

| Field | Rule | Notes |
| --- | --- | --- |
| `name` | required; 2–120 **as class-validator counts** | `dtoLength` mirrors validator.js `isLength`: a surrogate pair or a trailing variation selector counts as one character |
| `slug` | required; `^[a-z0-9-]+$`; ≤ 80 | identical to `@Matches` + `@MaxLength` |
| `baseUrl` | required; **stricter subset** of `IsUrl({ require_tld: false })` | see below |

**URL base rule:**

- **Accepted:**
  - the scheme is `http://` or `https://`;
  - the host is an IPv4 address or ASCII DNS labels. Single-label hosts such as `localhost` are
    accepted (`require_tld: false`). The last label must not be all digits;
  - an optional port from 1 to 65535;
  - then any path, query or fragment without whitespace, `<` or `>`;
  - at most 2084 characters.
- **Refused on purpose, although `IsUrl` would accept them:**
  - no scheme (`plataforma.com.br`);
  - `ftp://`;
  - credentials (`user:pass@`);
  - IPv6 literals;
  - non-ASCII host names;
  - an empty port (`host:`).

  Reasons: every live Whitelabel stores an absolute http(s) URL, and the URL builds tenant links. This
  restriction is a **UI decision for Product / Backend to confirm**, not a Backend rule.
- **Evidence that the frontend never accepts what Nest refuses:**
  - **Cloud-reported fuzz test:** a differential test against **validator.js 13.15.35**, the version class-validator
    0.14.4 resolves to in the Backend lockfile. It covered 300,000 fuzzed inputs plus 61 fixed cases,
    with **0 inputs accepted by the frontend and refused by `isURL`**.
  - **Fixed-case reference:** the 61 cases and their recorded verdicts are a fixture
    (`IS_URL_REFERENCE`) checked by `check-whitelabel-crud.mjs`.

**Frontend preparation accepts only a subset of Backend-valid URLs. Product confirmation is required
before live activation.** HTTP(S)-only and no embedded credentials are preliminary Product/security
recommendations, not Nest constraints. IPv6, accented hostnames, empty ports and otherwise valid
scheme-less URLs are also deliberately excluded for this preparation. This review does not change
the accepted input set. Any future relaxation or further restriction requires an explicit decision.

Independent comparison used the actual npm `validator@13.15.35` package with SHA-512 matching the
Backend lockfile (no frontend dependency added). Its 61 recorded URL verdicts and 17 name-length
verdicts matched. Across 60,079 fixed/seeded inputs, 5,678 were frontend-accepted and none of those
were Backend-invalid; 7,288 were Backend-valid/frontend-rejected. Ordinary HTTP/HTTPS, localhost,
ports, subdomains, paths/trailing slash, case, query/fragment, encoded characters, whitespace
normalization and length limits were exercised. Finite tests do not establish a universal proof.
Cloud reports six current records using ordinary HTTP(S); no incompatible existing URL was reported.
Independent current-record comparison remains pending authenticated built-in-browser access.
- The Control Plane still validates on submit, and its 400 is handled (see D).

---

## C. Name-only edit — prepared

- **Entry points:**
  - **Editar nome** in the detail card;
  - **Editar nome** in the detail actions menu.

  Both appear for SUPER_ADMIN. The dialog opens only for the **loaded authoritative detail of the
  selected ID**, never for a record still on screen during a selection transition.
- **Form:**
  - **one input** (Nome), initialized from `GET /whitelabels/:id`;
  - the draft type is `{ name }`. Slug and URL base are not in the draft and have no input, so **no
    hidden edit path exists**;
  - slug and URL base are listed under **Somente leitura**, with the explanation that changing them
    affects tenant resolution (registrations, public configuration, links sent) and needs separate
    authorization.
- **Change detection:**
  - an unchanged name is reported ("O nome é igual ao valor atual do Control Plane.");
  - a whitespace-only difference is not a change;
  - the review shows the before → after diff.
- **Command:** `buildNameUpdateCommand({ selectedId, record, draft })`.
  - **Body:** exactly `{ name }`.
  - **Target:** the **selected record's ID**.
  - **Refusals:**
    - `target-mismatch` when the record is not the selected one;
    - `invalid-target` for a non-server ID;
    - `unchanged`;
    - `invalid-name`.
  - **Baseline:** the command keeps `{ name, updatedAt }` from where the edit started.
- **Review:**
  - the diff;
  - "slug … e URL base … permanecem como estão";
  - **"Edição aguardando liberação da integração."**;
  - `PATCH /api/whitelabels/<id>` + `{ "name": … }`;
  - final **Salvar nome (pendente)**.
- **Stale data:** if the loaded detail for that ID changes (`name` or `updatedAt`) while the dialog is
  open, a notice appears and the review is blocked.
- **Identity safety:** when the selection changes (Back / Forward, link, typed URL), the page **discards
  the open edit during that render** and announces it. A's draft never shows on, carries over to, or
  targets B. Opening the edit on B starts from B's authoritative values and targets B only. Verified in
  checks and in the browser (A → edit → B → B's name, `PATCH /api/whitelabels/6`; Back from a review
  also discards).

---

## D. Lifecycle, production boundary, mocks and errors

### D.1 Activate / Deactivate / DELETE — not enabled

- **Actions menu:** shows **Desativar Whitelabel** (or **Ativar Whitelabel** for an inactive record) as an
  `aria-disabled` item, labelled "Ativação e desativação indisponíveis. Efeitos no tenant ainda não
  confirmados." The item has **no `onClick` at all**.
- **Removed:**
  - the former "Desativar ou remover" dialog (`WhitelabelLifecycleDialog.tsx`), with its typed
    confirmation and its soft / hard-delete options;
  - the dependency chips.
- **DELETE:** a deactivation alias in the Backend; it is not offered anywhere.

### D.2 Production boundary

- **No network calls:** nothing in `crud/` calls `fetch`, `apiRequest` or `authenticatedGet`, reads a
  token, or declares an HTTP method. `whitelabelApi.ts` stays GET-only, and `apiClient.ts` exposes no
  method option.
- **Commands are data:** `route` is a documentation label shown in the review.
- **Runner** (`crud/whitelabelMutationRunner.ts`):
  - pure attempt logic around **injected** ports;
  - **imported by no screen**, so it is not bundled;
  - the only transports are the fixtures in `scripts/fixtures/whitelabel-mutation-mocks.mjs`;
  - checks enforce that nothing in `src/` imports them and that no mock Whitelabel data reaches a screen.
- **Production Save:** disabled.

### D.3 Outcome rules (pure, `crud/whitelabelMutationOutcome.ts`)

| Response (Nest source) | Outcome | Next step |
| --- | --- | --- |
| 2xx `{ data }` that parses and matches the command (create: same slug, name and URL base, the same rule as the read-back; edit: same id and the requested name) | `confirmed` | reload list / detail |
| 2xx unreadable / raw Core row / other identity | `uncertain` (`unverified-response`) | authoritative read-back |
| 400 (ValidationPipe; fields taken from `message[]`, text never shown) | `rejected` `validation` | fix the fields |
| 400 `INVALID_WHITELABEL_ID` | `rejected` `refused` | — |
| 401 / 403 | `rejected` `session` / `forbidden` | sign in / SUPER_ADMIN only |
| 404 (edit) | `rejected` `not-found` | refresh the list |
| 409 with `E_SLUG_TAKEN` (current Nest source), or historical 422 with that code (create) | `rejected` `slug-taken` | another slug |
| 422 otherwise | `rejected` `unprocessable` ("a possible cause is the slug already in use") | check the list |
| 429 | `rejected` `rate-limited` | wait |
| other 4xx (e.g. 409, which Nest never sends) | `rejected` `refused` | — |
| 500, 502–504, timeout, network, malformed | `uncertain` | **read-back before anything else** |

At `b414963`, an Audit exception after Core success could produce a misleading 500. Current Nest
`aea5392` catches Audit exceptions: that specific failure is now a **historical/generic post-Core
failure mock**, not asserted current-source behavior. Mapping still precedes safe Audit, deployment
parity is unproven, and lost responses remain possible; 5xx/timeouts must still stay uncertain.
Best-effort Audit avoids HTTP inversion but does not prove durable/atomic Audit consistency.

**Read-back (`reconcile*`):**

- **Create** searches the list by slug and accepts **only an exact slug match**.
  - Same slug and the same name and URL → `applied`.
  - Same slug with other values → `diverged`.
  - No such slug with explicit complete search coverage → `not-applied`.
  - Incomplete coverage → `inconclusive`; no retry or reset is allowed. Multiple exact matches → `diverged`.
- **Edit** re-reads `GET /whitelabels/:id`.
  - The new name → `applied`.
  - The baseline name → `not-applied`.
  - Anything else → `diverged` (a concurrent change; there is no ETag).

**Runner rules (mock-tested):**

- one write at a time: a repeated click or Enter while checking / pending → **one request**;
- attempts are bound to their target (`create` / `whitelabel:<id>`), and selecting another Whitelabel
  never moves an attempt or its outcome;
- the edit re-reads the detail first and **sends nothing when the record changed** (stale) or is gone
  (404);
- `uncertain` blocks any new submit until `verify()`, and `confirmed` / `stale` / `diverged` need a reset;
- superseded read-backs and anything after `dispose()` are ignored;
- **no automatic retry, no timers**.

### D.4 Mock scenarios covered (`scripts/check-whitelabel-crud-mocks.mjs`, now 43 checks)

- **Create:**
  - success;
  - invalid DTO (400);
  - duplicate slug as a generic 422, historical `E_SLUG_TAKEN` 422 and current Nest 409; generic 409 is not mistaken for a duplicate slug;
  - 403;
  - Audit-failure 500;
  - 503;
  - timeout;
  - uncertain (raw Core 2xx, network).
- **Name update:**
  - success;
  - invalid name;
  - 404;
  - **stale record** (no PATCH sent);
  - target gone before submit;
  - pre-read failure;
  - 403;
  - 500;
  - 503;
  - timeout;
  - uncertain (2xx echoing the old name).
- **Error states:** 400, generic 422, 401, 403, 404, 429, 503, timeout, network, malformed. Each has safe
  copy and keeps the correlation id.
- **Attempt rules:**
  - duplicate submit;
  - response tied to target;
  - navigation does not retarget (the payload for B targets B);
  - stale responses ignored;
  - no automatic retry (read-back → manual resubmit);
  - Audit-failure 500 → read-back finds the record → not resent;
  - edit read-back applied / not-applied / diverged.

### D.5 Authorization presentation (no new RBAC)

`whitelabelWriteAccess(operator.roles)` reads the existing session operator (`useSessionOperator`):

- `SUPER_ADMIN` → `super-admin`;
- any other known session → `read-only`;
- no operator → `unknown`.

Only `super-admin` opens the review flows. For everyone else, "Novo Whitelabel", "Editar nome" and the
menu item are `aria-disabled`, with the reason announced; activating them shows that reason and opens
nothing. Save stays disabled even for SUPER_ADMIN, and the Backend guard remains the authority.

---

## E. QA, blockers and prototype classification

### E.1 Cloud-reported delivery results (not independent browser approval)

Run: `node scripts/check-whitelabel-crud.mjs` and `node scripts/check-whitelabel-crud-mocks.mjs`. Both
are synthetic, make no network calls and need no added dependency.

| Check | Result |
| --- | --- |
| `tsc -b`, `oxlint`, `npm run build`, `git diff --check` | pass |
| `check-whitelabel-crud.mjs` | 67 passed (previously 42; every prior safety category kept, expectations moved to the confirmed DTO) |
| `check-whitelabel-crud-mocks.mjs` (new) | 39 passed |
| Other canonical suites | all pass; see the final report for counts |
| Browser QA (mock Control Plane, intercepted) | 87/87: create, name edit, lifecycle, identity safety, 4 roles + 2 refused roles, 6 widths (1672 / 1440 / 1024 / 768 / 390 / 320), axe (WCAG 2.1 AA) on 6 states, keyboard menu, **zero non-GET requests**, no new storage, read regression identical to `e7c8683` |

The original `check-menu-visibility.mjs` protected isolation since `bb9bef0`; unrelated later domain
work should not invalidate Menu Visibility, but Cloud's whole-Whitelabel-directory exception was too
broad. Independent review replaced it with **17 explicit reviewed file paths**, including the two
removed dialogs. A new file or change to Whitelabel read adapters/hooks still fails. Every Whitelabel
TS/TSX file also undergoes syntax-aware transport/storage checks; only its existing GET adapter may
use the canonical GET. Planted unreviewed paths, raw/aliased/computed writes and persistence are
rejected. Existing 23-ID, protected menu, role, candidate, GET-only, isolated preview, no-sidebar
enforcement, global cross-domain scan and shared/auth/navigation byte-identity assertions remain.

The page-level selection guard (discarding A's edit when B is selected) is covered in two ways:

- source checks in `check-whitelabel-crud.mjs`;
- behavioral checks in the browser flow (A → edit → B, and Back from a review).

The dialog-level guard has harness tests.

### E.2 Live activation gates (current source reconciled, no live write gate closed)

| | Blocker | Status |
| --- | --- | --- |
| A | Deactivation effects on the tenant (registration, platform settings) | open |
| B | Password-recovery tenant isolation | Backend's new contract document reports inactive-tenant isolation/no default fallback; independently deployed Core behavior still unverified |
| C | Default Whitelabel deactivation | Backend documents fallback selection; Product policy and deployed effects still unverified |
| D | Editing slug / baseUrl changes tenant resolution | open: UI edits the name only |
| E | Core write behavior (validation, envelope, repeated status, `null`) | open |
| F | Audit consistency / uncertain writes | New Nest source catches Audit failures; durability/atomicity and deployed parity remain open. Generic/legacy 5xx still require read-back |
| G | No concurrency control (no version / ETag) | open: pre-read + stale detection reduce the window, but do not close it |
| H | Duplicate-slug code depends on Core | Source forwards code and maps it to 409; Backend documents Core behavior, but no live duplicate-slug test performed |

### E.3 Prototype classification

| Prototype piece | Decision |
| --- | --- |
| `whitelabelForm.ts` | **Adapted:** URL base required, IsUrl-subset rule, `dtoLength`, name-only edit draft, stale detection, read-only facts with identity notes |
| `whitelabelMutationContract.ts` | **Adapted:** availability per action (create / update-name / lifecycle), role access, blockers. Error mapping moved to the outcome module |
| `WhitelabelFormDialog.tsx` (create + edit in one) | **Replaced** by `WhitelabelCreateDialog.tsx` and `WhitelabelNameEditDialog.tsx` |
| `WhitelabelLifecycleDialog.tsx` | **Removed** (no executable lifecycle flow) |
| `WhitelabelActionsMenu.tsx` | **Adapted:** "Editar nome", disabled lifecycle item, role-aware |
| `MutationStates.tsx` | **Adapted:** new pending wording; `MutationOutcomeNotice` replaces `MutationErrorNotice` (display only) |
| `whitelabelCommands.ts`, `whitelabelMutationOutcome.ts`, `whitelabelMutationRunner.ts` | **New** |
| Read adapter, list / detail reads, routing | **Kept unchanged** |

### E.4 Before any live write

All of the following are needed:

- an explicit authorization;
- a reviewed transport in the shared API layer (the runner's ports);
- flipping `WHITELABEL_MUTATIONS.create` / `update-name`;
- a live write verification of the Core envelope in a controlled tenant;
- Product / Backend decisions on blockers A–H.

Activation, deactivation and DELETE stay out until blockers A–C are answered.

## F. Historical independent review checkpoint — 2026-10-16 (superseded by §H)

### F.1 Recovery and changes

- Canonical checkout and live `origin/dev`: `e7c8683e760f552e4c69bf2ceebdae474ac3b8cd`.
- `main`: `c2235ac5d0d65408e9d39bf836a1a717da3d95ae`; backend-handoff:
  `89a3b5058f52f981b3a1b06756d7f33a2a043f27`; unchanged.
- No existing Cloud worktree/branch was found. The complete 24-file patch passed `git apply --check`,
  was applied once to the isolated review worktree, and passed `git apply --reverse --check` before
  independent edits. No work was reset/discarded. Patch need not be applied again.
- Codex edits: narrow Menu Visibility's directory exception; add current Nest 409 handling/tests;
  clear open preparations on operator role loss; add real-page in-memory role/identity tests;
  prevent reset from bypassing uncertain outcomes; require explicit complete slug-search coverage
  before declaring absence; reconcile source comments, fixtures and these documents. No extra Product capability is enabled.
- Both the 409 classification and retained-draft-on-role-loss defects were reproduced with failing
  regression tests before their fixes. Page tests cover Create and Edit across SUPPORT_ADMIN,
  READ_ONLY, empty roles and absent operator, including role regain. A→B routing uses B's loaded
  detail/ID; stale A callbacks cannot open against B. These are in-memory tests, not browser E2E.
- A third failing regression reproduced `reset()` clearing an uncertain attempt before readback.
  Reset now refuses uncertain/verifying/failed/inconclusive slots. The search port explicitly returns
  `{ rows, complete }`; a partial page cannot unlock resubmission. These are mock-only safety rules,
  not a deployed pagination/idempotency guarantee. Complete readback plus a later manual resubmit
  still cannot replace a Backend concurrency/idempotency contract.
- No frontend dependencies, manifests or lockfiles changed. The worktree uses an ignored
  `node_modules` junction to the existing canonical install. Review artifacts live outside Git.

### F.2 Independent validation

| Check | Current independent result |
| --- | --- |
| TypeScript / oxlint / production build / diff check | PASS after final code edits; inherited bundle-size advisory only; new/untracked files also whitespace-checked |
| Whitelabel read/auth | 49 PASS |
| Whitelabel CRUD handlers/contracts | 69 PASS |
| Mock-only mutation runner | 43 PASS |
| URL search lifecycle | 14 PASS |
| Operation / Finance / Investor boundaries | 285 PASS |
| Menu Visibility Stage A + B | 1,223 PASS; all prior safeguards retained |
| Investor / Entrepreneur / Dashboard read | 42 / 45 / 45 PASS |
| Compliance / Audit boundaries | 400 PASS |
| Companies prototype boundaries | 680 PASS |
| Audit read / Accounts read | 97 / 33 PASS |
| All 13 maintained canonical suites | PASS; no network in these tests |
| Actual Vite production module graph | Create/name-edit/read modules present; runner, outcome interpreter, fixtures and scripts absent; no synthetic records/error markers in output |
| Independent URL validation | 60,079 inputs against actual validator.js 13.15.35; no frontend-accepted / Backend-rejected case |
| Fresh authenticated live Whitelabel GET | NOT RUN: built-in browser disabled |
| Independent browser flow, six widths, console, accessibility, intercepted runtime network | BLOCKED: `Local browser use is disabled in Work settings` |

Cloud's `whitelabel-crud-safe-preparation-v1-screens.png` contact sheet was visually inspected as
supplied evidence: it shows Create review, name-only facts, disabled lifecycle/READ_ONLY entry and
390/320 px dialogs. It is not a current interactive/overflow/focus test and does not clear this gate.

Protected domains' sources are unchanged; deterministic regression suites pass. Cloud's browser
Auth 26/27, Dashboard 82/88 and CRUD 87/87 remain historical supplied evidence, not fresh independent
results or a claim of fixed baseline failures. Dialog labels, first-invalid focus, inert buttons,
role/identity handlers, persistent name-note live region and no lifecycle handlers are checked in
source/in-memory tests. Native focus, Escape/Back, wrapping, overflow and console still need browser
review; no full accessibility certification is claimed.

### F.3 Hard safety state

All Create/Update/lifecycle availability flags remain literal `false`. Forms stop at review. The
name draft/payload contains only `name`; slug/baseUrl are facts, not inputs. Authoritative GET
adapters, request/cache hooks, IDs, search/pagination and shared session/navigation were not changed.
No fake row is inserted and no screen consumes the mock runner or success interpreter.

Executed live Whitelabel POST/PATCH/PUT/DELETE: **0 / 0 / 0 / 0**. Other live business mutations: **0**.
Financial mutations: **0**. No live authenticated API request was attempted in this independent
review. Mock calls are injected in-memory only, with network tripwires. Source/module-graph checks
support zero reachable Whitelabel write capability; the independent browser network trace remains
unverified because the browser is unavailable. Authentication's existing login POST is not a
Whitelabel write and has not been modified or executed here.

### F.4 Exact next action and commit gate

1. User enables local browser use in Codex Work settings. Rediscover tabs; do not reuse stale handles.
2. Use ONLY the built-in browser. Run the isolated mock UI with all business writes blocked, clearly
   distinguish mock data from live homolog, then cover Create/Edit, missing/invalid inputs, review,
   discard, Enter/Space, stale/changed target, role loss, Back/focus and mobile sidebar.
3. Review 1672 / 1440 / 1024 / 768 / 390 / 320 px, long URLs, overflow, accessibility and console;
   perform scoped Menu Visibility/read regressions. Reuse Cloud screenshots only as supplied evidence.
4. If authenticated homolog access is available, repeat safe structure-only list/detail GET and
   compare existing URL compatibility. No live business writes may be used to resolve a gate.
5. Fix only confirmed findings, rerun validations, inspect complete staged diff, then create **one
   local feature commit**. Until required browser review passes: **NO COMMIT**. Never push/promote/deploy.

### F.5 Decisions required before any live CRUD activation

1. Verify actual deployed Core write version/contract.
2. Verify real Create envelope and generated ID in a separately authorized safe tenant.
3. Confirm Core validation, optional/omitted/null handling (Nest optionality alone is not Core proof).
4. Verify actual duplicate-slug production/error mapping.
5. Confirm deactivation effects on registration, settings, confirmation and recovery.
6. Verify deployed password-recovery tenant isolation/no cross-tenant fallback.
7. Product policy for default-tenant deactivation and its fallback effects.
8. Product policy for active-tenant slug/baseUrl edits (not exposed by this name-only UI).
9. Confirm deployed best-effort Audit behavior and required consistency/durability policy.
10. Whitelabel concurrency/version/ETag policy; client pre-read is not atomic concurrency control.
11. Isolated homolog tenant plus explicit authorization for real mutation E2E and a reviewed transport.
12. Product approval of the stricter baseUrl formats/protocols described above.

Frontend preparation: **review in progress, browser-blocked, not yet committed**.
Ready for separate frontend-only promotion: **NO until review and local commit complete**.
Live CRUD activation: **BLOCKED / NOT AUTHORIZED** regardless of mock test results.

## G. Historical requested technical review result — 2026-10-16 (superseded by §H)

The numbered groups below preserve the requested A–K reporting categories. A source/test PASS does
not mean browser/live E2E PASS. No reviewed commit is authorized until the remaining browser gate passes.

### A. Recovery (1–8)

1. Canonical repository: `C:/Users/User/Desktop/Loor/super-admin-Loor`; expected origin verified live.
2. Live frontend baseline: `e7c8683e760f552e4c69bf2ceebdae474ac3b8cd`, still unchanged at stop.
3. Complete Cloud implementation located: YES, supplied patch; no original local worktree found.
4. Recovery comparison: 24 expected files; forward check before apply, reverse check before refinements.
5. Patch applied once: YES.
6. Work lost: NO recovered patch content lost; original ephemeral session not assumed recoverable.
7. Review branch: `feature/whitelabel-crud-safe-preparation-v1`, HEAD still `e7c8683`.
8. Isolated worktree: YES; canonical dev clean and untouched.

### B. Backend contract (9–15)

9. Create DTO: source-confirmed.
10. Update DTO: source-confirmed, three optional Backend fields; UI permits name only.
11. Create required fields: `name`, `slug`, `baseUrl`.
12. Name-only PATCH candidate valid: YES, pure exact `{ name }`, no request.
13. Error forwarding: source-confirmed at `33e4646`, current 409 mapping at `aea5392`.
14. Actual deployed Core write behavior: independently UNVERIFIED; Backend-authored delivery claims distinguished.
15. Backend/Core untouched: YES; read-only source inspection only, no APIs/config/database changes.

### C. Special review (16–22)

16. Original blanket exception: too broad; refined exception safe within declared source/test boundaries.
17. Prior meaningful Menu Visibility safeguards preserved: YES, including 23 IDs, protected menus,
    GET-only, no PUT/enforcement/storage, roles and unchanged real navigation/auth.
18. Exception refined: YES, 17 file paths plus transport/storage scans and planted forbidden cases.
19. URL accepted-subset compatibility: checked independently against actual locked validator.
20. Legitimate ordinary HTTP(S)/localhost/ports/path/query/fragment cases: PASS in pure validation tests.
21. Additional frontend restrictions: explicitly documented, no acceptance-policy change made.
22. Final Product approval of protocols/formats: STILL REQUIRED before activation.

### D. Create (23–30)

23. Three required fields: YES.
24. Candidate body: exactly `{ name, slug, baseUrl }`, normalized and frozen.
25. Unknown/server fields excluded: YES.
26. Null values sent: NO, no request at all; builder excludes them.
27. Confirmation: review step exists; final Create inert, not a success state.
28. Draft/back-to-form/discard: source and handler tests PASS; native browser behavior pending.
29. Real Create disabled for every role: YES.
30. Current independent browser Create review: BLOCKED, not inherited from Cloud's screenshots/counts.

### E. Name-only edit (31–38)

31. Authoritative target ID: existing detail source, confirmed by page/command tests.
32. Candidate body: exact `{ name }` only.
33. Slug: read-only fact, not an input/payload field.
34. BaseUrl: read-only fact, not an input/payload field.
35. Stale detection: name/updatedAt comparison and pre-read in mock runner; no atomic concurrency claim.
36. Cross-record safety: A draft cleared for B; B uses B detail/ID; old A callback refused.
37. Mock readback: PASS, including uncertain/applied/not-applied/diverged/incomplete coverage and old responses.
38. Real Update disabled: YES for all roles; open drafts also close on role loss.

### F. Lifecycle (39–43)

39. Activate disabled: YES.
40. Deactivate disabled: YES.
41. DELETE disabled: YES, old prototype dialog removed, no handler/alternate path.
42. Physical deletion: NO frontend path; Nest DELETE source is logical deactivation only.
43. Operational/tenant-resolution risks: documented and gates still open; no claim of harmlessness.

### G. Production safety (44–53)

44. Reachable Whitelabel production write transport: NO found in source/import/output inspection.
45. Mock runner imported/bundled by application: NO.
46. Executed live Whitelabel POST: 0.
47. Executed live Whitelabel PATCH: 0.
48. Executed live Whitelabel PUT: 0.
49. Executed live Whitelabel DELETE: 0.
50. Other executed live business mutations: 0.
51. Financial mutations: 0.
52. Fake production success/list persistence: NO.
53. Mock isolation: deterministic tests and actual production graph PASS; independent browser network
    interception/trace not yet performed. Source-only safety is not misreported as runtime evidence.

### H. Regression (54–67)

54. Whitelabel list/detail: original adapters/hooks/routes unchanged, 49 read/auth checks PASS.
55. Auth/session: shared source unchanged; deterministic contracts PASS; Cloud browser 26/27 not rerun.
56. Dashboard: source unchanged, 45 read checks PASS; Cloud browser 82/88 not rerun/fixed here.
57. Investors: source unchanged, 42 read checks plus boundary checks PASS.
58. Entrepreneurs: source unchanged, 45 read checks PASS.
59. Accounts: source unchanged, 33 checks PASS.
60. Audit: source unchanged, 97 read checks and Compliance/Audit boundaries PASS.
61. Companies: source unchanged, 680 prototype-boundary checks PASS.
62. Opportunities: source unchanged, Operation/Finance boundary suite PASS.
63. Finance: source unchanged, same boundary suite PASS; no financial execution.
64. KYC: source unchanged, 400 Compliance/Audit boundary checks PASS.
65. Menu Visibility Stage A: preserved, included in 1,223 checks.
66. Menu Visibility Stage B preparation: preserved, same suite; save/enforcement remain disabled.
67. Sidebar/navigation: byte/code-identity checks PASS; fresh interactive browser regression pending.

### I. QA (68–79)

68. TypeScript: PASS.
69. Oxlint: PASS.
70. Production build: PASS, existing chunk-size advisory.
71. Diff/whitespace checks: PASS, including untracked review files.
72. Whitelabel CRUD: 69 PASS.
73. Mock-only: 43 PASS.
74. Menu Visibility: 1,223 PASS.
75. All maintained canonical suites: 13/13 PASS (3,025 grouped checks total, not browser test cases).
76. Independent browser QA: BLOCKED by Work settings before tab access.
77. Responsive widths 1672/1440/1024/768/390/320: current runtime NOT VERIFIED.
78. Accessibility: labels/errors/live-region/focus/inert-handler source tests PASS; native keyboard,
    Escape/focus-return/mobile and browser accessibility checks pending; no WCAG certification claim.
79. Current browser console: NOT CHECKED due to tooling blocker.

### J. Documentation and gates (80–87)

80. Documentation: recovery/source/test/blocker checkpoint complete for this partial review; final browser closure pending.
81. Nest source vs Backend delivery docs vs live GET vs mock evidence: distinguished.
82. URL restrictions/Product approval: explicit.
83. Error forwarding/current 409/legacy 422/generic refusals: updated.
84. Audit: historical 500 vs current best-effort source vs deployed consistency distinguished.
85. Concurrency: still open; stale checks/exhaustive readback are not versioning/idempotency.
86. Deactivation/recovery/default-tenant risks: documented without contradicting newer delivery claims.
87. All 12 live activation gates: listed in §F.5; none claimed closed by mocks.

### K. Git (88–94)

88. Files changed: 24 patch/review paths, including 8 new files and 2 removed prototype dialogs.
    Codex refined only the existing recovered paths (tests, page role safety, mock logic, contract
    comments and documentation). No dependencies, generated screenshots or review tooling added to Git.
89. Reviewed local commit created: NO — required independent browser review has not passed.
90. New commit SHA: NONE; feature HEAD remains `e7c8683e760f552e4c69bf2ceebdae474ac3b8cd`.
91. Feature pushed: NO.
92. Dev modified/promoted: NO; canonical checkout and live origin remain baseline.
93. Netlify deployed: NO.
94. Review worktree clean: NO, intentionally retains the complete 24-file uncommitted review; canonical worktree clean.

### Explicit closure answers

- Cloud implementation fully recovered: **YES**.
- Create prepared according to confirmed Nest DTO: **YES**, with explicit stricter URL recommendation.
- Edit restricted to name: **YES**.
- Menu Visibility test exception safe without lost safeguards: **YES after refinement**, supported by tests.
- BaseUrl difference explicit/technically justified: **YES as preparation policy**; Product approval still required.
- All live Whitelabel mutations disabled: **YES**.
- Reachable Whitelabel production write capability: **ZERO found by source/real bundle inspection**;
  browser network verification still pending (existing auth login transport is outside this scope).
- Mock runners isolated from deployable application: **YES**, actual output graph confirmed.
- Authoritative reads and Menu Visibility A/B preserved: **YES by unchanged source and deterministic tests**,
  not a new authenticated UI-to-live-Backend E2E claim.
- Live business/financial mutations executed: **ZERO**.
- Ready for separate frontend-only promotion: **NO**, browser review and one local reviewed commit remain.
- Live CRUD activation: **STILL BLOCKED / NOT AUTHORIZED**, independent of frontend preparation approval.
- Remaining Backend/Product decisions: exactly §F.5; no live write should be used to settle them in this task.

## H. Account 3 browser closure — 2026-10-17

### H.1 Recovery and scope

The same isolated `feature/whitelabel-crud-safe-preparation-v1` worktree was intact at baseline
`e7c8683e760f552e4c69bf2ceebdae474ac3b8cd`. All 24 recovered/reviewed paths and prior fixes were
preserved. No patch reapplication, reset, implementation restart or new Product scope. No production
code refinement was needed in this continuation. Only this closure and the older document's status
were updated. The local commit includes the complete previously reviewed source/test changes.

Live remote refs at recovery matched `dev=e7c8683`, `main=c2235ac`, handoff=`89a3b50`.
The canonical checkout stayed clean on dev. Backend/Core, main/dev/handoff content, dependencies,
Netlify and CORS settings were not changed.

### H.2 Evidence separation and safety

1. **Live deployed homolog:** reused the authenticated built-in-browser tab, without reading or
   exporting credentials. UI-triggered list/detail/Menu Visibility requests were real GETs.
2. **Reviewed candidate:** a separate built-in-browser localhost tab rendered this worktree with
   a synthetic, non-real session. The dev-server API base was overridden only in its process to
   `http://127.0.0.1:5180/api`. Fetch/XHR requests were fulfilled with synthetic fixtures; non-GETs
   were blocked. Loopback routing also prevents an accidental native form request reaching Backend.
   The existing shared-node_modules font path was allowed in this local server's runtime options
   only. No committed config, auth code, real token, Backend or environment setting was altered.
3. **Pure/mock scenarios:** actual command/outcome/runner modules ran with injected fake ports in
   the browser. A clearly labeled temporary “MOCK QA ONLY — não é o aplicativo” harness rendered
   the existing outcome component and stale-name dialog. Mock success was never inserted into the
   application's authoritative list/detail or presented as a real tenant mutation.

Early interception setup blocked a CORS OPTIONS request, and delayed servicing caused read timeouts;
one controller timeout also required handle recovery. These are test-tooling/setup observations,
not Backend or frontend defects. After removing interception pauses from the live read path, real
GETs returned 200. The early local controller trace was incomplete; it is not claimed as an intact
whole-run capture. A fresh final safety window, recorded after stable fixture loading, covered the
complete Create/Edit review/final-button sequence and contained **zero network requests**, without
trace truncation. Live retained request observations contained no business-write method. Temporary
fixture reads and earlier partial traces are not counted as live authenticated E2E.

### H.3 Browser results

| Area | Observed result |
| --- | --- |
| Create | Three required fields; first-invalid focus; invalid name/uppercase slug/FTP refused; normalized exact three-key JSON; Enter goes only to review |
| Create final action | Double click, Enter and Space leave pending review unchanged; no request, fake success or new row |
| Draft/discard | Back-to-form preserves draft; Escape asks to discard; Continue editing keeps it; confirmed discard closes and returns focus |
| Name-only Edit | Initializes from loaded ID; only name is an input; slug/URL are facts; exact `{ name }`; unchanged name announces a persistent live note; invalid name focuses its input |
| Edit final action | Double click, Enter and Space leave Save pending; no request or persisted rename |
| Identity/history | Native browser Back closes the previous record's draft and loads the selected record; no A/B draft substitution |
| Role changes | READ_ONLY closes an open Create; SUPPORT_ADMIN closes Edit; entry points disabled; SUPER_ADMIN regain does not resurrect the old draft |
| Stale record | Actual name dialog rendered with newer mock readback: notice visible and review blocked; no payload preview or send |
| Mock outcomes in browser | 19 actual-module cases pass: Create 2xx/400/409/422-code/generic-422/403/500/503/timeout/network/raw-2xx and Edit 2xx/400/403/500/503/timeout/network/404 |
| Visible mock-only states | Confirmed/refused/uncertain presentation inspected; success uses `status`, refusal/uncertainty use `alert`; uncertain copy requires verification, not retry |
| Duplicate mock | Two immediate submissions produce exactly one injected-port call; second refused; reset blocked while pending |
| Responsive | Page, Create form/review and Edit form/review inspected at 1672, 1440, 1024, 768, 390 and 320 px; no horizontal document/dialog overflow; long URLs wrap; modal body scrolls while footer remains reachable |
| Mobile sidebar | Open/close with Escape works; modal/drawer background remains unavailable in the accessibility tree |
| Keyboard/dialog | Initial/invalid focus, native modal semantics, Escape/discard, focus return and keyboard final actions checked. Native Tab may move through browser chrome (BODY reported), then returns to dialog; no underlying application control became reachable |
| Accessibility scope | Labels, required/error relationships, read-only facts, live notes/outcome roles and visual reflow checked; not a full WCAG certification or assistive-technology test |
| Console | Fresh final candidate flow: no warnings/errors. Earlier cancelled reads/font-serving/harness setup are excluded and not misclassified as application defects |

### H.4 Authoritative GET and Menu Visibility regression

- Live `GET /api/whitelabels`: **200**, `{ data, meta }`, six records and the expected 14 row keys.
- Live `GET /api/whitelabels/7`: **200**, bare detail with `overview`; `String(id) === idKey`.
  The deployed UI rendered that authoritative record. All six returned base URLs were checked with
  the reviewed candidate's actual pure validator and accepted. No URLs/fields were silently rewritten.
- Live `GET /api/homolog/menu-visibility`: **200**, global scope, exactly the same 23 IDs. Current
  response also carries `version`, `lockedIds`, `notes`, `updatedAt`, `updatedBy`; no new capability
  is inferred from these extra fields. Deployed UI rendered 23 controls and no error.
- Candidate Menu Stage A: mocked GET source/metadata, no prototype override, 23 IDs, no persistence.
- Candidate Stage B: Dashboard/Configurações protected; hiding Financeiro keeps child preferences;
  preview changes but actual sidebar stays visible; full candidate review explains the effects;
  final Save stays inert under double click/Enter/Space. READ_ONLY has no editable switches/draft.
- Browser storage in the local test: only the two synthetic auth session keys; no localStorage or
  visibility/tenant draft persistence. No real Menu Visibility PUT or Whitelabel write was made.

This is **candidate UI against mocks + deployed homolog UI-to-live-GET validation**, not a claim that
the unpromoted candidate was deployed or its writes were exercised against live Core.

### H.5 Validation, artifacts and cleanup

Final TypeScript, oxlint, production build, whitespace/diff and **all 13 canonical suites PASS** after
temporary harness removal. Maintained counts: CRUD 69, mock-only 43, Menu Visibility 1,223; all suites
3,025 grouped assertions. Existing chunk-size advisory is non-blocking. The actual production module
graph was rechecked: 625 rendered modules (331 app modules), no runner/outcome interpreter, scripts
or fixtures. Only the review dialogs and unchanged authoritative GET code enter the application.

Fresh screenshots and `browser-qa-results.json` are local, untracked review artifacts under:
`C:/Users/User/.codex/visualizations/2026/08/28/01a047eb-4949-7663-bff7-5b0686497ccf/whitelabel-crud-safe-preparation-review-2026-10-16/browser-2026-10-17/`.
Key captures: required validation (02), Create review (03/08), Edit review (04/05/06), 320 px forms
(07/09), Menu candidate review (10), clearly labeled mock outcomes (11), stale block (12).
No generated screenshots or temporary infrastructure belong in the commit.

The two temporary root harness files were removed before validation/staging. Synthetic local auth
was cleared, raw interception/viewport overrides removed, and the temporary local tab closed. The
user's authenticated homolog tab was preserved. Local QA server runtime overrides are not persisted.

### H.6 Final classifications and authorization

**FRONTEND SAFE PREPARATION: REVIEWED / COMPLETE.** Final validations passed; this unit is to be
committed locally on the review feature branch. Exactly one local reviewed commit is authorized;
the commit SHA is reported from Git after creation (not self-embedded in this document).

**LIVE CREATE / UPDATE / ACTIVATE / DEACTIVATE / DELETE: DISABLED.** No production Whitelabel write
transport; no mock runner in the production graph. Executed live Whitelabel POST/PATCH/PUT/DELETE:
**0 / 0 / 0 / 0**. Other live business and financial mutations: **0**.

**PUSH / PROMOTION / DEPLOYMENT: NOT PERFORMED AND NOT AUTHORIZED.** Main, dev and backend-handoff
must remain unchanged. Ready only for a separately authorized frontend-only promotion; NOT for CRUD
activation. All 12 Backend/Product gates in §F.5 remain open for deployed write authorization,
including Core reply/validation/duplicate-slug evidence, tenant/default/recovery lifecycle policy,
active identity edits, Audit durability/deployed parity, concurrency/idempotency, a safe tenant with
explicit write-E2E authorization, and Product approval of the stricter URL subset.
