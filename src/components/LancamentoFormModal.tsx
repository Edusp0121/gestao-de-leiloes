import { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Pencil } from 'lucide-react'
import { createLancamento, updateLancamento, Lancamento } from '@/services/lancamentos'
import { getOportunidade, getUsuarios, toIdArray, type UserRef } from '@/services/oportunidades'
import { autoFillChecklist } from '@/services/checklist-automation'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { CATEGORY_DESCRIPTIONS } from '@/lib/expense-categories'
import { buildQuemPagouOptions, defaultQuemPagou } from '@/lib/participantes-utils'

const CATEGORIAS = ['Aquisição', 'Encargos', 'Desocupação', 'Mensais', 'Venda'] as const

interface LancamentoFormModalProps {
  oportunidades: { id: string; nome: string }[]
  defaultOportunidadeId?: string
  onSuccess?: () => void
  triggerText?: string
  editLancamento?: Lancamento | null
}

export function LancamentoFormModal({
  oportunidades,
  defaultOportunidadeId,
  onSuccess,
  triggerText = 'Novo Lançamento',
  editLancamento = null,
}: LancamentoFormModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [oportunidadeId, setOportunidadeId] = useState(defaultOportunidadeId || '')
  const [tipo, setTipo] = useState<'Despesa' | 'Receita'>('Despesa')
  const [categoria, setCategoria] = useState<string>('Aquisição')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [quemPagou, setQuemPagou] = useState('')
  const [participantes, setParticipantes] = useState<UserRef[]>([])
  const [loadingParticipantes, setLoadingParticipantes] = useState(false)
  const [oportunidadeAtual, setOportunidadeAtual] = useState<any>(null)
  const [valorEditadoManualmente, setValorEditadoManualmente] = useState(false)
  const { toast } = useToast()

  const descriptionOptions = useMemo(() => {
    return CATEGORY_DESCRIPTIONS[categoria as keyof typeof CATEGORY_DESCRIPTIONS] || []
  }, [categoria])

  // Opções de "Quem Pagou". Prioriza os sócios PARTICIPANTES carregados da
  // oportunidade (observadores NÃO entram). Se eles não estiverem disponíveis
  // (falha de carregamento ou lançamento antigo sem sócios vinculados), monta
  // um fallback mínimo a partir do valor atual do campo, garantindo que o
  // Select sempre seja usável e clicável.
  const quemPagouOptions = useMemo(() => {
    const fromParticipantes = buildQuemPagouOptions(participantes)
    if (fromParticipantes.length > 0) return fromParticipantes

    // Fallback: sem participantes carregados. Inclui a letra já presente no
    // lançamento antigo (se houver) e os marcadores de grupo "A"/"T" para que
    // o campo nunca fique vazio/travado.
    const fallback: { value: string; label: string }[] = []
    if (quemPagou && !['A', 'T'].includes(quemPagou)) {
      fallback.push({ value: quemPagou, label: `${quemPagou} — Sócio` })
    }
    fallback.push({ value: 'A', label: 'A — Ambos' })
    fallback.push({ value: 'T', label: 'T — Todos' })
    return fallback
  }, [participantes, quemPagou])

  // Carrega os sócios da oportunidade selecionada para montar as opções de
  // "Quem Pagou". Administrador ("Doulhe3") é filtrado.
  useEffect(() => {
    if (!open || !oportunidadeId) {
      setParticipantes([])
      setOportunidadeAtual(null)
      return
    }
    setLoadingParticipantes(true)
    getOportunidade(oportunidadeId)
      .then(async (op) => {
        setOportunidadeAtual(op)
        // Coleta participantes e usuario expandidos da oportunidade
        const expandedParts = Array.isArray(op.expand?.participantes)
          ? op.expand!.participantes
          : []
        const expandedUser = op.expand?.usuario

        // Mapa de id -> UserRef
        const knownUsers = new Map<string, UserRef & { admin?: boolean }>()
        if (expandedUser?.id) {
          knownUsers.set(expandedUser.id, {
            id: expandedUser.id,
            name: expandedUser.name,
            email: expandedUser.email,
            admin: (expandedUser as any).admin,
          })
        }
        expandedParts.forEach((p) => {
          if (p?.id) {
            knownUsers.set(p.id, {
              id: p.id,
              name: p.name,
              email: p.email,
              admin: (p as any).admin,
            })
          }
        })

        // Conjunto de todos os IDs de participantes e criador
        const partIds = toIdArray(op.participantes)
        const allUserIds = new Set<string>()
        if (op.usuario) allUserIds.add(op.usuario)
        partIds.forEach((id) => allUserIds.add(id))

        // Verifica se faltam detalhes (como nome/email) de algum usuário
        const missingDetails = Array.from(allUserIds).some((id) => {
          const user = knownUsers.get(id)
          return !user || (!user.name && !user.email)
        })

        if (missingDetails) {
          try {
            const allUsers = await getUsuarios()
            allUsers.forEach((u) => {
              if (u.id) {
                const existing = knownUsers.get(u.id)
                knownUsers.set(u.id, {
                  id: u.id,
                  name: u.name || existing?.name,
                  email: u.email || existing?.email,
                })
              }
            })
          } catch {
            // Se falhar ao buscar a lista de todos os usuários, prossegue com os que tem
          }
        }

        const result: UserRef[] = Array.from(allUserIds)
          .map((id) => {
            return knownUsers.get(id) || { id }
          })
          .filter((u) => (u as any).admin !== true && u.name !== 'Doulhe3')

        setParticipantes(result)
      })
      .catch(() => {
        setParticipantes([])
        setOportunidadeAtual(null)
      })
      .finally(() => setLoadingParticipantes(false))
  }, [open, oportunidadeId])

  useEffect(() => {
    if (open && editLancamento) {
      setOportunidadeId(editLancamento.oportunidade)
      setTipo(editLancamento.tipo)
      setCategoria(
        editLancamento.categoria || (editLancamento.tipo === 'Receita' ? 'Venda' : 'Aquisição'),
      )
      setDescricao(editLancamento.descricao)
      setValor(String(editLancamento.valor))
      const rawDate = editLancamento.data || ''
      setData(
        rawDate ? rawDate.split(' ')[0].split('T')[0] : new Date().toISOString().split('T')[0],
      )
      setQuemPagou(editLancamento.quem_pagou || '')
      // Em edição, consideramos que o valor veio definido (manual)
      setValorEditadoManualmente(true)
    } else if (open && !editLancamento) {
      setOportunidadeId(defaultOportunidadeId || '')
      setTipo('Despesa')
      setCategoria('Aquisição')
      setDescricao('')
      setValor('')
      setData(new Date().toISOString().split('T')[0])
      setQuemPagou('')
      setValorEditadoManualmente(false)
    }
  }, [open, editLancamento, defaultOportunidadeId])

  // Regra de pré-preenchimento e recálculo da Consultoria (5% do valor do arremate):
  // Se categoria for 'Aquisição' e descrição for 'Consultoria', e o usuário NÃO tiver editado
  // manualmente o valor, recalcula automaticamente 5% do valor do arremate.
  const valorArrematacaoOp = Number(oportunidadeAtual?.valor_arrematacao) || 0
  useEffect(() => {
    if (!open) return
    if (tipo === 'Despesa' && categoria === 'Aquisição' && descricao === 'Consultoria') {
      if (!valorEditadoManualmente) {
        if (valorArrematacaoOp > 0) {
          const calc5Percent = (valorArrematacaoOp * 0.05).toFixed(2)
          setValor(calc5Percent)
        } else {
          setValor('')
        }
      }
    }
  }, [open, tipo, categoria, descricao, valorArrematacaoOp, valorEditadoManualmente])

  // Define o valor padrão de "Quem Pagou":
  // - Lançamento antigo COM `quem_pagou`: mantém o valor salvo.
  // - Lançamento antigo SEM `quem_pagou`: preenche automaticamente com base
  //   nos participantes carregados ("A"/"T"/letra única). Se os participantes
  //   não carregarem, usa "A" como fallback para não travar o campo.
  // - Novo lançamento: preenche com o default dos participantes ("A"/"T"/letra).
  useEffect(() => {
    if (!open) return
    if (editLancamento && editLancamento.quem_pagou) return

    if (participantes.length > 0) {
      const def = defaultQuemPagou(participantes)
      if (def) setQuemPagou(def)
      return
    }

    // Sem participantes carregados ainda (por exemplo, durante carregamento): não define
    // fallback 'A' prematuramente se não soubermos a quantidade real de participantes.
  }, [open, participantes, editLancamento])

  const handleTipoChange = (v: 'Despesa' | 'Receita') => {
    setTipo(v)
    setDescricao('')
    if (v === 'Receita') {
      setCategoria('Venda')
    }
  }

  const handleCategoriaChange = (v: string) => {
    setCategoria(v)
    setDescricao('')
    setValorEditadoManualmente(false)
  }

  const handleDescricaoChange = (v: string) => {
    setDescricao(v)
    if (v === 'Consultoria' && categoria === 'Aquisição') {
      setValorEditadoManualmente(false)
      const arremate = Number(oportunidadeAtual?.valor_arrematacao) || 0
      if (arremate > 0) {
        setValor((arremate * 0.05).toFixed(2))
      }
    }
  }

  const handleOportunidadeChange = (newOpId: string) => {
    setOportunidadeId(newOpId)
    // Se a descrição for Consultoria e não foi editada manualmente,
    // o efeito de oportunidadeAtual irá recalcular com a nova oportunidade
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!oportunidadeId || !descricao || !valor) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive',
      })
      return
    }
    setLoading(true)
    try {
      const payload = {
        oportunidade: oportunidadeId,
        tipo,
        descricao,
        valor: Number(valor),
        data: data ? new Date(data + 'T00:00:00').toISOString() : new Date().toISOString(),
        categoria: tipo === 'Despesa' ? categoria : 'Venda',
        quem_pagou: tipo === 'Despesa' ? quemPagou || undefined : undefined,
      }
      if (editLancamento) {
        const updated = await updateLancamento(editLancamento.id, payload)
        await autoFillChecklist(oportunidadeId, updated)
        toast({ title: 'Sucesso', description: 'Lançamento atualizado com sucesso!' })
      } else {
        const created = await createLancamento(payload)
        await autoFillChecklist(oportunidadeId, created)
        toast({ title: 'Sucesso', description: 'Lançamento registrado com sucesso!' })
      }
      setOpen(false)
      onSuccess?.()
    } catch (err) {
      toast({
        title: 'Erro no cadastro',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {editLancamento ? (
          <Button variant="ghost" size="icon" className="text-blue-500 hover:bg-blue-50">
            <Pencil className="w-4 h-4" />
          </Button>
        ) : (
          <Button className="bg-[#F97316] hover:bg-[#EA580C] text-white gap-2 font-medium">
            <Plus className="w-4 h-4" />
            {triggerText}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-[#5C3A21]">
            {editLancamento ? 'Editar Lançamento' : 'Registrar Lançamento'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Oportunidade</Label>
            <Select value={oportunidadeId} onValueChange={handleOportunidadeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a oportunidade" />
              </SelectTrigger>
              <SelectContent>
                {oportunidades.map((op) => (
                  <SelectItem key={op.id} value={op.id}>
                    {op.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={tipo}
                onValueChange={(v) => handleTipoChange(v as 'Despesa' | 'Receita')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Despesa">Despesa</SelectItem>
                  <SelectItem value="Receita">Receita</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
          </div>
          {tipo === 'Despesa' && (
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={categoria} onValueChange={handleCategoriaChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Select value={descricao} onValueChange={handleDescricaoChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a descrição" />
              </SelectTrigger>
              <SelectContent>
                {descriptionOptions.map((desc) => (
                  <SelectItem key={desc} value={desc}>
                    {desc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Valor (R$)</Label>
              {categoria === 'Aquisição' && descricao === 'Consultoria' && (
                <span className="text-[11px] text-[#F97316] font-medium">
                  {valorEditadoManualmente
                    ? 'Valor editado manualmente'
                    : valorArrematacaoOp > 0
                      ? '5% do arremate (automático)'
                      : 'Oportunidade sem valor de arremate'}
                </span>
              )}
            </div>
            <Input
              type="number"
              step="0.01"
              placeholder="0,00"
              value={valor}
              onChange={(e) => {
                setValor(e.target.value)
                setValorEditadoManualmente(true)
              }}
            />
          </div>
          {tipo === 'Despesa' && (
            <div className="space-y-2">
              <Label>Quem Pagou</Label>
              <Select value={quemPagou} onValueChange={setQuemPagou}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingParticipantes ? 'Carregando sócios...' : 'Selecione quem pagou'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {quemPagouOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {loadingParticipantes && (
                <p className="text-xs text-[#7A6A5A]">Carregando sócios da oportunidade...</p>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-[#F97316] hover:bg-[#EA580C] text-white"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
