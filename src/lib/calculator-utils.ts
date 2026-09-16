import {
  calculateInstallment,
  calculateSaldoDevedor,
  type FinancingParams,
} from './financing-utils'
import { getEstimatedCostsByCategory } from './expense-categories'
import { primeiraLetraNome, sociosCobertosPorMarca } from './participantes-utils'
import { toIdArray, type Oportunidade, type UserRef } from '@/services/oportunidades'

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
  roi_alvo?: number
  modalidade_financiamento?: 'À Vista' | 'SAC' | 'PRICE' | string
  taxa_juros_financiamento?: number
  prazo_financiamento?: number
  parcelas_pagas?: number
  percentual_entrada?: number
  indice_correcao_medio_mensal?: number
  saldo_devedor?: number
}

export interface LanceTetoResult {
  lanceTeto: number | null
  atingivel: boolean
  motivo?: string
  lucroEsperadoNoTeto?: number
  capitalNecessarioNoTeto?: number
  roiObtidoNoTeto?: number
}

/**
 * Calcula o Lance Teto através da CONTA INVERSA:
 * Dado o ROI-alvo mínimo aceitável informado pelo usuário (%), calcula o maior
 * lance de arrematação possível em que:
 *   Lucro Esperado ÷ Capital Necessário ≥ ROI-alvo
 * considerando TODOS os custos estimados:
 *   - Leiloeiro (% do lance)
 *   - Entrada (% do lance se financiado, ou 100% se à vista)
 *   - Prestações durante o período de venda (se financiado)
 *   - ITBI (com base em valor venal ou arrematação)
 *   - Escritura, registro, averbação
 *   - Reforma, assessoria jurídica, desocupação, taxas judiciais, foro, baixa gravames, taxa avaliação
 *   - Condomínio + IPTU mensal × meses + dívidas de condomínio/IPTU
 *   - Comissão de venda (corretor) sobre o valor de venda
 *   - Saldo devedor do financiamento remanescente na quitação da venda
 *
 * Se não houver lance positivo (>= 0) que atinja o ROI-alvo, retorna lanceTeto: null e atingivel: false.
 */
