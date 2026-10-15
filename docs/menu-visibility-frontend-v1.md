# Menu Visibility Frontend V1

Frontend-only unit, implemented by Cloud from `dev` `91cd26a` and left
uncommitted for Codex review. It prepares the management experience for
**global module visibility** (show / hide existing modules) while the Backend
contract is pending.

> **MENU VISIBILITY FRONTEND V1 IS A NON-PERSISTING PROTOTYPE.**
>
> **THE REAL APPLICATION NAVIGATION IS NOT MODIFIED BY PROTOTYPE TOGGLES.**
>
> No `GET` or `PUT /api/homolog/menu-visibility` (or any equivalent) is sent.
> The draft lives only in the page component's memory: no localStorage,
> sessionStorage, IndexedDB, cookies, URL, Backend or database. Reloading
> resets it. The real sidebar, routes and shortcuts keep reading
> `navigation.ts` exactly as before.

## Purpose

Let a Super Admin prepare which existing modules appear in the navigation.
Visibility is **presentation governance only**. It does not create, delete,
rename or reorder menu items, create routes, or grant / revoke permissions.

## Evidence

| Class | What it is |
| --- | --- |
| **A. Requirement/proposal only** | Candidate `GET` / `PUT /api/homolog/menu-visibility`, global scope, full map and default visible. These are not live Backend contract evidence; confirmation is pending and no endpoint was called. |
| **B. Local implemented UI** | Production build exercised in headless Chromium against the scratch mock Control Plane (synthetic session; writes answered 405 and logged). Not a Backend E2E. |
| **C. Synthetic edge cases** | Parent / child matrix, multiple toggles, discard, leave / reload, state previews, keyboard, 1672 → 320 px. |

## Global scope

One configuration for the whole homolog environment. There is **no** per
Whitelabel, per user, per role, per session or per device visibility. The page
says so next to the title ("Escopo global").

## Placement (no new menu ID)

Codex placement decision: keep the first implemented Settings section at its
explicit `#/settings/menu-visibility` route. The existing utility label remains
**Configurações**; the page title and breadcrumb name **Visibilidade dos
módulos**, not the entire Settings domain. There was no implemented destination
to displace. This does not decide a future Settings landing or broader grouping.

- **Configurações › Visibilidade dos módulos**, at `#/settings/menu-visibility`.
- It uses the existing utility entry **`configuracoes`**: that entry now has
  a destination (it previously showed the "módulo ainda não disponível"
  notice). This is the only change to `navigation.ts`; no item, ID, label,
  order or visibility behavior changed.
- The sidebar marks Configurações as current; breadcrumb Configurações ›
  Visibilidade dos módulos. No new sidebar item, no new stable menu ID.
- `sistema` (primary navigation) has no destination and no children today,
  so the screen lives under `configuracoes`, where it fits the existing shell.
  A Settings index can be added later if more sections exist.

## Stable IDs and registry

`menuRegistry.ts` holds the approved allow-list (exactly the 23 IDs of the
Backend requirement). Labels, icons, order and hierarchy are **read from
`navigation.ts`**, not duplicated; `navigation.ts` receives no visibility
state. A navigation entry outside the allow-list would not be
visibility-controlled until an ID is approved. The check script fails if the
registry and the navigation drift apart.

| Area | Parent | Children (current labels) |
| --- | --- | --- |
| Primary | Dashboard | — |
| Primary | Plataformas | Whitelabels, Contas, Config. do Whitelabel, E-mails |
| Primary | Operação | Oportunidades, Investidores, Empreendedores |
| Primary | Financeiro | Gateways e contas, Modalidades e regras, Segmentos e usos dos recursos, Investimentos, Pagamentos / PIX, Wallet |
| Primary | Compliance | KYC |
| Primary | Sistema | — (no screens today) |
| Primary | Auditoria | — |
| Utilitários | Configurações | — |
| Utilitários | Ajuda | — |

