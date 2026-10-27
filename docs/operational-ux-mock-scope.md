# Operational UX refinement — narrowly scoped mock surfaces

Date: 2026-10-27. Base: live `origin/mock` at `fdaa86c611aebced17215691cd7de9b7097d4bb4`, independently confirmed before creation of `feature/mock-operational-ux-structural-v1`.

This inventory was written before presentation edits. It limits the mock changes to existing explorations with an active Backend/Product qualification dependency. It does not redesign the entire demonstration or enable any operational behavior.

## Route → active dependency → permitted files

| Existing route/surface | Qualification dependency and source | Permitted files in this refinement |
| --- | --- | --- |
| `#/whitelabels/wl_proto_01/settings`, `#settings-entry-studio`; existing Login, Cadastro and Completar dados editor | AST01 entry presentation/image qualification and APP-01 consumer alignment; Core PR50. Existing matrix and requirements: [Admin parity](admin-parity-matrix.md), [branding handoff](branding-contract-handoff.md). Local preview is not consumer acceptance. | `src/features/whitelabel-settings/MockConfigurationStudio.tsx`, `MockConfigurationStudio.module.css`. Only `MockEntryStudio` and shared editor/preview presentation. |
| `#/whitelabels/wl_proto_01/emails?section=templates`; existing four editorial templates and email branding preview | EML01 editorial bridge and EMB01 email branding separation; Core PR50 and Nest PR1. Preserve transactional variables/destinations/attachments and no-send preview; [branding handoff B5](branding-contract-handoff.md). | The same two `MockConfigurationStudio` files, only `MockEmailStudio` and shared presentation. SMTP, events and template-summary stores remain unchanged. |
| Numeric Accounts route `#/whitelabels/1/accounts`, Investor/Entrepreneur type selection, creation dialog and newly created participant onboarding explanation | [Account creation handoff](account-creation-backend-handoff-v1.md): no qualified Control Plane participant-create endpoint, credential/verification/legal/idempotency/readback policy still required. [Mock behavior](mock-account-creation-v1.md) remains the offline acceptance reference. | `src/mock/account-creation/MockAccountCreateAction.tsx`, `MockAccountOnboarding.tsx`, `MockAccountCreation.module.css`. Initial contact/review/draft and explanatory onboarding only. |

`wl_proto_01` is an illustrative tenant. Numeric IDs in this branch are synthetic protocol fixtures, not live tenant/account identities.

The newer operational AST checkpoint and handoff were also read in the preserved `super-admin-settings-evolution-v1` worktree (`docs/ast01-settings-email-redesign-checkpoint.md`, `docs/multi-tenant-settings-backend-handoff.md`, `docs/branding-contract-handoff.md`). They qualify the existing asset association/consumer gap, complete stored App-value preservation, 17-type candidate Email bridge and email-branding alias handling. This four-template mock editor remains an illustrative subset; this refinement neither claims full 17-type parity nor changes the prepared Core/Nest work. Historical mock-branch handoff text is not used to override those newer contract findings.

## Intended structural changes

- Group existing editorial fields into named tasks without changing any field, limit, value or save behavior.
- Make editor and preview areas easier to distinguish; retain the existing narrow-screen choice, desktop/mobile preview and draft/saved comparison.
- Group initial participant contact fields coherently and keep review, drafts and unfinished onboarding responsibilities distinct.
- Place onboarding stage navigation beside its explanatory content where space permits, with one-column mobile fallback. Selecting a stage remains explanatory and never completes it.

Implemented presentation: email fields are grouped as message identification and body/signature; editor/preview are named regions with a semantic preview heading; narrow editor/preview selectors have equal hit areas. Participant name spans the contact group, with email/phone side by side only when the dialog has space. Onboarding uses a container-width condition (560px) rather than the viewport, keeping the nested narrow detail panel stacked. Its selected-state label is visible and all accessible IDs are instance-scoped.

No new sections, fields, onboarding capability or operational command are introduced. Existing parent-page mounts should remain untouched unless a concrete integration defect proves otherwise.

## Explicitly frozen

- Shared tokens, globals, shell, Login, Dashboard, all Finance screens, gallery and transport/auth/CSP.
- Whitelabel lists, shared account panels, SMTP/event simulations, Terms, generic Settings sections and backend-facing adapters.
- Platform App/Forgot-password fields outside `MockConfigurationStudio`: existing source puts them in `PlatformAppSection`; they are preserved rather than pulled into this patch.
- All other mock routes and stores, including historical KYC and legacy Accounts.
- Dependencies, Backend/Core code and official Netlify configuration.