export function calcLanceTetoInverso(inputs: CalculatorInputs): LanceTetoResult {
  const roiAlvo = inputs.roi_alvo != null ? Number(inputs.roi_alvo) : null
  if (roiAlvo === null || isNaN(roiAlvo) || roiAlvo <= 0) {
    return {
      lanceTeto: null,
      atingivel: false,
      motivo: 'Informe um ROI-alvo (%) positivo para calcular o Lance Teto.',
    }
  }

  const valorMercado = Number(inputs.valor_mercado) || 0
  const desagio = Number(inputs.desagio_venda) || 0
  const valorVendaComDesconto = valorMercado * (1 - desagio / 100)

  if (valorVendaComDesconto <= 0) {
    return {
      lanceTeto: null,
      atingivel: false,
      motivo: 'Valor estimado de venda inválido.',
    }
  }

  // Função interna que avalia se uma dada arrematação atinge o ROI-alvo
  // e retorna { lucro, capital, roi }
  const avaliarArrematacao = (arrematacaoTentativa: number) => {
    const comissaoLeiloeiroPct = Number(inputs.comissao_leiloeiro_percent) || 5
    const itbiPct = Number(inputs.itbi_percent) || 3
    const comissaoCorretorPct = Number(inputs.comissao_corretor_percent) || 6
    const tempoMeses = Number(inputs.tempo_estimado_venda_meses) || 10
    const irPct = Number(inputs.ir_percent) || 15
    const incluirIR = inputs.incluir_ir_despesas !== false

    const modalidade = inputs.modalidade_financiamento || 'PRICE'
    const isFinanciado =
      modalidade !== 'À Vista' &&
      (Number(inputs.prazo_financiamento) > 0 || Number(inputs.saldo_devedor) > 0)

    const percentualEntrada =
      inputs.percentual_entrada == null || Number(inputs.percentual_entrada) === 0
        ? isFinanciado
          ? 10
          : 0
        : Number(inputs.percentual_entrada)

    const sinal = isFinanciado
      ? (percentualEntrada / 100) * arrematacaoTentativa
      : percentualEntrada > 0
        ? (percentualEntrada / 100) * arrematacaoTentativa
        : arrematacaoTentativa

    const leiloeiro = arrematacaoTentativa * (comissaoLeiloeiroPct / 100)
    const aquisicao = sinal + leiloeiro

    const valorVenal = Number(inputs.valor_prefeitura_venal) || 0
    const valorBaseITBI = valorVenal > 0 ? valorVenal : arrematacaoTentativa
    const itbi = valorBaseITBI * (itbiPct / 100)
    const escritura = Number(inputs.escritura) || 0
    const registro = Number(inputs.registro) || 0
    const averbacao = Number(inputs.averbacao) || 0
    const encargos = itbi + escritura + registro + averbacao

    const reforma = Number(inputs.reforma_prevista) || 0
    const assessoria = Number(inputs.assessoria_juridica) || 0
    const acordoDesocupacao = Number(inputs.acordo_desocupacao) || 0
    const taxasJudiciais = Number(inputs.taxas_judiciais) || 0
    const taxaAvaliacao = Number(inputs.taxa_avaliacao) || 0
    const baixaGravames = Number(inputs.baixa_gravames) || 0
    const foro = Number(inputs.foro) || 0
    const desocupacao =
      reforma +
      assessoria +
      acordoDesocupacao +
      taxasJudiciais +
      taxaAvaliacao +
      baixaGravames +
      foro

    const condominioIptu = Number(inputs.condominio_iptu_mensal) || 0
    const dividasCondominio = Number(inputs.dividas_condominio) || 0
    const dividasIptu = Number(inputs.dividas_iptu) || 0

    let prestacoesPagas = 0
    let saldoDevedor = 0

    if (isFinanciado) {
      const annualRate = Number(inputs.taxa_juros_financiamento) || 11.49
      const prazoFinanciamento = Number(inputs.prazo_financiamento) || 120
      const parcelasPagasCount = Number(inputs.parcelas_pagas) || 0
      const correcaoMensal = Number(inputs.indice_correcao_medio_mensal) || 0

      const financingParams: FinancingParams = {
        principal: arrematacaoTentativa,
        annualRate,
        termMonths: prazoFinanciamento,
        paymentsMade: parcelasPagasCount,
        method: modalidade === 'SAC' ? 'SAC' : 'PRICE',
        entryPercent: percentualEntrada,
        correcaoMensal,
      }

      const valorParcelaCalc = calculateInstallment(financingParams)
      prestacoesPagas = valorParcelaCalc * tempoMeses
      saldoDevedor = calculateSaldoDevedor(financingParams)
    }

    const mensais = prestacoesPagas + condominioIptu * tempoMeses + dividasCondominio + dividasIptu

    const comissaoCorretor = valorVendaComDesconto * (comissaoCorretorPct / 100)

    // Capital Necessário estimado das categorias = Aquisição + Encargos + Desocupação + Mensais
    const capitalNecessario = aquisicao + encargos + desocupacao + mensais

    // Ganho de Capital / Lucro = Valor Venda - Comissão Corretor - Despesas - Saldo Devedor
    const ganhoCapitalBase =
      valorVendaComDesconto - comissaoCorretor - capitalNecessario - saldoDevedor

    const irValor = incluirIR ? Math.max(0, ganhoCapitalBase * (irPct / 100)) : 0
    const maiorLucroEsperado = ganhoCapitalBase - irValor

    const roiObtido = capitalNecessario > 0 ? (maiorLucroEsperado / capitalNecessario) * 100 : -100

    return {
      capitalNecessario,
      saldoDevedor,
      maiorLucroEsperado,
      roiObtido,
    }
  }

  // Busca binária para encontrar a maior arrematação (>= 0) em que roiObtido >= roiAlvo
  // Intervalo inicial de arrematação: [0, valorVendaComDesconto * 2]
  let low = 0
  let high = Math.max(valorVendaComDesconto * 1.5, 1000000)

  // Testa se mesmo com lance 0 o ROI-alvo é inatingível
  const avaliacaoZero = avaliarArrematacao(0)
  if (avaliacaoZero.roiObtido < roiAlvo) {
    return {
      lanceTeto: null,
      atingivel: false,
      motivo: 'Não há lance que alcance o ROI-alvo com os parâmetros atuais.',
      roiObtidoNoTeto: avaliacaoZero.roiObtido,
    }
  }

  // Busca binária de precisão centesimal (100 iterações garantem < 0.01 centavo de erro)
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2
    const res = avaliarArrematacao(mid)
    if (res.roiObtido >= roiAlvo) {
      // mid ainda atinge o ROI-alvo, podemos tentar lance maior
      low = mid
    } else {
      // mid ficou abaixo do ROI-alvo, lance máximo deve ser menor
      high = mid
    }
  }

  const lanceFinal = Math.floor(low * 100) / 100
  if (lanceFinal <= 0) {
    return {
      lanceTeto: null,
      atingivel: false,
      motivo: 'Não há lance que alcance o ROI-alvo com os parâmetros atuais.',
    }
  }

  const metricasFinais = avaliarArrematacao(lanceFinal)

  return {
    lanceTeto: lanceFinal,
    atingivel: true,
    lucroEsperadoNoTeto: Math.round(metricasFinais.maiorLucroEsperado * 100) / 100,
    capitalNecessarioNoTeto: Math.round(metricasFinais.capitalNecessario * 100) / 100,
    roiObtidoNoTeto: Math.round(metricasFinais.roiObtido * 100) / 100,
  }
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

  // Cálculo do Lance Teto inverso (substituindo percentual fixo de 65%)
  const resultadoInverso = calcLanceTetoInverso(inputs)
  const lanceTeto =
    resultadoInverso.atingivel && resultadoInverso.lanceTeto !== null
      ? resultadoInverso.lanceTeto
      : null

  return {
    capital_necessario: Math.round(capitalNecessario * 100) / 100,
    ganho_capital_base: Math.round(ganhoCapitalBase * 100) / 100,
    ir_valor: Math.round(irValor * 100) / 100,
    valor_venda_com_desconto: Math.round(valorVendaComDesconto * 100) / 100,
    maior_lucro_esperado: Math.round(maiorLucroEsperado * 100) / 100,
    retorno_estimado: Math.round(retornoEstimado * 100) / 100,
    roi_esperado_periodo: Math.round(roiEsperadoPeriodo * 100) / 100,
    roi_esperado_anualizado: Math.round(roiEsperadoAnualizado * 100) / 100,
    lance_teto: lanceTeto !== null ? Math.round(lanceTeto * 100) / 100 : null,
    lance_teto_atingivel: resultadoInverso.atingivel,
    lance_teto_motivo: resultadoInverso.motivo,
  }
}

