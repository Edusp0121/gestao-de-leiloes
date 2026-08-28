import pb from '@/lib/pocketbase/client'

export interface ChecklistItemMeta {
  key: keyof ChecklistDates
  label: string
  categoria?:
    | 'Aquisição & Documentação'
    | 'Prefeitura & Condomínio'
    | 'Desocupação & Posse'
    | 'Reforma'
    | 'Venda & Recebimento'
  relatedToggleKey?: keyof ChecklistToggles
  relatedToggleLabel?: string
  description?: string
}

export interface ChecklistDates {
  data_arremate?: string | null
  data_pagamento_lance?: string | null
  data_pagamento_leiloeiro?: string | null
  data_auto_arrematacao?: string | null
  data_carta_arrematacao?: string | null
  data_pagamento_itbi?: string | null
  data_pagamento_escritura?: string | null
  data_pagamento_registro_averbacao?: string | null
  data_alteracao_dados_prefeitura?: string | null
  data_alteracao_dados_condominio?: string | null
  data_inicio_pagamento_condominio?: string | null
  data_inicio_pagamento_iptu?: string | null
  data_notificacao_ocupante?: string | null
  data_contato_ocupante?: string | null
  data_processo_imissao_posse?: string | null
  data_inicio_reforma?: string | null
  data_termino_reforma?: string | null
  data_divulgacao_venda?: string | null
  data_contrato_compra_venda?: string | null
  data_recebimento_sinal?: string | null
  data_pagamento_financiamento?: string | null
  data_recebimento_saldo?: string | null
}

export interface ChecklistToggles {
  desocupacao_amigavel?: boolean
  ocupante_interesse_compra?: boolean
}

export interface Checklist extends ChecklistDates, ChecklistToggles {
  id: string
  oportunidade: string
  observacoes?: string
  email_notificado?: boolean
  created: string
  updated: string
  expand?: {
    oportunidade?: {
      id: string
      nome: string
      endereco: string
      status?: string
    }
  }
}

/**
 * Definição canônica dos 22 itens do tipo DATA na ordem padrão do processo
 * e vinculação com os 2 itens SIM/NÃO.
 */
