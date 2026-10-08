# Compliance › KYC V1 + Governança › Auditoria V1 — local implementation record

Initially implemented by Claude on 2026-10-08 in the uncommitted working tree
of `feature/super-admin-compliance-audit-v1`, baseline
`9f8abc6d55410e63a2edaf6d8efeafcd217b7a30` (= `dev`, "feat: add finance core
v1 supervision"). Codex independently reviewed that intact worktree, made
the narrow corrections in §12, and consolidated it into one local feature
commit. The prototype is technically ready for final user review, not yet
approved for promotion. No push, deployment or Backend operation was performed.

Module records: [Compliance › KYC V1](compliance-kyc-v1.md) ·
[Auditoria V1](governance-audit-v1.md). Approved compositions (visual
references only; values are illustrative):
[`reference/super-admin-compliance-kyc-approved.png`](reference/super-admin-compliance-kyc-approved.png),
[`reference/super-admin-governance-audit-approved.png`](reference/super-admin-governance-audit-approved.png).

## 1. Scope and navigation

- **Compliance └─ KYC** (only nested entry) and **Auditoria** as its own
  top-level destination. No Monitoramento, Relatórios, Políticas e regras or
  Dot Matrix destinations and no "Governança" sidebar group were added; the
  top-level shell (Dashboard, Plataformas, Operação, Financeiro, Compliance,
  Sistema, Auditoria + utilities) is unchanged.
- Routes: `#/compliance/kyc`, `#/compliance/kyc/:kycCaseId`, `#/audit`,
  `#/audit/:auditEventId` — all behind the existing session guard (they are
  `SHELL_VIEWS`; without a token they redirect to `#/login`).

## 2. Domain architecture

| | Compliance › KYC | Auditoria |
| --- | --- | --- |
| Folder | `src/features/compliance-kyc/` | `src/features/governance-audit/` |
| Model | `kycModel.ts` (cases, evidences, pending issues, decisions, prototype states) | `auditModel.ts` (events, modules, actions, resource types, actors, reference date) |
| Data | `prototypeKyc.ts` — 23 deeply frozen cases | `prototypeAudit.ts` — 28 deeply frozen, sanitized events |
| State | `kycStore.ts` — in-memory session store holding **only** KYC cases + KYC session activity (`useSyncExternalStore`; lost on reload) | none — read-only; nothing can append or change an event |
| Helpers | `kycRefs.ts` (live participant resolution, destinations), `kycLinks.ts` (navigation into KYC for other modules) | `auditFormat.ts` (labels, defensive redaction, diff, sanitized raw view), `auditRefs.ts` (resource destinations, copy) |
| UI | `KycUi.tsx`, `KycListPage.tsx`, `KycDetailPage.tsx`, `KycDialogs.tsx`, `Kyc.module.css` | `AuditUi.tsx`, `AuditListPage.tsx`, `AuditDetailPage.tsx`, `Audit.module.css` |

**No shared business state, no single Governance store, no synchronisation.**
KYC never imports the Auditoria module and Auditoria never imports the KYC
module: each only builds the other's URL (`#/audit?resourceType=kyc_case&…`,
`#/compliance/kyc/:id`). KYC local actions do **not** append Auditoria events;
Auditoria contains three pre-seeded, illustrative KYC decision events that
match the KYC seeds.

Shared code is **presentation only**: Operation UI pieces (summary cards,
sort buttons, pagination, empty states, Whitelabel tag, notes, domain
navigation cards) and Finance Core UI pieces (detail hero, key/value list, tab
panel with hidden-panel fix, context chip, sort select, date stack), the
shared `Dialog`, `Tabs`, `StatusPill` and Dot Matrix — plus one routing helper,
`src/app/routeQuery.ts` (build a hash, replace the history entry keeping the
scroll position), which holds no business state.

