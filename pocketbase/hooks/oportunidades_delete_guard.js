// oportunidades_delete_guard.js
//
// Regras de exclusão de oportunidades:
// 1. Soft delete (exclusão suave): realizada via UPDATE preenchendo deleted_at.
//    Permissões para soft delete:
//    - Sem despesa lançada: Dono + participantes + admin
//    - Com despesa lançada: Dono + admin
//    - Observadores: NUNCA editam ou excluem.
// 2. Hard delete (exclusão definitiva): executada via DELETE HTTP.
//    - Exclusiva de administrador (auth.admin = true).
//    - Qualquer tentativa de DELETE direto por não-admin é terminantemente bloqueada aqui e pela deleteRule.

onRecordUpdateRequest((e) => {
  const auth = e.auth
  if (!auth || !auth.id) {
    return e.json(403, { message: 'Não autenticado.' })
  }

  const record = e.record
  const original = record.original()
  const isDeletedAtChanged = record.get('deleted_at') !== original.get('deleted_at')

  // Se o campo deleted_at foi alterado nesta requisição de update
  if (isDeletedAtChanged) {
    const isAdmin = auth.getBool('admin')
    const donoId = record.getString('usuario')
    const newDeletedAt = record.getString('deleted_at')
    const oldDeletedAt = original.getString('deleted_at')

    // Cenário A: RESTAURAÇÃO (limpando deleted_at: antigo preenchido, novo vazio)
    if (oldDeletedAt && !newDeletedAt) {
      if (!isAdmin) {
        return e.json(403, {
          message: 'Apenas administradores podem restaurar oportunidades excluídas.',
        })
      }
      return e.next()
    }

    // Cenário B: SOFT DELETE (preenchendo deleted_at: antigo vazio, novo preenchido)
    if (!oldDeletedAt && newDeletedAt) {
      // Se for admin ou dono da oportunidade: permitido
      if (isAdmin || auth.id === donoId) {
        return e.next()
      }

      // Se for participante: verificar se pertence aos participantes
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

      // Participante só pode excluir quando NÃO existe lançamento de despesa
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

      return e.next()
    }
  }

  return e.next()
}, 'oportunidades')

// Bloqueio de Hard Delete (DELETE HTTP): Ação "Excluir definitivamente" EXCLUSIVA DE ADMIN
onRecordDeleteRequest((e) => {
  const auth = e.auth
  if (!auth || !auth.id) {
    return e.json(403, { message: 'Não autenticado.' })
  }

  const isAdmin = auth.getBool('admin')
  if (!isAdmin) {
    return e.json(403, {
      message: 'Apenas administradores podem excluir oportunidades definitivamente.',
    })
  }

  return e.next()
}, 'oportunidades')
