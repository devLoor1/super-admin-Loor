# Loor Super Admin — Frontend

Visual prototype of the **Super Admin**: Login V1, the application-frame
**App Shell + Global Dashboard V1**, the **Whitelabels V1** list/detail page,
**Whitelabel Account Control V1** (Contas do Whitelabel), **Whitelabel
Settings V1** (Configurações do Whitelabel), **Whitelabel E-mails V1** and
**Finance / Gateways V1** (Financeiro). Frontend only.

> **Status:** visual/product exploration. There is **no backend, no
> authentication, no API calls and no business data**. The login only runs a
> local field check; the dashboard shows data-ready empty states
> ("—", "Sem dados", "Aguardando integração") instead of metrics. The
> Whitelabels page lists three clearly illustrative rows (prototype IDs, no
> counts or dates). Contas uses illustrative accounts (example.com e-mails,
> masked documents, no amounts); pause/reactivate, Whitelabel change and the
> Admin form only change local state — **Backend: implementation pending**.
> Configurações uses illustrative per-tenant settings; every section save and
> the Terms publication are local to the browser session (lost on reload).
> E-mails uses illustrative SMTP values (reserved example domains) and event
> preferences; saves are local, the test send is simulated and **no e-mail is
> ever sent**. The SMTP password is write-only and never stored or shown.
> Financeiro / Gateways uses fictitious providers and banks; configuration
> edits, activation and bank accounts are local, the connection test is
> simulated, credentials are write-only (never stored or shown), and **no
> provider or bank request and no financial operation ever happens**.

| Screen | URL (dev server) | Approved reference |
| --- | --- | --- |
| Login V1 | `http://localhost:5173/` | [`docs/reference/super-admin-login-approved.png`](docs/reference/super-admin-login-approved.png) |
| App Shell + Dashboard V1 | `http://localhost:5173/#/dashboard` | [`docs/reference/super-admin-dashboard-approved.png`](docs/reference/super-admin-dashboard-approved.png) |
| Whitelabels V1 | `http://localhost:5173/#/whitelabels` | [`docs/reference/super-admin-whitelabels-approved.png`](docs/reference/super-admin-whitelabels-approved.png) |
| Whitelabel Account Control V1 | `http://localhost:5173/#/whitelabels/wl_proto_01/accounts` | [`docs/reference/super-admin-whitelabel-account-control-approved.png`](docs/reference/super-admin-whitelabel-account-control-approved.png) |
| Whitelabel Settings V1 | `http://localhost:5173/#/whitelabels/wl_proto_01/settings` | [`docs/reference/super-admin-whitelabel-settings-approved.png`](docs/reference/super-admin-whitelabel-settings-approved.png) (visual direction only) |
| Whitelabel E-mails V1 | `http://localhost:5173/#/whitelabels/wl_proto_01/emails` | [`docs/reference/super-admin-whitelabel-emails-approved.png`](docs/reference/super-admin-whitelabel-emails-approved.png) (visual direction only) |
| Finance / Gateways V1 | `http://localhost:5173/#/whitelabels/wl_proto_01/finance/gateways` | [`docs/reference/super-admin-whitelabel-finance-gateways-approved.png`](docs/reference/super-admin-whitelabel-finance-gateways-approved.png) (visual direction only) |