Read-only dependencies: KYC → Operation participants / Accounts (names,
e-mails, access state, company); Operation → `kycLinks.ts` (case index, to
choose the "Ver no Compliance" destination); Auditoria → Accounts and
Whitelabel seeds (to resolve "Ir para recurso" and labels). None writes to the
other.

## 3. Safety boundaries

- **KYC is not an official workflow.** Pendente / Em análise / Aprovado /
  Reprovado are prototype states; visible copy says so on the list, the detail
  and every dialog. No transition graph, no automatic transition.
- **No real KYC operation.** No upload, file, image, camera, OCR, biometrics,
  document content, CPF scan, proof-of-address file or external storage —
  evidences are opaque metadata references.
- **No side effects.** Reviewing evidence, adding / resolving / reopening a
  pending issue and registering an approval / rejection change only the KYC
  case in the session store. They never pause or activate an account, block
  access, change an investor / entrepreneur (or Operation's KYC summary),
  investments, opportunities, finance, payments or wallets, and never create
  an Auditoria event (verified in the flow: list counts change, Operation /
  Accounts / Auditoria stay identical, zero network requests).
- **Auditoria is read-only.** No edit, delete, before/after change, revert,
  restore, reprocess, re-execute, approve, reject, fix origin, export or bulk
  action; only view, copy non-sensitive ids (event, correlation) and navigate.
- **Secrets.** No password, access / refresh token, Authorization header, API
  key, gateway / webhook secret, SMTP password, cookie, credential, identity
  document or KYC payload exists in the data: sensitive fields are stored as a
  redaction marker and shown as "••••••••" (diff) / "[redacted]" (raw view);
  a key-name check masks them again at render. No real secret was fabricated.
- **Taxonomy.** Modalities are Equity and Debt only; Capital de Giro appears
  only as a Resource Use in an audit diff (and remains a Segment / Resource
  Use in the catalogs). Verified by the Finance Core and Operation taxonomy
  checks and by the static data check.

## 4. URL context

KYC: `?participant=`, `?whitelabel=`, `?status=`. Auditoria: `?resourceType=`,
`?resourceId=`, `?whitelabel=` (`global` = no Whitelabel), `?actor=`
(`anonymous` = not authenticated), `?action=`. The URL is the source of truth
for these filters: changing or removing one replaces the current history
entry (through the normal hash router, so the session guard and route parsing
apply) and keeps the scroll position; reload restores valid context;
Back / Forward move between pages, not between filter tweaks. Unknown values
are ignored with a visible note and dropped on the next change; unknown
participant / resource ids give an empty list with an explicit chip; unknown
or malformed detail ids render a not-found state inside the shell.

## 5. Cross-module integration

| Module | Change |
| --- | --- |
| Operação › Investidores / Empreendedores | *Ver no Compliance* (hero, domain navigation, Compliance / KYC tab) now navigates: unique case → `#/compliance/kyc/:id`; none or several → `#/compliance/kyc?participant=:id`. The "Módulo pendente" tag is gone; the KYC tab callout says local KYC records never update the Operation summary. `PENDING_MODULES.compliance` removed. |
| Operação data | `participants.ts`: the Operation KYC summary of `inv_proto_007` and `emp_proto_004` gained the process references `kyc_proto_0007` / `kyc_proto_e004` and their last update (were "—") so Operation and KYC agree. No other Operation data changed. |
| Dashboard | KYC card opens `#/compliance/kyc` and keeps "Aguardando integração" (no KPI fabricated); *Acessar Auditoria* and *Últimos eventos › Ver todos* open `#/audit`; the "Últimos eventos" table stays empty (no audit data shown on the Dashboard). |
| Contas | **Unchanged.** The account detail shows KYC only as a status tile with no contextual action, so no KYC navigation was added (no appropriate existing entry point). |
| Gateways e contas / Modalidades e regras | Their existing *Auditoria* quick actions ("módulo futuro" notices) now open Auditoria filtered by the tenant (gateways: `?whitelabel=:wl&resourceType=gateway`). Nothing else changed. |
| Shell | `navigation.ts` (Compliance › KYC, Auditoria href), `App.tsx` (four routes, titles, guard), `global.css` (dark body for the new views). |

## 6. Visual decisions and deliberate differences from the images

- Existing system preserved: dark navy / violet surfaces, teal success, amber
  pending, red only for Reprovado / Falha; shared Dot Matrix in the main
  content only (reduced-motion still, static fallback without WebGL).
- Not reproduced from the images (domain rules forbid them or no destination
  exists): row checkboxes / bulk actions, kebab menus, "Itens por página"
  (the existing 8-per-page pagination is used), Monitoramento / Relatórios /
  Políticas e regras entries, the image's "Domínio / Entidade / Alteração"
  audit columns and "Todos os tipos / entidades" filters (the brief's columns
  and filters are used; "Com alterações" is a tag under the action code),
  "Últimos 30 dias" as the default period (default "Todo o período", so the
  older KYC event stays visible), a real payment-provider brand (fictitious
  "Provedor Alfa / Gama" used), "Ver whitelabel" (no per-Whitelabel route —
  replaced by *Copiar ID do evento*; *Ir para recurso* opens Whitelabels).
- Identifiers follow the existing prototype seeds instead of the image's
  `KYC-00045` / `ACC-0001` / `INV-001234`: case ids are the Operation process
  references (`kyc_proto_…`), participants / accounts use their Accounts ids,
  "Conta / contexto" shows the live access state ("Conta ativa / pausada").

## 7. Responsive and accessibility

- Required sizes 1672, 1440, 1280, 900, 390, 320 plus 1440×600 and 900×600:
  no page-level horizontal overflow, no element outside `main`, no clipped
  control, no sideways-scrolling region, dialogs inside the viewport.
- Lists collapse columns by container width (data moves under the case /
  event; *Ordenar por* select appears); phone-width cards hide the header row.
  Detail tabs become a 2 × 2 grid; the audit diff compacts on phone widths.
- Semantic controls and labels, text + colour for every state, visible focus,
  WAI-ARIA tabs (arrows / Home / End, roving focus), inactive panels
  `display: none` (out of the keyboard order), native modal dialogs (Escape,
  focus return to the opener or a fallback target when the opener disappears,
  inert page), `aria-disabled` decision buttons that stay focusable and
  explain themselves, labelled form errors, polite notices.

## 8. Claude-reported local QA (2026-10-08)

Scratch scripts only (Playwright + local static server of `npm run build`); no
test library or dependency was added to the repository.

| Check | Result |
| --- | --- |
| `npm run typecheck` (`tsc -b`), `npm run lint` (oxlint), `npm run build` | pass — 0 warnings / 0 errors; existing > 500 kB chunk and ineffective-dynamic-import advisories unchanged |
| KYC flow (navigation, cards, search, filters, URL context, sort, pagination, Back / Forward, not-found, tabs, all local actions with dialogs and validation, no side effects on Operation / Accounts / Auditoria / Finance, Operation and Dashboard entry points, console) | 109 / 109 |
| Auditoria flow (navigation, cards, search, combined filters, period, URL context, sort, pagination, not-found, 4 tabs, diff / masking / raw view, copy, destination map, read-only controls, entry points, network) | 93 / 93 |
| Static data checks (deep freeze, references, Operation ↔ KYC consistency, "Ver no Compliance" destinations, secrets / redaction, IP ranges, taxonomy, store never mutates seeds) | 334 / 334 |
| Keyboard (lists, tabs, dialogs, focus return, `aria-disabled`, raw view, copy, mobile drawer) | 34 / 34 |
| Session guard / login / logout / Back after logout / revoked token on the new routes | 27 / 27 |
| In-app links rendered by KYC, Auditoria and the touched entry points | 117 checked, 0 broken |
| Responsive sweep: 23 states × 8 sizes | 184 / 184 |
| axe-core (WCAG 2.0/2.1/2.2 A/AA + best practice), 36 states × 4 sizes incl. dialogs, notices, empty / not-found | 0 violations in 144 states |
| Dot Matrix: normal motion animates; reduced motion still; no WebGL → static fallback; canvas only in `main` | 4 routes × 3 modes pass |
| Pixel regression vs the baseline build (22 screens, 90 captures) | 80 identical; 10 differ only where intended (Investor / Entrepreneur *Ver no Compliance* nav item; Gateways / Modalities *Auditoria* quick-action description). One E-mails viewport capture (`?section=smtp`) differed in one run because of the section-focus scroll timing; identical in three rechecks with a longer settle. |
| Earlier module flows | Operation 120 / 120, Operation keyboard 19 / 19, Operation axe 0 / 75, Operation taxonomy OK, Finance Core 161 / 161, Gateways 72 / 72, Modalities 58 / 58, E-mails 61 / 61, Settings 67 / 67, Accounts 0 failures / 110, Catalogs 60 / 61 (see §9) |
| Console / network | no console error; no request outside the static app; no API request |

Scripts with updated expectations (intended behaviour changes): Operation
"Ver no Compliance" (navigation instead of a notice), Gateways / Modalities
*Auditoria* quick action (link instead of a notice), sidebar top-level check
(Compliance and Auditoria are now links), and two Finance Core wallet checks
that Codex's dev review already changed (`?movimento=` in the URL — they fail
identically on the untouched baseline build).

