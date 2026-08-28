import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Download, ArrowLeft, Trash2, Award, Eye, CalendarCheck } from 'lucide-react'
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
  toIdArray,
  canEditOp,
  canManageLancamentos,
  userRoleOnOp,
  getUsuarios,
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
  categorizeExpense,
  isVendaReceita,
  type ExpenseCategory,
} from '@/lib/expense-categories'
import { Filter, Users } from 'lucide-react'
import { calculateInstallment, calculateSaldoDevedor, FinancingParams } from '@/lib/financing-utils'
import {
  toNum,
  calcRetornoDinamico,
  calcRetornoReal,
  calcCapitalNecessario,
  getValorVendaReal,
  calcInvestimentoTotalEstimado,
  calcInvestimentoTotalReal,
  calcRoi,
} from '@/lib/calculator-utils'
import { primeiraLetraNome, sociosCobertosPorMarca } from '@/lib/participantes-utils'
import { Badge } from '@/components/ui/badge'
import pb from '@/lib/pocketbase/client'

export default function OportunidadeDetalhe() {
  const { id } = useParams<{ id: string }>()
  const [op, setOp] = useState<Oportunidade | null>(null)
  const [allOps, setAllOps] = useState<Oportunidade[]>([])
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [loading, setLoading] = useState(true)
  const [financingMethod, setFinancingMethod] = useState<'SAC' | 'PRICE'>('PRICE')
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | 'Todos'>('Todos')
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
      setFinancingMethod(op.modalidade_financiamento === 'SAC' ? 'SAC' : 'PRICE')
    }
  }, [op?.id])

  const filteredLancamentos = useMemo(() => {
    if (categoryFilter === 'Todos') return lancamentos
    return lancamentos.filter((l) => {
      const cat = (l.categoria as ExpenseCategory) || categorizeExpense(l.descricao)
      return cat === categoryFilter
    })
  }, [lancamentos, categoryFilter])

  const [usuariosCache, setUsuariosCache] = useState<
    Map<string, { id: string; name?: string; email?: string; admin?: boolean }>
  >(new Map())

  // Busca lista global de usuários se faltar nome/email nos expand do PocketBase
  useEffect(() => {
    if (!op) return
    const allUserIds = new Set<string>()
    if (op.usuario) allUserIds.add(op.usuario)
    toIdArray(op.participantes).forEach((id) => allUserIds.add(id))
    toIdArray(op.observadores).forEach((id) => allUserIds.add(id))

    if (allUserIds.size === 0) return

    getUsuarios()
      .then((usersList) => {
        const newCache = new Map<
          string,
          { id: string; name?: string; email?: string; admin?: boolean }
        >()
        usersList.forEach((u) => {
          if (u.id) {
            newCache.set(u.id, { id: u.id, name: u.name, email: u.email, admin: (u as any).admin })
          }
        })
        const missing = Array.from(allUserIds).filter((uid) => !newCache.has(uid))
        if (missing.length > 0) {
          Promise.all(
            missing.map((uid) =>
              pb
                .collection('users')
                .getOne(uid, { fields: 'id,name,email,admin' })
                .catch(() => null),
            ),
          ).then((results) => {
            results.forEach((u) => {
              if (u?.id) {
                newCache.set(u.id, {
                  id: u.id,
                  name: (u as any).name,
                  email: (u as any).email,
                  admin: (u as any).admin,
                })
              }
            })
            setUsuariosCache(newCache)
          })
        } else {
          setUsuariosCache(newCache)
        }
      })
      .catch(async () => {
        const fallback = new Map<
          string,
          { id: string; name?: string; email?: string; admin?: boolean }
        >()
        for (const uid of allUserIds) {
          try {
            const user = await pb.collection('users').getOne(uid, { fields: 'id,name,email,admin' })
            if (user) {
              fallback.set(user.id, {
                id: user.id,
                name: (user as any).name,
                email: (user as any).email,
                admin: (user as any).admin,
              })
            }
          } catch {
            /* ignora usuários inexistentes */
          }
        }
        setUsuariosCache(fallback)
      })
  }, [op])

  // Sócios PARTICIPANTES da oportunidade (observadores nunca entram no
  // rateio nem na lista de sócios). O Administrador ("Doulhe3") nunca participa do rateio.
  const participantesAtuais: { id: string; name?: string; email?: string; admin?: boolean }[] =
    useMemo(() => {
      if (!op) return []
      const knownUsers = new Map<
        string,
        { id: string; name?: string; email?: string; admin?: boolean }
      >()

      if (op.expand?.usuario?.id) {
        knownUsers.set(op.expand.usuario.id, {
          id: op.expand.usuario.id,
          name: op.expand.usuario.name,
          email: op.expand.usuario.email,
          admin: (op.expand.usuario as any).admin,
        })
      }
      if (Array.isArray(op.expand?.participantes)) {
        op.expand!.participantes.forEach((p) => {
          if (p?.id) {
            knownUsers.set(p.id, {
              id: p.id,
              name: p.name,
              email: p.email,
              admin: (p as any).admin,
            })
          }
        })
      }

      const allUserIds = new Set<string>()
      if (op.usuario) allUserIds.add(op.usuario)
      toIdArray(op.participantes).forEach((id) => allUserIds.add(id))

      return Array.from(allUserIds)
        .map((id) => {
          const fromExpand = knownUsers.get(id)
          const fromCache = usuariosCache.get(id)
          const name = fromExpand?.name || fromCache?.name
          const email = fromExpand?.email || fromCache?.email
          const isAdmin = fromExpand?.admin || fromCache?.admin
          return { id, name, email, admin: isAdmin }
        })
        .filter((u) => !u.admin && u.name !== 'Doulhe3')
    }, [op, usuariosCache])

  // Observadores da oportunidade (apenas para exibição).
  const observadoresAtuais: { id: string; name?: string; email?: string }[] = useMemo(() => {
    if (!op) return []
    const knownUsers = new Map<string, { id: string; name?: string; email?: string }>()
    if (Array.isArray(op.expand?.observadores)) {
      op.expand!.observadores.forEach((p) => {
        if (p?.id) knownUsers.set(p.id, { id: p.id, name: p.name, email: p.email })
      })
    }

    return toIdArray(op.observadores).map((id) => {
      const fromExpand = knownUsers.get(id)
      const fromCache = usuariosCache.get(id)
      const name = fromExpand?.name || fromCache?.name
      const email = fromExpand?.email || fromCache?.email
      return { id, name, email }
    })
  }, [op, usuariosCache])

  // Permissões: observadores não editam nem gerenciam lançamentos.
  const podeEditar = op ? canEditOp(op) : false
  const podeGerenciarLancamentos = op ? canManageLancamentos(op) : false
  const isObserver = op ? userRoleOnOp(op) === 'observer' : false

  // Rateio de despesas por sócio: soma o valor de cada despesa dividido
  // igualmente entre os sócios cobertos pela marca "quem_pagou".
  const rateioPorSocio = useMemo(() => {
    const totalSocios = participantesAtuais.length
    const acc: Record<string, { valor: number; nome: string; letra: string }> = {}
    participantesAtuais.forEach((p) => {
      acc[p.id] = {
        valor: 0,
        nome: p.name || p.email || 'Sócio',
        letra: primeiraLetraNome(p.name || p.email || '?'),
      }
    })
    const despesas = lancamentos.filter((l) => l.tipo === 'Despesa')
    despesas.forEach((l) => {
      const cobertos = sociosCobertosPorMarca(l.quem_pagou, totalSocios)
      if (cobertos <= 0 || totalSocios === 0) return
      const parte = l.valor / cobertos
      // "A" = 2 sócios; "T" = todos; letra individual = sócio com aquela letra.
      if (l.quem_pagou === 'A' || l.quem_pagou === 'T') {
        participantesAtuais.forEach((p) => {
          if (acc[p.id]) acc[p.id].valor += parte
        })
      } else if (l.quem_pagou) {
        const alvo = participantesAtuais.find(
          (p) => primeiraLetraNome(p.name || p.email || '?') === l.quem_pagou,
        )
        if (alvo && acc[alvo.id]) acc[alvo.id].valor += l.valor
      }
    })
    Object.keys(acc).forEach((k) => {
      acc[k].valor = Math.round(acc[k].valor * 100) / 100
    })
    return acc
  }, [lancamentos, participantesAtuais])

  const totalDespesasRateio = useMemo(
    () => lancamentos.filter((l) => l.tipo === 'Despesa').reduce((acc, l) => acc + l.valor, 0),
    [lancamentos],
  )

  if (loading || !op) {
    return <div className="py-12 text-center text-[#7A6A5A]">Carregando detalhes...</div>
  }

  const isBestRoi = allOps.every(
    (other) => (op.roi_esperado_periodo || 0) >= (other.roi_esperado_periodo || 0),
  )
  const totalInvestidoReal = lancamentos
    .filter((l) => l.tipo === 'Despesa' && !isVendaReceita(l.descricao))
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
  // A categoria "Venda" (ex.: valor de venda/locação) é uma receita cujo valor
  // é muito maior que as despesas das demais categorias e "rouba" a visualização
  // do gráfico comparativo. Por isso ela é excluída apenas do gráfico — os
  // cálculos, cards e demais fluxos continuam usando `estimatedCosts`/`realCosts`
  // completos (incluindo "Venda").
  const compChartData = EXPENSE_CATEGORIES.filter((cat) => cat !== 'Venda').map((cat) => ({
    name: cat,
    Estimado: Math.round((estimatedCosts[cat] ?? 0) * 100) / 100,
    Real: Math.round((realCosts[cat] ?? 0) * 100) / 100,
  }))

  const annualRate =
    op.taxa_juros_financiamento && op.taxa_juros_financiamento > 0 ? op.taxa_juros_financiamento : 8
  const financingParams: FinancingParams = {
    principal: op.valor_arrematacao || 101200,
    annualRate: annualRate,
    termMonths: op.prazo_financiamento || 120,
    paymentsMade: (op.parcelas_pagas || 0) + (op.tempo_estimado_venda_meses || 0),
    method: financingMethod,
    entryPercent: op.percentual_entrada || 10,
    correcaoMensal: op.indice_correcao_medio_mensal || 0,
  }
  const calculatedInstallment = calculateInstallment(financingParams)
  const calculatedSaldoDevedor = calculateSaldoDevedor(financingParams)

  // Total Despesas Reais: soma de todos os lançamentos de despesa da oportunidade
  const totalDespesasReais = lancamentos
    .filter((l) => l.tipo === 'Despesa')
    .reduce((acc, l) => acc + l.valor, 0)

  // Valor Real de Venda lançado nos registros
  const valorVendaRealLancado = getValorVendaReal(lancamentos)
  const temVendaReal = valorVendaRealLancado > 0

  // Retorno Estimado Dinâmico:
  // Retorno Estimado = Venda − (max(despesas reais, estimadas) + comissão + saldo devedor)
  const retornoEstimadoCalculado = calcRetornoDinamico(
    { ...op, saldo_devedor: calculatedSaldoDevedor },
    totalDespesasReais,
  )
  const retornoEstimadoExibido = Math.round(retornoEstimadoCalculado * 100) / 100

  // Investimento Total Estimado = max(despesas reais, despesas estimadas) + comissão + saldo devedor
  const investimentoTotalEstimado = calcInvestimentoTotalEstimado(
    { ...op, saldo_devedor: calculatedSaldoDevedor },
    totalDespesasReais,
  )
  // ROI Estimado = (Retorno Estimado / Investimento Total Estimado) × 100
  const roiEstimado = calcRoi(retornoEstimadoExibido, investimentoTotalEstimado)

  // Retorno Real:
  // Retorno Real = Valor de Venda − (Despesas Reais + Comissão de Venda + Saldo Devedor)
  // Onde Valor de Venda usa o valor real quando houver lançamento real, senão o estimado.
  const retornoRealCalculado = calcRetornoReal(
    { ...op, saldo_devedor: calculatedSaldoDevedor },
    totalDespesasReais,
    temVendaReal ? valorVendaRealLancado : undefined,
  )
  const retornoRealExibido = Math.round(retornoRealCalculado * 100) / 100

  // Investimento Total Real = despesas reais + comissão de venda + saldo devedor
  const investimentoTotalReal = calcInvestimentoTotalReal(
    { ...op, saldo_devedor: calculatedSaldoDevedor },
    totalDespesasReais,
    temVendaReal ? valorVendaRealLancado : undefined,
  )
  // ROI Real = (Retorno Real / Investimento Total Real) × 100
  const roiReal = calcRoi(retornoRealExibido, investimentoTotalReal)

  // Total Investido (Previsto): apenas o capital necessário estimado das
  // categorias (sem saldo devedor remanescente).
  const totalInvestidoPrevisto = (() => {
    const opComSaldo = { ...op, saldo_devedor: calculatedSaldoDevedor }
    const capital = calcCapitalNecessario(opComSaldo as any)
    return Math.round(capital * 100) / 100
  })()

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
            {op.uf && (
              <Badge variant="outline" className="text-[#5C3A21] border-[#EDE4D8] font-bold">
                {op.uf}
              </Badge>
            )}
            <StatusBadge status={op.status} />
            {isBestRoi && (
              <span className="bg-[#F97316] text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                <Award className="w-3.5 h-3.5" /> MELHOR ROI
              </span>
            )}
          </div>
          <p className="text-sm text-[#7A6A5A]">{op.endereco}</p>
          {participantesAtuais.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <Users className="w-3.5 h-3.5 text-[#7A6A5A]" />
              <span className="text-xs text-[#7A6A5A]">Participantes:</span>
              {participantesAtuais.map((p) => (
                <Badge
                  key={p.id}
                  variant="secondary"
                  className="bg-[#DCFCE7] text-[#166534] border border-[#86EFAC] gap-1"
                >
                  <span className="font-bold text-[#16A34A]">
                    {primeiraLetraNome(p.name || p.email || '?')}
                  </span>
                  {p.name || p.email || 'Sócio'}
                </Badge>
              ))}
            </div>
          )}
          {observadoresAtuais.length > 0 && (
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <Eye className="w-3.5 h-3.5 text-[#7A6A5A]" />
              <span className="text-xs text-[#7A6A5A]">Observadores:</span>
              {observadoresAtuais.map((p) => (
                <Badge
                  key={p.id}
                  variant="secondary"
                  className="bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1] gap-1"
                >
                  {p.name || p.email || 'Observador'}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link to={`/oportunidade/${op.id}/checklist`}>
            <Button className="bg-[#F97316] hover:bg-[#EA580C] text-white shadow-sm gap-2">
              <CalendarCheck className="w-4 h-4" /> Checklist Pós-Arrematação
            </Button>
          </Link>
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
          {podeEditar && (
            <Link to={`/nova-analise/${op.id}`}>
              <Button
                variant="outline"
                className="border-[#EDE4D8] text-[#5C3A21] hover:bg-[#FFF4E8]"
              >
                Editar Oportunidade
              </Button>
            </Link>
          )}
          {podeGerenciarLancamentos && (
            <LancamentoFormModal
              oportunidades={allOps}
              defaultOportunidadeId={op.id}
              onSuccess={loadData}
              triggerText="Adicionar Lançamento"
            />
          )}
          {isObserver && (
            <span className="inline-flex items-center gap-1 text-xs text-[#64748B] bg-[#F1F5F9] border border-[#CBD5E1] px-2.5 py-1 rounded-full">
              <Eye className="w-3.5 h-3.5" /> Modo observador (somente leitura)
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-white border-[#EDE4D8]">
          <CardContent className="pt-4">
            <p className="text-xs text-[#7A6A5A] uppercase font-semibold">
              Valor Total Investido (Previsto)
            </p>
            <p className="text-xl font-bold text-[#5C3A21] mt-1">
              {formatBRL(totalInvestidoPrevisto)}
            </p>
            <p className="text-xs text-[#7A6A5A] mt-0.5">Capital estimado das categorias</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#EDE4D8]">
          <CardContent className="pt-4">
            <p className="text-xs text-[#7A6A5A] uppercase font-semibold">
              Valor Total Investido (Real)
            </p>
            <p className="text-xl font-bold text-[#5C3A21] mt-1">{formatBRL(totalInvestidoReal)}</p>
            <p className="text-xs text-amber-700 mt-0.5">
              {
                lancamentos.filter((l) => l.tipo === 'Despesa' && !isVendaReceita(l.descricao))
                  .length
              }{' '}
              despesas registradas
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-white border-[#EDE4D8]">
          <CardContent className="pt-4">
            <p className="text-xs text-[#7A6A5A] uppercase font-semibold">Retorno Estimado</p>
            <p className="text-xl font-bold text-[#16A34A] mt-1">
              {formatBRL(retornoEstimadoExibido)}
            </p>
            <div className="mt-2 pt-2 border-t border-[#EDE4D8]/60 flex items-center justify-between">
              <span className="text-xs text-[#7A6A5A] font-medium">ROI Estimado:</span>
              <span className="text-sm font-bold text-[#F97316]">
                {roiEstimado !== null ? formatPercent(roiEstimado) : '—'}
              </span>
            </div>
            <p className="text-[11px] text-[#7A6A5A] mt-0.5">
              Sobre investimento total estimado ({formatBRL(investimentoTotalEstimado)})
            </p>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#EDE4D8]">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#7A6A5A] uppercase font-semibold">Retorno Real</p>
              {temVendaReal && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded">
                  Venda real lançada
                </span>
              )}
            </div>
            <p className="text-xl font-bold text-[#16A34A] mt-1">{formatBRL(retornoRealExibido)}</p>
            <div className="mt-2 pt-2 border-t border-[#EDE4D8]/60 flex items-center justify-between">
              <span className="text-xs text-[#7A6A5A] font-medium">ROI Real:</span>
              <span className="text-sm font-bold text-[#F97316]">
                {roiReal !== null ? formatPercent(roiReal) : '—'}
              </span>
            </div>
            <p className="text-[11px] text-[#7A6A5A] mt-0.5">
              {temVendaReal
                ? `Venda Real (${formatBRL(valorVendaRealLancado)}) − Investimento (${formatBRL(investimentoTotalReal)})`
                : `Venda Estimada (${formatBRL(op.valor_venda_com_desconto || op.valor_mercado)}) − Investimento (${formatBRL(investimentoTotalReal)})`}
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
            <div className="flex justify-between py-1 border-b border-[#EDE4D8]">
              <span className="text-[#7A6A5A]">Valor estimado de venda:</span>
              <span className="font-semibold text-[#2D1B0E]">
                {formatBRL(op.valor_venda_com_desconto || op.valor_mercado)}
                {op.desagio_venda ? (
                  <span className="text-xs font-normal text-gray-500 ml-1.5">
                    (deságio {op.desagio_venda}%)
                  </span>
                ) : null}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-[#EDE4D8]">
              <span className="text-[#7A6A5A]">Modalidade:</span>
              {podeEditar ? (
                <Select
                  value={financingMethod}
                  onValueChange={(v) => setFinancingMethod(v as 'SAC' | 'PRICE')}
                >
                  <SelectTrigger className="w-28 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRICE">Price</SelectItem>
                    <SelectItem value="SAC">SAC</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <span className="font-semibold">{financingMethod === 'SAC' ? 'SAC' : 'Price'}</span>
              )}
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
              <span className="font-semibold">{formatPercent(annualRate)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#7A6A5A]">Tempo Estimado Venda:</span>
              <span className="font-semibold">{op.tempo_estimado_venda_meses || 10} meses</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {participantesAtuais.length >= 1 && totalDespesasRateio > 0 && (
        <Card className="border-[#EDE4D8] bg-[#FFF4E8]/50">
          <CardHeader>
            <CardTitle className="text-base font-bold text-[#5C3A21] flex items-center gap-2">
              <Users className="w-5 h-5 text-[#F97316]" />
              Rateio de Despesas por Participante
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(rateioPorSocio).map(([pid, info]) => {
                const percent =
                  totalDespesasRateio > 0 ? (info.valor / totalDespesasRateio) * 100 : 0
                return (
                  <div
                    key={pid}
                    className="p-4 bg-white rounded-lg border border-[#EDE4D8] flex items-center gap-3"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#F97316] text-white font-bold">
                      {info.letra}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#5C3A21] truncate">{info.nome}</p>
                      <p className="text-lg font-bold text-[#2D1B0E]">{formatBRL(info.valor)}</p>
                      <p className="text-xs text-[#7A6A5A]">{percent.toFixed(1)}% do total</p>
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-[#7A6A5A] mt-3">
              Total de despesas considerado no rateio: {formatBRL(totalDespesasRateio)}. Letras
              individuais atribuem o valor integral ao sócio; “A” (ambos) / “T” (todos) dividem
              igualmente entre os sócios cobertos.
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="border-[#EDE4D8]">
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-base font-bold text-[#5C3A21]">
            Lançamentos da Oportunidade ({lancamentos.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-[#7A6A5A]" />
              <Select
                value={categoryFilter}
                onValueChange={(v) => setCategoryFilter(v as ExpenseCategory | 'Todos')}
              >
                <SelectTrigger className="w-40 h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredLancamentos.length === 0 ? (
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
                  <TableHead className="text-center">Quem Pagou</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLancamentos.map((l) => (
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
                    <TableCell className="text-center">
                      {l.tipo === 'Despesa' && l.quem_pagou ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#FFF4E8] text-[#5C3A21] font-bold text-sm border border-[#EDE4D8]">
                          {l.quem_pagou}
                        </span>
                      ) : (
                        <span className="text-[#7A6A5A]">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-bold">{formatBRL(l.valor)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {podeGerenciarLancamentos ? (
                          <>
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
                          </>
                        ) : (
                          <span className="text-xs text-[#7A6A5A]">—</span>
                        )}
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
