// 0028 — Perfil de administrador.
//
// 1. Adiciona o campo `admin` (bool, default false) na coleção `users`.
// 2. Marca `admin = true` para o usuário edusp0121@hotmail.com
//    (ID vgjnrosut5cv1s0).
// 3. Atualiza as API rules de `oportunidades` para liberar list/view quando
//    `@request.auth.admin = true` e update/delete quando o usuário é admin.
// 4. Atualiza as API rules de `lancamentos` de forma análoga.
//
// O admin enxerga e edita todos os registros ao logar — nenhuma mudança de
// UI é necessária, pois as regras já liberam tudo para
// `@request.auth.admin = true`.
migrate(
  (app) => {
    // ---- users: campo admin ----
    const usersCol = app.findCollectionByNameOrId('users')
    if (!usersCol.fields.getByName('admin')) {
      // bool NÃO deve ser required (false seria rejeitado como vazio).
      usersCol.fields.add(new BoolField({ name: 'admin' }))
    }
    app.save(usersCol)

    // Marca o usuário alvo como admin. Tenta por ID primeiro; se falhar,
    // cai para busca por e-mail (mais robusto).
    let adminRecord = null
    try {
      adminRecord = app.findFirstRecordByData('users', 'id', 'vgjnrosut5cv1s0')
    } catch (_) {
      try {
        adminRecord = app.findAuthRecordByEmail('users', 'edusp0121@hotmail.com')
      } catch (_) {
        adminRecord = null
      }
    }
    if (adminRecord) {
      adminRecord.set('admin', true)
      app.save(adminRecord)
    }

    // ---- oportunidades: regras com admin ----
    const opCol = app.findCollectionByNameOrId('oportunidades')
    opCol.listRule =
      "@request.auth.id != '' && (usuario = @request.auth.id || participantes = @request.auth.id || @request.auth.admin = true)"
    opCol.viewRule =
      "@request.auth.id != '' && (usuario = @request.auth.id || participantes = @request.auth.id || @request.auth.admin = true)"
    // create continua: qualquer logado pode criar
    opCol.createRule = "@request.auth.id != ''"
    opCol.updateRule =
      "@request.auth.id != '' && (usuario = @request.auth.id || @request.auth.admin = true)"
    opCol.deleteRule =
      "@request.auth.id != '' && (usuario = @request.auth.id || @request.auth.admin = true)"
    app.save(opCol)

    // ---- lancamentos: regras com admin ----
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
  (app) => {
    // Reverte regras de oportunidades ao estado anterior (0026).
    const opCol = app.findCollectionByNameOrId('oportunidades')
    opCol.listRule =
      "@request.auth.id != '' && (usuario = @request.auth.id || participantes = @request.auth.id)"
    opCol.viewRule =
      "@request.auth.id != '' && (usuario = @request.auth.id || participantes = @request.auth.id)"
    opCol.createRule = "@request.auth.id != ''"
    opCol.updateRule = "@request.auth.id != '' && usuario = @request.auth.id"
    opCol.deleteRule = "@request.auth.id != '' && usuario = @request.auth.id"
    app.save(opCol)

    // Reverte regras de lancamentos ao estado anterior (0026).
    const lanCol = app.findCollectionByNameOrId('lancamentos')
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

    // Reverte flag admin do usuário alvo.
    let adminRecord = null
    try {
      adminRecord = app.findFirstRecordByData('users', 'id', 'vgjnrosut5cv1s0')
    } catch (_) {
      try {
        adminRecord = app.findAuthRecordByEmail('users', 'edusp0121@hotmail.com')
      } catch (_) {
        adminRecord = null
      }
    }
    if (adminRecord) {
      adminRecord.set('admin', false)
      app.save(adminRecord)
    }

    // Remove o campo admin de users.
    const usersCol = app.findCollectionByNameOrId('users')
    const adminField = usersCol.fields.getByName('admin')
    if (adminField) {
      usersCol.fields.remove(adminField)
    }
    app.save(usersCol)
  },
)
