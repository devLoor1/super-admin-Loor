import type { StatusTone } from '../../components/ui/StatusPill'

export function operatorStatus(value: string): { label: string; tone: StatusTone } {
  return value === 'ACTIVE' ? { label: 'Ativo', tone: 'success' } : value === 'INACTIVE' ? { label: 'Inativo', tone: 'muted' } : { label: `Status não reconhecido (${value})`, tone: 'neutral' }
}
const dates = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' })
export const operatorDateText = (value: string | null) => value === null ? 'Não registrado / indisponível' : dates.format(new Date(value))
