# Whitelabel E-mails V1 — local implementation record

Implemented by Claude on 2026-10-06 on the local working tree of
`feature/super-admin-whitelabel-emails-v1` (baseline `dev` at
`df87de8e5d3ded2da3915c5de602620c282ab5ba`). Left uncommitted for Codex review.
Status: frontend prototype; **not Backend-integrated; no e-mail is sent**.

This is a frontend evidence record, not an API, security, persistence or audit
specification; the canonical Backend handoff stays on its documentation branch.
Approved image (visual direction only):
[`reference/super-admin-whitelabel-emails-approved.png`](reference/super-admin-whitelabel-emails-approved.png).

## Route and navigation

- Route: `#/whitelabels/:whitelabelId/emails`, optional
  `?section=smtp|envios|templates` (scrolls to and focuses that card's heading).
- Plataformas lists Whitelabels, Contas, Config. do Whitelabel and **E-mails**
  (`whitelabel-emails`). Contas, Config. do Whitelabel and E-mails pass
  `subNavHrefs`, so nested entries keep the displayed Whitelabel.
- Config. do Whitelabel → *Gerenciar SMTP* is now a link to
  `#/whitelabels/:id/emails?section=smtp`; its summary reads the E-mails store.
- Short laptop heights (≤ 860px) tighten nested entries. The icon rail compacts
  at ≤ 800px, with an additional ≤ 650px adjustment for all four nested entries
  and both utility links. The full sidebar remains independently scrollable.

## Structure

- `WhitelabelEmailsPage` — AppShell, Dot Matrix (shared), context card,
  `DetailTransition` keyed by Whitelabel, shared unsaved guard.
- `SmtpSection` — read/edit SMTP, write-only password, simulated test send
  (`TestEmailDialog`).
- `EventsSection` — six event preferences, local switches, section save/discard.
- `TemplatesSummary` — platform-default models, categories covered, sender
  applied, link to identity in Config. do Whitelabel, *Gerenciar templates* notice.
- `SessionActivity` — session-only local feedback (not audit).
- `emailModel.ts` (`WhitelabelEmailSettings`, `SmtpSettings`, `EmailEventPreference`,
  `TemplateSummary`), `prototypeEmails.ts`, `emailStore.ts`.

## Event classification

| Event | Category (UI only) | Classification | Backend |
| --- | --- | --- | --- |
| Investimento em Equity | Investimentos | Product requirement | Pending validation |
| Investimento em Debt | Investimentos | Product requirement | Pending validation |
| Cadastro concluído | Onboarding | Illustrative | Not confirmed |
| Recuperação de senha | Segurança | Illustrative | Not confirmed |
| Conta aprovada | Operacional | Illustrative | Not confirmed |
| Termos atualizados | Compliance | Illustrative | Not confirmed |

## Security representation

- Model keeps `secretConfigured` only; no secret exists in prototype data.
- View: fixed mask + "Configurada"/"Não configurada". Edit: empty `type=password`
  "Nova senha" field, `autocomplete="new-password"`, no reveal toggle.
- The typed value is held only by the edit draft; `useSectionEditor` drops the
  submitted draft after save, and discard resets it. It never reaches the store,
  activity, notices or console (verified by script).

## Claude-reported local QA (2026-10-06)

The results below were supplied with Claude's implementation. They are retained
as prior evidence, not presented as tests rerun by Codex.

| Check | Result |
| --- | --- |
| `tsc -b` | Pass |
| `oxlint --deny-warnings` | Pass (0 warnings) |
| `npm run build` | Pass (existing >500 kB chunk advisory only) |
| E-mails scripted interactions (Playwright) | 61/61 — Settings shortcut + focus, sidebar, SMTP validation/save/discard, secret never rendered or logged, test send (validation, dialog, loading, result, no request), Equity/Debt independent toggles by keyboard, events save/discard, risk/warning notes, templates notice, guard on selector/link/Back, tenant switch, unconfigured tenant, Settings summary sync, not found |
| Settings regression flow | 67/67 (plus Back guard rechecked with the shared hook) |
| Overflow sweep 1672 / 1440 / 1280 / 900 / 390 / 320 | `scrollWidth == innerWidth` (Finapop and Nova Plataforma) |
| axe-core 4.x (scratch copy) | No violations (view, edit/errors, dirty events, test states, dialogs; 390 and 320) |
| Motion / reduced motion / no-WebGL | Transition only with motion; static Dot Matrix fallback; no console errors |
| Console / network | No errors; only local document/assets requested |
| Pristine `df87de8` build vs this build (WebGL off) | Login and Dashboard pixel-identical; Whitelabels and Contas differ only in the sidebar; Settings differs in the sidebar and the SMTP summary card |

## Known product / Backend dependencies

- Server-side SMTP storage with encrypted, write-only secrets; connectivity test
  with safe error responses; audit events (configuration updated, test
  requested/result, event enabled/disabled) without secrets.
- Per-tenant e-mail event flags, at minimum independent Equity and Debt
  investment confirmations; confirmation of which other events exist.
- Template model and editor (next block); sender/branding resolution.
- Conceptual permissions (EMAIL_SETTINGS_*, SMTP_*, EMAIL_EVENT_*) — not implemented.

## Items for Codex review

- Shared refactors: `useUnsavedChangesGuard` extracted from Settings;
  `SettingsSection` optional badge + `saveLabel`; `useSectionEditor` generic key
  + post-save draft reset; `WhitelabelSettings.integrations` removed (SMTP
  status now comes from the E-mails store).
- Sidebar compaction rules for four nested entries on short screens.
- Settings Terms history list indentation fix (ordered list reset).
- Cross-feature imports (E-mails uses Settings' section card, fields CSS and
  unsaved dialog) — candidates for a shared module later.

## Codex independent review (2026-10-06)

Reviewed the intact 14 tracked changes and 15 new files on the expected feature
branch at `df87de8e5d3ded2da3915c5de602620c282ab5ba`. The existing local Vite
server and Codex built-in browser were reused. No external browser, Backend,
business API, canonical handoff edit, push or deployment was used.

Screenshot-first review compared the supplied direction with the running SMTP,
events, Templates, session feedback, dialogs and responsive screens. SMTP remains
primary; Templates/activity remain secondary. Navy/violet cards, shell geometry,
typography, and the existing Dot Matrix are preserved. Incidental image counts,
editors, history and password-reveal controls were not reproduced.

### Minimal refinements

1. **Discard within a mounted tenant page:** observed that navigating from
   `emails?section=smtp` to `emails`, then choosing "Descartar e continuar",
   cleared dirty tracking but retained the SMTP draft. Emails now remounts section
   drafts on confirmed discard, without resetting saved session values. Settings
   uses the same cleanup and clears any Terms draft dialog. The shared navigation
   hook/history mechanism remains intact.
2. **900×600 rail:** utility links previously ended at 616px/662px, outside the
   viewport. A nested-navigation-only rule at ≤650px height reduces rail padding,
   brand separation, row heights and utility separation. Final utility bottoms
   are 544px/584px. Standard-height layout and non-Plataformas domains are unchanged.

Codex changed only `WhitelabelEmailsPage.tsx`, `WhitelabelSettingsPage.tsx`,
`Sidebar.module.css` and this frontend review record. Claude's other intentional
implementation files and approved reference image were preserved.

### Observed flow / health

| Step | Independent result |
| --- | --- |
| SMTP view/edit | Configured and unconfigured tenants render; blank write-only password on edit; no reveal control. Host/required-field/port-range validation and first-error focus passed. |
| SMTP save/discard | Local save updates read view, Templates sender and Settings SMTP summary. Discard restores saved values. Reopening after a synthetic password save is blank. |
| Secret boundary | Typed dummy test input is excluded from the store's explicit safe projection. Submitted draft is dropped; UI/activity/observed console contain no value. No persistent storage or network write exists. This is a prototype boundary, not secure Backend storage evidence. |
| Simulated test | Invalid destination rejected; confirmation defaults to Cancel; Escape returns focus; processing and result announce simulation/no real email. Desktop and 320px modal fit. |
| Events | Six labelled keyboard switches; Equity and Debt change independently. Dirty state requires explicit section save; discard restores prior values. Tenant isolation passed. Four illustrative events remain marked Backend-not-confirmed. |
| Templates/activity | Summary-only, no editor/counts; manage action shows a placeholder notice. Activity lists only actual local session actions/times with an explicit non-audit description. |
| Navigation guard | Links, tenant switch, browser Back/Forward, stay/discard and navigation after save/discard passed. Same-page discard regression retested successfully. Native beforeunload appeared on reload and navigation stayed with the draft intact. Tab-close uses the same handler; the user's preview tab was not destroyed to test it. |
| Shared Settings changes | Custom section save labels, optional badges, generic keys, post-save draft cleanup and removal of duplicate SMTP status are narrowly scoped. Settings validation, local save, feature discard and shared guard passed. |
| Responsive | 1672×941, 1440×810, 1280×810, 900×810, 390×844 and 320×740: no horizontal overflow. SMTP edit/error and test dialog at 320px also fit. |
| Short height | 900×600: utility links visible. 1440×600: full-sidebar utility links reachable by independent scroll and keyboard focus. Mobile drawer navigation/close checked. |
| Motion/fallback | Reduced-motion renders a static Dot Matrix frame; original animation code unchanged. Forced WebGL context loss and unavailable-context initialization both show the CSS static fallback. Browser-only diagnostics were removed by reload; media/viewport overrides reset. |
| Accessibility | Labels, aria-invalid/describedby errors, switches with Space, modal initial focus/inert background/keyboard containment, Escape/focus return, section status announcements and keyboard utility navigation checked. No fresh axe run is claimed. |
| Regressions | Login validation/password toggle/tab order, Dashboard, Whitelabels, Account Control actor/Terms tabs and Settings rendered and operated without observed regression. Feature-specific Login/Dashboard/Whitelabels rendering code and shared Dialog/Switch/Dot Matrix are unchanged. These are focused smoke checks, not a new exhaustive or pixel-diff suite. |
| TypeScript | `npm run typecheck`: pass. |
| Lint | `npm run lint -- --deny-warnings`: pass. |
| Build | `npm run build`: pass; pre-existing >500 kB advisory remains (current JS 684.73 kB). |
| Diff | `git diff --check`: pass; intentional feature/shared integration/reference files only. |
| Console/network | No app errors/exceptions observed. Motion emitted its expected reduced-motion advisory. Buffered network evidence contained only localhost GETs, but older events were evicted; a fresh bounded SMTP-save/test round had no requests, no errors and no truncation. Source contains no business API or SMTP client. No real email sent. |

Captured images are local review artifacts under
`C:/Users/User/Desktop/Loor/output/whitelabel-emails-review-20261006/`, outside
the commit: initial screen, validation, confirmation, responsive layouts,
before/after rail, fallbacks, regression screens and final preview. No real
credentials or Backend records were used. All synthetic session changes were
lost on reload as designed; no QA data is embedded in the source.

### Canonical handoff follow-up — after final visual approval only

No files on `docs/backend-handoff-v1` were edited. That branch remains at
`200346fda03da7a8aea8311077fa7ad4288b7aa5`.

The later handoff update should cover:

- `docs/backend-handoff/README.md` — reviewed frontend baseline/status and read order.
- `docs/backend-handoff/01-current-frontend-scope.md` — E-mails route/scope/exclusions.
- `docs/backend-handoff/05-whitelabel-settings.md` — replace future-only SMTP shortcut description with shared summary/management prototype evidence.
- New `docs/backend-handoff/06-whitelabel-emails.md` — HOW/WHEN/WHAT scope, write-only secrets, local versus authoritative state and acceptance boundaries.
- `docs/backend-handoff/matrices/backend-dependencies.md` — tenant-scoped safe SMTP reads/writes/test, event flags, template resolution and integration/E2E gaps.
- `docs/backend-handoff/matrices/permissions.md` — conceptual E-mails/SMTP/event read, configure and test permissions (not implemented RBAC).
- `docs/backend-handoff/matrices/business-rules.md` — independent Equity/Debt requirements, illustrative-event distinction and unresolved delivery/ownership policy.
- `docs/backend-handoff/matrices/audit-events.md` — sanitized configuration/test/event-change audit requirements, not session UI activity.
- `docs/backend-handoff/open-questions.md` — expand SMTP ownership/security/test policy and event/template decisions without implying Backend flags exist.

Architecture ownership and historical Core audit evidence are not changed by
this frontend review. Pending dependencies remain secure server-side secret
storage, authorized Control Plane/Core contracts and tenant scope, safe delivery
test/errors, durable sanitized audit, Product confirmation of illustrative events,
independent investment flags, sender/template resolution and later template
editing. No dependency is closed by a local prototype save.

**Review outcome:** technically ready for final user visual review and a later
selected OriginKit integration. No new OriginKit asset was searched or integrated.
Prepared for one local feature commit only; dev/main and the documentation branch
remain unchanged. Final user visual approval is still required before promotion.