The views are selected by a prototype-only hash switch (`src/app/App.tsx`);
shell screens are reached directly by URL because there is no authentication.
In the sidebar, **Plataformas** links to `#/whitelabels` and, while that domain
is active, lists its screens: **Whitelabels**, **Contas**, **Config. do Whitelabel**
and **E-mails**. The accounts route is `#/whitelabels/:whitelabelId/accounts` with an
optional `?tipo=investidores|empreendedores|administradores`; the settings route is
`#/whitelabels/:whitelabelId/settings`; the e-mails route is
`#/whitelabels/:whitelabelId/emails` with an optional `?section=smtp|envios|templates`
that focuses that card. Within the tenant screens, the sidebar destinations
preserve the displayed Whitelabel. **Financeiro** links to
`#/whitelabels/:whitelabelId/finance/gateways` (first illustrative Whitelabel
by default) and, while active, lists **Gateways e contas**; on that screen the
Financeiro links keep the displayed Whitelabel.

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
  app/App.tsx                       prototype view switch: "#/dashboard", "#/whitelabels",
                                    "#/whitelabels/:id/accounts[?tipo=…]", "#/whitelabels/:id/settings",
                                    "#/whitelabels/:id/emails[?section=…]",
                                    "#/whitelabels/:id/finance/gateways", else login
  app/prototypeNavigation.ts        hash-switch subscription + single page guard (Back/Forward)
  app/useUnsavedChangesGuard.ts     shared unsaved-change guard (links, history, reload, tenant switch)
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
      navigation.ts                 navigation model (top-level domains + nested screens of Plataformas / Financeiro)
      PrototypeNoticeProvider.tsx   toast for controls whose destination does not exist yet
      prototypeNotice.ts            notice context + standard copy
    ui/
      Panel.tsx (+ .css)            dark panel with heading row (size container)
      EmptyState.tsx (+ .css)       "no data yet" block
      IconTile.tsx (+ .css)         tinted module icon square (identity tones)
      OutlineButton.tsx (+ .css)    low-emphasis panel action
      MetricCard.tsx (+ .css)       shared data-ready KPI card (default / compact density)
      PrimaryButton.tsx (+ .css)    high-emphasis violet action
      StatusPill.tsx (+ .css)       status dot + label (success / warning / neutral / muted / danger tones)
      Switch.tsx (+ .css)           accessible on/off switch (role="switch", aria-checked)
      SearchField.tsx (+ .css)      labelled search input
      SelectField.tsx (+ .css)      native select with icon + chevron
      FilterChips.tsx (+ .css)      single-choice chip group (aria-pressed)
      Tabs.tsx (+ .css), tabIds.ts  accessible tablist (roving tabindex, arrow/Home/End; underline or segmented)
      Dialog.tsx (+ .css)           modal dialog on native <dialog> (focus return, Escape, backdrop)
      DetailTransition.tsx          identity-scoped detail motion + explicit focus handoff
      EntityAvatar.tsx (+ .css)     shared decorative monogram / building avatar
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
      prototypeWhitelabels.ts       illustrative rows + status vocabulary (not backend data)
      visuals/                      approved Dot Matrix background, identity reveal
    whitelabel-accounts/
      WhitelabelAccountsPage.tsx    page layout + local state (accounts, events, filters, dialogs)
      WhitelabelContextSelector.tsx tenant context card + switcher
      AccountListPanel.tsx          search, access/business filters, sortable table, pagination
      AccountDetailPanel.tsx        type-specific detail, account actions, dependencies, terms, permissions, history
      AccountBadges.tsx             BusinessBadge (business state) + initials avatar
      accountModel.ts               types, state vocabularies, dependency definitions, helpers
      accountListConfig.ts          filter/column configuration per account type
      prototypeAccounts.ts          illustrative accounts per Whitelabel (not backend data)
      dialogs/                      pause, reactivate, change Whitelabel (simulation), new Admin
    whitelabel-settings/
      WhitelabelSettingsPage.tsx    page layout, section navigation, unsaved-change guard, Terms dialogs
      SettingsSection.tsx (+ .css)  independent section card: status, Editar, unsaved bar, Descartar/Salvar
      useSectionEditor.ts           per-section local edit lifecycle (draft, validation, simulated save)
      settingsModel.ts              WhitelabelSettings / SettingValue<T> types, defaults, state vocabulary
      prototypeSettings.ts          illustrative settings per Whitelabel (not backend data)
      settingsStore.ts              in-memory session store (survives in-app navigation, not reload)
      sections/                     Geral, Identidade, Experiência, Funcionalidades, Termos de Uso, SMTP summary
      dialogs/                      view revision, publish revision, unsaved changes
    whitelabel-emails/
      WhitelabelEmailsPage.tsx      page layout, tenant context, `?section=` focus, shared unsaved guard
      emailModel.ts                 SMTP / event / template types, vocabulary, validation helpers
      prototypeEmails.ts            illustrative SMTP + event preferences per Whitelabel (no secrets)
      emailStore.ts                 in-memory session store + session-only activity feed
      sections/                     SMTP (with simulated test send), Envios automáticos, Templates summary, session activity
      dialogs/                      test-send confirmation
    finance-gateways/
      FinanceGatewaysPage.tsx       page layout, tenant context, selection/filters, unsaved guards (page + gateway switch)
      financeModel.ts               gateway / credential / bank / modality types, derived states, masking, validation
      prototypeFinance.ts           illustrative gateways, banks and modality states per Whitelabel (no secrets)
      financeStore.ts               in-memory session store + session-only activity feed
      sections/                     summary cards, gateway list, gateway detail + tabs, bank accounts, modalities, quick actions
      dialogs/                      validate connection, deactivate, new gateway, bank form, bank confirmations
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

