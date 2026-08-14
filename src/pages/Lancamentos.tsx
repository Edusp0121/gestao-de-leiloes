import { useEffect, useState, useMemo } from 'react'
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
import { Trash2, Wallet } from 'lucide-react'
import { getLancamentos, deleteLancamento, Lancamento } from '@/services/lancamentos'
import { getOportunidades, Oportunidade } from '@/services/oportunidades'
import { formatBRL, formatDate } from '@/lib/formatters'
import { LancamentoFormModal } from '@/components/LancamentoFormModal'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import {
  EXPENSE_CATEGORIES,
  getEstimatedCostsByCategory,
  getRealCostsByCategory,
  isVendaReceita,
} from '@/lib/expense-categories'

export default function Lancamentos() {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [oportunidades, setOportunidades] = useState<Oportunidade[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const loadData = async () => {
    try {
      const [lans, ops] = await Promise.all([getLancamentos(), getOportunidades()])
      setLancamentos(lans)
      setOportunidades(ops)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('lancamentos', () => loadData())

  const handleDelete = async (id: string) => {
    try {
      await deleteLancamento(id)
      toast({ title: 'Sucesso', description: 'Lançamento excluído com sucesso.' })
      loadData()
    } catch {
      toast({ title: 'Erro', description: 'Falha ao excluir lançamento.', variant: 'destructive' })
    }
  }

  const totalDespesas = lancamentos
    .filter((l) => l.tipo === 'Despesa' && !isVendaReceita(l.descricao))
    .reduce((acc, l) => acc + l.valor, 0)

  const totalReceitas = lancamentos
    .filter((l) => l.tipo === 'Receita')
    .reduce((acc, l) => acc + l.valor, 0)

  const compChartData = useMemo(() => {
    const estimatedTotals = EXPENSE_CATEGORIES.reduce(
      (acc, cat) => ({ ...acc, [cat]: 0 }),
      {} as Record<string, number>,
    )
    oportunidades.forEach((op) => {
      const costs = getEstimatedCostsByCategory(op)
      EXPENSE_CATEGORIES.forEach((cat) => {
        estimatedTotals[cat] += costs[cat]
      })
    })
    const realCosts = getRealCostsByCategory(lancamentos)
    return EXPENSE_CATEGORIES.map((cat) => ({
      name: cat,
      Estimado: Math.round(estimatedTotals[cat] * 100) / 100,
      Real: Math.round(realCosts[cat] * 100) / 100,
    }))
  }, [oportunidades, lancamentos])

  if (loading) {
    return <div className="py-12 text-center text-[#7A6A5A]">Carregando lançamentos...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#5C3A21]">Lançamentos Financeiros</h1>
          <p className="text-sm text-[#7A6A5A]">Controle de despesas e receitas por oportunidade</p>
        </div>
        <LancamentoFormModal oportunidades={oportunidades} onSuccess={loadData} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-[#EDE4D8]">
          <CardContent className="pt-4">
            <p className="text-xs font-semibold text-[#7A6A5A] uppercase">Total Despesas</p>
            <p className="text-xl font-bold text-red-600 mt-1">{formatBRL(totalDespesas)}</p>
          </CardContent>
        </Card>
        <Card className="border-[#EDE4D8]">
          <CardContent className="pt-4">
            <p className="text-xs font-semibold text-[#7A6A5A] uppercase">Total Receitas</p>
            <p className="text-xl font-bold text-green-600 mt-1">{formatBRL(totalReceitas)}</p>
          </CardContent>
        </Card>
        <Card className="border-[#EDE4D8] bg-[#FFF4E8]">
          <CardContent className="pt-4">
            <p className="text-xs font-semibold text-[#7A6A5A] uppercase">Balanço do Período</p>
            <p className="text-xl font-bold text-[#5C3A21] mt-1">
              {formatBRL(totalReceitas - totalDespesas)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-[#EDE4D8]">
        <CardHeader>
          <CardTitle className="text-base font-bold text-[#5C3A21]">
            Comparativo Estimado vs Real por Categoria
          </CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={compChartData}>
              <XAxis dataKey="name" stroke="#7A6A5A" fontSize={11} />
              <YAxis
                stroke="#7A6A5A"
                fontSize={12}
                tickFormatter={(v) => `R${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip formatter={(val: number) => formatBRL(val)} />
              <Bar dataKey="Estimado" fill="#8B5A2B" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Real" fill="#F97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-[#EDE4D8]">
        <CardHeader>
          <CardTitle className="text-base font-bold text-[#5C3A21] flex items-center gap-2">
            <Wallet className="w-5 h-5 text-[#F97316]" />
            Histórico de Lançamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lancamentos.length === 0 ? (
            <p className="text-center py-8 text-sm text-[#7A6A5A]">
              Nenhum lançamento cadastrado ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[#EDE4D8]">
                  <TableHead>Data</TableHead>
                  <TableHead>Oportunidade</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-center">Quem Pagou</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lancamentos.map((l) => (
                  <TableRow key={l.id} className="border-[#EDE4D8] hover:bg-[#FAF7F2]">
                    <TableCell className="text-xs text-[#7A6A5A]">{formatDate(l.data)}</TableCell>
                    <TableCell className="font-semibold text-[#2D1B0E]">
                      {l.expand?.oportunidade?.nome || 'Oportunidade'}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-medium ${l.tipo === 'Despesa' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}
                      >
                        {l.tipo}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{l.descricao}</TableCell>
                    <TableCell className="text-center">
                      {l.tipo === 'Despesa' && l.quem_pagou ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#FFF4E8] text-[#5C3A21] font-bold text-sm border border-[#EDE4D8]">
                          {l.quem_pagou}
                        </span>
                      ) : (
                        <span className="text-[#7A6A5A]">—</span>
                      )}
                    </TableCell>
                    <TableCell
                      className={`text-right font-bold ${l.tipo === 'Despesa' ? 'text-red-600' : 'text-green-600'}`}
                    >
                      {formatBRL(l.valor)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <LancamentoFormModal
                          oportunidades={oportunidades}
                          editLancamento={l}
                          onSuccess={loadData}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:bg-red-50"
                          onClick={() => handleDelete(l.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
