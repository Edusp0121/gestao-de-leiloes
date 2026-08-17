// Tabela de faixas de Escritura Pública (Exemplo oficial / Tabela do estado de São Paulo e faixas progressivas)
// Faixas: [limiteAté, valorFixo]
// Faixa 1: 0.01 a 1.746,00 -> 197.15
// Faixa final: acima de 107.633.000,00 -> 177.279,48
const ESCRITURA_TABLE: Array<[number, number]> = [
  [1746.0, 197.15],
  [3492.0, 311.95],
  [8730.0, 520.15],
  [17460.0, 831.35],
  [34920.0, 1246.55],
  [87300.0, 1870.25],
  [174600.0, 2494.05],
  [349200.0, 3325.25],
  [523800.0, 4156.45],
  [698400.0, 4987.65],
  [873000.0, 5818.85],
  [1047600.0, 6650.05],
  [1746000.0, 8312.45],
  [3492000.0, 12468.25],
  [5238000.0, 16624.05],
  [8730000.0, 24935.65],
  [17460000.0, 41558.85],
  [34920000.0, 74805.25],
  [52380000.0, 108051.65],
  [87300000.0, 153713.55],
  [107633000.0, 177279.48],
]

/**
 * Calcula o valor da Escritura com base no maior valor entre Arrematação e Venal.
 */
export function calculateEscritura(valorArrematacao: number, valorVenal: number): number {
  const base = Math.max(valorArrematacao || 0, valorVenal || 0)
  if (base <= 0) return 0

  for (const [limit, fee] of ESCRITURA_TABLE) {
    if (base <= limit) {
      return fee
    }
  }

  // Acima de 107.633.000,00
  return 177279.48
}

// Tabela de porcentagens para Registro e Averbação por Estado
// Estrutura por UF: { regLow, regHigh, aveLow, aveHigh }
// regLow / aveLow: para base < 350k (corresponde à coluna 200k)
// regHigh / aveHigh: para base >= 350k (corresponde à coluna 500k)
interface StateCartorioRates {
  regLow: number
  regHigh: number
  aveLow: number
  aveHigh: number
}

const REGISTRO_AVERBACAO_RATES: Record<string, StateCartorioRates> = {
  AM: { regLow: 0.014, regHigh: 0.0182, aveLow: 0.014, aveHigh: 0.0144 },
  BA: { regLow: 0.0094, regHigh: 0.0085, aveLow: 0.0058, aveHigh: 0.0085 },
  ES: { regLow: 0.0269, regHigh: 0.0119, aveLow: 0.0222, aveHigh: 0.0119 },
  MG: { regLow: 0.0222, regHigh: 0.0115, aveLow: 0.0209, aveHigh: 0.0105 },
  MS: { regLow: 0.0177, regHigh: 0.0109, aveLow: 0.0159, aveHigh: 0.0103 },
  PA: { regLow: 0.0127, regHigh: 0.0104, aveLow: 0.0, aveHigh: 0.0 },
  PR: { regLow: 0.0085, regHigh: 0.004, aveLow: 0.0049, aveHigh: 0.0026 },
  RJ: { regLow: 0.0202, regHigh: 0.0087, aveLow: 0.0202, aveHigh: 0.0087 },
  RS: { regLow: 0.0059, regHigh: 0.0054, aveLow: 0.0049, aveHigh: 0.0042 },
  SP: { regLow: 0.0121, regHigh: 0.0068, aveLow: 0.01, aveHigh: 0.0068 },
}

const OUTROS_RATES: StateCartorioRates = {
  regLow: 0.0269,
  regHigh: 0.0182,
  aveLow: 0.0209,
  aveHigh: 0.0144,
}

export function getCartorioRates(uf: string): StateCartorioRates {
  const key = (uf || '').toUpperCase().trim()
  return REGISTRO_AVERBACAO_RATES[key] || OUTROS_RATES
}

/**
 * Calcula Registro e Averbação com base na UF e na base de cálculo (maior entre arrematação e venal).
 */
export function calculateRegistroEAverbacao(
  uf: string,
  valorArrematacao: number,
  valorVenal: number,
): { registro: number; averbacao: number } {
  const base = Math.max(valorArrematacao || 0, valorVenal || 0)
  if (base <= 0) return { registro: 0, averbacao: 0 }

  const rates = getCartorioRates(uf)
  const isLowTier = base < 350000

  const regRate = isLowTier ? rates.regLow : rates.regHigh
  const aveRate = isLowTier ? rates.aveLow : rates.aveHigh

  const registro = Math.round(base * regRate * 100) / 100
  const averbacao = Math.round(base * aveRate * 100) / 100

  return { registro, averbacao }
}