## Whitelabel Account Control V1 — decisions

- **Tenant-first.** The selected Whitelabel (context card, route id, breadcrumb)
  scopes everything; the account types are tabs (Investidores / Empreendedores /
  Administradores). There is no global, cross-tenant user list. The generated
  image's "Todas as whitelabels" filter, checkboxes and generic "Nova conta" were
  intentionally not reproduced; only the Administradores tab offers
  **Novo administrador** (local form).
- **Access state ≠ business state.** Access (Ativa / Pausada) is a rounded pill
  with a dot; business states are squared badges without a dot (Investor
  validation: Aguardando / Validação automática / Validação manual / Aprovada /
  Negada; Entrepreneur company validation: Cadastro incompleto / Empresa em
  validação / Empresa validada; Admin: conceptual role + invitation). Pause and
  reactivate change only the access state; a denied Investor stays denied.
- **Pause / reactivate** (central prototype capability): confirmation dialog with
  identity, Whitelabel, mandatory reason (≥10 characters) and the preservation
  statement; reactivation keeps every business state. Status:
  Frontend **prototype**, Backend **implementation pending**, Integration
  **pending** — shown in the detail panel and dialogs.
- **Alterar Whitelabel** is a three-step simulation (destination → dependency
  impact + Backend warning → reason + acknowledgement). Its outcome is a
  *simulated request* shown on the account and in the session history; no
  account, history or relationship is moved. It can be discarded.
- **Dependencies** use semantic statuses only (Concluído, Vínculos existentes,
  Pendente, Aguardando integração…), never amounts or counts.
- **Terms / profile / questionnaire**: read-only Investor display (accepted
  revision vs the Whitelabel's current revision, classification, questionnaire
  completed/pending). Questionnaire/classification are labelled global; there is
  no editor. **Permissions** for Admins are conceptual labels only (no RBAC).
- **History** is a session-only log of the prototype's own actions (plus
  illustrative creation dates); it is explicitly not an audit trail.
- **Reuse.** Same App Shell, Dot Matrix background (main content only; its
  reduced-motion and no-WebGL behaviour), list/detail language, StatusPill,
  SearchField, SelectField, Tabs, EmptyState, IconTile, EntityAvatar and the
  detail transition (generic, `item` prop). EntityAvatar and DetailTransition now
  live in shared UI; Dot Matrix still reuses the approved Whitelabels visuals.
- **Shared refactors (minimal):** TopHeader optional `breadcrumbs`; AppShell
  `activeSubNav` + `breadcrumbs`; navigation `children` + Sidebar nested list;
  GlassNavItem `currentType` (parent gets `aria-current="true"`); Tabs
  `variant="segmented"` with icons; new `Dialog`; OutlineButton accepts `ref`;
  DetailTransition generic. Whitelabels detail quick actions *Contas* and
  *Administradores* now open the accounts screen.

