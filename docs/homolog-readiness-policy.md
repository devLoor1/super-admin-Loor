# Permanent homolog readiness policy

Normative LOØR frontend release rule, applicable to this and every future delivery. The original cleanup evidence remains in `homolog-readiness-hygiene-v1.md`; do not rewrite that historical record.

## Two independent safeguards

1. **Presentation truthfulness:** official homolog exposes only useful, operationally supported functionality.
2. **Privacy and data sanitization:** allow-list supported fields; do not expose raw credentials, unnecessary personal identifiers or unsupported provider/Backend data.

Neither safeguard replaces the other. Readiness is presentation policy, not authorization: Backend RBAC remains authoritative.

## Local development

Local Vite DEV retains approved prototypes, illustrative fixtures and mock routes/controls for UX exploration. Do not delete these assets merely to clean homolog. Operational read pages must never fall back to prototypes, even locally.

## Production-built official homolog

Use the existing `src/app/presentationAvailability.ts`; do not create a parallel flag system. Suppress mock/dead-end menus and submenus, inoperant header commands, shortcuts, contextual links, mock-only tabs, unsupported buttons/actions, illustrative metrics and placeholders without useful authoritative content. Direct mock URLs must also be unavailable; hiding a sidebar link is insufficient.

Never present fictitious persisted records, simulated operational success or unsupported writes. Preserve real read-only pages and legitimate loading, empty, error, denied/403 and null/unavailable states. Such states are not hygiene defects. Do not infer an empty total from a failed read.

Do not alter the approved 23-ID Menu Visibility registry, persisted preferences, protected Dashboard/Configurações entries, Backend visibility configuration, routes or permission rules merely to implement presentation hygiene. A contextual destination such as Operators can use Configurações without inventing a persisted preference. SUPER_ADMIN discovery does not grant Backend access; unauthorized direct routes show no data.

## Mandatory acceptance procedure

For **every** changed user-facing feature:

1. Inspect its supported Backend contract and privacy/authorization boundaries.
2. Extend focused maintained checks for newly introduced navigation, controls and direct routes. Assert actual navigation/rendered behavior, not only document/source-string presence.
3. Run `node scripts/check-homolog-readiness.mjs` (local DEV and production semantics), all maintained `scripts/check-*.mjs`, `npm run typecheck`, `npm run lint`, `npm run build`, and `git diff --check`.
4. Review the new/changed surface in local DEV and a production build; preserve historical prototypes, real reads, valid errors/empty states and Menu Visibility contracts.
5. After authorized publication, verify the actual official bundle and changed authenticated runtime surfaces. Separate synthetic/local evidence from deployed live E2E.

Any **new mock-only or inoperant production surface blocks promotion**. Record exceptions explicitly with scope, owner and acceptance; do not turn a legitimate Backend error/zero into a fake success to satisfy a gate. New features extend focused tests; this is not a demand to repeat an unbounded historical UX audit.

`AGENTS.md` makes this procedure mandatory for future Codex sessions. The maintained readiness suite is the executable verification layer. There is currently **no automatic CI release-blocking gate** wired to Netlify; execution and review are mandatory manual release acceptance steps. No CI or deployment infrastructure is created by this policy.

## Current scope and deliberate limitations

Operators list/detail are real GET-only Control Plane views, SUPER_ADMIN-only, under Configurações. No lifecycle, roles, invitations, password or financial actions are exposed. Local prototype preservation does not authorize publishing prototypes, making business writes or changing Backend/Core.
