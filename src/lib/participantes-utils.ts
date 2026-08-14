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
 * seus sócios (participantes).
 *
 * Regras:
 * - Para cada sócio, uma opção com a PRIMEIRA letra do primeiro nome dele.
 * - Se houver exatamente 2 sócios: adiciona "A" = Ambos.
 * - Se houver mais de 2 sócios: adiciona "T" = Todos.
 * - Valor padrão: "A" (2 sócios) ou "T" (>2 sócios).
 */
export function buildQuemPagouOptions(
  participantes: UserRef[] | undefined | null,
): QuemPagouOption[] {
  const socios = (participantes || []).filter((p) => p && p.id)
  const options: QuemPagouOption[] = socios.map((p) => {
    const letra = primeiraLetraNome(p.name || p.email || '?')
    return { value: letra, label: `${letra} — ${p.name || p.email || 'Sócio'}` }
  })

  if (socios.length === 2) {
    options.push({ value: 'A', label: 'A — Ambos' })
  } else if (socios.length > 2) {
    options.push({ value: 'T', label: 'T — Todos' })
  }

  return options
}

/** Valor padrão do campo ao abrir o formulário. */
export function defaultQuemPagou(participantes: UserRef[] | undefined | null): string {
  const count = (participantes || []).filter(Boolean).length
  if (count > 2) return 'T'
  if (count === 2) return 'A'
  // 0 ou 1 sócio: sem opção de grupo — retorna a letra do único sócio (ou vazio).
  if (count === 1) {
    return primeiraLetraNome(participantes![0].name || participantes![0].email || '?')
  }
  return ''
}

/** Primeira letra (maiúscula) do primeiro nome. */
export function primeiraLetraNome(nome: string): string {
  const trimmed = (nome || '').trim()
  if (!trimmed) return '?'
  return trimmed.charAt(0).toUpperCase()
}

/**
 * Dado o valor de "quem_pagou" e a lista de sócios, retorna quantos sócios
 * aquela marcação representa (para rateio). Letras individuais = 1; "A" = 2;
 * "T" = total de sócios.
 */
export function sociosCobertosPorMarca(
  marca: string | undefined | null,
  totalSocios: number,
): number {
  if (!marca) return 0
  if (marca === 'A') return 2
  if (marca === 'T') return totalSocios
  return 1
}
