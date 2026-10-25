# LOØR frontend delivery rules

## Dedicated `mock` branch

This branch is the user-authorized permanent offline demonstration, separate from operational `dev`. Read [MOCK.md](MOCK.md) first. Never merge it into `dev`/`main`, publish it to the official homolog project, configure an external API, use real credentials, or perform a live business/financial action. Keep the hardwired in-memory transport, separate mock session keys, CSP network prohibition and visible MOCK identity in both DEV and production previews. Preserve all approved illustrative screens/interactions. Validate this branch with `npm run check:mock`, TypeScript, lint, build, diff and browser QA; historical operational suites/docs below describe `dev` contracts and must never be used to claim that this demo performs real E2E.

The following operational rules remain preserved for reference; official homolog publication belongs exclusively to `dev`, where the permanent readiness policy remains mandatory.

Before changing user-facing presentation, read [the permanent homolog readiness policy](docs/homolog-readiness-policy.md).

- Preserve approved local DEV prototypes while keeping production-built official homolog operationally truthful.
- Apply readiness and privacy safeguards to every changed surface, including direct URLs; never substitute mock records or fake success for Backend behavior.
- Backend RBAC is authoritative. Preserve the 23 Menu Visibility IDs, saved preferences and protected entries; readiness is not authorization.
- Before release, run `node scripts/check-homolog-readiness.mjs`, all maintained `scripts/check-*.mjs` suites, TypeScript, lint, build and diff checks. Verify changed surfaces in local DEV and the production build.
- Block promotion for new mock-only/inoperant homolog surfaces. Document justified exceptions explicitly with scope, owner and acceptance; do not silently weaken checks.
- Do not expand Backend, infrastructure, financial or write scope beyond the user's authorization.
