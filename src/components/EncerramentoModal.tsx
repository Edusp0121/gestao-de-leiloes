import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
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
import { Plus, Trash2, Wand2, Loader2, DollarSign } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { formatBRL } from '@/lib/formatters'
import { Oportunidade } from '@/services/oportunidades'
import { Checklist } from '@/services/checklists'
import { Lancamento } from '@/services/lancamentos'
import {
  Fechamento,
  FechamentoLancamento,
  FechamentoLancamentoTipo,
  FECHAMENTO_LANCAMENTO_TIPOS,
  salvarFechamentoCompleto,
  FechamentoLancamentoPayload,
} from '@/services/fechamentos'
import {
  ExpenseCategory,
  EXPENSE_CATEGORIES,
  getEstimatedCostsByCategory,
  getRealCostsByCategory,
} from '@/lib/expense-categories'
import { toNum } from '@/lib/calculator-utils'

interface EncerramentoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  oportunidade: Oportunidade
  checklist?: Checklist | null
  lancamentos?: Lancamento[]
  fechamentoExistente?: Fechamento | null
  fechamentoLancamentosExistentes?: FechamentoLancamento[]
  onSuccess?: () => void
}

interface TempLancamento {
  tempId: string
  data: string
  descricao: string
  tipo: FechamentoLancamentoTipo
  valor: number
}

