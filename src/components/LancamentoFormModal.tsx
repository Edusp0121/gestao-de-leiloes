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
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { CATEGORY_DESCRIPTIONS } from '@/lib/expense-categories'

const CATEGORIAS = ['Aquisição', 'Tributos', 'Desocupação', 'Mensais', 'Venda'] as const

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
  const { toast } = useToast()

  const descriptionOptions = useMemo(() => {
    return CATEGORY_DESCRIPTIONS[categoria as keyof typeof CATEGORY_DESCRIPTIONS] || []
  }, [categoria])

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
    } else if (open && !editLancamento) {
      setOportunidadeId(defaultOportunidadeId || '')
      setTipo('Despesa')
      setCategoria('Aquisição')
      setDescricao('')
      setValor('')
      setData(new Date().toISOString().split('T')[0])
    }
  }, [open, editLancamento, defaultOportunidadeId])

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
        data: data ? `${data} 00:00:00.000Z` : new Date().toISOString(),
        categoria: tipo === 'Despesa' ? categoria : 'Venda',
      }
      if (editLancamento) {
        await updateLancamento(editLancamento.id, payload)
        toast({ title: 'Sucesso', description: 'Lançamento atualizado com sucesso!' })
      } else {
        await createLancamento(payload)
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
            <Select value={oportunidadeId} onValueChange={setOportunidadeId}>
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
            <Select value={descricao} onValueChange={setDescricao}>
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
            <Label>Valor (R$)</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0,00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </div>
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
