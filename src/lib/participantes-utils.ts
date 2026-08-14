import type { UserRef } from '@/services/oportunidades'

/**
 * Opção do seletor "Quem Pagou" em lançamentos.
 * `value` é o que vai para o banco (1 caractere); `label` é o que o usuário vê.
 */
export interface QuemPagouOption {
  value: string
  label: string
}

/**
 * Gera as opções do campo "Quem Pagou" para uma oportunidade com base nos
 * seus sócios (PARTICIPANTES apenas — observadores nunca entram).
 *
 * Regras:
 * - Para cada participante, uma opção com a PRIMEIRA letra do primeiro nome.
 * - Se houver exatamente 2 participantes: adiciona "A" = Ambos.
 * - Se houver mais de 2 participantes: adiciona "T" = Todos.
 * - Para 1 participante: apenas a letra dele (sem "A"/"T").
 */
export function buildQuemPagouOptions(
  participantes: UserRef[] | undefined | null,
): QuemPagouOption[] {
  const socios = (participantes || []).filter((p) => p && p.id)

  const uniqueMap = new Map<string, UserRef>()
  socios.forEach((p) => uniqueMap.set(p.id, p))
  const uniqueSocios = Array.from(uniqueMap.values())

  const options: QuemPagouOption[] = []
  const seenValues = new Set<string>()

  uniqueSocios.forEach((p) => {
    const nome = (p.name || '').trim() || (p.email || '').split('@')[0] || 'Sócio'
    const letra = primeiraLetraNome(nome)
    if (letra && letra !== '?' && !seenValues.has(letra)) {
      seenValues.add(letra)
      options.push({ value: letra, label: `${letra} — ${nome}` })
    }
  })

  if (uniqueSocios.length === 2) {
    if (!seenValues.has('A')) {
      options.push({ value: 'A', label: 'A — Ambos' })
    }
  } else if (uniqueSocios.length > 2) {
    if (!seenValues.has('T')) {
      options.push({ value: 'T', label: 'T — Todos' })
    }
  }

  return options
}

/**
 * Valor padrão do campo ao abrir o formulário.
 *
 * - 0 participantes: '' (vazio).
 * - 1 participante: a letra daquele único participante (NUNCA "A").
 * - 2 participantes: "A" (Ambos).
 * - 3+ participantes: "T" (Todos).
 */
export function defaultQuemPagou(participantes: UserRef[] | undefined | null): string {
  const socios = (participantes || []).filter((p) => p && p.id)

  const uniqueMap = new Map<string, UserRef>()
  socios.forEach((p) => uniqueMap.set(p.id, p))
  const uniqueSocios = Array.from(uniqueMap.values())

  const count = uniqueSocios.length
  if (count > 2) return 'T'
  if (count === 2) return 'A'
  if (count === 1) {
    const p = uniqueSocios[0]
    const nome = (p.name || '').trim() || (p.email || '').split('@')[0] || ''
    const letra = primeiraLetraNome(nome)
    return letra !== '?' ? letra : ''
  }
  return ''
}

/** Primeira letra (maiúscula) do primeiro nome. */
export function primeiraLetraNome(nome: string): string {
  const trimmed = (nome || '').trim()
  if (!trimmed || trimmed === '?') return '?'
  return trimmed.charAt(0).toUpperCase()
}

/**
 * Dado o valor de "quem_pagou" e o número de participantes, retorna quantos
 * participantes aquela marcação representa (para rateio). Letras individuais
 * = 1; "A" = 2 (ambos); "T" = total de participantes.
 *
 * Observadores nunca contam.
 */
export function sociosCobertosPorMarca(
  marca: string | undefined | null,
  totalSocios: number,
): number {
  if (!marca || marca === '?') return 0
  if (marca === 'A') return 2
  if (marca === 'T') return totalSocios
  return 1
}
