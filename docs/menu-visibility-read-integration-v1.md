# Menu Visibility Integration V1 — Stage A

Cloud implemented this unit from `dev` `bb9bef0` and delivered an unapplied
14-file patch for Codex review. It builds on
[Menu Visibility Frontend V1](menu-visibility-frontend-v1.md), the reviewed
management prototype.

**Release boundary:** Stage A is complete in the local feature code only.
It is **NOT YET DEPLOYED** to the Netlify homolog frontend; promotion requires
separate authorization. A live Backend GET validates the API contract, not
deployment of this frontend branch or its UI-to-live-Backend E2E.

> **MENU VISIBILITY INTEGRATION V1 — STAGE A**
>
> **AUTHORITATIVE CONFIGURATION READ: INTEGRATED** (validated against homolog).
>
> **GLOBAL CONFIGURATION UPDATE: NOT ENABLED.** No `PUT` / `PATCH` is sent; "Salvar visibilidade" stays disabled.
>
> **REAL NAVIGATION ENFORCEMENT: NOT ENABLED.** The sidebar, shortcuts,
> direct routes, route resolver and post-login landing ignore visibility.

## 1. Evidence

| Class | Source |
| --- | --- |
| **Live homolog** | 2026-10-15. Authenticated `GET`s only, run from the operator's existing SUPER_ADMIN session on the Netlify origin. Only structure, types, ID lists and status codes were recorded: no token, no header values, no operator identifiers. |
| **Backend source (read-only)** | `backend-super-admin-Loor` `46bf79d` (`dev` = `homolog`): `src/modules/menu-visibility/{menu-visibility.controller.ts, menu-visibility.service.ts, menu-ids.ts, dto/update-menu-visibility.dto.ts}`, `prisma/schema.prisma` (`MenuVisibilityConfig`), migration `20261015180000_menu_visibility`, `common/guards/{jwt-auth,roles}.guard.ts`, `common/filters/http-exception.filter.ts`, `modules/audit/audit.service.ts`, `docs/arthur-demands-backend-v1.md` (Demanda 5), `README.md`. |
| **Local implemented UI** | A production build exercised in headless Chromium against the scratch mock Control Plane. The mock reproduces the observed envelope plus synthetic edge cases. This is not a Backend E2E test. |

The Backend has **no automated tests** for this module (no spec under `src/modules/menu-visibility` and none in `test/`).

## 2. Live GET contract

```
GET /api/homolog/menu-visibility
Authorization: Bearer <token>

200 {
  "data": {
    "scope": "global",
    "visibility": { "<23 stable IDs>": true | false },
    "updatedAt": null | "<ISO-8601 instant>",
    "updatedBy": null | "<Control Plane operator id>"
  }
}
```

| Item | Live result |
| --- | --- |
| Status | 200 (about 2 s; Render) |
| Envelope | top-level `data` only; `data` keys `scope`, `visibility`, `updatedAt`, `updatedBy` |
| Scope | `"global"`; query parameters (`?scope=whitelabel&whitelabelId=4`) are ignored and give the same answer |
| Known IDs | **23**, in the same order as `menuRegistry.ts`; all values boolean |
| Missing IDs | none |
| Unknown IDs | none |
| `updatedAt` / `updatedBy` | both `null`: no configuration was ever saved, so all values are the Control Plane defaults (`true`) |
| Headers | `application/json`; `X-Correlation-ID` echoed; **no `ETag`, no `Last-Modified`, no `Cache-Control`** |
| Stability | two repeated reads were identical |
| No / invalid Bearer | 401 `{ statusCode, code: "UNAUTHORIZED", message, details }` |
| Unknown sub-path | 404 `HTTP_ERROR` ("Cannot GET …") |

**Role authorization (source; only SUPER_ADMIN was available live):**

- GET: `@Roles(SUPER_ADMIN, SUPPORT_ADMIN, READ_ONLY)`. `FINANCIAL_ADMIN` and `COMPLIANCE_ADMIN` get 403 `FORBIDDEN` "Insufficient role". SUPER_ADMIN always passes (`RolesGuard`).
- PUT: `@Roles(SUPER_ADMIN)` only.

**Docs vs runtime:** they agree. Demanda 5 documents the paths, roles, full-map PUT, unknown / non-boolean → 400, missing → visible and the Audit action. The docs do not specify:

