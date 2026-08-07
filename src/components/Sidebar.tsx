import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, PlusCircle, Wallet, History, LogOut, Gavel } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'

interface SidebarProps {
  onItemClick?: () => void
}

export function Sidebar({ onItemClick }: SidebarProps) {
  const location = useLocation()
  const { user, signOut } = useAuth()

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Nova Análise', path: '/nova-analise', icon: PlusCircle },
    { label: 'Lançamentos', path: '/lancamentos', icon: Wallet },
    { label: 'Histórico', path: '/historico', icon: History },
  ]

  return (
    <aside className="w-full md:w-[260px] bg-[#5C3A21] text-white flex flex-col h-full min-h-screen">
      <div className="p-6 flex items-center gap-3 border-b border-[#7A4F2E]">
        <div className="p-2 bg-[#F97316] rounded-lg text-white">
          <Gavel className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight tracking-wide">Gestão de Leilões</h1>
          <p className="text-xs text-[#E3CBB5]">Investimentos Imobiliários</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onItemClick}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-[#F97316] text-white shadow-md font-semibold'
                  : 'text-[#E3CBB5] hover:bg-[#7A4F2E] hover:text-white',
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-[#7A4F2E] bg-[#4D2E18]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-full bg-[#F97316] flex items-center justify-center text-white font-bold text-sm shrink-0">
              {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="truncate text-xs">
              <p className="font-medium text-white truncate">{user?.name || 'Investidor'}</p>
              <p className="text-[#E3CBB5] truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            title="Sair"
            className="p-2 text-[#E3CBB5] hover:text-white hover:bg-[#7A4F2E] rounded-md transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
