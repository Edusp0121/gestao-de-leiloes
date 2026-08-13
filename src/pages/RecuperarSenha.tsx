import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, Send, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import pb from '@/lib/pocketbase/client'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import logoImg from '@/assets/logochamada-s-fundo-e6c10.png'

export default function RecuperarSenha() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setLoading(true)
    try {
      await pb.collection('users').requestPasswordReset(email.trim())
      setSuccess(true)
    } catch (err) {
      // Por segurança, mostramos a mesma mensagem mesmo em caso de erro
      // para não revelar se o email está cadastrado ou não.
      setSuccess(true)
      // Loga o erro real apenas no console para diagnóstico
      console.error('Erro ao solicitar redefinição de senha:', getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#3D2314] via-[#5C3A21] to-[#EA580C]">
      <Card className="w-full max-w-md shadow-2xl border-none bg-white/95 backdrop-blur-md overflow-hidden rounded-2xl">
        <div className="bg-[#FFF4E8] p-6 text-center border-b border-[#EDE4D8]">
          <div className="bg-white rounded-xl px-6 py-4 inline-block shadow-lg">
            <img
              src={logoImg}
              alt="Dou-lhe Três - Assessoria em Leilões Imobiliários"
              className="h-24 w-auto mx-auto object-contain max-w-[220px]"
            />
          </div>
        </div>
        <CardHeader className="text-center pb-2 pt-4">
          <CardTitle className="text-xl font-bold text-[#5C3A21]">Recuperar Senha</CardTitle>
          <CardDescription className="text-[#7A6A5A] text-xs">
            Informe seu e-mail e enviaremos um link para redefinir sua senha
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-6">
              <div className="p-4 text-sm bg-green-50 text-green-800 border border-green-200 rounded-lg flex items-start gap-3 animate-fade-in">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-green-600" />
                <span>
                  Se o email estiver cadastrado, você receberá um link de redefinição de senha.
                </span>
              </div>
              <p className="text-center text-xs text-[#7A6A5A]">
                Verifique sua caixa de entrada e a pasta de spam.
              </p>
              <Button
                asChild
                className="w-full bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold py-5 gap-2 shadow-md transition-all"
              >
                <Link to="/login">
                  <ArrowLeft className="w-4 h-4" />
                  Voltar para o login
                </Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-start gap-2 animate-fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span>{errorMsg}</span>
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
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold py-5 gap-2 shadow-md transition-all"
              >
                {loading ? 'Enviando...' : 'Enviar link de recuperação'}
                {!loading && <Send className="w-4 h-4" />}
              </Button>
              <p className="text-center text-xs text-[#7A6A5A] pt-2">
                <Link
                  to="/login"
                  className="text-[#F97316] font-semibold hover:underline inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Voltar para o login
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
