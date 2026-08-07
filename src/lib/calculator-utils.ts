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
  ir_percent?: number
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

  const valorVendaComDesconto = valorMercado * (1 - desagio / 100)
  const comissaoLeiloeiro = valorArrematacao * (comissaoLeiloeiroPct / 100)
  const itbi = valorArrematacao * (itbiPct / 100)
  const comissaoCorretor = valorVendaComDesconto * (comissaoCorretorPct / 100)
  const custosCartorio = escritura + registro + averbacao
  const custosManutencao = condominioIptu * tempoMeses

  const capitalNecessario =
    valorArrematacao +
    comissaoLeiloeiro +
    itbi +
    custosCartorio +
    reforma +
    assessoria +
    custosManutencao

  const ganhoCapitalBase = valorVendaComDesconto - capitalNecessario - comissaoCorretor
  const irValor = Math.max(0, ganhoCapitalBase * (irPct / 100))
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
