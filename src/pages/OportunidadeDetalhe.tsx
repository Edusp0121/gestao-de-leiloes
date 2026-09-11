import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Download,
  ArrowLeft,
  Trash2,
  Award,
  Eye,
  CalendarCheck,
  CheckCircle2,
  FileCheck,
  DollarSign,
  RotateCcw,
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
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
  canReabrirInvestimento,
  userRoleOnOp,
  getUsuarios,
  Oportunidade,
} from '@/services/oportunidades'
import { getLancamentos, deleteLancamento, Lancamento } from '@/services/lancamentos'
import { getChecklistByOportunidade, Checklist } from '@/services/checklists'
import {
  getFechamentoByOportunidade,
  getFechamentoLancamentos,
  Fechamento,
  FechamentoLancamento,
  reabrirInvestimento,
} from '@/services/fechamentos'
import { EncerramentoModal } from '@/components/EncerramentoModal'
import { formatBRL, formatPercent, formatPercent1, formatDate } from '@/lib/formatters'
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
  isAluguelReceita,
  type ExpenseCategory,
} from '@/lib/expense-categories'
import { Filter, Users } from 'lucide-react'
import { calculateInstallment, calculateSaldoDevedor, FinancingParams } from '@/lib/financing-utils'
import {
  toNum,
  calcRetornoDinamico,
  calcRetornoReal,
  calcCapitalNecessario,
  calcInvestimentoTotalEstimado,
  calcInvestimentoTotalReal,
  calcRoi,
  calcRoiAnual,
  getSociosParticipantesOp,
  calcRateioDespesasPorSocioOp,
  calcLanceTetoInverso,
} from '@/lib/calculator-utils'
import { primeiraLetraNome } from '@/lib/participantes-utils'
import { Badge } from '@/components/ui/badge'
import pb from '@/lib/pocketbase/client'

