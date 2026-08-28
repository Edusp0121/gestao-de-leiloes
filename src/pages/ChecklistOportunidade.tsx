import React, { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Save,
  Check,
  AlertCircle,
  Sparkles,
  Info,
  CalendarCheck,
  Eye,
  ListTodo,
  TrendingUp,
  Printer,
  FileText,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { StatusBadge } from '@/components/StatusBadge'
import { getOportunidade, Oportunidade, userRoleOnOp } from '@/services/oportunidades'
import {
  getChecklistByOportunidade,
  saveChecklist,
  CHECKLIST_ITEMS_CONFIG,
  Checklist,
  ChecklistDates,
  ChecklistToggles,
  ChecklistItemMeta,
} from '@/services/checklists'

// Agrupamento por categorias para organizar a aba de preenchimento
const CATEGORIAS = [
  'Aquisição & Documentação',
  'Prefeitura & Condomínio',
  'Desocupação & Posse',
  'Reforma',
  'Venda & Recebimento',
] as const

export default function ChecklistOportunidade() {
  const { id } = useParams<{ id: string }>()
  const { toast } = useToast()

  const [op, setOp] = useState<Oportunidade | null>(null)
  const [checklist, setChecklist] = useState<Checklist | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Estado do formulário
  const [formData, setFormData] = useState<
    ChecklistDates & ChecklistToggles & { observacoes: string }
  >({
    data_arremate: '',
    data_pagamento_lance: '',
    data_pagamento_leiloeiro: '',
    data_auto_arrematacao: '',
    data_carta_arrematacao: '',
    data_pagamento_itbi: '',
    data_pagamento_escritura: '',
    data_pagamento_registro_averbacao: '',
    data_alteracao_dados_prefeitura: '',
    data_alteracao_dados_condominio: '',
    data_inicio_pagamento_condominio: '',
    data_inicio_pagamento_iptu: '',
    data_notificacao_ocupante: '',
    data_contato_ocupante: '',
    data_processo_imissao_posse: '',
    data_inicio_reforma: '',
    data_termino_reforma: '',
    data_divulgacao_venda: '',
    data_contrato_compra_venda: '',
    data_recebimento_sinal: '',
    data_pagamento_financiamento: '',
    data_recebimento_saldo: '',
    desocupacao_amigavel: false,
    ocupante_interesse_compra: false,
    observacoes: '',
  })

  // Permissões
  const isObserver = op ? userRoleOnOp(op) === 'observer' : false

  const loadData = async () => {
    if (!id) return
    try {
      setLoading(true)
      const [opData, checkData] = await Promise.all([
        getOportunidade(id),
        getChecklistByOportunidade(id),
      ])
      setOp(opData)
      setChecklist(checkData)

      if (checkData) {
        setFormData({
          data_arremate: checkData.data_arremate ? checkData.data_arremate.slice(0, 10) : '',
          data_pagamento_lance: checkData.data_pagamento_lance
            ? checkData.data_pagamento_lance.slice(0, 10)
            : '',
          data_pagamento_leiloeiro: checkData.data_pagamento_leiloeiro
            ? checkData.data_pagamento_leiloeiro.slice(0, 10)
            : '',
          data_auto_arrematacao: checkData.data_auto_arrematacao
            ? checkData.data_auto_arrematacao.slice(0, 10)
            : '',
          data_carta_arrematacao: checkData.data_carta_arrematacao
            ? checkData.data_carta_arrematacao.slice(0, 10)
            : '',
          data_pagamento_itbi: checkData.data_pagamento_itbi
            ? checkData.data_pagamento_itbi.slice(0, 10)
            : '',
          data_pagamento_escritura: checkData.data_pagamento_escritura
            ? checkData.data_pagamento_escritura.slice(0, 10)
            : '',
          data_pagamento_registro_averbacao: checkData.data_pagamento_registro_averbacao
            ? checkData.data_pagamento_registro_averbacao.slice(0, 10)
            : '',
          data_alteracao_dados_prefeitura: checkData.data_alteracao_dados_prefeitura
            ? checkData.data_alteracao_dados_prefeitura.slice(0, 10)
            : '',
          data_alteracao_dados_condominio: checkData.data_alteracao_dados_condominio
            ? checkData.data_alteracao_dados_condominio.slice(0, 10)
            : '',
          data_inicio_pagamento_condominio: checkData.data_inicio_pagamento_condominio
            ? checkData.data_inicio_pagamento_condominio.slice(0, 10)
            : '',
          data_inicio_pagamento_iptu: checkData.data_inicio_pagamento_iptu
            ? checkData.data_inicio_pagamento_iptu.slice(0, 10)
            : '',
          data_notificacao_ocupante: checkData.data_notificacao_ocupante
            ? checkData.data_notificacao_ocupante.slice(0, 10)
            : '',
          data_contato_ocupante: checkData.data_contato_ocupante
            ? checkData.data_contato_ocupante.slice(0, 10)
            : '',
          data_processo_imissao_posse: checkData.data_processo_imissao_posse
            ? checkData.data_processo_imissao_posse.slice(0, 10)
            : '',
          data_inicio_reforma: checkData.data_inicio_reforma
            ? checkData.data_inicio_reforma.slice(0, 10)
            : '',
          data_termino_reforma: checkData.data_termino_reforma
            ? checkData.data_termino_reforma.slice(0, 10)
            : '',
          data_divulgacao_venda: checkData.data_divulgacao_venda
            ? checkData.data_divulgacao_venda.slice(0, 10)
            : '',
          data_contrato_compra_venda: checkData.data_contrato_compra_venda
            ? checkData.data_contrato_compra_venda.slice(0, 10)
            : '',
          data_recebimento_sinal: checkData.data_recebimento_sinal
            ? checkData.data_recebimento_sinal.slice(0, 10)
            : '',
          data_pagamento_financiamento: checkData.data_pagamento_financiamento
            ? checkData.data_pagamento_financiamento.slice(0, 10)
            : '',
          data_recebimento_saldo: checkData.data_recebimento_saldo
            ? checkData.data_recebimento_saldo.slice(0, 10)
            : '',
          desocupacao_amigavel: Boolean(checkData.desocupacao_amigavel),
          ocupante_interesse_compra: Boolean(checkData.ocupante_interesse_compra),
          observacoes: checkData.observacoes || '',
        })
      } else if (opData?.data_aquisicao) {
        // Sugere a data de aquisição como ponto inicial para o arremate caso novo
        setFormData((prev) => ({
          ...prev,
          data_arremate: opData.data_aquisicao ? opData.data_aquisicao.slice(0, 10) : '',
        }))
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar checklist',
        description: err?.message || 'Não foi possível buscar as informações.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  const handleDateChange = (key: keyof ChecklistDates, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const handleToggleChange = (key: keyof ChecklistToggles, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [key]: checked }))
  }

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!id) return

    try {
      setSaving(true)
      const saved = await saveChecklist(id, {
        id: checklist?.id,
        ...formData,
      })
      setChecklist(saved)
      toast({
        title: 'Checklist salvo!',
        description: 'Os dados e a timeline foram atualizados com sucesso.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar',
        description: err?.message || 'Não foi possível salvar os dados do checklist.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  /**
   * Itens da Timeline:
   * Separa itens que possuem data (organizados em ordem cronológica)
   * e itens pendentes (sem data).
   */
  const { timelineItems, pendingItems, progressStats } = useMemo(() => {
    const withDate: Array<{
      item: ChecklistItemMeta
      dateStr: string
      dateObj: Date
      hasToggle: boolean
      toggleVal?: boolean
      toggleKey?: keyof ChecklistToggles
      toggleLabel?: string
    }> = []

    const withoutDate: Array<{
      item: ChecklistItemMeta
      hasToggle: boolean
      toggleVal?: boolean
      toggleKey?: keyof ChecklistToggles
      toggleLabel?: string
    }> = []

    CHECKLIST_ITEMS_CONFIG.forEach((item) => {
      const rawDate = formData[item.key]
      const hasToggle = Boolean(item.relatedToggleKey)
      const toggleVal = item.relatedToggleKey ? Boolean(formData[item.relatedToggleKey]) : undefined

      if (rawDate && rawDate.trim() !== '') {
        const dStr = rawDate.slice(0, 10)
        // Cria date object tratando UTC/local
        const [y, m, d] = dStr.split('-').map(Number)
        const dateObj = new Date(y, m - 1, d)

        withDate.push({
          item,
          dateStr: dStr,
          dateObj,
          hasToggle,
          toggleVal,
          toggleKey: item.relatedToggleKey,
          toggleLabel: item.relatedToggleLabel,
        })
      } else {
        withoutDate.push({
          item,
          hasToggle,
          toggleVal,
          toggleKey: item.relatedToggleKey,
          toggleLabel: item.relatedToggleLabel,
        })
      }
    })

    // Ordenação cronológica (do mais antigo para o mais recente)
    withDate.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())

    const total = CHECKLIST_ITEMS_CONFIG.length
    const completed = withDate.length
    const percent = Math.round((completed / total) * 100)

    return {
      timelineItems: withDate,
      pendingItems: withoutDate,
      progressStats: {
        total,
        completed,
        pending: withoutDate.length,
        percent,
      },
    }
  }, [formData])

  const handleExportPDF = () => {
    window.print()
  }

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '-'
    const [y, m, d] = dateStr.slice(0, 10).split('-')
    if (!y || !m || !d) return dateStr
    return `${d}/${m}/${y}`
  }

  if (loading || !op) {
    return (
      <div className="py-16 text-center text-[#7A6A5A]">
        <Clock className="w-8 h-8 animate-spin mx-auto mb-2 text-[#F97316]" />
        Carregando checklist da oportunidade...
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EDE4D8] pb-4">
        <div>
          <Link
            to={`/oportunidade/${op.id}`}
            className="text-xs text-[#F97316] font-medium flex items-center gap-1 mb-1 hover:underline inline-flex"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar para {op.nome}
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#5C3A21] flex items-center gap-2">
              <CalendarCheck className="w-7 h-7 text-[#F97316]" />
              Checklist Pós-Arrematação
            </h1>
            {op.uf && (
              <Badge variant="outline" className="text-[#5C3A21] border-[#EDE4D8] font-bold">
                {op.uf}
              </Badge>
            )}
            <StatusBadge status={op.status} />
          </div>
          <p className="text-sm text-[#7A6A5A] mt-1">
            <span className="font-semibold text-[#5C3A21]">{op.nome}</span> • {op.endereco}
          </p>
        </div>

        <div className="flex items-center gap-3 print:hidden">
          <Button
            type="button"
            variant="outline"
            onClick={handleExportPDF}
            className="border-[#EDE4D8] text-[#5C3A21] hover:bg-[#FAF6F0] shadow-sm gap-2"
          >
            <Printer className="w-4 h-4 text-[#F97316]" />
            Exportar PDF
          </Button>

          {!isObserver ? (
            <Button
              onClick={() => handleSave()}
              disabled={saving}
              className="bg-[#F97316] hover:bg-[#EA580C] text-white shadow-sm gap-2 min-w-[130px]"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs text-[#64748B] bg-[#F1F5F9] border border-[#CBD5E1] px-3 py-1.5 rounded-full">
              <Eye className="w-4 h-4" /> Modo observador (somente leitura)
            </span>
          )}
        </div>
      </div>

      {/* Cabeçalho exclusivo para impressão / PDF */}
      <div className="hidden print:block border-b-2 border-[#5C3A21] pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#5C3A21] text-white flex items-center justify-center font-bold text-lg">
              3
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#5C3A21] tracking-tight">
                Dou-lhe Tres Assessoria
              </h2>
              <p className="text-xs text-[#7A6A5A]">
                Gestão de Leilões Imobiliários • Relatório de Checklist
              </p>
            </div>
          </div>
          <div className="text-right text-xs text-[#7A6A5A]">
            <p className="font-semibold text-[#5C3A21]">Data de Emissão</p>
            <p>{new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-dashed border-[#EDE4D8] flex justify-between text-sm">
          <div>
            <p className="font-bold text-[#5C3A21] text-base">{op.nome}</p>
            <p className="text-xs text-[#7A6A5A]">{op.endereco}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-[#5C3A21]">
              Progresso Geral: {progressStats.percent}%
            </p>
            <p className="text-xs text-[#16A34A]">
              {progressStats.completed} de {progressStats.total} etapas concluídas
            </p>
          </div>
        </div>
      </div>

      {/* Barra de Progresso e Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-white border-[#EDE4D8]">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#7A6A5A] uppercase tracking-wider">
                Progresso Geral
              </span>
              <span className="text-xs font-bold text-[#F97316]">{progressStats.percent}%</span>
            </div>
            <div className="w-full bg-[#EDE4D8]/60 h-2.5 rounded-full overflow-hidden mt-2">
              <div
                className="bg-[#16A34A] h-full transition-all duration-500 rounded-full"
                style={{ width: `${progressStats.percent}%` }}
              />
            </div>
            <p className="text-xs text-[#7A6A5A] mt-2 flex items-center justify-between">
              <span>
                {progressStats.completed} de {progressStats.total} marcos com data
              </span>
              <span className="font-medium text-[#16A34A]">
                {progressStats.completed} concluídos
              </span>
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#EDE4D8]">
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-[#7A6A5A] uppercase font-semibold">Marcos Realizados</p>
              <p className="text-xl font-bold text-[#16A34A]">{progressStats.completed}</p>
              <p className="text-xs text-[#7A6A5A]">Registrados na timeline</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#EDE4D8]">
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#FFF4E8] text-[#F97316] flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-[#7A6A5A] uppercase font-semibold">Marcos Pendentes</p>
              <p className="text-xl font-bold text-[#F97316]">{progressStats.pending}</p>
              <p className="text-xs text-[#7A6A5A]">Aguardando preenchimento de data</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Layout Principal: 2 Colunas (Formulário + Timeline) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Coluna Esquerda: Formulário de Preenchimento (7 cols) */}
        <div className="xl:col-span-7 space-y-6">
          <Card className="border-[#EDE4D8] shadow-sm">
            <CardHeader className="bg-[#FAF6F0] border-b border-[#EDE4D8] py-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-[#5C3A21] flex items-center gap-2">
                    <ListTodo className="w-5 h-5 text-[#F97316]" />
                    Preenchimento do Checklist (22 Itens + 2 Decisões)
                  </CardTitle>
                  <CardDescription className="text-xs text-[#7A6A5A]">
                    Insira as datas das etapas concluídas para alimentar a timeline cronológica.
                  </CardDescription>
                </div>
                {!isObserver && (
                  <Button
                    size="sm"
                    onClick={() => handleSave()}
                    disabled={saving}
                    className="bg-[#F97316] hover:bg-[#EA580C] text-white gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {saving ? '...' : 'Salvar'}
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 space-y-8">
              {CATEGORIAS.map((catName) => {
                const itemsInCat = CHECKLIST_ITEMS_CONFIG.filter((c) => c.categoria === catName)
                return (
                  <div key={catName} className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-[#EDE4D8]">
                      <span className="w-2 h-2 rounded-full bg-[#F97316]" />
                      <h3 className="font-bold text-sm sm:text-base text-[#5C3A21] uppercase tracking-wide">
                        {catName}
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {itemsInCat.map((item) => {
                        const dateValue = formData[item.key] || ''
                        const hasDate = Boolean(dateValue)

                        return (
                          <div
                            key={item.key}
                            className={`p-3.5 rounded-lg border transition-colors ${
                              hasDate
                                ? 'bg-[#F0FDF4]/60 border-[#BBF7D0]'
                                : 'bg-white border-[#EDE4D8] hover:border-[#D4C5B5]'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="space-y-1 flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`w-2 h-2 rounded-full ${
                                      hasDate ? 'bg-[#16A34A]' : 'bg-[#CBD5E1]'
                                    }`}
                                  />
                                  <Label
                                    htmlFor={item.key}
                                    className="font-semibold text-sm text-[#2D1B0E] cursor-pointer"
                                  >
                                    {item.label}
                                  </Label>
                                  {hasDate && (
                                    <Badge className="bg-[#DCFCE7] text-[#166534] hover:bg-[#DCFCE7] text-[10px] h-5 border border-[#86EFAC] px-1.5 gap-0.5">
                                      <Check className="w-3 h-3" /> Concluído
                                    </Badge>
                                  )}
                                </div>
                                {item.description && (
                                  <p className="text-xs text-[#7A6A5A] pl-4">{item.description}</p>
                                )}
                              </div>

                              <div className="flex items-center gap-2 sm:self-center pl-4 sm:pl-0">
                                <div className="relative">
                                  <Input
                                    id={item.key}
                                    type="date"
                                    value={dateValue}
                                    disabled={isObserver}
                                    onChange={(e) => handleDateChange(item.key, e.target.value)}
                                    className={`w-40 sm:w-44 h-9 text-xs sm:text-sm font-medium print:hidden ${
                                      hasDate
                                        ? 'border-[#16A34A] text-[#166534] bg-white font-semibold'
                                        : 'border-[#EDE4D8] text-[#5C3A21]'
                                    }`}
                                  />
                                  {/* Exibição em texto limpo na impressão */}
                                  <span className="hidden print:inline-block text-xs font-bold px-2 py-1 rounded bg-[#F8FAFC] border border-[#CBD5E1] text-[#2D1B0E]">
                                    {hasDate ? formatDateDisplay(dateValue) : 'Não preenchido'}
                                  </span>
                                </div>
                                {hasDate && !isObserver && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    title="Limpar data"
                                    onClick={() => handleDateChange(item.key, '')}
                                    className="h-8 px-2 text-xs text-[#7A6A5A] hover:text-red-600 hover:bg-red-50 print:hidden"
                                  >
                                    Limpar
                                  </Button>
                                )}
                              </div>
                            </div>

                            {/* Se o item possuir Toggle associado (S/N) */}
                            {item.relatedToggleKey && (
                              <div className="mt-3 pt-3 border-t border-dashed border-[#EDE4D8] flex items-center justify-between pl-4 bg-white/70 p-2.5 rounded-md">
                                <div className="space-y-0.5">
                                  <span className="text-xs font-semibold text-[#5C3A21] flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-[#F97316]" />
                                    {item.relatedToggleLabel}
                                  </span>
                                  <span className="text-[11px] text-[#7A6A5A] block">
                                    {formData[item.relatedToggleKey]
                                      ? 'Opção marcada: SIM'
                                      : 'Opção marcada: NÃO'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`text-xs font-bold ${
                                      formData[item.relatedToggleKey]
                                        ? 'text-[#16A34A]'
                                        : 'text-[#7A6A5A]'
                                    }`}
                                  >
                                    {formData[item.relatedToggleKey] ? 'SIM' : 'NÃO'}
                                  </span>
                                  <Switch
                                    id={item.relatedToggleKey}
                                    disabled={isObserver}
                                    checked={Boolean(formData[item.relatedToggleKey])}
                                    onCheckedChange={(checked) =>
                                      handleToggleChange(item.relatedToggleKey!, checked)
                                    }
                                    className="data-[state=checked]:bg-[#16A34A] print:hidden"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              {/* Observações Gerais */}
              <div className="pt-4 border-t border-[#EDE4D8] space-y-2">
                <Label htmlFor="observacoes" className="font-bold text-sm text-[#5C3A21]">
                  Observações Gerais do Checklist
                </Label>
                <Textarea
                  id="observacoes"
                  rows={3}
                  disabled={isObserver}
                  placeholder="Anotações sobre desocupação, cartório, contatos, particularidades do processo..."
                  value={formData.observacoes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, observacoes: e.target.value }))
                  }
                  className="border-[#EDE4D8] text-sm"
                />
              </div>

              {!isObserver && (
                <div className="pt-2 flex justify-end print:hidden">
                  <Button
                    onClick={() => handleSave()}
                    disabled={saving}
                    className="bg-[#F97316] hover:bg-[#EA580C] text-white shadow-sm gap-2 w-full sm:w-auto"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Coluna Direita: Timeline Vertical Cronológica + Pendentes (5 cols) */}
        <div className="xl:col-span-5 space-y-6">
          {/* Card da Timeline Vertical */}
          <Card className="border-[#EDE4D8] shadow-sm sticky top-4">
            <CardHeader className="bg-[#FAF6F0] border-b border-[#EDE4D8] py-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-[#5C3A21] flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#16A34A]" />
                    Linha do Tempo (Timeline)
                  </CardTitle>
                  <CardDescription className="text-xs text-[#7A6A5A]">
                    Organizada automaticamente em ordem cronológica pelas datas preenchidas.
                  </CardDescription>
                </div>
                <Badge
                  variant="secondary"
                  className="bg-[#DCFCE7] text-[#166534] border border-[#86EFAC] font-bold"
                >
                  {timelineItems.length} {timelineItems.length === 1 ? 'evento' : 'eventos'}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 space-y-6">
              {timelineItems.length === 0 ? (
                <div className="text-center py-10 px-4 border-2 border-dashed border-[#EDE4D8] rounded-lg">
                  <CalendarIcon className="w-10 h-10 mx-auto text-[#7A6A5A] opacity-40 mb-2" />
                  <p className="text-sm font-semibold text-[#5C3A21]">
                    Nenhuma data preenchida ainda
                  </p>
                  <p className="text-xs text-[#7A6A5A] mt-1 max-w-xs mx-auto">
                    Preencha os campos de data no formulário ao lado para montar a linha do tempo
                    cronológica da oportunidade.
                  </p>
                </div>
              ) : (
                <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-[#16A34A] before:via-[#16A34A]/80 before:to-[#CBD5E1]">
                  {timelineItems.map((entry, idx) => {
                    const isLatest = idx === timelineItems.length - 1
                    return (
                      <div key={entry.item.key} className="relative group">
                        {/* Marcador / Bullet na linha vertical */}
                        <div className="absolute -left-[23px] sm:-left-[27px] top-1.5 w-6 h-6 rounded-full bg-[#16A34A] text-white flex items-center justify-center text-xs font-bold ring-4 ring-white shadow-sm">
                          <Check className="w-3.5 h-3.5" />
                        </div>

                        {/* Card do Evento */}
                        <div className="bg-white p-3.5 rounded-lg border border-[#EDE4D8] hover:border-[#16A34A] hover:shadow-sm transition-all space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-bold text-[#16A34A] bg-[#DCFCE7] px-2 py-0.5 rounded-md border border-[#86EFAC] flex items-center gap-1">
                              <CalendarIcon className="w-3 h-3" />
                              {formatDateDisplay(entry.dateStr)}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px] text-[#7A6A5A] border-[#EDE4D8]"
                            >
                              {entry.item.categoria}
                            </Badge>
                          </div>

                          <div>
                            <h4 className="font-bold text-sm text-[#2D1B0E]">{entry.item.label}</h4>
                            {entry.item.description && (
                              <p className="text-xs text-[#7A6A5A] mt-0.5">
                                {entry.item.description}
                              </p>
                            )}
                          </div>

                          {/* Se houver Toggle relacionado na Timeline */}
                          {entry.hasToggle && (
                            <div className="pt-2 border-t border-[#EDE4D8] flex items-center justify-between text-xs">
                              <span className="text-[#5C3A21] font-medium flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-[#F97316]" />
                                {entry.toggleLabel}:
                              </span>
                              <Badge
                                variant="secondary"
                                className={`text-[10px] font-bold ${
                                  entry.toggleVal
                                    ? 'bg-[#DCFCE7] text-[#166534] border-[#86EFAC]'
                                    : 'bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]'
                                }`}
                              >
                                {entry.toggleVal ? 'SIM' : 'NÃO'}
                              </Badge>
                            </div>
                          )}

                          {isLatest && (
                            <div className="pt-1 flex items-center gap-1 text-[10px] text-[#F97316] font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#F97316] animate-ping" />
                              Último marco cronológico registrado
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Seção de Itens Pendentes */}
              <div className="pt-4 border-t border-[#EDE4D8]">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-[#7A6A5A] uppercase tracking-wider flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-[#F97316]" />
                    Próximas Etapas Pendentes ({pendingItems.length})
                  </h4>
                  {pendingItems.length === 0 && (
                    <Badge className="bg-[#DCFCE7] text-[#166534] text-[10px]">
                      100% Concluído
                    </Badge>
                  )}
                </div>

                {pendingItems.length === 0 ? (
                  <div className="p-3 bg-[#DCFCE7]/50 rounded-lg text-center text-xs text-[#166534] font-semibold border border-[#86EFAC]">
                    Parabéns! Todos os 22 marcos do processo pós-arrematação foram registrados.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {pendingItems.map((p) => (
                      <div
                        key={p.item.key}
                        className="p-2 bg-[#F8FAFC] rounded border border-[#EDE4D8] flex items-center justify-between text-xs text-[#5C3A21] hover:bg-white"
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          <span className="w-2 h-2 rounded-full bg-[#CBD5E1] shrink-0" />
                          <span className="truncate">{p.item.label}</span>
                        </div>
                        <span className="text-[10px] text-[#7A6A5A] bg-[#EDE4D8]/50 px-1.5 py-0.5 rounded shrink-0">
                          Pendente
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