- the GET envelope (`scope` / `updatedAt` / `updatedBy`);
- that `updatedBy` is an operator **id**, not a name;
- the 403 for Financial / Compliance admins.

## 3. Persistence rules

| Rule | Status | Evidence |
| --- | --- | --- |
| Persisted in the Control Plane (Prisma `menu_visibility_configs`), not in Core | **CONFIRMED** | schema, migration, service |
| One global configuration (singleton row `id = "global"`, `scope = "global"`) | **CONFIRMED** | service, live `scope` |
| GET returns every known ID | **CONFIRMED** | service loop over `KNOWN_MENU_IDS`; live 23/23 |
| Missing stored value → visible (`true`) | **CONFIRMED** (server-side) | `defaultVisibilityMap()` and the loop; docs |
| Non-boolean stored value for a known ID → `true` on read | **CONFIRMED** (server-side) | service loop |
| Unknown IDs on **write** → 400 `E_INVALID_MENU_VISIBILITY` | **CONFIRMED** | `assertVisibilityMap` |
| Unknown IDs on **read** | **UNCLEAR** | GET spreads the stored JSON, so a stored key outside `KNOWN_MENU_IDS` would be passed through. That happens only if the Backend registry shrinks or the row is edited directly. A registry that **grows** produces "unknown" IDs from this frontend's point of view. |
| PUT replaces the whole map; partial / missing ID → 400; non-boolean → 400; body must be exactly `{ visibility }` (global `forbidNonWhitelisted`) | **CONFIRMED** | DTO and `assertVisibilityMap`; `main.ts` ValidationPipe |
| Partial updates (PATCH) | **NOT IMPLEMENTED** | no route |
| Version / ETag / If-Match / 409 | **NOT IMPLEMENTED** | no field, header or check; live: no `ETag` |
| Concurrent updates | **Last write wins** (NOT IMPLEMENTED protection) | plain upsert |
| Transactional update | **NOT IMPLEMENTED** | `get()` (before), `upsert` and `audit.write` are three separate operations with no `$transaction`. If the Audit write fails, the change is already persisted but the request answers 500. The "before" snapshot can be stale under concurrency. |
| `updatedAt` authoritative | **CONFIRMED** | Prisma `@updatedAt`; `null` when no row |
| `updatedBy` authoritative | **CONFIRMED** as the saving operator's Control Plane id (cuid), not a name or e-mail | service: `updatedBy: meta.operatorId` |
| Audit on update | **CONFIRMED** (source): `UPDATE_MENU_VISIBILITY`, `resourceType: menu_visibility`, `resourceId: global`, `beforeData { visibility }`, `afterData { visibility, changed }`, correlation id, IP, user agent | service and `audit.service.ts` |
| Idempotent PUT | **Partly.** The same map gives the same state, but `updatedAt` / `updatedBy` change and an Audit row with an empty `changed` is written. | service |
| PUT response | **CONFIRMED** (source): same envelope as GET | service |
| Visibility ≠ RBAC | **CONFIRMED** | Swagger summary "not authorization"; docs; no guard reads the configuration |

## 4. Product / navigation rules

| Question | Status |
| --- | --- |
| Actual hierarchy | **Frontend-only.** Plataformas, Operação, Financeiro and Compliance have children. Dashboard, Sistema and Auditoria are top-level primary items. Configurações and Ajuda are top-level utilities. The Control Plane stores the 23 IDs as a **flat** map, with no hierarchy. |
| Can Dashboard be hidden? Post-login landing then? | **NOT DEFINED.** PUT accepts `dashboard: false`, and no fallback landing is specified. |
| Can Configurações hide itself? How is it restored? | **NOT DEFINED.** PUT accepts `configuracoes: false`, and no recovery path is specified. |
| Does Sistema govern Configurações / Ajuda? | **NOT DEFINED.** They are independent in the current navigation and in the Control Plane, and the frontend keeps them independent. |
| Direct routes to a hidden module (block / redirect / unavailable screen, fallback destination) | **NOT DEFINED** |
| Dashboard shortcuts and contextual links | **NOT DEFINED** |
| Visibility affects presentation only; RBAC independent | **CONFIRMED** (docs + source) |
| Recovery from a configuration hiding every useful destination | **NOT DEFINED** |
| Who sees the configuration applied (Financial / Compliance admins cannot read it: 403) | **NOT DEFINED.** This is a new Stage B question. |
| Company menu identity | **None.** Companies stays a contextual view under Empreendedores. `operation-companies` is not approved, not in the Backend registry and not added. |

