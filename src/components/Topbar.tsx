import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Menu, User } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Sidebar } from '@/components/Sidebar'
import { useAuth } from '@/hooks/use-auth'

export function Topbar() {
  const location = useLocation()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)

  const getPageTitle = (path: string) => {
    if (path === '/') return 'Dashboard Principal'
    if (path === '/nova-analise') return 'Nova Análise de Viabilidade'
    if (path === '/lancamentos') return 'Lançamentos de Despesas & Receitas'
    if (path === '/historico') return 'Histórico de Oportunidades'
    if (path === '/alterar-senha') return 'Alterar Minha Senha'
    if (path.startsWith('/oportunidade/')) return 'Detalhe da Oportunidade'
    return 'Gestão de Leilões'
  }

  return (
    <header className="h-16 bg-[#FAF7F2] border-b border-[#EDE4D8] px-4 md:px-8 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button className="md:hidden p-2 text-[#5C3A21] hover:bg-[#EDE4D8] rounded-md">
              <Menu className="w-6 h-6" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[260px] border-r-0">
            <Sidebar onItemClick={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <h2 className="font-bold text-lg md:text-xl text-[#2D1B0E]">
          {getPageTitle(location.pathname)}
        </h2>
      </div>

      <div className="flex items-center gap-3">
        <a
          href="/alterar-senha"
          title="Minha Conta / Alterar Senha"
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white border border-[#EDE4D8] rounded-full shadow-subtle hover:border-[#F97316] transition-colors"
        >
          <User className="w-4 h-4 text-[#F97316]" />
          <span className="text-xs font-semibold text-[#5C3A21]">
            {user?.name || 'Investidor de Leilões'}
          </span>
        </a>
      </div>
    </header>
  )
}