**Hierarchy open question:** the requirement lists `sistema`,
`configuracoes`, `ajuda` together, but in the current navigation Configurações
and Ajuda are utility entries with **no parent**. The prototype does not
invent a Sistema → Configurações / Ajuda override (hiding Sistema does not
hide them) and says so on screen. Backend / Product must confirm.

**Companies** (contextual prototype under Empreendedores) has **no approved
ID**: `operation-companies` is not in the registry, and hiding Empreendedores
produces no Companies-specific behavior. Making Companies a
visibility-controlled module needs a deliberate Product decision and an ID.

## Preference vs effective visibility

- **Stored preference:** every ID keeps its own boolean.
- **Effective:** `childEffective = parentVisible && childVisible`.
- Toggling a parent never rewrites its children. Example:
  `operacao = false`, `operation-investors = true` → Investidores is hidden
  ("Oculto pelo item pai"); showing Operação again brings Investidores back.
- Child switches stay editable while the parent is hidden; the row shows
  "Preferência própria mantida: visível" next to the effective result.

## Prototype initial state

"Prévia padrão do frontend": every known module starts **visible**, matching
the real navigation. It is never presented as "configuração atual do
Backend", and nothing is inferred from permissions or route availability.
Each mount creates a fresh map, so no draft is shared.

## Management UI

- Hierarchical groups in sidebar order (Navegação principal, Utilitários);
  one switch per ID (`role="switch"`, "Mostrar … na navegação"), state chip
  (Visível / Oculto / Oculto pelo item pai), "Alterado" marker, ID shown.
- **Rascunho em memória** panel: initial source, change count, hidden count,
  Última atualização / Atualizado por = "Aguardando integração" (never
  invented), and "Persistência aguardando integração do Backend".
- **Prévia da navegação**: an isolated sidebar-like list of the draft's
  effective result plus "Ocultos no rascunho" with reasons. Plain text, no
  links, no shared state; it never touches the real sidebar.
- Sticky draft bar (only when dirty): count, **Descartar alterações**,
  **Revisar alterações**.
