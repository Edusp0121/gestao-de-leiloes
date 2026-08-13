export type ExpenseCategory = 'Aquisição' | 'Tributos' | 'Desocupação' | 'Mensais' | 'Venda'

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Aquisição',
  'Tributos',
  'Desocupação',
  'Mensais',
  'Venda',
]

export function categorizeExpense(descricao: string): ExpenseCategory {
  const desc = descricao.toLowerCase().trim()

  // Aquisição: Sinal, Leiloeiro
  if (desc.includes('sinal') || desc.includes('leiloeiro')) {
    return 'Aquisição'
  }

  // Tributos: ITBI, Escritura, Registro, Averbação AF
  if (
    desc.includes('itbi') ||
    desc.includes('escritura') ||
    desc.includes('registro') ||
    desc.includes('averbação') ||
    desc.includes('averbacao')
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

  // Venda: Corretagem, Lucro Imobiliário, Venda, Locação, Saldo Devedor
  if (
    desc.includes('corretagem') ||
    desc.includes('corretor') ||
    desc.includes('lucro imobiliário') ||
    desc.includes('lucro imobiliario') ||
    desc.includes('venda') ||
    desc.includes('locação') ||
    desc.includes('locacao') ||
    desc.includes('saldo devedor')
  ) {
    return 'Venda'
  }

  return 'Aquisição'
}

const num = (v: any): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * Cálculo dinâmico dos custos estimados por categoria, com base nos campos
 * reais da oportunidade. Campos nulos/undefined são tratados como 0.
 *
 * Aquisição    = Sinal + Leiloeiro
 * Tributos     = ITBI + Escritura + Registro + Averbação
 * Desocupação  = Acordo + Reforma + Honorários + Custas
 * Mensais      = Prestações pagas + (Condomínio+IPTU mensal * prazo)
 * Venda        = Corretagem + Lucro imobiliário + Saldo devedor
 */
export function getEstimatedCostsByCategory(op?: any): Record<ExpenseCategory, number> {
  const EMPTY: Record<ExpenseCategory, number> = {
    Aquisição: 0,
    Tributos: 0,
    Desocupação: 0,
    Mensais: 0,
    Venda: 0,
  }
  if (!op) {
    return { ...EMPTY }
  }

  // Fonte autoritativa: valores estimados por categoria conforme a planilha de
  // viabilidade (ex.: Resultado_JF), armazenados em `custos_estimados_planilha`.
  // Quando presentes, sobrescrevem o cálculo derivado dos campos individuais —
  // estes podem divergir da planilha quando campos foram migrados/zerados
  // (ex.: percentual_entrada=0 ou taxa_servico removido), exibindo valores
  // brutos do banco em vez dos totais corretos.
  const planilhaRaw = op.custos_estimados_planilha
  if (planilhaRaw) {
    let planilha: any = planilhaRaw
    if (typeof planilha === 'string') {
      try {
        planilha = JSON.parse(planilhaRaw)
      } catch (_) {
        planilha = null
      }
    }
    if (planilha && typeof planilha === 'object') {
      const result = { ...EMPTY }
      ;(Object.keys(EMPTY) as ExpenseCategory[]).forEach((cat) => {
        const v = num(planilha[cat])
        if (v > 0) result[cat] = Math.round(v * 100) / 100
      })
      return result
    }
  }

  const valorArrematacao = num(op.valor_arrematacao)
  const percentualEntrada = num(op.percentual_entrada)
  const comissaoLeiloeiroPercent = num(op.comissao_leiloeiro_percent)

  const itbiPercent = num(op.itbi_percent)
  const escritura = num(op.escritura)
  const registro = num(op.registro)
  const averbacao = num(op.averbacao)

  const acordoDesocupacao = num(op.acordo_desocupacao)
  const reformaPrevista = num(op.reforma_prevista)
  const assessoriaJuridica = num(op.assessoria_juridica)
  const taxasJudiciais = num(op.taxas_judiciais)

  const condominioIptuMensal = num(op.condominio_iptu_mensal)
  const prazo = num(op.tempo_estimado_venda_meses) || num(op.prazo_financiamento) || 0
  const valorParcelaMensal = num(op.valor_parcela_mensal)
  const parcelasPagas = num(op.parcelas_pagas)

  const valorVenda = num(op.valor_venda_com_desconto) || num(op.valor_mercado)
  const comissaoCorretorPercent = num(op.comissao_corretor_percent)
  const saldoDevedor = num(op.saldo_devedor)

  const isFinanciado =
    Boolean(op.modalidade_financiamento) &&
    op.modalidade_financiamento !== 'À Vista' &&
    (num(op.prazo_financiamento) > 0 || num(op.saldo_devedor) > 0)

  // Aquisição
  const sinal = isFinanciado
    ? (percentualEntrada / 100) * valorArrematacao
    : percentualEntrada > 0
      ? (percentualEntrada / 100) * valorArrematacao
      : valorArrematacao
  const leiloeiro = (comissaoLeiloeiroPercent / 100) * valorArrematacao
  const aquisicao = sinal + leiloeiro

  // Tributos
  const itbi = (itbiPercent / 100) * valorArrematacao
  const tributos = itbi + escritura + registro + averbacao

  // Desocupação
  const desocupacao = acordoDesocupacao + reformaPrevista + assessoriaJuridica + taxasJudiciais

  // Mensais
  const prestacoesPagas = valorParcelaMensal * parcelasPagas
  const mensais = prestacoesPagas + condominioIptuMensal * prazo

  // Venda
  const corretagem = (comissaoCorretorPercent / 100) * valorVenda
  // Lucro imobiliário: ganho de capital sobre a venda (já armazenado no registro
  // quando disponível, senão estimado como venda - aquisição - tributos)
  const lucroImobiliario =
    num(op.ganho_capital_base) || Math.max(0, valorVenda - aquisicao - tributos)
  const venda = corretagem + lucroImobiliario + saldoDevedor

  return {
    Aquisição: Math.round(aquisicao * 100) / 100,
    Tributos: Math.round(tributos * 100) / 100,
    Desocupação: Math.round(desocupacao * 100) / 100,
    Mensais: Math.round(mensais * 100) / 100,
    Venda: Math.round(venda * 100) / 100,
  }
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
      // Lançamentos da categoria Venda cuja descrição é "Venda" ou "Locação"
      // são receitas, não despesas — não entram no somatório de despesas reais.
      if (cat === 'Venda' && isVendaReceita(l.descricao)) {
        return
      }
      if (res[cat] !== undefined) {
        res[cat] += l.valor
      }
    })
  return res
}

