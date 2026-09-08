// 0056 — Adiciona campo soft delete (deleted_at) e atualiza regras de acesso
migrate(
  (app) => {
    const opCol = app.findCollectionByNameOrId('oportunidades')

    // 1. Adiciona o campo deleted_at (date, opcional)
    if (!opCol.fields.getByName('deleted_at')) {
      opCol.fields.add(
        new DateField({
          name: 'deleted_at',
          required: false,
        }),
      )
    }

    // 2. listRule e viewRule passam a filtrar deleted_at = ""
    // Conforme especificação:
    // "1. Migration: campo deleted_at (date, opcional) na coleção oportunidades;
    //     listRule/viewRule passam a filtrar deleted_at = "" para que excluídos
    //     desapareçam de todas as listas/consultas existentes sem mudar o código das telas."
    // Para que o admin possa listar as oportunidades excluídas na tela de restauração
    // ou acessar o registro excluído, permitimos o acesso quando deleted_at = "" OU quando
    // o usuário logado for admin (@request.auth.admin = true).
    // Desta forma, todas as consultas existentes de usuários normais continuam filtrando deleted_at = "",
    // enquanto o admin tem permissão para consultar tanto as ativas quanto as excluídas.
    opCol.listRule = "@request.auth.id != '' && (deleted_at = '' || @request.auth.admin = true)"
    opCol.viewRule = "@request.auth.id != '' && (deleted_at = '' || @request.auth.admin = true)"

    // 3. updateRule: dono OU participante OU admin.
    opCol.updateRule =
      "@request.auth.id != '' && (usuario = @request.auth.id || participantes ~ @request.auth.id || @request.auth.admin = true)"

    // 4. deleteRule:
    // Ação "Excluir definitivamente" exclusiva de admin com dupla confirmação.
    // Usuários normais fazem soft-delete via update. Se tentarem chamar DELETE HTTP,
    // apenas admin tem permissão na deleteRule!
    opCol.deleteRule = "@request.auth.id != '' && @request.auth.admin = true"

    app.save(opCol)
  },
  (app) => {
    const opCol = app.findCollectionByNameOrId('oportunidades')
    const delField = opCol.fields.getByName('deleted_at')
    if (delField) {
      opCol.fields.remove(delField)
    }
    opCol.listRule = "@request.auth.id != ''"
    opCol.viewRule = "@request.auth.id != ''"
    opCol.deleteRule =
      "@request.auth.id != '' && (usuario = @request.auth.id || @request.auth.admin = true)"
    app.save(opCol)
  },
)
