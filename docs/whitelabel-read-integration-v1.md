# Whitelabel Read Integration V1

First real-data unit of the Super Admin frontend. The **Whitelabels list and
detail** (`#/whitelabels`) now read the Nest Control Plane. The session layer
gained server validation and centralized 401 handling. Everything else is
unchanged: it is still a prototype, and Whitelabel writes are **not**
integrated.

Contract source inspected read-only: `backend-super-admin-Loor`
`homolog@01774379eee8f4a1ed83afd51cdb2c4c10fc67f8`, plus authenticated
homolog GET evidence on 2026-10-13. The inspected ref is not a claim about
the exact deployed Backend SHA.

- `docs/fe-integration-contract-v1.md`
- `src/modules/whitelabel/*`
- `src/modules/auth/*`
- `src/common/*`

## Scope

| Integrated (read-only) | Still prototype / not integrated |
| --- | --- |
| `GET /whitelabels` (list, search, status filter, pagination) | Whitelabel create / edit / activate / deactivate (Q-WL-01…03 open) |
| `GET /whitelabels/:id` (detail) | Whitelabels KPI cards (still "Aguardando integração") |
| `GET /auth/me` (session validation / operator hydration) | Contas, Configurações, E-mails, Financeiro, Operação, Compliance, Auditoria (still on `PROTOTYPE_WHITELABELS`) |
| Central 401 → Login | Server-side logout / token revocation (no endpoint) |

No `POST`, `PATCH` or status call exists in this unit. The authenticated client
(`authenticatedGet`) is GET-only on purpose.

## Endpoint contracts used

### `GET /api/whitelabels`

The frontend sends only parameters the Backend validates. The Backend uses
`forbidNonWhitelisted`, so an unknown parameter returns 400.

| Param | Sent | Notes |
| --- | --- | --- |
| `page` | always | from `#/whitelabels?page=` (default 1) |
| `perPage` | always `10` | fits the approved list height |
| `search` | when not empty | typed text, trimmed, ≤120 chars, debounced 400 ms; matching is done by the Control Plane / Core |
| `active` | `true` / `false` for Ativos / Inativos | omitted for "Todos" |
| `sort`, `order` | **never** | Core sort keys are not part of the published contract (see questions) |

Response: `{ data: ControlPlaneWhitelabel[], meta: { page, perPage, total, lastPage } }`.

- The list is parsed strictly (`parseWhitelabelList`).
- A missing array or meta, a record without a numeric id, name or status, or a
  non-JSON 2xx body is shown as an error ("Resposta inesperada"). Partial data
  is never rendered.
- `lastPage: 0` (an empty result) is read as 1.

### `GET /api/whitelabels/:id`

- Returns the mapped object directly (no `{ data }` wrapper).
- Only Core numeric ids are sent: `isServerWhitelabelId`, `^\d{1,18}$`.
- Any other id, such as an old `wl_proto_*` link, resolves to the not-found
  state **without** calling the API.
- Backend 404, or 400 `INVALID_WHITELABEL_ID`, shows the not-found state.

### `GET /api/auth/me`

Returns `{ id, name, email, status, roles, lastLoginAt }`. It is used only to
validate the session and refresh the operator (name, e-mail and roles) shown in
the header.

## Field classification

| Field | Source | UI |
| --- | --- | --- |
| `idKey` (Core id) | Backend | row identity, `?id=`, "ID:" in detail |
| `name`, `slug`, `baseUrl`, `domain` | Backend | list + detail; copy buttons only when present |
| `status` (`active` / `inactive`; falls back to `isActive`) | Backend | Ativo / Inativo pill. No setup / draft status exists in the API, so none is shown. |
| `admins` | Backend (= `counts.admins`) | list column + detail card |
| `createdAt`, `updatedAt` | Backend | `dd/mm/aaaa[, hh:mm]`, America/Sao_Paulo |
| `applications`, `integrations` | Backend, always `null` today | "—" / "Sem dados no Control Plane" |
| avatar initial / tone | frontend, derived from the name and id | decoration only |
| tabs Administradores / Aplicações / Integrações, quick actions | frontend placeholders | explain "ainda não integrado" |

Missing values render as "—" (announced as "sem dados"). Nothing is filled from
`prototypeWhitelabels.ts`. The integrated screen no longer imports it.

## URL and routing

`#/whitelabels?id=&page=&search=&status=`. All parameters are optional.