## Preservation/acceptance boundaries

- Preserve separate mock session keys, in-memory data, `connect-src 'none'`, external-link guard and visible MOCK marker.
- Preserve tenant/type draft isolation, validation, unsaved navigation guard, focus, payloads, single-dispatch locks, synthetic readback and restore/reset behavior.
- No operational token, live GET/write, mail, provider or financial activity. Mock save/receipt is evidence only about the offline prototype.
- Browser before/after evidence must identify the same base fixtures and state. No browser result is asserted until captured by the parent reviewer.
- Required final checks remain `check:mock`, TypeScript, lint, build, diff and targeted browser QA. Heavy checks/builds are coordinated with the parent task.
- This branch must never be merged into `dev` or `main`, nor deployed to the official homolog project. No commit/push is made during the initial refinement subtask.

## Initial handoff to visual review

- Diff scope: the five permitted source files plus this inventory; no parent-page mount changed.
- Scoped oxlint and `git diff --check`: exit0.
- Existing approved mock `dist` was copied unchanged to external `tmp/operational-ux-20261027/mock-baseline-dist`, with a SHA256 asset inventory; no fresh baseline build is claimed.
- Baseline static preview `http://127.0.0.1:4443/` and candidate DEV `http://127.0.0.1:4444/` returned HTTP200. Baseline response and candidate HTML retain `connect-src 'none'`.
- Final coordinated validation completed after the operational suite window: both maintained `check:mock` scripts, TypeScript, lint, production build (`tsc -b` and Vite) and `git diff --check` all exited0. Boundary coverage includes66 successful protocol reads plus isolation/rejection checks; account-creation coverage includes3 creation/readback variants, draft/tenant/role/duplicate separation and frozen Finance. No network was invoked by either suite. Logs are external in `tmp/operational-ux-20261027/mock-checks/`.
- Candidate production preview: `http://127.0.0.1:4445/`, normal Vite preview. HTML and both assets returned HTTP200; HTML keeps `connect-src 'none'`. JS `index-C36ZYq-8.js`, CSS `index-CE20E23_.css`; complete SHA256 manifest remains external. Existing chunk-size and plugin-timing advisories are non-blocking; no new implementation or test rerun was introduced after this pass.
- Parent browser review completed on the production build in the Codex built-in browser. Entry studio, Email studio, participant creation dialog and onboarding were checked at actual viewport widths 1672,1440,900,390,320. Document width never exceeded the viewport. Dense content remains vertically scrollable; mobile editor/preview switching preserves the draft. Screenshots and the measured matrix are external in `tmp/operational-ux-20261027/after/` and `mock-responsive-matrix.json`.
- Email: edited one clearly synthetic subject, compared draft with the previous saved value, saved only in the tab, edited again and discarded back to the saved value. Template switching retained independent content. No mail was sent. Entry: a synthetic title appeared in the preview and was discarded. Desktop editors and previews remained side by side while scrolling; these compact surfaces do not add a sticky layer.
- Participants: created one synthetic Investor in tab memory through the contact/review flow, confirmed the synthetic receipt and opened its account. Onboarding selection changed only explanatory content; verification, terms, credentials and profile stayed pending. Tab advanced to the next stage button; reduced-motion produced no onboarding animations. No real account, credential or legal acceptance was created.
- Dialog fields/actions remained reachable at320px with internal vertical scrolling. The inherited global MOCK badge and surrounding frozen Accounts layout were not redesigned. This is targeted keyboard/focus coverage, not a new claim of exhaustive modal focus-trap certification.
- Before/after examples use the frozen baseline and candidate with the same synthetic tenant/width. Contact grouping makes the initial task explicit; named editorial groups distinguish message identification from body/signature; onboarding keeps explanation adjacent only when its actual container has room.
- Production sources, checks and isolation configuration were reviewed unchanged after QA: five scoped source files plus this document only. Auth, transport, in-memory stores, CSP, dependencies, global styles and all frozen surfaces remain identical to the base. No live business or financial operation, credential handling or operational deployment occurred from this mock.
- Publication is a separate normal push to `mock` with `[skip netlify]`, retaining the existing fail-closed Netlify configuration. No merge into `dev` or `main` and no permanent additional remote feature branch.
