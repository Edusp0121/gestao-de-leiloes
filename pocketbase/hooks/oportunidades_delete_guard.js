// oportunidades_delete_guard.js
//
// Regra "opção B" (aprovada pelo Edu) para exclusão de oportunidades:
//  - Sem nenhum lançamento de despesa: dono + participantes podem excluir.
//  - Com ao menos um lançamento de despesa: apenas admin + dono.
//  - Observadores nunca excluem (a API rule já os bloqueia).
//
// A API rule de delete da coleção `oportunidades` (migration 0049) libera
// apenas dono e admin. Este hook complementa permitindo o PARTICIPANTE
// somente quando a oportunidade não tem nenhum lançamento de despesa —
// caso contrário o delete é bloqueado aqui.
onRecordDeleteRequest('oportunidades').bind((e) => {
  const auth = e.auth
  if (!auth || !auth.id) {
    return e.json(403, { message: 'Não autenticado.' })
  }

  const record = e.record
  const donoId = record.getString('usuario')

  // Admin (flag `admin` do usuário) ou dono: liberado pela própria API rule.
  const isAdmin = auth.getBool('admin')
  if (isAdmin || auth.id === donoId) {
    e.next()
    return
  }

  // Participante? (dono/admin já tratados acima; observador cai aqui e é barrado.)
  let isParticipante = false
  try {
    const parts = record.get('participantes') || []
    for (let i = 0; i < parts.length; i++) {
      const pid = typeof parts[i] === 'string' ? parts[i] : (parts[i] && parts[i].id) || ''
      if (pid && pid === auth.id) {
        isParticipante = true
        break
      }
    }
  } catch (_) {
    isParticipante = false
  }

  if (!isParticipante) {
    return e.json(403, {
      message: 'Você não tem permissão para excluir esta oportunidade.',
    })
  }

  // Participante só pode excluir quando NÃO existe lançamento de despesa.
  let temDespesa = false
  try {
    const lancamentos = $app.findRecordsByFilter(
      'lancamentos',
      'oportunidade = {:op} && tipo = "Despesa"',
      '',
      1,
      0,
      { op: record.id },
    )
    temDespesa = lancamentos && lancamentos.length > 0
  } catch (err) {
    console.log('oportunidades_delete_guard: falha ao consultar lancamentos:', err)
    temDespesa = false
  }

  if (temDespesa) {
    return e.json(403, {
      message:
        'Esta oportunidade possui lançamentos de despesa. Apenas o dono ou um administrador podem excluí-la.',
    })
  }

  e.next()
}, $apis.requireAuth())
