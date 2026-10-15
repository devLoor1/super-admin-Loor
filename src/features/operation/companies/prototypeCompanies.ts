/*
 * ILLUSTRATIVE COMPANIES — prototype source for Companies Frontend V1.
 *
 * "Dados ilustrativos — integração de Empresas pendente." These records are
 * fictional and isolated:
 * - they are NOT Control Plane data and are never mixed with, derived from or
 *   computed from real Entrepreneurs, Accounts or Whitelabels (no name,
 *   e-mail, businessState or tenant is reused);
 * - Entrepreneur and Whitelabel references are prototype-only refs
 *   (`*_proto_cmp_*`): they are never sent to the Entrepreneur or Whitelabel
 *   APIs and never link to a real profile;
 * - tax identifiers are synthetic (root `00.000.000`), with no validation or
 *   uniqueness meaning;
 * - `officialStatus` is always null: no status vocabulary is invented;
 * - one reference per Company is a data shape of this prototype, not an
 *   Entrepreneur ↔ Company cardinality decision (no screen counts or groups
 *   Companies by Entrepreneur).
 * Replace this module with the Backend source once `GET /companies` exists.
 */

/** A record that exists only inside this prototype — never a Core id. */
export type PrototypeRef = Readonly<{ ref: string; label: string }>

export type PrototypeCompany = Readonly<{
  provenance: 'prototype'
  /** Illustrative Company id (`cmp_proto_###`), not a Core id. */
  id: string
  entrepreneur: PrototypeRef | null
  whitelabel: PrototypeRef | null
  legalName: string | null
  tradeName: string | null
  /** Synthetic 14-digit value; displayed masked. */
  taxId: string | null
  /** No status vocabulary exists yet: always null in the prototype. */
  officialStatus: null
  createdAt: string | null
  updatedAt: string | null
}>

const freeze = <T extends object>(value: T): Readonly<T> => Object.freeze(value)

const WL = {
  alfa: freeze({ ref: 'wl_proto_cmp_alfa', label: 'Whitelabel Ilustrativo Alfa' }),
  beta: freeze({ ref: 'wl_proto_cmp_beta', label: 'Whitelabel Ilustrativo Beta' }),
  gama: freeze({ ref: 'wl_proto_cmp_gama', label: 'Whitelabel Ilustrativo Gama' }),
}

/** Illustrative Whitelabel references used by the prototype filter (not the Control Plane registry). */
export const PROTOTYPE_COMPANY_WHITELABELS: readonly PrototypeRef[] = Object.freeze([WL.alfa, WL.beta, WL.gama])

const entrepreneur = (n: string): PrototypeRef => freeze({ ref: `ent_proto_cmp_${n}`, label: `Empreendedor ilustrativo ${n}` })

function company(
  n: string,
  fields: Omit<PrototypeCompany, 'provenance' | 'id' | 'officialStatus' | 'taxId'> & { taxId?: string | null },
): PrototypeCompany {
  return freeze({
    provenance: 'prototype',
    id: `cmp_proto_${n}`,
    officialStatus: null,
    ...fields,
    taxId: fields.taxId === undefined ? `00000000000${n}` : fields.taxId,
  })
}

const at = (date: string, time = '10:00') => `${date}T${time}:00-03:00`

