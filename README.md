# Loor Super Admin — Frontend

Visual prototype of the **Super Admin login screen**. Frontend only.

> **Status:** visual/product exploration. This branch contains exactly one screen
> (login). There is **no backend, no authentication, no API calls and no business
> data**. Submitting the form only runs a local "required fields" check.

Approved visual reference: [`docs/reference/super-admin-login-approved.png`](docs/reference/super-admin-login-approved.png)

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
| Lint | **oxlint** | Ships with the official Vite React template; one small dev dependency. |

Deliberately **not** added: router, state library, form library, UI kit, Tailwind,
test runner, backend/SSR framework. None is needed for a single static screen.

## Structure

```
src/
  main.tsx                          entry — renders <LoginPage /> (no router yet)
  styles/
    tokens.css                      prototype visual tokens (colors, radii, shadows)
    global.css                      reset + base typography
  components/form/
    FormField.tsx (+ .module.css)   label + icon + input + inline error
    PasswordField.tsx               FormField + show/hide password toggle
  features/login/
    LoginPage.tsx (+ .module.css)   two-column page layout
    LoginVisualPanel.tsx (+ .css)   dark institutional panel (copy + backdrop)
    PlatformIllustration.tsx        SVG network/platform artwork
    LoginForm.tsx (+ .module.css)   login card, local validation, notices
    SecurityNotice.tsx (+ .css)     "Acesso seguro e protegido" block
docs/reference/                     approved concept image
```

## Visual decisions (non-obvious)

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
- **"SUPER ADMIN"** is written as "Super Admin" in the markup and uppercased in
  CSS so screen readers don't spell it letter by letter.

## Responsive behavior

| Width | Layout |
| --- | --- |
| ≥ 1024px (laptop / desktop) | Two columns as in the reference. Illustration scales with available height. |
| 768–1023px (tablet) | Panel becomes a compact dark header band (title + subtitle, small illustration on the right); form below. Footer lines hidden. |
| < 768px (small tablet / mobile) | Header band shows text only; illustration hidden. Card spans the width with 16px gutters, 48px-tall controls, 16px input text (avoids iOS zoom). |

## Accessibility

- Semantic `<form>` with `<label for>` on every input; `autocomplete="username"` /
  `"current-password"`.
- Errors are linked with `aria-invalid` + `aria-describedby`; focus moves to the
  first invalid field on submit.
- Password toggle is a real `<button type="button">` with `aria-label`
  ("Mostrar senha" / "Ocultar senha") and `aria-controls`.
- Visible focus: 3px accent ring on fields (`:focus-within`), outlines on buttons.
- Decorative panel art is `aria-hidden`; page landmarks are `<aside>` + `<main>`,
  with the card title as the page `<h1>`.
- axe-core (WCAG 2.1 A/AA + best practices): 0 violations at time of writing.

## Local-only interactions

- Empty e-mail / password or malformed e-mail → inline errors (cleared as the user types).
- Show / hide password.
- **Entrar** with a valid e-mail and non-empty password → neutral status message
  ("Protótipo visual: a autenticação ainda não está conectada."). No request is made.
- **Esqueci minha senha** → neutral status message; no flow.

## Out of scope (by design)

Backend integration, authentication, API clients, routing, any other Super Admin
screen, OriginKit assets, final brand system.
