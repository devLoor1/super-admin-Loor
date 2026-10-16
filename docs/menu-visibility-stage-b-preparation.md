# Menu Visibility — Stage B preparation

Cloud implemented this unit from `dev` `627b1e0` in an isolated worktree (branch `work/menu-visibility-stage-b-preparation`, not pushed) and left it uncommitted for Codex review. It builds on Stage A ([`menu-visibility-read-integration-v1.md`](menu-visibility-read-integration-v1.md)), which stays unchanged in behavior: authoritative GET, strict adapter, draft, review, discard, and no write.

> **STAGE B PRODUCT RULES: PREPARED.** The approved rules drive the management screen, the isolated preview, the review and the candidate payload.
>
> **STAGE B LIVE WRITE: NOT ENABLED.** No `PUT` / `PATCH` exists in the production code. "Salvar visibilidade" stays `aria-disabled`, and mocked save outcomes live only in the test script.
>
> **REAL SIDEBAR ENFORCEMENT: NOT ENABLED.** The resolver is not wired to the sidebar, routes, login landing, dashboard shortcuts or contextual links.

> **STAGE A READ INTEGRATION: COMPLETE AND DEPLOYED.** Accepted homolog baseline:
> `627b1e040e48a4326a9a83439f3cbfbabc5a33b8`.
>
> **STAGE B FRONTEND PREPARATION: COMPLETE / REVIEWED LOCAL FEATURE COMMIT.** Independent
> Codex review on 2026-10-16 completed the narrow refinements and validation in §11.
> This is ready for separate frontend-only promotion authorization, not activation.

## 1. Approved Product decisions

The project collaborators sent these decisions, and they are approved for frontend preparation.

| # | Rule | Where it is applied |
| --- | --- | --- |
| 1 | **Dashboard cannot be hidden.** Its stored preference must stay `true`. | `visibilityPolicy.ts` (`PROTECTED_MENU_IDS`, `setDraftPreference`); locked control; resolver; review |
| 2 | **Configurações cannot be hidden.** This keeps this screen reachable. | Same as rule 1 |
| 3 | **Sistema, Configurações and Ajuda are independent.** None is a parent of another. | The registry hierarchy comes from `navigation.ts`, and all three are top-level. The resolver and the checks prove that hiding one affects no other. |
| 4 | **Hidden modules stay reachable by direct URL**, subject to Backend RBAC. | `VISIBILITY_SCOPE.directRoutes = 'unaffected'`. Each resolved entry has `directRoute: 'unaffected'`. `App.tsx` is code-identical to the baseline. |
| 5 | **Dashboard shortcuts and internal links stay available.** | `VISIBILITY_SCOPE.dashboardShortcuts` / `internalLinks = 'unaffected'`. Dashboard sources are unchanged, and the browser QA clicks a shortcut into a module hidden in the persisted configuration. |
| 6 | **No recovery screen.** Dashboard and Configurações are always visible. | Covered by rules 1 and 2. A server value breaking them is reported, never hidden. |
| 7 | **Roles.** SUPER_ADMIN reads and edits. SUPPORT_ADMIN and READ_ONLY are read-only. FINANCIAL_ADMIN and COMPLIANCE_ADMIN have no access. The Backend is the authority. | `expectedAccess` / `presentationMode` read the canonical session operator (`useSessionOperator`). The Backend 403 is shown as is. |
| 8 | **Child preferences are preserved independently** when the parent is hidden, and restoring the parent never rewrites them. | `setPreference` / `effectiveState` (unchanged) plus the resolver |

## 2. Protected modules

| ID | UI | Draft behavior |
| --- | --- | --- |
| `dashboard` | Lock chip "Sempre visível", plus the note **"Sempre visível — módulo obrigatório."** | Hiding is refused (`setDraftPreference` returns the same map) |
| `configuracoes` | Same, with **"Sempre visível — acesso à gestão de módulos."** | Same |

- **The control.** The switch stays a focusable `role="switch"` with `aria-disabled="true"`, `aria-label` "… (bloqueado)" and an `aria-describedby` explanation. Activating it changes nothing and announces (polite live region) "… não pode ser ocultado." It is not `disabled`, so keyboard and screen-reader users can reach the explanation. It never looks editable: it is dimmed, uses a `not-allowed` cursor and shows a lock.
- **Server enforcement.** Frontend protection is not enough. The Backend must reject `dashboard: false` / `configuracoes: false` before Stage B is activated (§8).

## 3. Authoritative GET integrity: server values that break the rules

If the GET returns `dashboard: false` or `configuracoes: false`:

