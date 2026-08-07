import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createOportunidade } from '@/services/oportunidades'
import { calculateMetrics } from '@/lib/calculator-utils'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { FileUp, Calculator } from 'lucide-react'

export default function NovaAnalise() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [relatorioFile, setRelatorioFile] = useState<File | null>(null)

  const [form, setForm] = useState({
    nome: '',
    endereco: '',
    tipo_leilao: 'Judicial' as 'Judicial' | 'Extrajudicial',
    banco_selecionado: 'Caixa Leilão',
    data_aquisicao: new Date().toISOString().split('T')[0],
    status: 'Em análise' as 'Em análise' | 'Arrematada' | 'Em andamento' | 'Vendida',
    desagio_venda: 10,
    valor_mercado: 2400000,
    valor_arrematacao: 600000,
    tempo_estimado_venda_meses: 10,
    indice_correcao_medio_mensal: 0.85,
    itbi_percent: 3,
    comissao_leiloeiro_percent: 5,
    comissao_corretor_percent: 6,
    escritura: 0,
    registro: 0,
    averbacao: 0,
    reforma_prevista: 30000,
    assessoria_juridica: 0,
    condominio_iptu_mensal: 3172.88,
    modalidade_financiamento: 'SAC' as 'À Vista' | 'SAC' | 'PRICE',
    banco_responsavel_financiamento: '',
    taxa_juros_financiamento: 10.5,
    aliquota_reajuste: 0,
    valor_parcela_mensal: 15127.5,
    saldo_devedor: 326497.82,
    parcelas_pagas: 157194.4,
    ir_percent: 15,
  })

  const handleChange = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const computed = calculateMetrics({
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
    ir_percent: Number(form.ir_percent),
  })

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
    try {
      const formData = new FormData()
      Object.entries(form).forEach(([key, val]) => {
        formData.append(key, String(val))
      })
      Object.entries(computed).forEach(([key, val]) => {
        formData.append(key, String(val))
      })
      if (relatorioFile) {
        formData.append('relatorio_viabilidade', relatorioFile)
      }

      const created = await createOportunidade(formData)
      toast({ title: 'Sucesso', description: 'Oportunidade cadastrada com sucesso!' })
      navigate(`/oportunidade/${created.id}`)
    } catch (err) {
      toast({ title: 'Erro ao salvar', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#5C3A21]">Nova Análise de Viabilidade</h1>
          <p className="text-sm text-[#7A6A5A]">
            Cadastre os parâmetros da oportunidade obtidos na calculadora
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-[#F97316] hover:bg-[#EA580C] text-white font-medium"
          >
            {loading ? 'Salvando...' : 'Salvar Oportunidade'}
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
              placeholder="Rua, Número, Bairro - Cidade/UF"
              value={form.endereco}
              onChange={(e) => handleChange('endereco', e.target.value)}
            />
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
            <Label>Banco / Leiloeiro</Label>
            <Input
              value={form.banco_selecionado}
              onChange={(e) => handleChange('banco_selecionado', e.target.value)}
            />
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
          </div>
          <div className="space-y-2">
            <Label>Valor Arrematação (R$)</Label>
            <Input
              type="number"
              value={form.valor_arrematacao}
              onChange={(e) => handleChange('valor_arrematacao', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Deságio para Venda (%)</Label>
            <Input
              type="number"
              step="0.1"
              value={form.desagio_venda}
              onChange={(e) => handleChange('desagio_venda', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Tempo Estimado Venda (meses)</Label>
            <Input
              type="number"
              value={form.tempo_estimado_venda_meses}
              onChange={(e) => handleChange('tempo_estimado_venda_meses', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Índice Correção Média Mensal (%)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.indice_correcao_medio_mensal}
              onChange={(e) => handleChange('indice_correcao_medio_mensal', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#EDE4D8]">
        <CardHeader>
          <CardTitle className="text-base font-bold text-[#5C3A21]">
            4. Custos e Alíquotas
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
            <Label>Comissão Leiloeiro (%)</Label>
            <Input
              type="number"
              step="0.1"
              value={form.comissao_leiloeiro_percent}
              onChange={(e) => handleChange('comissao_leiloeiro_percent', e.target.value)}
            />
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
          <div className="space-y-2">
            <Label>Reforma Prevista (R$)</Label>
            <Input
              type="number"
              value={form.reforma_prevista}
              onChange={(e) => handleChange('reforma_prevista', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Condomínio + IPTU Mensal (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.condominio_iptu_mensal}
              onChange={(e) => handleChange('condominio_iptu_mensal', e.target.value)}
            />
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
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-3 bg-white rounded-lg border border-[#EDE4D8]">
            <p className="text-xs text-[#7A6A5A]">Venda c/ Desconto</p>
            <p className="text-lg font-bold text-[#5C3A21]">
              R$ {computed.valor_venda_com_desconto.toLocaleString('pt-BR')}
            </p>
          </div>
          <div className="p-3 bg-white rounded-lg border border-[#EDE4D8]">
            <p className="text-xs text-[#7A6A5A]">Lucro Esperado</p>
            <p className="text-lg font-bold text-[#16A34A]">
              R$ {computed.maior_lucro_esperado.toLocaleString('pt-BR')}
            </p>
          </div>
          <div className="p-3 bg-white rounded-lg border border-[#EDE4D8]">
            <p className="text-xs text-[#7A6A5A]">ROI no Período</p>
            <p className="text-lg font-bold text-[#F97316]">{computed.roi_esperado_periodo}%</p>
          </div>
          <div className="p-3 bg-white rounded-lg border border-[#EDE4D8]">
            <p className="text-xs text-[#7A6A5A]">Lance Teto Recomendado</p>
            <p className="text-lg font-bold text-[#8B5A2B]">
              R$ {computed.lance_teto.toLocaleString('pt-BR')}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={() => navigate(-1)}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="bg-[#F97316] hover:bg-[#EA580C] text-white px-8 py-5 font-semibold shadow-md"
        >
          {loading ? 'Salvando...' : 'Salvar Oportunidade'}
        </Button>
      </div>
    </form>
  )
}