export const toNum = (v: unknown): number => {
  if (v == null) return 0
  const n = typeof v === 'string' ? parseFloat(v) : Number(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * Total das despesas estimadas de uma oportunidade (soma de todas as
 * categorias: Aquisição + Encargos + Desocupação + Mensais + Venda).
 *
 * A categoria "Venda" aqui contém apenas DESPESAS (Corretagem, Lucro
 * Imobiliário e Saldo Devedor); os itens de receita da categoria Venda
 * (Venda, Locação) não entram — ver getEstimatedCostsByCategory.
 */
export function calcTotalDespesasEstimadas(op: unknown): number {
  const estimated = getEstimatedCostsByCategory(op as any)
  const { Aquisição = 0, Encargos = 0, Desocupação = 0, Mensais = 0 } = estimated
  const total = Aquisição + Encargos + Desocupação + Mensais
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
  _despesasReais?: number,
): number {
  const valorVenda = toNum(op.valor_venda_com_desconto) || toNum(op.valor_mercado)
  const comissaoPercent =
    op.comissao_corretor_percent != null && op.comissao_corretor_percent !== ''
      ? toNum(op.comissao_corretor_percent)
      : 6
  const comissaoVenda = (comissaoPercent / 100) * valorVenda
  const despesas = calcTotalDespesasEstimadas(op)
  const saldoDevedor = calcSaldoDevedorFinanciamento(op)

  const retorno = valorVenda - comissaoVenda - despesas - saldoDevedor
  return Math.round(retorno * 100) / 100
}

/**
 * Retorno REAL de uma oportunidade:
 *
 *   Retorno Real = valorVendaRealUsado + receitasAluguel − (despesas reais + comissão de venda + saldo devedor)
 *
 * Onde:
 * - valorVendaRealUsado = op.valor_venda_real > 0 ? op.valor_venda_real : valorEstimadoVenda
 * - receitasAluguel = soma das receitas de aluguel/locação lançadas na oportunidade
 * - despesas reais = soma de todos os lançamentos de despesa
 * - comissão de venda = comissão real lançada (quando houver despesa de comissão/corretagem/venda)
 *   ou comissao_corretor_percent% (default 6%) × valorVendaRealUsado quando não houver lançamento
 * - saldo devedor = saldo devedor calculado
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
  receitasAluguel: number = 0,
  comissaoRealLancada?: number | null,
  saldoDevedorRealLancado?: number | null | boolean,
): number {
  const valorEstimadoVenda = toNum(op.valor_venda_com_desconto) || toNum(op.valor_mercado)
  const valorVendaRealCadastrado = toNum(op.valor_venda_real)
  const valorVendaRealUsado =
    valorVendaRealCadastrado > 0 ? valorVendaRealCadastrado : valorEstimadoVenda

  // Regra de comissão: se houver comissão real lançada, prevalece e o percentual é descartado;
  // caso contrário usa o percentual (default 6%) sobre o valor de venda real usado.
  let comissaoVenda: number
  if (comissaoRealLancada != null && toNum(comissaoRealLancada) > 0) {
    comissaoVenda = toNum(comissaoRealLancada)
  } else {
    const comissaoPercent =
      op.comissao_corretor_percent != null && op.comissao_corretor_percent !== ''
        ? toNum(op.comissao_corretor_percent)
        : 6
    comissaoVenda = (comissaoPercent / 100) * valorVendaRealUsado
  }

  // Regra de saldo devedor: se houver saldo devedor real lançado nas despesas reais,
  // ele já está computado dentro de despesasReais; portanto, o saldo devedor adicional é ZERO
  // para não descontar em dobro. Se não houver lançamento, desconta o saldo devedor estimado.
  const temSaldoDevedorLancado =
    typeof saldoDevedorRealLancado === 'boolean'
      ? saldoDevedorRealLancado
      : saldoDevedorRealLancado != null && toNum(saldoDevedorRealLancado) > 0

  const saldoDevedor = temSaldoDevedorLancado ? 0 : calcSaldoDevedorFinanciamento(op)

  const retorno =
    valorVendaRealUsado +
    toNum(receitasAluguel) -
    (toNum(despesasReais) + comissaoVenda + saldoDevedor)
  return Math.round(retorno * 100) / 100
}

/**
 * Despesas Totais Estimadas (divisor do ROI Estimado):
 *   Divisor = despesas estimadas (sem max com despesas reais)
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
  _despesasReais: number = 0,
): number {
  const despesas = calcTotalDespesasEstimadas(op)
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

/**
 * Extrai a lista de sócios participantes de uma oportunidade (excluindo admin e observadores).
 * Observadores nunca entram como sócios participantes.
 */
export function getSociosParticipantesOp(
  op: Oportunidade,
  usuariosCache?: Map<string, { id: string; name?: string; email?: string; admin?: boolean }>,
): UserRef[] {
  const knownUsers = new Map<
    string,
    { id: string; name?: string; email?: string; admin?: boolean }
  >()

  if (op.expand?.usuario?.id) {
    knownUsers.set(op.expand.usuario.id, {
      id: op.expand.usuario.id,
      name: op.expand.usuario.name,
      email: op.expand.usuario.email,
      admin: (op.expand.usuario as any).admin,
    })
  }
  if (Array.isArray(op.expand?.participantes)) {
    op.expand.participantes.forEach((p) => {
      if (p?.id) {
        knownUsers.set(p.id, {
          id: p.id,
          name: p.name,
          email: p.email,
          admin: (p as any).admin,
        })
      }
    })
  }

  const allUserIds = new Set<string>()
  if (op.usuario) allUserIds.add(op.usuario)
  toIdArray(op.participantes).forEach((id) => allUserIds.add(id))

  return Array.from(allUserIds)
    .map((id) => {
      const fromExpand = knownUsers.get(id)
      const fromCache = usuariosCache?.get(id)
      const name = fromExpand?.name || fromCache?.name
      const email = fromExpand?.email || fromCache?.email
      const isAdmin = fromExpand?.admin || fromCache?.admin
      return { id, name, email, admin: isAdmin }
    })
    .filter((u) => !u.admin && u.name !== 'Doulhe3')
}

export interface SocioDespesaRateio {
  id: string
  nome: string
  letra: string
  valor: number
}

/**
 * Calcula o rateio de despesas de uma oportunidade entre seus sócios participantes.
 *
 * Regras:
 * - Letra individual (ex: E, C) = 100% do valor da despesa para aquele sócio.
 * - "A" (Ambos) = 50% do valor com 2 sócios (ou valor / cobertos).
 * - "T" (Todos) = valor ÷ número de participantes.
 */
export function calcRateioDespesasPorSocioOp(
  op: Oportunidade,
  lancamentosOp: { tipo: string; valor: number; quem_pagou?: string }[],
  sociosParticipantes?: UserRef[],
): Record<string, SocioDespesaRateio> {
  const socios = sociosParticipantes || getSociosParticipantesOp(op)
  const totalSocios = socios.length

  const acc: Record<string, SocioDespesaRateio> = {}
  socios.forEach((p) => {
    acc[p.id] = {
      id: p.id,
      nome: p.name || p.email || 'Sócio',
      letra: primeiraLetraNome(p.name || p.email || '?'),
      valor: 0,
    }
  })

  const despesas = (lancamentosOp || []).filter((l) => l.tipo === 'Despesa')
  despesas.forEach((l) => {
    const valor = toNum(l.valor)
    if (valor <= 0) return

    const cobertos = sociosCobertosPorMarca(l.quem_pagou, totalSocios)
    if (cobertos <= 0 || totalSocios === 0) return

    const parte = valor / cobertos

    if (l.quem_pagou === 'A' || l.quem_pagou === 'T') {
      socios.forEach((p) => {
        if (acc[p.id]) {
          acc[p.id].valor += parte
        }
      })
    } else if (l.quem_pagou) {
      const alvo = socios.find((p) => primeiraLetraNome(p.name || p.email || '?') === l.quem_pagou)
      if (alvo && acc[alvo.id]) {
        acc[alvo.id].valor += valor
      }
    }
  })

  Object.keys(acc).forEach((k) => {
    acc[k].valor = Math.round(acc[k].valor * 100) / 100
  })

  return acc
}

export interface SocioLucroRateioResult {
  oportunidadeId: string
  valorVendaReal: number
  despesasReaisTotais: number
  comissaoVenda: number
  saldoDevedor: number
  lucroDoNegocio: number
  participantesCount: number
  participantes: {
    id: string
    nome: string
    letra: string
    despesasPagas: number
    percentualDespesas: number
    parteLucro: number
  }[]
}

/**
 * Calcula o lucro do negócio e o rateio de lucro por sócio para uma oportunidade com venda real.
 *
 * Gatilho: valor_venda_real > 0.
 *
 * Fórmulas:
 *  - Lucro do negócio = Venda Real − (Despesas Reais totais + Comissão de Venda + Saldo Devedor)
 *  - Comissão de venda = (comissao_corretor_percent || 6)% × Venda Real
 *  - Parte do sócio:
 *      * 1 participante: 100%
 *      * 2 participantes:
 *          - Se houver despesas totais > 0: proporcional (Lucro × (Despesas pagas / Despesas totais)),
 *            que com divisões 50/50 resulta em 50% cada.
 *          - Se despesas totais = 0: 50% cada (Lucro / 2).
 *      * 3+ participantes:
 *          - Se houver despesas totais > 0: proporcional (Lucro × (Despesas pagas / Despesas totais)).
 *          - Se despesas totais = 0: divisão igualitária (Lucro ÷ N).
 */
export function calcRateioLucroPorSocioOp(
  op: Oportunidade,
  lancamentosOp: { tipo: string; valor: number; quem_pagou?: string }[],
  sociosParticipantes?: UserRef[],
): SocioLucroRateioResult | null {
  const valorVendaReal = toNum(op.valor_venda_real)
  if (valorVendaReal <= 0) return null

  const socios = sociosParticipantes || getSociosParticipantesOp(op)
  const numParticipantes = socios.length
  if (numParticipantes === 0) return null

  // Despesas reais totais da oportunidade
  const despesasReaisTotais = (lancamentosOp || [])
    .filter((l) => l.tipo === 'Despesa')
    .reduce((sum, l) => sum + toNum(l.valor), 0)

  // Alíquota de comissão de venda
  const aliquotaComissao =
    op.comissao_corretor_percent != null && (op.comissao_corretor_percent as unknown) !== ''
      ? toNum(op.comissao_corretor_percent)
      : 6
  const comissaoVenda = valorVendaReal * (aliquotaComissao / 100)

  // Detecção de saldo devedor real lançado nas despesas
  const temSaldoDevedorLancado = (lancamentosOp || []).some(
    (l: any) =>
      l.tipo === 'Despesa' &&
      ((l.categoria === 'Venda' && (l.descricao || '').toLowerCase().includes('saldo devedor')) ||
        (l.descricao || '').toLowerCase().includes('saldo devedor')),
  )

  // Saldo devedor: se já lançado como despesa real, não desconta novamente
  const saldoDevedor = temSaldoDevedorLancado ? 0 : calcSaldoDevedorFinanciamento(op)

  // Lucro do negócio = Venda Real − (Despesas Reais totais + Comissão de Venda + Saldo Devedor)
  const lucroDoNegocio =
    Math.round((valorVendaReal - (despesasReaisTotais + comissaoVenda + saldoDevedor)) * 100) / 100

  // Rateio das despesas pagas por sócio
  const rateioDespesas = calcRateioDespesasPorSocioOp(op, lancamentosOp, socios)

  const participantesCalculados = socios.map((p) => {
    const despesasPagas = rateioDespesas[p.id]?.valor || 0
    let parteLucro = 0
    let percentualDespesas = 0

    if (numParticipantes === 1) {
      percentualDespesas = 1
      parteLucro = lucroDoNegocio
    } else if (despesasReaisTotais > 0) {
      percentualDespesas = despesasPagas / despesasReaisTotais
      parteLucro = lucroDoNegocio * percentualDespesas
    } else {
      percentualDespesas = 1 / numParticipantes
      parteLucro = lucroDoNegocio / numParticipantes
    }

    return {
      id: p.id,
      nome: p.name || p.email || 'Sócio',
      letra: primeiraLetraNome(p.name || p.email || '?'),
      despesasPagas: Math.round(despesasPagas * 100) / 100,
      percentualDespesas: Math.round(percentualDespesas * 10000) / 100,
      parteLucro: Math.round(parteLucro * 100) / 100,
    }
  })

  return {
    oportunidadeId: op.id,
    valorVendaReal: Math.round(valorVendaReal * 100) / 100,
    despesasReaisTotais: Math.round(despesasReaisTotais * 100) / 100,
    comissaoVenda: Math.round(comissaoVenda * 100) / 100,
    saldoDevedor: Math.round(saldoDevedor * 100) / 100,
    lucroDoNegocio,
    participantesCount: numParticipantes,
    participantes: participantesCalculados,
  }
}