export default function OportunidadeDetalhe() {
  const { id } = useParams<{ id: string }>()
  const [op, setOp] = useState<Oportunidade | null>(null)
  const [allOps, setAllOps] = useState<Oportunidade[]>([])
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [checklist, setChecklist] = useState<Checklist | null>(null)
  const [fechamento, setFechamento] = useState<Fechamento | null>(null)
  const [fechamentoLancamentos, setFechamentoLancamentos] = useState<FechamentoLancamento[]>([])
  const [modalEncerramentoOpen, setModalEncerramentoOpen] = useState(false)
  const [reabrindo, setReabrindo] = useState(false)
  const [loading, setLoading] = useState(true)
  const [financingMethod, setFinancingMethod] = useState<'SAC' | 'PRICE'>('PRICE')
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | 'Todos'>('Todos')
  const { toast } = useToast()

  const loadData = async () => {
    if (!id) return
    try {
      const [item, lans, list, check, fech] = await Promise.all([
        getOportunidade(id),
        getLancamentos(id),
        getOportunidades(),
        getChecklistByOportunidade(id),
        getFechamentoByOportunidade(id),
      ])
      setOp(item)
      setLancamentos(lans)
      setAllOps(list)
      setChecklist(check)
      setFechamento(fech)

      if (fech) {
        const fechLans = await getFechamentoLancamentos(fech.id)
        setFechamentoLancamentos(fechLans)
      } else {
        setFechamentoLancamentos([])
      }
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
  const participantesAtuais = useMemo(() => {
    if (!op) return []
    return getSociosParticipantesOp(op, usuariosCache)
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
  // Reabertura de investimento: apenas admin + dono (criador da oportunidade)
  const role = op ? userRoleOnOp(op) : 'none'
  const podeReabrir = role === 'admin' || role === 'creator'

  // Rateio de despesas por sócio usando a função compartilhada de calculator-utils.
  const rateioPorSocio = useMemo(() => {
    if (!op) return {}
    return calcRateioDespesasPorSocioOp(op, lancamentos, participantesAtuais)
  }, [op, lancamentos, participantesAtuais])

  const totalDespesasRateio = useMemo(
    () => lancamentos.filter((l) => l.tipo === 'Despesa').reduce((acc, l) => acc + l.valor, 0),
    [lancamentos],
  )

  const annualRate =
    op && op.taxa_juros_financiamento && op.taxa_juros_financiamento > 0
      ? op.taxa_juros_financiamento
      : 8

  // Cálculo inverso do Lance Teto com base no ROI-alvo
  const lanceTetoCalculado = useMemo(() => {
    if (!op) return null
    return calcLanceTetoInverso({
      valor_mercado: op.valor_mercado,
      valor_arrematacao: op.valor_arrematacao,
      desagio_venda: op.desagio_venda,
      tempo_estimado_venda_meses: op.tempo_estimado_venda_meses,
      itbi_percent: op.itbi_percent,
      comissao_leiloeiro_percent: op.comissao_leiloeiro_percent,
      comissao_corretor_percent: op.comissao_corretor_percent,
      escritura: op.escritura,
      registro: op.registro,
      averbacao: op.averbacao,
      reforma_prevista: op.reforma_prevista,
      assessoria_juridica: op.assessoria_juridica,
      condominio_iptu_mensal: op.condominio_iptu_mensal,
      dividas_condominio: op.dividas_condominio,
      dividas_iptu: op.dividas_iptu,
      ir_percent: op.ir_percent,
      incluir_ir_despesas: op.incluir_ir_despesas,
      taxa_avaliacao: op.taxa_avaliacao,
      taxas_judiciais: op.taxas_judiciais,
      acordo_desocupacao: op.acordo_desocupacao,
      baixa_gravames: op.baixa_gravames,
      foro: op.foro,
      valor_prefeitura_venal: op.valor_prefeitura_venal,
      roi_alvo: op.roi_alvo,
      modalidade_financiamento: financingMethod,
      taxa_juros_financiamento: annualRate,
      prazo_financiamento: op.prazo_financiamento,
      parcelas_pagas: op.parcelas_pagas,
      percentual_entrada: op.percentual_entrada,
      indice_correcao_medio_mensal: op.indice_correcao_medio_mensal,
    })
  }, [op, financingMethod, annualRate])

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

  const handleReabrirInvestimento = async () => {
    if (!op) return
    setReabrindo(true)
    try {
      await reabrirInvestimento(op.id)
      toast({
        title: 'Investimento Reaberto',
        description: 'O fechamento foi removido e a oportunidade voltou para Em andamento.',
      })
      await loadData()
    } catch (err: any) {
      console.error('Erro ao reabrir investimento:', err)
      toast({
        title: 'Erro ao reabrir investimento',
        description: err?.message || 'Não foi possível desfazer o encerramento.',
        variant: 'destructive',
      })
    } finally {
      setReabrindo(false)
    }
  }

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

  const financingParams: FinancingParams = {
    principal: op.valor_arrematacao || 101200,
    annualRate: annualRate,
    termMonths: op.prazo_financiamento || 120,
    paymentsMade: op.parcelas_pagas || 0,
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

  // Valor de Venda Real & Valor Estimado de Venda
  const valorEstimadoVenda = toNum(op.valor_venda_com_desconto) || toNum(op.valor_mercado)
  const valorVendaRealCadastrado = toNum(op.valor_venda_real)
  const temVendaReal = valorVendaRealCadastrado > 0
  const valorVendaRealUsado = temVendaReal ? valorVendaRealCadastrado : valorEstimadoVenda

  // Retorno Estimado:
  // Retorno Estimado = Venda − (despesas estimadas + comissão + saldo devedor)
  const retornoEstimadoCalculado = calcRetornoDinamico({
    ...op,
    saldo_devedor: calculatedSaldoDevedor,
  })
  const retornoEstimadoExibido = Math.round(retornoEstimadoCalculado * 100) / 100

  // Despesas Estimadas -> Divisor do ROI Estimado
  const despesasEstimadasDivisor = calcInvestimentoTotalEstimado({
    ...op,
    saldo_devedor: calculatedSaldoDevedor,
  })
  // ROI Estimado = (Retorno Estimado / Despesas Estimadas) × 100
  const roiEstimado = calcRoi(retornoEstimadoExibido, despesasEstimadasDivisor)

  // Receitas de aluguel/locação da oportunidade
  const totalReceitasAluguel = lancamentos
    .filter((l) => isAluguelReceita(l))
    .reduce((acc, l) => acc + toNum(l.valor), 0)

  // Comissão de venda real lançada (categoria Venda, tipo Despesa)
  const comissaoRealLancadaObj = lancamentos.find(
    (l) =>
      l.tipo === 'Despesa' &&
      (l.categoria === 'Venda' ||
        (l.descricao || '').toLowerCase().includes('corretagem') ||
        (l.descricao || '').toLowerCase().includes('corretor')),
  )
  const comissaoRealLancada = comissaoRealLancadaObj ? toNum(comissaoRealLancadaObj.valor) : null

  // Retorno Real:
  // Retorno Real = valorVendaRealUsado + receitasAluguel − (despesas reais + comissão de venda + saldo devedor)
  // Onde valorVendaRealUsado = op.valor_venda_real > 0 ? op.valor_venda_real : valorEstimadoVenda
  const retornoRealCalculado = calcRetornoReal(
    { ...op, saldo_devedor: calculatedSaldoDevedor },
    totalDespesasReais,
    totalReceitasAluguel,
    comissaoRealLancada,
  )
  const retornoRealExibido = Math.round(retornoRealCalculado * 100) / 100

  // Despesas Reais = soma dos lançamentos de despesa -> Divisor do ROI Real
  const despesasReaisDivisor = calcInvestimentoTotalReal(
    { ...op, saldo_devedor: calculatedSaldoDevedor },
    totalDespesasReais,
  )
  // ROI Real = (Retorno Real / Despesas Reais) × 100
  const roiReal = calcRoi(retornoRealExibido, despesasReaisDivisor)

  // ROI anual: Projeção linear sobre o tempo estimado de venda (ROI período × 12 / tempo_estimado_venda_meses)
  // Se o campo estiver vazio ou <= 0, retorna null (exibido como "—").
  const tempoEstimadoMeses = op.tempo_estimado_venda_meses
  const roiAnualEstimado = calcRoiAnual(roiEstimado, tempoEstimadoMeses)
  const roiAnualReal = calcRoiAnual(roiReal, tempoEstimadoMeses)

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

          {/* Botão/Badge: Ver Relatório Final se encerrada, ou Encerrar Investimento */}
          {fechamento || op.status === 'Vendida' ? (
            <div className="flex items-center gap-2">
              {fechamento && (
                <Link to={`/oportunidade/${op.id}/relatorio`}>
                  <Button className="bg-[#16A34A] hover:bg-[#15803D] text-white shadow-sm gap-2">
                    <FileCheck className="w-4 h-4" /> Ver Relatório Final
                  </Button>
                </Link>
              )}
              {podeEditar && fechamento && (
                <Button
                  variant="outline"
                  onClick={() => setModalEncerramentoOpen(true)}
                  className="border-[#16A34A] text-[#16A34A] hover:bg-[#DCFCE7] text-xs h-9"
                >
                  Editar Fechamento
                </Button>
              )}
              {podeReabrir && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={reabrindo}
                      className="border-amber-600 text-amber-700 hover:bg-amber-50 text-xs h-9 gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                      {reabrindo ? 'Reabrindo...' : 'Reabrir Investimento'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-white border-[#EDE4D8]">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-[#5C3A21]">
                        Reabrir Investimento?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-[#7A6A5A] text-sm">
                        Isso excluirá o fechamento e os lançamentos de encerramento e devolverá o
                        leilão para Andamento. Continuar?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="border-[#EDE4D8] text-[#5C3A21]">
                        Cancelar
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleReabrirInvestimento}
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        Confirmar e Reabrir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          ) : (
            podeEditar && (
              <Button
                onClick={() => setModalEncerramentoOpen(true)}
                className="bg-[#5C3A21] hover:bg-[#432A18] text-white shadow-sm gap-2"
              >
                <DollarSign className="w-4 h-4 text-[#F97316]" /> Encerrar Investimento
              </Button>
            )
          )}

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-white border-[#EDE4D8]">
          <CardContent className="pt-4 space-y-2">
            <div>
              <p className="text-xs text-[#7A6A5A] uppercase font-semibold">Retorno Estimado</p>
              <p className="text-2xl font-bold text-[#16A34A] mt-1">
                {formatBRL(retornoEstimadoExibido)}
              </p>
            </div>
            <div className="pt-2 border-t border-[#EDE4D8]/60 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#7A6A5A] font-medium">ROI no período:</span>
                <span className="text-sm font-bold text-[#F97316]">
                  {roiEstimado !== null ? formatPercent1(roiEstimado) : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#7A6A5A] font-medium">ROI anual:</span>
                <span className="text-sm font-bold text-[#F97316]">
                  {roiAnualEstimado !== null ? formatPercent1(roiAnualEstimado) : '—'}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-[#7A6A5A] pt-1">
              Sobre despesas estimadas ({formatBRL(despesasEstimadasDivisor)})
            </p>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#EDE4D8]">
          <CardContent className="pt-4 space-y-2">
            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#7A6A5A] uppercase font-semibold">Retorno Real</p>
                {temVendaReal && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded">
                    Venda Real Definida
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-[#16A34A] mt-1">
                {formatBRL(retornoRealExibido)}
              </p>
            </div>
            <div className="pt-2 border-t border-[#EDE4D8]/60 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#7A6A5A] font-medium">ROI no período:</span>
                <span className="text-sm font-bold text-[#F97316]">
                  {roiReal !== null ? formatPercent1(roiReal) : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#7A6A5A] font-medium">ROI anual:</span>
                <span className="text-sm font-bold text-[#F97316]">
                  {roiAnualReal !== null ? formatPercent1(roiAnualReal) : '—'}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-[#7A6A5A] pt-1">
              {totalReceitasAluguel > 0
                ? `${temVendaReal ? `Venda Real (${formatBRL(valorVendaRealUsado)})` : `Venda Estimada (${formatBRL(valorEstimadoVenda)})`} + Aluguel (${formatBRL(totalReceitasAluguel)}) − Despesas (${formatBRL(despesasReaisDivisor)})`
                : temVendaReal
                  ? `Venda Real (${formatBRL(valorVendaRealUsado)}) − Despesas (${formatBRL(despesasReaisDivisor)})`
                  : `Venda Estimada (${formatBRL(valorEstimadoVenda)}) − Despesas (${formatBRL(despesasReaisDivisor)})`}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#EDE4D8] flex flex-col justify-between">
          <CardContent className="pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#7A6A5A] uppercase font-semibold">Lance Teto Máximo</p>
              {op.roi_alvo ? (
                <Badge
                  variant="outline"
                  className="text-[#8B5A2B] border-[#EDE4D8] font-bold text-[10px]"
                >
                  Meta: {op.roi_alvo}%
                </Badge>
              ) : null}
            </div>
            {lanceTetoCalculado?.atingivel && lanceTetoCalculado.lanceTeto !== null ? (
              <>
                <p className="text-2xl font-bold text-[#8B5A2B] mt-1">
                  {formatBRL(lanceTetoCalculado.lanceTeto)}
                </p>
                <div className="pt-2 border-t border-[#EDE4D8]/60 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#7A6A5A]">ROI no Teto:</span>
                    <span className="font-bold text-[#16A34A]">
                      {lanceTetoCalculado.roiObtidoNoTeto !== undefined
                        ? formatPercent1(lanceTetoCalculado.roiObtidoNoTeto)
                        : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#7A6A5A]">Lucro no Teto:</span>
                    <span className="font-semibold text-[#5C3A21]">
                      {lanceTetoCalculado.lucroEsperadoNoTeto !== undefined
                        ? formatBRL(lanceTetoCalculado.lucroEsperadoNoTeto)
                        : '—'}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-[#7A6A5A] pt-1">
                  Maior arrematação possível considerando todos os custos estimados.
                </p>
              </>
            ) : (
              <div className="py-2">
                <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3 text-xs space-y-1">
                  <p className="font-semibold">Aviso de Viabilidade</p>
                  <p className="text-amber-800">
                    {lanceTetoCalculado?.motivo ||
                      'Não há lance que alcance o ROI-alvo com os parâmetros atuais.'}
                  </p>
                </div>
                {!op.roi_alvo && podeEditar && (
                  <Link to={`/nova-analise/${op.id}`}>
                    <Button variant="link" className="p-0 h-auto text-xs text-[#F97316] mt-2">
                      Definir ROI-alvo na edição →
                    </Button>
                  </Link>
                )}
              </div>
            )}
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
                {formatBRL(valorEstimadoVenda)}
                {op.desagio_venda ? (
                  <span className="text-xs font-normal text-gray-500 ml-1.5">
                    (deságio {op.desagio_venda}%)
                  </span>
                ) : null}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#EDE4D8]">
              <span className="text-[#7A6A5A]">Valor de Venda Real:</span>
              <span className="font-semibold text-[#2D1B0E]">
                {op.valor_venda_real != null && op.valor_venda_real > 0 ? (
                  formatBRL(op.valor_venda_real)
                ) : (
                  <span className="text-xs font-normal text-gray-400">
                    Não informado (usa estimado)
                  </span>
                )}
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
      {/* Modal de Encerramento */}
      <EncerramentoModal
        open={modalEncerramentoOpen}
        onOpenChange={setModalEncerramentoOpen}
        oportunidade={op}
        checklist={checklist}
        lancamentos={lancamentos}
        fechamentoExistente={fechamento}
        fechamentoLancamentosExistentes={fechamentoLancamentos}
        onSuccess={loadData}
      />
    </div>
  )
}
