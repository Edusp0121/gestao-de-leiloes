export interface CalculatorInputs {
  valor_mercado?: number
  valor_arrematacao?: number
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
  ir_percent?: number
}

export function calculateMetrics(inputs: CalculatorInputs) {
  const vMercado = inputs.valor_mercado || 0
  const vArrematacao = inputs.valor_arrematacao || 0
  const desagio = inputs.desagio_venda || 0
  const tempoMeses = inputs.tempo_estimado_venda_meses || 10
  const irPct = inputs.ir_percent || 15

  const valorVendaComDesconto = vMercado * (1 - desagio / 100)

  const itbi = vArrematacao * ((inputs.itbi_percent || 3) / 100)
  const comissaoLeiloeiro = vArrematacao * ((inputs.comissao_leiloeiro_percent || 5) / 100)
  const comissaoCorretor = valorVendaComDesconto * ((inputs.comissao_corretor_percent || 6) / 100)
  const custosCartorio = (inputs.escritura || 0) + (inputs.registro || 0) + (inputs.averbacao || 0)
  const reforma = inputs.reforma_prevista || 0
  const juridico = inputs.assessoria_juridica || 0
  const condominioIptuTotal = (inputs.condominio_iptu_mensal || 0) * tempoMeses

  const custoTotalInvestido =
    vArrematacao +
    itbi +
    comissaoLeiloeiro +
    custosCartorio +
    reforma +
    juridico +
    condominioIptuTotal
  const valorVendaLiquido = valorVendaComDesconto - comissaoCorretor

  const ganhoCapitalBase = Math.max(0, valorVendaLiquido - custoTotalInvestido)
  const irEstimado = ganhoCapitalBase * (irPct / 100)
  const maiorLucroEsperado = Math.max(0, ganhoCapitalBase - irEstimado)

  const roiPeriodo = custoTotalInvestido > 0 ? (maiorLucroEsperado / custoTotalInvestido) * 100 : 0
  const roiAnualizado = tempoMeses > 0 ? roiPeriodo * (12 / tempoMeses) : roiPeriodo
  const lanceTeto = vMercado * 0.65

  return {
    valor_venda_com_desconto: valorVendaComDesconto,
    ganho_capital_base: ganhoCapitalBase,
    ir_valor: irEstimado,
    maior_lucro_esperado: maiorLucroEsperado,
    retorno_estimado: maiorLucroEsperado,
    roi_esperado_periodo: Number(roiPeriodo.toFixed(2)),
    roi_esperado_anualizado: Number(roiAnualizado.toFixed(2)),
    lance_teto: lanceTeto,
    capital_necessario: custoTotalInvestido,
  }
}
