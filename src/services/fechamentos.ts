import pb from '@/lib/pocketbase/client'
import { ExpenseCategory } from '@/lib/expense-categories'

export type FechamentoLancamentoTipo =
  | 'entrada'
  | 'parcela'
  | 'financiamento'
  | 'lance'
  | 'leiloeiro'
  | 'ITBI'
  | 'escritura'
  | 'registro'
  | 'contato ocupante'
  | 'desocupacao'
  | 'reforma'
  | 'venda'
  | 'outro'

export const FECHAMENTO_LANCAMENTO_TIPOS: {
  value: FechamentoLancamentoTipo
  label: string
  categoria: ExpenseCategory
}[] = [
  { value: 'lance', label: 'Lance de Arrematação', categoria: 'Aquisição' },
  { value: 'entrada', label: 'Entrada / Sinal', categoria: 'Aquisição' },
  { value: 'leiloeiro', label: 'Comissão do Leiloeiro', categoria: 'Aquisição' },
  { value: 'ITBI', label: 'ITBI', categoria: 'Encargos' },
  { value: 'escritura', label: 'Escritura', categoria: 'Encargos' },
  { value: 'registro', label: 'Registro / Averbação', categoria: 'Encargos' },
  { value: 'contato ocupante', label: 'Contato Ocupante / Negociação', categoria: 'Desocupação' },
  { value: 'desocupacao', label: 'Acordo / Desocupação', categoria: 'Desocupação' },
  { value: 'reforma', label: 'Reforma', categoria: 'Desocupação' },
  { value: 'parcela', label: 'Parcelas Pagas (Financiamento)', categoria: 'Mensais' },
  { value: 'financiamento', label: 'Custos Financiamento / Quitação', categoria: 'Mensais' },
  { value: 'venda', label: 'Custos de Venda / Corretagem', categoria: 'Venda' },
  { value: 'outro', label: 'Outras Despesas', categoria: 'Mensais' },
]

export interface Fechamento {
  id: string
  oportunidade: string
  data_venda: string
  valor_real_negociado: number
  desagio?: number
  custos_reais_categoria?: Record<ExpenseCategory, number>
  observacoes?: string
  created: string
  updated: string
  expand?: {
    oportunidade?: any
  }
}

export interface FechamentoLancamento {
  id: string
  fechamento: string
  oportunidade: string
  data: string
  descricao: string
  tipo: FechamentoLancamentoTipo
  valor: number
  created: string
  updated: string
}

export interface FechamentoPayload {
  oportunidade: string
  data_venda: string
  valor_real_negociado: number
  desagio?: number
  custos_reais_categoria?: Record<ExpenseCategory, number>
  observacoes?: string
}

export interface FechamentoLancamentoPayload {
  fechamento?: string
  oportunidade: string
  data: string
  descricao: string
  tipo: FechamentoLancamentoTipo
  valor: number
}

export async function getFechamentoByOportunidade(
  oportunidadeId: string,
): Promise<Fechamento | null> {
  try {
    const records = await pb.collection('fechamentos').getFullList<Fechamento>({
      filter: `oportunidade = '${oportunidadeId}'`,
      expand: 'oportunidade',
      requestKey: null,
    })
    return records.length > 0 ? records[0] : null
  } catch (err) {
    console.warn('Erro ao carregar fechamento:', err)
    return null
  }
}

export async function getFechamentoLancamentos(
  fechamentoId: string,
): Promise<FechamentoLancamento[]> {
  try {
    return await pb.collection('fechamento_lancamentos').getFullList<FechamentoLancamento>({
      filter: `fechamento = '${fechamentoId}'`,
      sort: 'data',
      requestKey: null,
    })
  } catch (err) {
    console.warn('Erro ao carregar lançamentos do fechamento:', err)
    return []
  }
}

export async function salvarFechamentoCompleto(
  fechamentoData: FechamentoPayload,
  lancamentos: FechamentoLancamentoPayload[],
  existingFechamentoId?: string,
): Promise<Fechamento> {
  let fechamento: Fechamento

  if (existingFechamentoId) {
    fechamento = await pb
      .collection('fechamentos')
      .update<Fechamento>(existingFechamentoId, fechamentoData)
  } else {
    // Verifica se já existe um fechamento antes de tentar criar
    const existente = await getFechamentoByOportunidade(fechamentoData.oportunidade)
    if (existente) {
      fechamento = await pb
        .collection('fechamentos')
        .update<Fechamento>(existente.id, fechamentoData)
    } else {
      fechamento = await pb.collection('fechamentos').create<Fechamento>(fechamentoData)
    }
  }

  // Atualiza status da oportunidade para 'Vendida' e valor_venda_real
  try {
    await pb.collection('oportunidades').update(fechamentoData.oportunidade, {
      status: 'Vendida',
      valor_venda_real: fechamentoData.valor_real_negociado,
    })
  } catch (err) {
    console.warn('Erro ao atualizar status da oportunidade:', err)
  }

  // Deleta os lançamentos anteriores do fechamento para recriar (idempotente)
  try {
    const antigos = await pb.collection('fechamento_lancamentos').getFullList({
      filter: `fechamento = '${fechamento.id}'`,
      fields: 'id',
      requestKey: null,
    })
    for (const ant of antigos) {
      await pb.collection('fechamento_lancamentos').delete(ant.id)
    }
  } catch (err) {
    console.warn('Erro ao limpar lançamentos antigos:', err)
  }

  // Cria os novos lançamentos vinculados
  for (const lanc of lancamentos) {
    await pb.collection('fechamento_lancamentos').create({
      ...lanc,
      fechamento: fechamento.id,
      oportunidade: fechamentoData.oportunidade,
    })
  }

  return fechamento
}