export const PROTOTYPE_COMPANIES: readonly PrototypeCompany[] = Object.freeze([
  company('101', {
    legalName: 'Empresa Exemplo Alfa Ltda.',
    tradeName: 'Alfa Exemplo',
    entrepreneur: entrepreneur('01'),
    whitelabel: WL.alfa,
    createdAt: at('2026-03-02', '10:15'),
    updatedAt: at('2026-08-19', '16:40'),
  }),
  company('102', {
    legalName: 'Exemplo Bravo Serviços S.A.',
    tradeName: 'Bravo Serviços (exemplo)',
    entrepreneur: entrepreneur('02'),
    whitelabel: WL.beta,
    createdAt: at('2026-03-11', '09:02'),
    updatedAt: at('2026-07-30', '11:25'),
  }),
  company('103', {
    legalName:
      'Empresa Exemplo Charlie de Desenvolvimento de Soluções Integradas para Gestão Agroindustrial, Logística Reversa e Energia Sustentável Ltda.',
    tradeName: 'Charlie Soluções Integradas Agroindustriais e Logística (nome fantasia ilustrativo extenso)',
    entrepreneur: entrepreneur('03'),
    whitelabel: WL.alfa,
    createdAt: at('2026-04-01', '14:30'),
    updatedAt: at('2026-09-02', '08:10'),
  }),
  company('104', {
    legalName: 'Exemplo Delta Comércio Ltda.',
    tradeName: null,
    entrepreneur: entrepreneur('04'),
    whitelabel: WL.gama,
    createdAt: at('2026-04-09'),
    updatedAt: at('2026-04-09'),
  }),
  company('105', {
    legalName: 'Exemplo Eco Indústria Ltda.',
    tradeName: 'Eco Indústria (exemplo)',
    taxId: null,
    entrepreneur: entrepreneur('05'),
    whitelabel: WL.beta,
    createdAt: at('2026-04-22', '17:45'),
    updatedAt: at('2026-06-18', '13:05'),
  }),
  company('106', {
    legalName: 'Exemplo Foxtrot Tecnologia Ltda.',
    tradeName: 'Foxtrot Tech (exemplo)',
    entrepreneur: null,
    whitelabel: WL.alfa,
    createdAt: at('2026-05-05', '08:20'),
    updatedAt: at('2026-08-01', '15:00'),
  }),
  company('107', {
    legalName: 'Exemplo Golf Alimentos Ltda.',
    tradeName: 'Golf Alimentos (exemplo)',
    entrepreneur: entrepreneur('06'),
    whitelabel: null,
    createdAt: at('2026-05-19', '11:11'),
    updatedAt: at('2026-09-10', '10:30'),
  }),
  company('108', {
    legalName: 'Exemplo Hotel Turismo Ltda.',
    tradeName: 'Hotel Turismo (exemplo)',
    entrepreneur: entrepreneur('07'),
    whitelabel: WL.gama,
    createdAt: null,
    updatedAt: null,
  }),
  company('109', {
    legalName: null,
    tradeName: 'Índigo (exemplo)',
    entrepreneur: entrepreneur('08'),
    whitelabel: WL.beta,
    createdAt: at('2026-06-03', '09:40'),
    updatedAt: at('2026-06-03', '09:40'),
  }),
  company('110', {
    legalName: 'Exemplo Juliett Educação Ltda.',
    tradeName: 'Juliett Educação (exemplo)',
    entrepreneur: entrepreneur('09'),
    whitelabel: WL.alfa,
    createdAt: at('2026-06-17', '16:00'),
    updatedAt: at('2026-09-21', '12:45'),
  }),
  company('111', {
    legalName: 'Exemplo Kilo Saúde Ltda.',
    tradeName: 'Kilo Saúde (exemplo)',
    entrepreneur: entrepreneur('10'),
    whitelabel: WL.gama,
    createdAt: at('2026-07-08', '10:05'),
    updatedAt: at('2026-07-08', '10:05'),
  }),
  company('112', {
    legalName: 'Exemplo Lima Construções Ltda.',
    tradeName: 'Lima Construções (exemplo)',
    entrepreneur: entrepreneur('11'),
    whitelabel: WL.beta,
    createdAt: at('2026-07-29', '14:50'),
    updatedAt: at('2026-10-02', '09:15'),
  }),
  company('113', {
    legalName: null,
    tradeName: null,
    taxId: null,
    entrepreneur: null,
    whitelabel: null,
    createdAt: null,
    updatedAt: null,
  }),
])

/** Prototype Company ids only (`cmp_proto_###`). */
export function isPrototypeCompanyId(id: string) {
  return /^cmp_proto_\d{3}$/.test(id)
}

export function prototypeCompanyById(id: string) {
  return PROTOTYPE_COMPANIES.find((item) => item.id === id) ?? null
}

const fold = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('pt-BR')

/**
 * Local, illustrative stand-in for the future server query: search by legal
 * name, trade name or illustrative id; optional illustrative Whitelabel ref;
 * fixed page size. Order is the prototype's own (the server order is open).
 */
export function queryPrototypeCompanies({
  page,
  perPage,
  search,
  whitelabel,
}: {
  page: number
  perPage: number
  search: string
  whitelabel?: string
}) {
  const scopeMissing = whitelabel !== undefined && !PROTOTYPE_COMPANY_WHITELABELS.some((item) => item.ref === whitelabel)
  const needle = fold(search.trim())
  const matches = scopeMissing
    ? []
    : PROTOTYPE_COMPANIES.filter(
        (item) =>
          (whitelabel === undefined || item.whitelabel?.ref === whitelabel) &&
          (!needle || [item.legalName, item.tradeName, item.id].some((value) => value !== null && fold(value).includes(needle))),
      )
  const total = matches.length
  const lastPage = Math.max(1, Math.ceil(total / perPage))
  const rows = matches.slice((page - 1) * perPage, page * perPage)
  return { rows, page, perPage, total, lastPage, scopeMissing }
}