## 5. Gates

- **Gate A — authoritative GET: PASSED.**
  - The live GET works and the envelope is clear.
  - The 23 IDs map one-to-one onto the registry.
  - Missing-ID behavior is defined (the server normalizes every known ID).
  - The unknown-ID policy is safe: ignore them and report drift.
  - Role authorization is understood.
  - No fallback is needed.
- **Gate B — real visibility + PUT: NOT READY.** It is blocked by:
  - no concurrency protection;
  - Audit outside the transaction;
  - no Dashboard-hidden, Configurações self-hide, direct-route, shortcut or recovery policy;
  - no decision on how 403 roles are treated.

## 6. Frontend behavior (Stage A)

Route `#/settings/menu-visibility` (existing `configuracoes` entry). Files in `src/features/menu-visibility/`:

| Layer | Where | Notes |
| --- | --- | --- |
| A. Stable registry | `menuRegistry.ts` | Unchanged: 23 IDs; labels, icons, order and hierarchy read from `navigation.ts`. |
| B. Authoritative configuration | `menuVisibilityApi.ts` → `menuVisibilityContract.ts` (`parseMenuVisibilityResponse`) | The only request: `authenticatedGet('/homolog/menu-visibility', { signal })`. Bearer, X-Correlation-ID, 20 s timeout, cancellation, session-change discard and central 401 handling are all in the canonical client. Returns a fresh frozen copy plus a client `readAt`. |
| Request model | `useVisibilitySource.ts` → `useRemote('menu-visibility', …)` | Shared abortable model: one read per mount plus explicit retries. A retry or unmount aborts the previous read, so a late answer never replaces a newer one. No automatic retry. |
| C. Draft | `MenuVisibilityPage.tsx` (component state) | The reference is captured **once per mount** (`useState(loaded)`, no setter). The draft starts equal to it and is edited independently; both maps are frozen. |
| D. Effective preview | `visibilityModel.ts`, `VisibilityPreview.tsx` | Unchanged model: `childEffective = parentEffective && childPreference`. A parent never rewrites child preferences. |
| E. Future persistence | `putRequestPreview()` | Builds the complete map a Stage B PUT would carry. It is shown in the review as "não enviado". There is no PUT request code. |

### Adapter rules

The adapter is strict on identity and tolerant of nothing it would have to guess:

- **Rejected as malformed** (nothing shown):
  - anything other than `{ data: { scope: "global", visibility: {…}, updatedAt, updatedBy } }`;
  - `scope` other than `"global"`;
  - a non-boolean value for a known ID;
  - an invalid `updatedAt`, or one that isn't an ISO instant;
  - an `updatedBy` that isn't `null` or an identifier.
- **Missing approved ID → "Registro de módulos divergente"** (nothing shown). The Control Plane fills every known ID itself, so a missing one means the two registries differ, and a full-map PUT would be rejected. The frontend never re-applies the all-visible default.
- **Unknown IDs → ignored and reported.** They never become items or routes. A non-blocking drift notice lists them (capped at 20; unsafe keys masked).
- **`updatedAt: null` → "Nunca salva — valores padrão informados pelo Control Plane"**, so defaults are never presented as a saved row.

### Screen

