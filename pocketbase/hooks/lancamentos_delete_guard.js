// lancamentos_delete_guard.js
// Permite exclusão de lançamentos apenas para o dono do lançamento,
// o dono da oportunidade ou administradores.
onRecordDeleteRequest((e) => {
  const auth = e.auth
  if (!auth || !auth.id) {
    return e.json(403, { message: 'Não autenticado.' })
  }

  const record = e.record
  const lancamentoUsuario = record.getString('usuario')
  const isAdmin = auth.getBool('admin')

  // Se o usuário é admin ou é o próprio criador do lançamento, permite
  if (isAdmin || auth.id === lancamentoUsuario) {
    return e.next()
  }

  // Verifica se o usuário é o dono da oportunidade vinculada
  try {
    const oportunidadeId = record.getString('oportunidade')
    if (oportunidadeId) {
      const opRecord = $app.findRecordById('oportunidades', oportunidadeId)
      if (opRecord && opRecord.getString('usuario') === auth.id) {
        return e.next()
      }
    }
  } catch (err) {
    console.log('lancamentos_delete_guard: falha ao buscar oportunidade:', err)
  }

  return e.json(403, {
    message: 'Você não tem permissão para excluir este lançamento.',
  })
}, 'lancamentos')
