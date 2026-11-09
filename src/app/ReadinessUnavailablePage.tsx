import { AppShell } from '../components/shell/AppShell'
import { EmptyState } from '../components/ui/EmptyState'
import { Info } from 'lucide-react'

/** Authenticated product-readiness gate. Saved sidebar preferences never gate real routes. */
export function ReadinessUnavailablePage() {
  return <AppShell activeNav="" title="Recurso indisponível" location="Homolog">
    <section data-readiness-unavailable><EmptyState icon={Info} title="Recurso ainda não disponível no homolog" description="Esta área pertence ao protótipo local. Nenhum registro ilustrativo ou ação simulada é apresentado aqui." />
      <a href="#/dashboard">Voltar ao Dashboard</a>
    </section>
  </AppShell>
}
