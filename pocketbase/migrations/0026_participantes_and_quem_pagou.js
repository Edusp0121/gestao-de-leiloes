// 0026 — Sócios/Participantes em oportunidades + campo "quem_pagou" em lançamentos.
//
// 1. Adiciona o campo multi-relação `participantes` (→ users) na coleção
//    `oportunidades`, representando a relação muitos-para-muitos entre
//    usuários e oportunidades (sócios da arrematação).
// 2. Ajusta as regras de acesso de `oportunidades` para que um usuário
//    logado veja também as oportunidades onde é participante (não apenas
//    as que ele criou).
// 3. Semeia `participantes` das oportunidades existentes com o próprio
//    criador (garantia de que todo criador é, no mínimo, participante).
// 4. Adiciona o campo de texto `quem_pagou` (1 caractere) em `lancamentos`
//    para indicar qual sócio arcou com a despesa (rateio).
// 5. Ajusta as regras de acesso de `lancamentos` para que participantes
//    de uma oportunidade também consigam visualizar/criar lançamentos.
migrate(
  (app) => {
    // ---- oportunidades: campo participantes + regras ----
    const opCol = app.findCollectionByNameOrId('oportunidades')

    if (!opCol.fields.getByName('participantes')) {
      opCol.fields.add(
        new RelationField({
          name: 'participantes',
          collectionId: '_pb_users_auth_',
          maxSelect: 0, // múltipla seleção (sem limite)
          cascadeDelete: false,
        }),
      )
    }

    // Um usuário logado vê a oportunidade se for o criador (usuario) OU se
    // for um dos participantes. Edição/exclusão continuam restritos ao criador.
    opCol.listRule =
      "@request.auth.id != '' && (usuario = @request.auth.id || participantes = @request.auth.id)"
    opCol.viewRule =
      "@request.auth.id != '' && (usuario = @request.auth.id || participantes = @request.auth.id)"
    opCol.updateRule = "@request.auth.id != '' && usuario = @request.auth.id"
    opCol.deleteRule = "@request.auth.id != '' && usuario = @request.auth.id"
    app.save(opCol)

    // Semeia participantes das oportunidades existentes com o criador.
    let existingOps = []
    try {
      existingOps = app.findRecordsByFilter('oportunidades', '', '-created', 0, 0)
    } catch (_) {
      existingOps = []
    }
    for (const op of existingOps) {
      const current = op.get('participantes')
      const usuarioId = op.getString('usuario')
      if (usuarioId && (!current || current.length === 0)) {
        op.set('participantes', [usuarioId])
        app.save(op)
      }
    }

    // ---- lancamentos: campo quem_pagou + regras ----
    const lanCol = app.findCollectionByNameOrId('lancamentos')

    if (!lanCol.fields.getByName('quem_pagou')) {
      lanCol.fields.add(new TextField({ name: 'quem_pagou', max: 1 }))
    }

    // Um usuário logado vê/cria lançamentos de oportunidades que ele criou
    // OU das quais é participante. Edição/exclusão: dono do lançamento ou
    // dono da oportunidade.
    lanCol.listRule =
      "@request.auth.id != '' && (usuario = @request.auth.id || oportunidade.participantes = @request.auth.id)"
    lanCol.viewRule =
      "@request.auth.id != '' && (usuario = @request.auth.id || oportunidade.participantes = @request.auth.id)"
    lanCol.createRule =
      "@request.auth.id != '' && (oportunidade.usuario = @request.auth.id || oportunidade.participantes = @request.auth.id)"
    lanCol.updateRule =
      "@request.auth.id != '' && (usuario = @request.auth.id || oportunidade.usuario = @request.auth.id)"
    lanCol.deleteRule =
      "@request.auth.id != '' && (usuario = @request.auth.id || oportunidade.usuario = @request.auth.id)"
    app.save(lanCol)
  },
  (app) => {
    // Reverte oportunidades
    const opCol = app.findCollectionByNameOrId('oportunidades')
    opCol.listRule = "@request.auth.id != '' && usuario = @request.auth.id"
    opCol.viewRule = "@request.auth.id != '' && usuario = @request.auth.id"
    const participantesField = opCol.fields.getByName('participantes')
    if (participantesField) {
      opCol.fields.remove(participantesField)
    }
    app.save(opCol)

    // Reverte lancamentos
    const lanCol = app.findCollectionByNameOrId('lancamentos')
    lanCol.listRule = "@request.auth.id != '' && usuario = @request.auth.id"
    lanCol.viewRule = "@request.auth.id != '' && usuario = @request.auth.id"
    lanCol.createRule = "@request.auth.id != ''"
    lanCol.updateRule = "@request.auth.id != '' && usuario = @request.auth.id"
    lanCol.deleteRule = "@request.auth.id != '' && usuario = @request.auth.id"
    const qpField = lanCol.fields.getByName('quem_pagou')
    if (qpField) {
      lanCol.fields.remove(qpField)
    }
    app.save(lanCol)
  },
)
