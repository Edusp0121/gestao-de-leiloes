export type ExpenseCategory = 'Aquisição' | 'Tributos' | 'Desocupação' | 'Mensais' | 'Venda'

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Aquisição',
  'Tributos',
  'Desocupação',
  'Mensais',
  'Venda',
]

export const HARDCODED_ESTIMATED_COSTS: Record<ExpenseCategory, number> = {
  Aquisição: 16698,
  Tributos: 10135,
  Desocupação: 10626,
  Mensais: 19260,
  Venda: 0,
}

export function categorizeExpense(descricao: string): ExpenseCategory {
  const desc = descricao.toLowerCase()
  if (
    desc.includes('itbi') ||
    desc.includes('comissão') ||
    desc.includes('leiloeiro') ||
    desc.includes('arremata')
  ) {
    return 'Aquisição'
  }
  if (
    desc.includes('iptu') ||
    desc.includes('imposto') ||
    desc.includes('taxa') ||
    desc.includes('tributo')
  ) {
    return 'Tributos'
  }
  if (
    desc.includes('desocupa') ||
    desc.includes('advogado') ||
    desc.includes('jurídic') ||
    desc.includes('oficial')
  ) {
    return 'Desocupação'
  }
  if (
    desc.includes('condomínio') ||
    desc.includes('reforma') ||
    desc.includes('manutenção') ||
    desc.includes('luz') ||
    desc.includes('água')
  ) {
    return 'Mensais'
  }
  if (desc.includes('corretor') || desc.includes('anúncio') || desc.includes('venda')) {
    return 'Venda'
  }
  return 'Mensais'
}

export function getEstimatedCostsByCategory(_op?: any): Record<ExpenseCategory, number> {
  return { ...HARDCODED_ESTIMATED_COSTS }
}

export function getRealCostsByCategory(
  lancamentos: { tipo: string; descricao: string; valor: number; categoria?: string }[],
): Record<ExpenseCategory, number> {
  const res: Record<ExpenseCategory, number> = {
    Aquisição: 0,
    Tributos: 0,
    Desocupação: 0,
    Mensais: 0,
    Venda: 0,
  }
  lancamentos
    .filter((l) => l.tipo === 'Despesa')
    .forEach((l) => {
      const cat = (l.categoria as ExpenseCategory) || categorizeExpense(l.descricao)
      if (res[cat] !== undefined) {
        res[cat] += l.valor
      }
    })
  return res
}

export const CATEGORY_DESCRIPTIONS: Record<ExpenseCategory, string[]> = {
  Aquisição: ['Comissão Leiloeiro', 'ITBI', 'Escritura', 'Registro', 'Averbação'],
  Tributos: ['IPTU Atrasado', 'Taxas Judiciais'],
  Desocupação: ['Assessoria Jurídica / Advogado', 'Acordo com Morador', 'Oficial de Justiça'],
  Mensais: ['Condomínio Mensal', 'IPTU Mensal', 'Reforma Prevista'],
  Venda: ['Comissão Corretor (6%)', 'IR sobre Ganho de Capital'],
}

export const RECEITA_DESCRIPTIONS: string[] = [
  'Venda do Imóvel',
  'Aluguel Temporário',
  'Outras Receitas',
]
