# Entrepreneur 360° Read V1 — SA-BE-005

## Independent qualification — 2026-10-22

Accepted baseline and formal Integration Map/KYC closure: see `investor-360-read-integration-v1.md`.
Entrepreneur is an independent domain/model/adapter/hook, not an Investor specialization or shared business store.

- Canonical Entrepreneur 54 / Whitelabel 4 came from the authoritative list.
- `GET /api/entrepreneurs/54/overview` → 200; correlation `988abd14-fda2-41f3-8bbd-7334e12e047b`.
- Envelope `{ data, cardinality: { entrepreneurToCompany: '0..1', companyToEntrepreneur: '1' } }` verified.
- Control Plane source `73ccb918ae4e22be1e16d3ab6ab12a215d3f2916`; Core source `9e26c7c7e68ca42c5aebc6188d3cc73005dbf362`, EntrepreneurOverviewService / CompanyQueryService.
- Roles: SUPER_ADMIN, SUPPORT_ADMIN, READ_ONLY. COMPLIANCE_ADMIN access is not inferred from Investor permissions.
- Company 21 independently read through `GET /api/companies/21` → 200: Company ID, Entrepreneur 54 and Whitelabel 4 match. Overview CNPJ is masked. No raw CNPJ retained in evidence.
- One Opportunity, ID 78, returned. Full total 1; full active count 0; capped byStatus finished 1; totalRaisedCents null.

## Mapping

| Source | UI / constraints |
| --- | --- |
| entrepreneur | Positive safe numeric Core ID and Whitelabel relationship; safe name, creation date, personal-data completeness |
| account | Authoritative access state; supplied reason/date when paused; unavailable block distinct from failure |
| company | 1 → 0..1; present summary with canonical Company ID/name/masked CNPJ/status; literal null → “Sem empresa vinculada”; missing/malformed block → read error |
| company link | Existing independent Company detail route, preserving a real tenant list context; detail adds validation/contact fields |
| summary.opportunitiesCount | Full-query total, not the returned list size |
| summary.activeOpportunities | Full-query active count |
| summary.byStatus | Only the returned/capped preview; explicitly labelled “somente prévia” |
| opportunities | At most 50, IDs/tenant/status/name/date validated; canonical existing Opportunity detail links only |
| totalRaisedCents | Nullable → unavailable, never zero or a sum inferred from preview |
| tools / documents | Placeholder sections not exposed as authoritative documents/tools inventory |

No Entrepreneur KYC link: existing Compliance cases are FaceMatch-backed Investors.
Banking, free-form provider payloads and unnecessary contact details are not projected.

## Integration / validation

Existing route, Operation shell, hero, tabs, visual system, list-return navigation and read-only boundary retained.
One overview GET supplies Company summary; no duplicate `/company` GET or basic Entrepreneur detail request. Existing Company registry and Opportunity→Company read remain intact for their independent purposes.
Session-scoped `useRemote` and canonical authenticated transport supply cancellation, explicit retry, bounded timeout, central 401 and isolated 403/error handling. No browser persistence, polling, writes or prototype replacement.

Both contracts are covered independently in `scripts/check-overview-360.mjs` (126 focused checks total). Company null/present, ownership inconsistency, bad/missing cardinality, capped counts, full totals, null money and withheld sections are tested.
Production-built UI validated at 1672/1440/900/390/320 with substantive Company/Opportunity tabs, large/long/null cases and no page-wide overflow. Keyboard/focus and reduced-motion checks passed.

A bounded live check of the two other naturally returned list IDs (55, 56) found Companies present. Company-null acceptance is therefore synthetic-only; no fixture was created or broad scan performed.

Independent contract gate: PASS. No separate Entrepreneur publication is authorized; the batch ships only after Investor and hygiene pass.
Actual published-artifact/runtime evidence is recorded externally with the final coordinated release report, not by a second docs push.

No Backend/Core, Company/Opportunity lifecycle or financial mutation was performed.
