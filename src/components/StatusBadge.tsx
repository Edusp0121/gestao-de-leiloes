import { Badge } from '@/components/ui/badge'

interface StatusBadgeProps {
  status?: 'Em análise' | 'Arrematada' | 'Em andamento' | 'Vendida' | string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  switch (status) {
    case 'Em análise':
      return (
        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-300">
          Em análise
        </Badge>
      )
    case 'Arrematada':
      return (
        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-300">
          Arrematada
        </Badge>
      )
    case 'Em andamento':
      return (
        <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200 border-purple-300">
          Em andamento
        </Badge>
      )
    case 'Vendida':
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-300">
          Vendida
        </Badge>
      )
    default:
      return <Badge variant="outline">{status || 'Pendente'}</Badge>
  }
}
