// 0048 — Fix lancamentos permissions and data
//
// 1. Atualiza as API rules da coleção `lancamentos`:
//    - list: @request.auth.id != '' && (usuario = @request.auth.id || oportunidade.participantes ~ @request.auth.id || oportunidade.observadores ~ @request.auth.id || @request.auth.admin = true || oportunidade.usuario = @request.auth.id)
//    - view: @request.auth.id != '' && (usuario = @request.auth.id || oportunidade.participantes ~ @request.auth.id || oportunidade.observadores ~ @request.auth.id || @request.auth.admin = true || oportunidade.usuario = @request.auth.id)
//    - create: @request.auth.id != '' && (oportunidade.usuario = @request.auth.id || oportunidade.participantes ~ @request.auth.id || @request.auth.admin = true)
//    - update: @request.auth.id != '' && (usuario = @request.auth.id || oportunidade.usuario = @request.auth.id || @request.auth.admin = true)
//    - delete: @request.auth.id != '' && (usuario = @request.auth.id || oportunidade.usuario = @request.auth.id || @request.auth.admin = true)
//
// 2. Data fix:
//    - Na oportunidade 'Sant Angeli' (wiabmkqe31nfvc7), atualiza os lançamentos
//      'ys8kcklqpu0wol1' ('Reforma') e 'r2gbh7pk4jewc44' ('Custas') para usuario = 'vtexbcl74co0x5y' (Eduardo Passos).
migrate(
  (app) => {
    // ---- 1. Atualiza API Rules de lancamentos ----
    const lanCol = app.findCollectionByNameOrId('lancamentos')

    lanCol.listRule =
      "@request.auth.id != '' && (usuario = @request.auth.id || oportunidade.participantes ~ @request.auth.id || oportunidade.observadores ~ @request.auth.id || @request.auth.admin = true || oportunidade.usuario = @request.auth.id)"
    lanCol.viewRule =
      "@request.auth.id != '' && (usuario = @request.auth.id || oportunidade.participantes ~ @request.auth.id || oportunidade.observadores ~ @request.auth.id || @request.auth.admin = true || oportunidade.usuario = @request.auth.id)"
    lanCol.createRule =
      "@request.auth.id != '' && (oportunidade.usuario = @request.auth.id || oportunidade.participantes ~ @request.auth.id || @request.auth.admin = true)"
    lanCol.updateRule =
      "@request.auth.id != '' && (usuario = @request.auth.id || oportunidade.usuario = @request.auth.id || @request.auth.admin = true)"
    lanCol.deleteRule =
      "@request.auth.id != '' && (usuario = @request.auth.id || oportunidade.usuario = @request.auth.id || @request.auth.admin = true)"

    app.save(lanCol)

    // ---- 2. Data fix para Sant Angeli ----
    const targetLaunches = ['ys8kcklqpu0wol1', 'r2gbh7pk4jewc44']
    for (let i = 0; i < targetLaunches.length; i++) {
      try {
        const record = app.findFirstRecordByData('lancamentos', 'id', targetLaunches[i])
        record.set('usuario', 'vtexbcl74co0x5y')
        app.save(record)
      } catch (_) {
        // Se o registro não existir por algum motivo, executa SQL de fallback
        try {
          app
            .db()
            .newQuery("UPDATE lancamentos SET usuario = 'vtexbcl74co0x5y' WHERE id = {:id}")
            .bind({ id: targetLaunches[i] })
            .execute()
        } catch (_) {}
      }
    }
  },
  (app) => {
    // Reverte regras para estado anterior (0031)
    const lanCol = app.findCollectionByNameOrId('lancamentos')
    lanCol.listRule =
      "@request.auth.id != '' && (usuario = @request.auth.id || oportunidade.participantes = @request.auth.id || oportunidade.observadores = @request.auth.id || @request.auth.admin = true)"
    lanCol.viewRule =
      "@request.auth.id != '' && (usuario = @request.auth.id || oportunidade.participantes = @request.auth.id || oportunidade.observadores = @request.auth.id || @request.auth.admin = true)"
    lanCol.createRule =
      "@request.auth.id != '' && (oportunidade.usuario = @request.auth.id || oportunidade.participantes = @request.auth.id || @request.auth.admin = true)"
    lanCol.updateRule =
      "@request.auth.id != '' && (usuario = @request.auth.id || oportunidade.usuario = @request.auth.id || @request.auth.admin = true)"
    lanCol.deleteRule =
      "@request.auth.id != '' && (usuario = @request.auth.id || oportunidade.usuario = @request.auth.id || @request.auth.admin = true)"
    app.save(lanCol)
  },
)
