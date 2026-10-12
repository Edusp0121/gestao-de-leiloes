// 0070_create_initial_superuser.js
// Criação/atualização do superusuário do PocketBase para acesso administrativo em /_/
migrate(
  (app) => {
    const email = 'edusp0121@hotmail.com'
    const tempPassword = 'Edu!Leiloes#2026$Admin'

    const superusers = app.findCollectionByNameOrId('_superusers')

    let record = null
    try {
      record = app.findAuthRecordByEmail('_superusers', email)
    } catch (_) {
      record = null
    }

    if (!record) {
      record = new Record(superusers)
      record.setEmail(email)
      record.setPassword(tempPassword)
      record.setVerified(true)
      app.save(record)
      console.log('Superusuário criado com sucesso na coleção _superusers: ' + email)
    } else {
      record.setPassword(tempPassword)
      record.setVerified(true)
      app.save(record)
      console.log('Senha do superusuário atualizada na coleção _superusers: ' + email)
    }
  },
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('_superusers', 'edusp0121@hotmail.com')
      app.delete(record)
    } catch (_) {
      // silencioso se já removido
    }
  },
)
