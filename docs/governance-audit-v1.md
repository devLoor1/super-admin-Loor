# Governança › Auditoria V1 — local implementation record

Part of Compliance › KYC V1 + Auditoria V1, initially implemented by Claude
and independently reviewed by Codex on 2026-10-08, on
`feature/super-admin-compliance-audit-v1` from baseline
`9f8abc6d55410e63a2edaf6d8efeafcd217b7a30`. Consolidated locally; final user
review and promotion remain separate. Shared architecture, domain
boundaries, QA and open questions:
[compliance-audit-v1.md](compliance-audit-v1.md). Approved composition:
[`reference/super-admin-governance-audit-approved.png`](reference/super-admin-governance-audit-approved.png)
(visual reference only; counts and records in the image are illustrative).

## Purpose

**Read-only** consultation of governance events across Whitelabels: find →
inspect an event (who, what, which resource, which tenant, result, when,
technical context, field-oriented before / after) → navigate to the resource
in its own module. It is **not** an audit infrastructure: the events are a
frozen, illustrative dataset, and the Backend is **not** claimed to emit any
of them today.

## Navigation and routes

Sidebar: **Auditoria** is its own top-level destination (`#/audit`, no nested
entries, no "Governança" group).

| Route | Screen |
| --- | --- |
| `#/audit` | Global list. URL-backed context: `?resourceType=` + `?resourceId=` (removable "Recurso" chip; either may be used alone), `?whitelabel=:whitelabelId\|global`, `?actor=:actorId\|anonymous`, `?action=:actionCode`. |
| `#/audit/:auditEventId` | Event detail. Unknown or malformed ids → "Evento não encontrado" inside the shell. |

Enum validation uses own properties only: inherited object names such as
`constructor` and `toString` are invalid, not action/resource values.
Same URL behaviour as KYC: a change to a URL-backed filter replaces the
current entry (scroll kept); reload restores the valid context; Back returns
to the previous page; unknown values are ignored with a visible note (an
unknown `resourceType` drops its `resourceId` too); an unknown resource id
gives an empty list. Search, module, result, period, sort and page are local.

## Model (`auditModel.ts`)

`AuditEvent { id, actorId (superAdminId; null for an unauthenticated
attempt), action, resourceType, resourceId, resourceLabel (snapshot at event
time), whitelabelId (null = global), module, result, oldValue, newValue, ip,
userAgent, correlationId, createdAt, summary }`.

- Modules: Plataformas, Operação, Financeiro, Compliance, Sistema.
- Results: Sucesso (teal) / Falha (red). Text + dot.
- Actors: illustrative operators `USR-SA-01` Super Admin, `USR-SA-02`
  Analista Compliance, `USR-SA-03` Operador Financeiro (not real people, not
  an identity directory); "Não autenticado" for a refused login.
- `oldValue` / `newValue` are field maps. A sensitive field is stored only as
  the redaction marker `{ redacted: true }`; there is no secret, token, key,
  password, cookie, document or KYC payload anywhere in the data.
- IPs use the documentation ranges of RFC 5737 (`192.0.2.x`, `198.51.100.x`,
  `203.0.113.x`); user agents are generic ("Navegador-Exemplo").

## Dataset (`prototypeAudit.ts`, deeply frozen)

28 events, `AUD-000151` … `AUD-000178` (Plataformas 13, Sistema 5, Financeiro
4, Operação 3, Compliance 3; 26 Sucesso, 2 Falha; 21 with recorded changes).

| Coverage | Events |
| --- | --- |
| Login success / failure, logout | `auth.login_succeeded` ×3, `auth.login_failed` (actor null, reason only), `auth.logout` — global, no field changes |
| Whitelabel create / update / activate / deactivate | Nova Plataforma created as Rascunho; Finapop activated; Loor deactivated then reactivated |
| Accounts / admin | investor access paused (Ricardo Pereira); admins invited (Sofia Azevedo, Isabela Fonseca); admin paused (Otávio Lima) |
| Settings and SMTP | Finapop slogan + primary colour; Loor CTA text; Finapop SMTP host / port / security / password (masked); SMTP test sent (Finapop success, Loor failure — sanitized reason) |
| Gateways | `gw_finapop_gama` created (API key / webhook secret masked) then deactivated; `gw_loor_alfa` activated; `gw_finapop_alfa` credentials replaced (masked both sides) |
| Opportunities | status changes (Expansão Sul Rascunho → Ativa; Rede de Clínicas Ativa → Pausada); classification of Modernização Fabril: modality Equity → Debt and Usos dos recursos "Modernização" → "Modernização, Capital de Giro" (Capital de Giro as a Resource Use — never a modality) |
| KYC | decisions on `kyc_proto_0001` (Aprovado), `kyc_proto_0102` and `kyc_proto_e106` (Reprovado) — status and observation only, matching the KYC seeds |

"Depois" values match the current prototype seeds. `AUD-000173` /
`AUD-000174` share a correlation id (SMTP update + test).

