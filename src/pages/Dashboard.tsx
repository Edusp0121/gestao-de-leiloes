import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { DollarSign, TrendingUp, Percent, Building2, PlusCircle, ArrowUpRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getOportunidades, Oportunidade } from '@/services/oportunidades'
import { getLancamentos, Lancamento } from '@/services/lancamentos'
import { formatBRL, formatPercent, formatDateShort } from '@/lib/formatters'
import { StatusBadge } from '@/components/StatusBadge'
import { useRealtime } from '@/hooks/use-realtime'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts'
import { EXPENSE_CATEGORIES, categorizeExpense } from '@/lib/expense-categories'
import { calcTotalInvestido } from '@/lib/calculator-utils'

export default function Dashboard() {
  const [oportunidades, setOportunidades] = useState<Oportunidade[]>([])
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [loading, setLoading] = useState(true)
  const [chartOpId, setChartOpId] = useState<string>('all')

  const loadData = async () => {
    try {
      const [ops, lans] = await Promise.all([getOportunidades(), getLancamentos()])
      setOportunidades(ops)
      setLancamentos(lans)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('oportunidades', () => loadData())
  useRealtime('lancamentos', () => loadData())

  const totalInvestido = useMemo(() => {
    return oportunidades
      .filter((op) => op.status !== 'Em análise')
      .reduce((acc, op) => {
        const despesasOp = lancamentos
          .filter((l) => l.oportunidade === op.id && l.tipo === 'Despesa')
          .reduce((s, l) => s + l.valor, 0)
        return acc + calcTotalInvestido(op, despesasOp)
      }, 0)
  }, [oportunidades, lancamentos])

  const totalRealizado = useMemo(
    () =>
      oportunidades
        .filter((op) => op.status === 'Vendida')
        .reduce((acc, op) => acc + (op.valor_venda_com_desconto || op.valor_mercado || 0), 0),
    [oportunidades],
  )

  const retornoEstimadoTotal = useMemo(
    () =>
      oportunidades.reduce(
        (acc, op) => acc + (op.retorno_estimado || op.maior_lucro_esperado || 0),
        0,
      ),
    [oportunidades],
  )

  const roiMedio = useMemo(
    () =>
      oportunidades.length > 0
        ? oportunidades.reduce((acc, op) => acc + (op.roi_esperado_periodo || 0), 0) /
          oportunidades.length
        : 0,
    [oportunidades],
  )

  const chartDataBar = oportunidades.map((op) => ({
    name: op.nome.length > 15 ? op.nome.slice(0, 15) + '...' : op.nome,
    Investido: op.valor_arrematacao || 0,
    Retorno: op.retorno_estimado || op.maior_lucro_esperado || 0,
  }))

  const pieData = useMemo(() => {
    const filtered =
      chartOpId === 'all'
        ? lancamentos.filter((l) => l.tipo === 'Despesa')
        : lancamentos.filter((l) => l.oportunidade === chartOpId && l.tipo === 'Despesa')
    const catMap: Record<string, number> = {}
    EXPENSE_CATEGORIES.forEach((cat) => (catMap[cat] = 0))
    filtered.forEach((l) => {
      const cat = (l.categoria as string) || categorizeExpense(l.descricao)
      if (catMap[cat] !== undefined) catMap[cat] += l.valor
    })
    return Object.entries(catMap)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name, value }))
  }, [lancamentos, chartOpId])

  const PIE_COLORS = ['#F97316', '#8B5A2B', '#D97706', '#FBBF24', '#5C3A21']

  if (loading) {
    return (
      <div className="py-12 text-center text-[#7A6A5A] font-medium">
        Carregando painel financeiro...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#5C3A21]">Dashboard Executivo</h1>
          <p className="text-sm text-[#7A6A5A]">Visão consolidada do seu portfólio de leilões</p>
        </div>
        <Link to="/nova-analise">
          <Button className="bg-[#F97316] hover:bg-[#EA580C] text-white gap-2 font-medium shadow-md">
            <PlusCircle className="w-4 h-4" />
            Nova Análise de Viabilidade
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[#FFF4E8] border-[#EDE4D8] shadow-subtle hover:shadow-elevation transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-[#7A6A5A] uppercase tracking-wider">
              Total Investido
            </CardTitle>
            <div className="p-2 bg-[#5C3A21] text-white rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#5C3A21]">{formatBRL(totalInvestido)}</div>
            <p className="text-xs text-[#7A6A5A] mt-1">Entrada + Parcelas + Despesas</p>
          </CardContent>
        </Card>

        <Card className="bg-[#FFF4E8] border-[#EDE4D8] shadow-subtle hover:shadow-elevation transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-[#7A6A5A] uppercase tracking-wider">
              Total Realizado
            </CardTitle>
            <div className="p-2 bg-[#16A34A] text-white rounded-lg">
              <Building2 className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#16A34A]">{formatBRL(totalRealizado)}</div>
            <p className="text-xs text-[#7A6A5A] mt-1">Imóveis Vendidos</p>
          </CardContent>
        </Card>

        <Card className="bg-[#FFF4E8] border-[#EDE4D8] shadow-subtle hover:shadow-elevation transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-[#7A6A5A] uppercase tracking-wider">
              Retorno Estimado
            </CardTitle>
            <div className="p-2 bg-[#F97316] text-white rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#F97316]">
              {formatBRL(retornoEstimadoTotal)}
            </div>
            <p className="text-xs text-[#7A6A5A] mt-1">Lucro total previsto</p>
          </CardContent>
        </Card>

        <Card className="bg-[#FFF4E8] border-[#EDE4D8] shadow-subtle hover:shadow-elevation transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-[#7A6A5A] uppercase tracking-wider">
              ROI Médio Estimado
            </CardTitle>
            <div className="p-2 bg-[#8B5A2B] text-white rounded-lg">
              <Percent className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#8B5A2B]">{formatPercent(roiMedio)}</div>
            <p className="text-xs text-[#7A6A5A] mt-1">Média por oportunidade</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-[#EDE4D8]">
          <CardHeader>
            <CardTitle className="text-base font-bold text-[#5C3A21]">
              Investido vs Retorno Estimado por Oportunidade
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {chartDataBar.length > 0 ? (
              <ChartContainer
                config={{
                  Investido: { label: 'Investido', color: '#5C3A21' },
                  Retorno: { label: 'Retorno', color: '#F97316' },
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartDataBar}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <XAxis dataKey="name" stroke="#7A6A5A" fontSize={12} />
                    <YAxis
                      stroke="#7A6A5A"
                      fontSize={12}
                      tickFormatter={(v) => `R${(v / 1000).toFixed(0)}k`}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="Investido" fill="#5C3A21" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Retorno" fill="#F97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[#7A6A5A] text-sm">
                Nenhuma oportunidade cadastrada
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-[#EDE4D8]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold text-[#5C3A21]">
              Composição de Despesas
            </CardTitle>
            <Select value={chartOpId} onValueChange={setChartOpId}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {oportunidades.map((op) => (
                  <SelectItem key={op.id} value={op.id}>
                    {op.nome.length > 20 ? op.nome.slice(0, 20) + '...' : op.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="h-72 flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatBRL(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-[#7A6A5A] text-sm text-center">Nenhuma despesa registrada</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-[#EDE4D8]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold text-[#5C3A21]">
            Resumo das Oportunidades Cadastradas
          </CardTitle>
          <Link to="/nova-analise">
            <Button size="sm" className="bg-[#F97316] hover:bg-[#EA580C] text-white gap-2">
              <PlusCircle className="w-4 h-4" />
              Nova Análise
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {oportunidades.length === 0 ? (
            <div className="py-8 text-center space-y-3">
              <p className="text-[#7A6A5A]">Nenhuma oportunidade encontrada.</p>
              <Link to="/nova-analise">
                <Button className="bg-[#F97316] hover:bg-[#EA580C] text-white">
                  Cadastrar Primeira Oportunidade
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#EDE4D8]">
                    <TableHead className="text-[#5C3A21] font-semibold">Oportunidade</TableHead>
                    <TableHead className="text-[#5C3A21] font-semibold">Status</TableHead>
                    <TableHead className="text-[#5C3A21] font-semibold text-center">
                      Data Aquisição (MM/AA)
                    </TableHead>
                    <TableHead className="text-[#5C3A21] font-semibold text-right">
                      Valor Arrematação
                    </TableHead>
                    <TableHead className="text-[#5C3A21] font-semibold text-right">
                      Total Já Gasto
                    </TableHead>
                    <TableHead className="text-[#5C3A21] font-semibold text-right">
                      Venda Estimada
                    </TableHead>
                    <TableHead className="text-[#5C3A21] font-semibold text-right">
                      Retorno Estimado
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {oportunidades.map((op) => {
                    const despesasOp = lancamentos
                      .filter((l) => l.oportunidade === op.id && l.tipo === 'Despesa')
                      .reduce((acc, l) => acc + l.valor, 0)
                    const totalGasto = calcTotalInvestido(op, despesasOp)
                    return (
                      <TableRow
                        key={op.id}
                        className="hover:bg-[#FAF7F2] border-[#EDE4D8] transition-colors"
                      >
                        <TableCell className="font-semibold text-[#2D1B0E]">
                          <Link
                            to={`/oportunidade/${op.id}`}
                            className="hover:text-[#F97316] flex items-center gap-1 group"
                          >
                            <span>{op.nome}</span>
                            <ArrowUpRight className="w-3.5 h-3.5 text-[#7A6A5A] group-hover:text-[#F97316] transition-colors" />
                          </Link>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={op.status} />
                        </TableCell>
                        <TableCell className="text-center font-medium text-[#5C3A21]">
                          {formatDateShort(op.data_aquisicao)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatBRL(op.valor_arrematacao)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-amber-900">
                          {formatBRL(totalGasto)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatBRL(op.valor_venda_com_desconto || op.valor_mercado)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-[#16A34A]">
                          {formatBRL(op.retorno_estimado || op.maior_lucro_esperado)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
