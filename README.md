# LOØR Super Admin — operational frontend

Three permanent branches have distinct purposes:

- `main`: stable minimal mainline; homolog work is not merged automatically.
- `dev`: authenticated, Backend-integrated operational frontend and the only official Git-connected homolog source.
- `mock`: independent synthetic demonstration. Clone that branch and follow its `MOCK.md`; never merge its simulated transport into dev or attach it to official homolog.

## Operational startup

Use Node `^20.19.0` or `>=22.12.0`:

```powershell
npm ci
Copy-Item .env.example .env.local
# Set VITE_API_BASE_URL to an authorized Control Plane environment.
# Write flags require the existing explicit environment authorization.
npm run dev
```

Sign in through the normal authorized SUPER_ADMIN authentication flow. No development login bypass or simulated Backend is included. Missing credentials, denied reads and unavailable Backend capabilities remain truthful states. Local development follows the same presentation policy as production.

```powershell
npm run typecheck
npm run lint
npm run build
npm run preview
node scripts/check-homolog-readiness.mjs
Get-ChildItem scripts/check-*.mjs | ForEach-Object { node $_.FullName; if ($LASTEXITCODE) { throw $_.Name } }
```

Run maintained suites serially on memory-constrained machines. Historical prototype fixtures under `tests/prototypes` are test-only and cannot enter the operational runtime.

## Operational scope

The frontend retains Login/session/logout, Dashboard authoritative aggregates, Whitelabel reads and supported CRUD/lifecycle, Accounts/access and Whitelabel Admin lifecycle, real Settings reads, Opportunities no-warranty creation/about-only review editing/archive, Investor/Entrepreneur 360° reads, Companies, Finance reads, Compliance KYC reads, Audit reads, Operators reads and Menu Visibility.

Backend RBAC and tenant boundaries remain authoritative. Supported controls still require their existing roles, state checks and build-time write flags. This repository does not add Backend endpoints or financial execution. Opportunity approval/provider provisioning remains unavailable. Finance is supervisory/read-only; unsafe responses remain rejected. KYC and Audit remain independent domains.

E-mails/SMTP, Gateways, Modalities/Rules and Segment/Resource Use configuration prototypes belong to `mock`; their operational direct routes show unavailable until a supported Backend integration exists. Equity and Debt remain the only modalities. Capital de Giro is independently valid as Segment/Resource Use, never a modality.

Read the [permanent readiness policy](docs/homolog-readiness-policy.md), [consolidation inventory and decisions](docs/repository-consolidation-v1.md), and [field-level presentation audit](docs/data-presentation-audit.md). Complete authorized business fields are formatted without deleting digits; Backend masks and credential protections remain intact.

Historical delivery documents describe their dated acceptance boundaries and should not be interpreted as the latest release status. The pre-consolidation frontend is preserved in Git history; the divergent handoff is preserved under its verified annotated archive reference. Final refs and official deployment evidence are reported by the consolidation release.
