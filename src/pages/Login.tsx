import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Lock, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import logoImg from '@/assets/logochamada-s-fundo-e6c10.png'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      setErrorMsg(getErrorMessage(error))
    } else {
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#3D2314] via-[#5C3A21] to-[#EA580C]">
      <Card className="w-full max-w-md shadow-2xl border-none bg-white/95 backdrop-blur-md overflow-hidden rounded-2xl">
        <div className="bg-[#2D1B0E] p-6 text-center border-b border-[#5C3A21]">
          <div className="bg-white rounded-xl px-6 py-4 inline-block shadow-lg">
            <img
              src={logoImg}
              alt="Dou-lhe Três - Assessoria em Leilões Imobiliários"
              className="h-24 w-auto mx-auto object-contain max-w-[220px]"
            />
          </div>
        </div>
        <CardHeader className="text-center pb-2 pt-4">
          <CardTitle className="text-xl font-bold text-[#5C3A21]">
            Sistema de Gestão de Leilões
          </CardTitle>
          <CardDescription className="text-[#7A6A5A] text-xs">
            Acesse seu painel para gerenciar viabilidade, despesas e retornos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg animate-fade-in">
                {errorMsg}
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-[#2D1B0E] text-xs font-semibold">E-mail</Label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7A6A5A]" />
                <Input
                  type="email"
                  required
                  placeholder="seu.email@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 border-[#EDE4D8] focus-visible:ring-[#F97316]"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[#2D1B0E] text-xs font-semibold">Senha</Label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7A6A5A]" />
                <Input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 border-[#EDE4D8] focus-visible:ring-[#F97316]"
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold py-5 gap-2 shadow-md transition-all"
            >
              {loading ? 'Entrando...' : 'Entrar no Sistema'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </Button>
            <p className="text-center text-xs text-[#7A6A5A] pt-2">
              Ainda não possui acesso?{' '}
              <Link to="/cadastro" className="text-[#F97316] font-semibold hover:underline">
                Criar nova conta
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
