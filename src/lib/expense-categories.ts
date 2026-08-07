export type ExpenseCategory = 'Aquisição' | 'Tributos' | 'Desocupação' | 'Mensais' | 'Venda'

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Aquisição',
  'Tributos',
  'Desocupação',
  'Mensais',
  'Venda',
]

export function categorizeExpense(descricao: string): ExpenseCategory {
  const d = descricao.toLowerCase()
  if (d.includes('itbi') || d.includes('iptu') || d.includes('imposto') || d.includes('tributo'))
    return 'Tributos'
  if (
    d.includes('desocupa') ||
    d.includes('despejo') ||
    d.includes('juridic') ||
    d.includes('advogad') ||
    d.includes('assessoria')
  )
    return 'Desocupação'
  if (d.includes('condom') || d.includes('mensal') || d.includes('manuten')) return 'Mensais'
  if (d.includes('corretor') || d.includes('venda')) return 'Venda'
  return 'Aquisição'
}

export function getEstimatedCostsByCategory(op: {
  valor_arrematacao?: number
  comissao_leiloeiro_percent?: number
  itbi_percent?: number
  escritura?: number
  registro?: number
  averbacao?: number
  reforma_prevista?: number
  assessoria_juridica?: number
  condominio_iptu_mensal?: number
  tempo_estimado_venda_meses?: number
  valor_venda_com_desconto?: number
  comissao_corretor_percent?: number
}): Record<ExpenseCategory, number> {
  const arrem = op.valor_arrematacao || 0
  const comLeiloeiro = arrem * ((op.comissao_leiloeiro_percent || 0) / 100)
  const itbi = arrem * ((op.itbi_percent || 0) / 100)
  const cartorio = (op.escritura || 0) + (op.registro || 0) + (op.averbacao || 0)
  const mensal = (op.condominio_iptu_mensal || 0) * (op.tempo_estimado_venda_meses || 0)
  const comCorretor =
    (op.valor_venda_com_desconto || 0) * ((op.comissao_corretor_percent || 0) / 100)
  return {
    Aquisição: arrem + comLeiloeiro,
    Tributos: itbi + cartorio,
    Desocupação: 0,
    Mensais: mensal + (op.reforma_prevista || 0) + (op.assessoria_juridica || 0),
    Venda: comCorretor,
  }
}

export function getRealCostsByCategory(
  lancamentos: { tipo: string; descricao: string; valor: number; categoria?: string }[],
): Record<ExpenseCategory, number> {
  const result = EXPENSE_CATEGORIES.reduce(
    (acc, cat) => ({ ...acc, [cat]: 0 }),
    {} as Record<ExpenseCategory, number>,
  )
  lancamentos
    .filter((l) => l.tipo === 'Despesa')
    .forEach((l) => {
      const cat = (l.categoria as ExpenseCategory) || categorizeExpense(l.descricao)
      result[cat] += l.valor
    })
  return result
}