## Reference date

"Hoje" and "Últimos 7 dias" (cards and the Período filter) are computed
against the fixed prototype reference day **08/10/2026** (São Paulo calendar),
not the viewer's clock, and the UI says so ("Referência: 08/10/2026"). Values:
Hoje 3, Últimos 7 dias 15, Últimos 30 dias 27.

## List

- Subtitle: "Consulte eventos de governança e alterações relevantes em todos
  os Whitelabels. Consulta somente leitura."
- Cards (counts of the illustrative dataset only): **Total de eventos** (28,
  "2 com falha"), **Com alterações** (21), **Hoje** (3), **Últimos 7 dias**
  (15).
- Search: event id, actor (id or name), action (code or label), resource id
  (and label), correlation id.
- Filters (all combine): Whitelabel (+ Global), Módulo, Ação, Ator (+ Não
  autenticado), Resultado, Período (todo / hoje / 7 / 30 dias), *Limpar
  filtros*.
- Sort: date and time (default newest first), event id, action, module,
  actor, result; *Ordenar por* select when columns collapse. 8 per page.
- Columns: Evento / ID, Ação (code + "Com alterações" tag), Módulo / Recurso,
  Whitelabel, Ator, Resultado, Data e hora, Ações (*Ver evento* only). No
  checkbox, no bulk action, no kebab menu.

## Detail

Header: module icon, **Evento AUD-…**, result, "Com alterações" / "Sem
alterações de campos", action label, module, resource, Whitelabel; *Ir para
recurso* and *Copiar ID do evento*.

| Tab | Content |
| --- | --- |
| Visão geral | Informações principais (event id, event, action code, module, resource, resource id, Whitelabel, actor, actor id, result, date and time, summary); Ações e navegação — *Ir para recurso*, *Filtrar por este recurso*, *Filtrar por este ator*, *Copiar ID do evento*, *Copiar Correlation ID*; read-only note. |
| Alterações | Field-oriented diff (Campo / Antes / Depois): only the recorded fields; "—" for null or absent; create events have no "Antes"; login / logout / test events show "Este evento não registra alterações de campos."; sensitive fields render as a masked "••••••••" marker (screen readers: "Valor sensível oculto"). Secondary, collapsed **raw view** of the sanitized record (sensitive values as "[redacted]"). Proteção de dados card. |
| Contexto | Whitelabel, module, resource type / label (snapshot) / id, actor and role; other events with the same correlation id (links). |
| Metadados | Correlation id (+ copy), IP, user agent, ISO timestamp, Brasília date and time, action code, result; "Origem do registro": illustrative, frozen, not emitted by the Backend. |

Defensive redaction: besides the stored marker, any field whose key looks
sensitive (password / senha, secret, token, authorization / auth headers /
bearer, api key, cookie, credential, private, CPF / CNPJ, documents, identity,
biometrics, payload) is masked at render and in the raw view, whatever its
value. Only supported flat values may render: null, string, boolean, finite
number or an array of strings. Unexpected structured values fail closed to
a mask / `[redacted]`, not a nested raw payload. Field labels also use
own-property lookup. Focused checks:
`node scripts/check-compliance-audit.mjs` (existing compiler, no added dependency).

## Allowed actions and destinations

Allowed: *Ver evento*, *Copiar ID do evento*, *Copiar Correlation ID*
(clipboard; if unavailable, a notice shows the id), filters by resource /
actor, *Ir para recurso* where a screen exists:

| Resource | Destination |
| --- | --- |
| Caso KYC | `#/compliance/kyc/:id` |
| Oportunidade | `#/operation/opportunities/:id` |
| Conta / Administrador | `#/whitelabels/:wl/accounts?tipo=investidores\|empreendedores\|administradores` (no per-account deep link) |
| Gateway | `#/whitelabels/:wl/finance/gateways` (no per-gateway deep link) |
| Configurações do Whitelabel | `#/whitelabels/:wl/settings` |
| Configuração SMTP | `#/whitelabels/:wl/emails?section=smtp` |
| Whitelabel | `#/whitelabels` (no per-Whitelabel deep link) |
| Sessão administrativa | notice "Destino ainda não implementado: … Nenhuma navegação foi feita." |

**Not present:** edit / delete event, change before / after, revert, restore,
reprocess, re-execute, approve, reject, fix origin, export, bulk action, or any
mutation of a source-domain record. Nothing in the app — KYC local actions
included — appends an event.

## Entry points into Auditoria

Sidebar; Dashboard *Acessar Auditoria* and *Últimos eventos › Ver todos* (the
Dashboard table itself stays an empty, "Aguardando integração"-style state);
KYC *Ver na Auditoria* (prefiltered by the case); Gateways e contas quick
action (`?whitelabel=:wl&resourceType=gateway`) and Modalidades e regras
quick action (`?whitelabel=:wl`), which replace their former "módulo futuro"
notices.
