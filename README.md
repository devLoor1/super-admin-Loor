# Loor Super Admin — Frontend

Visual prototype of the **Super Admin**: Login V1, the application-frame
**App Shell + Global Dashboard V1** and the **Whitelabels V1** list/detail page.
Frontend only.

> **Status:** visual/product exploration. There is **no backend, no
> authentication, no API calls and no business data**. The login only runs a
> local field check; the dashboard shows data-ready empty states
> ("—", "Sem dados", "Aguardando integração") instead of metrics. The
> Whitelabels page lists three clearly illustrative rows (prototype IDs, no
> counts or dates).

| Screen | URL (dev server) | Approved reference |
| --- | --- | --- |
| Login V1 | `http://localhost:5173/` | [`docs/reference/super-admin-login-approved.png`](docs/reference/super-admin-login-approved.png) |
| App Shell + Dashboard V1 | `http://localhost:5173/#/dashboard` | [`docs/reference/super-admin-dashboard-approved.png`](docs/reference/super-admin-dashboard-approved.png) |
| Whitelabels V1 | `http://localhost:5173/#/whitelabels` | [`docs/reference/super-admin-whitelabels-approved.png`](docs/reference/super-admin-whitelabels-approved.png) |

The views are selected by a prototype-only hash switch (`src/app/App.tsx`);
shell screens are reached directly by URL because there is no authentication.
In the sidebar, **Plataformas** links to `#/whitelabels`.

---

## Getting started

Requires Node.js `^20.19.0 || >=22.12.0`.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck (tsc -b) + production build to dist/
npm run typecheck  # TypeScript only
npm run lint       # oxlint
npm run preview    # serve dist/
```

## Stack

| Piece | Choice | Why |
| --- | --- | --- |
| Build / dev server | **Vite 8** | Current default for React SPAs; zero-config, fast, no server runtime. |
| UI | **React 19 + TypeScript 6** (strict) | Conventional, typed, easy for another agent to review and extend. |
| Styling | **CSS Modules + CSS custom properties** | Built into Vite (no dependency). Scoped per component; tokens live in one file. |
| Icons | **lucide-react** | Tree-shaken; its icon set matches the line icons in the approved image. |
| Font | **@fontsource-variable/inter** | Self-hosted Inter (no third-party font request on an admin login). |
| Title motion | **GSAP** | Preserves the supplied OriginKit Text Carousel's character transitions. |
| Lint | **oxlint** | Ships with the official Vite React template; one small dev dependency. |

Deliberately **not** added: router, state library, form library, UI kit, Tailwind,
chart library, test runner, backend/SSR framework. The dashboard has no data to
plot, so its chart containers are plain SVG/CSS. Container queries (native CSS)
handle panel-level responsiveness.

## Structure

```
src/
  main.tsx                          entry — renders <App />
  app/App.tsx                       prototype view switch: "#/dashboard", "#/whitelabels", else login
  styles/
    tokens.css                      prototype visual tokens (login + dark app shell)
    global.css                      reset + base typography
  components/
    form/                           FormField, PasswordField (login)
    illustration/IsoScene.tsx       shared SVG primitives: platform, glass card, glow node
    originkit/                      supplied PredictiveArc, RotatingDashboardTitle, GlassNavItem + scoped styles/motion hooks
    shell/
      AppShell.tsx (+ .css)         sidebar + header + content frame, mobile drawer logic
      Sidebar.tsx (+ .css)          brand, primary/utility navigation, decorative backdrop
      TopHeader.tsx (+ .css)        title/location, context selector, search, notifications, user
      navigation.ts                 navigation model (top-level domains)
      PrototypeNoticeProvider.tsx   toast for controls whose destination does not exist yet
      prototypeNotice.ts            notice context + standard copy
    ui/
      Panel.tsx (+ .css)            dark panel with heading row (size container)
      EmptyState.tsx (+ .css)       "no data yet" block
      IconTile.tsx (+ .css)         tinted module icon square (identity tones)
      OutlineButton.tsx (+ .css)    low-emphasis panel action
      MetricCard.tsx (+ .css)       shared data-ready KPI card (default / compact density)
      PrimaryButton.tsx (+ .css)    high-emphasis violet action
      StatusPill.tsx (+ .css)       status dot + label (success / warning / neutral / muted tones)
      SearchField.tsx (+ .css)      labelled search input
      SelectField.tsx (+ .css)      native select with icon + chevron
      FilterChips.tsx (+ .css)      single-choice chip group (aria-pressed)
      Tabs.tsx (+ .css), tabIds.ts  accessible tablist (roving tabindex, arrow/Home/End)
  features/
    login/                          Login V1 (unchanged visually)
    dashboard/
      DashboardPage.tsx (+ .css)    page grid + KPI row
      GlobalOverviewPanel.tsx       "Supervisão global" panel (+ GlobalOverviewIllustration)
      ActivityPanel.tsx             time-series container, empty
      WhitelabelDistributionPanel   donut placeholder, empty
      OperationalStatusPanel.tsx    neutral "Aguardando integração" list
      RecentEventsPanel.tsx         audit-ready table header + empty state
      QuickActionsPanel.tsx         shortcuts (prototype notices)
    whitelabels/
      WhitelabelsPage.tsx (+ .css)  page grid: shared KPI row + list/detail split, page state
      WhitelabelListPanel.tsx       search, status select + chips, sortable/selectable table, footer
      WhitelabelDetailPanel.tsx     identity, tabs, main information, summary cards, quick actions
      EntityAvatar.tsx (+ .css)     monogram / building avatar
      prototypeWhitelabels.ts       illustrative rows + status vocabulary (not backend data)
