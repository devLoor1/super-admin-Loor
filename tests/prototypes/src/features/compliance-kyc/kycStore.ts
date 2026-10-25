import { useSyncExternalStore } from 'react'
import type { KycCase, KycDecisionStatus } from './kycModel'
import { PROTOTYPE_KYC_CASES } from './prototypeKyc'

/*
 * Compliance › KYC session store. In-memory only: survives in-app
 * navigation, is lost on reload, never persisted and never sent anywhere.
 *
 * It holds ONLY KYC state (cases and their local session activity). It is
 * not shared with any other module: no Auditoria event is appended, and no
 * Accounts, Operation, Finance or Opportunity record is read for writing or
 * changed. Seeds stay frozen; every change replaces the affected case.
 */

export type KycActivity = { id: string; title: string; detail?: string; at: string }

type State = { cases: readonly KycCase[]; activity: Readonly<Record<string, KycActivity[]>> }

let state: State = { cases: PROTOTYPE_KYC_CASES, activity: {} }
let activitySequence = 0
let issueSequence = 0
const listeners = new Set<() => void>()
const NO_ACTIVITY: KycActivity[] = []
/** Repeated identical activity entries within this window are ignored (e.g. a re-mounted view). */
const DEDUPE_MS = 1500

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const getState = () => state

function emit(next: State) {
  state = next
  listeners.forEach((listener) => listener())
}

export function useKycCases(): readonly KycCase[] {
  return useSyncExternalStore(subscribe, getState).cases
}

export function useKycActivity(kycCaseId: string): KycActivity[] {
  return useSyncExternalStore(subscribe, getState).activity[kycCaseId] ?? NO_ACTIVITY
}

/** Newest first. Entries carry ids and short labels only — never document contents. */
export function addKycActivity(kycCaseId: string, entry: { title: string; detail?: string }) {
  const list = state.activity[kycCaseId] ?? NO_ACTIVITY
  const latest = list[0]
  const now = Date.now()
  if (latest && latest.title === entry.title && latest.detail === entry.detail && now - Date.parse(latest.at) < DEDUPE_MS) return
  activitySequence += 1
  const created: KycActivity = { ...entry, id: `kyc_act_${activitySequence}`, at: new Date(now).toISOString() }
  emit({ ...state, activity: { ...state.activity, [kycCaseId]: [created, ...list] } })
}

function updateCase(kycCaseId: string, change: (item: KycCase, now: string) => KycCase | null) {
  const now = new Date().toISOString()
  let changed = false
  const cases = state.cases.map((item) => {
    if (item.kycCaseId !== kycCaseId) return item
    const next = change(item, now)
    if (!next) return item
    changed = true
    return { ...next, updatedAt: now }
  })
  if (changed) emit({ ...state, cases })
  return changed
}

/* ---------- Local prototype actions (no side effect outside this store) ---------- */

/** Recebida → Revisada. A pending (not received) evidence cannot be reviewed. */
export function reviewEvidence(kycCaseId: string, evidenceId: string) {
  return updateCase(kycCaseId, (item, now) => {
    const target = item.evidences.find((evidence) => evidence.evidenceId === evidenceId)
    if (!target || target.status !== 'received') return null
    return {
      ...item,
      evidences: item.evidences.map((evidence) =>
        evidence.evidenceId === evidenceId ? { ...evidence, status: 'reviewed', reviewedAt: now, reviewedLocally: true } : evidence,
      ),
    }
  })
}

export function addPendingIssue(kycCaseId: string, description: string) {
  let createdId = ''
  const changed = updateCase(kycCaseId, (item, now) => {
    issueSequence += 1
    createdId = `PI-${item.kycCaseId.replace('kyc_proto_', '').toUpperCase()}-L${issueSequence}`
    return {
      ...item,
      pendingIssues: [
        ...item.pendingIssues,
        { pendingIssueId: createdId, description, status: 'open', createdAt: now, resolvedAt: null, origin: 'session' },
      ],
    }
  })
  return changed ? createdId : null
}

function setIssueStatus(kycCaseId: string, pendingIssueId: string, status: 'open' | 'resolved') {
  return updateCase(kycCaseId, (item, now) => {
    const target = item.pendingIssues.find((issue) => issue.pendingIssueId === pendingIssueId)
    if (!target || target.status === status) return null
    return {
      ...item,
      pendingIssues: item.pendingIssues.map((issue) =>
        issue.pendingIssueId === pendingIssueId ? { ...issue, status, resolvedAt: status === 'resolved' ? now : null } : issue,
      ),
    }
  })
}

export const resolvePendingIssue = (kycCaseId: string, pendingIssueId: string) => setIssueStatus(kycCaseId, pendingIssueId, 'resolved')
export const reopenPendingIssue = (kycCaseId: string, pendingIssueId: string) => setIssueStatus(kycCaseId, pendingIssueId, 'open')

/**
 * Registers a prototype decision on the case only. It changes the case's own
 * status and decision fields — nothing else, anywhere.
 */
export function recordDecision(kycCaseId: string, status: KycDecisionStatus, note: string, decidedBy: string) {
  return updateCase(kycCaseId, (item, now) => {
    if (item.status === status) return null
    return { ...item, status, decision: { status, note, decidedAt: now, decidedBy, origin: 'session' } }
  })
}
