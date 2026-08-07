import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Gavel, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export default function Cadastro() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setLoading(true)
    const { error } = await signUp(email, password, name)
    setLoading(false)
    if (error) {
      setErrorMsg(getErrorMessage(error))
    } else {
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#5C3A21] via-[#8B5A2B] to-[#F97316]">
      <Card className="w-full max-w-md shadow-2xl border-none bg-white/95 backdrop-blur">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto p-3 bg-[#F97316] text-white rounded-2xl w-fit shadow-lg mb-3">
            <Gavel className="w-8 h-8" />
          </div>
          <CardTitle className="text-2xl font-bold text-[#5C3A21]">Nova Conta</CardTitle>
          <CardDescription className="text-[#7A6A5A]">
            Cadastre-se para gerenciar suas análises de leilão
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg">
                {errorMsg}
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-[#2D1B0E]">Nome Completo</Label>
              <Input
                required
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border-[#EDE4D8]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#2D1B0E]">E-mail</Label>
              <Input
                type="email"
                required
                placeholder="seu.email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-[#EDE4D8]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#2D1B0E]">Senha</Label>
              <Input
                type="password"
                required
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-[#EDE4D8]"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold py-5 gap-2 shadow-md"
            >
              {loading ? 'Criando conta...' : 'Criar Conta'}
              {!loading && <UserPlus className="w-4 h-4" />}
            </Button>
            <p className="text-center text-xs text-[#7A6A5A] pt-2">
              Já possui conta?{' '}
              <Link to="/login" className="text-[#F97316] font-semibold hover:underline">
                Faça login
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