export const CATEGORY_DESCRIPTIONS: Record<ExpenseCategory, string[]> = {
  Aquisição: ['Sinal', 'Leiloeiro'],
  Tributos: ['ITBI', 'Escritura', 'Registro', 'Averbação AF'],
  Desocupação: ['Acordo', 'Reforma', 'Honorários', 'Custas'],
  Mensais: ['Prestação', 'Condomínio', 'IPTU'],
  Venda: ['Corretagem', 'Lucro Imobiliário', 'Venda', 'Locação', 'Saldo Devedor'],
}

export const RECEITA_DESCRIPTIONS: string[] = [
  'Venda do Imóvel',
  'Aluguel Temporário',
  'Outras Receitas',
]

/**
 * Itens da categoria "Venda" que são RECEITAS (e portanto NÃO devem entrar no
 * somatório de despesas estimadas nem reais). Os demais itens da categoria
 * Venda — Corretagem, Lucro Imobiliário e Saldo Devedor — são despesas.
 */
export const VENDA_RECEITA_DESCRIPTIONS: string[] = ['Venda', 'Locação']

/**
 * Verifica se uma descrição corresponde a uma receita da categoria Venda
 * (Venda ou Locação). Esses lançamentos são classificados na categoria Venda,
 * mas representam entradas de dinheiro e não devem somar ao total de despesas.
 */
export function isVendaReceita(descricao: string): boolean {
  const desc = (descricao || '').toLowerCase().trim()
  return VENDA_RECEITA_DESCRIPTIONS.some((r) => desc === r.toLowerCase())
}