### Whitelabel Account Control responsive behavior

| Width | Layout |
| --- | --- |
| ≥ 1360px | Left column: context card, type tabs, list. Right column (≈452px): selected-account panel spanning the full height. List columns drop by panel width (activity/invitation, then e-mail moves under the name). |
| 768–1359px | Single column: context, tabs, list, then detail. Icon rail below 1200px shows Whitelabels/Contas as icon entries with tooltips. |
| < 768px | Drawer navigation (nested entries listed); account types stack below 480px (↑/↓ also work); table keeps name/actions with e-mail and both states under the name; selecting a row scrolls to the detail; dialogs fit the viewport with stacked actions. |

Codex independently checked 1672, 1440, 1280, 900, 390 and 320px for all three
account types and dialog forms without horizontal overflow. See the frontend
review record for scope, evidence and fallback checks.

## Whitelabel Settings V1 — decisions

- **Placement.** Third Plataformas screen (`Config. do Whitelabel`); no new top-level
  domain. The Whitelabels detail quick action *Configurações* opens it. The
  Whitelabel context card (reused from Contas) switches tenant locally.
- **Independent sections, no global save.** Geral (read-only), Identidade,
  Experiência, Funcionalidades and Termos de Uso are separate cards, each with
  its own status, Editar / Descartar / Salvar and an "Alterações não salvas"
  bar. Funcionalidades edits inline (switches) and shows the bar only when
  changed. Saving is a short local simulation; values live in an in-memory
  session store until reload.
- **State vocabulary:** Configurado, Usando padrão, Não configurado, Alterado
  localmente, Salvando…, Salvo, Erro, Aguardando integração (plus Somente
  leitura for Geral and Publicado for Termos).
- **Default vs Whitelabel override.** Every value is a `SettingValue<T>`
  (`{ value, source: 'default' | 'tenant' }`) shown with a *Padrão global* or
  *Personalizado* tag; "Usar padrão" / "Restaurar padrão" return to the global
  default, and a value equal to the default is stored as "using default". No
  inheritance engine exists; defaults are illustrative constants.
- **Geral** shows name, status, slug, domain, public URL, prototype ID and the
  session's last local change. Domain/URL are read-only (copy only); there is no
  tenant pause or lifecycle change here.
- **Identidade:** logo and favicon (local preview of a chosen file, type/size
  checks, nothing uploaded), primary and accent colours (picker + hex, white-text
  contrast hint) and an illustrative preview.
- **Experiência:** structured copy only (public name, slogan, institutional
  message, login message, empty opportunities list, CTA, "Oportunidades" term)
  with length limits — not a CMS.
- **Funcionalidades:** only confirmed capabilities — Perfil do investidor,
  Wallet, Investimento anônimo como padrão, Informações da oportunidade.
- **Termos de Uso:** current revision (Vigente) visually distinct from previous
  revisions (Substituída), read-only revision viewer, and a local publish flow
  (title, content, explicit confirmation). Publishing makes the revision current
  immediately; **no re-acceptance is requested** (product decision pending).
  The current revision is shared with Account Control through the same local
  session store (initially Finapop 4, Loor 2, none for Nova Plataforma). An
  Investor's accepted revision stays independent and is never changed by publication.
- **SMTP** appears only as a compact status (from the E-mails session store)
  with a *Gerenciar SMTP* link to `#/whitelabels/:id/emails?section=smtp`. No
  credentials, provider or test send here; no generic integrations module.
- **Unsaved-change protection:** a confirmation dialog lists the sections with
  unsaved edits before switching Whitelabel or following an in-app link; the
  browser's own prompt covers reload/tab close. Same-document Back/Forward
  transitions are guarded before the hash switch unmounts the draft; cancelling
  restores the history entry, while explicit discard resumes the transition.
