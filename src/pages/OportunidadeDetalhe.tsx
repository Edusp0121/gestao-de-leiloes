import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Download, ArrowLeft, Trash2, Award } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  getOportunidades,
  getOportunidade,
  getRelatorioUrl,
  Oportunidade,
} from '@/services/oportunidades'
import { getLancamentos, deleteLancamento, Lancamento } from '@/services/lancamentos'
import { formatBRL, formatPercent, formatDate } from '@/lib/formatters'
import { StatusBadge } from '@/components/StatusBadge'
import { LancamentoFormModal } from '@/components/LancamentoFormModal'
import { useToast } from '@/hooks/use-toast'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import {
  EXPENSE_CATEGORIES,
  getEstimatedCostsByCategory,
  getRealCostsByCategory,
} from '@/lib/expense-categories'
import { calculateInstallment, calculateSaldoDevedor, FinancingParams } from '@/lib/financing-utils'

export default function OportunidadeDetalhe() {
  const { id } = useParams<{ id: string }>()
  const [op, setOp] = useState<Oportunidade | null>(null)
  const [allOps, setAllOps] = useState<Oportunidade[]>([])
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [loading, setLoading] = useState(true)
  const [financingMethod, setFinancingMethod] = useState<'SAC' | 'PRICE'>('SAC')
  const { toast } = useToast()

  const loadData = async () => {
    if (!id) return
    try {
      const [item, lans, list] = await Promise.all([
        getOportunidade(id),
        getLancamentos(id),
        getOportunidades(),
      ])
      setOp(item)
      setLancamentos(lans)
      setAllOps(list)
    } catch {
      toast({ title: 'Erro', description: 'Oportunidade não encontrada.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  useEffect(() => {
    if (op) {
      setFinancingMethod(op.modalidade_financiamento === 'PRICE' ? 'PRICE' : 'SAC')
    }
  }, [op?.id])

  if (loading || !op) {
    return <div className="py-12 text-center text-[#7A6A5A]">Carregando detalhes...</div>
  }

  const isBestRoi = allOps.every(
    (other) => (op.roi_esperado_periodo || 0) >= (other.roi_esperado_periodo || 0),
  )
  const totalInvestidoReal = lancamentos
    .filter((l) => l.tipo === 'Despesa')
    .reduce((acc, l) => acc + l.valor, 0)

  const relatorioUrl = getRelatorioUrl(op)

  const handleDeleteLancamento = async (lancId: string) => {
    try {
      await deleteLancamento(lancId)
      toast({ title: 'Removido', description: 'Lançamento excluído com sucesso.' })
      loadData()
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o lançamento.',
        variant: 'destructive',
      })
    }
  }

  const estimatedCosts = getEstimatedCostsByCategory(op)
  const realCosts = getRealCostsByCategory(lancamentos)
  const compChartData = EXPENSE_CATEGORIES.map((cat) => ({
    name: cat,
    Estimado: Math.round(estimatedCosts[cat] * 100) / 100,
    Real: Math.round(realCosts[cat] * 100) / 100,
  }))

  const financingParams: FinancingParams = {
    principal: op.valor_arrematacao || 0,
    annualRate: op.taxa_juros_financiamento || 0,
    termMonths: op.tempo_estimado_venda_meses || 10,
    paymentsMade: op.parcelas_pagas || 0,
    method: financingMethod,
  }
  const calculatedInstallment = calculateInstallment(financingParams)
  const calculatedSaldoDevedor = calculateSaldoDevedor(financingParams)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/"
            className="text-xs text-[#F97316] font-medium flex items-center gap-1 mb-1 hover:underline"
          >
            <ArrowLeft className="w-3 h-3" /> Voltar ao Dashboard
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-[#5C3A21]">{op.nome}</h1>
            <StatusBadge status={op.status} />
            {isBestRoi && (
              <span className="bg-[#F97316] text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                <Award className="w-3.5 h-3.5" /> MELHOR ROI
              </span>
            )}
          </div>
          <p className="text-sm text-[#7A6A5A]">{op.endereco}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {relatorioUrl && (
            <a href={relatorioUrl} target="_blank" rel="noreferrer">
              <Button
                variant="outline"
                className="border-[#F97316] text-[#F97316] hover:bg-[#FFF4E8] gap-2"
              >
                <Download className="w-4 h-4" /> Baixar Relatório
              </Button>
            </a>
          )}
          <LancamentoFormModal
            oportunidades={allOps}
            defaultOportunidadeId={op.id}
            onSuccess={loadData}
            triggerText="Adicionar Lançamento"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-[#EDE4D8]">
          <CardContent className="pt-4">
            <p className="text-xs text-[#7A6A5A] uppercase font-semibold">
              Valor Total Investido (Real)
            </p>
            <p className="text-xl font-bold text-[#5C3A21] mt-1">{formatBRL(totalInvestidoReal)}</p>
            <p className="text-xs text-amber-700 mt-0.5">
              {lancamentos.filter((l) => l.tipo === 'Despesa').length} despesas registradas
            </p>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#EDE4D8]">
          <CardContent className="pt-4">
            <p className="text-xs text-[#7A6A5A] uppercase font-semibold">
              Valor Estimado de Venda
            </p>
            <p className="text-xl font-bold text-[#2D1B0E] mt-1">
              {formatBRL(op.valor_venda_com_desconto || op.valor_mercado)}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Deságio de {op.desagio_venda || 0}%</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#EDE4D8]">
          <CardContent className="pt-4">
            <p className="text-xs text-[#7A6A5A] uppercase font-semibold">Retorno Estimado</p>
            <p className="text-xl font-bold text-[#16A34A] mt-1">
              {formatBRL(op.retorno_estimado || op.maior_lucro_esperado)}
            </p>
            <p className="text-xs text-green-700 mt-0.5">Lucro esperado</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#EDE4D8]">
          <CardContent className="pt-4">
            <p className="text-xs text-[#7A6A5A] uppercase font-semibold">ROI no Período / Anual</p>
            <p className="text-xl font-bold text-[#F97316] mt-1">
              {formatPercent(op.roi_esperado_periodo)}
            </p>
            <p className="text-xs text-[#8B5A2B] mt-0.5">
              Anualizado: {formatPercent(op.roi_esperado_anualizado)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            <CardTitle className="text-base font-bold text-[#5C3A21]">
              Financiamento e Prazos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-1 border-b border-[#EDE4D8]">
              <span className="text-[#7A6A5A]">Modalidade:</span>
              <Select
                value={financingMethod}
                onValueChange={(v) => setFinancingMethod(v as 'SAC' | 'PRICE')}
              >
                <SelectTrigger className="w-28 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SAC">SAC</SelectItem>
                  <SelectItem value="PRICE">Price</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-between py-1 border-b border-[#EDE4D8]">
              <span className="text-[#7A6A5A]">Valor da Parcela Mensal:</span>
              <span className="font-semibold">{formatBRL(calculatedInstallment)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#EDE4D8]">
              <span className="text-[#7A6A5A]">Saldo Devedor Atual:</span>
              <span className="font-semibold">{formatBRL(calculatedSaldoDevedor)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#EDE4D8]">
              <span className="text-[#7A6A5A]">Condomínio + IPTU Mensal:</span>
              <span className="font-semibold">{formatBRL(op.condominio_iptu_mensal)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#EDE4D8]">
              <span className="text-[#7A6A5A]">Taxa de Juros (anual):</span>
              <span className="font-semibold">{formatPercent(op.taxa_juros_financiamento)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#7A6A5A]">Tempo Estimado Venda:</span>
              <span className="font-semibold">{op.tempo_estimado_venda_meses || 10} meses</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-[#EDE4D8]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold text-[#5C3A21]">
            Lançamentos da Oportunidade ({lancamentos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lancamentos.length === 0 ? (
            <p className="text-sm text-[#7A6A5A] text-center py-6">
              Nenhuma despesa ou receita lançada.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[#EDE4D8]">
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lancamentos.map((l) => (
                  <TableRow key={l.id} className="border-[#EDE4D8]">
                    <TableCell className="text-xs text-[#7A6A5A]">{formatDate(l.data)}</TableCell>
                    <TableCell>
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-medium ${l.tipo === 'Despesa' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}
                      >
                        {l.tipo}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium text-[#2D1B0E]">{l.descricao}</TableCell>
                    <TableCell className="text-right font-bold">{formatBRL(l.valor)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <LancamentoFormModal
                          oportunidades={allOps}
                          editLancamento={l}
                          onSuccess={loadData}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:bg-red-50"
                          onClick={() => handleDeleteLancamento(l.id)}
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