- **Selection** (`id`) pushes a history entry and keeps the scroll position, so
  Back / Forward step through selections.
- **Filters and page** replace the entry, the same pattern as KYC / Audit, and
  drop `id`. The detail then shows the first row of the new result.
- **No `id`:** the detail shows the first row of the current page (Backend
  order) without writing the URL.
- **Direct URL / reload** reproduce the same API requests. The detail loads by
  id even when the row is not on the current page.
- **Invalid `status` / `page` values** are ignored, with a visible note.
- **A page past `lastPage`** is replaced by the last page.
- **Unknown ids** show "Whitelabel não encontrado" in the detail region (never
  a blank page). The list stays usable.

## List behavior

| Feature | How it works | Why |
| --- | --- | --- |
| Search, status filter, pagination | Server-side, through the URL | One request per change; no client filter over a single page |
| Status vocabulary | Todos / Ativos / Inativos only | "Em configuração" and "Rascunho" were prototype-only |
| Column sorting | Local, and **only when the whole filtered result fits on one page** (`lastPage ≤ 1`). With more pages, headers are plain text and the footer says "Ordenação indisponível com várias páginas". | Sorting one server page would misrepresent the order |
| States | Skeleton rows while loading (`aria-busy`); error block with safe message, correlation code and "Tentar novamente"; separate empty states for "no results for these filters" (with "Limpar filtros") and "no Whitelabels" | — |
| Detail region | Same id / heading / focus target in loading, not-found, error and "indisponível" (list failed) states | Never a blank panel |
| Phone layout | Choosing a row reveals and focuses the detail. This runs again once the data arrives. | — |

## Session: `/auth/me` hydration

- **Login:** `POST /auth/login` stores the token and operator in
  **sessionStorage**, same keys as before. The response is shape-checked. A
  token issued by a login is treated as proven, so `/auth/me` is not called
  right after it.
- **Restored sessions:** a session restored from storage (reload, direct URL)
  is checked once per page load with `GET /auth/me`, in the background. The
  shell renders meanwhile, which keeps startup responsive during a Render cold
  start (15 s validation budget; timeout is non-authoritative and keeps the
  session). Login and authenticated resource reads have a 20 s budget and
  explicit user retry; none retries automatically.
  - **200:** the operator in the header is refreshed (`useSessionOperator`).
  - **401:** the session ends (see below).
  - **Network error, timeout, 5xx, 403 or malformed body:** this is not an
    authoritative answer, so the session is kept. Every authenticated read is
    still checked by the server.

So a non-empty token no longer counts as proof: the server confirms it on load,
and any later 401 ends it. The frontend gate is UX only; the Backend enforces
every read.

## Centralized 401

`authenticatedGet` (src/lib/apiClient.ts) and `validateSession` call
`handleUnauthorized(token, sessionVersion)` on an authoritative 401. That function:

- is **idempotent**: only the first 401 for the *current* token acts. A 401 for
  a token that is no longer current (a request started before logout or
  re-login) is ignored. A session generation also protects a re-login that
  happens to receive the same token string; late hydration cannot overwrite
  that newer operator;
- clears the token and operator (`clearSession`) and notifies subscribers. The
  App's guard then shows Login with `location.replace('#/login')` (replace, so
  Back does not bounce into a guarded page);
- leaves a one-time notice on Login: "Sua sessão expirou ou não é mais
  válida. Entre novamente."

Requests in flight are aborted when the screen unmounts. Nothing retries
automatically, so there is no request storm. There is **no refresh token**,
because none exists in the contract.

Note: Core authentication failures reach the frontend as 503, not 401 (Nest
maps Core 401/403 → 502 → 503). So a 401 always means the operator session.

## Logout

Logout is local only: it clears sessionStorage and goes to `#/login`. There is
no logout or revocation endpoint, so the JWT stays valid on the server until it
expires (`JWT_EXPIRES_IN`, default 8h). Server-side revocation is a
**Backend / Product decision** and is not implemented here.

## Errors

`describeApiError` (src/lib/apiErrors.ts) maps every failure to a safe
Portuguese message. Raw server messages, HTML bodies and stack traces are never
shown or logged.

