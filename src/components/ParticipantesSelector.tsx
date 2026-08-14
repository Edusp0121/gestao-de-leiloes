import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Check, X } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import type { UserRef } from '@/services/oportunidades'
import { primeiraLetraNome } from '@/lib/participantes-utils'

interface ParticipantesSelectorProps {
  /** Usuários disponíveis para seleção. */
  usuarios: UserRef[]
  /** IDs selecionados. */
  selected: string[]
  /** ID do criador atual (sempre incluso e imutável). */
  creatorId?: string
  onChange: (ids: string[]) => void
}

export function ParticipantesSelector({
  usuarios,
  selected,
  creatorId,
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

  const toggle = (id: string) => {
    if (id === creatorId) return // criador sempre incluso
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id))
    } else {
      onChange([...selected, id])
    }
  }

  const filtered = usuarios.filter((u) => {
    if (!u || !u.id) return false
    const text = `${u.name || ''} ${u.email || ''}`.toLowerCase()
    return text.includes(query.toLowerCase())
  })

  const selectedUsers = usuarios.filter((u) => u && selected.includes(u.id))

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 min-h-9 p-1.5 border border-[#EDE4D8] rounded-md bg-white">
        {selectedUsers.length === 0 && (
          <span className="text-sm text-[#7A6A5A] px-2 py-1">Nenhum sócio selecionado</span>
        )}
        {selectedUsers.map((u) => (
          <Badge
            key={u.id}
            variant="secondary"
            className="bg-[#FFF4E8] text-[#5C3A21] border border-[#EDE4D8] gap-1"
          >
            <span className="font-bold text-[#F97316]">
              {primeiraLetraNome(u.name || u.email || '?')}
            </span>
            {u.name || u.email}
            {u.id !== creatorId && (
              <button
                type="button"
                onClick={() => toggle(u.id)}
                className="ml-0.5 hover:text-red-500"
                aria-label={`Remover ${u.name || u.email}`}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </Badge>
        ))}
      </div>

      <div className="relative" ref={containerRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2 text-sm border border-[#EDE4D8] rounded-md bg-white hover:bg-[#FAF7F2] text-left"
        >
          <span className="text-[#7A6A5A]">Adicionar sócio/participante...</span>
          <span className="text-[#7A6A5A] text-xs">{open ? '▲' : '▼'}</span>
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-[#EDE4D8] rounded-md shadow-lg">
            <div className="p-2 border-b border-[#EDE4D8]">
              <input
                type="text"
                placeholder="Buscar por nome ou e-mail..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-[#EDE4D8] rounded focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                autoFocus
              />
            </div>
            <ScrollArea className="h-48">
              <div className="py-1">
                {filtered.length === 0 && (
                  <p className="px-3 py-2 text-sm text-[#7A6A5A]">Nenhum usuário encontrado.</p>
                )}
                {filtered.map((u) => {
                  const isSelected = selected.includes(u.id)
                  const isCreator = u.id === creatorId
                  return (
                    <button
                      type="button"
                      key={u.id}
                      onClick={() => toggle(u.id)}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-[#FAF7F2]',
                        isSelected && 'bg-[#FFF4E8]',
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span className="font-bold text-[#F97316] w-4 text-center">
                          {primeiraLetraNome(u.name || u.email || '?')}
                        </span>
                        <span className="text-[#2D1B0E]">{u.name || u.email}</span>
                        {u.email && u.name && (
                          <span className="text-xs text-[#7A6A5A]">({u.email})</span>
                        )}
                        {isCreator && (
                          <span className="text-[10px] uppercase font-bold text-[#8B5A2B]">
                            criador
                          </span>
                        )}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-[#F97316]" />}
                    </button>
                  )
                })}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
      <p className="text-xs text-[#7A6A5A]">
        O criador da oportunidade é sempre incluído automaticamente como participante.
      </p>
    </div>
  )
}
