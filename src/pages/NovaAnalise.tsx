import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  createOportunidade,
  getOportunidade,
  updateOportunidade,
  getUsuarios,
  isCurrentUserAdmin,
  toIdArray,
  type Oportunidade,
  type UserRef,
} from '@/services/oportunidades'
import { calculateMetrics } from '@/lib/calculator-utils'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage, extractFieldErrors, type FieldErrors } from '@/lib/pocketbase/errors'
import { formatBRL, formatPercent } from '@/lib/formatters'
import { FileUp, Calculator, Users } from 'lucide-react'
import { calculateInstallment, calculateSaldoDevedor, FinancingParams } from '@/lib/financing-utils'
import { ParticipantesSelector } from '@/components/ParticipantesSelector'
import pb from '@/lib/pocketbase/client'
import { calculateEscritura, calculateRegistroEAverbacao } from '@/lib/cartorio-utils'
import { fetchUltimoIndiceBacen, type IndiceBacenTipo } from '@/lib/bacen-utils'
import { Loader2 } from 'lucide-react'

const AGENTES = [
  'Caixa Balcão',
  'Caixa Leilão',
  'MCMV',
  'Emgea',
  'Itaú',
  'Bradesco',
  'Santander',
  'Outros',
]

const TAXAS_JUROS_AGENTES: Record<string, number> = {
  'Caixa Balcão': 11.49,
  'Caixa Leilão': 10.99,
  MCMV: 4.59,
  Emgea: 8.0,
  Itaú: 11.6,
  Bradesco: 11.7,
  Santander: 11.69,
  Outros: 9.99,
}

const INDICES_CORRECAO: IndiceBacenTipo[] = ['IPCA', 'TR', 'IGPM', 'INPC', 'Manual']

const UFS = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
]

const DEFAULT_FORM = {
  nome: '',
  endereco: '',
  uf: '',
  tipo_leilao: 'Judicial' as 'Judicial' | 'Extrajudicial',
  banco_selecionado: 'Caixa Balcão',
  data_aquisicao: new Date().toISOString().split('T')[0],
  status: 'Em análise' as 'Em análise' | 'Arrematada' | 'Em andamento' | 'Vendida',
  valor_venda_real: '' as number | string,
  desagio_venda: 10,
  valor_mercado: 240000,
  valor_arrematacao: 101200,
  tempo_estimado_venda_meses: 10,
  indice_correcao: 'TR' as IndiceBacenTipo,
  correcao_saldo_manual: 0.17,
  indice_correcao_medio_mensal: 0.17,
  itbi_percent: 3,
  comissao_leiloeiro_percent: 5,
  comissao_corretor_percent: 6,
  escritura: 0,
  registro: 0,
  averbacao: 0,
  reforma_prevista: 8000,
  assessoria_juridica: 2626,
  condominio_iptu_mensal: 1926,
  modalidade_financiamento: 'PRICE' as 'À Vista' | 'SAC' | 'PRICE',
  banco_responsavel_financiamento: '',
  taxa_juros_financiamento: 11.49,
  aliquota_reajuste: 0,
  valor_parcela_mensal: 1105.05,
  saldo_devedor: 89576.33,
  parcelas_pagas: 3,
  ir_percent: 15,
  incluir_ir_despesas: true,
  prazo_financiamento: 120,
  percentual_entrada: 10,
  valor_prefeitura_venal: 0,
  taxa_avaliacao: 0,
  taxas_judiciais: 0,
  acordo_desocupacao: 0,
  baixa_gravames: 0,
  foro: 0,
  dividas_condominio: 0,
  dividas_iptu: 0,
}

function formFromOportunidade(op: Oportunidade) {
  const f = { ...DEFAULT_FORM }
  const keys = Object.keys(f) as (keyof typeof DEFAULT_FORM)[]
  keys.forEach((k) => {
    const v = op[k as keyof Oportunidade]
    if (v !== undefined && v !== null && v !== '') {
      ;(f as any)[k] = v
    }
  })
  // Datas chegam como ISO do PocketBase; o input type="date" precisa de yyyy-mm-dd.
  if (op.data_aquisicao) {
    f.data_aquisicao = op.data_aquisicao.split(' ')[0].split('T')[0]
  }
  return f
}