| Case | UI |
| --- | --- |
| Network failure | "Sem conexão com o Control Plane" + retry |
| Resource read exceeds 20 s | "O Control Plane demorou a responder" + explicit retry; session retained |
| 2xx with a non-JSON or unexpected shape | "Resposta inesperada do Control Plane" + retry; nothing rendered |
| 401 | Session ends → Login notice |
| 403 | "Acesso não permitido" (no retry; session kept) |
| 404 / `INVALID_WHITELABEL_ID` | Detail not-found state |
| 5xx (incl. HTML 502 from a proxy) | "Control Plane indisponível" + retry |
| Other 4xx | "Consulta não aceita (HTTP n)" + retry |

**Correlation id:** every request sends a fresh `X-Correlation-ID`. Errors show
"Código de diagnóstico", taken from the body `correlationId`, then the echoed
response header, then the id the request sent.

## Security notes

- The token lives only in sessionStorage (no localStorage).
- The token is sent only as `Authorization: Bearer` to `VITE_API_BASE_URL`.
- Nothing is logged: no token, no header, no body.
- Passwords are never stored.

## Cloud first-pass QA (historical, before review)

QA ran against a local **mock** of the contract above. The cloud sandbox cannot
reach the homolog API or frontend (egress policy). Coverage:

- the login → `/auth/me` → list → detail → reload → Back / Forward → logout flow;
- loading, empty and error states (401, 403, 404, 400, 5xx, HTML 502,
  malformed JSON, non-JSON, network, the original 60 s timeout);
- invalid stored token and unknown / prototype ids;
- pagination, search, filter and local sort;
- 320 / 390 / 768 / 1280 / 1672 px;
- axe WCAG A/AA and keyboard.

## Codex review and separated validation evidence (2026-10-13)

The Cloud work was recovered intact at `dev@d2a5175` and carried to
`feature/whitelabel-read-integration-v1` without applying the recovery patch.
No dev/main/handoff promotion or deployment belongs to this review.

### A. Live homolog Backend/API checks

Using the existing authenticated Codex built-in browser session, GET
`/auth/me`, `/whitelabels`, and details for existing IDs 4/6 returned 200.
The list really uses `{ data, meta: { page, perPage, total, lastPage } }`;
the detail is a direct object. `perPage=2`, pages 1/2 returned distinct
records, total 6 and lastPage 3. `active=true` returned six active records;
`active=false` returned an empty result. `search=Finapop` returned one
matching record. This proves those probes, not every possible searched field.

IDs/idKey, name, slug, baseUrl/domain, boolean isActive and active status,
dates and administrator counts are compatible with the adapter. All six
records had null applications/integrations. The existing Login 201/Bearer
response evidence is retained from the prior accepted homolog smoke test;
this review does not replay a live Login or change the existing session.

### Local auth diagnosis — environment limitation

The direct preview uses `http://localhost:5173` with the real Render API.
Chromium reproduced `PreflightMissingAllowOriginHeader`: OPTIONS returned
204 but omitted Access-Control-Allow-Origin for localhost. Fetch failed
with TypeError before an auth result could reach the app. The old local tab
had been closed, so its previous Login attempt cannot be reconstructed.
This is a reproduced CORS limitation, not evidence of wrong credentials or
a redirect loop. Backend/CORS/Netlify configuration was not changed.

### B/C. Reviewed branch UI / synthetic test validation

A disposable development-only Vite fixture outside the repository supplies
only synthetic Login/me/Whitelabel responses at localhost:5174. It never
proxies the live API and contains no real credentials/token. It is removed
before the final commit. This is **mocked local UI evidence**, not real
authenticated UI-to-homolog E2E. Live reviewed-branch E2E remains pending
because localhost is not an allowed API origin; do not count the current
deployed baseline as a deployment of this feature.

Focused Node contracts use synthetic in-memory data and no network:
`node scripts/check-whitelabel-read.mjs`. Existing regression suite:
`node scripts/check-compliance-audit.mjs`. No stored Cloud browser-suite
assertions were present to weaken or silently bypass.

Review refinements preserve Cloud's architecture: session-generation guards,
safe typed error diagnostics/Login messages, stricter Bearer/operator and
identity/status validation, integer counts, malformed/duplicate page
rejection (including an empty in-range page that otherwise stays loading),
timezone-correct local date sorting, and bounded request budgets. Storage
failures retain only a volatile tab session; logout tombstones prevent stale
storage entries from resurrecting it. No refresh/revocation/write feature
or application auth bypass is introduced.

### Final reviewed evidence and limitations

