export type IndiceBacenTipo = 'IPCA' | 'TR' | 'IGPM' | 'INPC' | 'Manual'

export const BACEN_SERIES: Record<Exclude<IndiceBacenTipo, 'Manual'>, number> = {
  IPCA: 433,
  IGPM: 189,
  INPC: 188,
  TR: 226,
}

export interface BacenSerieResponseItem {
  data: string // DD/MM/YYYY e.g. "01/06/2026"
  valor: string // e.g. "0.46" or "-1.16"
}

export interface BacenIndiceResultado {
  indice: Exclude<IndiceBacenTipo, 'Manual'>
  valor: number
  dataRaw: string
  dataFormatada: string // e.g. "jun/2026"
  textoExibicao: string // e.g. "IPCA — 0,46% em jun/2026"
}

const MESES_ABREV = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
]

/**
 * Formata data "01/06/2026" para "jun/2026"
 */
export function formatBacenDataMesAno(dataStr: string): string {
  if (!dataStr) return ''
  const parts = dataStr.split('/')
  if (parts.length === 3) {
    const mesIndex = parseInt(parts[1], 10) - 1
    const ano = parts[2]
    if (mesIndex >= 0 && mesIndex < 12) {
      return `${MESES_ABREV[mesIndex]}/${ano}`
    }
  }
  return dataStr
}

/**
 * Busca o último valor do índice na API do Banco Central (SGS).
 * Endpoint: https://api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados/ultimos/1?formato=json
 */
export async function fetchUltimoIndiceBacen(
  indice: Exclude<IndiceBacenTipo, 'Manual'>,
): Promise<BacenIndiceResultado> {
  const codigo = BACEN_SERIES[indice]
  if (!codigo) {
    throw new Error(`Código SGS não encontrado para o índice ${indice}`)
  }

  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${codigo}/dados/ultimos/1?formato=json`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Erro na API do Banco Central (${response.status} ${response.statusText})`)
  }

  const data: BacenSerieResponseItem[] = await response.json()
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`Nenhum dado retornado para o índice ${indice}`)
  }

  const item = data[0]
  const valorNumerico = parseFloat(item.valor)
  const dataFormatada = formatBacenDataMesAno(item.data)

  // Formatação em pt-BR do percentual: ex 0,46%
  const valorFormatado = isNaN(valorNumerico)
    ? item.valor
    : valorNumerico.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      })

  const textoExibicao = `${indice} — ${valorFormatado}% em ${dataFormatada}`

  return {
    indice,
    valor: isNaN(valorNumerico) ? 0 : valorNumerico,
    dataRaw: item.data,
    dataFormatada,
    textoExibicao,
  }
}
