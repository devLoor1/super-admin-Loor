import type { ModalityId, ModalityRuleConfig } from './modalitiesModel'

/*
 * ILLUSTRATIVE prototype rule configuration per Whitelabel — not production
 * data and not a rule catalog. Only the two generic three-state concepts are
 * stored; "default" means "Padrão não definido" (no platform default exists).
 * Modality enablement itself lives in the Finance prototype data.
 */
export const PROTOTYPE_MODALITY_RULES: Record<string, Record<ModalityId, ModalityRuleConfig>> = {
  wl_proto_01: {
    equity: { manualApproval: 'yes', opportunityConfig: 'default' },
    debt: { manualApproval: 'yes', opportunityConfig: 'default' },
  },
  wl_proto_02: {
    equity: { manualApproval: 'default', opportunityConfig: 'yes' },
    debt: { manualApproval: 'default', opportunityConfig: 'default' },
  },
  wl_proto_03: {
    equity: { manualApproval: 'default', opportunityConfig: 'default' },
    debt: { manualApproval: 'default', opportunityConfig: 'default' },
  },
}
