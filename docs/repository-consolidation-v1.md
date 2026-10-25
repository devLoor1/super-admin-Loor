# Repository consolidation, mock separation and data presentation

Requested and authorized 2026-10-25. Initial operational baseline: `450b9d5a5a1eabb6f986222bf2e08e0b18a71464`.

## Initial preservation inventory

Fresh `git fetch origin` and `git ls-remote --heads origin` agree. The machine-readable inventory in `repository-inventory-2026-10-25.json` records every local and live remote branch, exact tip, ancestry counts and attached worktree. There were 45 local branches, 41 live remote branches (46 distinct names), 20 attached worktrees, no detached worktrees, no tags, notes or stashes. All worktrees had zero modified tracked files and zero untracked files. Their ignored top-level entries were only `node_modules/` and `dist/`.

Every feature/fix branch was incorporated in dev. The only divergent branch was `docs/backend-handoff-v1@89a3b5058f52f981b3a1b06756d7f33a2a043f27`: 11 unique documentation commits, 25 files and 2,577 added lines. Its merge base is `f903f98357ee7d44516c67475a498fc609ca772f`. These historical contracts must remain recoverable through a verified annotated archive tag before removing the obsolete branch. They are historical handoff documentation, not the current authoritative live contract.

`main@c2235ac5d0d65408e9d39bf836a1a717da3d95ae` remains unchanged. All original attached local feature branches and worktrees are retained; their remote historical branch refs are eligible for removal only after mock publication and verified durable preservation. No worktree is removed to achieve a tidier branch count.

## Branch responsibilities

- `main`: unchanged stable baseline.
- `dev`: real Control Plane integrations, the same truthful states in development and production; no simulated fallback.
- `mock`: independently runnable shared prototype, synthetic local transport, no connection to the official Netlify deployment or live business API.

The new explicit repository separation supersedes the earlier instruction to retain executable prototypes in local dev. Historical visual and QA artifacts remain preserved on mock, in test-only fixtures and in reachable Git history.

## Security and acceptance

No Backend/Core modifications or live business/financial mutations are part of this work. Existing RBAC, authentication/session, tenant isolation, unsafe Finance-response rejection, secret redaction and the 23-ID Menu Visibility registry are preserved. Full-value business presentation is field-specific; see `data-presentation-audit.md` for supported changes and contract limits.

Release evidence will distinguish local synthetic/browser validation from official deployed read-only verification. Exact publication SHAs, served assets, Menu Visibility version/hash and branch-retention results are recorded after the acceptance gates complete. No unverified publication claim is made here.

## Maintained regression boundaries

Older suites include exact source freezes from earlier deliveries. The consolidation deliberately moves prototypes and changes specific presentation functions covered by those freezes. `scripts/consolidation-reviewed-files.json` lists every reviewed runtime delta with before/after SHA-256 values and exact historical fixture locations. `reviewed-consolidation-boundary.mjs` reverses only those pinned deltas for inherited historical comparisons; it does not change the code executed by behavioral tests. It refuses unknown changes, extra source bytes and changed historical fixtures. No whole domain is exempted. Current operational separation, presentation, API safety and role/tenant behavior receive direct maintained checks in addition to the historical suites. Test-only fixture lookup never participates in application imports or Vite builds.

## Prototype material separated from operational runtime

86 unreachable TypeScript/TSX/style files were moved byte-for-byte to `tests/prototypes/<original source path>`: Settings editors/dialogs/stores, E-mail/SMTP prototypes and Orbit Border visual, Gateway/Bank configuration prototypes, Equity/Debt rule prototypes, independent Segment/Resource Use catalogs, old KYC decisions/stores, Account/tenant fixtures, participant records, simulated session activities and the unsupported operational-health panel. Historical originals of shared components remain test-only where needed. The separate mock branch retains and recovers runnable prototype interfaces rather than relying on the operational test fixtures.

Real Settings reads render directly. Local and built operational routes both reject unsupported configuration pages; supported real reads and accepted Opportunity/Account/Admin lifecycle controls remain. Removed header commands, placeholder Dashboard KYC/health panels, placeholder Whitelabel tabs/actions and fabricated session activity cannot imply Backend capability. Toasts and unsaved-navigation protection were retained under operational names.

## Completed preservation and candidate acceptance

`mock@ed69b1f36ba4a084e55269979cf3e0d758419f0f` is published. A fresh single-branch GitHub clone completed `npm ci`, the mock isolation/protocol suite, an independent production build and browser startup with its own installed dependencies. Its served assets match the reviewed mock worktree build. Twenty-one representative current/legacy routes loaded; five responsive widths passed on Whitelabels, Settings and recovered Accounts. A simulated versioned save/readback changed only in-memory mock data and dispatched zero HTTP business requests. The gallery dock was corrected and retested so it does not cover mobile sticky actions. See the branch's `MOCK.md` for setup and intentional model limits.

The operational candidate passed all 33 maintained suites / 4,397 checks, including the new raw-current-source separation suite and field presentation checks. TypeScript, oxlint, production build and diff checks passed. The inherited bundle-size advisory remains. Development/production semantic checks both use the operational policy. Production-built browser review covered 1672, 1440, 900, 390 and 320 px for changed Operator, Company, Account and transaction-reference presentation, with no page overflow; retained operational routes and unsupported direct URLs were checked at 320 px. Keyboard menu/Escape focus restoration, truthful 502/no-fallback and READ_ONLY denial were verified using external loopback-only synthetic transport. This is local synthetic evidence, not live Backend E2E.

Fresh official authenticated GETs confirmed SUPER_ADMIN and Menu Visibility version 5, 23 preferences, sorted-map SHA-256 `fb7910fbb9e0e3baeb6016151cdadcdce0d40723d10331a74e44b9394df5b7fe` before publication. No preference or business/financial mutation occurred.

`branch-consolidation-results.json` records all 39 removed remote refs and 24 removed local refs with their exact tips and preservation references. Nineteen original local feature branches remain attached to their clean worktrees and are retained intentionally. No original worktree was removed. The live remote branch set after cleanup is exactly `main`, `dev`, `mock`.

Verified annotated archive references:

- `archive/2026-10-25/pre-consolidation-dev` → `450b9d5a5a1eabb6f986222bf2e08e0b18a71464` (all historical feature tips remain ancestors).
- `archive/2026-10-25/backend-handoff-v1` → `89a3b5058f52f981b3a1b06756d7f33a2a043f27` (all 11 unique handoff commits / 25 documents).

For example, `git show archive/2026-10-25/backend-handoff-v1:docs/backend-handoff/README.md` retrieves the preserved handoff. The historical branch itself was removed only after remote tag/peeled-commit verification. No history was rewritten and no force-push was used.

Official operational publication is the final gate; exact released commit, deployed JS/CSS hashes, authenticated route readbacks and final Menu Visibility comparison are recorded in the release evidence after Git-connected publication. This document does not pre-claim those results.