| Element | Behavior |
| --- | --- |
| Source labels | A legend names **Configuração persistida** (values read from the Control Plane), **Rascunho** (local, not saved), **Prévia** (effective visibility calculated from the draft) and **Aplicação real** (pending: sidebar, shortcuts and routes do not use it). |
| "Configuração persistida" panel | Shows: situation (saved / never saved); last update in Brasília time with `<time datetime>`; updated by (operator id, labelled as such, or "—"); hidden modules in the persisted configuration; read time. When the persisted configuration hides modules, the panel says the real sidebar does **not** apply it yet. |
| "Rascunho" panel | Number of changes, modules hidden in the preview, and "Salvar e aplicar ainda não estão habilitados — Leitura integrada. Aplicação e persistência aguardam validação das regras e autorização. Nada é enviado." |
| Rows | A changed row shows "Alterado" and its persisted value; the screen-reader description includes it too. Dashboard / Configurações warnings stay, now saying the rule is not defined by Product and Backend. |
| Review | Primary diff = preference changes against the persisted configuration. Then effective consequences, then the full candidate map (not sent). "Salvar visibilidade" is `aria-disabled` and inert: no request, no success state, no local `updatedAt` / `updatedBy`, no Audit. |
| Discard | "Descartar alterações não salvas". The draft returns to the persisted reference. The dialog says so, and nothing is fetched or sent. |
| Unsaved changes | Shared guard unchanged: in-app navigation asks first, and reload / close triggers the native warning. After a reload a fresh authoritative read starts with no draft. |
| Loading | Skeleton and status text; no switches and no values. |
| Errors | All without fallback preferences. Mapping: 401 → canonical session invalidation (Login, "Sua sessão expirou"); 403 → permission denied, no retry; 404 → "Configuração não disponível neste ambiente" + retry; 5xx / 429 / timeout / network / malformed / registry mismatch → specific safe copy + retry. A correlation code is shown when available, and raw Backend messages never are. |
| Real navigation | `navigation.ts`, `Sidebar`, `AppShell`, the dashboard, `src/lib/*` and the `App.tsx` code (route resolver, session guard, landing) are byte-identical to `bb9bef0`. Only comments changed in `App.tsx`. No menu-visibility read happens outside this screen. |
| Prototype preview | `?previa=` was **removed** from the production flow, together with `prototypeVisibility.ts` and the request-free fake states. A leftover `?previa=…` is only reported as an ignored parameter: the persisted configuration still loads and renders. Synthetic states now live only in tests (`scripts/check-menu-visibility.mjs`, mocked responses). |
| Storage | None: no localStorage, sessionStorage, IndexedDB, cookies or URL. The configuration and draft live only in the page's memory. |

## 7. Stage B boundary (not implemented)

What the live contract requires from a future update:

- **Request.** `PUT /api/homolog/menu-visibility` with exactly `{ "visibility": { <all 23 IDs>: boolean } }`, SUPER_ADMIN only. Add the write transport to the canonical client in that unit; none exists today.
- **Success** is shown only after a 2xx validated by `parseMenuVisibilityResponse` (same envelope). Then replace the reference with that answer, or do an authoritative read-back. No optimistic update.
- **Uncertain outcome.** A timeout, network failure, 5xx or malformed answer does **not** prove failure: the Backend may have persisted before failing on Audit. Copy already exists: "pode ou não ter sido aplicada". The next step is a read-back, never a blind retry.
- **400** → map refused, nothing applied. **403** → not allowed.
- **Concurrency.** Without a version or ETag, a PUT silently overwrites a newer change. Before enabling save, the Backend should add optimistic concurrency (`version` or `ETag` / `If-Match` → 409). The frontend `conflict` copy is ready. At minimum the UI must compare a fresh read with the reference before sending, which still leaves a race.
- **Audit** is written by the Backend only. The frontend never creates Audit records. Making Audit and the upsert transactional is recommended.
- **Enforcement** must go through **one** central resolver (sidebar, shortcuts, direct routes, landing) driven by the effective map. It must not read the configuration from this management screen. It needs the Product rules in §4 and a recovery path, for example: Configurações cannot be hidden for SUPER_ADMIN, or a direct `#/settings/menu-visibility` always works.
- **Roles.** Decide what FINANCIAL_ADMIN / COMPLIANCE_ADMIN see when GET answers 403, and whether SUPPORT_ADMIN / READ_ONLY get a read-only screen (PUT is SUPER_ADMIN only).

## 8. Cloud QA report (historical delivery evidence)

The results below were supplied with the Cloud patch. They are not new Codex
executions, and scratch-runner exceptions are not waivers of maintained tests.