## 9. Inherited findings (not changed here)

- Operation detail pages still compute inactive tab panels as `display: grid`
  (pre-existing in `Operation.module.css`); KYC / Auditoria use the Finance
  Core `[hidden] { display: none }` panel and are not affected.
- With reduced motion, the mobile drawer can open without moving focus into
  it (`AppShell`, pre-existing).
- The session guard checks only the presence of a token (pre-existing).
- At 1440×600 the sidebar utilities (Configurações / Ajuda) need the sidebar
  scroll, as on the baseline Dashboard.
- The Catalogs QA check "three Finance entries" is stale since Finance Core
  added entries; it fails identically on the baseline build.

## 10. Open Backend / Product questions — not answered here

KYC:

1. Source of truth and contract for KYC cases (ids, fields, tenancy,
   pagination, server-side search / filters).
2. Official KYC states, transitions, who may decide, re-decision, four-eyes or
   approval chain, and whether decisions are allowed with open issues /
   unreviewed evidence.
3. Participant ↔ case cardinality and history (several cases per participant,
   case reopening).
4. Evidence model: categories per participant type, storage, safe-reference
   format, retention, review semantics, KYC provider / OCR / biometrics
   vendors.
5. Pending issues: authorship, participant notification, SLAs.
6. Effects of a KYC decision on account access, investing eligibility or
   fundraising — deliberately **not** implemented.
