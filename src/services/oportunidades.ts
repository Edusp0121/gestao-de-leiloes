import pb from '@/lib/pocketbase/client'

export interface Oportunidade {
  id: string
  nome: string
  endereco: string
  usuario: string
  tipo_leilao?: 'Judicial' | 'Extrajudicial'
  banco_selecionado?: string
  data_aquisicao?: string
  status?: 'Em análise' | 'Arrematada' | 'Em andamento' | 'Vendida'
  valor_arrematacao?: number
  valor_mercado?: number
  desagio_venda?: number
  tempo_estimado_venda_meses?: number
  indice_correcao_medio_mensal?: number
  itbi_percent?: number
  comissao_leiloeiro_percent?: number
  comissao_corretor_percent?: number
  escritura?: number
  registro?: number
  averbacao?: number
  reforma_prevista?: number
  assessoria_juridica?: number
  condominio_iptu_mensal?: number
  modalidade_financiamento?: 'À Vista' | 'SAC' | 'PRICE'
  banco_responsavel_financiamento?: string
  taxa_juros_financiamento?: number
  aliquota_reajuste?: number
  valor_parcela_mensal?: number
  saldo_devedor?: number
  parcelas_pagas?: number
  capital_necessario?: number
  ganho_capital_base?: number
  ir_percent?: number
  ir_valor?: number
  incluir_ir_despesas?: boolean
  prazo_financiamento?: number
  percentual_entrada?: number
  taxa_avaliacao?: number
  taxas_judiciais?: number
  acordo_desocupacao?: number
  baixa_gravames?: number
  foro?: number
  taxa_servico?: number
  emolumentos?: number
  valor_venda_com_desconto?: number
  maior_lucro_esperado?: number
  retorno_estimado?: number
  roi_esperado_periodo?: number
  roi_esperado_anualizado?: number
  lance_teto?: number
  relatorio_viabilidade?: string
  created: string
  updated: string
}

export const getOportunidades = () =>
  pb.collection('oportunidades').getFullList<Oportunidade>({ sort: '-created' })

export const getOportunidade = (id: string) =>
  pb.collection('oportunidades').getOne<Oportunidade>(id)

export const createOportunidade = (data: Partial<Oportunidade> | FormData) => {
  const userId = pb.authStore.record?.id
  if (data instanceof FormData) {
    if (userId && !data.has('usuario')) {
      data.append('usuario', userId)
    }
    return pb.collection('oportunidades').create<Oportunidade>(data)
  }
  return pb.collection('oportunidades').create<Oportunidade>({
    ...data,
    usuario: userId,
  })
}

export const updateOportunidade = (id: string, data: Partial<Oportunidade> | FormData) =>
  pb.collection('oportunidades').update<Oportunidade>(id, data)

export const deleteOportunidade = (id: string) => pb.collection('oportunidades').delete(id)

export const getRelatorioUrl = (record: Oportunidade) => {
  if (!record.relatorio_viabilidade) return null
  return pb.files.getUrl(record, record.relatorio_viabilidade)
}