docs/reference/                     approved concept images
```

## Login V1 — visual decisions (non-obvious)

- **Reference scale.** The approved image is 1672 × 941 px and corresponds to a
  **1440 × 810 CSS px** desktop (factor ≈ 1.161). All sizes/spacing were measured
  from the image at that scale. To compare 1:1, open the page at 1440 × 810 with
  device scale factor 1.161.
- **Tokens are placeholders.** `src/styles/tokens.css` holds colors sampled from the
  image. They are *prototype* values, not the Loor brand system.
- **Panel proportions.** Desktop split is 47 / 53 (as in the image). Panel insets
  use `vw`/`vh` so the composition scales as one piece between laptop and large
  desktop; the login card keeps a fixed max width (544px).
- **Card offset.** In the reference the card sits ~15px right of the column centre;
  reproduced with a slightly larger left padding on the right column.
- **Illustration.** Plain SVG + lucide icons, no raster assets. Its `viewBox` uses
  the reference image's own pixel coordinates, so any element can be checked
  against the image directly. The platform is a rounded square rotated 45° and
  squashed vertically (isometric look); side walls/edges are built from the same
  shape offset downward. Final artwork is expected to be revisited in a later
  phase — this is intentionally lightweight.
- **Backdrop.** Large translucent spheres are an SVG with
  `preserveAspectRatio="xMaxYMid slice"`, so they stay anchored to the panel's
  right edge at any size. The bottom-left dot grid is a CSS pseudo-element.
- **"SUPER ADMIN"** uses the previously approved OriginKit-derived VectorWordmark,
  with a static readable fallback. TypeOnceHeading and the 8s AmbientTerms cycle
  are unchanged by the Dashboard phase.

## App Shell + Dashboard V1 — decisions

- **Reference scale.** The approved dashboard image (1672 × 941) is reproduced
  **1:1 at a 1672 × 941 CSS viewport** (sidebar 262px, KPI row at y=110, rows
  ending at y=922). Unlike the login, the dashboard is not scaled down to 1440:
  that would push secondary text to ~10px. At 1440 × 810 the page therefore
  scrolls vertically by ~160px; widths stay fluid.
- **No fake data.** KPI values are "—" (announced as "Sem dados"), statuses are
  the neutral "Aguardando integração" (grey dot, never status colours), the
  activity chart has axes/grid and an empty state, the donut uses a muted,
  **unsegmented** placeholder ring rather than implying fabricated shares; the legend uses
  skeleton bars, and the events table has headers only. X-axis dates are derived
  from today's date for "Últimos 30 dias" — they are an axis, not data.
- **Local-only controls.** Navigation items other than Dashboard, KPI arrows,
  quick actions, "Ver todos", the context selector, period selector, search
  (Enter), notifications and the user menu show a short "Protótipo visual: …"
  toast. No destination screen is created. Ctrl/⌘ + K focuses the search field.
- **Context selector** stays on "Visão global"; no whitelabel names are invented.
- **Shared illustration primitives.** `components/illustration/IsoScene.tsx` was
  extracted from the login artwork; the SVG definitions and visible drawing tree
  match the approved base after normalizing definition placement/attribute order.
  Fresh desktop/tablet/mobile captures show no new Login regression. The dashboard overview
  reuses the same platform/card/node grammar.
- **OriginKit.** The user-selected Predictive Arc is a bounded, subtle content-only
  backdrop; Text Carousel is a visual title enhancement with a stable semantic
  `Dashboard Global`; Light Glass Button supplies sidebar light/ring behavior.
  Login's VectorWordmark, AmbientTerms and TypeOnceHeading remain unchanged.
  The sidebar brand remains static. See the source/adaptation and QA record below.
- **Tokens.** Dark shell surfaces, text levels and module identity tones were
  added to `tokens.css` (sampled from the image). The accent tokens are shared
  with the login. The neutral Login and navy Dashboard surfaces remain distinct
  intentionally; merging near-black values would change the approved appearance.
- **Icons.** Sistema keeps the gear from the reference; Configurações uses
  lucide `Cog` (also a gear) so the two entries remain distinguishable.

### Dashboard responsive behavior

| Width | Layout |
| --- | --- |
| ≥ 1360px | Reference layout: 5 KPI cards, overview with statements, 3-column middle row (status keeps ≥344px), 2-column bottom row (quick actions keep ≥560px). KPI cards switch to a compact internal layout below ~238px card width (container query). |
| 1200–1359px | Full sidebar (232px). Activity spans the full row, distribution + status side by side, events and quick actions stacked (quick actions 4-up). User name hidden in the header. |
| 768–1199px | Sidebar becomes an icon rail (76px) with tooltips; header controls move to a second row; KPI cards 3 + 2. |
| < 768px | Sidebar becomes a modal drawer (focus moves inside and wraps, Esc/scrim close, background `inert`, scroll locked, focus returns). Single-column flow; KPI cards 2-up then 1-up below 480px; overview art and secondary table columns hidden. |

Codex rechecked 1672, 1440, 1280, 900, 390 and 320px with no horizontal overflow.
At 1440 × 810 the document is 967px tall (157px vertical scroll). On 320px phones
the menu target remains 40px wide; brand tracking tightens and the redundant user
chevron hides instead of shrinking the menu target.

## Whitelabels V1 — decisions

- **Reference scale.** The approved image (1672 × 941) is reproduced 1:1 at a
  1672 × 941 CSS viewport inside the unchanged App Shell; the page fits that
  viewport without scrolling. The KPI row uses the compact density of the
  shared `MetricCard` (≈110px vs the Dashboard's 118px), as in the image.
- **Navigation unchanged.** The image shows "Whitelabels" and "Aplicações" as
  sidebar items; per Product decision the approved shared navigation is kept and
  **Plataformas** is the active parent area (`href="#/whitelabels"`). Taxonomy is
  a separate future Product decision.
- **Illustrative rows only.** Finapop, Loor and Nova Plataforma (statuses Ativo,
  Em configuração, Rascunho) come from `prototypeWhitelabels.ts`, labelled
  "Dados ilustrativos". IDs are `wl_proto_0x`. Administrator/application/
  integration counts and update dates are "—" ("sem dados"); KPI cards say
  "Aguardando integração". No totals are derived from the three rows.
- **Local-only behavior.** Search (name/domain/slug, accent- and case-insensitive),
  status select and quick chips (kept in sync), column sorting, single active row
  → detail panel, tabs, and copy domain/slug to the clipboard. No checkboxes or bulk actions.
  "Novo Whitelabel", Editar, row/detail menus,
  KPI cards, quick actions and pagination arrows are prototype notices or
  disabled. Only the "Visão geral" tab has content; the other tabs show a
  "próxima etapa" placeholder. Nothing is persisted; the URL stays `#/whitelabels`.