- **The adapter keeps the value exactly.** There is no normalization. The locked switch shows the real `false` and the row explains the conflict.
- **A "Inconsistência na configuração persistida" panel** (`data-policy-violation`) names the module(s). It says the server value is shown as stored, was not changed, that this screen writes nothing, and that **a server-side fix is required**.
- **The resolver** returns `preference: false`, `sidebarVisible: true` (the rule wins in the preview), `reason: 'protected-always-visible'` and `policyViolation: true`. The preview flags the conflict.
- **The candidate is invalid.** `buildUpdateCandidate` reports `protected-hidden`, and the review shows "Mapa candidato inválido". Saving stays impossible regardless (disabled).
- **SUPER_ADMIN only:** a **"Corrigir no rascunho"** button sets the protected modules back to visible **in the draft**. It is an explicit action that appears as two changes in the review; the persisted value is untouched.
- **Nothing else happens:** no automatic PUT and no change to the real sidebar.

## 4. Sidebar-only scope (rules 4 and 5)

Menu Visibility only decides whether a module **appears in the sidebar**. It never blocks a direct URL, removes a shortcut or internal link, changes the post-login landing, or grants or revokes access.

```ts
VISIBILITY_SCOPE = {
  sidebar: 'affected',
  directRoutes: 'unaffected',
  dashboardShortcuts: 'unaffected',
  internalLinks: 'unaffected',
  postLoginLanding: 'unaffected',
  authorization: 'unaffected',
}
```

## 5. Roles (rule 7)

| Role (Backend `RoleSlug`, uppercase as returned live) | `expectedAccess` | Screen |
| --- | --- | --- |
| SUPER_ADMIN | `edit` | Editable draft, 21 editable switches plus 2 locked, review. **Save unavailable.** |
| SUPPORT_ADMIN, READ_ONLY | `read` | Persisted configuration and a preview of it. No switches, draft, bar, review, discard, correction button or Save. All 23 module states are described for assistive technology. |
| FINANCIAL_ADMIN, COMPLIANCE_ADMIN | `none` | The GET is still sent, and the Backend's **403** ("Ação não permitida", no retry) is shown. The screen is not pre-hidden by the frontend. |
| Unknown role / no operator | `none` → read presentation | Never editable. If the Backend lets them read, they see the read-only view. |

- **Multiple roles:** the most permissive known role wins (any SUPER_ADMIN means `edit`).
- **No impersonation:** there is no role impersonation or override in production. Tests stub the operator hook only inside `scripts/check-menu-visibility.mjs` and the scratch browser mock.
- **Hydration / role changes:** unresolved roles never gain edit presentation. When
  the canonical operator changes presentation mode, the editor remounts from its
  authoritative reference: an earlier editable draft or open review/discard dialog
  cannot survive into the read-only view. This is presentation cleanup, not new RBAC.

## 6. Pure resolver: `visibilityResolver.ts`

`resolveVisibility(preferences)` returns:

- `entries` / `byId`: per approved ID, in sidebar order, it gives:
  - `preference`: stored, never normalized;
  - `sidebarVisible`;
  - `reason`: `visible` | `hidden-own-preference` | `hidden-by-parent` | `protected-always-visible`;
  - `hiddenBy`, `protected`, `policyViolation`;
  - `directRoute` / `shortcuts` / `internalLinks`: always `'unaffected'`.
- `sidebar`: the visible tree (`primary`, `utility`) that the map would produce.
- `hidden`, `violations`, and `scope` (= `VISIBILITY_SCOPE`).

It performs no API calls, routing, redirects, permission checks, storage or DOM access, and it never mutates its input. Results are frozen. It is used **only** by the preview, the review and the checks.

Example (rule 8): `operacao = false`, `operation-investors = true`.

- Stored preferences stay exactly that.
- Operação is hidden (`hidden-own-preference`), and Investidores is hidden with `hidden-by-parent`, `hiddenBy: 'operacao'`.
- Setting `operacao = true` brings Investidores back. Its preference was never touched.

## 7. Candidate payload and future PUT design (mock only): `menuVisibilityUpdate.ts`

`buildUpdateCandidate(reference, draft, mode)` returns:

- `endpoint`: the documentation string `PUT /api/homolog/menu-visibility`;
- `body`: the **complete 23-ID map** of stored preferences in registry order, which is the shape the Backend requires;
- `changes` and `issues`: `protected-hidden`, `no-changes`, `read-only`;
- `valid`: protected IDs must be `true`;
- `sendable: false`: always, in this unit;
- `blockedBy`: the four activation blockers.

