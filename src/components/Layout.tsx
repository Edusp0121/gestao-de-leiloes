import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/Sidebar'
import { Menu } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import logoImg from '@/assets/logochamada-s-fundo-e6c10.png'

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen flex bg-[#FAF7F2]">
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-[260px] shrink-0">
        <Sidebar />
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between bg-[#2D1B0E] px-4 py-3 text-white border-b border-[#5C3A21] sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <img
              src={logoImg}
              alt="Dou-lhe Três Logo"
              className="h-9 w-auto object-contain max-w-[140px]"
            />
            <span className="font-bold text-sm tracking-wide text-[#F97316]">
              Gestão de Leilões
            </span>
          </div>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger className="p-2 text-[#E3CBB5] hover:text-white rounded-lg focus:outline-none">
              <Menu className="w-6 h-6" />
            </SheetTrigger>
            <SheetContent side="left" className="p-0 border-r-0 bg-[#2D1B0E] w-[270px]">
              <SheetTitle className="sr-only">Menu de Navegação</SheetTitle>
              <Sidebar onItemClick={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