- **Intentionally not reproduced from the generated image:** fabricated dates,
  *Visualizar como tenant*, *Abrir no Admin*, global *Salvar alterações*,
  Pix / Transferência / Cadastro rápido / Match facial / Oportunidades /
  Termos customizados toggles, Política de privacidade, Webhooks / API-Chaves /
  Canais de suporte, Ambiente / URL de callback, editable domains,
  Controle e segurança / Pausar conta, Pendências de backend, preview modes.

### Whitelabel Settings responsive behavior

| Width | Layout |
| --- | --- |
| ≥ 1360px | Context row (back link + description, Whitelabel card); section navigation + legend; two columns [Geral, Identidade] [Experiência, Funcionalidades]; bottom row Termos de Uso (wide) + SMTP. Cards keep their natural height. |
| 768–1359px | Single column in the same order. |
| < 768px | Drawer navigation; section navigation wraps; key/value rows stack per card width (container queries); dialogs use stacked actions. Long page titles wrap below 480px. |

## Whitelabel E-mails V1 — decisions

- **Placement.** Fourth Plataformas screen (`E-mails`); no new top-level domain.
  Always tenant-scoped (reused Whitelabel context card). The Config. do
  Whitelabel SMTP shortcut opens it focused on the SMTP card.
- **Three separate concepts.** SMTP = how the Whitelabel sends; Envios
  automáticos = when the platform sends each e-mail; Templates = what is sent
  (summary + entry point only, no editor, no counts).
- **SMTP:** host, port, security (STARTTLS / SSL-TLS), user, password,
  sender e-mail and display name. Local Editar / Descartar / Salvar with
  frontend validation only (required fields, host format, port 1–65535,
  e-mail format); no connectivity check on save. States: Configurado, Não
  configurado, Alterado localmente, Salvando…, Salvo, Erro, plus "Conexão real:
  Aguardando integração".
- **Secret handling.** The password is write-only: the model only keeps
  `secretConfigured`; view mode shows a fixed mask + "Configurada"; edit mode
  offers an empty "Nova senha" field (no reveal toggle). The typed value lives
  only in the edit draft and is dropped on save/discard; it never reaches the
  store, the activity feed, notices or logs.
- **Test send:** destination validation → confirmation dialog (states that no
  e-mail is sent) → loading → simulated success. Uses the saved configuration
  only; blocked while SMTP is unconfigured or being edited. No request is made.
- **Automatic events** (local switches, section-level Salvar alterações /
  Descartar, consistent with Settings): Investimento em Equity and Investimento
  em Debt are **Product requirements**, independently configurable, Backend
  pending until validated. Cadastro concluído, Recuperação de senha, Conta
  aprovada and Termos atualizados are **illustrative** event concepts with no
  confirmed Backend flag. Categories are UI labels only. Disabling password
  recovery shows a risk note; with SMTP unconfigured the section warns that
  nothing would be sent.
- **Session activity** lists only this session's local actions (SMTP saved,
  simulated test, events enabled/disabled) with local times — explicitly not an
  audit trail; never contains secrets.
- **Shared pieces:** the unsaved-change guard from Settings is now
  `useUnsavedChangesGuard` (used by both pages); `SettingsSection` gained an
  optional badge and `saveLabel`; `useSectionEditor` accepts other section keys
  and clears submitted drafts after save.
- **Intentionally not reproduced from the generated image:** provider values
  presented as real (`smtp.sendgrid.com`), "12 templates / 6 tipos", dates and
  "Última edição por", fabricated "Últimas alterações" history, *Visualizar como
  tenant*, *Abrir no Admin*, password reveal (eye) button, per-row "⋯" menus,
  slug / "ID do Whitelabel" header values not in the dataset.

### Whitelabel E-mails responsive behavior

| Width | Layout |
| --- | --- |
| ≥ 1360px | Context row; main column SMTP + Envios automáticos (table-like rows); aside (340–400px) Templates + Atividade nesta sessão. |
| 768–1359px | Single column: SMTP, Envios automáticos, Templates, Atividade. |
| < 768px | Drawer navigation; SMTP fields stack; each event row shows name, description, then category + switch (usable at 320px); dialogs use stacked actions. |

