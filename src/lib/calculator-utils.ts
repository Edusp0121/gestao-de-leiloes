import { calculateSaldoDevedor, type FinancingParams } from './financing-utils'
import { getEstimatedCostsByCategory } from './expense-categories'

export interface CalculatorInputs {
  valor_mercado: number
  valor_arrematacao: number
  desagio_venda?: number
  tempo_estimado_venda_meses?: number
  itbi_percent?: number
  comissao_leiloeiro_percent?: number
  comissao_corretor_percent?: number
  escritura?: number
  registro?: number
  averbacao?: number
  reforma_prevista?: number
  assessoria_juridica?: number
  condominio_iptu_mensal?: number
  dividas_condominio?: number
  dividas_iptu?: number
  ir_percent?: number
  incluir_ir_despesas?: boolean
  taxa_avaliacao?: number
  taxas_judiciais?: number
  acordo_desocupacao?: number
  baixa_gravames?: number
  foro?: number
  taxa_servico?: number
  emolumentos?: number
  valor_prefeitura_venal?: number
  uf?: string
}

export function calculateMetrics(inputs: CalculatorInputs) {
  const valorMercado = Number(inputs.valor_mercado) || 0
  const valorArrematacao = Number(inputs.valor_arrematacao) || 0
  const desagio = Number(inputs.desagio_venda) || 0
  const tempoMeses = Number(inputs.tempo_estimado_venda_meses) || 1
  const itbiPct = Number(inputs.itbi_percent) || 3
  const comissaoLeiloeiroPct = Number(inputs.comissao_leiloeiro_percent) || 5
  const comissaoCorretorPct = Number(inputs.comissao_corretor_percent) || 6
  const escritura = Number(inputs.escritura) || 0
  const registro = Number(inputs.registro) || 0
  const averbacao = Number(inputs.averbacao) || 0
  const reforma = Number(inputs.reforma_prevista) || 0
  const assessoria = Number(inputs.assessoria_juridica) || 0
  const condominioIptu = Number(inputs.condominio_iptu_mensal) || 0
  const irPct = Number(inputs.ir_percent) || 15
  const incluirIR = inputs.incluir_ir_despesas !== false
  const taxaAvaliacao = Number(inputs.taxa_avaliacao) || 0
  const taxasJudiciais = Number(inputs.taxas_judiciais) || 0
  const acordoDesocupacao = Number(inputs.acordo_desocupacao) || 0
  const baixaGravames = Number(inputs.baixa_gravames) || 0
  const foro = Number(inputs.foro) || 0

  const valorVendaComDesconto = valorMercado * (1 - desagio / 100)
  const comissaoLeiloeiro = valorArrematacao * (comissaoLeiloeiroPct / 100)
  const valorBaseITBI =
    (Number(inputs.valor_prefeitura_venal) || 0) > 0
      ? Number(inputs.valor_prefeitura_venal)
      : valorMercado
  const itbi = valorBaseITBI * (itbiPct / 100)
  const comissaoCorretor = valorVendaComDesconto * (comissaoCorretorPct / 100)
  const custosCartorio = escritura + registro + averbacao
  const dividasCondominio = Number(inputs.dividas_condominio) || 0
  const dividasIptu = Number(inputs.dividas_iptu) || 0
  const custosManutencao = condominioIptu * tempoMeses + dividasCondominio + dividasIptu

  const capitalNecessario =
    valorArrematacao +
    comissaoLeiloeiro +
    itbi +
    custosCartorio +
    reforma +
    assessoria +
    custosManutencao +
    taxaAvaliacao +
    taxasJudiciais +
    acordoDesocupacao +
    baixaGravames +
    foro

  const ganhoCapitalBase = valorVendaComDesconto - capitalNecessario - comissaoCorretor
  const irValor = incluirIR ? Math.max(0, ganhoCapitalBase * (irPct / 100)) : 0
  const maiorLucroEsperado = Math.max(0, ganhoCapitalBase - irValor)
  const retornoEstimado = maiorLucroEsperado

  const roiEsperadoPeriodo =
    capitalNecessario > 0 ? (maiorLucroEsperado / capitalNecessario) * 100 : 0
  const roiEsperadoAnualizado =
    tempoMeses > 0 ? (roiEsperadoPeriodo * 12) / tempoMeses : roiEsperadoPeriodo
  const lanceTeto = valorVendaComDesconto * 0.65

  return {
    capital_necessario: Math.round(capitalNecessario * 100) / 100,
    ganho_capital_base: Math.round(ganhoCapitalBase * 100) / 100,
    ir_valor: Math.round(irValor * 100) / 100,
    valor_venda_com_desconto: Math.round(valorVendaComDesconto * 100) / 100,
    maior_lucro_esperado: Math.round(maiorLucroEsperado * 100) / 100,
    retorno_estimado: Math.round(retornoEstimado * 100) / 100,
    roi_esperado_periodo: Math.round(roiEsperadoPeriodo * 100) / 100,
    roi_esperado_anualizado: Math.round(roiEsperadoAnualizado * 100) / 100,
    lance_teto: Math.round(lanceTeto * 100) / 100,
  }
}

