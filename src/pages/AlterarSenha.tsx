import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  KeyRound,
  Lock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export default function AlterarSenha() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')

  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    if (!user?.id) {
      setErrorMsg('Sessão inválida. Por favor, faça login novamente.')
      return
    }

    if (!oldPassword) {
      setErrorMsg('Informe sua senha atual.')
      return
    }

    if (newPassword.length < 8) {
      setErrorMsg('A nova senha deve ter no mínimo 8 caracteres.')
      return
    }

    if (newPassword !== passwordConfirm) {
      setErrorMsg('A confirmação da nova senha não confere.')
      return
    }

    if (newPassword === oldPassword) {
      setErrorMsg('A nova senha deve ser diferente da senha atual.')
      return
    }

    setLoading(true)
    try {
      // PocketBase valida a senha atual (oldPassword) e atualiza a senha sem invalidar o token
      await pb.collection('users').update(user.id, {
        oldPassword,
        password: newPassword,
        passwordConfirm,
      })

      // Atualiza token/authStore para manter a sessão válida e renovada
      try {
        await pb.collection('users').authRefresh()
      } catch (refreshErr) {
        // Se o refresh automático falhar, mantém a sessão do authStore atual
        console.warn('Auth refresh pós-troca de senha:', refreshErr)
      }

      setSuccessMsg('Sua senha foi alterada com sucesso! Sua sessão continua ativa.')
      setOldPassword('')
      setNewPassword('')
      setPasswordConfirm('')

      toast({
        title: 'Senha alterada com sucesso',
        description: 'Sua nova senha já está valendo para os próximos acessos.',
      })
    } catch (err: unknown) {
      console.error('Erro ao alterar senha:', err)
      const message = getErrorMessage(err)
      // Ajusta mensagens comuns do PocketBase para português claro
      if (
        message.toLowerCase().includes('old password') ||
        message.toLowerCase().includes('invalid old password') ||
        message.toLowerCase().includes('failed to update')
      ) {
        setErrorMsg('A senha atual informada está incorreta.')
      } else {
        setErrorMsg(
          message || 'Não foi possível alterar sua senha. Verifique os dados e tente novamente.',
        )
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link
            to="/"
            className="text-xs text-[#7A6A5A] hover:text-[#F97316] inline-flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar para o Dashboard
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-[#5C3A21] flex items-center gap-2">
          <KeyRound className="w-6 h-6 text-[#F97316]" />
          Alterar Minha Senha
        </h1>
        <p className="text-sm text-[#7A6A5A]">
          Atualize sua credencial de acesso sem depender de links por e-mail ou do administrador
        </p>
      </div>

      <Card className="border-[#EDE4D8] bg-white shadow-subtle">
        <CardHeader className="border-b border-[#EDE4D8] bg-[#FAF7F2]/60 pb-4">
          <CardTitle className="text-base font-bold text-[#5C3A21] flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#F97316]" />
            Segurança da Conta
          </CardTitle>
          <CardDescription className="text-xs text-[#7A6A5A]">
            Usuário conectado:{' '}
            <span className="font-semibold text-[#2D1B0E]">{user?.name || user?.email}</span> (
            {user?.email})
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {successMsg && (
            <div className="mb-5 p-4 text-sm bg-green-50 text-green-800 border border-green-200 rounded-lg flex items-start gap-3 animate-fade-in">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-green-600" />
              <div>
                <p className="font-semibold text-green-900">Operação concluída</p>
                <p className="text-xs text-green-800 mt-0.5">{successMsg}</p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="mb-5 p-4 text-sm bg-red-50 text-red-800 border border-red-200 rounded-lg flex items-start gap-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
              <div>
                <p className="font-semibold text-red-900">Não foi possível alterar a senha</p>
                <p className="text-xs text-red-800 mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Senha Atual */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#2D1B0E]">Senha Atual *</Label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7A6A5A]" />
                <Input
                  type={showOldPassword ? 'text' : 'password'}
                  required
                  placeholder="Digite sua senha atual"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="pl-9 pr-10 border-[#EDE4D8] focus-visible:ring-[#F97316]"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A6A5A] hover:text-[#2D1B0E]"
                  aria-label={showOldPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-[#7A6A5A]">
                Para sua segurança, informe sua credencial atual cadastrada.
              </p>
            </div>

            <div className="border-t border-[#EDE4D8] pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nova Senha */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#2D1B0E]">Nova Senha *</Label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7A6A5A]" />
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    placeholder="Mínimo 8 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-9 pr-10 border-[#EDE4D8] focus-visible:ring-[#F97316]"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A6A5A] hover:text-[#2D1B0E]"
                    aria-label={showNewPassword ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirmar Nova Senha */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#2D1B0E]">
                  Confirmar Nova Senha *
                </Label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7A6A5A]" />
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    placeholder="Repita a nova senha"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    className="pl-9 pr-10 border-[#EDE4D8] focus-visible:ring-[#F97316]"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A6A5A] hover:text-[#2D1B0E]"
                    aria-label={showConfirmPassword ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-[#FAF7F2] p-3 rounded-lg border border-[#EDE4D8] text-xs text-[#7A6A5A] space-y-1">
              <p className="font-semibold text-[#5C3A21]">Dicas para uma senha forte:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Pelo menos 8 caracteres (requisito obrigatório)</li>
                <li>Misture letras maiúsculas, minúsculas, números e símbolos especiais</li>
                <li>Não reutilize a senha usada em outras plataformas públicas</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold py-5 gap-2 shadow-md transition-all flex-1"
              >
                {loading ? 'Salvando nova senha...' : 'Atualizar Minha Senha'}
                <KeyRound className="w-4 h-4" />
              </Button>
              <Link to="/" className="inline-block">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto border-[#EDE4D8] text-[#5C3A21] hover:bg-[#FAF7F2] py-5"
                >
                  Cancelar
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
