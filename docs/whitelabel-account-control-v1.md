# Whitelabel Account Control V1 — frontend review

Reviewed by Codex on 2026-10-06, preserving Claude's 2026-10-05 local implementation.
Status: technically ready for user visual review; **not Backend-integrated**.

This is a frontend review/evidence record, not an API, RBAC, migration, legal or
persistence specification. The canonical handoff stays on the separate preserved
documentation branch:

- [Accepted Backend handoff](https://github.com/devLoor1/super-admin-Loor/tree/bbda57265f27724b540fd16546228523fbc0ba7d/docs/backend-handoff)
- [Account-control requirements](https://github.com/devLoor1/super-admin-Loor/blob/bbda57265f27724b540fd16546228523fbc0ba7d/docs/backend-handoff/04-whitelabel-account-control.md)
- [Prior read-only findings](https://github.com/devLoor1/super-admin-Loor/blob/bbda57265f27724b540fd16546228523fbc0ba7d/docs/backend-handoff/audit-findings.md)
- [Approved direction](reference/super-admin-whitelabel-account-control-approved.png)

## Git recovery

Initial branch: `docs/backend-handoff-v1` at
`bbda57265f27724b540fd16546228523fbc0ba7d`. Claude left 17 modified tracked
files and 21 new files, with nothing staged or committed.

The documentation commit differed from the approved development baseline only
inside `docs/backend-handoff/`. A direct carry-over switch created
`feature/super-admin-whitelabel-accounts-v1` at
`f903f98357ee7d44516c67475a498fc609ca772f`. SHA-256 comparison confirmed all
38 dirty files were byte-identical immediately after the switch. No stash,
reset, overwrite, squash or history rewrite was required.

Preserved refs:

- `dev` / `origin/dev`: `f903f98357ee7d44516c67475a498fc609ca772f`.
- `main` / `origin/main`: `c2235ac5d0d65408e9d39bf836a1a717da3d95ae`.
- Documentation branch / remote: `bbda57265f27724b540fd16546228523fbc0ba7d`.

The feature intentionally does not copy the canonical handoff directory from the
documentation branch. Pinned links avoid broken relative references or competing
Backend truth. This task ends with one local feature commit, without push/deploy.

## Navigation and visual assessment

Route: `#/whitelabels/:whitelabelId/accounts`, optionally
`?tipo=investidores|empreendedores|administradores`. Unknown IDs have an honest
empty state. Records are illustrative: example.com addresses, masked documents,
prototype IDs, no financial amounts.

The shell and top-level domains, including **Auditoria**, remain intact. Only
Plataformas gains Whitelabels / Contas sub-navigation. Within Contas its link
preserves the displayed tenant. Whitelabels quick actions Contas / Administradores
use the selected Whitelabel's route.

Navy/violet surfaces, typography, list/detail hierarchy and Dot Matrix are retained.
The breadcrumb deliberately sits below the existing shell title and wraps on
phones. Approximately 57–91px of vertical scrolling at 1672×941 is normal,
depending on the selected detail; narrower layouts intentionally stack. Cards
separate identity, actions and dependencies without forcing an above-fold fit.
The extra quick-action row adds existing prototype destinations, not global taxonomy.

The reference image stays versioned because it is useful for visual review.
Its illustrative counts and unavailable bulk/edit/email actions are not claims
of implemented capability. Header integration and persistent detail follow the
existing approved shell/Whitelabels rather than redesigning them.

## Functional local checks

| Step | Verified behavior | Boundary |
| --- | --- | --- |
| Context / actor tabs | Tenant-scoped records, empty tenant, URL and Admin quick action | Local datasets only |
| Search / filters / sorting | Name/ID search, independent access/business filters, empty result, clear and sorting | No server search |
| Selection / paging | Visible active row agrees with detail; row actions focus the displayed account | Single selection |
| Investor detail | Classification/questionnaire, null profile, accepted/current Terms revisions | Read-only; no invented reacceptance |
| Entrepreneur detail | Company/CNPJ and company validation separate from access | Illustrative readiness, not a Core API enum |
| Pause / reactivate | Required reason/preservation copy; denied Investor remains denied | Backend IMPLEMENTATION PENDING |
| Reassignment | Destination → impact/dependencies → reason/ack → simulated outcome | Tenant/lineage do not move |
| New Admin | Name/email errors, duplicate email, fixed tenant, conceptual function/access | No invitation/password/grant |
| History | Local events/reasons; illustrative dates distinguished | Not persistence or an audit ledger |

Local checks used Bruno Rocha for pause/reactivate and a Finapop → Loor simulation;
`Revisão QA Local` / `revisao.local@example.com` for local Admin creation.
Reload restores fixtures and clears session changes. No persistent QA record,
business API or financial mutation is involved.

## Codex refinements

- Visible-page selection prevents details retaining an off-page account.
- A displayed-identity callback replaces the fixed 220ms action-focus timer.
  Exiting content is inert so its old buttons cannot act on the incoming account.
  Same-identity action focus remains immediate.
- Context-specific Contas navigation no longer resets another tenant to Finapop.
- Segmented tabs expose responsive ARIA orientation and matching arrow keys,
  Home/End and roving tabindex.
- Transfer step markers stack on phones, fixing internal 320px overflow.
- Removed the invented role-to-permission grant matrix. Candidate areas read
  **A definir**; Product/Backend must decide the matrix.
- Corrected copy: Core menu visibility is per administrator, not per Whitelabel.
- Hides a lost-context canvas so it cannot cover the static Dot Matrix fallback.
  Normal WebGL shaders, colors, intensity and motion are unchanged.

## Shared ownership and duplication

`DetailTransition` moves to `src/components/ui/`, retaining existing spring/
stagger language, generic identity handling and reduced motion. `EntityAvatar`
and its unchanged CSS move there too; both have consumers in two features.

Reusable shared changes are limited to optional breadcrumb/context destinations,
nested navigation, parent aria-current, segmented/oriented Tabs, React 19 button
ref support and native modal Dialog (Escape, inert background, focus return).
No dependency was added.

Dot Matrix stays in Whitelabels visuals because of its existing accent/fallback
configuration. This is documented feature coupling; moving the shader/style/
accent family would add churn. Shader, palette, alpha, intensity (0.50), speed
and raster caps remain unchanged. No OriginKit asset was searched or newly
integrated. Radial Reveal and detail motion remain existing assets.

Table surface duplication is retained: actor columns, badges, paging and container
breakpoints differ materially. Shared tokens/UI primitives already provide
consistency; a generic table abstraction is not justified by this review.

## Independent validation

Only the Codex built-in browser and localhost were used. Current-run screenshots
were compared against the approved reference before refinements.

| Viewport | Accounts: all three types | Admin/pause/transfer dialogs | Shell |
| --- | --- | --- | --- |
| 1672×941 | Split; no horizontal overflow | No internal horizontal overflow | Full sidebar |
| 1440×810 | Split; no horizontal overflow | No internal horizontal overflow | Full sidebar |
| 1280×810 | Stacked; no horizontal overflow | No internal horizontal overflow | Full sidebar |
| 900×810 | Stacked; no horizontal overflow | No internal horizontal overflow | Rail/subnav |
| 390×810 | Stacked; no horizontal overflow | Scrollable body/stacked actions | Drawer |
| 320×810 | Stacked; no horizontal overflow | Step labels fit/stacked actions | Drawer |

Keyboard/DOM checks: actor/detail arrows and Home/End, error focus, action focus,
modal Escape/opener restoration, drawer focus wrapping/background inertness.
Terms/Profile null states and no-results states are readable. This is manual
visual/keyboard QA, not a WCAG certification or an axe rerun.

Reduced motion: static Dot Matrix frame, immediate readable detail/action focus.
Forced no-WebGL startup: zero canvases, readable static pattern. Context loss:
fallback is visible and the opaque canvas is hidden. All diagnostic overrides
are removed; normal WebGL is restored.

Login, Dashboard and Whitelabels were checked at all six widths without page
overflow. Login errors, E-mail → password Tab, toggle and local-only submit notice
pass. Whitelabel row selection and tenant-specific Admin navigation pass.
Login/Dashboard source is unchanged. Whitelabel changes are intended navigation,
shared imports and the fallback correction only.

Dot Matrix was observed in normal motion for more than 10 seconds: recognizable
behind opaque/readable cards, no sidebar/header leakage, approved intensity preserved.

Commands: `npm run typecheck`, `npm run lint -- --deny-warnings`,
`npm run build`, `git diff --check`: all passed (exit 0).
The production build processed 2,467 modules; JavaScript output was 599.31kB
(190.96kB gzip). The existing >500kB Vite chunk advisory remains non-blocking.

Console: temporary HMR errors during import moves resolved by reload. Motion's
expected reduced-motion diagnostic is separate from application errors. The final
clean post-reload capture had no console errors/warnings or runtime exceptions.
Its 125 requests were GETs to localhost only, with no business API or mutation
request. The event capture was not truncated.

Captures: `C:/Users/User/Desktop/Loor/output/whitelabel-accounts-review-20261006/`.
These are unversioned QA artifacts, not another Product/Backend specification.

## Reviewed file manifest

All 38 files originally left by Claude were reviewed, including the complete
new module and shared-file diffs:

```text
README.md
docs/reference/super-admin-whitelabel-account-control-approved.png
docs/whitelabel-account-control-v1.md
src/app/App.tsx
src/components/originkit/GlassNavItem.tsx
src/components/shell/AppShell.tsx
src/components/shell/Sidebar.module.css
src/components/shell/Sidebar.tsx
src/components/shell/TopHeader.module.css
src/components/shell/TopHeader.tsx
src/components/shell/navigation.ts
src/components/ui/OutlineButton.tsx
src/components/ui/Tabs.module.css
src/components/ui/Tabs.tsx
src/features/whitelabels/WhitelabelDetailPanel.module.css
src/features/whitelabels/WhitelabelDetailPanel.tsx
src/features/whitelabels/WhitelabelsPage.tsx
src/features/whitelabels/visuals/DetailTransition.tsx
src/styles/global.css
src/components/ui/Dialog.module.css
src/components/ui/Dialog.tsx
src/features/whitelabel-accounts/AccountBadges.module.css
src/features/whitelabel-accounts/AccountBadges.tsx
src/features/whitelabel-accounts/AccountDetailPanel.module.css
src/features/whitelabel-accounts/AccountDetailPanel.tsx
src/features/whitelabel-accounts/AccountListPanel.module.css
src/features/whitelabel-accounts/AccountListPanel.tsx
src/features/whitelabel-accounts/WhitelabelAccountsPage.module.css
src/features/whitelabel-accounts/WhitelabelAccountsPage.tsx
src/features/whitelabel-accounts/WhitelabelContextSelector.module.css
src/features/whitelabel-accounts/WhitelabelContextSelector.tsx
src/features/whitelabel-accounts/accountListConfig.ts
src/features/whitelabel-accounts/accountModel.ts
src/features/whitelabel-accounts/prototypeAccounts.ts
src/features/whitelabel-accounts/dialogs/AccessDialogs.tsx
src/features/whitelabel-accounts/dialogs/AccountDialogs.module.css
src/features/whitelabel-accounts/dialogs/ChangeWhitelabelDialog.tsx
src/features/whitelabel-accounts/dialogs/NewAdminDialog.tsx
```

Additional existing source reviewed for ownership/regression: EntityAvatar and
its CSS, DotMatrixBackground and its CSS, Login/Dashboard sources, and the pinned
canonical account-control requirements/audit. The original reference image was
visually compared, not modified.

Codex changed the following paths beyond Claude's initial state:

```text
README.md
docs/whitelabel-account-control-v1.md
src/components/shell/AppShell.tsx
src/components/shell/Sidebar.tsx
src/components/ui/Tabs.tsx
src/components/ui/DetailTransition.tsx (moved from Whitelabels; identity callback/inert exit)
src/components/ui/EntityAvatar.tsx (moved; generic ownership comment)
src/components/ui/EntityAvatar.module.css (moved; unchanged contents)
src/features/whitelabels/WhitelabelDetailPanel.tsx
src/features/whitelabels/visuals/DotMatrixBackground.module.css
src/features/whitelabel-accounts/WhitelabelAccountsPage.tsx
src/features/whitelabel-accounts/AccountDetailPanel.tsx
src/features/whitelabel-accounts/AccountDetailPanel.module.css
src/features/whitelabel-accounts/WhitelabelContextSelector.tsx
src/features/whitelabel-accounts/accountModel.ts
src/features/whitelabel-accounts/dialogs/AccountDialogs.module.css
src/features/whitelabel-accounts/dialogs/ChangeWhitelabelDialog.tsx
src/features/whitelabel-accounts/dialogs/NewAdminDialog.tsx
```

No Login/Dashboard source, dependencies, package lock or canonical handoff file
was modified. No new OriginKit work or backend implementation was performed.

## Handoff impact — after user visual approval only

No canonical handoff file is changed in this task. Update these exact files on
the documentation branch after approval, without rewriting the prior Core audit:

- `docs/backend-handoff/README.md`: frontend baseline/new reviewed prototype.
- `docs/backend-handoff/01-current-frontend-scope.md`: route/local flows/shared primitives.
- `docs/backend-handoff/03-whitelabels.md`: Contas/Admin quick actions open a prototype.
- `docs/backend-handoff/04-whitelabel-account-control.md`: frontend exists; Backend pending.
- `docs/backend-handoff/matrices/backend-dependencies.md`: frontend readiness, not Backend completion.
- `docs/backend-handoff/matrices/business-rules.md`: demonstration/unresolved policies separate.
- `docs/backend-handoff/matrices/permissions.md`: candidate labels, no approved grant matrix.
- `docs/backend-handoff/matrices/audit-events.md`: local feedback, not delivered durable audit.
- `docs/backend-handoff/open-questions.md`: reviewed UI without silently answering open decisions.

`00-context-and-architecture.md`, `02-dashboard.md` and historical
`audit-findings.md` need no factual rewrite for this frontend addition.

Remaining dependencies: Super Admin identity/authorization/tenant scope; access
state enforcement and session revocation; idempotent pause/reactivate; safe
reassignment eligibility/lineage; Admin provisioning/invitation/password policy
and RBAC; authoritative dependencies, Terms/reacceptance/global questionnaire
read models; durable audit and persistence/error contracts. None is presented
as implemented by this prototype.