export const toNum = (v: unknown): number => {
  if (v == null) return 0
  const n = typeof v === 'string' ? parseFloat(v) : Number(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * Total das despesas estimadas de uma oportunidade (soma de todas as
 * categorias: Aquisição + Tributos + Desocupação + Mensais + Venda).
 *
 * A categoria "Venda" aqui contém apenas DESPESAS (Corretagem, Lucro
 * Imobiliário e Saldo Devedor); os itens de receita da categoria Venda
 * (Venda, Locação) não entram — ver getEstimatedCostsByCategory.
 */
export function calcTotalDespesasEstimadas(op: unknown): number {
  const estimated = getEstimatedCostsByCategory(op as any)
  const { Aquisição = 0, Tributos = 0, Desocupação = 0, Mensais = 0 } = estimated
  const total = Aquisição + Tributos + Desocupação + Mensais
  return Math.round(total * 100) / 100
}

/**
 * Saldo devedor do financiamento de uma oportunidade.
 *
 * Se o registro já possuir `saldo_devedor` calculado (e positivo), usamos
 * esse valor; caso contrário recalculamos a partir dos parâmetros do
 * financiamento. Retorna 0 quando à vista.
 *
 * Todos os campos são convertidos via `toNum` para evitar corrupção por
 * strings vindo do banco (ex.: `saldo_devedor` ou `valor_arrematacao`
 * serializados como texto).
 */
export function calcSaldoDevedorFinanciamento(op: {
  modalidade_financiamento?: 'À Vista' | 'SAC' | 'PRICE' | string
  valor_arrematacao?: number | string | null
  taxa_juros_financiamento?: number | string | null
  prazo_financiamento?: number | string | null
  parcelas_pagas?: number | string | null
  percentual_entrada?: number | string | null
  saldo_devedor?: number | string | null
  indice_correcao_medio_mensal?: number | string | null
}): number {
  // Se o registro já possuir `saldo_devedor` calculado (e positivo),
  // usamos esse valor autoritativo — a página de detalhes já o calcula
  // (com percentual_entrada=10% como padrão) e o repassa no objeto `op`.
  // Recalcular do zero aqui (com percentual_entrada=0 quando o campo não
  // está definido no banco) geraria um saldo devedor maior e incorreto,
  // propagando o erro para o Retorno Estimado.
  if (toNum(op.saldo_devedor) > 0) {
    return Math.round(toNum(op.saldo_devedor) * 100) / 100
  }

  const modalidade = op.modalidade_financiamento
  const prazo = toNum(op.prazo_financiamento)
  const parcelasPagas = toNum(op.parcelas_pagas)

  if (!modalidade || modalidade === 'À Vista') return 0

  // Se prazo <= 0 mas há parcelas pagas e a modalidade é financiamento,
  // inferir prazo padrão de 120 meses (mesma lógica da página de detalhes).
  const prazoEfetivo = prazo > 0 ? prazo : parcelasPagas > 0 ? 120 : 0
  if (prazoEfetivo <= 0) return 0

  const annualRate = toNum(op.taxa_juros_financiamento) || 8
  const params: FinancingParams = {
    principal: toNum(op.valor_arrematacao),
    annualRate,
    termMonths: prazoEfetivo,
    paymentsMade: parcelasPagas,
    method: modalidade === 'SAC' ? 'SAC' : 'PRICE',
    // Quando `percentual_entrada` é nulo/undefined ou 0 (campo não definido
    // no banco), usamos 10% como padrão — mesmo comportamento de
    // `calculateSaldoDevedor` (financing-utils). Tratar 0 como literal
    // geraria saldo devedor maior que o correto.
    entryPercent:
      op.percentual_entrada == null || toNum(op.percentual_entrada) === 0
        ? 10
        : toNum(op.percentual_entrada),
    correcaoMensal: toNum(op.indice_correcao_medio_mensal),
  }
  return calculateSaldoDevedor(params)
}

/**
 * Capital Necessário estimado para uma oportunidade.
 *
 * Fórmula: Total das despesas estimadas (via getEstimatedCostsByCategory).
 * Não inclui o Saldo Devedor remanescente do financiamento.
 *
 * A entrada (sinal) já está inclusa nas despesas estimadas (categoria
 * "Aquisição"), portanto NÃO deve ser somada separadamente.
 */
export function calcCapitalNecessario(op: {
  modalidade_financiamento?: 'À Vista' | 'SAC' | 'PRICE' | string
  valor_arrematacao?: number | string | null
  taxa_juros_financiamento?: number | string | null
  prazo_financiamento?: number | string | null
  parcelas_pagas?: number | string | null
  percentual_entrada?: number | string | null
  saldo_devedor?: number | string | null
}): number {
  const totalDespesasEstimadas = calcTotalDespesasEstimadas(op)
  return Math.round(totalDespesasEstimadas * 100) / 100
}

/**
 * Retorno estimado DINÂMICO de uma oportunidade — usado enquanto não houver
 * receita de venda lançada (ou seja, nenhum lançamento na categoria Venda
 * com descrição "Venda" ou "Locação").
 *
 *   Retorno = Valor Estimado de Venda
 *           − Comissão de Venda (comissao_corretor_percent% × valor de venda)
 *           − Total de Despesas Estimadas
 *           − Saldo Devedor
 *
 * Observação: o "Total de Despesas Estimadas" (calcTotalDespesasEstimadas) já
 * inclui a comissão de corretagem na categoria "Venda" quando derivada dos
 * campos individuais, mas quando a oportunidade usa `custos_estimados_planilha`
 * o valor de Venda ali armazenado pode não incluir a corretagem. Por isso a
 * comissão é subtraída explicitamente aqui, garantindo consistência com a
 * fórmula definida no Dashboard.
 */
export function calcRetornoDinamico(
  op: {
    valor_venda_com_desconto?: number | string | null
    valor_mercado?: number | string | null
    valor_venda_real?: number | string | null
    comissao_corretor_percent?: number | string | null
    modalidade_financiamento?: 'À Vista' | 'SAC' | 'PRICE' | string
    valor_arrematacao?: number | string | null
    taxa_juros_financiamento?: number | string | null
    prazo_financiamento?: number | string | null
    parcelas_pagas?: number | string | null
    percentual_entrada?: number | string | null
    saldo_devedor?: number | string | null
    indice_correcao_medio_mensal?: number | string | null
    custos_estimados_planilha?: any
  },
  despesasReais?: number,
): number {
  const valorVenda = toNum(op.valor_venda_com_desconto) || toNum(op.valor_mercado)
  const comissaoPercent =
    op.comissao_corretor_percent != null && op.comissao_corretor_percent !== ''
      ? toNum(op.comissao_corretor_percent)
      : 6
  const comissaoVenda = (comissaoPercent / 100) * valorVenda
  const despesas = Math.max(despesasReais || 0, calcTotalDespesasEstimadas(op))
  const saldoDevedor = calcSaldoDevedorFinanciamento(op)

  const retorno = valorVenda - comissaoVenda - despesas - saldoDevedor
  return Math.round(retorno * 100) / 100
}

/**
 * Retorno REAL de uma oportunidade:
 *
 *   Retorno Real = valorVendaRealUsado − (despesas reais + comissão de venda + saldo devedor)
 *
 * Onde:
 * - valorVendaRealUsado = op.valor_venda_real > 0 ? op.valor_venda_real : valorEstimadoVenda
 * - despesas reais = soma de todos os lançamentos de despesa
 * - comissão de venda = comissao_corretor_percent% × valorVendaRealUsado
 * - saldo devedor = saldo devedor calculado
 *
 * Lançamentos de receita (Sinal, Saldo, parcelas, etc.) são apenas fluxo de caixa
 * e NÃO entram no cálculo do Retorno Real.
 */
export function calcRetornoReal(
  op: {
    valor_venda_real?: number | string | null
    valor_venda_com_desconto?: number | string | null
    valor_mercado?: number | string | null
    comissao_corretor_percent?: number | string | null
    modalidade_financiamento?: 'À Vista' | 'SAC' | 'PRICE' | string
    valor_arrematacao?: number | string | null
    taxa_juros_financiamento?: number | string | null
    prazo_financiamento?: number | string | null
    parcelas_pagas?: number | string | null
    percentual_entrada?: number | string | null
    saldo_devedor?: number | string | null
    indice_correcao_medio_mensal?: number | string | null
  },
  despesasReais: number = 0,
): number {
  const valorEstimadoVenda = toNum(op.valor_venda_com_desconto) || toNum(op.valor_mercado)
  const valorVendaRealCadastrado = toNum(op.valor_venda_real)
  const valorVendaRealUsado =
    valorVendaRealCadastrado > 0 ? valorVendaRealCadastrado : valorEstimadoVenda

  const comissaoPercent =
    op.comissao_corretor_percent != null && op.comissao_corretor_percent !== ''
      ? toNum(op.comissao_corretor_percent)
      : 6
  const comissaoVenda = (comissaoPercent / 100) * valorVendaRealUsado
  const saldoDevedor = calcSaldoDevedorFinanciamento(op)

  const retorno = valorVendaRealUsado - (toNum(despesasReais) + comissaoVenda + saldoDevedor)
  return Math.round(retorno * 100) / 100
}

/**
 * Despesas Totais Estimadas (divisor do ROI Estimado):
 *   Divisor = max(despesas reais, despesas estimadas)
 *
 * Observação: Comissão de venda e Saldo Devedor NÃO entram no divisor do ROI;
 * entram apenas no cálculo do Retorno (subtraindo da venda).
 */
export function calcInvestimentoTotalEstimado(
  op: {
    valor_venda_real?: number | string | null
    valor_venda_com_desconto?: number | string | null
    valor_mercado?: number | string | null
    comissao_corretor_percent?: number | string | null
    modalidade_financiamento?: 'À Vista' | 'SAC' | 'PRICE' | string
    valor_arrematacao?: number | string | null
    taxa_juros_financiamento?: number | string | null
    prazo_financiamento?: number | string | null
    parcelas_pagas?: number | string | null
    percentual_entrada?: number | string | null
    saldo_devedor?: number | string | null
    indice_correcao_medio_mensal?: number | string | null
    custos_estimados_planilha?: any
  },
  despesasReais: number = 0,
): number {
  const despesas = Math.max(despesasReais || 0, calcTotalDespesasEstimadas(op))
  return Math.round(despesas * 100) / 100
}

/**
 * Despesas Totais Reais (divisor do ROI Real):
 *   Divisor = despesas reais
 *
 * Observação: Comissão de venda e Saldo Devedor NÃO entram no divisor do ROI;
 * entram apenas no cálculo do Retorno (subtraindo da venda).
 */
export function calcInvestimentoTotalReal(
  _op?: {
    valor_venda_real?: number | string | null
    valor_venda_com_desconto?: number | string | null
    valor_mercado?: number | string | null
    comissao_corretor_percent?: number | string | null
    modalidade_financiamento?: 'À Vista' | 'SAC' | 'PRICE' | string
    valor_arrematacao?: number | string | null
    taxa_juros_financiamento?: number | string | null
    prazo_financiamento?: number | string | null
    parcelas_pagas?: number | string | null
    percentual_entrada?: number | string | null
    saldo_devedor?: number | string | null
    indice_correcao_medio_mensal?: number | string | null
  },
  despesasReais: number = 0,
): number {
  const despesas = toNum(despesasReais)
  return Math.round(despesas * 100) / 100
}

/**
 * ROI = (Retorno / Despesas) × 100
 * ROI no período = (Retorno / Despesas) × 100
 *
 * Se despesas <= 0 ou inválido, retorna null (exibido como "—").
 */
export function calcRoi(retorno: number, despesas: number): number | null {
  if (!despesas || despesas <= 0 || !Number.isFinite(despesas)) return null
  const roi = (retorno / despesas) * 100
  return Number.isFinite(roi) ? Math.round(roi * 100) / 100 : null
}

/**
 * ROI anual com projeção linear sobre o tempo estimado de venda:
 *   ROI Anual = ROI do período × (12 ÷ tempo_estimado_venda_meses)
 *
 * Retorna null (exibido como "—") se:
 * - roiPeriodoPercent for nulo, undefined ou inválido
 * - tempoEstimadoMeses for nulo, undefined, inválido ou <= 0
 */
export function calcRoiAnual(
  roiPeriodoPercent: number | null | undefined,
  tempoEstimadoMeses: number | null | undefined,
): number | null {
  const meses =
    typeof tempoEstimadoMeses === 'string'
      ? parseFloat(tempoEstimadoMeses)
      : Number(tempoEstimadoMeses)
  if (
    roiPeriodoPercent === null ||
    roiPeriodoPercent === undefined ||
    !Number.isFinite(roiPeriodoPercent) ||
    tempoEstimadoMeses === null ||
    tempoEstimadoMeses === undefined ||
    !Number.isFinite(meses) ||
    meses <= 0
  ) {
    return null
  }

  const roiAnual = roiPeriodoPercent * (12 / meses)
  return Number.isFinite(roiAnual) ? Math.round(roiAnual * 10) / 10 : null
}

export function calcTotalInvestido(
  _op: {
    valor_arrematacao?: number | null
    saldo_devedor?: number | null
    parcelas_pagas?: number | null
    valor_parcela_mensal?: number | null
  },
  despesas: number,
): number {
  return Math.round(despesas * 100) / 100
}
