import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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
import { Input } from '@/components/ui/input'
import { Search, PlusCircle, ArrowUpRight } from 'lucide-react'
import { getOportunidades, Oportunidade } from '@/services/oportunidades'
import { getLancamentos, Lancamento } from '@/services/lancamentos'
import { formatBRL, formatPercent, formatDate } from '@/lib/formatters'
import { StatusBadge } from '@/components/StatusBadge'

export default function Historico() {
  const [oportunidades, setOportunidades] = useState<Oportunidade[]>([])
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Todos')

  useEffect(() => {
    Promise.all([getOportunidades(), getLancamentos()]).then(([ops, lans]) => {
      setOportunidades(ops)
      setLancamentos(lans)
      setLoading(false)
    })
  }, [])

  const filtered = oportunidades.filter((op) => {
    const matchesSearch =
      op.nome.toLowerCase().includes(search.toLowerCase()) ||
      op.endereco.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'Todos' || op.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const statuses = ['Todos', 'Em análise', 'Arrematada', 'Em andamento', 'Vendida']

  if (loading) {
    return <div className="py-12 text-center text-[#7A6A5A]">Carregando histórico...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#5C3A21]">Histórico de Oportunidades</h1>
          <p className="text-sm text-[#7A6A5A]">Todas as oportunidades analisadas e arrematadas</p>
        </div>
        <Link to="/nova-analise">
          <Button className="bg-[#F97316] hover:bg-[#EA580C] text-white gap-2 font-medium">
            <PlusCircle className="w-4 h-4" /> Nova Análise
          </Button>
        </Link>
      </div>

      <Card className="border-[#EDE4D8]">
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-3 text-[#7A6A5A]" />
              <Input
                placeholder="Buscar por nome ou endereço..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 border-[#EDE4D8]"
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              {statuses.map((st) => (
                <Button
                  key={st}
                  variant={statusFilter === st ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(st)}
                  className={
                    statusFilter === st
                      ? 'bg-[#5C3A21] text-white'
                      : 'text-[#5C3A21] border-[#EDE4D8]'
                  }
                >
                  {st}
                </Button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="text-center py-8 text-sm text-[#7A6A5A]">
              Nenhuma oportunidade encontrada com esses filtros.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[#EDE4D8]">
                  <TableHead>Oportunidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Arrematação</TableHead>
                  <TableHead className="text-right">Total Gasto</TableHead>
                  <TableHead className="text-right">Retorno Est.</TableHead>
                  <TableHead className="text-right">ROI Est.</TableHead>
                  <TableHead className="text-center">Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((op) => {
                  const despesas = lancamentos
                    .filter((l) => l.oportunidade === op.id && l.tipo === 'Despesa')
                    .reduce((acc, l) => acc + l.valor, 0)
                  return (
                    <TableRow key={op.id} className="border-[#EDE4D8] hover:bg-[#FAF7F2]">
                      <TableCell className="font-semibold text-[#2D1B0E]">
                        <Link
                          to={`/oportunidade/${op.id}`}
                          className="hover:text-[#F97316] flex items-center gap-1"
                        >
                          {op.nome}
                          <ArrowUpRight className="w-3.5 h-3.5 text-[#7A6A5A]" />
                        </Link>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={op.status} />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatBRL(op.valor_arrematacao)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-amber-900">
                        {formatBRL(despesas)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-green-700">
                        {formatBRL(op.retorno_estimado || op.maior_lucro_esperado)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-[#F97316]">
                        {formatPercent(op.roi_esperado_periodo)}
                      </TableCell>
                      <TableCell className="text-center text-xs text-[#7A6A5A]">
                        {formatDate(op.data_aquisicao || op.created)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
