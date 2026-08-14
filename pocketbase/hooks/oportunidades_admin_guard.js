// oportunidades_admin_guard.js
//
// Garante que apenas administradores possam alterar os campos `participantes`
// e `observadores` de uma oportunidade. Participantes/observadores comuns
// (não-admin) podem editar os demais campos (se forem o criador), mas NÃO
// podem mexer na composição dos grupos de sócios/observadores.
//
// Dispara antes da validação de create/update de oportunidade (via API REST).
onRecordUpdateRequest((e) => {
  const auth = e.requestInfo().auth
  if (!auth) {
    throw new BadRequestError('Autenticação necessária.')
  }
  const isAdmin = auth.get('admin') === true
  const body = e.requestInfo().body || {}

  const hasParticipantes = Object.prototype.hasOwnProperty.call(body, 'participantes')
  const hasObservadores = Object.prototype.hasOwnProperty.call(body, 'observadores')

  if ((hasParticipantes || hasObservadores) && !isAdmin) {
    throw new BadRequestError('Apenas administradores podem alterar participantes e observadores.')
  }

  e.next()
}, 'oportunidades')

onRecordCreateRequest((e) => {
  const auth = e.requestInfo().auth
  if (!auth) {
    throw new BadRequestError('Autenticação necessária.')
  }
  const isAdmin = auth.get('admin') === true
  const body = e.requestInfo().body || {}
  const authId = auth.id

  if (!isAdmin) {
    // Não-admin não pode definir observadores.
    if (Object.prototype.hasOwnProperty.call(body, 'observadores')) {
      throw new BadRequestError('Apenas administradores podem definir observadores.')
    }
    // Não-admin só pode incluir a si mesmo como participante.
    const partsRaw = body.participantes
    let parts = []
    if (Array.isArray(partsRaw)) {
      parts = partsRaw.slice()
    } else if (partsRaw != null && partsRaw !== '') {
      parts = [partsRaw]
    }
    for (let i = 0; i < parts.length; i++) {
      if (parts[i] !== authId) {
        throw new BadRequestError('Apenas administradores podem adicionar outros participantes.')
      }
    }
  }

  e.next()
}, 'oportunidades')
