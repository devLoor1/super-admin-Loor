# Global Dashboard — Recent Audit Events V1

## Approved meaning and source

`RECENT_CONTROL_PLANE_AUDIT_EVENTS`: a read-only preview of up to eight newest Control Plane Audit records, not Core operational activity, financial settlement, service health or a proof of another module's integration. Title **Últimos eventos de auditoria**; subtitle **Registros recentes de autenticação e ações administrativas.** Existing **Ver todos → #/audit** retained. Login failures are legitimate recorded events and are not filtered out.

Reuse unchanged `listAuditEvents`, `AUDIT_PAGE_SIZE=8`, `parseAuditList` and canonical authenticated GET. Parameters `{page:1, search:'', order:'desc'}` become `/api/audit?page=1&perPage=8`: empty search/default descending order omitted by the existing adapter. No unsupported filters, per-row requests, detail endpoint, subsequent pages or history enumeration.

The existing parser validates identities/action tokens/explicit-offset ISO calendar timestamps and pagination. The Dashboard additionally requires normalized page1/perPage8, a safe nonnegative total, consistent lastPage, exactly min(8,total) unique rows and non-increasing creation instants. Equal timestamps retain server order, without an invented secondary sort. Malformed/incomplete/misordered responses fail closed, never silently re-sort or fill missing rows. The unchanged shared parser normalizes lastPage0 to1; that established compatibility is explicitly tested, not claimed to be raw strict-lastPage rejection. Live metadata was lastPage16, page1, perPage8, total123 at preflight.

## Display and privacy

The small safe projection contains event ID (React identity only), actionLabel, resourceText or **Sem recurso registrado**, recorded **Whitelabel ID n** or **Sem Whitelabel**, actorName or **Não identificado**, resultMeta and the recorded creation instant/formatted date. All helpers are reused unchanged. Dates use existing `formatDateTime`, pt-BR / America/Sao_Paulo. Unknown results remain neutral; no speculative module, tenant name, actor identity or attempted-login email inference.

No beforeData/afterData, IP, userAgent, row correlation, email, raw JSON or credential field enters Dashboard state/UI/logs/storage. Canonical safe error presentation is reused rather than rendering Backend messages. The existing Audit reader's bounded500-record session-version-scoped in-memory detail cache is unchanged; no second global cache/history or payload persistence is introduced. The preview adds no detail links and does not alter Audit list/detail behavior.

## Lifecycle and independent states

Dashboard-scoped `useRemote` key includes canonical session version through useSyncExternalStore. One bounded read per mount/normal return/explicit retry, abort on unmount and stale-session protection. No polling, automatic retries, event bus, new transport or lastData rendering. Existing401 handling remains central;403 is panel-specific, no retry, no previous rows and not empty. Other Dashboard data sources remain independent.

Loading has eight decorative skeleton rows plus a status announcement. Valid total0 shows **Nenhum evento de auditoria registrado.** Unavailable/error shows safe feedback and retry only when appropriate; no stale or invented data. Footer distinguishes displayed rows from server total, labels the successful-read consultation timestamp, states no continuous update and clarifies Audit is not operational activity.

## Responsive/accessibility

Existing panel/grid/theme preserved. Six approved columns: Evento, Recurso, Whitelabel, Operador, Resultado, Data e hora. Native table/caption/column and row header scopes; result meaning includes text, not colour alone. All fields remain in the visual and assistive table, including mobile. A bounded horizontally scrollable region has keyboard focus/2px focus outline; narrow-panel scrolling instructions remain visible. Long safe text wraps, no page-wide overflow, no new animation. The existing Dashboard grid,177px Distribution donut and other panels are not modified.

## Recovery / accepted baseline — 2026-10-21 (Brasília)

- Initial accepted frontend/dev `e89840d80fff61f8529021c651c737ba854d8bd5`; previous published deploy `6ad8fdbe0f327c0dfef4aa46`, JS `index-BMQrsgyP.js`, CSS `index-DbUaGh-W.css`.
- Main `c2235ac5d0d65408e9d39bf836a1a717da3d95ae`; handoff `89a3b5058f52f981b3a1b06756d7f33a2a043f27`. Neither changed.
- Last audited Control Plane source `9513cb3b714348ecb98f0b02e1663918d113b9a8`; Core `ed9daad508a5bd9b93c169a8b4f43d53a6096c13`. Exact deployed Backend/Core SHA parity not established; no Backend/Core edit or deployment.
- Isolated branch `feature/dashboard-recent-audit-events-v1`, worktree `C:/Users/User/Desktop/Loor/worktrees/super-admin-dashboard-recent-audit-events-v1`. Pre-reboot review/branch preparation persisted; the first patch was rejected atomically and wrote no implementation. No lost or duplicated implementation was presumed.
- Pre-reboot browser failed before discovery with kernel-assets/path error. One post-reboot normal initialization succeeded. Existing authenticated official Dashboard recovered; no automatic login, credential handling, cache/runtime deletion, Windows permission change, auth/CORS/Render workaround or external Chrome.
- Post-reboot GET `/api/auth/me` HTTP200, SUPER_ADMIN, safe correlation `ec9f6675-2054-4a0d-af4c-045df23f8b95`.
- One bounded GET `/api/audit?page=1&perPage=8` HTTP200 at `2026-10-22T01:59:28.688Z` (21 Oct22:59 Brasília), safe correlation `3e16b247-2bd5-4674-9846-45a541749392`: total123,lastPage16,8 unique valid newest-first rows; strict dates/IDs/actions/actor linkage valid. All8 were recorded login events, all8 null tenant,1 unidentified actor; known success/failed results. No raw Audit payload copied into evidence.
- Netlify browser confirmed canonical repository/dev, Published e89840d and automatic publishing ON before promotion. Its Production context serves official homolog, not business Production. No configuration/env/flag change.

