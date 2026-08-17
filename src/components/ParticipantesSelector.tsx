import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Check, X, ArrowRight, ArrowLeft, Eye, Users } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import type { UserRef } from '@/services/oportunidades'

interface ParticipantesSelectorProps {
  /** Usuários disponíveis para seleção. */
  usuarios: UserRef[]
  /** IDs selecionados como participantes. */
  participantes: string[]
  /** IDs selecionados como observadores. */
  observadores: string[]
  /** ID do criador atual (sempre incluso como participante e imutável). */
  creatorId?: string
  /** Se o usuário atual é admin (controla permissão de edição dos grupos). */
  isAdmin?: boolean
  onChange: (participantes: string[], observadores: string[]) => void
}

export function ParticipantesSelector({
  usuarios,
  participantes,
  observadores,
  creatorId,
  isAdmin = false,
  onChange,
}: ParticipantesSelectorProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

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

  const addToParticipantes = (id: string) => {
    if (!isAdmin) return
    if (partSet.has(id)) return
    const nextObs = observadores.filter((x) => x !== id)
    onChange(Array.from(new Set([...participantes, id])), nextObs)
  }
  const addToObservadores = (id: string) => {
    if (!isAdmin) return
    if (obsSet.has(id)) return
    const nextPart = participantes.filter((x) => x !== id)
    onChange(nextPart, Array.from(new Set([...observadores, id])))
  }
  const removeFromParticipantes = (id: string) => {
    if (!isAdmin) return
    if (id === creatorId) return // criador sempre fica como participante
    onChange(
      participantes.filter((x) => x !== id),
      observadores,
    )
  }
  const removeFromObservadores = (id: string) => {
    if (!isAdmin) return
    onChange(
      participantes,
      observadores.filter((x) => x !== id),
    )
  }
  const moveToObservadores = (id: string) => {
    if (!isAdmin) return
    if (id === creatorId) return
    onChange(
      participantes.filter((x) => x !== id),
      Array.from(new Set([...observadores, id])),
    )
  }
  const moveToParticipantes = (id: string) => {
    if (!isAdmin) return
    onChange(
      Array.from(new Set([...participantes, id])),
      observadores.filter((x) => x !== id),
    )
  }

  const userById = (id: string): UserRef | undefined =>
    usuarios.find((u) => u.id === id) || { id, name: '', email: '' }

  const renderPill = (u: UserRef, group: 'participante' | 'observador') => {
    const isPart = group === 'participante'
    const isCreator = u.id === creatorId
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
        {isCreator && (
          <span className="text-[10px] uppercase font-bold text-[#8B5A2B]">criador</span>
        )}
        {isAdmin && (
          <span className="ml-0.5 flex items-center gap-0.5">
            {isPart ? (
              <button
                type="button"
                onClick={() => moveToObservadores(u.id)}
                className="hover:text-blue-500"
                title="Mover para Observador"
                disabled={isCreator}
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
            {!isCreator && (
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
            )}
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

      {/* Adicionar pessoas — somente admin */}
      {isAdmin ? (
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
                    const isCreator = u.id === creatorId
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
                          {isCreator && (
                            <span className="text-[10px] uppercase font-bold text-[#8B5A2B]">
                              criador
                            </span>
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
                            onClick={() => addToParticipantes(u.id)}
                            disabled={isPart || isCreator}
                            className={cn(
                              'text-xs px-2 py-1 rounded border',
                              isPart || isCreator
                                ? 'opacity-40 cursor-not-allowed border-[#EDE4D8] text-[#7A6A5A]'
                                : 'border-[#86EFAC] text-[#166534] hover:bg-[#DCFCE7]',
                            )}
                            title="Adicionar como Participante"
                          >
                            Participante
                          </button>
                          <button
                            type="button"
                            onClick={() => addToObservadores(u.id)}
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
      ) : (
        <p className="text-xs text-[#7A6A5A]">
          Apenas administradores podem adicionar, remover ou mover pessoas entre os grupos.
        </p>
      )}
      {isAdmin && (
        <p className="text-xs text-[#7A6A5A]">
          O criador da oportunidade é sempre incluído automaticamente como participante.
        </p>
      )}
    </div>
  )
}
