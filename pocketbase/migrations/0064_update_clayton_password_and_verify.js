migrate(
  (app) => {
    const userId = 'wkvsa12edk2y5a7'
    const email = 'clayton.melo@grupogas.com.br'
    const newPassword = 'Mudar_123'

    let record
    try {
      record = app.findFirstRecordByData('_pb_users_auth_', 'id', userId)
    } catch (_) {
      try {
        record = app.findAuthRecordByEmail('_pb_users_auth_', email)
      } catch (err) {
        console.log('Usuário Clayton não encontrado: ' + err)
        return
      }
    }

    // Altera a senha gerando o hash via SDK admin do PocketBase
    record.setPassword(newPassword)
    // Marca verified como true para desbloquear o login
    record.setVerified(true)

    app.save(record)
    console.log(
      'Senha e status verified atualizados com sucesso para: ' + record.getString('email'),
    )
  },
  (app) => {
    // Sem rollback — não é possível reverter a senha com hash anterior
  },
)
