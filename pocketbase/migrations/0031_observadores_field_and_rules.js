// 0031 — Observadores em oportunidades.
//
// 1. Adiciona o campo multi-relação `observadores` (→ users) na coleção
//    `oportunidades`, representando usuários que podem VER a oportunidade e
//    seus números, mas não editam, não lançam despesas e não participam do
//    rateio.
// 2. Ajusta as API rules de `oportunidades`:
//    - list/view: criador OU participante OU observador OU admin.
//    - create: qualquer logado.
//    - update/delete: criador OU admin (observadores não editam).
// 3. Ajusta as API rules de `lancamentos`:
//    - list/view: criador do lançamento OU participante da oportunidade OU
//      admin. Observadores NÃO entram aqui (não veem lançamentos? — ver nota).
//      => Na verdade observadores VEEM os números, então list/view também
//         inclui observadores da oportunidade.
//    - create: criador da oportunidade OU participante OU admin.
//      Observadores NÃO podem criar lançamentos.
//    - update/delete: dono do lançamento, dono da oportunidade ou admin.
//      Observadores NÃO podem editar/excluir.
//
// Nota sobre "Observadores podem ver os números": o card de rateio e os
// cards de resumo usam `oportunidade` (view de oportunidades) + `lancamentos`
// (list de lancamentos). Para que o observador veja TODOS os números,
// liberamos list/view de lancamentos também para observadores da oportunidade.
migrate(
  (app) => {
    // ---- oportunidades: campo observadores + regras ----
    const opCol = app.findCollectionByNameOrId('oportunidades')

    if (!opCol.fields.getByName('observadores')) {
      opCol.fields.add(
        new RelationField({
          name: 'observadores',
          collectionId: '_pb_users_auth_',
          maxSelect: 0, // múltipla seleção (sem limite)
          cascadeDelete: false,
        }),
      )
    }

    // list/view: criador OU participante OU observador OU admin.
    opCol.listRule =
      "@request.auth.id != '' && (usuario = @request.auth.id || participantes = @request.auth.id || observadores = @request.auth.id || @request.auth.admin = true)"
    opCol.viewRule =
      "@request.auth.id != '' && (usuario = @request.auth.id || participantes = @request.auth.id || observadores = @request.auth.id || @request.auth.admin = true)"
    // create: qualquer logado.
    opCol.createRule = "@request.auth.id != ''"
    // update: criador OU participante OU admin. Observadores NÃO editam.
    // (A alteração dos campos `participantes`/`observadores` é bloqueada a
    //  não-admins pelo hook `oportunidades_admin_guard.js`.)
    opCol.updateRule =
      "@request.auth.id != '' && (usuario = @request.auth.id || participantes = @request.auth.id || @request.auth.admin = true)"
    // delete: criador OU admin (observadores e participantes não excluem).
    opCol.deleteRule =
      "@request.auth.id != '' && (usuario = @request.auth.id || @request.auth.admin = true)"
    app.save(opCol)

    // ---- lancamentos: regras com observadores ----
    const lanCol = app.findCollectionByNameOrId('lancamentos')

    // list/view: dono do lançamento OU participante OU observador OU admin.
    // Observadores veem os lançamentos (para ver os números/rateio).
    lanCol.listRule =
      "@request.auth.id != '' && (usuario = @request.auth.id || oportunidade.participantes = @request.auth.id || oportunidade.observadores = @request.auth.id || @request.auth.admin = true)"
    lanCol.viewRule =
      "@request.auth.id != '' && (usuario = @request.auth.id || oportunidade.participantes = @request.auth.id || oportunidade.observadores = @request.auth.id || @request.auth.admin = true)"
    // create: criador da oportunidade OU participante OU admin.
    // Observadores NÃO podem criar lançamentos.
    lanCol.createRule =
      "@request.auth.id != '' && (oportunidade.usuario = @request.auth.id || oportunidade.participantes = @request.auth.id || @request.auth.admin = true)"
    // update/delete: dono do lançamento, dono da oportunidade ou admin.
    // Observadores NÃO podem editar/excluir.
    lanCol.updateRule =
      "@request.auth.id != '' && (usuario = @request.auth.id || oportunidade.usuario = @request.auth.id || @request.auth.admin = true)"
    lanCol.deleteRule =
      "@request.auth.id != '' && (usuario = @request.auth.id || oportunidade.usuario = @request.auth.id || @request.auth.admin = true)"
    app.save(lanCol)
  },
  (app) => {
    // Reverte oportunidades: remove observadores e volta regras ao estado 0028.
    const opCol = app.findCollectionByNameOrId('oportunidades')
    opCol.listRule =
      "@request.auth.id != '' && (usuario = @request.auth.id || participantes = @request.auth.id || @request.auth.admin = true)"
    opCol.viewRule =
      "@request.auth.id != '' && (usuario = @request.auth.id || participantes = @request.auth.id || @request.auth.admin = true)"
    opCol.createRule = "@request.auth.id != ''"
    opCol.updateRule =
      "@request.auth.id != '' && (usuario = @request.auth.id || participantes = @request.auth.id || @request.auth.admin = true)"
    opCol.deleteRule =
      "@request.auth.id != '' && (usuario = @request.auth.id || @request.auth.admin = true)"
    const obsField = opCol.fields.getByName('observadores')
    if (obsField) {
      opCol.fields.remove(obsField)
    }
    app.save(opCol)

    // Reverte lancamentos ao estado 0028.
    const lanCol = app.findCollectionByNameOrId('lancamentos')
    lanCol.listRule =
      "@request.auth.id != '' && (usuario = @request.auth.id || oportunidade.participantes = @request.auth.id || @request.auth.admin = true)"
    lanCol.viewRule =
      "@request.auth.id != '' && (usuario = @request.auth.id || oportunidade.participantes = @request.auth.id || @request.auth.admin = true)"
    lanCol.createRule =
      "@request.auth.id != '' && (oportunidade.usuario = @request.auth.id || oportunidade.participantes = @request.auth.id || @request.auth.admin = true)"
    lanCol.updateRule =
      "@request.auth.id != '' && (usuario = @request.auth.id || oportunidade.usuario = @request.auth.id || @request.auth.admin = true)"
    lanCol.deleteRule =
      "@request.auth.id != '' && (usuario = @request.auth.id || oportunidade.usuario = @request.auth.id || @request.auth.admin = true)"
    app.save(lanCol)
  },
)