- **Status vocabulary** (Ativo / Em configuração / Rascunho / Inativo) and its
  tones live in `prototypeWhitelabels.ts` + `--status-*` tokens. It is a visual
  proposal, not a backend-authoritative state model. The UI explicitly labels
  data/status as illustrative and Aplicações as a visual concept. The architecture
  proposes active/inactive capability, but not the full status enum.
- **New shared UI** (generic, no Whitelabels knowledge): `PrimaryButton`,
  `StatusPill`, `SearchField`, `SelectField`, `FilterChips`, `Tabs`.

### Whitelabels responsive behavior

| Width | Layout |
| --- | --- |
| ≥ 1360px | KPI row (4) + list (≈60%) and detail (≈40%, ≥420px) side by side. At 1672px all eight table columns are shown; list columns drop by panel width (Aplicações below ≈1655px, Administradores below ≈1500px viewports; both stay visible in the detail summary). Detail summary cards move their icon above the label in narrower panels; quick actions become one column. |
| 1200–1359px | Detail panel moves below the full-width list (all columns visible); tabs keep natural width. |
| 768–1199px | Icon rail; KPI cards 2 + 2; list and detail stacked (Aplicações column hidden below ≈910px). |
| < 768px | Drawer navigation; single column. On phones the table keeps name / actions, with domain and status under the name. Row activation scrolls/focuses the detail panel; detail tabs scroll horizontally with a scrollbar/hint and keep focused tabs visible. |