export default function NovaAnalise() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [loadingOp, setLoadingOp] = useState(isEdit)
  const [relatorioFile, setRelatorioFile] = useState<File | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [form, setForm] = useState({ ...DEFAULT_FORM })
  const [usuarios, setUsuarios] = useState<UserRef[]>([])
  const [participantes, setParticipantes] = useState<string[]>([])
  const [observadores, setObservadores] = useState<string[]>([])
  const [loadingBacen, setLoadingBacen] = useState(false)
  const [bacenInfoText, setBacenInfoText] = useState<string>('')

  const currentUserId = pb.authStore.record?.id
  const isAdmin = isCurrentUserAdmin()

  useEffect(() => {
    if (isAdmin) {
      getUsuarios()
        .then(setUsuarios)
        .catch(() => {})
    }
  }, [isAdmin])

  useEffect(() => {
    let active = true
    if (!id) {
      setForm({ ...DEFAULT_FORM })
      setParticipantes([])
      setObservadores([])
      setLoadingOp(false)
      return
    }
    setLoadingOp(true)
    getOportunidade(id)
      .then((op) => {
        if (!active) return
        const loadedForm = formFromOportunidade(op)
        // Se a oportunidade tiver indice_correcao salvo e não for Manual, busca info para feedback visual
        if (loadedForm.indice_correcao && loadedForm.indice_correcao !== 'Manual') {
          fetchUltimoIndiceBacen(loadedForm.indice_correcao as Exclude<IndiceBacenTipo, 'Manual'>)
            .then((res) => {
              if (active) setBacenInfoText(res.textoExibicao)
            })
            .catch(() => {
              if (active) {
                setBacenInfoText(
                  `${loadedForm.indice_correcao} — ${Number(loadedForm.indice_correcao_medio_mensal || 0).toLocaleString('pt-BR')}%`,
                )
              }
            })
        }
        setForm(loadedForm)
        // Sempre trata participantes/observadores como arrays.
        const parts = toIdArray(op.participantes)
        const obs = toIdArray(op.observadores)
        setParticipantes(parts)
        setObservadores(obs)

        // Se houver expand de participantes/observadores/usuario, guarda em setUsuarios para exibição correta dos nomes
        const loadedUsers: UserRef[] = []
        if (op.expand?.usuario) loadedUsers.push(op.expand.usuario)
        if (Array.isArray(op.expand?.participantes)) loadedUsers.push(...op.expand.participantes)
        if (Array.isArray(op.expand?.observadores)) loadedUsers.push(...op.expand.observadores)
        if (loadedUsers.length > 0) {
          setUsuarios((prev) => {
            const map = new Map<string, UserRef>()
            prev.forEach((u) => map.set(u.id, u))
            loadedUsers.forEach((u) => {
              if (u && u.id && !map.has(u.id)) map.set(u.id, u)
            })
            return Array.from(map.values())
          })
        }
      })
      .catch(() => {
        if (active) {
          toast({
            title: 'Erro',
            description: 'Oportunidade não encontrada para edição.',
            variant: 'destructive',
          })
          navigate('/nova-analise', { replace: true })
        }
      })
      .finally(() => {
        if (active) setLoadingOp(false)
      })
    return () => {
      active = false
    }
  }, [id])

  // Ao criar nova análise (sem id), carrega índice inicial (ex: TR)
  useEffect(() => {
    if (!id) {
      handleIndiceChange('TR')
    }
  }, [id])

  const handleIndiceChange = async (novoIndice: IndiceBacenTipo) => {
    setForm((prev) => ({
      ...prev,
      indice_correcao: novoIndice,
    }))
    setFieldErrors((prev) => ({ ...prev, indice_correcao: '', correcao_saldo_manual: '' }))

    if (novoIndice === 'Manual') {
      setBacenInfoText('')
      setForm((prev) => ({
        ...prev,
        indice_correcao_medio_mensal: Number(prev.correcao_saldo_manual) || 0,
      }))
      return
    }

    setLoadingBacen(true)
    try {
      const res = await fetchUltimoIndiceBacen(novoIndice)
      setBacenInfoText(res.textoExibicao)
      setForm((prev) => ({
        ...prev,
        indice_correcao_medio_mensal: res.valor,
      }))
      toast({
        title: `Índice ${novoIndice} atualizado`,
        description: res.textoExibicao,
      })
    } catch (err: any) {
      setBacenInfoText('')
      toast({
        title: `Erro ao consultar BACEN para ${novoIndice}`,
        description: err?.message || 'Não foi possível carregar a cotação do Banco Central.',
        variant: 'destructive',
      })
    } finally {
      setLoadingBacen(false)
    }
  }

  const handleChange = (field: string, value: any) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value }

      // 1. Taxa de juros automática por agente selecionado
      if (field === 'banco_selecionado') {
        const taxaAuto = TAXAS_JUROS_AGENTES[value]
        if (taxaAuto !== undefined) {
          next.taxa_juros_financiamento = taxaAuto
        }
      }

      // Se mudar correcao_saldo_manual no modo Manual, sincroniza com indice_correcao_medio_mensal
      if (field === 'correcao_saldo_manual' && prev.indice_correcao === 'Manual') {
        next.indice_correcao_medio_mensal = Number(value) || 0
      }

      // Lógica de preenchimento automático para Escritura, Registro e Averbação:
      // Executa se UF, valor_arrematacao ou valor_prefeitura_venal forem alterados.
      // Regra: "Os campos automáticos devem ser preenchidos apenas se o valor atual for 0 ou se a UF for alterada."
      if (field === 'uf' || field === 'valor_arrematacao' || field === 'valor_prefeitura_venal') {
        const ufChanged = field === 'uf' && value !== prev.uf
        const newUf = field === 'uf' ? value : prev.uf
        const newArrematacao =
          Number(field === 'valor_arrematacao' ? value : prev.valor_arrematacao) || 0
        const newVenal =
          Number(field === 'valor_prefeitura_venal' ? value : prev.valor_prefeitura_venal) || 0

        const calcEscritura = calculateEscritura(newArrematacao, newVenal)
        const { registro: calcRegistro, averbacao: calcAverbacao } = calculateRegistroEAverbacao(
          newUf,
          newArrematacao,
          newVenal,
        )

        if (ufChanged || Number(prev.escritura) === 0) {
          next.escritura = calcEscritura
        }
        if (ufChanged || Number(prev.registro) === 0) {
          next.registro = calcRegistro
        }
        if (ufChanged || Number(prev.averbacao) === 0) {
          next.averbacao = calcAverbacao
        }
      }

      return next
    })
    setFieldErrors((prev) => ({ ...prev, [field]: '' }))
  }
  const computed = {
    ...calculateMetrics({
      valor_mercado: Number(form.valor_mercado),
      valor_arrematacao: Number(form.valor_arrematacao),
      desagio_venda: Number(form.desagio_venda),
      tempo_estimado_venda_meses: Number(form.tempo_estimado_venda_meses),
      itbi_percent: Number(form.itbi_percent),
      comissao_leiloeiro_percent: Number(form.comissao_leiloeiro_percent),
      comissao_corretor_percent: Number(form.comissao_corretor_percent),
      escritura: Number(form.escritura),
      registro: Number(form.registro),
      averbacao: Number(form.averbacao),
      reforma_prevista: Number(form.reforma_prevista),
      assessoria_juridica: Number(form.assessoria_juridica),
      condominio_iptu_mensal: Number(form.condominio_iptu_mensal),
      dividas_condominio: Number(form.dividas_condominio),
      dividas_iptu: Number(form.dividas_iptu),
      ir_percent: Number(form.ir_percent),
      incluir_ir_despesas: form.incluir_ir_despesas,
      taxa_avaliacao: Number(form.taxa_avaliacao),
      taxas_judiciais: Number(form.taxas_judiciais),
      acordo_desocupacao: Number(form.acordo_desocupacao),
      baixa_gravames: Number(form.baixa_gravames),
      foro: Number(form.foro),
      valor_prefeitura_venal: Number(form.valor_prefeitura_venal),
    }),
    valor_parcela_mensal: 0,
    saldo_devedor: 0,
  }

  const financingParams: FinancingParams = {
    principal: Number(form.valor_arrematacao),
    annualRate: Number(form.taxa_juros_financiamento) || 8,
    termMonths: Number(form.prazo_financiamento) || 120,
    paymentsMade: Number(form.parcelas_pagas),
    method: form.modalidade_financiamento === 'SAC' ? 'SAC' : 'PRICE',
    entryPercent: Number(form.percentual_entrada) || 10,
    correcaoMensal: Number(form.indice_correcao_medio_mensal) || 0,
  }
  computed.valor_parcela_mensal = Math.round(calculateInstallment(financingParams) * 100) / 100
  computed.saldo_devedor = Math.round(calculateSaldoDevedor(financingParams) * 100) / 100

  // O botão de Salvar/Publicar só "acende" (fica ativo) quando os campos
  // obrigatórios Nome e Endereço estão preenchidos. Enquanto vazios, o botão
  // permanece desativado, dando feedback visual claro de que o formulário
  // ainda não pode ser publicado.
  const canSubmit = form.nome.trim() !== '' && form.endereco.trim() !== ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nome || !form.endereco) {
      toast({
        title: 'Atenção',
        description: 'Nome e Endereço são obrigatórios.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    setFieldErrors({})
    try {
      // Se houver arquivo anexo (relatorioFile), precisamos usar FormData.
      // Se usarmos FormData, para enviar arrays para o PocketBase JS SDK sem correr
      // o risco de sobrescrever chaves repetidas (Causa Raiz #1), enviamos o FormData
      // com cada participante appendado e garantimos que o SDK envie no formato correto,
      // OU enviamos objeto plano se não houver arquivo.
      if (relatorioFile) {
        const formData = new FormData()
        Object.entries(form).forEach(([key, val]) => {
          if (key === 'valor_venda_real') {
            if (val !== '' && val != null) {
              formData.append(key, String(Number(val)))
            } else {
              formData.append(key, '')
            }
          } else {
            formData.append(key, String(val))
          }
        })
        Object.entries(computed).forEach(([key, val]) => {
          formData.append(key, String(val))
        })
        // No PocketBase JS SDK, para enviar array em FormData com arquivos,
        // repetidos appends de 'participantes' e 'observadores' funcionam se enviados no FormData.
        // Contudo, se o array for vazio ou se o SDK esperar entradas indexadas/repetidas:
        participantes.forEach((pid) => formData.append('participantes', pid))
        observadores.forEach((oid) => formData.append('observadores', oid))
        formData.append('relatorio_viabilidade', relatorioFile)

        if (isEdit && id) {
          await updateOportunidade(id, formData)
          toast({ title: 'Sucesso', description: 'Oportunidade atualizada com sucesso!' })
          navigate(`/oportunidade/${id}`)
        } else {
          const created = await createOportunidade(formData)
          toast({ title: 'Sucesso', description: 'Oportunidade cadastrada com sucesso!' })
          navigate(`/oportunidade/${created.id}`)
        }
      } else {
        // Envio JSON plano (sem arquivo) — evita totalmente a armadilha do FormData.
        const payload: any = {
          ...form,
          valor_venda_real:
            form.valor_venda_real !== '' && form.valor_venda_real != null
              ? Number(form.valor_venda_real)
              : null,
          ...computed,
          participantes: participantes,
          observadores: observadores,
        }

        if (isEdit && id) {
          await updateOportunidade(id, payload)
          toast({ title: 'Sucesso', description: 'Oportunidade atualizada com sucesso!' })
          navigate(`/oportunidade/${id}`)
        } else {
          const created = await createOportunidade(payload)
          toast({ title: 'Sucesso', description: 'Oportunidade cadastrada com sucesso!' })
          navigate(`/oportunidade/${created.id}`)
        }
      }
    } catch (err) {
      setFieldErrors(extractFieldErrors(err))
      toast({ title: 'Erro ao salvar', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const numericFieldError = (field: string) =>
    fieldErrors[field] ? <p className="text-xs text-red-500 mt-1">{fieldErrors[field]}</p> : null

  if (loadingOp) {
    return (
      <div className="py-12 text-center text-[#7A6A5A] font-medium">
        Carregando oportunidade para edição...
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#5C3A21]">
            {isEdit ? 'Editar Análise de Viabilidade' : 'Nova Análise de Viabilidade'}
          </h1>
          <p className="text-sm text-[#7A6A5A]">
            {isEdit
              ? 'Atualize os parâmetros da oportunidade'
              : 'Cadastre os parâmetros da oportunidade obtidos na calculadora'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading || !canSubmit}
            className="bg-[#F97316] hover:bg-[#EA580C] text-white font-medium"
          >
            {loading ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Salvar Oportunidade'}
          </Button>
        </div>
      </div>

      <Card className="border-[#EDE4D8]">
        <CardHeader>
          <CardTitle className="text-base font-bold text-[#5C3A21]">
            1. Identificação da Oportunidade
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nome da Oportunidade *</Label>
            <Input
              required
              placeholder="Ex: Apt Jardim América"
              value={form.nome}
              onChange={(e) => handleChange('nome', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Endereço Completo *</Label>
            <Input
              required
              placeholder="Rua, Número, Bairro - Cidade"
              value={form.endereco}
              onChange={(e) => handleChange('endereco', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>UF (Estado)</Label>
            <Select value={form.uf} onValueChange={(v) => handleChange('uf', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o Estado (UF)" />
              </SelectTrigger>
              <SelectContent>
                {UFS.map((uf) => (
                  <SelectItem key={uf} value={uf}>
                    {uf}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tipo de Leilão</Label>
            <Select value={form.tipo_leilao} onValueChange={(v) => handleChange('tipo_leilao', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Judicial">Judicial</SelectItem>
                <SelectItem value="Extrajudicial">Extrajudicial</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Agente</Label>
            <Select
              value={form.banco_selecionado}
              onValueChange={(v) => handleChange('banco_selecionado', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AGENTES.map((ag) => (
                  <SelectItem key={ag} value={ag}>
                    {ag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Data de Aquisição</Label>
            <Input
              type="date"
              value={form.data_aquisicao}
              onChange={(e) => handleChange('data_aquisicao', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Status Inicial</Label>
            <Select value={form.status} onValueChange={(v) => handleChange('status', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Em análise">Em análise</SelectItem>
                <SelectItem value="Arrematada">Arrematada</SelectItem>
                <SelectItem value="Em andamento">Em andamento</SelectItem>
                <SelectItem value="Vendida">Vendida</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#EDE4D8]">
        <CardHeader>
          <CardTitle className="text-base font-bold text-[#5C3A21] flex items-center gap-2">
            <Users className="w-5 h-5 text-[#F97316]" />
            Sócios / Participantes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ParticipantesSelector
            usuarios={usuarios}
            participantes={participantes}
            observadores={observadores}
            creatorId={currentUserId}
            canManage={true}
            isAdmin={isAdmin}
            searchMode={isAdmin ? 'browse' : 'email-lookup'}
            onChange={(p, o) => {
              setParticipantes(p)
              setObservadores(o)
            }}
          />
        </CardContent>
      </Card>

      <Card className="border-[#EDE4D8]">
        <CardHeader>
          <CardTitle className="text-base font-bold text-[#5C3A21] flex items-center gap-2">
            <FileUp className="w-5 h-5 text-[#F97316]" />
            2. Anexo do Relatório da Calculadora (PDF/XLSX)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input
            type="file"
            accept=".pdf,.xlsx,.xls"
            onChange={(e) => setRelatorioFile(e.target.files?.[0] || null)}
          />
          <p className="text-xs text-[#7A6A5A]">
            O arquivo PDF ou planilha do relatório de viabilidade será armazenado junto aos
            parâmetros do cadastro.
          </p>
        </CardContent>
      </Card>

      <Card className="border-[#EDE4D8]">
        <CardHeader>
          <CardTitle className="text-base font-bold text-[#5C3A21]">
            3. Parâmetros de Entrada & Valores
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Valor de Mercado (R$)</Label>
            <Input
              type="number"
              value={form.valor_mercado}
              onChange={(e) => handleChange('valor_mercado', e.target.value)}
            />
            {numericFieldError('valor_mercado')}
          </div>
          <div className="space-y-2">
            <Label>Valor Arrematação (R$)</Label>
            <Input
              type="number"
              value={form.valor_arrematacao}
              onChange={(e) => handleChange('valor_arrematacao', e.target.value)}
            />
            {numericFieldError('valor_arrematacao')}
          </div>
          <div className="space-y-2">
            <Label>Deságio para Venda (%)</Label>
            <Input
              type="number"
              step="0.1"
              value={form.desagio_venda}
              onChange={(e) => handleChange('desagio_venda', e.target.value)}
            />
            {numericFieldError('desagio_venda')}
          </div>
          <div className="space-y-2">
            <Label>Tempo Estimado Venda (meses)</Label>
            <Input
              type="number"
              value={form.tempo_estimado_venda_meses}
              onChange={(e) => handleChange('tempo_estimado_venda_meses', e.target.value)}
            />
            {numericFieldError('tempo_estimado_venda_meses')}
          </div>
          <div className="space-y-2">
            <Label>Índice de Correção de Saldo</Label>
            <div className="flex gap-2 items-center">
              <Select
                value={form.indice_correcao}
                onValueChange={(v) => handleIndiceChange(v as IndiceBacenTipo)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INDICES_CORRECAO.map((ind) => (
                    <SelectItem key={ind} value={ind}>
                      {ind}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {loadingBacen && <Loader2 className="w-4 h-4 animate-spin text-[#F97316]" />}
            </div>
            {form.indice_correcao === 'Manual' ? (
              <div className="mt-2 space-y-1">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Informe a taxa mensal (%)"
                  value={form.correcao_saldo_manual}
                  onChange={(e) => handleChange('correcao_saldo_manual', e.target.value)}
                />
                <p className="text-xs text-[#7A6A5A]">Valor manual em % ao mês.</p>
              </div>
            ) : (
              bacenInfoText && (
                <p className="text-xs font-semibold text-[#16A34A] bg-[#DCFCE7] px-2 py-1 rounded border border-[#86EFAC] mt-1">
                  {bacenInfoText}
                </p>
              )
            )}
          </div>
          <div className="space-y-2">
            <Label>Taxa de Juros Financiamento (% a.a.)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.taxa_juros_financiamento}
              onChange={(e) => handleChange('taxa_juros_financiamento', e.target.value)}
            />
            <p className="text-xs text-[#7A6A5A]">
              Preenchida automaticamente pelo Agente (editável).
            </p>
            {numericFieldError('taxa_juros_financiamento')}
          </div>
          <div className="space-y-2">
            <Label>Prazo do Financiamento (meses)</Label>
            <Input
              type="number"
              value={form.prazo_financiamento}
              onChange={(e) => handleChange('prazo_financiamento', e.target.value)}
            />
            {numericFieldError('prazo_financiamento')}
          </div>
          <div className="space-y-2">
            <Label>Valor Prefeitura (Venal) (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.valor_prefeitura_venal}
              onChange={(e) => handleChange('valor_prefeitura_venal', e.target.value)}
            />
            {numericFieldError('valor_prefeitura_venal')}
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#EDE4D8]">
        <CardHeader>
          <CardTitle className="text-base font-bold text-[#5C3A21]">
            4. Custos e Alíquotas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Aquisição */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#8B5A2B] mb-3">
              Aquisição
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Percentual de Entrada — Sinal (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.percentual_entrada}
                  onChange={(e) => handleChange('percentual_entrada', e.target.value)}
                />
                {numericFieldError('percentual_entrada')}
              </div>
              <div className="space-y-2">
                <Label>Comissão Leiloeiro (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.comissao_leiloeiro_percent}
                  onChange={(e) => handleChange('comissao_leiloeiro_percent', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Tributos */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#8B5A2B] mb-3">
              Tributos
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>ITBI (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.itbi_percent}
                  onChange={(e) => handleChange('itbi_percent', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Escritura (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.escritura}
                  onChange={(e) => handleChange('escritura', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Registro (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.registro}
                  onChange={(e) => handleChange('registro', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Averbação AF (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.averbacao}
                  onChange={(e) => handleChange('averbacao', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Desocupação */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#8B5A2B] mb-3">
              Desocupação
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Acordo Desocupação (R$)</Label>
                <Input
                  type="number"
                  value={form.acordo_desocupacao}
                  onChange={(e) => handleChange('acordo_desocupacao', e.target.value)}
                />
                {numericFieldError('acordo_desocupacao')}
              </div>
              <div className="space-y-2">
                <Label>Reforma Prevista (R$)</Label>
                <Input
                  type="number"
                  value={form.reforma_prevista}
                  onChange={(e) => handleChange('reforma_prevista', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Assessoria Jurídica (R$)</Label>
                <Input
                  type="number"
                  value={form.assessoria_juridica}
                  onChange={(e) => handleChange('assessoria_juridica', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Taxas Judiciais (R$)</Label>
                <Input
                  type="number"
                  value={form.taxas_judiciais}
                  onChange={(e) => handleChange('taxas_judiciais', e.target.value)}
                />
                {numericFieldError('taxas_judiciais')}
              </div>
            </div>
          </div>

          {/* Mensais */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#8B5A2B] mb-3">
              Mensais
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Condomínio + IPTU Mensal (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.condominio_iptu_mensal}
                  onChange={(e) => handleChange('condominio_iptu_mensal', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Dívidas de Condomínio (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.dividas_condominio}
                  onChange={(e) => handleChange('dividas_condominio', e.target.value)}
                />
                {numericFieldError('dividas_condominio')}
              </div>
              <div className="space-y-2">
                <Label>Dívidas de IPTU (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.dividas_iptu}
                  onChange={(e) => handleChange('dividas_iptu', e.target.value)}
                />
                {numericFieldError('dividas_iptu')}
              </div>
            </div>
          </div>

          {/* Venda */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#8B5A2B] mb-3">Venda</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Valor de Venda Real (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Deixar em branco se não vendido"
                  value={form.valor_venda_real}
                  onChange={(e) => handleChange('valor_venda_real', e.target.value)}
                />
                <p className="text-xs text-[#7A6A5A]">
                  Opcional. Se preenchido, define o valor real de venda da oportunidade.
                </p>
                {numericFieldError('valor_venda_real')}
              </div>
              <div className="space-y-2">
                <Label>Comissão Corretor (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.comissao_corretor_percent}
                  onChange={(e) => handleChange('comissao_corretor_percent', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Outros custos */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#8B5A2B] mb-3">
              Outros Custos
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Taxa de Avaliação (R$)</Label>
                <Input
                  type="number"
                  value={form.taxa_avaliacao}
                  onChange={(e) => handleChange('taxa_avaliacao', e.target.value)}
                />
                {numericFieldError('taxa_avaliacao')}
              </div>
              <div className="space-y-2">
                <Label>Baixa Gravames (R$)</Label>
                <Input
                  type="number"
                  value={form.baixa_gravames}
                  onChange={(e) => handleChange('baixa_gravames', e.target.value)}
                />
                {numericFieldError('baixa_gravames')}
              </div>
              <div className="space-y-2">
                <Label>Foro (R$)</Label>
                <Input
                  type="number"
                  value={form.foro}
                  onChange={(e) => handleChange('foro', e.target.value)}
                />
                {numericFieldError('foro')}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#EDE4D8] bg-[#FFF4E8]/50">
        <CardHeader>
          <CardTitle className="text-base font-bold text-[#5C3A21] flex items-center gap-2">
            <Calculator className="w-5 h-5 text-[#F97316]" />
            5. Resumo Calculado em Tempo Real
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-[#EDE4D8]">
            <div>
              <Label className="text-sm font-medium text-[#5C3A21]">
                Incluir Ganho de Capital (IR) nas despesas
              </Label>
              <p className="text-xs text-[#7A6A5A] mt-0.5">
                Quando desativado, o IR não será descontado do lucro esperado.
              </p>
            </div>
            <Switch
              checked={form.incluir_ir_despesas}
              onCheckedChange={(checked) => handleChange('incluir_ir_despesas', checked)}
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-white rounded-lg border border-[#EDE4D8]">
              <p className="text-xs text-[#7A6A5A]">Venda c/ Desconto</p>
              <p className="text-lg font-bold text-[#5C3A21]">
                {formatBRL(computed.valor_venda_com_desconto)}
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-[#EDE4D8]">
              <p className="text-xs text-[#7A6A5A]">Lucro Esperado</p>
              <p className="text-lg font-bold text-[#16A34A]">
                {formatBRL(computed.maior_lucro_esperado)}
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-[#EDE4D8]">
              <p className="text-xs text-[#7A6A5A]">ROI no Período</p>
              <p className="text-lg font-bold text-[#F97316]">
                {formatPercent(computed.roi_esperado_periodo)}
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-[#EDE4D8]">
              <p className="text-xs text-[#7A6A5A]">Lance Teto Recomendado</p>
              <p className="text-lg font-bold text-[#8B5A2B]">{formatBRL(computed.lance_teto)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={() => navigate(-1)}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={loading || !canSubmit}
          className="bg-[#F97316] hover:bg-[#EA580C] text-white px-8 py-5 font-semibold shadow-md"
        >
          {loading ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Salvar Oportunidade'}
        </Button>
      </div>
    </form>
  )
}
