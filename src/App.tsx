import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/hooks/use-auth'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import Layout from '@/components/Layout'

import Login from '@/pages/Login'
import Cadastro from '@/pages/Cadastro'
import RecuperarSenha from '@/pages/RecuperarSenha'
import Dashboard from '@/pages/Dashboard'
import NovaAnalise from '@/pages/NovaAnalise'
import OportunidadeDetalhe from '@/pages/OportunidadeDetalhe'
import ChecklistOportunidade from '@/pages/ChecklistOportunidade'
import RelatorioFinal from '@/pages/RelatorioFinal'
import Lancamentos from '@/pages/Lancamentos'
import Historico from '@/pages/Historico'
import AlterarSenha from '@/pages/AlterarSenha'
import NotFound from '@/pages/NotFound'

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/recuperar-senha" element={<RecuperarSenha />} />

          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/nova-analise" element={<NovaAnalise />} />
            <Route path="/nova-analise/:id" element={<NovaAnalise />} />
            <Route path="/oportunidade/:id" element={<OportunidadeDetalhe />} />
            <Route path="/oportunidade/:id/checklist" element={<ChecklistOportunidade />} />
            <Route path="/oportunidade/:id/relatorio" element={<RelatorioFinal />} />
            <Route path="/leilao/:id/relatorio" element={<RelatorioFinal />} />
            <Route path="/lancamentos" element={<Lancamentos />} />
            <Route path="/historico" element={<Historico />} />
            <Route path="/alterar-senha" element={<AlterarSenha />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
