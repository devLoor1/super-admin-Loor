# Whitelabel Settings V1 — local implementation record

Implemented by Claude on 2026-10-06 on the local working tree of
`feature/super-admin-whitelabel-settings-v1` (baseline
`cc28f3c26e6a9ec0e905ca04c4a1f49c468e0d7a`). Recovered intact and independently
reviewed/refined by Codex on 2026-10-06 before a single local feature commit.
Status: validated frontend prototype, ready for the user's selected OriginKit
asset; **not Backend-integrated, not pushed or deployed**.

This is a frontend evidence record, not an API, persistence, legal or
inheritance specification. The approved image is a visual direction only:
[`reference/super-admin-whitelabel-settings-approved.png`](reference/super-admin-whitelabel-settings-approved.png).

## Route and navigation

- Route: `#/whitelabels/:whitelabelId/settings` (prototype hash switch in
  `src/app/App.tsx`; unknown ids show "Whitelabel não encontrado").
- Plataformas lists **Whitelabels**, **Contas** and **Config. do Whitelabel**
  (`whitelabel-settings` id, distinct from the global utility item
  `configuracoes`). Contas and Configurações pass `subNavHrefs` so both nested
  entries keep the displayed Whitelabel.
- The Whitelabels detail quick action *Configurações* now opens the route.
- Breadcrumb: Plataformas › Whitelabels › {Whitelabel} › Configurações.

## Page structure

Context row (back link, description, reused `WhitelabelContextSelector`),
section navigation (buttons that scroll to and focus each section heading, with
scroll-spy and an unsaved marker) plus a Padrão global / Personalizado legend,
then independent cards: Geral, Identidade, Experiência, Funcionalidades, Termos
de Uso and an SMTP summary. Content is wrapped in the shared `DetailTransition`
keyed by Whitelabel, and the Dot Matrix background is the shared Whitelabels
implementation (main area only).

## State model

- `WhitelabelSettings` with `SettingValue<T> = { value, source }`
  (`settingsModel.ts`); illustrative data per Whitelabel in
  `prototypeSettings.ts`; an in-memory store (`settingsStore.ts`) keeps local
  saves across in-app navigation until reload.
- `useSectionEditor` owns each section's draft, validation, simulated save
  (≈650 ms) and the transient "Salvo" state. Sections report dirty state to the
  page, which drives the section-navigation markers and the unsaved guard.
- Section badges: Configurado, Usando padrão, Não configurado, Alterado
  localmente, Salvando…, Salvo, Erro, Aguardando integração; Geral is Somente
  leitura and Termos is Publicado / Não configurado.

## Product boundaries kept

- Geral is read-only; no tenant pause/deactivation and no account-pause reuse.
- Domain and public URL are read-only (copy only); no callback/API/env fields.
- Funcionalidades lists only Perfil do investidor, Wallet, Investimento anônimo
  como padrão and Informações da oportunidade.
- Termos de Uso: publication is immediate and local; no re-acceptance is
  requested. No Privacy Policy.
- SMTP: status + *Gerenciar SMTP* notice only. No integrations module.
- No "Pendências de backend" panel; dependency states are expressed with
  Aguardando integração / Usando padrão / Não configurado.

## Claude implementation QA (2026-10-06)

The following is the recovered implementation record supplied by Claude, not
a claim that Codex reran the original 67-assertion script or axe suite.

| Check | Result |
| --- | --- |
| `npm run typecheck` / `tsc -b` | Pass |
| `npx oxlint --deny-warnings` | Pass (0 warnings) |
| `npm run build` | Pass (existing >500 kB chunk warning only) |
| Scripted interactions (Playwright, 67 assertions) | 67/67: quick action route, sidebar state, section nav, edit/dirty/saving/saved, validation + focus, discard, switches (keyboard), restore default, unsaved guard (selector + link + beforeunload), Terms publish/view/draft discard, SMTP notice, copy, file type/size checks, session persistence, not-found |
| Overflow sweep 1672 / 1440 / 1280 / 900 / 390 / 320 | `scrollWidth == innerWidth` everywhere (Finapop and Nova Plataforma) |
| axe-core 4.x (scratch copy) | No violations in view, edit/error, selector, dialogs (1440) and page (390); open mobile drawer `aria-allowed-role` (minor) predates this phase |
| Reduced motion / motion / no-WebGL | No console errors; transition runs only with motion; static Dot Matrix fallback without WebGL |
| Console / network | No errors; no requests outside the local origin |
| Regression (pristine build vs this build, WebGL off) | Login and Dashboard pixel-identical; Contas main area identical (sidebar gains the third entry); Whitelabels differs only in the sidebar and the quick-actions copy |

## Known product / Backend dependencies

- Settings persistence, default/override inheritance and validation rules.
- Asset upload, storage, formats and size limits.
- Production Terms revision model, publication workflow and whether/when users
  must re-accept. Local Settings/Contas current-revision coherence is resolved.
- SMTP status and management (next block).
- Confirmed feature-flag semantics for the four capabilities.

## Codex review decisions and independent QA (2026-10-06)

Browser control was restored after the restart. The existing project Vite setup
was restarted at `http://127.0.0.1:5173/`; all interactions used the Codex
built-in browser, not external Chrome. Product Design's screenshot-first audit
was used to preserve the approved direction and its intentional exclusions.

### Minimal refinements

- **Terms coherence:** Account Control subscribes to the existing in-memory
  Settings store rather than a second hardcoded current-revision map. A local
  Finapop publication made revision 5 current in both screens; the illustrative
  Investor still showed accepted revision 4 and its original acceptance date.
  No re-acceptance or Backend persistence was introduced. Reload restores seeds.
