import pb from '@/lib/pocketbase/client'

export interface UserRef {
  id: string
  name?: string
  email?: string
}

export interface Oportunidade {
  id: string
  nome: string
  endereco: string
  usuario: string
  participantes?: string[] | null
  observadores?: string[] | null
  tipo_leilao?: 'Judicial' | 'Extrajudicial'
  banco_selecionado?: string
  data_aquisicao?: string
  status?: 'Em análise' | 'Arrematada' | 'Em andamento' | 'Vendida'
  valor_arrematacao?: number
  valor_mercado?: number
  desagio_venda?: number
  tempo_estimado_venda_meses?: number
  indice_correcao_medio_mensal?: number
  itbi_percent?: number
  comissao_leiloeiro_percent?: number
  comissao_corretoro_percent?: number
  comissao_corretor_percent?: number
  escritura?: number
  registro?: number
  averbacao?: number
  reforma_prevista?: number
  assessoria_juridica?: number
  condominio_iptu_mensal?: number
  modalidade_financiamento?: 'À Vista' | 'SAC' | 'PRICE'
  banco_responsavel_financiamento?: string
  taxa_juros_financiamento?: number
  aliquota_reajuste?: number
  valor_parcela_mensal?: number
  saldo_devedor?: number
  parcelas_pagas?: number
  capital_necessario?: number
  ganho_capital_base?: number
  ir_percent?: number
  ir_valor?: number
  incluir_ir_despesas?: boolean
  prazo_financiamento?: number
  percentual_entrada?: number
  taxa_avaliacao?: number
  taxas_judiciais?: number
  acordo_desocupacao?: number
  baixa_gravames?: number
  foro?: number
  valor_venda_com_desconto?: number
  maior_lucro_esperado?: number
  retorno_estimado?: number
  roi_esperado_periodo?: number
  roi_esperado_anualizado?: number
  lance_teto?: number
  relatorio_viabilidade?: string
  custos_estimados_planilha?: string | Record<string, number> | null
  created: string
  updated: string
  expand?: {
    usuario?: UserRef
    participantes?: UserRef[]
    observadores?: UserRef[]
  }
}

/**
 * Normaliza um valor que deveria ser um array de IDs de relação.
 * PocketBase pode entregar `participantes`/`observadores` como:
 *  - array de strings (comum),
 *  - string única (quando maxSelect=1 ou serialização antiga),
 *  - null/undefined.
 * Sempre devolvemos um array de strings (filtros Boolean removem vazios).
 */
export function toIdArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x) => typeof x === 'string' && x.length > 0)
  if (typeof v === 'string' && v.length > 0) return [v]
  return []
}

/**
 * Retorna true se o usuário autenticado é admin.
 */
export function isCurrentUserAdmin(): boolean {
  const rec = pb.authStore.record
  return Boolean(rec && (rec as any)?.admin === true)
}

/**
 * Retorna o id do usuário autenticado (ou undefined).
 */
export function currentUserId(): string | undefined {
  return pb.authStore.record?.id
}

/**
 * Classifica o papel do usuário atual em relação à oportunidade:
 *  - 'admin'   → é administrador global
 *  - 'creator' → é o criador (usuario) da oportunidade
 *  - 'participant' → está na lista de participantes
 *  - 'observer'    → está na lista de observadores
 *  - 'none'    → sem relação
 *
 * Admin prevalece sobre os demais.
 */
export type UserRole = 'admin' | 'creator' | 'participant' | 'observer' | 'none'
export function userRoleOnOp(op: Oportunidade): UserRole {
  const uid = currentUserId()
  if (!uid) return 'none'
  if (isCurrentUserAdmin()) return 'admin'
  if (op.usuario === uid) return 'creator'
  if (toIdArray(op.participantes).includes(uid)) return 'participant'
  if (toIdArray(op.observadores).includes(uid)) return 'observer'
  return 'none'
}

/**
 * Pode editar a oportunidade (UI): admin ou criador.
 * Participantes comuns não editam (regra de negócio: apenas admin manipula).
 * Observadores nunca.
 */
export function canEditOp(op: Oportunidade): boolean {
  const role = userRoleOnOp(op)
  return role === 'admin' || role === 'creator'
}

/**
 * Pode criar/editar/excluir lançamentos: admin, criador ou participante.
 * Observadores não.
 */
export function canManageLancamentos(op: Oportunidade): boolean {
  const role = userRoleOnOp(op)
  return role === 'admin' || role === 'creator' || role === 'participant'
}

export const getOportunidades = () =>
  pb.collection('oportunidades').getFullList<Oportunidade>({
    sort: '-created',
    expand: 'participantes,observadores',
  })

export const getOportunidade = (id: string) =>
  pb.collection('oportunidades').getOne<Oportunidade>(id, {
    expand: 'participantes,observadores',
  })

/**
 * Garante que o criador atual figure sempre entre os participantes.
 * Usado apenas quando o criador não-admin cria a própria oportunidade.
 */
function withCreator(participantes: string[] | null | undefined): string[] {
  const uid = pb.authStore.record?.id
  const base = Array.isArray(participantes) ? participantes.filter(Boolean) : []
  if (uid && !base.includes(uid)) base.push(uid)
  return base
}

export const createOportunidade = (data: Partial<Oportunidade> | FormData) => {
  const userId = pb.authStore.record?.id
  const isAdmin = isCurrentUserAdmin()
  if (data instanceof FormData) {
    if (userId && !data.has('usuario')) data.append('usuario', userId)
    // Garante que o criador seja sempre participante.
    if (userId && !data.has('participantes')) data.append('participantes', userId)
    return pb.collection('oportunidades').create<Oportunidade>(data)
  }
  const payload: Partial<Oportunidade> = { ...data, usuario: userId }
  // Não-admin só pode ter a si mesmo como participante; admin pode definir livremente.
  if (!isAdmin) {
    payload.participantes = withCreator(payload.participantes)
    delete payload.observadores
  }
  return pb.collection('oportunidades').create<Oportunidade>(payload)
}

export const updateOportunidade = (id: string, data: Partial<Oportunidade> | FormData) => {
  const isAdmin = isCurrentUserAdmin()
  if (data instanceof FormData) {
    return pb.collection('oportunidades').update<Oportunidade>(id, data)
  }
  const payload: Partial<Oportunidade> = { ...data }
  // Não-admin não pode alterar grupos; removemos do payload por segurança
  // (o hook do backend também bloqueia).
  if (!isAdmin) {
    delete payload.participantes
    delete payload.observadores
  } else if (payload.participantes) {
    payload.participantes = withCreator(payload.participantes)
  }
  return pb.collection('oportunidades').update<Oportunidade>(id, payload)
}

export const deleteOportunidade = (id: string) => pb.collection('oportunidades').delete(id)

export const getRelatorioUrl = (record: Oportunidade) => {
  if (!record.relatorio_viabilidade) return null
  return pb.files.getUrl(record, record.relatorio_viabilidade)
}

/**
 * Lista os usuários do sistema para seleção de sócios/participantes.
 * Exige que a regra de listagem de `users` permita que usuários autenticados
 * vejam uns aos outros.
 */
export const getUsuarios = async (): Promise<UserRef[]> => {
  try {
    const list = await pb.collection('users').getFullList<UserRef>({
      fields: 'id,name,email',
      sort: 'name',
    })
    return list
  } catch {
    const me = pb.authStore.record
    return me
      ? [{ id: me.id, name: ((me as any)?.name as string) || '', email: (me as any)?.email }]
      : []
  }
}