## Focused tests and scoped guard updates

- New `scripts/check-recent-audit-events.mjs`:65 maintained synthetic contract/projection/privacy/SSR/canonical-GET checks; also passed with process timezone Pacific/Kiritimati (not double-counted).
- Maintained suites: Dashboard93, Audit Read97, Compliance/Audit400, Daily Opportunity99, Distribution48, Menu Visibility1350+47, Whitelabel/Auth49, Operational CRUD37, Lifecycle74. **2,359 unique maintained checks** in the final focused batch.
- TypeScript, oxlint, production Vite build and diff checks pass. Inherited large-bundle advisory remains nonblocking. No dependency change.
- Historical Dashboard/no-Audit and Daily/no-RecentEvents exclusions are asserted against their original immutable releases. Current guards allow only the exact approved preview adapter/helper imports/call and four new/changed Dashboard unit paths; all unrelated protections remain. No blanket Dashboard/Governance exclusion.
- Protected Audit implementation, auth/session/transport/routes/shared UI, Menu/Whitelabel/Finance/Operation, all four KPI sources, Distribution, Daily Opportunity, KYC/health/quick actions, Dashboard grid and dependency files remain byte-identical to the accepted baseline. DashboardPage changes only its explanatory comment.

## Browser verification (synthetic, not authenticated live E2E)

External temporary harness serves a production build on127.0.0.1:4359 with a clearly fake local-only session; no real credential/token, auth-code bypass or production mock. Eight varied rows include long safe labels, missing actor/resource/tenant and neutral unknown result. Five widths1672/1440/900/390/320 preserve all six columns/eight rows with no page-wide overflow. Narrow panels explicitly signal bounded horizontal scrolling; keyboard focus and scrolling work. Reduced motion has0 preview animations; Kiritimati browser day22 still displays recorded São Paulo date21.

Zero/fewer rows/loading8 skeletons/403/503/network/malformed/incomplete/ascending/duplicate/naive-date states passed. No sensitive fixture value appeared; failures never became empty/success and existing Daily/Distribution stayed ready. Explicit retry sent exactly one Audit GET and no other request. Navigation aborted a pending Audit GET; Back sent one fresh successful Audit GET. Synthetic harness records zero non-GET business requests. One overlong browser QA orchestration call timed out and reset its handles; smaller bounded checks completed and saved evidence. This was not a frontend/API failure.

## Release gate and immutable evidence

After complete diff review, focused validation and live preflight: one reviewed feature commit, safe dev fast-forward, normal push and preserved remote feature. Existing official Git-connected Netlify workflow only; no duplicate/manual deploy, force push, merge/rebase/squash, main/handoff/config mutation.

This immutable source document cannot contain its own resulting source/deploy ID. Actual final commit/deploy/assets/hash, deployed source-to-UI comparison, navigation/Back/reload, operational availability and final outcome are recorded in the final task report and local immutable release evidence:

`C:/Users/User/.codex/visualizations/2026/08/28/01a047eb-4949-7663-bff7-5b0686497ccf/dashboard-recent-audit-2026-10-21/release-evidence.md`

Do not treat this release procedure or successful preflight as proof that a future publish/live smoke passed. Those gates must be independently verified.

## Limits / next scope

No current live alternate-role impersonation or human assistive-technology test is claimed; maintained synthetic tests cover permission/session/privacy/error cases. Audit total can change as operators authenticate or perform separately authorized actions. The preview is a consultation snapshot, not a continuously synchronized feed, history export or authoritative GET-by-ID. Raw source fields not needed by the UI remain governed by existing Control Plane/Audit contract behavior.

No business/financial write, Backend/Core/schema/API change, flag/environment change, or next Dashboard unit is part of this release. Next smallest independent batch: establish authoritative KYC aggregate semantics/read contract; operational-health integration separately needs real service-level signals. Do not repeat the completed general Dashboard audits.
