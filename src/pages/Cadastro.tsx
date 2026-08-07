import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserPlus, Mail, Lock, User, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import { extractFieldErrors, getErrorMessage } from '@/lib/pocketbase/errors'
import logoImg from '@/assets/logochamada-s-fundo-e6c10.png'

export default function Cadastro() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const { signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setEmailError('')
    setPasswordError('')

    if (password.length < 8) {
      setPasswordError('A senha deve possuir pelo menos 8 caracteres.')
      return
    }

    setLoading(true)
    const { error } = await signUp(email.trim(), password, name.trim())
    setLoading(false)

    if (error) {
      const fieldErrs = extractFieldErrors(error)
      const rawMsg = getErrorMessage(error)

      if (
        fieldErrs.email?.toLowerCase().includes('unique') ||
        rawMsg.toLowerCase().includes('unique') ||
        rawMsg.toLowerCase().includes('já existe')
      ) {
        setEmailError('Este e-mail já está cadastrado no sistema. Faça login ou use outro e-mail.')
      } else if (fieldErrs.email) {
        setEmailError(fieldErrs.email)
      }

      if (fieldErrs.password) {
        setPasswordError(fieldErrs.password)
      }

      if (!fieldErrs.email && !fieldErrs.password) {
        setErrorMsg(rawMsg)
      }
    } else {
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#3D2314] via-[#5C3A21] to-[#EA580C]">
      <Card className="w-full max-w-md shadow-2xl border-none bg-white/95 backdrop-blur-md overflow-hidden rounded-2xl">
        <div className="bg-[#2D1B0E] p-6 text-center border-b border-[#5C3A21]">
          <img
            src={logoImg}
            alt="Dou-lhe Três - Assessoria em Leilões Imobiliários"
            className="h-28 w-auto mx-auto object-contain drop-shadow-md"
          />
        </div>
        <CardHeader className="text-center pb-2 pt-4">
          <CardTitle className="text-xl font-bold text-[#5C3A21]">
            Criar Conta de Investidor
          </CardTitle>
          <CardDescription className="text-[#7A6A5A] text-xs">
            Cadastre-se para começar a analisar e gerenciar suas arrematações
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-start gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-[#2D1B0E] text-xs font-semibold">Nome Completo</Label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7A6A5A]" />
                <Input
                  required
                  placeholder="Seu nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-9 border-[#EDE4D8] focus-visible:ring-[#F97316]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[#2D1B0E] text-xs font-semibold">E-mail</Label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7A6A5A]" />
                <Input
                  type="email"
                  required
                  placeholder="seu.email@exemplo.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (emailError) setEmailError('')
                  }}
                  className={`pl-9 border-[#EDE4D8] focus-visible:ring-[#F97316] ${
                    emailError ? 'border-red-500 bg-red-50/30' : ''
                  }`}
                />
              </div>
              {emailError && (
                <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {emailError}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[#2D1B0E] text-xs font-semibold">Senha</Label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7A6A5A]" />
                <Input
                  type="password"
                  required
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (passwordError) setPasswordError('')
                  }}
                  className={`pl-9 border-[#EDE4D8] focus-visible:ring-[#F97316] ${
                    passwordError ? 'border-red-500 bg-red-50/30' : ''
                  }`}
                />
              </div>
              {passwordError ? (
                <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {passwordError}
                </p>
              ) : (
                <p className="text-[11px] text-[#7A6A5A]">
                  A senha deve conter no mínimo 8 caracteres.
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold py-5 gap-2 shadow-md transition-all"
            >
              {loading ? 'Criando conta...' : 'Concluir Cadastro'}
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