export const CHECKLIST_ITEMS_CONFIG: ChecklistItemMeta[] = [
  // Aquisição & Pagamentos Iniciais
  {
    key: 'data_arremate',
    label: '1. Arremate',
    categoria: 'Aquisição & Documentação',
    description: 'Data do leilão / arrematação do imóvel',
  },
  {
    key: 'data_pagamento_lance',
    label: '2. Pagamento Lance',
    categoria: 'Aquisição & Documentação',
    description: 'Comprovante do pagamento da guia do lance ou entrada',
  },
  {
    key: 'data_pagamento_leiloeiro',
    label: '3. Pagamento Leiloeiro',
    categoria: 'Aquisição & Documentação',
    description: 'Comissão de 5% do leiloeiro oficial',
  },
  {
    key: 'data_auto_arrematacao',
    label: '4. Auto de Arrematação (Aprovação)',
    categoria: 'Aquisição & Documentação',
    description: 'Assinatura e homologação do auto de arrematação',
  },
  {
    key: 'data_carta_arrematacao',
    label: '5. Carta Arrematação (Contrato)',
    categoria: 'Aquisição & Documentação',
    description: 'Expedição da carta de arrematação ou contrato com banco',
  },
  {
    key: 'data_pagamento_itbi',
    label: '6. Pagamento ITBI',
    categoria: 'Aquisição & Documentação',
    description: 'Guia do imposto de transmissão recolhida',
  },
  {
    key: 'data_pagamento_escritura',
    label: '7. Pagamento Escritura',
    categoria: 'Aquisição & Documentação',
    description: 'Custas cartorárias da escritura (quando aplicável)',
  },
  {
    key: 'data_pagamento_registro_averbacao',
    label: '8. Pagamento Registro/Averbação',
    categoria: 'Aquisição & Documentação',
    description: 'Prenotação e registro no Cartório de Registro de Imóveis (RGI)',
  },

  // Prefeitura & Condomínio
  {
    key: 'data_alteracao_dados_prefeitura',
    label: '9. Alteração dados Prefeitura',
    categoria: 'Prefeitura & Condomínio',
    description: 'Atualização cadastral do contribuinte no IPTU',
  },
  {
    key: 'data_alteracao_dados_condominio',
    label: '10. Alteração dados Condomínio',
    categoria: 'Prefeitura & Condomínio',
    description: 'Atualização do cadastro junto à administradora do condomínio',
  },
  {
    key: 'data_inicio_pagamento_condominio',
    label: '11. Início pagamento Condomínio',
    categoria: 'Prefeitura & Condomínio',
    description: 'Primeira cota condominial assumida pelo arrematante',
  },
  {
    key: 'data_inicio_pagamento_iptu',
    label: '12. Início pagamento IPTU',
    categoria: 'Prefeitura & Condomínio',
    description: 'Primeira parcela de IPTU assumida pelo arrematante',
  },

  // Desocupação & Posse
  {
    key: 'data_notificacao_ocupante',
    label: '13. Notificação do Ocupante',
    categoria: 'Desocupação & Posse',
    relatedToggleKey: 'desocupacao_amigavel',
    relatedToggleLabel: 'Desocupação Amigável?',
    description: 'Envio de notificação extrajudicial para desocupação',
  },
  {
    key: 'data_contato_ocupante',
    label: '14. Contato com Ocupante',
    categoria: 'Desocupação & Posse',
    relatedToggleKey: 'ocupante_interesse_compra',
    relatedToggleLabel: 'Ocupante tem interesse na Compra',
    description: 'Reunião ou conversa para negociação de prazos ou proposta',
  },
  {
    key: 'data_processo_imissao_posse',
    label: '15. Processo Imissão Posse',
    categoria: 'Desocupação & Posse',
    description: 'Petição/mandado judicial de imissão na posse (se necessário)',
  },

  // Reforma
  {
    key: 'data_inicio_reforma',
    label: '16. Início Reforma',
    categoria: 'Reforma',
    description: 'Início das obras de reparo/pintura/modernização',
  },
  {
    key: 'data_termino_reforma',
    label: '17. Término Reforma',
    categoria: 'Reforma',
    description: 'Entrega final da reforma e limpeza pós-obra',
  },

  // Venda & Liquidação
  {
    key: 'data_divulgacao_venda',
    label: '18. Divulgação para Venda',
    categoria: 'Venda & Recebimento',
    description: 'Fotos profissionais e publicação nos portais imobiliários',
  },
  {
    key: 'data_contrato_compra_venda',
    label: '19. Contrato Compra e Venda',
    categoria: 'Venda & Recebimento',
    description: 'Assinatura do compromisso/promessa de compra e venda',
  },
  {
    key: 'data_recebimento_sinal',
    label: '20. Recebimento de Sinal',
    categoria: 'Venda & Recebimento',
    description: 'Entrada/arras creditada na conta',
  },
  {
    key: 'data_pagamento_financiamento',
    label: '21. Pagamento do Financiamento',
    categoria: 'Venda & Recebimento',
    description: 'Quitação do saldo devedor do financiamento bancário',
  },
  {
    key: 'data_recebimento_saldo',
    label: '22. Recebimento do Saldo',
    categoria: 'Venda & Recebimento',
    description: 'Recebimento final do saldo da venda / repasse do banco',
  },
]

/**
 * Busca o checklist vinculado a uma oportunidade específica.
 * Retorna `null` se ainda não houver registro criado.
 */
export const getChecklistByOportunidade = async (
  oportunidadeId: string,
): Promise<Checklist | null> => {
  try {
    const record = await pb
      .collection('checklists')
      .getFirstListItem<Checklist>(`oportunidade = "${oportunidadeId}"`, {
        expand: 'oportunidade',
      })
    return record
  } catch (err: any) {
    if (err?.status === 404) {
      return null
    }
    throw err
  }
}

/**
 * Salva ou atualiza o checklist de uma oportunidade.
 * Se já existir checklist com ID, atualiza; senão tenta criar.
 */
export const saveChecklist = async (
  oportunidadeId: string,
  data: Partial<ChecklistDates & ChecklistToggles & { observacoes?: string; id?: string }>,
): Promise<Checklist> => {
  // Remove id se for vazio para create
  const { id, ...cleanData } = data

  // Normaliza strings vazias de data para null para o PocketBase
  const payload: Record<string, any> = { ...cleanData, oportunidade: oportunidadeId }
  for (const key of Object.keys(payload)) {
    if (key.startsWith('data_') && (payload[key] === '' || payload[key] === undefined)) {
      payload[key] = null
    }
  }

  if (id) {
    return pb.collection('checklists').update<Checklist>(id, payload)
  }

  // Se não veio ID, verifica se já existe registro para essa oportunidade antes de criar
  const existing = await getChecklistByOportunidade(oportunidadeId)
  if (existing) {
    return pb.collection('checklists').update<Checklist>(existing.id, payload)
  }

  return pb.collection('checklists').create<Checklist>(payload)
}
