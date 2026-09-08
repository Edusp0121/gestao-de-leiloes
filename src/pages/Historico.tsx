import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Search, PlusCircle, ArrowUpRight, RotateCcw, Trash2, AlertTriangle } from 'lucide-react'
import {
  getOportunidades,
  getOportunidadesExcluidas,
  restoreOportunidade,
  deleteOportunidadeDefinitiva,
  isCurrentUserAdmin,
  Oportunidade,
} from '@/services/oportunidades'
import { getLancamentos, Lancamento } from '@/services/lancamentos'
import { formatBRL, formatPercent, formatDate } from '@/lib/formatters'
import { StatusBadge } from '@/components/StatusBadge'
import { useToast } from '@/hooks/use-toast'

export default function Historico() {
  const { toast } = useToast()
  const isAdmin = isCurrentUserAdmin()
  const [oportunidades, setOportunidades] = useState<Oportunidade[]>([])
  const [oportunidadesExcluidas, setOportunidadesExcluidas] = useState<Oportunidade[]>([])
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Todos')

  // Estados de confirmação para ações de admin
  const [restoringOp, setRestoringOp] = useState<Oportunidade | null>(null)
  const [hardDeleteOp, setHardDeleteOp] = useState<Oportunidade | null>(null)
  const [hardDeleteStep, setHardDeleteStep] = useState<1 | 2>(1)
  const [actionLoading, setActionLoading] = useState(false)

  const loadData = async () => {
    try {
      const promises: [Promise<Oportunidade[]>, Promise<Lancamento[]>, Promise<Oportunidade[]>?] = [
        getOportunidades(),
        getLancamentos(),
      ]
      if (isAdmin) {
        promises.push(getOportunidadesExcluidas())
      }
      const [ops, lans, excluidas] = await Promise.all(promises)
      setOportunidades(ops)
      setLancamentos(lans)
      if (excluidas) {
        setOportunidadesExcluidas(excluidas)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filtered = oportunidades.filter((op) => {
    const matchesSearch =
      op.nome.toLowerCase().includes(search.toLowerCase()) ||
      op.endereco.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'Todos' || op.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const statuses = ['Todos', 'Em análise', 'Arrematada', 'Em andamento', 'Vendida']
  if (isAdmin) {
    statuses.push('Excluídas')
  }

  const isExcluidasView = statusFilter === 'Excluídas'

  const filteredExcluidas = oportunidadesExcluidas.filter((op) => {
    return (
      op.nome.toLowerCase().includes(search.toLowerCase()) ||
      op.endereco.toLowerCase().includes(search.toLowerCase())
    )
  })

  const handleRestore = async (op: Oportunidade) => {
    setActionLoading(true)
    try {
      await restoreOportunidade(op.id)
      toast({
        title: 'Oportunidade restaurada',
        description: `A oportunidade "${op.nome}" foi restaurada e voltou a aparecer com seus lançamentos.`,
      })
      setRestoringOp(null)
      await loadData()
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível restaurar a oportunidade.',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleHardDelete = async () => {
    if (!hardDeleteOp) return
    setActionLoading(true)
    try {
      await deleteOportunidadeDefinitiva(hardDeleteOp.id)
      toast({
        title: 'Excluída definitivamente',
        description: `A oportunidade "${hardDeleteOp.nome}" foi removida em definitivo do banco de dados.`,
      })
      setHardDeleteOp(null)
      setHardDeleteStep(1)
      await loadData()
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir definitivamente a oportunidade.',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return <div className="py-12 text-center text-[#7A6A5A]">Carregando histórico...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#5C3A21]">Histórico de Oportunidades</h1>
          <p className="text-sm text-[#7A6A5A]">Todas as oportunidades analisadas e arrematadas</p>
        </div>
        <Link to="/nova-analise">
          <Button className="bg-[#F97316] hover:bg-[#EA580C] text-white gap-2 font-medium">
            <PlusCircle className="w-4 h-4" /> Nova Análise
          </Button>
        </Link>
      </div>

      <Card className="border-[#EDE4D8]">
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-3 text-[#7A6A5A]" />
              <Input
                placeholder="Buscar por nome ou endereço..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 border-[#EDE4D8]"
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              {statuses.map((st) => (
                <Button
                  key={st}
                  variant={statusFilter === st ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(st)}
                  className={
                    statusFilter === st
                      ? 'bg-[#5C3A21] text-white'
                      : 'text-[#5C3A21] border-[#EDE4D8]'
                  }
                >
                  {st}
                </Button>
              ))}
            </div>
          </div>

          {isExcluidasView ? (
            filteredExcluidas.length === 0 ? (
              <p className="text-center py-8 text-sm text-[#7A6A5A]">
                Nenhuma oportunidade na lixeira (excluída suavemente).
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#EDE4D8] bg-red-50/50">
                      <TableHead>Oportunidade Excluída</TableHead>
                      <TableHead>Status Original</TableHead>
                      <TableHead className="text-right">Arrematação</TableHead>
                      <TableHead className="text-center">Data Exclusão</TableHead>
                      <TableHead className="text-center">Ações (Admin)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExcluidas.map((op) => (
                      <TableRow key={op.id} className="border-[#EDE4D8] hover:bg-red-50/30">
                        <TableCell className="font-semibold text-[#2D1B0E]">
                          <span className="line-through text-neutral-500 mr-2">{op.nome}</span>
                          <span className="text-xs bg-red-100 text-red-700 font-normal px-2 py-0.5 rounded-full">
                            Excluída
                          </span>
                          <p className="text-xs text-[#7A6A5A] mt-0.5">{op.endereco}</p>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={op.status} />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatBRL(op.valor_arrematacao)}
                        </TableCell>
                        <TableCell className="text-center text-xs text-[#7A6A5A]">
                          {formatDate(op.deleted_at || op.updated)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 gap-1.5 h-8 font-medium"
                              onClick={() => setRestoringOp(op)}
                              disabled={actionLoading}
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Restaurar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:bg-red-50 gap-1.5 h-8 font-medium"
                              onClick={() => {
                                setHardDeleteOp(op)
                                setHardDeleteStep(1)
                              }}
                              disabled={actionLoading}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Excluir definitivamente
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-sm text-[#7A6A5A]">
              Nenhuma oportunidade encontrada com esses filtros.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#EDE4D8]">
                    <TableHead>Oportunidade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Arrematação</TableHead>
                    <TableHead className="text-right">Total Gasto</TableHead>
                    <TableHead className="text-right">Retorno Est.</TableHead>
                    <TableHead className="text-right">ROI Est.</TableHead>
                    <TableHead className="text-center">Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((op) => {
                    const despesas = lancamentos
                      .filter((l) => l.oportunidade === op.id && l.tipo === 'Despesa')
                      .reduce((acc, l) => acc + l.valor, 0)
                    return (
                      <TableRow key={op.id} className="border-[#EDE4D8] hover:bg-[#FAF7F2]">
                        <TableCell className="font-semibold text-[#2D1B0E]">
                          <Link
                            to={`/oportunidade/${op.id}`}
                            className="hover:text-[#F97316] flex items-center gap-1"
                          >
                            {op.nome}
                            <ArrowUpRight className="w-3.5 h-3.5 text-[#7A6A5A]" />
                          </Link>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={op.status} />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatBRL(op.valor_arrematacao)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-amber-900">
                          {formatBRL(despesas)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-green-700">
                          {formatBRL(op.retorno_estimado || op.maior_lucro_esperado)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-[#F97316]">
                          {formatPercent(op.roi_esperado_periodo)}
                        </TableCell>
                        <TableCell className="text-center text-xs text-[#7A6A5A]">
                          {formatDate(op.data_aquisicao || op.created)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Modal de confirmação: Restaurar Oportunidade */}
          <AlertDialog
            open={Boolean(restoringOp)}
            onOpenChange={(open) => !open && setRestoringOp(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Restaurar Oportunidade</AlertDialogTitle>
                <AlertDialogDescription>
                  Deseja restaurar a oportunidade <strong>&ldquo;{restoringOp?.nome}&rdquo;</strong>
                  ? Ela voltará a ficar visível nas listagens principais, relatórios e painéis junto
                  com seus lançamentos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={actionLoading}
                  onClick={() => restoringOp && handleRestore(restoringOp)}
                >
                  Restaurar Oportunidade
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Modal de dupla confirmação: Exclusão Definitiva (Hard Delete - Exclusivo Admin) */}
          <AlertDialog
            open={Boolean(hardDeleteOp)}
            onOpenChange={(open) => {
              if (!open) {
                setHardDeleteOp(null)
                setHardDeleteStep(1)
              }
            }}
          >
            <AlertDialogContent>
              {hardDeleteStep === 1 ? (
                <>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      Atenção: Exclusão Definitiva (1/2)
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                      <p>
                        Você está prestes a excluir definitivamente a oportunidade{' '}
                        <strong>&ldquo;{hardDeleteOp?.nome}&rdquo;</strong>.
                      </p>
                      <p className="text-red-700 font-medium">
                        Esta ação removerá permanentemente todos os registros, lançamentos e dados
                        vinculados do banco de dados e NÃO poderá ser desfeita.
                      </p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
                    <Button
                      variant="destructive"
                      onClick={() => setHardDeleteStep(2)}
                      disabled={actionLoading}
                    >
                      Continuar para Confirmação Final
                    </Button>
                  </AlertDialogFooter>
                </>
              ) : (
                <>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-red-700">
                      <Trash2 className="w-5 h-5 text-red-700" />
                      Confirmação Final: Apagar permanentemente? (2/2)
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                      <p>
                        Por favor, confirme que tem absoluta certeza de que deseja apagar{' '}
                        <strong>&ldquo;{hardDeleteOp?.nome}&rdquo;</strong> do sistema.
                      </p>
                      <p className="text-xs text-neutral-600 bg-neutral-100 p-2.5 rounded border border-neutral-200">
                        Como administrador, você está realizando a destruição irrevogável do
                        registro.
                      </p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel
                      disabled={actionLoading}
                      onClick={() => setHardDeleteStep(1)}
                    >
                      Voltar
                    </AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-700 hover:bg-red-800 text-white font-semibold"
                      disabled={actionLoading}
                      onClick={handleHardDelete}
                    >
                      Sim, Apagar Definitivamente
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </>
              )}
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  )
}
