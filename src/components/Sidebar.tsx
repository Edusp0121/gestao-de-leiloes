import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, PlusCircle, Wallet, History, LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import logoImg from '@/assets/logochamada-s-fundo-e6c10.png'

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
    <aside className="w-full md:w-[260px] bg-[#2D1B0E] text-white flex flex-col h-full min-h-screen shadow-xl">
      <div className="p-5 flex flex-col items-center justify-center border-b border-[#5C3A21] bg-[#22130A]">
        <Link to="/" onClick={onItemClick} className="block transition-transform hover:scale-105">
          <img
            src={logoImg}
            alt="Dou-lhe Três - Assessoria em Leilões Imobiliários"
            className="h-20 w-auto object-contain"
          />
        </Link>
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
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-[#F97316] text-white shadow-md font-semibold'
                  : 'text-[#E3CBB5] hover:bg-[#5C3A21] hover:text-white',
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-[#5C3A21] bg-[#22130A]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-full bg-[#F97316] flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-inner">
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
            className="p-2 text-[#E3CBB5] hover:text-white hover:bg-[#5C3A21] rounded-lg transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