- **Review dialog**: preference changes ("Investidores (Operação) Visível →
  Oculto"), effective consequences ("Wallet (Financeiro) — preferência
  mantida: Visível · fica oculto porque Financeiro está oculto"), warnings,
  the candidate full map (collapsed) and the final **Salvar visibilidade**
  button, `aria-disabled` with the adjacent pending explanation. No fake
  success.
- **Discard** asks first and returns to the prototype initial state ("volta à
  prévia inicial … Nada foi salvo"); it never claims a server restore.
- **Unsaved changes**: the shared `useUnsavedChangesGuard` asks before in-app
  links (sidebar included), Back / Forward and reload / close — only while
  the draft differs from the initial state; listeners are removed on leave.

### Prototype state previews

`?previa=carregando|indisponivel|sem-permissao|erro|falha-ao-salvar` pins a
future state for review **without any request** (honoured only while the
contract is not integrated; never holds visibility configuration):

| Preview | Shows |
| --- | --- |
| `carregando` | loading state, no controls |
| `indisponivel` | GET 5xx → "Visibilidade dos módulos indisponível" + retry |
| `sem-permissao` | GET 403 → "Ação não permitida", no retry |
| `erro` | malformed response → safe message + retry |
| `falha-ao-salvar` | the review dialog shows how an uncertain save failure (timeout) would read |

## Visibility is not authorization

Hiding a module only removes it from navigation. It is **not** RBAC, a
permission, route authorization or Backend authorization, and must not be
presented as a security control. The Backend keeps enforcing its own access
checks. "Oculto" never means "Acesso negado".

## Future direct-route requirement (not implemented)

When persistence lands, one central resolver should apply the effective map
to the sidebar, shortcuts **and direct routes**, so a hidden module is handled
consistently on direct URL access. **No route blocking exists in this
prototype**; the redirect destination for a hidden module (and for a hidden
Dashboard, today's post-login destination) is an open question.

## Future contract (candidate — NOT INTEGRATED)

`menuVisibilityContract.ts` (types and strings only, no request code):

```ts
// GET /api/homolog/menu-visibility
type MenuVisibilityGetResponseCandidate = {
  data: { scope: 'global'; visibility: Record<string, unknown>; updatedAt: string | null; updatedBy: string | null }
}
// PUT /api/homolog/menu-visibility
type MenuVisibilityPutRequestCandidate = { visibility: Record<MenuId, boolean> } // complete map, all 23 IDs
```

- **Full map (PENDING):** the draft naturally produces `Record<MenuId,
  boolean>` for all known IDs (`putRequestPreview`, shown in the review); a
  partial PATCH is not assumed. Nothing is sent. The editor owns only a
  preference map; a future persistence adapter can serialize full PUT or
  partial PATCH without changing the management controls.
- **Unknown IDs (PENDING):** a prepared normalizer ignores IDs outside the
  registry and reports them as contract drift; Backend labels or routes are
  never rendered and no dynamic navigation is created. No production logging
  was added.
- **DEFAULT-VISIBLE PENDING BACKEND CONFIRMATION:** a known ID missing from a
  response is treated as visible (reported in `defaultedIds`). A known ID
  with a non-boolean value makes the response malformed (nothing applied).
- **updatedAt / updatedBy:** shown as "Aguardando integração" until a real
  response provides them.
- **Error presentation (prepared):** GET loading / unavailable / 403 /
  malformed / retry; PUT 400 / 422 invalid map, 403, 409 conflict (if
  defined), timeout / network / 5xx as "pode ou não ter sido aplicada".
  401 stays with the canonical session layer.

## Architecture

```
src/features/menu-visibility/
  menuRegistry.ts             approved stable IDs + identity read from navigation.ts
  visibilityModel.ts          pure: preference map, effective calc, diff, consequences
  menuVisibilityContract.ts   candidate GET/PUT types, pending rules, normalizer, error mapping
  prototypeVisibility.ts      prototype initial state (all visible, fresh per call)
  useVisibilitySource.ts      source boundary (prototype only; future GET states)
  menuVisibilityRoute.ts      route + prototype-only previews
  MenuVisibilityPage.tsx      page, in-memory draft, guard, draft bar
  VisibilityControls.tsx / VisibilityPreview.tsx / VisibilityDialogs.tsx / MenuVisibility.module.css
```

Other touched files: `App.tsx` (route, title, session guard),
`navigation.ts` (`configuracoes` gets its destination). The Sidebar,
AppShell and route resolver are unchanged.

**Future integration (narrow):** prototype source → authenticated GET in
`useVisibilitySource`; disabled final action → authenticated full-map PUT;
isolated preview → one central resolver used by the sidebar, shortcuts and
direct routes. Remove `?previa=` and the prototype default then.

## Backend details still required

1. Final endpoint paths and roles for GET and PUT (is the homolog prefix
   permanent? which operator roles may read / write?).
2. PUT semantics: complete map (current recommendation) vs partial PATCH;
   validation errors and their codes (400 vs 422).
3. Unknown-ID behavior on read and write (ignore, reject, keep?).
4. Default for a known ID with no stored value (visible recommended, pending).
5. Concurrency: is there a version / ETag and a 409 conflict?
6. `updatedAt` / `updatedBy` format (operator ID vs display name).
7. Hierarchy confirmation: are `configuracoes` and `ajuda` children of
   `sistema`? Should `configuracoes` (host of this screen) be hideable?
8. Direct-route behavior and redirect destination for hidden modules
   (including a hidden Dashboard).
9. Whether Companies (or other contextual pages) will get stable IDs.
10. Audit expectation for visibility changes.

## Validation

- `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check`.
- `node scripts/check-menu-visibility.mjs`:
  - registry = approved IDs, identity from navigation, Companies absent;
  - parent / child matrix and non-destructive parent toggles;
  - diff, consequences, discard;
  - candidate full map, normalizer and error mapping;
  - zero endpoint / storage / global-state code;
  - real sidebar still renders `navigation.ts` unfiltered;
  - docs statements.

### Local QA record (Cloud, scratch harness — evidence class B/C)

- Static: typecheck and build pass; oxlint 0 warnings / 0 errors;
  `git diff --check` clean; `check-menu-visibility.mjs` 598 checks. Planted
  regressions were all caught: localStorage write, a menu-visibility fetch in
  the API client, parent toggles rewriting children, an `operation-companies`
  ID, a visibility import in the Sidebar, a module-level draft variable.
- Existing check scripts pass with their `91cd26a` counts. The one exception
  is Companies: 664 → 674, because its per-file `operation-companies` scan now
  also covers the 10 new files.
- Menu Visibility browser flow (headless Chromium, production build, scratch
  mock): **153/153**. It covered:
  - placement through the existing Configurações entry; registry = 23
    approved IDs in sidebar order; Companies absent;
  - the parent / child matrix through the UI;
  - draft, review (diff, consequences, candidate full map), the
    `aria-disabled` save (click / Enter do nothing), discard;
  - the guard on sidebar links, Back and reload; no prompt when clean;
    listeners removed after leaving;
  - every prototype preview;
  - keyboard (Space / Enter, focus ring, dialog focus);
  - 1672 / 1440 / 1024 / 768 / 390 / 320 px with no horizontal overflow
    (initial, changed, review); switch targets ≥ 24 px; draft bar inside the
    viewport;
  - axe WCAG A/AA with 0 violations on 10 states; session guard.
- **Real sidebar:** its DOM snapshot was identical after hiding Dashboard,
  Operação and Financeiro, while the leave prompt was shown, and after reload.
  All 9 items and the Operação children were present after leaving; the
  Companies page was unaffected.
- **Storage:** localStorage / sessionStorage keys and values, cookies and
  IndexedDB databases were identical before and after drafting, reviewing,
  discarding and reloading.
- **Network:** zero requests containing `menu-visibility` or `homolog`, zero
  non-GET, nothing outside the app origin and the mock. The page itself
  requested only `GET /auth/me` (shell session check).
- **Regression, new vs `91cd26a` (same harness):**
  - identical on both builds: Investors 98/98, Entrepreneurs 123/123,
    Companies 109/109, Accounts 120/120, Audit 101/101, Whitelabels read
    (CRUD-aware) 103/103;
  - Dashboard 81/88 on both (the same 7 stale or date-dependent checks);
  - Whitelabel CRUD dialog flow 96/98 on both (the same 2 copy checks);
  - shared suites: sweep 160 states, keyboard 34/34, axe 0 / 116 states,
    KYC 100/100, Dashboard 160/160, Operation 114/114 + 19/19, taxonomy OK,
    Finance gateways 72/72, modalities 58/58, auth 26/27 (the same
    pre-existing check), links 71 / 0 broken (+1: the Configurações link).
- Pixel comparison: no difference on any compared page, the sidebar
  included (the Configurações entry looks the same as a link). A one-off
  E-mails scroll-offset diff did not reproduce on rerun.

## Codex review — 2026-10-15

Live `origin/dev` and local HEAD were verified at
`91cd26a7f8ae70846b13f582ec957864cd016883`. Cloud's 3 modified and 13 new
files were preserved on `feature/menu-visibility-frontend-v1`; no reset,
patch replay, merge, push or deployment was performed.

Minimal refinements:

- The shared unsaved-change hook now installs navigation/click/unload listeners
  only while dirty, cleaning them up on reset or unmount. Its public API and
  warning/continue behavior are unchanged. The previous implementation kept
  inert listeners installed while clean. Settings dirty-navigation protection
  was checked after the fix; E-mails received a route/render smoke check.
- Candidate endpoint proposals are no longer described as live contract
  evidence. Full PUT versus partial PATCH remains adaptable and pending.
- Maintained Menu Visibility checks increased **598 → 769**: actual rendered
  controls, inherited-hidden rows, separate diff/consequences, pending Save,
  non-interactive preview and actual Sidebar; navigation compared with baseline;
  actual source-hook preview selection and future-integration guards; syntax
  detectors with planted in-memory transport/storage violations; deterministic
  execution of the shared guard's installation, warning, stay, discard, resume
  and cleanup callbacks. Hook stubs do not claim to exercise React timing.

Canonical acceptance gate: **2,495 PASS** across all 12 maintained suites
(Menu Visibility 769, Companies 674, other suites 1,052). TypeScript, oxlint,
production build and `git diff --check` pass. The existing bundle-size advisory
remains non-blocking. Old Cloud scratch-runner failures above are historical,
not waivers of canonical tests.

Built-in browser: local reviewed build and synthetic local fixture API only.
No real operator credentials/token, live Backend or homolog data was used.
This is **local implemented-UI/synthetic evidence, not authenticated live E2E**.

Captured flow and review findings:

1. **Entry / initial state — healthy.** Existing Configurações link, correct
   active item, 23 switches, clear global/prototype provenance and pending
   metadata. No larger Settings redesign is needed.
2. **Parent / child editing — healthy.** Hidden parents preserve editable child
   preferences; inherited-hidden explanations and warnings distinguish preference
   from result. Dashboard and Configurações remain real sidebar entries.
3. **Review / pending persistence — healthy.** Only own-preference changes appear
   in the primary diff; Wallet appears separately as a Financeiro consequence.
   The candidate map is labelled not sent. Keyboard Enter/Space on the pending
   action do not save or show success.
4. **Discard / navigation — healthy.** Explicit initial-preview reset, stay,
   sidebar leave warning and browser Back/discard/re-entry were exercised.
   Reload while clean starts fresh. Dirty unload binding and zero clean unload
   listeners were inspected. The controller did not expose a native reload
   prompt; native prompt-button interaction is not claimed as verified.
5. **Preview states — healthy.** Loading, unavailable, forbidden, malformed and
   hypothetical save-failure previews remain explicit, request-free and have
   working exits. Logged-out preview routes remain guarded.
6. **Responsive / accessibility — healthy within scope.** Initial, hidden-parent,
   multi-change and review states captured at **1672, 1440, 1024, 768, 390, 320**.
   No horizontal document overflow; mobile switches and sticky draft actions
   remain reachable. Names, checked states, descriptions, keyboard focus,
   dialog controls and mobile drawer were checked. Not a full WCAG certification.
7. **Existing modules — local smoke pass.** Auth, Dashboard, Whitelabels and its
   pending create dialog, Accounts, Investors, Entrepreneurs, Companies, Audit,
   Opportunities, Finance Core, KYC, Settings and E-mails retain routes/shell.
   Maintained suites provide the deeper source/model regression gate; no new
   live integration claim is made.
8. **Safety — pass.** Browser local/session storage, cookies, IndexedDB and Cache
   Storage were unchanged by visibility drafting/review/discard. The real
   sidebar's structure/identity remained identical (transient OriginKit inline
   animation styles are excluded from DOM comparison). No draft state enters
   the real navigation. Console warnings/errors and JS exceptions: **0**.

A browser-controller timeout reset the test bindings, not the application.
The same local tab was recovered and its current draft reconciled. Older
debugger events were truncated, so a **fresh complete final acceptance trace**
was recorded across reload, multiple toggles, review/pending Save, discard and
all preview states: **one `GET /api/auth/me`, zero Menu Visibility API calls,
zero writes, no external origin**. Wider local regression reads also had no
Menu Visibility calls or business/financial writes. No trace containing tokens
or credentials is included in Git. Screenshots and sanitized evidence remain
outside the repository; temporary fixture tooling was removed.

**Ready for separate promotion authorization as a non-persisting frontend
prototype.** Persistence, real sidebar application, route handling, roles,
concurrency, missing/unknown ID policy, hierarchy/self-hide/landing decisions
and Audit behavior remain pending Backend/Product agreement. No global setting
was saved and no visibility-based authorization was implemented.

## Out-of-scope boundary (unchanged)

Persisting visibility, applying it to the real navigation, route blocking,
RBAC, Companies identity, and any business or financial mutation.
