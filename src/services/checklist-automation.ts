import pb from '@/lib/pocketbase/client'
import { Checklist, ChecklistDates } from '@/services/checklists'
import { Lancamento } from '@/services/lancamentos'

export interface LancamentoLike {
  id?: string
  oportunidade: string
  tipo?: 'Despesa' | 'Receita' | string
  descricao: string
  categoria?: string
  data?: string
}

/**
 * Normaliza e determina qual campo do checklist é afetado por um lançamento.
 * Retorna null se não houver mapeamento correspondente.
 */
export function getChecklistTargetField(
  lancamento: LancamentoLike,
): { field: keyof ChecklistDates; isAlwaysLatest?: boolean } | null {
  const tipo = (lancamento.tipo || 'Despesa').toLowerCase()
  const cat = (lancamento.categoria || '').toLowerCase().trim()
  const desc = (lancamento.descricao || '').toLowerCase().trim()

  // Receita
  if (tipo === 'receita' || (cat === 'venda' && tipo === 'receita')) {
    if (desc.includes('sinal')) {
      return { field: 'data_recebimento_sinal' }
    }
    if (desc.includes('saldo')) {
      return { field: 'data_recebimento_saldo' }
    }
  }

  // Despesa - Aquisição
  if (cat.includes('aquisi') || cat.includes('aquisicao') || cat === '') {
    if (desc.includes('sinal')) {
      return { field: 'data_pagamento_lance' }
    }
    if (desc.includes('leiloeiro')) {
      return { field: 'data_pagamento_leiloeiro' }
    }
  }

  // Despesa - Tributos
  if (cat.includes('tributo')) {
    if (desc.includes('itbi')) {
      return { field: 'data_pagamento_itbi' }
    }
    if (desc.includes('escritura')) {
      return { field: 'data_pagamento_escritura' }
    }
    if (
      desc.includes('registro') ||
      desc.includes('averbação') ||
      desc.includes('averbacao') ||
      desc.includes('averbação af') ||
      desc.includes('averbacao af')
    ) {
      return { field: 'data_pagamento_registro_averbacao' }
    }
  }

  // Despesa - Desocupação (Reforma)
  if (cat.includes('reforma') || cat.includes('desocupa') || desc.includes('reforma')) {
    if (desc.includes('reforma')) {
      // Para inserção individual, se data_inicio_reforma estiver vazio preenche ele,
      // e data_termino_reforma sempre atualiza com o último lançamento.
      // Retornamos um marcador especial ou tratamos no fluxo.
      return { field: 'data_inicio_reforma', isAlwaysLatest: false }
    }
  }

  // Despesa - Mensais
  if (cat.includes('mensa')) {
    if (desc.includes('condomínio') || desc.includes('condominio')) {
      return { field: 'data_inicio_pagamento_condominio' }
    }
    if (desc.includes('iptu')) {
      return { field: 'data_inicio_pagamento_iptu' }
    }
    if (
      desc.includes('prestação') ||
      desc.includes('prestacao') ||
      desc.includes('financiamento')
    ) {
      return { field: 'data_pagamento_financiamento' }
    }
  }

  // Fallback por descrição pura caso a categoria não tenha batido exatamente
  if (desc.includes('itbi')) {
    return { field: 'data_pagamento_itbi' }
  }
  if (desc.includes('escritura')) {
    return { field: 'data_pagamento_escritura' }
  }
  if (desc.includes('registro') || desc.includes('averbação') || desc.includes('averbacao')) {
    return { field: 'data_pagamento_registro_averbacao' }
  }
  if (desc.includes('condomínio') || desc.includes('condominio')) {
    return { field: 'data_inicio_pagamento_condominio' }
  }
  if (desc.includes('iptu')) {
    return { field: 'data_inicio_pagamento_iptu' }
  }
  if (desc.includes('prestação') || desc.includes('prestacao')) {
    return { field: 'data_pagamento_financiamento' }
  }
  if (desc.includes('leiloeiro')) {
    return { field: 'data_pagamento_leiloeiro' }
  }

  return null
}

/**
 * Preenchimento automático do checklist após salvar um lançamento.
 *
 * Regras:
 * - Só preenche se o campo no checklist estiver vazio (não sobrescreve datas preenchidas manualmente)
 * - "Término Reforma": sempre atualiza com a data do último lançamento de reforma
 * - O match usa descrição do lançamento (case-insensitive), combinado com categoria
 * - Usa pb.collection('checklists').getFirstListItem(...) para buscar o checklist da oportunidade
 */
export async function autoFillChecklist(
  oportunidadeId: string,
  lancamento: LancamentoLike | Partial<Lancamento>,
): Promise<Checklist | null> {
  if (!oportunidadeId || !lancamento || !lancamento.data) {
    return null
  }

  const lancamentoDateStr = lancamento.data.slice(0, 10) // YYYY-MM-DD
  if (!lancamentoDateStr) return null

  // Normaliza tipo e desc
  const desc = (lancamento.descricao || '').toLowerCase().trim()
  const cat = (lancamento.categoria || '').toLowerCase().trim()
  const isReforma =
    desc.includes('reforma') && (cat.includes('reforma') || cat.includes('desocupa') || cat === '')

  try {
    let checklist: Checklist | null = null

    try {
      checklist = await pb
        .collection('checklists')
        .getFirstListItem<Checklist>(`oportunidade = "${oportunidadeId}"`)
    } catch (err: any) {
      if (err?.status === 404) {
        checklist = null
      } else {
        throw err
      }
    }

    const updates: Partial<ChecklistDates> = {}

    if (isReforma) {
      // Regra da Reforma:
      // - data_inicio_reforma: preenche apenas se estiver vazio
      // - data_termino_reforma: sempre atualiza com a data mais recente
      if (!checklist || !checklist.data_inicio_reforma) {
        updates.data_inicio_reforma = lancamentoDateStr
      }

      // Para data_termino_reforma: se for posterior ou novo, atualiza
      const currentTermino = checklist?.data_termino_reforma
        ? checklist.data_termino_reforma.slice(0, 10)
        : null
      if (!currentTermino || lancamentoDateStr >= currentTermino) {
        updates.data_termino_reforma = lancamentoDateStr
      }
    } else {
      const match = getChecklistTargetField({
        oportunidade: oportunidadeId,
        tipo: lancamento.tipo,
        descricao: lancamento.descricao || '',
        categoria: lancamento.categoria || '',
        data: lancamento.data,
      })

      if (match) {
        const field = match.field
        const existingVal = checklist ? checklist[field] : null
        // Só preenche se o campo no checklist estiver vazio (não sobrescreve datas manuais)
        if (!existingVal) {
          updates[field] = lancamentoDateStr
        }
      }
    }

    // Se não houver campos a atualizar, encerra
    if (Object.keys(updates).length === 0) {
      return checklist
    }

    if (checklist?.id) {
      return await pb.collection('checklists').update<Checklist>(checklist.id, updates)
    } else {
      return await pb.collection('checklists').create<Checklist>({
        oportunidade: oportunidadeId,
        ...updates,
      })
    }
  } catch (error) {
    console.error('Erro no preenchimento automático do checklist:', error)
    return null
  }
}
