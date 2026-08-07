import { useState } from 'react'
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
import { Plus } from 'lucide-react'
import { createLancamento } from '@/services/lancamentos'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'

interface LancamentoFormModalProps {
  oportunidades: { id: string; nome: string }[]
  defaultOportunidadeId?: string
  onSuccess?: () => void
  triggerText?: string
}

export function LancamentoFormModal({
  oportunidades,
  defaultOportunidadeId,
  onSuccess,
  triggerText = 'Novo Lançamento',
}: LancamentoFormModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [oportunidadeId, setOportunidadeId] = useState(defaultOportunidadeId || '')
  const [tipo, setTipo] = useState<'Despesa' | 'Receita'>('Despesa')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const { toast } = useToast()

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
      await createLancamento({
        oportunidade: oportunidadeId,
        tipo,
        descricao,
        valor: Number(valor),
        data: data ? `${data} 00:00:00.000Z` : new Date().toISOString(),
      })
      toast({ title: 'Sucesso', description: 'Lançamento registrado com sucesso!' })
      setDescricao('')
      setValor('')
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
        <Button className="bg-[#F97316] hover:bg-[#EA580C] text-white gap-2 font-medium">
          <Plus className="w-4 h-4" />
          {triggerText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-[#5C3A21]">Registrar Lançamento</DialogTitle>
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
              <Select value={tipo} onValueChange={(v) => setTipo(v as 'Despesa' | 'Receita')}>
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

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input
              placeholder="Ex: ITBI, Reforma, IPTU, etc."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
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
