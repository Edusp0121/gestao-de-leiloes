import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Printer,
  CheckCircle2,
  XCircle,
  TrendingUp,
  DollarSign,
  Clock,
  Calendar,
  AlertTriangle,
  FileText,
  Building,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { getOportunidade, Oportunidade } from '@/services/oportunidades'
import { getChecklistByOportunidade, Checklist } from '@/services/checklists'
import {
  getFechamentoByOportunidade,
  getFechamentoLancamentos,
  Fechamento,
  FechamentoLancamento,
  FECHAMENTO_LANCAMENTO_TIPOS,
} from '@/services/fechamentos'
import { formatBRL, formatPercent1, formatDate } from '@/lib/formatters'
import {
  EXPENSE_CATEGORIES,
  ExpenseCategory,
  getEstimatedCostsByCategory,
} from '@/lib/expense-categories'
import { toNum, calcRetornoDinamico, calcSaldoDevedorFinanciamento } from '@/lib/calculator-utils'
import { useToast } from '@/hooks/use-toast'

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  Aquisição: '#8B5A2B',
  Encargos: '#D97706',
  Desocupação: '#F97316',
  Mensais: '#0284C7',
  Venda: '#16A34A',
}

export default function RelatorioFinal() {
  const { id } = useParams<{ id: string }>()
  const { toast } = useToast()
  const [op, setOp] = useState<Oportunidade | null>(null)
  const [checklist, setChecklist] = useState<Checklist | null>(null)
  const [fechamento, setFechamento] = useState<Fechamento | null>(null)
  const [lancamentos, setLancamentos] = useState<FechamentoLancamento[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    async function carregarDados() {
      try {
        const [opData, checkData, fechData] = await Promise.all([
          getOportunidade(id!),
          getChecklistByOportunidade(id!),
          getFechamentoByOportunidade(id!),
        ])
        setOp(opData)
        setChecklist(checkData)
        setFechamento(fechData)

        if (fechData) {
          const lans = await getFechamentoLancamentos(fechData.id)
          setLancamentos(lans)
        }
      } catch (err) {
        console.error('Erro ao carregar relatório:', err)
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os dados do relatório final.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }
    carregarDados()
  }, [id])

  // Estimativas do cadastro
  const estimatedByCategory = useMemo(() => {
    return getEstimatedCostsByCategory(op)
  }, [op])

  // Custos reais calculados por categoria a partir do fechamento ou dos lançamentos do fechamento
  const realByCategory = useMemo(() => {
    const res: Record<ExpenseCategory, number> = {
      Aquisição: 0,
      Encargos: 0,
      Desocupação: 0,
      Mensais: 0,
      Venda: 0,
    }

    if (fechamento?.custos_reais_categoria) {
      EXPENSE_CATEGORIES.forEach((cat) => {
        res[cat] = toNum(fechamento.custos_reais_categoria?.[cat])
      })
      return res
    }

    // Fallback: agrupa pelos lançamentos do fechamento
    lancamentos.forEach((l) => {
      const tipoMeta = FECHAMENTO_LANCAMENTO_TIPOS.find((t) => t.value === l.tipo)
      const cat = tipoMeta ? tipoMeta.categoria : 'Mensais'
      res[cat] += toNum(l.valor)
    })

    return res
  }, [fechamento, lancamentos])

  // Cálculos de Venda, Lucro, Despesas e ROI
  const financeiro = useMemo(() => {
    if (!op) {
      return {
        vendaEstimada: 0,
        vendaReal: 0,
        despesasEstimadas: 0,
        despesasReais: 0,
        saldoDevedor: 0,
        comissaoEstimada: 0,
        comissaoReal: 0,
        lucroEstimado: 0,
        lucroReal: 0,
        roiEstimado: 0,
        roiReal: 0,
        roiAlvo: 0,
        bateuRoi: false,
        tempoEstimadoMeses: 0,
        tempoRealMeses: 0,
        bateuTempo: false,
      }
    }

    const valorMercado = toNum(op.valor_mercado)
    const vendaEstimada = toNum(op.valor_venda_com_desconto) || valorMercado
    const vendaReal =
      toNum(fechamento?.valor_real_negociado) || toNum(op.valor_venda_real) || vendaEstimada

    const comissaoPercent =
      op.comissao_corretor_percent != null && (op.comissao_corretor_percent as any) !== ''
        ? toNum(op.comissao_corretor_percent)
        : 6
    const comissaoEstimada = (comissaoPercent / 100) * vendaEstimada
    const comissaoReal = (comissaoPercent / 100) * vendaReal

    const saldoDevedor = calcSaldoDevedorFinanciamento(op)

    // Total de despesas (Aquisição + Encargos + Desocupação + Mensais)
    const despesasEstimadas =
      toNum(estimatedByCategory.Aquisição) +
      toNum(estimatedByCategory.Encargos) +
      toNum(estimatedByCategory.Desocupação) +
      toNum(estimatedByCategory.Mensais)

    const despesasReais =
      toNum(realByCategory.Aquisição) +
      toNum(realByCategory.Encargos) +
      toNum(realByCategory.Desocupação) +
      toNum(realByCategory.Mensais)

    // Lucro = Venda - (Despesas + Comissão + Saldo Devedor)
    const lucroEstimado = calcRetornoDinamico(op)
    const lucroReal =
      Math.round((vendaReal - (despesasReais + comissaoReal + saldoDevedor)) * 100) / 100

    // ROI = (Lucro / Despesas) * 100
    const roiEstimado =
      despesasEstimadas > 0 ? Math.round((lucroEstimado / despesasEstimadas) * 1000) / 10 : 0
    const roiReal = despesasReais > 0 ? Math.round((lucroReal / despesasReais) * 1000) / 10 : 0
    // Meta de ROI: usa op.roi_alvo cadastrado, com fallback para op.roi_esperado_periodo ou roiEstimado
    const roiAlvo =
      op.roi_alvo != null && Number(op.roi_alvo) > 0
        ? Number(op.roi_alvo)
        : toNum(op.roi_esperado_periodo) || roiEstimado
    const bateuRoi = roiReal >= roiAlvo

    // Tempo em meses com 1 casa decimal
    const tempoEstimadoMeses = toNum(op.tempo_estimado_venda_meses) || 10

    // Data de início (arrematação) e fim (venda)
    const dataInicioStr = checklist?.data_arremate || op.data_aquisicao || op.created
    const dataFimStr = fechamento?.data_venda || new Date().toISOString()

    let tempoRealMeses = tempoEstimadoMeses
    if (dataInicioStr && dataFimStr) {
      const dtInicio = new Date(dataInicioStr).getTime()
      const dtFim = new Date(dataFimStr).getTime()
      const diffDias = Math.max(0, (dtFim - dtInicio) / (1000 * 60 * 60 * 24))
      tempoRealMeses = Math.round((diffDias / 30.4375) * 10) / 10
    }
    const bateuTempo = tempoRealMeses <= tempoEstimadoMeses

    return {
      vendaEstimada,
      vendaReal,
      despesasEstimadas,
      despesasReais,
      saldoDevedor,
      comissaoEstimada,
      comissaoReal,
      lucroEstimado,
      lucroReal,
      roiEstimado,
      roiReal,
      roiAlvo,
      bateuRoi,
      tempoEstimadoMeses,
      tempoRealMeses,
      bateuTempo,
    }
  }, [op, fechamento, checklist, estimatedByCategory, realByCategory])

  // Gráfico de Barras Duplas (Comparativo de Venda, Lucro e Custos por Categoria)
  const barChartData = useMemo(() => {
    return [
      {
        categoria: 'Valor de Venda',
        Estimado: Math.round(financeiro.vendaEstimada * 100) / 100,
        Real: Math.round(financeiro.vendaReal * 100) / 100,
      },
      {
        categoria: 'Lucro Líquido',
        Estimado: Math.round(financeiro.lucroEstimado * 100) / 100,
        Real: Math.round(financeiro.lucroReal * 100) / 100,
      },
      {
        categoria: 'Aquisição',
        Estimado: Math.round(estimatedByCategory.Aquisição * 100) / 100,
        Real: Math.round(realByCategory.Aquisição * 100) / 100,
      },
      {
        categoria: 'Encargos',
        Estimado: Math.round(estimatedByCategory.Encargos * 100) / 100,
        Real: Math.round(realByCategory.Encargos * 100) / 100,
      },
      {
        categoria: 'Desocupação',
        Estimado: Math.round(estimatedByCategory.Desocupação * 100) / 100,
        Real: Math.round(realByCategory.Desocupação * 100) / 100,
      },
      {
        categoria: 'Mensais',
        Estimado: Math.round(estimatedByCategory.Mensais * 100) / 100,
        Real: Math.round(realByCategory.Mensais * 100) / 100,
      },
    ]
  }, [financeiro, estimatedByCategory, realByCategory])

  // Gráfico de Donut da composição do custo real (% por categoria)
  const donutData = useMemo(() => {
    const cats: ExpenseCategory[] = ['Aquisição', 'Encargos', 'Desocupação', 'Mensais', 'Venda']
    const total = cats.reduce((acc, c) => acc + toNum(realByCategory[c]), 0)

    return cats
      .map((cat) => {
        const val = toNum(realByCategory[cat])
        const pct = total > 0 ? Math.round((val / total) * 1000) / 10 : 0
        return {
          name: cat,
          value: val,
          percent: pct,
          color: CATEGORY_COLORS[cat],
        }
      })
      .filter((item) => item.value > 0)
  }, [realByCategory])

  // Linha do tempo automática com os marcos principais
  const timelineMilestones = useMemo(() => {
    // 10 marcos canônicos exigidos pelo fluxo de encerramento
    const marcos = [
      {
        id: 'arrematacao',
        titulo: 'Arrematação do Imóvel',
        data: checklist?.data_arremate || op?.data_aquisicao,
        valor: toNum(op?.valor_arrematacao),
      },
      {
        id: 'lance',
        titulo: 'Pagamento do Lance / Entrada',
        data: checklist?.data_pagamento_lance,
        valor:
          lancamentos.find((l) => l.tipo === 'lance' || l.tipo === 'entrada')?.valor ||
          (op?.modalidade_financiamento === 'À Vista'
            ? toNum(op?.valor_arrematacao)
            : (toNum(op?.percentual_entrada || 10) / 100) * toNum(op?.valor_arrematacao)),
      },
      {
        id: 'leiloeiro',
        titulo: 'Pagamento da Comissão do Leiloeiro',
        data: checklist?.data_pagamento_leiloeiro,
        valor:
          lancamentos.find((l) => l.tipo === 'leiloeiro')?.valor ||
          (toNum(op?.comissao_leiloeiro_percent || 5) / 100) * toNum(op?.valor_arrematacao),
      },
      {
        id: 'itbi',
        titulo: 'Pagamento do ITBI',
        data: checklist?.data_pagamento_itbi,
        valor:
          lancamentos.find((l) => l.tipo === 'ITBI')?.valor ||
          ((toNum(op?.itbi_percent) || 3) / 100) *
            (toNum(op?.valor_prefeitura_venal) || toNum(op?.valor_arrematacao)),
      },
      {
        id: 'escritura',
        titulo: 'Escritura Pública',
        data: checklist?.data_pagamento_escritura,
        valor: lancamentos.find((l) => l.tipo === 'escritura')?.valor || toNum(op?.escritura),
      },
      {
        id: 'registro',
        titulo: 'Registro e Averbação',
        data: checklist?.data_pagamento_registro_averbacao,
        valor:
          lancamentos.find((l) => l.tipo === 'registro')?.valor ||
          toNum(op?.registro) + toNum(op?.averbacao),
      },
      {
        id: 'contato_ocupante',
        titulo: 'Contato com Ocupante',
        data: checklist?.data_contato_ocupante || checklist?.data_notificacao_ocupante,
        valor: lancamentos.find((l) => l.tipo === 'contato ocupante')?.valor || 0,
      },
      {
        id: 'desocupacao',
        titulo: 'Desocupação / Imissão de Posse',
        data: checklist?.data_imissao_posse || checklist?.data_processo_imissao_posse,
        valor:
          lancamentos.find((l) => l.tipo === 'desocupacao')?.valor ||
          toNum(op?.acordo_desocupacao) + toNum(op?.taxas_judiciais),
      },
      {
        id: 'reforma',
        titulo: 'Reforma do Imóvel',
        data: checklist?.data_termino_reforma || checklist?.data_inicio_reforma,
        valor: lancamentos.find((l) => l.tipo === 'reforma')?.valor || toNum(op?.reforma_prevista),
      },
      {
        id: 'venda',
        titulo: 'Venda / Escritura do Comprador',
        data: fechamento?.data_venda || checklist?.data_contrato_compra_venda,
        valor: financeiro.vendaReal,
      },
    ]

    return marcos
  }, [checklist, op, lancamentos, fechamento, financeiro])

  // Tabela detalhada de itens com comparação e divergências
  const tabelaComparativa = useMemo(() => {
    const itens = [
      {
        item: 'Receita Bruta de Venda',
        categoria: 'Venda' as ExpenseCategory,
        estimado: financeiro.vendaEstimada,
        real: financeiro.vendaReal,
      },
      {
        item: 'Aquisição (Lance + Leiloeiro)',
        categoria: 'Aquisição' as ExpenseCategory,
        estimado: estimatedByCategory.Aquisição,
        real: realByCategory.Aquisição,
      },
      {
        item: 'Encargos (ITBI, Escritura, Registro)',
        categoria: 'Encargos' as ExpenseCategory,
        estimado: estimatedByCategory.Encargos,
        real: realByCategory.Encargos,
      },
      {
        item: 'Desocupação e Reforma',
        categoria: 'Desocupação' as ExpenseCategory,
        estimado: estimatedByCategory.Desocupação,
        real: realByCategory.Desocupação,
      },
      {
        item: 'Custos Mensais (Condomínio, IPTU, Parcelas)',
        categoria: 'Mensais' as ExpenseCategory,
        estimado: estimatedByCategory.Mensais,
        real: realByCategory.Mensais,
      },
      {
        item: 'Comissão de Venda (Corretagem)',
        categoria: 'Venda' as ExpenseCategory,
        estimado: financeiro.comissaoEstimada,
        real: financeiro.comissaoReal,
      },
      {
        item: 'Saldo Devedor / Quitação Financiamento',
        categoria: 'Mensais' as ExpenseCategory,
        estimado: financeiro.saldoDevedor,
        real: financeiro.saldoDevedor,
      },
    ]

    return itens.map((i) => {
      const difReais = i.real - i.estimado
      const difPct = i.estimado > 0 ? (difReais / i.estimado) * 100 : 0
      return {
        ...i,
        difReais,
        difPct,
      }
    })
  }, [financeiro, estimatedByCategory, realByCategory])

  if (loading) {
    return <div className="py-12 text-center text-[#7A6A5A]">Carregando Relatório Final...</div>
  }

  if (!op) {
    return (
      <div className="py-12 text-center">
        <p className="text-red-600 font-bold">Oportunidade não encontrada.</p>
        <Link to="/" className="text-xs text-[#F97316] underline mt-2 block">
          Voltar ao Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 print:max-w-none print:m-0 print:p-0">
      {/* Botões de Ação Topo (ocultos na impressão) */}
      <div className="flex items-center justify-between gap-4 print:hidden">
        <Link
          to={`/oportunidade/${op.id}`}
          className="text-xs text-[#F97316] font-medium flex items-center gap-1 hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao Detalhe da Oportunidade
        </Link>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => window.print()}
            className="bg-[#5C3A21] hover:bg-[#432A18] text-white gap-2 shadow-sm"
          >
            <Printer className="w-4 h-4" /> Imprimir / Salvar PDF
          </Button>
        </div>
      </div>

      {/* CABEÇALHO DO DOCUMENTO (visual limpo pronto para impressão) */}
      <div className="bg-white border border-[#EDE4D8] rounded-xl p-6 shadow-sm print:shadow-none print:border-b-2 print:border-b-[#5C3A21] print:rounded-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EDE4D8] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Building className="w-6 h-6 text-[#F97316]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#7A6A5A]">
                Gestão de Leilões Imobiliários • Relatório Final
              </span>
            </div>
            <h1 className="text-2xl font-black text-[#5C3A21] mt-1">{op.nome}</h1>
            <p className="text-xs text-[#7A6A5A] mt-0.5">{op.endereco}</p>
          </div>
          <div className="text-right flex flex-col sm:items-end">
            <Badge className="bg-[#16A34A] text-white font-bold text-xs uppercase px-3 py-1">
              Investimento Concluído
            </Badge>
            <span className="text-[11px] text-[#7A6A5A] mt-1">
              Data de Emissão: {formatDate(new Date().toISOString())}
            </span>
            {fechamento?.data_venda && (
              <span className="text-[11px] font-semibold text-[#5C3A21]">
                Data da Venda: {formatDate(fechamento.data_venda)}
              </span>
            )}
          </div>
        </div>

        {/* CARDS DE RESUMO: LUCRO, ROI E TEMPO (Estimado vs Real) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {/* CARD 1: LUCRO LÍQUIDO */}
          <div className="p-4 rounded-xl border border-[#EDE4D8] bg-[#FFF4E8]/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#7A6A5A] uppercase tracking-wide flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-[#F97316]" /> Lucro Líquido
              </span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  financeiro.lucroReal >= financeiro.lucroEstimado
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {financeiro.lucroReal >= financeiro.lucroEstimado
                  ? `+${formatBRL(financeiro.lucroReal - financeiro.lucroEstimado)}`
                  : `-${formatBRL(financeiro.lucroEstimado - financeiro.lucroReal)}`}
              </span>
            </div>
            <div className="mt-3">
              <span className="text-xs text-[#7A6A5A] block">Realizado:</span>
              <span className="text-2xl font-black text-[#16A34A]">
                {formatBRL(financeiro.lucroReal)}
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-[#EDE4D8] flex items-center justify-between text-xs text-[#7A6A5A]">
              <span>Estimado:</span>
              <span className="font-bold text-[#5C3A21]">
                {formatBRL(financeiro.lucroEstimado)}
              </span>
            </div>
          </div>

          {/* CARD 2: RETORNO SOBRE O INVESTIMENTO (ROI) COM META */}
          <div className="p-4 rounded-xl border border-[#EDE4D8] bg-[#FFF4E8]/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#7A6A5A] uppercase tracking-wide flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-[#F97316]" /> Retorno (ROI)
              </span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  financeiro.bateuRoi
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {financeiro.bateuRoi ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Meta Atingida
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5" /> Abaixo da Meta
                  </>
                )}
              </span>
            </div>
            <div className="mt-3">
              <span className="text-xs text-[#7A6A5A] block">ROI Real no Período:</span>
              <span className="text-2xl font-black text-[#F97316]">
                {formatPercent1(financeiro.roiReal)}
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-[#EDE4D8] flex items-center justify-between text-xs text-[#7A6A5A]">
              <span>ROI-Alvo Cadastrado:</span>
              <span className="font-bold text-[#5C3A21]">{formatPercent1(financeiro.roiAlvo)}</span>
            </div>
          </div>

          {/* CARD 3: TEMPO TOTAL DO INVESTIMENTO */}
          <div className="p-4 rounded-xl border border-[#EDE4D8] bg-[#FFF4E8]/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#7A6A5A] uppercase tracking-wide flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#F97316]" /> Tempo de Ciclo
              </span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  financeiro.bateuTempo
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {financeiro.bateuTempo ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> No Prazo
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" /> Prazo Estendido
                  </>
                )}
              </span>
            </div>
            <div className="mt-3">
              <span className="text-xs text-[#7A6A5A] block">Tempo Real de Venda:</span>
              <span className="text-2xl font-black text-[#5C3A21]">
                {financeiro.tempoRealMeses.toFixed(1).replace('.', ',')} meses
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-[#EDE4D8] flex items-center justify-between text-xs text-[#7A6A5A]">
              <span>Tempo Estimado:</span>
              <span className="font-bold text-[#5C3A21]">
                {financeiro.tempoEstimadoMeses.toFixed(1).replace('.', ',')} meses
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO DE GRÁFICOS: BARRAS DUPLAS E DONUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:grid-cols-12">
        {/* Gráfico de Barras Duplas: Venda, Lucro e Custos */}
        <Card className="lg:col-span-7 border-[#EDE4D8] shadow-sm print:col-span-7 print:shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-[#5C3A21] uppercase tracking-wide">
              Comparativo Geral: Estimado vs Real (R$)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <XAxis
                  dataKey="categoria"
                  stroke="#7A6A5A"
                  fontSize={10}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis
                  stroke="#7A6A5A"
                  fontSize={10}
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip formatter={(val: number) => formatBRL(val)} />
                <Legend
                  verticalAlign="top"
                  wrapperStyle={{ paddingBottom: '8px', fontSize: '11px' }}
                />
                <Bar dataKey="Estimado" fill="#8B5A2B" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Real" fill="#F97316" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Donut: Composição do Custo Real */}
        <Card className="lg:col-span-5 border-[#EDE4D8] shadow-sm print:col-span-5 print:shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-[#5C3A21] uppercase tracking-wide">
              Composição do Custo Real (%)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72 flex flex-col justify-center items-center">
            {donutData.length === 0 ? (
              <p className="text-xs text-[#7A6A5A]">Nenhum custo registrado para exibição.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: number) => [
                      `${formatBRL(val)} (${donutData.find((d) => d.value === val)?.percent || 0}%)`,
                      'Valor',
                    ]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* LINHA DO TEMPO AUTOMÁTICA DOS MARCOS */}
      <Card className="border-[#EDE4D8] shadow-sm print:shadow-none print:break-inside-avoid">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-[#5C3A21] uppercase tracking-wide flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#F97316]" /> Linha do Tempo dos Marcos do
            Investimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative border-l-2 border-[#EDE4D8] ml-4 pl-6 space-y-6">
            {timelineMilestones.map((milestone, idx) => {
              const temData = Boolean(milestone.data)
              return (
                <div key={milestone.id} className="relative">
                  {/* Ponto na linha */}
                  <div
                    className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm flex items-center justify-center ${
                      temData ? 'bg-[#F97316]' : 'bg-gray-300'
                    }`}
                  >
                    {temData && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <h4 className="text-xs font-bold text-[#2D1B0E]">
                        {idx + 1}. {milestone.titulo}
                      </h4>
                      <p className="text-[11px] text-[#7A6A5A]">
                        {milestone.data ? formatDate(milestone.data) : 'Data não registrada'}
                      </p>
                    </div>
                    {milestone.valor > 0 && (
                      <span className="text-xs font-bold text-[#5C3A21] bg-[#FFF4E8] px-2 py-0.5 rounded border border-[#EDE4D8]">
                        {formatBRL(milestone.valor)}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* TABELA COMPARATIVA DETALHADA ITEM A ITEM */}
      <Card className="border-[#EDE4D8] shadow-sm print:shadow-none print:break-inside-avoid">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-[#5C3A21] uppercase tracking-wide flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#F97316]" /> Tabela Detalhada Item a Item (Estimado
            vs Real)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-[#EDE4D8]/30">
              <TableRow>
                <TableHead className="text-xs">Item / Categoria</TableHead>
                <TableHead className="text-xs text-right">Estimado</TableHead>
                <TableHead className="text-xs text-right">Real</TableHead>
                <TableHead className="text-xs text-right">Diferença (R$)</TableHead>
                <TableHead className="text-xs text-right">Variação (%)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tabelaComparativa.map((linha, idx) => {
                const isPositivo = linha.difReais > 0
                const isZero = Math.abs(linha.difReais) < 0.01
                return (
                  <TableRow key={idx} className="hover:bg-[#FFF4E8]/20">
                    <TableCell className="text-xs font-semibold text-[#2D1B0E]">
                      {linha.item}
                    </TableCell>
                    <TableCell className="text-xs text-right text-[#7A6A5A]">
                      {formatBRL(linha.estimado)}
                    </TableCell>
                    <TableCell className="text-xs text-right font-bold text-[#5C3A21]">
                      {formatBRL(linha.real)}
                    </TableCell>
                    <TableCell
                      className={`text-xs text-right font-semibold ${
                        isZero ? 'text-gray-500' : isPositivo ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {isZero ? '—' : `${isPositivo ? '+' : ''}${formatBRL(linha.difReais)}`}
                    </TableCell>
                    <TableCell
                      className={`text-xs text-right font-semibold ${
                        isZero ? 'text-gray-500' : isPositivo ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {isZero ? '0%' : `${isPositivo ? '+' : ''}${linha.difPct.toFixed(1)}%`}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* SEÇÃO DE DIVERGÊNCIAS E OBSERVAÇÕES */}
      <Card className="border-[#EDE4D8] shadow-sm print:shadow-none print:break-inside-avoid">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold text-[#5C3A21] uppercase tracking-wide flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#F97316]" /> Análise de Divergências e
            Observações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-[#FFF4E8]/50 border border-[#EDE4D8] rounded-lg space-y-2 text-xs text-[#5C3A21]">
            <p className="font-semibold text-[#2D1B0E]">Principais Conclusões do Encerramento:</p>
            <ul className="list-disc pl-5 space-y-1 text-[#7A6A5A]">
              <li>
                <strong>Resultado Financeiro:</strong> O lucro líquido alcançado foi de{' '}
                <span className="font-bold text-[#16A34A]">{formatBRL(financeiro.lucroReal)}</span>{' '}
                (estimado: {formatBRL(financeiro.lucroEstimado)}).
              </li>
              <li>
                <strong>Desempenho de ROI:</strong> O retorno sobre as despesas investidas foi de{' '}
                <span className="font-bold text-[#F97316]">
                  {formatPercent1(financeiro.roiReal)}
                </span>{' '}
                {financeiro.bateuRoi ? 'superando' : 'ficando abaixo d'}a meta cadastrada de{' '}
                {formatPercent1(financeiro.roiAlvo)}.
              </li>
              <li>
                <strong>Ciclo de Tempo:</strong> A operação foi finalizada em{' '}
                <span className="font-bold">
                  {financeiro.tempoRealMeses.toFixed(1).replace('.', ',')} meses
                </span>{' '}
                (prazo projetado: {financeiro.tempoEstimadoMeses.toFixed(1).replace('.', ',')}{' '}
                meses).
              </li>
            </ul>
          </div>

          {fechamento?.observacoes && (
            <div className="p-4 bg-white border border-[#EDE4D8] rounded-lg text-xs space-y-1">
              <span className="font-bold text-[#5C3A21] uppercase tracking-wider block">
                Notas Registradas no Fechamento:
              </span>
              <p className="text-[#2D1B0E] whitespace-pre-wrap">{fechamento.observacoes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* RODAPÉ DE ASSINATURA PARA IMPRESSÃO */}
      <div className="hidden print:block pt-12 mt-8 border-t border-[#EDE4D8] text-xs text-center text-[#7A6A5A]">
        <div className="flex justify-around items-end pt-8">
          <div className="w-64 border-t border-gray-400 pt-1 text-center font-semibold">
            Responsável pela Operação
          </div>
          <div className="w-64 border-t border-gray-400 pt-1 text-center font-semibold">
            Sócio / Participante
          </div>
        </div>
        <p className="mt-6 text-[10px] text-gray-500">
          Documento gerado automaticamente pelo Sistema de Gestão de Leilões em{' '}
          {new Date().toLocaleDateString('pt-BR')}.
        </p>
      </div>
    </div>
  )
}