## Finance / Gateways V1 — decisions

- **Placement.** First screen of the existing top-level **Financeiro** module
  (`Gateways e contas`); no parallel Financeiro model and no other module
  renamed or removed. Tenant-scoped through the reused Whitelabel context card.
- **Scope = configuration only.** Gateways, credentials, simulated connection
  validation, local activation, bank accounts and a read-only modalities
  summary. No balances, payments, Pix charges, refunds, cashout, transfers,
  reconciliation or any financial mutation.
- **Illustrative data.** "Provedor Alfa/Beta/Gama/Delta" and fictitious banks
  (codes 901–903); the supported catalog is a Backend/Product decision.
  Summary counts are derived strictly from the local prototype state and say so.
- **Statuses.** Configurado / Em configuração / Não configurado derive from the
  credential state; Inativo when deactivated; Alterado localmente while the
  selected gateway has an unsaved draft; Integração: Aguardando integração.
- **Secrets are write-only.** The model stores `{configured, hint?}` only;
  read views show a fixed mask + "Configurada" (identifiers may show their last
  4 characters, secrets never); edit fields start empty ("Deixe em branco para
  manter"), `type="password"` for secrets, no reveal or copy control; typed
  values are dropped on save/discard and never reach the store, activity,
  notices or logs. No encrypted Backend storage is implied.
- **Validar conexão** → confirmation → ~1.4 s loading → simulated result
  (missing credentials fail by label). No request is made.
- **Ativar / Desativar** are local; deactivation is confirmed and states that
  the operational impact depends on Backend rules.
- **Bank accounts** are a Whitelabel-level grouping by prototype premise (not
  authoritative). Account number and Pix key are write-only and reduced to
  masked hints on save; deactivate/remove are confirmed.
- **Modalities** (Equity, Debt, Capital de giro): Habilitada / Não configurada /
  Planejada / Dependência pendente (enabled but no active gateway serves it).
  No editor; not Backend flags.
- **Unsaved changes** reuse `useUnsavedChangesGuard` (links, Back/Forward,
  reload, tenant switch) plus the same dialog when switching gateway; no global
  save.
- **Session activity** per gateway and for bank accounts lists only this
  session's local actions — not an audit trail, never secrets.
- Details, QA and Backend dependencies:
  [`docs/whitelabel-finance-gateways-v1.md`](docs/whitelabel-finance-gateways-v1.md).

### Finance / Gateways responsive behavior

| Width | Layout |
| --- | --- |
| ≥ 1360px | Context row, four summary cards, gateway list beside the selected-gateway panel, then bank accounts beside modalities + quick actions. |
| 768–1359px | Single column (list, detail, banks, modalities, quick actions); summary cards 2 × 2 below 1200px. |
| < 768px | Drawer navigation; table columns collapse by container width with key data moved under the name; detail tabs become a 2 × 2 grid; dialogs stack fields. |

## Login responsive behavior

| Width | Layout |
| --- | --- |
| ≥ 1024px (laptop / desktop) | Two columns as in the reference. Illustration scales with available height. |
| 768–1023px (tablet) | Panel becomes a compact dark header band (title + subtitle, small illustration on the right); form below. Footer lines hidden. |
| < 768px (small tablet / mobile) | Header band shows text only; illustration hidden. Card spans the width with 16px gutters, 48px-tall controls, 16px input text (avoids iOS zoom). |

## Accessibility

Finance / Gateways:

- The gateway table has a caption and `scope="col"` headers; each row's name
  button has `aria-current` and `aria-controls` the detail panel. Search and
  status filter are labelled; statuses are text, never colour alone.
- Detail tabs reuse `Tabs` (roving tabindex, arrow/Home/End); credential and
  bank fields have labels, hints and errors via `aria-describedby`; failed
  saves focus the first invalid field. Masked values are announced as "Oculta"
  or "Final …".
- Validation progress/result is announced through `role="status"`; dialogs
  reuse `Dialog` (focus return, Escape). Bank row icon buttons are named with
  the masked account ("Editar Banco Exemplo •••• 4821-0").
- axe-core 4.x (scratch copy) reported no violations in 23 Finance states
  (view, edits/errors, all dialogs, unsaved dialogs; 1440/390/320px, three
  tenants and not-found).

Whitelabel E-mails:

- SMTP fields have labels, hints and errors via `aria-describedby`; failed saves
  focus the first invalid field. The password input is `type="password"` with
  `autocomplete="new-password"`; the masked value is announced as "Oculta".
- Event switches are named by the event and described by its trigger; on/off,
  category and Backend status are text. Equity and Debt are separate controls.
- The test result is announced through `role="status"`; the send button keeps
  focus while simulating (`aria-disabled`). Dialogs reuse `Dialog` (focus
  return, Escape).
- axe-core 4.x (scratch copy) reported no violations for view, edit/errors,
  dirty events, test error/dialog/result and unsaved dialog at 1440px, and the
  page at 390px and 320px.

Whitelabel Settings:

- Each section is a labelled `<section>` with an `h2` (focus target of the
  section navigation, which uses buttons with `aria-current` because the hash is
  the router). Source tags and on/off state are text, never colour alone.
- Fields have labels, hints and errors linked via `aria-describedby`; failed
  saves focus the first invalid field; Editar, Descartar, Salvar, "Usar padrão"
  and dialogs hand focus to a sensible target instead of dropping it.
- Switches use `role="switch"` + `aria-checked`, named by the feature label.
- axe-core 4.x (scratch copy, not a project dependency) reported no violations
  for view, edit/error, selector, unsaved, publish and revision dialogs at 1440px
  and the page at 390px; the only finding (open mobile drawer,
  `aria-allowed-role`, minor) predates this phase.

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
real search, persistence, whitelabel create/edit flows, real settings
persistence/inheritance, file uploads, Terms re-acceptance, real SMTP connectivity or
e-mail sending, secret storage, template editing, delivery logs/analytics, the Whitelabels detail tabs
other than "Visão geral", real account pause/reactivate, tenant reassignment,
Admin provisioning/invitations, RBAC, audit trail, questionnaire/
classification editing, real payment-provider or bank integration, credential
storage, financial operations of any kind (balances, payments, Pix charges,
refunds, cashout, transfers, reconciliation), a detailed modalities/rules
editor, other destination module screens (global Platform Settings,
Indicadores, Oportunidades, Investimentos, Pagamentos, Wallet, KYC, Auditoria),
further OriginKit assets, final brand system.

## Review records

- [Dashboard V1 review, architecture boundaries and validation](docs/dashboard-v1-review.md)
- [App Shell / Dashboard OriginKit opportunity mapping](docs/dashboard-originkit-mapping.md)
- [Approved Dashboard OriginKit integration, performance and architecture review](docs/dashboard-originkit-integration.md)
- [Whitelabels V1 review and validation](docs/whitelabels-v1-review.md)
- [Whitelabels OriginKit mapping and selected visual integration](docs/whitelabels-originkit-mapping.md)
- [Whitelabel Account Control V1 — frontend review and local QA](docs/whitelabel-account-control-v1.md)
- [Whitelabel Settings V1 — local implementation and QA](docs/whitelabel-settings-v1.md)
- [Whitelabel E-mails V1 — local implementation and QA](docs/whitelabel-emails-v1.md)
- [Finance / Gateways V1 — local implementation, QA and Backend dependencies](docs/whitelabel-finance-gateways-v1.md)
- [Canonical Backend handoff — preserved separate documentation branch](https://github.com/devLoor1/super-admin-Loor/tree/bbda57265f27724b540fd16546228523fbc0ba7d/docs/backend-handoff)
- [Visual QA record](design-qa.md)
