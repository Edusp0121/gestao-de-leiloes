// 0027 — Permite que qualquer usuário autenticado liste/visualize outros
// usuários, necessário para o seletor de Sócios/Participantes na tela de
// Nova Análise. Antes, a regra era "id = @request.auth.id" (cada usuário só
// via a si mesmo). Criação/edição/exclusão continuam restritos ao próprio
// usuário.
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    col.listRule = "@request.auth.id != ''"
    col.viewRule = "@request.auth.id != ''"
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    col.listRule = 'id = @request.auth.id'
    col.viewRule = 'id = @request.auth.id'
    app.save(col)
  },
)