7. Single source for the Operation KYC summary (Compliance vs Accounts KYC
   dependency) and its fields.
8. Permissions (RBAC) to view / decide; PII exposure (e-mail, documents).
9. Which KYC actions emit Auditoria events and with which fields.

Auditoria:

1. Event contract: fields, action / module / resource taxonomies, which
   services emit which events (none is claimed to exist today).
2. Immutability guarantees, storage, retention, server-side pagination,
   search and filters at scale.
3. Server-side redaction policy, availability of raw payloads.
4. Actor identity model (`superAdminId`), recording of unauthenticated
   attempts, IP / user-agent collection and privacy (LGPD).
5. Correlation id generation and propagation.
6. Time-zone and "Hoje" semantics (server vs viewer clock; the prototype uses
   a fixed reference date).
7. Export (excluded in V1) and permissions to view Auditoria.
8. Deep links for resources without routes (per account, gateway, Whitelabel,
   session).
9. Whether the Dashboard "Últimos eventos" will read from Auditoria.
10. Final taxonomy: Auditoria top-level vs under Sistema (raised in the
    Dashboard review).

## 11. Initial Claude file inventory

Created (24): `src/app/routeQuery.ts`; `src/features/compliance-kyc/`
(`kycModel.ts`, `prototypeKyc.ts`, `kycStore.ts`, `kycLinks.ts`, `kycRefs.ts`,
`KycUi.tsx`, `KycListPage.tsx`, `KycDetailPage.tsx`, `KycDialogs.tsx`,
`Kyc.module.css`); `src/features/governance-audit/` (`auditModel.ts`,
`prototypeAudit.ts`, `auditFormat.ts`, `auditRefs.ts`, `AuditUi.tsx`,
`AuditListPage.tsx`, `AuditDetailPage.tsx`, `Audit.module.css`);
`docs/compliance-audit-v1.md`, `docs/compliance-kyc-v1.md`,
`docs/governance-audit-v1.md`;
`docs/reference/super-admin-compliance-kyc-approved.png`,
`docs/reference/super-admin-governance-audit-approved.png` (byte-identical
copies of the two supplied images).

