// 0054_adjust_fechamentos_delete_rules.js
// Garante permissões de exclusão para Dono + Admin nas coleções `fechamentos` e `fechamento_lancamentos`
// para viabilizar o fluxo de Reabrir Investimento no backend.

migrate(
  (app) => {
    // 1. Coleção `fechamentos`
    try {
      const fechamentosCol = app.findCollectionByNameOrId('fechamentos')
      fechamentosCol.deleteRule =
        "@request.auth.id != '' && (oportunidade.usuario = @request.auth.id || @request.auth.admin = true)"
      app.save(fechamentosCol)
    } catch (err) {
      console.log('Erro ao atualizar deleteRule de fechamentos:', err)
    }

    // 2. Coleção `fechamento_lancamentos`
    try {
      const fechamentoLancamentosCol = app.findCollectionByNameOrId('fechamento_lancamentos')
      fechamentoLancamentosCol.deleteRule =
        "@request.auth.id != '' && (oportunidade.usuario = @request.auth.id || @request.auth.admin = true)"
      app.save(fechamentoLancamentosCol)
    } catch (err) {
      console.log('Erro ao atualizar deleteRule de fechamento_lancamentos:', err)
    }
  },
  (app) => {
    // Reverte regras para estado anterior (0053)
    try {
      const fechamentosCol = app.findCollectionByNameOrId('fechamentos')
      fechamentosCol.deleteRule =
        "@request.auth.id != '' && (oportunidade.usuario = @request.auth.id || @request.auth.admin = true)"
      app.save(fechamentosCol)
    } catch (_) {}

    try {
      const fechamentoLancamentosCol = app.findCollectionByNameOrId('fechamento_lancamentos')
      fechamentoLancamentosCol.deleteRule =
        "@request.auth.id != '' && (oportunidade.usuario = @request.auth.id || @request.auth.admin = true)"
      app.save(fechamentoLancamentosCol)
    } catch (_) {}
  },
)
