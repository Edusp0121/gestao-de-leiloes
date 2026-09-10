import { Link } from 'react-router-dom'
import { Menu, User } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface HeaderProps {
  title: string
  onOpenMobileMenu: () => void
}

export function Header({ title, onOpenMobileMenu }: HeaderProps) {
  const { user } = useAuth()

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-[#EDE4D8] bg-[#FAF7F2]/90 backdrop-blur-md px-4 md:px-8">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 rounded-lg text-[#5C3A21] hover:bg-[#EDE4D8] md:hidden"
          aria-label="Abrir Menu"
        >
          <Menu className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-bold text-[#2D1B0E]">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <Link
          to="/alterar-senha"
          title="Minha Conta / Alterar Senha"
          className="flex items-center gap-3 hover:opacity-85 transition-opacity"
        >
          <div className="hidden sm:flex flex-col items-end text-right">
            <span className="text-sm font-semibold text-[#2D1B0E]">
              {user?.name || 'Investidor de Leilões'}
            </span>
            <span className="text-xs text-[#7A6A5A]">Conta Ativa • Alterar Senha</span>
          </div>
          <Avatar className="h-9 w-9 border border-[#F97316] bg-[#5C3A21] text-white">
            <AvatarFallback className="bg-[#5C3A21] text-white font-bold text-xs">
              {user?.name?.slice(0, 2)?.toUpperCase() || <User className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </header>
  )
}