The reviewed builder validates both reference and draft at runtime: exactly 23 own
IDs, all boolean, no missing/extra fields. Malformed maps throw before a candidate
is built; they are not completed or stripped. A structurally valid map containing a
protected `false` remains visible in an invalid candidate, not normalized. The body
and map are frozen copies, and only the exact `edit` mode grants draft capability.

The module has **no request code**, and the existing syntax-aware checks forbid `fetch`, `apiRequest`, any write client, `method:` overrides and aliases. Two pure functions define how a future response must be read:

- **`interpretSaveOutcome(candidate, result)`:**
  - **confirmed** only for a 2xx with a valid envelope whose map **equals the candidate**;
  - **rejected** for 400/422 (invalid), 401 (session), 403 (forbidden), 409 (conflict, hypothetical: the Backend implements no 409 today) and other 4xx;
  - **uncertain** for a timeout, network failure, 5xx (including the Backend's current *saved-then-Audit-failed → 500*), a malformed 2xx, or a 2xx that does not echo the candidate. The next step is always `authoritative-readback`, **never an automatic retry**.
- **`reconcileReadback(candidate, reference, readback)`:** returns `applied` | `not-applied` | `diverged`. Without a version or ETag, a concurrent save shows up as `diverged`, and the operator must review again.

The test script injects a **mock transport** and simulates success, a normalized/echo mismatch, a malformed body, 400, 401, 403, 409, timeout, network, 500 (Audit failure) and 503. Each scenario sends exactly once, and every uncertain result leads to a read-back.

## 8. Backend changes that block activation (not implemented here)

Confirmed read-only in `backend-super-admin-Loor` `46bf79d` (unchanged; the live GET is unchanged too: 23 IDs, never saved):

| Fact today | Required change |
| --- | --- |
| PUT accepts the complete 23-ID map; unknown / missing / non-boolean → 400 (`E_INVALID_MENU_VISIBILITY`) | Keep it |
| **No protection** for `dashboard: false` / `configuracoes: false` | **A.** Reject both at the Backend boundary, with a documented error code |
| **No version / ETag / If-Match**: last write wins | **B.** Versioning or ETag with a documented conflict response (e.g. 409 + current version) |
| `get()` → `upsert` → `audit.write` are separate steps. An Audit failure after the save returns **500** although the configuration **was saved**, and the "before" snapshot can be stale. | **C.** An agreed consistency model, e.g. Audit and upsert in one transaction, or a reliable outbox, with a defined response |
| No tests for the module | **D.** Tests for: complete payload, protected IDs, unknown / missing IDs, non-boolean values, authorization (SA write; Support / RO read; Financial / Compliance 403), concurrent-update conflict, Audit behavior |

Also needed before activation:

- explicit authorization to add the write transport to the canonical client, and to run a controlled homolog write E2E;
- a central sidebar resolver wired in a separate unit. It must not touch routes, shortcuts, links or the landing.

## 9. Files

New:

- `visibilityPolicy.ts`: rules, protected IDs, scope, roles;
- `visibilityResolver.ts`: the pure resolver;
- `menuVisibilityUpdate.ts`: the pure candidate builder and response interpretation.

Changed:

- `MenuVisibilityPage.tsx`: role mode, violation panel, correction button, resolver counts;
- `VisibilityControls.tsx`: locked protected rows, read-only mode, independence note;
- `VisibilityPreview.tsx`: resolver-based sidebar preview;
- `VisibilityDialogs.tsx`: protected modules, resulting sidebar, candidate validity;
- `MenuVisibility.module.css`;
- `menuVisibilityContract.ts`: `productRules: 'prepared'` flag;
- `scripts/check-menu-visibility.mjs`: Stage B sections added, Stage A assertions kept;
- this document.

Unchanged and verified: `navigation.ts`, `Sidebar`, `AppShell`, `src/lib/*`, the dashboard, and the `App.tsx` code.

## 10. Cloud-reported QA (delivery history)

The following counts describe Cloud's reported run, not Codex's independent review.
They are retained as provenance, not claimed as independently reproduced browser
or axe totals. See the independent review section below for current evidence.

- **Static checks:** `npx tsc -b` and `npx oxlint` are clean, `npm run build` passes, and `git diff --check` is clean.
- **`node scripts/check-menu-visibility.mjs`:** all Stage A assertions plus the Stage B sections pass. Eight planted bugs were all detected:
  - protected module hideable;
  - protected module hidden in the sidebar;
  - SUPPORT_ADMIN able to edit;
  - 5xx treated as rejected;
  - read-only role shown controls;
  - candidate made sendable;
  - resolver wired into the sidebar;
  - locked switch using `disabled`.
- **Other suites:** every other `scripts/check-*.mjs` suite passes unchanged.
- **Stage B browser flow: 117/117.** It ran on a production build and a scratch mock: the observed GET contract plus per-role guards and synthetic violation, missing-ID and error scenarios. It covered:
  - locked controls (mouse and keyboard);
  - the hidden parent and the kept child preference;
  - the Sistema / Configurações / Ajuda independence;
  - the review with an inert Save;
  - a server violation with explicit draft correction;
  - SUPPORT_ADMIN and READ_ONLY read-only;
  - the FINANCIAL_ADMIN and COMPLIANCE_ADMIN 403;
  - direct routes and dashboard shortcuts into modules hidden in the persisted configuration;
  - the real sidebar compared with the `627b1e0` build;
  - six widths with the mobile drawer; axe with 0 WCAG A/AA violations in every audited state;
  - storage.

  Totals: 24 menu-visibility GETs and **0 PUT / PATCH / POST / DELETE**.
- **Stage A browser flow re-run as SUPER_ADMIN on the same build: 201/201.** Two expectations were updated to the approved rules: the persisted hidden count no longer counts the protected Dashboard, and the self-hide rows now show the conflict note.
- **Regression against the `627b1e0` build** shows no difference:
  - sweep 160 states / 0 fails; keyboard 34/34; axe 0 violations in 116 states; KYC 100/100; Dashboard v2 160/160;
  - Operation 114/114 and keyboard 19/19; links 71 / 0 broken; taxonomy OK; Gateways 72/72; Modalities 58/58;
  - auth 26/27 (same known artifact); pixel diff 90/90 identical;
  - module flows match the baseline: Whitelabel 103/103, Investors 98/98, Entrepreneurs 123/123, Accounts 120/120, Audit 101/101, Whitelabel CRUD 96/98 (same 2 copy checks), Dashboard 82/88 (same clock-dependent checks);
  - Companies 109/109. Its first run timed out at the same 2-second skeleton wait on **both** builds under load; the reruns passed on both.

## 11. Independent Codex technical review — 2026-10-16

### Recovery and scope

Live fetched `origin/dev` matched `627b1e0`; canonical worktree was clean. No local
Cloud implementation existed. The supplied 13-file patch passed `git apply --check`
and was applied exactly once in an isolated worktree on
`feature/menu-visibility-stage-b-preparation`. No prior work was discarded.

All eight Product decisions in §1 are respected. The authoritative GET adapter,
canonical client, shared abortable read hook, navigation, sidebar, App executable
code, auth/session, Dashboard, other modules and dependency manifests are unchanged
from the accepted Stage A baseline. No new stable ID; Companies remains excluded.

### Review findings resolved

1. **Candidate runtime validation.** The delivered builder relied on TypeScript and
   could label a partial/non-boolean map valid. A new maintained test failed before
   the fix. Both maps now require exactly 23 own boolean fields; unknown/missing
   fields are rejected, not normalized. Candidate payloads are frozen copies; an
   unknown runtime presentation mode fails closed. A protected false inherited from
   GET remains visible in a policy-invalid candidate until explicit draft correction.
2. **Role hydration.** Local browser reproduction showed a stale review dialog
   remaining after SUPER_ADMIN changed to SUPPORT_ADMIN, although switches vanished.
   Keying the editor by presentation mode removes stale edit state/dialogs/listeners.
   The final production-build browser retest passed with a deliberately held
   synthetic `/auth/me` response. No shared auth/RBAC implementation changed.
3. **Mock test quality.** Strengthened test-only orchestration proves one send under
   duplicate activation, confirmed replay refusal, uncertain-outcome readback gating,
   and applied/not-applied/diverged decisions. It cannot be reached from production.
   Eight in-memory mutation controls independently exercise the reported fault
   classes; they never modify files or send requests. An unused planted import was
   made executable in the test fixture so TypeScript would not legitimately erase it.
4. **Documentation provenance.** Corrected stale Stage A publication wording. Cloud
   counts in §10 remain historical claims, distinct from the independent results here.

### Fresh maintained validation

- TypeScript, oxlint, production Vite build and `git diff --check`: PASS.
- Menu Visibility: **1,171 PASS** (delivered suite was independently 1,067 before
  refinements). Existing assertions retained; runtime, mock-safety and mutation
  controls added rather than weakening a gate.
- Other eleven suites: **1,729 PASS**: Accounts 33, Audit 97, Companies 677,
  Compliance/Audit 400, Dashboard 45, Entrepreneur 45, Investor 42,
  Operation/Finance 285, URL search 14, Whitelabel CRUD 42, Whitelabel/Auth 49.
  Companies gains three source-capability checks for the new modules; no waiver.
- Total maintained: **2,900 PASS**. Inherited bundle-size and Vite timing advisories
  remain non-blocking; no dependency added.
- Tests combine executable adapters/pure models, rendered controls/page states,
  deterministic hook/guard lifecycle tests and syntax-aware capability/import
  boundaries. Narrow copy/source tripwires complement behavior; they are not E2E.

### Fresh browser evidence — local synthetic only

The actual production build ran in the Codex built-in browser with a disposable
loopback-only fixture API. It never proxies/contacts a real Backend. Only synthetic
credentials/token were used through the normal local login; no source auth bypass,
runtime switch, environment file, temporary server or screenshot is included in Git.
The existing homolog tab/session was not touched. These tests do **not** claim a
deployed Stage B UI-to-live-Backend E2E.

**141 valid scoped browser assertions passed**, including:

1. **Protected default controls — healthy.** Dashboard/Settings labelled always
   visible, focusable `aria-disabled`, mouse/Space/Enter inert, live explanation.
2. **Draft/hierarchy/review — healthy.** Operation/Investor and Finance/Wallet retain
   child preferences, independent utilities, exact candidate, effective consequences,
   unavailable Save, reference-preserving discard and no browser draft persistence.
3. **Policy conflict — healthy.** Both authoritative false values shown unchanged;
   invalid review; explicit correction changes only draft and leaves metadata/reference
   unchanged. Read-only roles receive no correction action.
4. **Roles — healthy.** SUPER_ADMIN edits locally; Support/Read-only have 23 described
   states, no switches/draft/review/Save. Financial/Compliance use controlled 403 with
   no fallback/retry. Unknown/missing roles never gain editing; hydration regression fixed.
5. **Stage A reads — healthy.** Loading, error/explicit retry, actual 20-second client
   timeout, 401 cleanup, 403/404/429/5xx/network, malformed/missing-ID, diagnostic-only
   unknown ID, legacy URL ignored, abandoned late response cannot overwrite new edits.
6. **Navigation/regression — healthy within scope.** Dirty navigation/Back/stay/discard,
   listener cleanup, actual sidebar unchanged, Dashboard shortcut into persisted-hidden
   Finance, direct routes and contextual Company link. Auth, Dashboard, Whitelabels/
   pending CRUD, Accounts, Investors, Entrepreneurs, Audit, Companies/Opportunities,
   Finance and KYC route/shell smoke. Other live-read modules intentionally receive
   unavailable local fixtures; no integration claim for blocked domains.
7. **Responsive/accessibility — healthy within scope.** Full state matrix at 1672,
   1440, 1024, 768, 390 and 320; no document/dialog horizontal overflow. Locked
   descriptions, keyboard state/focus, dialog focus trap/Escape/return, invalid
   explanation and footer reachable at 320, mobile drawer/Escape checked. No full
   WCAG certification or independently rerun axe-total claim. Native reload-prompt
   buttons were not exercised; callback/listener and Back behavior are separate evidence.
8. **Safety — healthy.** Complete untruncated browser trace; all requests stayed on
   loopback. **71 Menu Visibility GETs, zero configuration PUT/PATCH/POST/DELETE**;
   only two synthetic local login POSTs. Zero business/financial mutations, console
   warning/error entries or uncaught runtime exceptions observed. Exact storage
   snapshots unchanged during drafting/discard/navigation; intentional 401/logout
   auth clearing is not visibility persistence. Local logout and Back guard passed.

Two scratch assertions were corrected rather than classified as application defects:
the focus query needed to recognize native `<dialog>`, and the mobile confirmation
query needed its accessible name to distinguish it from the drawer. Both corrected
behavioral checks passed. Cloud's broader historical browser totals are not reused.

Numbered screenshots, step notes and sanitized aggregate evidence are retained
outside Git in `menu-visibility-stage-b-review-2026-10-16`. No raw credentials,
tokens, account DTOs, recovery patch, fixture server or QA artifacts enter this commit.

### Activation remains blocked

Frontend preparation is technically complete and ready for **separate frontend-only
promotion approval**. Nothing was pushed/promoted/deployed in this review. Real write
and real sidebar enforcement remain OFF. Backend requirements A–D in §8 are still
unresolved delivery gates, not silently completed frontend tasks. All eight Product
decisions are resolved for this unit; future activation still requires explicit
authorization and contract/runtime validation after those Backend deliveries.
