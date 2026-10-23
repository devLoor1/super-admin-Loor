# SA-BE-008 — Advanced Audit filters read V1

## Baseline and source

Frontend accepted baseline `cd25769f84a837db0127e68dbd9a12644348c177`.
CP source `73ccb918ae4e22be1e16d3ab6ab12a215d3f2916`:
`src/modules/audit/{audit.controller.ts,audit.service.ts,dto/audit-filters.dto.ts}`,
Prisma `AuditLog`; existing controller/RBAC and Audit test contracts inspected read-only.
Core reference `9e26c7c7e68ca42c5aebc6188d3cc73005dbf362`; Audit is CP-owned,
not Core operational history or proof that a referenced business operation succeeded.
Live Core origin/dev has since advanced to `efb224dcbb76779319f76f14b89b27ca2bac81f9`
(Investor home/terms and CVM PDF changes); this is recorded, not reset or merged.
The Core working checkout remains clean at fe054bb8, CP checkout clean at9513cb3.

Official homolog: `https://loor-super-admin.netlify.app`.
API: `https://backend-super-admin-loor.onrender.com/api`.
Initial publication `6ada577f96f0cf4a841257d0`, JS `index-C8jtAZR3.js`, CSS `index-PJeH0lX1.css`.
Netlify independently shows canonical `devLoor1/super-admin-Loor`, dev automatic
publishing ON. No environment, flags, infrastructure or authentication changes.
Pre-release Menu Visibility GET200: version5, 23 preferences, sorted-map SHA256
`fb7910fbb9e0e3baeb6016151cdadcdce0d40723d10331a74e44b9394df5b7fe`.

## Deployed qualification — 2026-10-23

Existing built-in session: GET `/auth/me` **200**, roles `[SUPER_ADMIN]`.
GET `/audit?page=1&perPage=8`: **200**, total126, lastPage16, unique row
identities and descending createdAt. One bounded 32-row sample naturally
provided operator, resource, tenant and correlation identities; no log fixtures
were generated, no exhaustive history enumeration, and no personal records or
raw metadata are recorded in this document.

Each representative filter GET returned **200** with matching row semantics,
valid metadata and chronological order:

| Parameter / tested query | Filtered total | Classification |
| --- | ---: | --- |
| action (observed token) | 101 | source + live |
| result=success | 113 | source + live |
| operatorId (observed CUID) | 118 | source + live |
| resourceType (observed token) | 10 | source + live |
| resourceId (observed identity) | 7 | source + live |
| whitelabelId (observed numeric identity) | 7 | source + live |
| from (latest observed instant) | 1 | source + live, inclusive |
| to (same instant) | 126 | source + live, inclusive |
| search (action) | 101 | source + live |
| search (observed correlation ID) | 1 | source + live |
| order=asc | 126 | source + live |
| action + result | 101 | source + live, combined |

Totals describe the observation, not durable counters. Search covers action,
resourceType, resourceId and **correlationId**, superseding the original read
unit's historical search-scope documentation. No operator-name/email search.
No essential deployed mismatch was found. RBAC permits SUPER_ADMIN,
COMPLIANCE_ADMIN, READ_ONLY; SUPPORT_ADMIN is not inferred. Alternate roles,
errors and hostile data use synthetic checks, not live impersonation.

## Exact API and URL contract

GET `/audit` whitelist: page, perPage (fixed8 here, Backend max100), search,
order, operatorId, action, resourceType, resourceId, whitelabelId, result, from,
to. No sort/module/isNull parameters. All active filters combine server-side;
no loaded-page filtering or local global totals. Order is createdAt asc/desc.

Canonical URL `#/audit` uses the exact Backend keys, in stable order:
search, order, operatorId, action, resourceType, resourceId, whitelabelId,
result, from, to, page. Empty/default values omitted (page1, desc).
Positive bounded page; search80; exact action/resource-type tokens80; safe
resource ID128; operator Prisma CUID; positive safe integer tenant; exact
success/failed; explicit-zone calendar-valid instants. Credential-shaped,
control-character and unmasked email search/token values are rejected.

`actor=<valid CUID>` normalizes to operatorId; numeric `whitelabel` to
whitelabelId. Anonymous/global/prototype tenant aliases do not represent null
filters. Duplicates, alias conflicts, unknown keys, invalid values and reversed
ranges show an explicit validation state and cause **no Audit GET**. They
cannot silently broaden a restrictive URL. Individual removal preserves other
restrictions; clear-all explicitly returns to the unfiltered canonical list.
Invalid values are not echoed in diagnostic messages.