- **History guard:** a small prototype-only navigation subscription guards
  same-document hash Back/Forward before unmounting Settings. Tagged entries
  restore the actual history position when the user stays; explicit discard
  resumes the original traversal. Pre-app untagged entries use URL restoration;
  leaving the document/reload/tab close retains the native beforeunload prompt.
  No routing framework was added.
- **Label:** the tenant sidebar item is now `Config. do Whitelabel`; the global
  utility remains `Configurações`. The title, breadcrumb and quick action retain
  their contextual wording.
- **Draft Escape:** repeated native Escape could close a dialog invisibly while
  leaving its React draft mounted. The shared Dialog now intercepts Escape before
  that native default; Terms remains on the discard choice until explicit discard
  or continuing the edit. Other dialogs still close once and restore opener focus.

### Observed checks

| Check | Independent result |
| --- | --- |
| General | Read-only tenant identity, domain, public URL and lifecycle; copy controls only |
| Identity | Invalid hex blocks save and focuses the field; restoring primary-color default shows default source and updates the illustrative preview; local save succeeds |
| Experience | Required-field validation/focus, local save/readback, discard and tenant-switch guard pass; saved copy survives in-app navigation and resets on reload |
| Features | Only four established concepts; Space/Enter switch interaction, discard and local save pass; source tags remain distinct from permissions/plans |
| Terms | Current/history and empty first-revision state pass; local revision 5/current vs accepted revision 4 confirmed; repeated Escape and explicit draft discard pass |
| Unsaved navigation | Sidebar/in-app link, tenant switch, Back stay/discard and Forward stay/discard pass; staying preserves the field value and mounted draft |
| Section navigation | Scroll/focus targets the section heading; section hash does not replace the page route |
| SMTP | Summary/placeholder notice only; no provider, credentials or send action added |
| Responsive | 1672×941, 1440×810, 1280×810, 900×810, 390×844 and 320×740 checked; document/body widths never exceed viewport; desktop two columns and smaller-width single column preserve natural card heights; narrow title wraps |
| Mobile dialogs | Terms and unsaved dialogs fit at 320px; dialog body scrolls independently and footer actions remain reachable |
| Keyboard/focus | Invalid-field focus, Space/Enter switches, section-heading focus, modal containment, Escape and opener recovery pass; drawer makes main inert and returns focus to menu button |
| Reduced motion | Browser emulation confirms reduced-motion preference and 0.01ms CSS transitions; edit/focus behavior remains usable |
| No WebGL | Temporary browser-only getContext diagnostic produces zero WebGL renderers/canvases; existing CSS Dot Matrix fallback remains visible; diagnostic removed and reload restores WebGL |
| Shared styles | Danger tone is additive; title wrap is limited to <480px; global dark-surface change targets Settings only; existing Dot Matrix implementation/intensity and other OriginKit components are untouched |
| Regressions | Login validation/password toggle and 320px overflow pass; Dashboard and Whitelabels load; Settings quick action preserves tenant; Account Control tabs, Terms and pause-dialog Escape/focus pass at desktop/narrow widths |
| Console / network | No observed console errors/warnings; fresh document Resource Timing sample: 149 resources, zero external resources and zero fetch/XMLHttpRequest entries; no business API client or calls exist in the reviewed prototype source |
| TypeScript / lint / build | `npm run typecheck`, `npm run lint -- --deny-warnings` and `npm run build` pass; existing >500 kB chunk advisory remains (JS ≈654 kB, gzip ≈206 kB) |
| Diff check | Tracked and staged/new-file whitespace checks pass before commit |

This was focused keyboard/semantic/visual QA, not a new full WCAG certification.
The previously reported mobile-drawer axe finding is retained separately; Codex
did not claim to rerun axe or the previous pixel-diff suite. The earlier CDP
event cursor was evicted, so the fresh Resource Timing sample and source review
were used instead of treating the empty old event buffer as proof. Occasional browser
action/locator timeouts were reconciled against the current DOM/URL before any
next action; they were not treated as duplicate-action authorization.

Captures are local QA artifacts under
`C:/Users/User/Desktop/Loor/output/whitelabel-settings-review-20261006/`
(Settings widths, mobile Terms/unsaved dialogs, fallback and regression views),
not canonical Backend documentation or shipped assets.

### Backend handoff impact after final visual approval

Do not change the preserved `docs/backend-handoff-v1` branch in this review.
Existing files to update in that later documentation task:

- `docs/backend-handoff/README.md` — scope/index/provenance.
- `docs/backend-handoff/01-current-frontend-scope.md` — Settings prototype boundary.
- `docs/backend-handoff/03-whitelabels.md` — contextual Settings entry/navigation.
- `docs/backend-handoff/04-whitelabel-account-control.md` — current Terms vs accepted revision.
- `docs/backend-handoff/matrices/backend-dependencies.md` — settings/assets/inheritance/SMTP boundaries.
- `docs/backend-handoff/matrices/business-rules.md` — defaults, flags and publication/re-acceptance decisions.
- `docs/backend-handoff/matrices/permissions.md` — future Settings/Terms authority, not prototype switches.
- `docs/backend-handoff/matrices/audit-events.md` — future changes/publication audit requirements.
- `docs/backend-handoff/open-questions.md` — append/reconcile Settings-specific questions without rewriting existing decisions.

The Backend audit and its findings are not reopened by this frontend review.