- `npx tsc -b` and `npx oxlint` are clean, `npm run build` passes, and `git diff --check` is clean.
- `node scripts/check-menu-visibility.mjs` passes **800 checks**: synthetic fixtures; canonical client with a recording fetch double; mocked PUT answers and failures; a run-wide GET-only assertion. Planted mutants were all detected: missing ID → default, all-visible default, PUT method, error → fallback.
- All other `scripts/check-*.mjs` suites pass unchanged.
- **Browser QA** passes **201/201**. It ran on a production build (headless Chromium) against the scratch mock Control Plane, which uses the observed envelope. Coverage:
  - never-saved and saved configurations;
  - real sidebar compared with the `bb9bef0` build;
  - direct routes; post-login landing with persisted `dashboard: false`;
  - draft, review, the inert Save and discard;
  - the unsaved-change guard and reload;
  - stale-answer protection: an abandoned read released late does not replace the newer reference or the edited draft;
  - 403 / 404 / 5xx / HTML / malformed / registry mismatch / network / 20 s timeout / 401 (session invalidation);
  - unknown IDs; `?previa=`; persisted self-hide;
  - six widths (1672 to 320) with the mobile drawer; keyboard and focus; axe (0 WCAG A/AA violations in every audited state); storage.
  - Totals: 39 menu-visibility GETs and 234 GETs in all. The only non-GET was 1 POST, the mock login of the landing test. **Zero PUT / PATCH / DELETE.**
- **Regression against `bb9bef0`** shows no difference:
  - sweep 160 states / 0 fails; keyboard 34/34; axe 0 violations in 116 states; KYC 100/100; Dashboard v2 160/160;
  - Operation 114/114 and keyboard 19/19; links 71 / 0 broken; taxonomy OK; Gateways 72/72; Modalities 58/58;
  - auth 26/27 (same known artifact as the baseline); pixel diff 90/90 identical;
  - module flows identical to the baseline: Whitelabel 103/103, Investors 98/98, Entrepreneurs 123/123, Companies 109/109, Accounts 120/120, Audit 101/101, Whitelabel CRUD 96/98 (same 2 copy checks);
  - Dashboard 82/88, the same clock-dependent checks as the baseline.

## 9. Codex technical review — 2026-10-16

### Recovery and release state

- Fetched live origin: `dev` remained exactly
  `bb9bef0d563964637cd8d8306a13755ce6ca5545`; clean Desktop worktree.
- Created `feature/menu-visibility-read-integration-v1` from that exact SHA.
  The Cloud patch passed `git apply --check`, was applied once, and passed
  reverse-check before refinements: all 14 files recovered, nothing lost.
- Reviewed every changed file. `navigation.ts`, shared shell/client/guard,
  Auth, Dashboard and unrelated domains remain unchanged. `App.tsx` differs
  only in comments. No dependency change or production test override.
- No runtime/frontend redesign was needed. Codex refinements are limited to
  maintained test quality and documentation. No push, dev promotion or deploy.

### Independent contract evidence (A)

One authenticated GET from the existing Codex built-in homolog browser returned
HTTP 200, `{ data: { scope, visibility, updatedAt, updatedBy } }`, global scope,
exactly the 23 approved boolean IDs, all visible, and both metadata fields null.
No token/header values or operator identity were recorded. No PUT/PATCH/DELETE
was sent. No ETag/Last-Modified/Cache-Control was exposed; correlation was present.

Read-only GitHub source inspection at
`46bf79df5652126d46b9fe03d8c5d9eba431818d` independently confirmed the controller,
service, stable IDs, DTO and role guard. Read roles and full-map PUT restrictions
match this document. GET currently passes through unknown stored keys in source;
its intended long-term policy still needs confirmation. No Backend file changed.

This proves the live Backend contract only. The reviewed frontend was not
deployed or exercised UI-to-live-Backend: its browser evidence below is local
and synthetic, not live E2E.

### Maintained validation

- TypeScript, oxlint and production Vite build: PASS. Only inherited bundle-size
  and build-timing advisories; no new dependency or generated artifact in Git.
- All 12 maintained suites: **2,564 PASS**, including Menu Visibility
  **838** (Cloud delivery 800, plus 38 review assertions). Other suites: Accounts
  33, Audit 97, Companies 674, Compliance/Audit 400, Dashboard 45, Entrepreneur
  45, Investor 42, Operation/Finance 285, URL search 14, Whitelabel CRUD 42,
  Whitelabel/Auth 49. Historical scratch exceptions above were not used as waivers.
- Restored syntax-aware transport/storage detectors removed by the patch's
  regex-only replacement. Computed `fetch`/storage access, aliased imports and
  write clients are rejected; only the narrow canonical GET import is allowed.
