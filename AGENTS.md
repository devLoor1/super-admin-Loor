# LOØR frontend delivery rules

Before changing user-facing presentation, read [the permanent homolog readiness policy](docs/homolog-readiness-policy.md).

- Preserve approved local DEV prototypes while keeping production-built official homolog operationally truthful.
- Apply readiness and privacy safeguards to every changed surface, including direct URLs; never substitute mock records or fake success for Backend behavior.
- Backend RBAC is authoritative. Preserve the 23 Menu Visibility IDs, saved preferences and protected entries; readiness is not authorization.
- Before release, run `node scripts/check-homolog-readiness.mjs`, all maintained `scripts/check-*.mjs` suites, TypeScript, lint, build and diff checks. Verify changed surfaces in local DEV and the production build.
- Block promotion for new mock-only/inoperant homolog surfaces. Document justified exceptions explicitly with scope, owner and acceptance; do not silently weaken checks.
- Do not expand Backend, infrastructure, financial or write scope beyond the user's authorization.
