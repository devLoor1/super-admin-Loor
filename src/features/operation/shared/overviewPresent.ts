import { formatWhitelabelDate } from '../../whitelabels/whitelabelApi'

export const overviewDate = (value: string | null) => formatWhitelabelDate(value, true) ?? 'Não informado'
export const overviewStatus = (value: string | null | undefined) => value ?? 'Não informado'