export function EncerramentoModal({
  open,
  onOpenChange,
  oportunidade,
  checklist,
  lancamentos = [],
  fechamentoExistente,
  fechamentoLancamentosExistentes = [],
  onSuccess,
}: EncerramentoModalProps) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<'dados' | 'lancamentos'>('dados')
  const [salvando, setSalvando] = useState(false)

  // Aba 1: Dados da Venda
  const [dataVenda, setDataVenda] = useState('')
  const [valorRealNegociado, setValorRealNegociado] = useState<number | ''>('')
  const [desagio, setDesagio] = useState<number | ''>('')
  const [observacoes, setObservacoes] = useState('')

  // Custos reais por categoria
  const [custosPorCategoria, setCustosPorCategoria] = useState<Record<ExpenseCategory, number>>({
    Aquisição: 0,
    Encargos: 0,
    Desocupação: 0,
    Mensais: 0,
    Venda: 0,
  })

  // Aba 2: Lançamentos do Fechamento
  const [listaLancamentos, setListaLancamentos] = useState<TempLancamento[]>([])

  // Formulário de novo lançamento rápido
  const [novoData, setNovoData] = useState('')
  const [novoDescricao, setNovoDescricao] = useState('')
  const [novoTipo, setNovoTipo] = useState<FechamentoLancamentoTipo>('outro')
  const [novoValor, setNovoValor] = useState<number | ''>('')

  // Inicializa quando abre o modal ou muda fechamentoExistente
  useEffect(() => {
    if (!open) return

    if (fechamentoExistente) {
      setDataVenda(
        fechamentoExistente.data_venda ? fechamentoExistente.data_venda.slice(0, 10) : '',
      )
      setValorRealNegociado(fechamentoExistente.valor_real_negociado || '')
      setDesagio(fechamentoExistente.desagio ?? '')
      setObservacoes(fechamentoExistente.observacoes || '')
      if (fechamentoExistente.custos_reais_categoria) {
        setCustosPorCategoria({
          Aquisição: toNum(fechamentoExistente.custos_reais_categoria['Aquisição']),
          Encargos: toNum(fechamentoExistente.custos_reais_categoria['Encargos']),
          Desocupação: toNum(fechamentoExistente.custos_reais_categoria['Desocupação']),
          Mensais: toNum(fechamentoExistente.custos_reais_categoria['Mensais']),
          Venda: toNum(fechamentoExistente.custos_reais_categoria['Venda']),
        })
      }
    } else {
      // Padrões iniciais baseados na oportunidade
      const dataHoje = new Date().toISOString().slice(0, 10)
      setDataVenda(checklist?.data_contrato_compra_venda?.slice(0, 10) || dataHoje)
      const valVenda =
        toNum(oportunidade.valor_venda_real) ||
        toNum(oportunidade.valor_venda_com_desconto) ||
        toNum(oportunidade.valor_mercado) ||
        0
      setValorRealNegociado(valVenda > 0 ? valVenda : '')
      setDesagio(oportunidade.desagio_venda ?? 0)
      setObservacoes('')

      // Custos reais calculados dos lançamentos existentes na oportunidade
      const calculados = getRealCostsByCategory(lancamentos)
      setCustosPorCategoria(calculados)
    }

    if (fechamentoLancamentosExistentes && fechamentoLancamentosExistentes.length > 0) {
      setListaLancamentos(
        fechamentoLancamentosExistentes.map((l) => ({
          tempId: l.id,
          data: l.data ? l.data.slice(0, 10) : '',
          descricao: l.descricao,
          tipo: l.tipo,
          valor: l.valor,
        })),
      )
    } else if (!fechamentoExistente) {
      // Se não há fechamento existente, inicializa lista de lançamentos
      setListaLancamentos([])
    }
  }, [open, fechamentoExistente, fechamentoLancamentosExistentes, oportunidade])

  // Recalcula custosPorCategoria somando os lançamentos da tabela
  const atualizarCustosPorLancamentos = (lancamentosAtuais: TempLancamento[]) => {
    const acc: Record<ExpenseCategory, number> = {
      Aquisição: 0,
      Encargos: 0,
      Desocupação: 0,
      Mensais: 0,
      Venda: 0,
    }
    lancamentosAtuais.forEach((l) => {
      const tipoConfig = FECHAMENTO_LANCAMENTO_TIPOS.find((t) => t.value === l.tipo)
      const cat = tipoConfig ? tipoConfig.categoria : 'Mensais'
      acc[cat] += toNum(l.valor)
    })
    setCustosPorCategoria(acc)
  }

  // Pré-preenchimento automático a partir dos valores estimados do cadastro e checklist
  const handlePreencherAutomatico = () => {
    const estimated = getEstimatedCostsByCategory(oportunidade)
    const valorMercado = toNum(oportunidade.valor_mercado)
    const valorEstimadoVenda = toNum(oportunidade.valor_venda_com_desconto) || valorMercado
    const valorArrematacao = toNum(oportunidade.valor_arrematacao)
    const isFinanciado =
      Boolean(oportunidade.modalidade_financiamento) &&
      oportunidade.modalidade_financiamento !== 'À Vista'

    const percentualEntrada = toNum(oportunidade.percentual_entrada) || 10
    const valorEntrada = isFinanciado
      ? (percentualEntrada / 100) * valorArrematacao
      : valorArrematacao
    const comissaoLeiloeiro =
      (toNum(oportunidade.comissao_leiloeiro_percent) / 100) * valorArrematacao

    const dataArremate =
      checklist?.data_arremate?.slice(0, 10) ||
      oportunidade.data_aquisicao?.slice(0, 10) ||
      new Date().toISOString().slice(0, 10)

    const itensSugeridos: TempLancamento[] = []

    // 1. Lance / Entrada
    if (isFinanciado) {
      itensSugeridos.push({
        tempId: 'sug_entrada',
        data: checklist?.data_pagamento_lance?.slice(0, 10) || dataArremate,
        descricao: `Entrada da Arrematação (${percentualEntrada}%)`,
        tipo: 'entrada',
        valor: Math.round(valorEntrada * 100) / 100,
      })
    } else {
      itensSugeridos.push({
        tempId: 'sug_lance',
        data: checklist?.data_pagamento_lance?.slice(0, 10) || dataArremate,
        descricao: 'Lance Integral de Arrematação (À Vista)',
        tipo: 'lance',
        valor: Math.round(valorArrematacao * 100) / 100,
      })
    }

    // 2. Leiloeiro
    if (comissaoLeiloeiro > 0) {
      itensSugeridos.push({
        tempId: 'sug_leiloeiro',
        data: checklist?.data_pagamento_leiloeiro?.slice(0, 10) || dataArremate,
        descricao: 'Comissão do Leiloeiro',
        tipo: 'leiloeiro',
        valor: Math.round(comissaoLeiloeiro * 100) / 100,
      })
    }

    // 3. ITBI
    const valorPrefeitura = toNum(oportunidade.valor_prefeitura_venal)
    const valorBaseITBI = valorPrefeitura > 0 ? valorPrefeitura : valorArrematacao
    const valorITBI = ((toNum(oportunidade.itbi_percent) || 3) / 100) * valorBaseITBI
    if (valorITBI > 0) {
      itensSugeridos.push({
        tempId: 'sug_itbi',
        data: checklist?.data_pagamento_itbi?.slice(0, 10) || dataArremate,
        descricao: 'Pagamento ITBI',
        tipo: 'ITBI',
        valor: Math.round(valorITBI * 100) / 100,
      })
    }

    // 4. Escritura
    const escritura = toNum(oportunidade.escritura)
    if (escritura > 0) {
      itensSugeridos.push({
        tempId: 'sug_escritura',
        data: checklist?.data_pagamento_escritura?.slice(0, 10) || dataArremate,
        descricao: 'Escritura Pública',
        tipo: 'escritura',
        valor: escritura,
      })
    }

    // 5. Registro / Averbação
    const registroEAverbacao = toNum(oportunidade.registro) + toNum(oportunidade.averbacao)
    if (registroEAverbacao > 0) {
      itensSugeridos.push({
        tempId: 'sug_registro',
        data: checklist?.data_pagamento_registro_averbacao?.slice(0, 10) || dataArremate,
        descricao: 'Registro e Averbação',
        tipo: 'registro',
        valor: registroEAverbacao,
      })
    }

    // 6. Contato ocupante / desocupação
    const acordoDesocupacao =
      toNum(oportunidade.acordo_desocupacao) +
      toNum(oportunidade.assessoria_juridica) +
      toNum(oportunidade.taxas_judiciais)
    if (acordoDesocupacao > 0) {
      itensSugeridos.push({
        tempId: 'sug_desocupacao',
        data:
          checklist?.data_processo_imissao_posse?.slice(0, 10) ||
          checklist?.data_contato_ocupante?.slice(0, 10) ||
          dataArremate,
        descricao: 'Acordo / Desocupação / Jurídico',
        tipo: 'desocupacao',
        valor: acordoDesocupacao,
      })
    }

    // 7. Reforma
    const reforma = toNum(oportunidade.reforma_prevista)
    if (reforma > 0) {
      itensSugeridos.push({
        tempId: 'sug_reforma',
        data:
          checklist?.data_termino_reforma?.slice(0, 10) ||
          checklist?.data_inicio_reforma?.slice(0, 10) ||
          dataArremate,
        descricao: 'Reforma do Imóvel',
        tipo: 'reforma',
        valor: reforma,
      })
    }

    // 8. Parcelas / Mensais
    const parcelas =
      toNum(oportunidade.valor_parcela_mensal) * (toNum(oportunidade.parcelas_pagas) || 1)
    if (parcelas > 0) {
      itensSugeridos.push({
        tempId: 'sug_parcelas',
        data: checklist?.data_pagamento_financiamento?.slice(0, 10) || dataArremate,
        descricao: `Parcelas Pagas (${oportunidade.parcelas_pagas || 1} parcelas)`,
        tipo: 'parcela',
        valor: Math.round(parcelas * 100) / 100,
      })
    }

    // Se já existiam lançamentos reais cadastrados na oportunidade, podemos usar seus dados
    if (lancamentos.length > 0) {
      const lancConvertidos: TempLancamento[] = lancamentos
        .filter((l) => l.tipo === 'Despesa')
        .map((l, idx) => {
          let tipoFinal: FechamentoLancamentoTipo = 'outro'
          const desc = (l.descricao || '').toLowerCase()
          if (desc.includes('lance')) tipoFinal = 'lance'
          else if (desc.includes('sinal') || desc.includes('entrada')) tipoFinal = 'entrada'
          else if (desc.includes('leiloeiro')) tipoFinal = 'leiloeiro'
          else if (desc.includes('itbi')) tipoFinal = 'ITBI'
          else if (desc.includes('escritura')) tipoFinal = 'escritura'
          else if (
            desc.includes('registro') ||
            desc.includes('averbação') ||
            desc.includes('averbacao')
          )
            tipoFinal = 'registro'
          else if (desc.includes('ocupante') || desc.includes('notificação'))
            tipoFinal = 'contato ocupante'
          else if (
            desc.includes('acordo') ||
            desc.includes('desocupação') ||
            desc.includes('custas')
          )
            tipoFinal = 'desocupacao'
          else if (desc.includes('reforma')) tipoFinal = 'reforma'
          else if (
            desc.includes('parcela') ||
            desc.includes('prestação') ||
            desc.includes('prestacao')
          )
            tipoFinal = 'parcela'
          else if (
            desc.includes('venda') ||
            desc.includes('corretagem') ||
            desc.includes('corretor')
          )
            tipoFinal = 'venda'

          return {
            tempId: `real_${l.id || idx}`,
            data: l.data ? l.data.slice(0, 10) : dataArremate,
            descricao: l.descricao,
            tipo: tipoFinal,
            valor: l.valor,
          }
        })

      if (lancConvertidos.length > 0) {
        setListaLancamentos(lancConvertidos)
        atualizarCustosPorLancamentos(lancConvertidos)
      } else {
        setListaLancamentos(itensSugeridos)
        atualizarCustosPorLancamentos(itensSugeridos)
      }
    } else {
      setListaLancamentos(itensSugeridos)
      atualizarCustosPorLancamentos(itensSugeridos)
    }

    // Atualiza dados da venda se ainda vazios
    if (!valorRealNegociado || valorRealNegociado === 0) {
      setValorRealNegociado(valorEstimadoVenda)
    }
    if (desagio === '' || desagio === undefined) {
      setDesagio(oportunidade.desagio_venda ?? 0)
    }

    toast({
      title: 'Pré-preenchimento concluído',
      description: 'Valores estimados e marcos do checklist foram carregados nas 2 abas.',
    })
  }

  // Adicionar lançamento manual à lista
  const handleAdicionarLancamento = () => {
    if (!novoDescricao.trim()) {
      toast({
        title: 'Aviso',
        description: 'Informe uma descrição para o lançamento.',
        variant: 'destructive',
      })
      return
    }
    if (!novoValor || Number(novoValor) <= 0) {
      toast({
        title: 'Aviso',
        description: 'Informe um valor válido maior que zero.',
        variant: 'destructive',
      })
      return
    }

    const novoItem: TempLancamento = {
      tempId: `temp_${Date.now()}_${Math.random()}`,
      data: novoData || new Date().toISOString().slice(0, 10),
      descricao: novoDescricao.trim(),
      tipo: novoTipo,
      valor: Number(novoValor),
    }

    const novaLista = [...listaLancamentos, novoItem]
    setListaLancamentos(novaLista)
    atualizarCustosPorLancamentos(novaLista)

    // Limpa campos
    setNovoDescricao('')
    setNovoValor('')
    toast({ title: 'Lançamento adicionado', description: novoItem.descricao })
  }

  const handleRemoverLancamento = (tempId: string) => {
    const novaLista = listaLancamentos.filter((l) => l.tempId !== tempId)
    setListaLancamentos(novaLista)
    atualizarCustosPorLancamentos(novaLista)
  }

  // Salvar Fechamento completo
  const handleSalvar = async () => {
    if (!dataVenda) {
      toast({ title: 'Atenção', description: 'Informe a data da venda.', variant: 'destructive' })
      setActiveTab('dados')
      return
    }
    if (!valorRealNegociado || Number(valorRealNegociado) <= 0) {
      toast({
        title: 'Atenção',
        description: 'Informe o valor real negociado na venda.',
        variant: 'destructive',
      })
      setActiveTab('dados')
      return
    }

    setSalvando(true)
    try {
      const payloadLancamentos: FechamentoLancamentoPayload[] = listaLancamentos.map((l) => ({
        oportunidade: oportunidade.id,
        data: l.data ? new Date(l.data).toISOString() : new Date().toISOString(),
        descricao: l.descricao,
        tipo: l.tipo,
        valor: l.valor,
      }))

      await salvarFechamentoCompleto(
        {
          oportunidade: oportunidade.id,
          data_venda: new Date(dataVenda).toISOString(),
          valor_real_negociado: Number(valorRealNegociado),
          desagio: desagio !== '' ? Number(desagio) : undefined,
          custos_reais_categoria: custosPorCategoria,
          observacoes: observacoes.trim() || undefined,
        },
        payloadLancamentos,
        fechamentoExistente?.id,
      )

      toast({
        title: 'Investimento encerrado com sucesso!',
        description: 'Os dados do fechamento foram gravados e o relatório final está disponível.',
      })
      onOpenChange(false)
      onSuccess?.()
    } catch (err: any) {
      console.error('Erro ao salvar fechamento:', err)
      toast({
        title: 'Erro ao salvar encerramento',
        description: err?.message || 'Falha na comunicação com o backend.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const totalCustosReais = Object.values(custosPorCategoria).reduce((a, b) => a + toNum(b), 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <DialogTitle className="text-xl font-bold text-[#5C3A21] flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-[#F97316]" />
                {fechamentoExistente ? 'Editar Encerramento' : 'Encerrar Investimento'} —{' '}
                {oportunidade.nome}
              </DialogTitle>
              <p className="text-xs text-[#7A6A5A] mt-0.5">
                Preencha os dados finais da venda e consolide os lançamentos para gerar o Relatório
                Final.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePreencherAutomatico}
              className="border-[#F97316] text-[#F97316] hover:bg-[#FFF4E8] gap-1.5"
            >
              <Wand2 className="w-3.5 h-3.5" /> Pré-preenchimento automático
            </Button>
          </div>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as any)}
          className="w-full mt-2"
        >
          <TabsList className="grid grid-cols-2 w-full bg-[#EDE4D8]/50">
            <TabsTrigger
              value="dados"
              className="data-[state=active]:bg-white data-[state=active]:text-[#5C3A21] font-semibold"
            >
              1. Dados da Venda
            </TabsTrigger>
            <TabsTrigger
              value="lancamentos"
              className="data-[state=active]:bg-white data-[state=active]:text-[#5C3A21] font-semibold"
            >
              2. Lançamentos ({listaLancamentos.length})
            </TabsTrigger>
          </TabsList>

          {/* ABA 1: DADOS DA VENDA */}
          <TabsContent value="dados" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="data_venda" className="text-xs font-semibold text-[#5C3A21]">
                  Data da Venda <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="data_venda"
                  type="date"
                  value={dataVenda}
                  onChange={(e) => setDataVenda(e.target.value)}
                  className="border-[#EDE4D8]"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="valor_real_negociado"
                  className="text-xs font-semibold text-[#5C3A21]"
                >
                  Valor Real Negociado (R$) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="valor_real_negociado"
                  type="number"
                  step="0.01"
                  placeholder="Ex: 195000"
                  value={valorRealNegociado}
                  onChange={(e) =>
                    setValorRealNegociado(e.target.value ? parseFloat(e.target.value) : '')
                  }
                  className="border-[#EDE4D8] font-semibold"
                />
                <p className="text-[11px] text-[#7A6A5A]">
                  Estimado no cadastro:{' '}
                  {formatBRL(
                    toNum(oportunidade.valor_venda_com_desconto) ||
                      toNum(oportunidade.valor_mercado),
                  )}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="desagio" className="text-xs font-semibold text-[#5C3A21]">
                  Deságio Final Aplicado (%)
                </Label>
                <Input
                  id="desagio"
                  type="number"
                  step="0.1"
                  placeholder="Ex: 5"
                  value={desagio}
                  onChange={(e) => setDesagio(e.target.value ? parseFloat(e.target.value) : '')}
                  className="border-[#EDE4D8]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#5C3A21]">
                  Status da Oportunidade
                </Label>
                <div className="h-9 px-3 py-2 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-md border border-emerald-200 flex items-center">
                  Será atualizada para "Vendida"
                </div>
              </div>
            </div>

            {/* Custos reais por categoria */}
            <div className="pt-3 border-t border-[#EDE4D8]">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-bold text-[#5C3A21] uppercase tracking-wide">
                  Custos Reais por Categoria (Consolidado)
                </Label>
                <span className="text-xs font-bold text-[#F97316]">
                  Total: {formatBRL(totalCustosReais)}
                </span>
              </div>
              <p className="text-[11px] text-[#7A6A5A] mb-3">
                Valores preenchidos automaticamente pelos lançamentos da Aba 2 ou ajustáveis
                diretamente:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {EXPENSE_CATEGORIES.map((cat) => (
                  <div
                    key={cat}
                    className="p-2.5 bg-[#FFF4E8]/40 border border-[#EDE4D8] rounded-md"
                  >
                    <span className="text-[11px] font-semibold text-[#7A6A5A] block truncate">
                      {cat}
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      value={custosPorCategoria[cat] || 0}
                      onChange={(e) =>
                        setCustosPorCategoria((prev) => ({
                          ...prev,
                          [cat]: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="mt-1 h-7 text-xs font-bold border-[#EDE4D8] bg-white px-1.5"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <Label htmlFor="observacoes" className="text-xs font-semibold text-[#5C3A21]">
                Observações do Encerramento / Divergências
              </Label>
              <Textarea
                id="observacoes"
                rows={3}
                placeholder="Detalhes sobre a negociação, descontos adicionais, desfecho da imissão/desocupação ou lições aprendidas..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="border-[#EDE4D8] text-xs"
              />
            </div>
          </TabsContent>

          {/* ABA 2: LANÇAMENTOS DO FECHAMENTO */}
          <TabsContent value="lancamentos" className="space-y-4 pt-4">
            {/* Formulário de adicionar lançamento */}
            <div className="p-3 bg-[#FFF4E8]/50 border border-[#EDE4D8] rounded-lg space-y-3">
              <span className="text-xs font-bold text-[#5C3A21] uppercase tracking-wide block">
                Adicionar Lançamento ao Fechamento
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-3">
                  <Label className="text-[11px] text-[#7A6A5A]">Data</Label>
                  <Input
                    type="date"
                    value={novoData}
                    onChange={(e) => setNovoData(e.target.value)}
                    className="h-8 text-xs bg-white"
                  />
                </div>
                <div className="sm:col-span-3">
                  <Label className="text-[11px] text-[#7A6A5A]">Tipo</Label>
                  <Select
                    value={novoTipo}
                    onValueChange={(v) => setNovoTipo(v as FechamentoLancamentoTipo)}
                  >
                    <SelectTrigger className="h-8 text-xs bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FECHAMENTO_LANCAMENTO_TIPOS.map((t) => (
                        <SelectItem key={t.value} value={t.value} className="text-xs">
                          {t.label} ({t.categoria})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-4">
                  <Label className="text-[11px] text-[#7A6A5A]">Descrição</Label>
                  <Input
                    placeholder="Ex: Reforma elétrica"
                    value={novoDescricao}
                    onChange={(e) => setNovoDescricao(e.target.value)}
                    className="h-8 text-xs bg-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-[11px] text-[#7A6A5A]">Valor (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={novoValor}
                    onChange={(e) => setNovoValor(e.target.value ? parseFloat(e.target.value) : '')}
                    className="h-8 text-xs bg-white font-bold"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAdicionarLancamento}
                  className="bg-[#5C3A21] hover:bg-[#432A18] text-white text-xs h-8 gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Incluir item
                </Button>
              </div>
            </div>

            {/* Tabela de lançamentos incluídos */}
            <div className="border border-[#EDE4D8] rounded-md max-h-60 overflow-y-auto">
              <Table>
                <TableHeader className="bg-[#EDE4D8]/30 sticky top-0">
                  <TableRow>
                    <TableHead className="text-xs">Data</TableHead>
                    <TableHead className="text-xs">Tipo</TableHead>
                    <TableHead className="text-xs">Descrição</TableHead>
                    <TableHead className="text-xs text-right">Valor</TableHead>
                    <TableHead className="text-xs text-right w-12">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listaLancamentos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-xs text-[#7A6A5A] py-6">
                        Nenhum lançamento adicionado ainda. Clique no botão de pré-preenchimento ou
                        adicione manualmente acima.
                      </TableCell>
                    </TableRow>
                  ) : (
                    listaLancamentos.map((item) => (
                      <TableRow key={item.tempId} className="hover:bg-[#FFF4E8]/20">
                        <TableCell className="text-xs text-[#7A6A5A]">
                          {item.data ? item.data.split('-').reverse().join('/') : '—'}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-[#5C3A21]">
                          <span className="inline-block px-2 py-0.5 rounded bg-[#EDE4D8]/70 text-[11px]">
                            {item.tipo}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-[#2D1B0E] font-medium">
                          {item.descricao}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-right text-[#5C3A21]">
                          {formatBRL(item.valor)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-500 hover:bg-red-50"
                            onClick={() => handleRemoverLancamento(item.tempId)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between items-center text-xs text-[#7A6A5A] px-1">
              <span>{listaLancamentos.length} lançamentos vinculados</span>
              <span className="font-bold text-[#5C3A21]">
                Total: {formatBRL(listaLancamentos.reduce((acc, l) => acc + toNum(l.valor), 0))}
              </span>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4 gap-2 sm:gap-0 border-t border-[#EDE4D8] pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={salvando}
            className="border-[#EDE4D8]"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSalvar}
            disabled={salvando}
            className="bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold gap-1.5"
          >
            {salvando ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Salvando...
              </>
            ) : (
              'Confirmar Encerramento'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
