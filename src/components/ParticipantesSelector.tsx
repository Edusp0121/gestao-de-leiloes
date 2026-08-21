import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Check, X, ArrowRight, ArrowLeft, Eye, Users, Search, Loader2 } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { findUserByEmail, type UserRef } from '@/services/oportunidades'

interface ParticipantesSelectorProps {
  /** Usuários disponíveis para seleção no modo browse. */
  usuarios?: UserRef[]
  /** IDs selecionados como participantes. */
  participantes: string[]
  /** IDs selecionados como observadores. */
  observadores: string[]
  /** ID do criador atual (sempre incluso como participante e imutável). */
  creatorId?: string
  /** Se o usuário atual tem permissão para gerenciar os participantes e observadores. */
  canManage?: boolean
  /** Mantido por retrocompatibilidade se passado */
  isAdmin?: boolean
  /** Modo de busca: 'browse' (lista completa) ou 'email-lookup' (busca por email) */
  searchMode?: 'browse' | 'email-lookup'
  onChange: (participantes: string[], observadores: string[]) => void
}

export function ParticipantesSelector({
  usuarios = [],
  participantes,
  observadores,
  creatorId,
  canManage = true,
  isAdmin = false,
  searchMode = 'browse',
  onChange,
}: ParticipantesSelectorProps) {
  const allowEdit = canManage || isAdmin
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  // Estado para modo email-lookup
  const [lookupEmail, setLookupEmail] = useState('')
  const [lookupLoading, setLookupLoading] = useState(false)
  const [searchedUser, setSearchedUser] = useState<UserRef | null>(null)
  const [searchMessage, setSearchMessage] = useState<string | null>(null)
  const [knownUsersMap, setKnownUsersMap] = useState<Record<string, UserRef>>({})

  // Mantém cache de usuários encontrados ou passados via props
  useEffect(() => {
    if (usuarios && usuarios.length > 0) {
      setKnownUsersMap((prev) => {
        const next = { ...prev }
        usuarios.forEach((u) => {
          if (u.id) next[u.id] = u
        })
        return next
      })
    }
  }, [usuarios])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLookupSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmed = lookupEmail.trim()
    if (!trimmed) {
      setSearchMessage('Digite um email para buscar')
      setSearchedUser(null)
      return
    }

    setLookupLoading(true)
    setSearchMessage(null)
    setSearchedUser(null)

    try {
      const user = await findUserByEmail(trimmed)
      if (user) {
        setSearchedUser(user)
        setSearchMessage(null)
        setKnownUsersMap((prev) => ({ ...prev, [user.id]: user }))
      } else {
        setSearchedUser(null)
        setSearchMessage('Nenhum usuário encontrado com este email')
      }
    } catch {
      setSearchedUser(null)
      setSearchMessage('Nenhum usuário encontrado com este email')
    } finally {
      setLookupLoading(false)
    }
  }

  // Sempre busca/valida pelo EMAIL (chave única). Filtra Administrador ("Doulhe3").
  const normalize = (s: string) => s.trim().toLowerCase()
  const filtered = usuarios.filter((u) => {
    if (!u || !u.id) return false
    if ((u as any).admin === true || u.name === 'Doulhe3') return false
    const email = normalize(u.email || '')
    const name = normalize(u.name || '')
    const q = normalize(query)
    if (!q) return true
    return email.includes(q) || name.includes(q)
  })

  const partSet = new Set(participantes)
  const obsSet = new Set(observadores)

  const addToParticipantes = (user: UserRef | string) => {
    if (!allowEdit) return
    const id = typeof user === 'string' ? user : user.id
    if (typeof user === 'object' && user.id) {
      setKnownUsersMap((prev) => ({ ...prev, [user.id]: user }))
    }
    if (partSet.has(id)) return
    const nextObs = observadores.filter((x) => x !== id)
    onChange(Array.from(new Set([...participantes, id])), nextObs)
  }

  const addToObservadores = (user: UserRef | string) => {
    if (!allowEdit) return
    const id = typeof user === 'string' ? user : user.id
    if (typeof user === 'object' && user.id) {
      setKnownUsersMap((prev) => ({ ...prev, [user.id]: user }))
    }
    if (obsSet.has(id)) return
    const nextPart = participantes.filter((x) => x !== id)
    onChange(nextPart, Array.from(new Set([...observadores, id])))
  }

  const removeFromParticipantes = (id: string) => {
    if (!allowEdit) return
    onChange(
      participantes.filter((x) => x !== id),
      observadores,
    )
  }

  const removeFromObservadores = (id: string) => {
    if (!allowEdit) return
    onChange(
      participantes,
      observadores.filter((x) => x !== id),
    )
  }

  const moveToObservadores = (id: string) => {
    if (!allowEdit) return
    onChange(
      participantes.filter((x) => x !== id),
      Array.from(new Set([...observadores, id])),
    )
  }

  const moveToParticipantes = (id: string) => {
    if (!allowEdit) return
    onChange(
      Array.from(new Set([...participantes, id])),
      observadores.filter((x) => x !== id),
    )
  }

  const userById = (id: string): UserRef =>
    knownUsersMap[id] || usuarios.find((u) => u.id === id) || { id, name: '', email: '' }

  const renderPill = (u: UserRef, group: 'participante' | 'observador') => {
    const isPart = group === 'participante'
    return (
      <Badge
        key={`${group}-${u.id}`}
        variant="secondary"
        className={cn(
          'gap-1 py-1 pl-2 pr-1',
          isPart
            ? 'bg-[#DCFCE7] text-[#166534] border border-[#86EFAC]'
            : 'bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1]',
        )}
      >
        <span
          className={cn(
            'inline-flex items-center justify-center rounded-full px-1.5 text-[10px] font-bold uppercase',
            isPart ? 'bg-[#16A34A] text-white' : 'bg-[#64748B] text-white',
          )}
        >
          {isPart ? 'Participante' : 'Observador'}
        </span>
        <span className="font-medium text-[#2D1B0E]">{u.name || u.email || 'Usuário'}</span>
        {u.email && <span className="text-xs text-[#7A6A5A]">{u.email}</span>}
        {allowEdit && (
          <span className="ml-0.5 flex items-center gap-0.5">
            {isPart ? (
              <button
                type="button"
                onClick={() => moveToObservadores(u.id)}
                className="hover:text-blue-500"
                title="Mover para Observador"
              >
                <ArrowRight className="w-3 h-3" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => moveToParticipantes(u.id)}
                className="hover:text-blue-500"
                title="Mover para Participante"
              >
                <ArrowLeft className="w-3 h-3" />
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                isPart ? removeFromParticipantes(u.id) : removeFromObservadores(u.id)
              }
              className="hover:text-red-500"
              title="Remover"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}
      </Badge>
    )
  }

  const partUsers = participantes.map(userById).filter(Boolean) as UserRef[]
  const obsUsers = observadores.map(userById).filter(Boolean) as UserRef[]

  return (
    <div className="space-y-3">
      {/* Grupo Participantes */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[#16A34A]" />
          <span className="text-sm font-semibold text-[#166534]">Participantes</span>
          <span className="text-xs text-[#7A6A5A]">
            (editam, lançam despesas e participam do rateio)
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5 min-h-9 p-1.5 border border-[#EDE4D8] rounded-md bg-white">
          {partUsers.length === 0 && (
            <span className="text-sm text-[#7A6A5A] px-2 py-1">Nenhum participante</span>
          )}
          {partUsers.map((u) => renderPill(u, 'participante'))}
        </div>
      </div>

      {/* Grupo Observadores */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-[#64748B]" />
          <span className="text-sm font-semibold text-[#475569]">Observadores</span>
          <span className="text-xs text-[#7A6A5A]">
            (apenas visualizam os números; não editam, não lançam e não participam do rateio)
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5 min-h-9 p-1.5 border border-[#EDE4D8] rounded-md bg-white">
          {obsUsers.length === 0 && (
            <span className="text-sm text-[#7A6A5A] px-2 py-1">Nenhum observador</span>
          )}
          {obsUsers.map((u) => renderPill(u, 'observador'))}
        </div>
      </div>

      {/* Adicionar pessoas */}
      {allowEdit ? (
        searchMode === 'email-lookup' ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Digite o email do usuário"
                value={lookupEmail}
                onChange={(e) => {
                  setLookupEmail(e.target.value)
                  if (searchMessage) setSearchMessage(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleLookupSearch()
                  }
                }}
                className="flex-1 text-sm border-[#EDE4D8] bg-white focus-visible:ring-[#F97316]"
              />
              <Button
                type="button"
                onClick={() => handleLookupSearch()}
                disabled={lookupLoading}
                className="bg-[#F97316] hover:bg-[#EA580C] text-white gap-1.5 shrink-0"
              >
                {lookupLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                Buscar
              </Button>
            </div>

            {searchMessage && <p className="text-xs text-[#7A6A5A] px-1">{searchMessage}</p>}

            {searchedUser && (
              <div className="w-full flex items-center justify-between p-3 border border-[#EDE4D8] rounded-md bg-white shadow-sm">
                <div className="min-w-0 flex-1 mr-2">
                  <p className="font-medium text-sm text-[#2D1B0E] truncate">
                    {searchedUser.name || 'Usuário'}
                  </p>
                  {searchedUser.email && (
                    <p className="text-xs text-[#7A6A5A] truncate">{searchedUser.email}</p>
                  )}
                  {partSet.has(searchedUser.id) && (
                    <span className="inline-block mt-1 text-[10px] uppercase font-bold text-[#16A34A] bg-[#DCFCE7] px-1.5 py-0.5 rounded border border-[#86EFAC]">
                      já é participante
                    </span>
                  )}
                  {obsSet.has(searchedUser.id) && (
                    <span className="inline-block mt-1 text-[10px] uppercase font-bold text-[#64748B] bg-[#F1F5F9] px-1.5 py-0.5 rounded border border-[#CBD5E1]">
                      já é observador
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => addToParticipantes(searchedUser)}
                    disabled={partSet.has(searchedUser.id)}
                    className={cn(
                      'text-xs px-2.5 py-1.5 rounded border font-medium transition-colors',
                      partSet.has(searchedUser.id)
                        ? 'opacity-40 cursor-not-allowed border-[#EDE4D8] text-[#7A6A5A]'
                        : 'border-[#86EFAC] text-[#166534] bg-white hover:bg-[#DCFCE7]',
                    )}
                    title="Adicionar como Participante"
                  >
                    Participante
                  </button>
                  <button
                    type="button"
                    onClick={() => addToObservadores(searchedUser)}
                    disabled={obsSet.has(searchedUser.id)}
                    className={cn(
                      'text-xs px-2.5 py-1.5 rounded border font-medium transition-colors',
                      obsSet.has(searchedUser.id)
                        ? 'opacity-40 cursor-not-allowed border-[#EDE4D8] text-[#7A6A5A]'
                        : 'border-[#CBD5E1] text-[#475569] bg-white hover:bg-[#F1F5F9]',
                    )}
                    title="Adicionar como Observador"
                  >
                    Observador
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="relative" ref={containerRef}>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm border border-[#EDE4D8] rounded-md bg-white hover:bg-[#FAF7F2] text-left"
            >
              <span className="text-[#7A6A5A]">Adicionar pessoa (por e-mail)...</span>
              <span className="text-[#7A6A5A] text-xs">{open ? '▲' : '▼'}</span>
            </button>

            {open && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-[#EDE4D8] rounded-md shadow-lg">
                <div className="p-2 border-b border-[#EDE4D8]">
                  <input
                    type="text"
                    placeholder="Buscar por e-mail (ou nome)..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-[#EDE4D8] rounded focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                    autoFocus
                  />
                </div>
                <ScrollArea className="h-48">
                  <div className="py-1">
                    {filtered.length === 0 && (
                      <p className="px-3 py-2 text-sm text-[#7A6A5A]">
                        Nenhum usuário encontrado para o e-mail informado.
                      </p>
                    )}
                    {filtered.map((u) => {
                      const isPart = partSet.has(u.id)
                      const isObs = obsSet.has(u.id)
                      return (
                        <div
                          key={u.id}
                          className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-[#FAF7F2] border-b border-[#F5EEE3] last:border-0"
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <span className="font-medium text-[#2D1B0E] truncate">
                              {u.name || u.email || 'Usuário'}
                            </span>
                            {u.email && (
                              <span className="text-xs text-[#7A6A5A] truncate">{u.email}</span>
                            )}
                            {isPart && (
                              <span className="text-[10px] uppercase font-bold text-[#16A34A]">
                                participante
                              </span>
                            )}
                            {isObs && (
                              <span className="text-[10px] uppercase font-bold text-[#64748B]">
                                observador
                              </span>
                            )}
                          </span>
                          <span className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => addToParticipantes(u)}
                              disabled={isPart}
                              className={cn(
                                'text-xs px-2 py-1 rounded border',
                                isPart
                                  ? 'opacity-40 cursor-not-allowed border-[#EDE4D8] text-[#7A6A5A]'
                                  : 'border-[#86EFAC] text-[#166534] hover:bg-[#DCFCE7]',
                              )}
                              title="Adicionar como Participante"
                            >
                              Participante
                            </button>
                            <button
                              type="button"
                              onClick={() => addToObservadores(u)}
                              disabled={isObs}
                              className={cn(
                                'text-xs px-2 py-1 rounded border',
                                isObs
                                  ? 'opacity-40 cursor-not-allowed border-[#EDE4D8] text-[#7A6A5A]'
                                  : 'border-[#CBD5E1] text-[#475569] hover:bg-[#F1F5F9]',
                              )}
                              title="Adicionar como Observador"
                            >
                              Observador
                            </button>
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )
      ) : (
        <p className="text-xs text-[#7A6A5A]">
          Sem permissão para alterar participantes e observadores.
        </p>
      )}
    </div>
  )
}
