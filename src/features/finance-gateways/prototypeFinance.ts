import type { CredentialKey, CredentialState, WhitelabelFinanceSettings } from './financeModel'

/*
 * ILLUSTRATIVE PROTOTYPE FINANCE DATA — not production data, not a backend
 * contract, not a list of supported providers. Provider and bank names are
 * fictitious; account numbers, Pix keys and identifiers exist only as masked
 * hints. No secret exists anywhere in this file.
 */

function credentials(state: Partial<Record<CredentialKey, string | true>>): Record<CredentialKey, CredentialState> {
  const entry = (key: CredentialKey): CredentialState => {
    const value = state[key]
    if (value === undefined) return { configured: false }
    return value === true ? { configured: true } : { configured: true, hint: value }
  }
  return { clientId: entry('clientId'), apiKey: entry('apiKey'), webhookSecret: entry('webhookSecret'), accountId: entry('accountId') }
}

export const PROTOTYPE_FINANCE: Record<string, WhitelabelFinanceSettings> = {
  wl_proto_01: {
    whitelabelId: 'wl_proto_01',
    gateways: [
      {
        id: 'gw_finapop_alfa',
        providerId: 'alfa',
        role: 'primary',
        environment: 'production',
        active: true,
        credentials: credentials({ clientId: '7Q2B', apiKey: true, webhookSecret: true, accountId: '4821' }),
        modalities: ['equity', 'debt'],
        linkedBankAccountId: 'ba_finapop_1',
        lastValidation: null,
      },
      {
        id: 'gw_finapop_beta',
        providerId: 'beta',
        role: 'secondary',
        environment: 'sandbox',
        active: true,
        credentials: credentials({ clientId: 'K9D1', apiKey: true }),
        modalities: ['debt'],
        linkedBankAccountId: null,
        lastValidation: null,
      },
      {
        id: 'gw_finapop_gama',
        providerId: 'gama',
        role: 'backup',
        environment: 'production',
        active: false,
        credentials: credentials({ clientId: 'M3X8', apiKey: true, webhookSecret: true, accountId: '1190' }),
        modalities: [],
        linkedBankAccountId: null,
        lastValidation: null,
      },
    ],
    bankAccounts: [
      {
        id: 'ba_finapop_1',
        bankCode: '901',
        agency: '0001',
        accountLast4: '4821',
        accountDigit: '0',
        type: 'checking',
        holder: 'Finapop (titular ilustrativo)',
        pixType: 'random',
        pixHint: '••••9f3a',
        status: 'active',
      },
    ],
    modalities: { equity: 'enabled', debt: 'enabled' },
  },
  wl_proto_02: {
    whitelabelId: 'wl_proto_02',
    gateways: [
      {
        id: 'gw_loor_alfa',
        providerId: 'alfa',
        role: 'primary',
        environment: 'sandbox',
        active: true,
        credentials: credentials({ clientId: 'L0R2', apiKey: true, webhookSecret: true }),
        modalities: ['equity'],
        linkedBankAccountId: null,
        lastValidation: null,
      },
    ],
    bankAccounts: [
      {
        id: 'ba_loor_1',
        bankCode: '902',
        agency: '1200',
        accountLast4: '3307',
        accountDigit: '5',
        type: 'payment',
        holder: 'Loor (titular ilustrativo)',
        pixType: 'email',
        pixHint: 'f•••@loor.com.br',
        status: 'inactive',
      },
    ],
    modalities: { equity: 'enabled', debt: 'enabled' },
  },
  wl_proto_03: {
    whitelabelId: 'wl_proto_03',
    gateways: [],
    bankAccounts: [],
    modalities: { equity: 'not_configured', debt: 'not_configured' },
  },
}