- Live GET `/auth/me` with one explicitly synthetic invalid token returned
  401 `UNAUTHORIZED`; the existing authenticated homolog session was not
  cleared or replaced. Netlify-origin CORS passed. A real 403 was not
  safely available with the current SUPER_ADMIN role and was not manufactured.
- Local synthetic UI passed Login, list/detail, two-page pagination, server
  search/active filtering, selection history, Back/Forward, restored-session
  reload, direct numeric IDs, invalid/prototype ID rejection without detail
  traffic, empty/loading/not-found, 403/5xx/HTML/malformed states, and the
  20-second timeout with explicit retry. Raw error messages/objects were not
  exposed. Late active-filter requests were aborted; only the final inactive
  result appeared. Malformed in-range empty pages fail instead of spinning.
- Centralized client 401 clearing and the expiry notice were confirmed only
  by synthetic local UI and unit tests, **not live reviewed-branch E2E**.
  Local logout cleared session state; Back and direct Finance routes stayed
  on Login; no logout/revocation request exists.
- Loaded widths 1672, 1440, 1280, 900, 390 and 320 had no horizontal
  overflow. Enter selected a mobile row and focused the detail region;
  Tab moved from search to status. Existing visual layout/OriginKit assets
  were not redesigned. These are focused keyboard/semantic checks, not a
  new comprehensive axe/WCAG certification.
- All 15 unrelated routes (Dashboard; Accounts/Settings/Emails; the three
  Operation pages; Gateways/Modalities/Catalogs; the three Finance Core
  pages; KYC; Audit) loaded with their prototype/empty boundaries intact.
  Whitelabel detail shortcuts stayed notices, with no real-ID anchors into
  prototype tenant modules. Create/edit also stayed notices; no business
  POST/PATCH/DELETE/status or financial action was executed.
- 49 focused Whitelabel/auth contracts and 361 existing Compliance/Audit
  checks passed, as did TypeScript, oxlint, production Vite build and diff
  check. Only the inherited bundle-size advisory remains; the old API
  dynamic-import advisory is gone. No unexpected local console/React error
  was captured. React development StrictMode may start two bounded reads;
  cancellation is tested, fresh Login does not duplicate `/auth/me`, and
  there is no automatic retry loop.
- The external fixture process/script and temporary local browser tabs were
  removed before commit. No fixture/auth bypass, mock endpoint, real token,
  credential, patch or screenshot is included in application code/build.
  Screenshots remain outside the repository as explicitly synthetic evidence.
- The reviewed branch itself has **not** completed UI-to-live-Backend E2E:
  localhost CORS is the environment blocker. After separate promotion
  authorization, verify the new homolog deployment and run read-only UI E2E
  there. This task performs no push, promotion or deployment and does not
  change canonical backend-handoff docs or Backend/CORS/Netlify settings.

## Open Backend / Product questions

1. **Sort:** which `sort` keys does Core accept for `/internal/super-admin/v1/whitelabels`? Until published, the UI sorts locally only when the full result fits on one page.
2. **Search fields:** which fields does Core `search` match (name, slug, domain)? The placeholder no longer promises specific fields.
3. **`counts.admins`:** the Nest mapper turns a missing Core count into `0`. Can Core omit it? If so, "0" may mean "unknown".
4. **Applications / integrations:** always `null`. Is there a planned aggregate, or should these columns be reconsidered (Product)?
5. **Logout / revocation:** should the Control Plane offer token revocation (logout endpoint, short-lived tokens, refresh)? Not implemented without a contract.
6. **Session expiry UX:** the JWT expires after `JWT_EXPIRES_IN` (8h default) and is detected on the next authenticated read or reload. Is a proactive warning wanted?
7. **Write lifecycle:** create / update / activate / deactivate remain unavailable until Q-WL-01…03 are decided. Deactivation must not be treated as deletion.
8. **KPI cards:** the accepted live audit already found a dedicated `GET /dashboard` aggregate with Whitelabel/active counts. Product still needs to choose the KPI source/semantics; this unit leaves the cards empty. "Em configuração" has no API counterpart.

Resolved contract facts: envelope/lastPage, paging, active filter, the tested
search, direct-object detail, numeric IDs, current null aggregates, and the
live Login response's `expiresIn: "1d"` (prior smoke evidence). Core sort-key
publication, full search-field scope, missing-count semantics, planned
aggregates, revocation/proactive expiry UX, write lifecycle and KPI policy
remain open. No capability is inferred from a prototype or one successful probe.
