# Menu Visibility Stage C — authoritative sidebar

Baseline: `cc1ae35aaee47280bc97773ed2b5ad6afb341da3` (official homolog).
Frontend only. Historical Stage A/B documents remain provenance.

## Integration and lifecycle

- `Sidebar.tsx` filters existing navigation objects through `sidebarVisibility.ts`, reusing `menuRegistry`, `visibilityResolver` and `visibilityPolicy`. No second registry, new IDs or destinations. Companies remains contextual.
- `useVisibilitySource.ts` owns one `visibilityResource.ts` instance for sidebar, management and the existing Stage B coordinator's confirmation GET. Canonical authenticated client/session identity retained; no storage/library/auth bypass.
- Concurrent subscribers and route remounts reuse the same read. Explicit refresh/post-Save confirmation starts a new GET and cancels any older one. No automatic retry loop.
- Logout, token-session/operator/role identity changes synchronously clear the cache and abort the older read. Generation + session checks reject late replies. No cross-session last-known data.
- Initial load shows only Dashboard and Configurações: no flash of potentially hidden entries. Same-session refresh retains the last real GET with a loading notice. GET failure exposes clearly labelled standard navigation and a retry button, **not** an invented persisted map. Direct routes stay usable subject to existing Backend authorization.
- Management keeps its existing local draft/reference during refresh; refresh failure is separately labelled. Read-only presentation follows the newest authoritative read. No optimistic sidebar edits. Existing one-attempt Stage B write ledger, strict versioned ACK/GET reconciliation, conflict/uncertain handling and explicit review remain unchanged.

## Rules and unchanged boundaries

- Stored own preference AND effective parent visibility determine sidebar presence. Hiding a parent never rewrites its children's preferences; restoring it reveals enabled children.
- Dashboard and Configurações always render, including when a malformed Product-policy value says false (reported, never silently persisted).
- Sistema, Configurações and Ajuda are independent. Original labels/icons/order/active states, tenant `subNavHrefs`, desktop sidebar, 768–1199 icon rail and mobile drawer remain intact.
- Routes, route guards, landing, Dashboard shortcuts, contextual links, RBAC and source-domain functionality are unchanged. A page whose menu entry disappears remains accessible.
- Official homolog keeps Menu Visibility writes ON and Whitelabel writes OFF; default example settings stay OFF. No Backend/Core/Render/CORS/database/configuration changes.

## Validation before release

- TypeScript, oxlint, production Vite build and `git diff --check`.
- All 18 maintained canonical suites: **2,863 assertions**, synthetic-only. Stage C adds 46 checks covering filtering, hierarchy, protected/independent entries, immutable navigation, deduplication/remount, fresh confirmation, errors/recovery, logout/operator changes, stale reads and preserved route/auth/tenant boundaries. Only intentionally affected Stage A/B sidebar/source assertions were updated; unrelated guardrails retained.
- Built-in browser, synthetic loopback API only: one mock-only UI Save → shared confirmation → Ajuda absent → reload persists; draft alone leaves sidebar unchanged. Hidden parent/child configurations, protected initial loading, HTTP 500/403/malformed fallbacks + retry, direct hidden Finance route, Back/Forward, active child and tenant-specific configuration links passed.
- Responsive 1440×900, 900×900 (76px icon rail), 390×844: no horizontal overflow. Drawer initial close-button focus, keyboard containment, inert content, Escape and opener focus return passed. Existing live homolog session kept separate; no real localhost API calls or tokens.
- Inherited large-bundle advisory remains; no new dependencies or unrelated cleanup.

## Release/live evidence ledger

This focused commit precedes its own Git-connected deployment, so immutable SHA/deploy ID and the two authorized live outcomes cannot be known inside that same commit. The durable execution ledger is:

`C:/Users/User/.codex/visualizations/2026/08/28/01a047eb-4949-7663-bff7-5b0686497ccf/menu-stage-c-2026-10-20/checkpoint.md`

Release gates: feature push, live dev recheck at the baseline, fast-forward only, normal dev push, exact Netlify Git commit/artifact verification. No manual deploy/relink/new origin.

Live smoke budget: **at most two new PUTs** — change ONLY Ajuda using a fresh authoritative map/version, then restore the complete original map with another fresh read/version. Verify sidebar + normal reload for both, mandatory navigation, direct routes, writes flags, no unrelated mutations. A conflict/timeout/5xx/uncertain result stops further PUTs for GET reconciliation; no blind retries or unexpected concurrent overwrite.

## Limitations / findings

- Backend version check remains **non-atomic**; this is a sequential single-operator persistence smoke, not proof of atomic concurrency safety. Audit is best-effort.
- Session cache does not poll changes from another operator; normal reload/explicit read obtains current configuration. Error fallback may display entries hidden by saved preferences, clearly labelled; presentation is not authorization.
- No new P0/P1 found in pre-release review. Existing bundle-size P2 advisory remains.
- Whitelabel CRUD Operational V1 live smoke is the next task **only after Stage C is deployed and verified**; no Whitelabel mutations in this workflow.
