// 0065_restrict_oportunidades_access_rules.js
//
// Restringe listRule e viewRule da coleção `oportunidades` para que usuários não-admin
// vejam apenas oportunidades em que sejam titular (usuario), participante ou observador,
// preservando o filtro de soft-delete e a visibilidade irrestrita para administradores.
//
// Também revisa e garante a consistência das regras de leitura das coleções dependentes:
// - lancamentos: list/view restrita a quem pode ver a oportunidade vinculada (titular/participantes/observadores/admin),
//   ou criador do próprio lançamento (usuario = @request.auth.id) para lançamentos do usuário logado.
// - checklists: titular/participantes/observadores/admin via oportunidade vinculada.
// - fechamentos: titular/participantes/observadores/admin via oportunidade vinculada.
// - fechamento_lancamentos: titular/participantes/observadores/admin via oportunidade vinculada.
//
// Todas as regras de escrita/exclusão existentes são mantidas rigorosamente sem regressão.

migrate(
  (app) => {
    // 1. Coleção `oportunidades`
    const opCol = app.findCollectionByNameOrId('oportunidades')
    opCol.listRule =
      '@request.auth.id != "" && (usuario = @request.auth.id || participantes ~ @request.auth.id || observadores ~ @request.auth.id || @request.auth.admin = true) && (deleted_at = "" || @request.auth.admin = true)'
    opCol.viewRule =
      '@request.auth.id != "" && (usuario = @request.auth.id || participantes ~ @request.auth.id || observadores ~ @request.auth.id || @request.auth.admin = true) && (deleted_at = "" || @request.auth.admin = true)'
    app.save(opCol)

    // Grava no log de sistema do PocketBase para confirmação em list_logs
    try {
      app.logger().info('[MIGRATION_0065_SUCCESS] Oportunidades listRule e viewRule aplicadas', {
        listRule: opCol.listRule,
      })
    } catch (_) {}

    // 2. Coleção `lancamentos`
    const lanCol = app.findCollectionByNameOrId('lancamentos')
    lanCol.listRule =
      '@request.auth.id != "" && (usuario = @request.auth.id || oportunidade.usuario = @request.auth.id || oportunidade.participantes ~ @request.auth.id || oportunidade.observadores ~ @request.auth.id || @request.auth.admin = true)'
    lanCol.viewRule =
      '@request.auth.id != "" && (usuario = @request.auth.id || oportunidade.usuario = @request.auth.id || oportunidade.participantes ~ @request.auth.id || oportunidade.observadores ~ @request.auth.id || @request.auth.admin = true)'
    app.save(lanCol)

    // 3. Coleção `checklists`
    const chkCol = app.findCollectionByNameOrId('checklists')
    chkCol.listRule =
      '@request.auth.id != "" && (oportunidade.usuario = @request.auth.id || oportunidade.participantes ~ @request.auth.id || oportunidade.observadores ~ @request.auth.id || @request.auth.admin = true)'
    chkCol.viewRule =
      '@request.auth.id != "" && (oportunidade.usuario = @request.auth.id || oportunidade.participantes ~ @request.auth.id || oportunidade.observadores ~ @request.auth.id || @request.auth.admin = true)'
    app.save(chkCol)

    // 4. Coleção `fechamentos`
    const fecCol = app.findCollectionByNameOrId('fechamentos')
    fecCol.listRule =
      '@request.auth.id != "" && (oportunidade.usuario = @request.auth.id || oportunidade.participantes ~ @request.auth.id || oportunidade.observadores ~ @request.auth.id || @request.auth.admin = true)'
    fecCol.viewRule =
      '@request.auth.id != "" && (oportunidade.usuario = @request.auth.id || oportunidade.participantes ~ @request.auth.id || oportunidade.observadores ~ @request.auth.id || @request.auth.admin = true)'
    app.save(fecCol)

    // 5. Coleção `fechamento_lancamentos`
    const fclCol = app.findCollectionByNameOrId('fechamento_lancamentos')
    fclCol.listRule =
      '@request.auth.id != "" && (oportunidade.usuario = @request.auth.id || oportunidade.participantes ~ @request.auth.id || oportunidade.observadores ~ @request.auth.id || @request.auth.admin = true)'
    fclCol.viewRule =
      '@request.auth.id != "" && (oportunidade.usuario = @request.auth.id || oportunidade.participantes ~ @request.auth.id || oportunidade.observadores ~ @request.auth.id || @request.auth.admin = true)'
    app.save(fclCol)
  },
  (app) => {
    // Reverte para as regras anteriores (0056)
    const opCol = app.findCollectionByNameOrId('oportunidades')
    opCol.listRule = "@request.auth.id != '' && (deleted_at = '' || @request.auth.admin = true)"
    opCol.viewRule = "@request.auth.id != '' && (deleted_at = '' || @request.auth.admin = true)"
    app.save(opCol)
  },
)
