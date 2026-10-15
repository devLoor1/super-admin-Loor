import { isServerEntrepreneurId } from '../entrepreneurs/entrepreneurApi'
import { entrepreneurHref } from '../entrepreneurs/entrepreneurRoute'
import { isServerWhitelabelId } from '../../whitelabels/whitelabelApi'
import type { CompanyRecordCandidate } from './companyContract'
import type { PrototypeCompany } from './prototypeCompanies'

/*
 * Companies presentation model — what the list and detail render, whatever
 * the source. Provenance travels with every view, so a prototype record can
 * never be presented (or linked) as Control Plane data.
 */

export type CompanyProvenance = 'prototype' | 'backend'

export type CompanyRelationView =
  /** Illustrative reference inside the prototype: shown as text, never linked, never requested. */
  | { kind: 'illustrative'; label: string; ref: string }
  /** Future authoritative id from the Backend (`company.entrepreneurId` / `company.whitelabelId`). */
  | { kind: 'core'; id: string; href: string | null }
  | { kind: 'missing' }

export type CompanyView = {
  id: string
  provenance: CompanyProvenance
  /** Legal name, else trade name, else a neutral fallback. */
  displayName: string
  legalName: string | null
  tradeName: string | null
  /** Masked for display; never validated. */
  taxIdMasked: string | null
  /** Raw official status when a future Backend provides one; no vocabulary is mapped. */
  officialStatus: string | null
  entrepreneur: CompanyRelationView
  whitelabel: CompanyRelationView
  createdAt: string | null
  updatedAt: string | null
}

export const COMPANY_NAME_FALLBACK = 'Empresa sem nome informado'

const clean = (value: string | null) => (typeof value === 'string' && value.trim() ? value.trim() : null)

/**
 * Display mask for a tax identifier (CNPJ). Only the branch and the last two
 * digits stay visible. This is not validation: no check digit, format or
 * uniqueness rule is applied, and a non-standard value is fully masked.
 */
export function maskTaxId(value: string | null) {
  const input = clean(value)
  if (!input) return null
  const digits = input.replace(/\D/g, '')
  if (digits.length !== 14) return '••••'
  return `••.•••.•••/${digits.slice(8, 12)}-${digits.slice(12)}`
}

function displayName(legalName: string | null, tradeName: string | null) {
  return legalName ?? tradeName ?? COMPANY_NAME_FALLBACK
}

/** Prototype record → view. References stay illustrative: no href is ever built for them. */
export function viewFromPrototype(record: PrototypeCompany): CompanyView {
  const legalName = clean(record.legalName)
  const tradeName = clean(record.tradeName)
  return {
    id: record.id,
    provenance: 'prototype',
    displayName: displayName(legalName, tradeName),
    legalName,
    tradeName,
    taxIdMasked: maskTaxId(record.taxId),
    officialStatus: null,
    entrepreneur: record.entrepreneur ? { kind: 'illustrative', label: record.entrepreneur.label, ref: record.entrepreneur.ref } : { kind: 'missing' },
    whitelabel: record.whitelabel ? { kind: 'illustrative', label: record.whitelabel.label, ref: record.whitelabel.ref } : { kind: 'missing' },
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}

/**
 * Future Backend record → view (prepared, not used while the contract is not
 * integrated). The authoritative Entrepreneur link is `company.entrepreneurId`
 * — never inferred from names, e-mails or tenants — and is linked only when it
 * is a valid Core id.
 */
export function viewFromCandidate(record: CompanyRecordCandidate): CompanyView {
  const legalName = clean(record.legalName)
  const tradeName = clean(record.tradeName)
  const entrepreneurId = clean(record.entrepreneurId)
  const whitelabelId = clean(record.whitelabelId)
  return {
    id: record.id,
    provenance: 'backend',
    displayName: displayName(legalName, tradeName),
    legalName,
    tradeName,
    taxIdMasked: maskTaxId(record.taxId),
    officialStatus: clean(record.officialStatus),
    entrepreneur: entrepreneurId
      ? { kind: 'core', id: entrepreneurId, href: isServerEntrepreneurId(entrepreneurId) ? entrepreneurHref(entrepreneurId) : null }
      : { kind: 'missing' },
    whitelabel: whitelabelId
      ? { kind: 'core', id: whitelabelId, href: isServerWhitelabelId(whitelabelId) ? `#/whitelabels?id=${encodeURIComponent(whitelabelId)}` : null }
      : { kind: 'missing' },
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}