- Added deterministic execution of the actual shared read hook: overlapping
  reads, explicit retry, old response arriving after the newer one, unmount
  cancellation, late abandoned success, error without fallback/automatic retry,
  recovery and silent cancellation. These committed-effect doubles do not
  claim to model all React scheduling; browser checks complement them.
- Existing behavior-level adapter/model/rendered-component and shared dirty
  guard checks remain intact. Tests were strengthened, not waived.

### Local implemented-UI / synthetic browser evidence (B/C)

The production build was served on loopback only, using a disposable fixture
API that never proxies or contacts the real Backend. Its login used explicitly
synthetic credentials/token only. No auth bypass, fixture server, screenshot,
patch or evidence file is included in Git; temporary tooling is removed before
commit. No production code/configuration was changed to support testing.

Captured and inspected flow:

1. **Initial read / defaults — healthy.** Loading has no preferences; a valid
   never-saved response yields 23 clean switches, Backend-default wording and
   no invented update timestamp/operator. Client read time is distinct.
2. **Saved reference / draft — healthy.** Synthetic saved false values are
   preserved. Changes compare against that frozen reference, not all-visible
   defaults. Parent/child preferences remain independent; effective visibility
   and original persisted values are explained. Real sidebar is unchanged.
3. **Review / discard — healthy.** Correct own-preference diff, separate
   consequences and full 23-key map labelled not sent. Mouse/Enter/Space on
   pending Save do nothing; it is type=button with no submitting form. No
   success, metadata update or Audit event. Discard restores saved false values.
4. **Unsaved navigation / staleness — healthy.** Revert/discard/unmount remove
   listeners. Sidebar leave and Back require confirmation; clean re-entry
   reads again. An abandoned held response released after a newer reference
   and edited draft cannot replace either. Dirty unload callback is maintained
   test evidence; native reload-prompt button interaction is not claimed.
5. **Errors / retry — healthy.** 401 clears the session centrally; 403 retains
   it and offers no retry. 404/429/503/network, actual 20-second client timeout,
   malformed response and missing-ID mismatch show safe feedback with no
   illustrative fallback. Explicit retry recovers. Unknown IDs yield a visible
   diagnostic, never a new menu. A leftover `?previa=erro` cannot override GET.
6. **Responsive / accessibility — healthy within scope.** Initial saved,
   parent-hidden/child-retained, multi-change draft and review inspected at
   **1672, 1440, 1024, 768, 390, 320**. No document/dialog horizontal overflow;
   actions remain reachable. Named switches, state/descriptions, keyboard
   Space/Enter, visible focus ring, dialog initial focus/Escape/return and mobile
   drawer checked. Not a full WCAG certification; switch targets are 42×24 px.
7. **Regression / boundaries — pass in tested scope.** Local route/shell
   smoke covered Dashboard, Whitelabels/pending CRUD, Accounts, Investors,
   Entrepreneurs, contextual Companies, Audit, Opportunities, Finance Core and
   KYC. Non-Menu live-read modules used controlled unavailable fixtures, not
   real data; maintained suites are the deeper regression gate. With a saved
   hidden Dashboard, login still lands on Dashboard and direct routes remain
   available. No new integration claim is made for other domains.
8. **Storage / network / console — pass.** Exact local/session storage,
   cookies and IndexedDB snapshots match after drafting/review/discard/reload
   (apart from deliberate synthetic auth clearing/re-login in the 401 test).
   The complete untruncated local trace records **108 requests**, including
   **18 Menu Visibility GETs**, **zero Menu Visibility writes**, and just two
   synthetic localhost login POSTs. All local-app requests stayed on loopback;
   no business/financial write or real credential was involved. Console
   warning/error entries and uncaught runtime exceptions observed: **0**.

Screenshots and a sanitized ledger are retained outside the repository. Native
prompt interaction and a full reviewed-branch UI-to-live-API E2E remain unclaimed.

**Stage A is ready for separate promotion authorization. Stage B is not
implemented or authorized.** Concurrency/conflict protection, transactional
save/Audit, Backend tests/unknown-ID policy and the Product/navigation/role
decisions in §§4–7 remain prerequisites, not frontend tasks silently completed.