Modified (18): `src/app/App.tsx`, `src/components/shell/navigation.ts`,
`src/styles/global.css`, `src/features/dashboard/DashboardPage.tsx`,
`src/features/dashboard/QuickActionsPanel.tsx`,
`src/features/dashboard/RecentEventsPanel.tsx`,
`src/features/operation/shared/ParticipantDetail.tsx`,
`src/features/operation/shared/operationModel.ts`,
`src/features/operation/shared/participants.ts`,
`src/features/finance-gateways/FinanceGatewaysPage.tsx`,
`src/features/finance-gateways/sections/SideSummary.tsx`,
`src/features/finance-modalities/FinanceModalitiesPage.tsx`,
`src/features/finance-modalities/sections/ModalitySide.tsx`, `README.md`,
`docs/operation-investors-v1.md`, `docs/operation-entrepreneurs-v1.md`,
`docs/whitelabel-finance-gateways-v1.md`,
`docs/whitelabel-finance-modalities-rules-v1.md`.

No Backend, `docs/backend-handoff/` (absent from this working tree; not
created), Accounts, Finance Core sources, package files / dependencies or
OriginKit source was changed. The final inventory additionally includes the
retained source regression check `scripts/check-compliance-audit.mjs`.

## 12. Independent Codex review — 2026-10-08

This evidence is separate from Claude's reported totals in §8. The starting
worktree had exactly 18 modified tracked files and 24 new files. Live remote
refs and local protected refs were independently checked and remained:

- `dev`: `9f8abc6d55410e63a2edaf6d8efeafcd217b7a30`.
- `main`: `c2235ac5d0d65408e9d39bf836a1a717da3d95ae`.
- `docs/backend-handoff-v1`: `ea42d49a1b3965abcee65317765ec24d9bb2fe5b`.

### Narrow corrections

1. **Audit URL validation:** inherited object names (`toString`,
   `constructor`, `__proto__`) are not action/resource enums. A browser
   reproduction previously produced a native-function resource chip and a
   misleading empty list. `Object.hasOwn` now admits own enum entries only;
   invalid values produce the existing ignored-filter notice.
2. **Defensive Audit formatting:** own-property lookup for field labels;
   expanded secret/identity/header key matching; only the supported flat
   values (null, string, boolean, finite number, string array) may render.
   Unexpected nested structures and invalid arrays fail closed to a mask /
   `[redacted]`, including the raw view. Supported seed values and the visual
   design are unchanged.
3. **Retained focused regression coverage:**
   `node scripts/check-compliance-audit.mjs` uses Node assertions and the
   existing TypeScript compiler. No dependency, generated fixture or QA
   switch was added. It passed 361 assertions covering deep freezing,
   query/label edge cases, sanitization, dates, case links and safe seed data.

