import type { ResourceUse, Segment } from './catalogModel'

/*
 * ILLUSTRATIVE prototype catalogs per Whitelabel — not production data, not a
 * reference taxonomy and not a regulatory classification. The two catalogs
 * are seeded separately on purpose: "Capital de Giro" exists in BOTH as two
 * unrelated records with different ids.
 */

const seg = (id: string, name: string, description: string, status: Segment['status'] = 'active'): Segment => ({
  kind: 'segment',
  id: `seg_${id}`,
  name,
  description,
  status,
})

const ru = (id: string, name: string, description: string, status: ResourceUse['status'] = 'active'): ResourceUse => ({
  kind: 'resource_use',
  id: `ru_${id}`,
  name,
  description,
  status,
})

export const PROTOTYPE_SEGMENTS: Record<string, Segment[]> = {
  wl_proto_01: [
    seg('finapop_tecnologia', 'Tecnologia', 'Empresas de tecnologia e inovação.'),
    seg('finapop_saude', 'Saúde', 'Clínicas, hospitais e serviços de saúde.'),
    seg('finapop_educacao', 'Educação', 'Instituições de ensino e capacitação.'),
    seg('finapop_agro', 'Agronegócio', 'Produção agrícola e pecuária.', 'inactive'),
    seg('finapop_capital_giro', 'Capital de Giro', 'Empresas em geral (exemplo ilustrativo).'),
  ],
  wl_proto_02: [
    seg('loor_servicos', 'Serviços', 'Empresas prestadoras de serviços.'),
    seg('loor_varejo', 'Varejo', 'Comércio varejista físico e digital.'),
    seg('loor_industria', 'Indústria', 'Transformação e manufatura.', 'inactive'),
  ],
  wl_proto_03: [],
}

export const PROTOTYPE_RESOURCE_USES: Record<string, ResourceUse[]> = {
  wl_proto_01: [
    ru('finapop_expansao', 'Expansão', 'Expansão de operações e novas unidades.'),
    ru('finapop_modernizacao', 'Modernização', 'Aquisição de equipamentos e tecnologia.'),
    ru('finapop_marketing', 'Marketing', 'Investimentos em marketing e aquisição de clientes.'),
    ru('finapop_estoque', 'Aumento de estoque', 'Formação e ampliação de estoque.', 'inactive'),
    ru('finapop_capital_giro', 'Capital de Giro', 'Manutenção das operações do dia a dia.'),
    ru('finapop_reestruturacao', 'Reestruturação', 'Reestruturação financeira e operacional.', 'inactive'),
  ],
  wl_proto_02: [
    ru('loor_capital_giro', 'Capital de Giro', 'Manutenção das operações do dia a dia.'),
    ru('loor_expansao', 'Expansão', 'Expansão de operações e novas unidades.'),
  ],
  wl_proto_03: [],
}
