import pb from '@/lib/pocketbase/client'

export interface Lancamento {
  id: string
  usuario: string
  oportunidade: string
  tipo: 'Despesa' | 'Receita'
  descricao: string
  valor: number
  data?: string
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

export const createLancamento = (data: Partial<Lancamento>) =>
  pb.collection('lancamentos').create<Lancamento>(data)

export const deleteLancamento = (id: string) => pb.collection('lancamentos').delete(id)