Filter/order/search change resets page1; pagination keeps the full filter map.
Existing replaceRouteKeepingScroll and search draft400ms debounce preserved;
no history entry per keystroke. A pending search carries into filter changes.
Recognized credential/contact search content is rejected before URL commit.
Reload, direct links, Back/Forward and internal returnTo reproduce the query.

## Inclusive dates and UI

Native Data inicial/final controls use **America/Sao_Paulo**. Selected start
maps to the first actual local-day instant; inclusive end maps to the next
local-day start minus1ms. Intl timezone calendar conversion and bounded binary
search handle historical midnight gaps/offset transitions, without hardcoded
-03:00 or browser-local timezone assumptions. Instants serialize canonically
as UTC ISO (Z). Leap day, month/year, 2018 DST start (23h day), 2019 DST end
(25h day), and UTC/Tokyo/Los_Angeles browser-zone independence are tested.
Explicit instants from direct URLs remain exact when unrelated fields apply;
changing that date intentionally selects the whole local day. Active date chips
retain the exact query instants. Invalid ranges are neither reversed nor sent.

Compact search/order toolbar, native keyboard-accessible advanced disclosure,
exact action/operator/resource/tenant fields, result select, date inputs,
explicit apply, removable active filters and clear-all. No operator/tenant
lookup API dependency. Single authoritative summary uses current meta.total;
the unsupported changes/today/seven-days cards are no longer presented.
Eight-row server pagination, safe existing columns and masks preserved.

Filtered zero: “Nenhum evento encontrado para os filtros selecionados.”
Unfiltered empty, invalid URL, permission, expired session, unavailable, timeout
and malformed states stay distinct. Errors never become zero. Explicit retry
uses existing error semantics; 403 has no retry. Out-of-range page replaces
once using reported lastPage; stale results/footer are not mixed into new filters.

## Detail, contextual links, privacy and isolation

No GET `/audit/:id`. Filtered list records remain session-version memory-backed;
returnTo carries all filters. Direct/reload without memory remains explicitly
unavailable, never a prototype replacement or a page scan. Exact recorded action
link in detail now uses action, not a substring search. Other contextual links
were inspected: legacy numeric tenant normalization and existing exact resource
keys suffice; no unproven resource relationship or business logic was changed.
Prototype tenant aliases remain invalid rather than querying invented identities.

Dashboard remains byte-identical to accepted cd25769: newest unfiltered eight
Audit preview, independent sources, unfiltered Ver todos and approved four KPIs.
Canonical authenticatedGet, 20s timeout, AbortController, X-Correlation-ID,
central401, useRemote and existing sanitizer reused. Audit hook adds explicit
session-version request identity; late reads cannot cross filters or sessions.
No browser payload persistence, polling, global store or new dependency.
No raw metadata logging, credential exposure or personal data in evidence.
Existing sanitizer and adversarial tests remain active. Frontend masking does
not redact the network response or replace server-side privacy controls.

## Validation and bounded release

25 maintained suites / **3,625 passing checks**, including127 new focused
Audit filter checks. TypeScript, oxlint, production Vite build and diff check
pass; inherited large-chunk advisory remains non-blocking.
Historical Audit assertions migrate only their formerly unsupported filter
expectations. Historical KYC/Menu/Recent Audit/360 freezes use exact LF-normalized
SHA256 pins for nine authorized runtime files, not directory exemptions. The
Audit-only App raw-query adaptations are reversed exactly and byte-compared to baseline; adversarial
extra App modifications fail. No privacy assertions were removed.

Production-built synthetic browser QA (external loopback harness, not committed
or deployed) passes default/expanded 1672/1440/900/390/320: no page overflow or
clipped controls; semantic labels, keyboard disclosure/focus, reduced motion,
combined filters/dates, debounce, current-result isolation, zero/errors,
pagination, detail/back/forward/reload and privacy sentinels. 401 clears the
synthetic session; 403 preserves it. No Audit detail call or business write.
This synthetic evidence is not authenticated live E2E or an independent WCAG/axe
certification.

Release plan: one scoped feature commit, clean fast-forward to current dev,
one normal Git-connected publication, then authenticated deployed UI smoke.
No main/handoff/Backend/Core/flag/settings changes. Final commit/deploy/assets,
post-release actual UI/network/regression results and measured duration are
recorded in the task's immutable external `audit-filters-2026-10-23/release-evidence.md`
artifact and final report; no second docs-only publication is created.

Remaining contract limits: no detail-by-ID, null actor/global tenant filter,
aggregate time/change counts, server privacy policy or exhaustive event token
catalog. These do not block the qualified V1 read filters. Subsequent write or
Operators batches require their own scope; none is implemented here.