No KYC ID migration or Operation seed rollback was justified: `kyc_proto_*`
preserves the existing process references without a competing identifier
scheme. The two added references/timestamps are illustrative metadata only;
account/participant status is unchanged. A unique case opens its detail;
multiple or absent cases open the participant-filtered list. This is a
navigation choice, not a final cardinality rule.

### Independently executed validation

| Check | Result |
| --- | --- |
| TypeScript, oxlint, production Vite build, `git diff --check` | Pass. Non-blocking chunk-size, ineffective-dynamic-import and build-timing advisories only. |
| Built-in Codex browser checks | 183 passing checks; no failed valid check. External Chrome and isolated browser runners were not used. |
| KYC local actions | Evidence review, issue add/resolve/reopen, approval/rejection, empty-input validation, warning, activity and reload reset passed. Only disposable in-memory prototype state changed. |
| Domain isolation | Audit remained 28 frozen events. Before/after SHA-256 of Audit, Accounts, Operation participants and Finance records was identical: `cc91d3e6a8b5a37d7c3fa15c2046029b330b80e6fdecea068034de4f3357fcd9`. |
| Audit presentation | Combined filters, five search variants, reference-date period, pagination, URL removal/reload/Back/Forward, masked diff/raw, safe copies, creation without a Before value and login without field changes passed. |
| Integrations | Dashboard KYC keeps its unintegrated metric; Dashboard Audit shortcuts, unique/multiple/absent participant KYC links, correct account context, tenant-filtered Gateways/Modalities Audit links passed. |
| Bad inputs | Unknown/malformed case/event IDs and invalid participant/resource/tenant/status/actor/action values fail safely inside the shell. |
| Responsive | Both lists and both details at 1672×941, 1440×810, 1280×810, 900×810, 390×844, 320×740, 1440×600 and 900×600: all 32 base states passed without page-level horizontal overflow. Additional phone-width detail tabs and dialogs passed; information/actions remain reachable by vertical scrolling. |
| Keyboard/manual accessibility | Labelled controls and landmarks, no duplicate IDs/unnamed main actions, active-panel isolation, tab arrows/Home/End, row links, modal containment/Escape/focus return, safe copy and skip link passed. This is not WCAG certification. No existing axe bundle was available for the independent pass; Claude's axe totals were not relabelled as Codex evidence. |
| Motion/fallback | Normal WebGL indexed draws continued; reduced-motion draws stopped. Forced no-WebGL showed the existing static fallback on all four new views. Temporary browser instrumentation was removed. |
| Existing-module regression | Representative read-only smoke checks passed for all 14 existing shell modules plus Login validation/password toggle/tab order, Wallet movements, Finance short-height navigation and client route guards/logout/Back after logout. This was not a fresh baseline pixel-diff suite. |
| Console/network | No console errors or warnings captured. Retained request evidence contained only 60 local app GETs; the long-session event buffer reported eviction, so it is not a complete network archive. A fresh navigation/dialog window had zero requests and no eviction. Source review found no business API, upload, camera or persistence call in the new modules. |

Two screenshot comparisons were discarded as measurements, not defects
(changed list height and inconsistent cropped framing); rendering activity
was used instead. An incorrectly selected KYC Audit event was replaced by
the source-verified login fixture before testing the no-field-change state.

Browser QA used a clearly local-only prototype session, not Backend
authentication. Logout clears it; no credential or login request was sent.
The existing presence-only guard does not prove server token verification.
Inherited findings in §9 were not broadened into this feature. Real
contracts/workflow, permissions, evidence handling and event persistence in
§10 remain Product/Backend dependencies, not prototype implementation gaps.

Screenshots and the detailed independent check ledger were saved outside the
repository under
`C:/Users/User/.codex/visualizations/2026/10/08/super-admin-compliance-audit-review/`.
No temporary capture, browser instrumentation or QA data file is committed.
