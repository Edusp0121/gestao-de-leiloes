import pb from '@/lib/pocketbase/client'

export interface Lancamento {
  id: string
  usuario: string
  oportunidade: string
  tipo: 'Despesa' | 'Receita'
  descricao: string
  valor: number
  data?: string
  categoria?: string
  /** Primeira letra do sócio que pagou, ou "A" (ambos/2 sócios) / "T" (todos/>2 sócios). */
  quem_pagou?: string
  created: string
  updated: string
  expand?: {
    oportunidade?: {
      nome: string
    }
  }
}

export const getLancamentos = (oportunidadeId?: string) => {
  const filter = oportunidadeId ? `oportunidade = "${oportunidadeId}"` : ''
  return pb.collection('lancamentos').getFullList<Lancamento>({
    filter,
    sort: '-data,-created',
    expand: 'oportunidade',
  })
}

export const createLancamento = (data: Partial<Lancamento>) => {
  const userId = pb.authStore.record?.id
  return pb.collection('lancamentos').create<Lancamento>({
    ...data,
    usuario: userId,
  })
}

export const updateLancamento = (id: string, data: Partial<Lancamento>) =>
  pb.collection('lancamentos').update<Lancamento>(id, data)

export const deleteLancamento = (id: string) => pb.collection('lancamentos').delete(id)