No horizontal page overflow from 320 to 1920px (checked at 22 widths).

## Login responsive behavior

| Width | Layout |
| --- | --- |
| ≥ 1024px (laptop / desktop) | Two columns as in the reference. Illustration scales with available height. |
| 768–1023px (tablet) | Panel becomes a compact dark header band (title + subtitle, small illustration on the right); form below. Footer lines hidden. |
| < 768px (small tablet / mobile) | Header band shows text only; illustration hidden. Card spans the width with 16px gutters, 48px-tall controls, 16px input text (avoids iOS zoom). |

## Accessibility

Whitelabels:

- The table has a caption, `scope="col"` headers, sort buttons with `aria-sort`,
  and a name button per row (`aria-controls` the detail panel, `aria-current` on the
  active row). Result count/detail identity have polite live announcements.
- Search and status select have labels; chips are a labelled group of
  `aria-pressed` buttons. Detail tabs follow the WAI-ARIA tabs pattern.
- "—" values carry visually hidden "sem dados" text. axe-core (4.x) reported no
  violations at 1672px and 390px for this page during this phase's QA (not a
  WCAG certification; axe is not a project dependency).

Dashboard / shell:

- Landmarks: `<aside>` (Super Admin) with two labelled `<nav>`s, `<header>` with a
  `role="search"` form, `<main>`. Heading order h1 (page) → h2 (panels / visually
  hidden "Indicadores globais") → h3 (KPI labels).
- Active navigation item uses `aria-current="page"`; the rail keeps the labels as
  accessible names (visually hidden) and shows them as tooltips on hover/focus.
- All controls are real buttons/links with visible focus rings; KPI cards are
  clickable through a stretched "Abrir …" button.
- Prototype notices are announced through a persistent `role="status"` region.
- A first-in-document skip link focuses the main content without changing the
  prototype route. Mobile navigation uses a labelled modal dialog and Tab/Shift+Tab
  wrapping. Ctrl/⌘+K is ignored while the background search is inert.
- Decorative artwork, legend skeletons and axis placeholders are `aria-hidden`;
  charts carry text alternatives ("sem dados").
- Current validation is a manual keyboard/DOM/accessibility-tree check, not a full
  WCAG certification. No existing axe runner/bundle was available for Codex to
  reproduce the earlier automated result; no new dependency was installed.

Login:

- Semantic `<form>` with `<label for>` on every input; `autocomplete="username"` /
  `"current-password"`.
- Errors are linked with `aria-invalid` + `aria-describedby`; focus moves to the
  first invalid field on submit.
- Password toggle is a real `<button type="button">` with `aria-label`
  ("Mostrar senha" / "Ocultar senha") and `aria-controls`.
- Visible focus: 3px accent ring on fields (`:focus-within`), outlines on buttons.
- Decorative panel art is `aria-hidden`; page landmarks are `<aside>` + `<main>`,
  with the card title as the page `<h1>`.
- Login validation, tab order, password toggle and static/motion fallbacks were
  rechecked; no new Login defect was observed.

## Login local-only interactions

- Empty e-mail / password or malformed e-mail → inline errors (cleared as the user types).
- Show / hide password.
- **Entrar** with a valid e-mail and non-empty password → neutral status message
  ("Protótipo visual: a autenticação ainda não está conectada."). No request is made.
- **Esqueci minha senha** → neutral status message; no flow.

## Out of scope (by design)

Backend integration, authentication, API clients, real routing, tenant switching,
real search, persistence, whitelabel create/edit flows, the Whitelabels detail tabs
other than "Visão geral", other destination module screens (Administradores,
Platform Settings, SMTP, Gateways, Indicadores, Oportunidades, Investidores,
Empreendedores, Investimentos, Pagamentos, Wallet, KYC, Auditoria), further
OriginKit assets, final brand system.

## Review records

- [Dashboard V1 review, architecture boundaries and validation](docs/dashboard-v1-review.md)
- [App Shell / Dashboard OriginKit opportunity mapping](docs/dashboard-originkit-mapping.md)
- [Approved Dashboard OriginKit integration, performance and architecture review](docs/dashboard-originkit-integration.md)
- [Whitelabels V1 review and validation](docs/whitelabels-v1-review.md)
- [Whitelabels OriginKit mapping and selected visual integration](docs/whitelabels-originkit-mapping.md)
- [Visual QA record](design-qa.md)
