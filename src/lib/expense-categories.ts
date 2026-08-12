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
  const desc = descricao.toLowerCase().trim()

  // Aquisição: Sinal, Leiloeiro, Taxa de Serviço
  if (
    desc.includes('sinal') ||
    desc.includes('leiloeiro') ||
    desc.includes('taxa de serviço') ||
    desc.includes('taxa de servico')
  ) {
    return 'Aquisição'
  }

  // Tributos: ITBI, Escritura, Registro, Averbação AF, Emolumentos
  if (
    desc.includes('itbi') ||
    desc.includes('escritura') ||
    desc.includes('registro') ||
    desc.includes('averbação') ||
    desc.includes('averbacao') ||
    desc.includes('emolumentos')
  ) {
    return 'Tributos'
  }

  // Desocupação: Acordo, Reforma, Honorários, Custas
  if (
    desc.includes('acordo') ||
    desc.includes('reforma') ||
    desc.includes('honorários') ||
    desc.includes('honorarios') ||
    desc.includes('custas')
  ) {
    return 'Desocupação'
  }

  // Mensais: Prestação, Condomínio, IPTU
  if (
    desc.includes('prestação') ||
    desc.includes('prestacao') ||
    desc.includes('condomínio') ||
    desc.includes('condominio') ||
    desc.includes('iptu')
  ) {
    return 'Mensais'
  }

  // Venda: Corretagem, Lucro Imobiliário, Venda, Locação
  if (
    desc.includes('corretagem') ||
    desc.includes('corretor') ||
    desc.includes('lucro imobiliário') ||
    desc.includes('lucro imobiliario') ||
    desc.includes('venda') ||
    desc.includes('locação') ||
    desc.includes('locacao')
  ) {
    return 'Venda'
  }

  return 'Aquisição'
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
  Aquisição: ['Sinal', 'Leiloeiro', 'Taxa de Serviço'],
  Tributos: ['ITBI', 'Escritura', 'Registro', 'Averbação AF', 'Emolumentos'],
  Desocupação: ['Acordo', 'Reforma', 'Honorários', 'Custas'],
  Mensais: ['Prestação', 'Condomínio', 'IPTU'],
  Venda: ['Corretagem', 'Lucro Imobiliário', 'Venda', 'Locação'],
}

export const RECEITA_DESCRIPTIONS: string[] = [
  'Venda do Imóvel',
  'Aluguel Temporário',
  'Outras Receitas',
]
