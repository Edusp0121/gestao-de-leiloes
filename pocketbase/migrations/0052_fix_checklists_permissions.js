// 0052_fix_checklists_permissions.js
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('checklists')

    col.listRule =
      "@request.auth.id != '' && (oportunidade.usuario = @request.auth.id || oportunidade.participantes ~ @request.auth.id || oportunidade.observadores ~ @request.auth.id || @request.auth.admin = true)"
    col.viewRule =
      "@request.auth.id != '' && (oportunidade.usuario = @request.auth.id || oportunidade.participantes ~ @request.auth.id || oportunidade.observadores ~ @request.auth.id || @request.auth.admin = true)"
    col.createRule =
      "@request.auth.id != '' && (oportunidade.usuario = @request.auth.id || oportunidade.participantes ~ @request.auth.id || @request.auth.admin = true)"
    col.updateRule =
      "@request.auth.id != '' && (oportunidade.usuario = @request.auth.id || oportunidade.participantes ~ @request.auth.id || @request.auth.admin = true)"
    col.deleteRule =
      "@request.auth.id != '' && (oportunidade.usuario = @request.auth.id || @request.auth.admin = true)"

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('checklists')
    col.listRule =
      "@request.auth.id != '' && (oportunidade.usuario = @request.auth.id || oportunidade.participantes = @request.auth.id || oportunidade.observadores = @request.auth.id || @request.auth.admin = true)"
    col.viewRule =
      "@request.auth.id != '' && (oportunidade.usuario = @request.auth.id || oportunidade.participantes = @request.auth.id || oportunidade.observadores = @request.auth.id || @request.auth.admin = true)"
    col.createRule =
      "@request.auth.id != '' && (oportunidade.usuario = @request.auth.id || oportunidade.participantes = @request.auth.id || @request.auth.admin = true)"
    col.updateRule =
      "@request.auth.id != '' && (oportunidade.usuario = @request.auth.id || oportunidade.participantes = @request.auth.id || @request.auth.admin = true)"
    col.deleteRule =
      "@request.auth.id != '' && (oportunidade.usuario = @request.auth.id || @request.auth.admin = true)"

    app.save(col)
  },
)
