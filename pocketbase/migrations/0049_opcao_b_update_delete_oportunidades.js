// 0049 — Regra "opção B" (aprovada pelo Edu) para update/delete de oportunidades.
//
// Tabela de permissões (tela E backend):
// | Situação     | Editar                | Excluir          |
// |--------------|-----------------------|------------------|
// | Sem despesa  | Dono + participantes  | Dono + participantes |
// | Com despesa  | Dono + participantes  | Admin + Dono     |
//
// Observadores NUNCA editam nem excluem.
// - updateRule: dono OU participante OU admin (observador fora).
// - deleteRule: API rule libera apenas admin + dono (regra incondicional,
//   já que "com despesa" é o caso restritivo). Participante SEM despesa é
//   permitido pelo hook `oportunidades_delete_guard.js`, que consulta os
//   lançamentos da oportunidade.
// As regras de list/view/create e as regras de `lancamentos` (corrigidas na
// 0048) NÃO são alteradas.
migrate(
  (app) => {
    const opCol = app.findCollectionByNameOrId('oportunidades')

    // update: dono OU participante OU admin. Observadores NUNCA editam.
    opCol.updateRule =
      "@request.auth.id != '' && (usuario = @request.auth.id || participantes ~ @request.auth.id || @request.auth.admin = true)"

    // delete: apenas admin OU dono na API rule; participante sem despesa
    // é liberado pelo hook oportunidades_delete_guard.js.
    opCol.deleteRule =
      "@request.auth.id != '' && (usuario = @request.auth.id || @request.auth.admin = true)"

    app.save(opCol)
  },
  (app) => {
    // Reverte para o estado da 0031.
    const opCol = app.findCollectionByNameOrId('oportunidades')
    opCol.updateRule =
      "@request.auth.id != '' && (usuario = @request.auth.id || participantes = @request.auth.id || @request.auth.admin = true)"
    opCol.deleteRule =
      "@request.auth.id != '' && (usuario = @request.auth.id || @request.auth.admin = true)"
    app.save(opCol)
  },
)
