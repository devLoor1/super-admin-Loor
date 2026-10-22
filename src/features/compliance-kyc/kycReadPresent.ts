import { formatDateTime } from '../operation/shared/operationModel'

export const kycReadDateText = (value: string | null) => formatDateTime(value) ?? 'Não informado'
export const kycReadTicketText = (value: boolean | null) => value === true ? 'Presença registrada' : value === false ? 'Ausente no registro' : 'Não informado'
