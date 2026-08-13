migrate(
  (app) => {
    const email = 'edusp0121@hotmail.com'
    const newPassword = 'Mudar@123'

    // Verifica se o usuário existe antes de alterar
    let record
    try {
      record = app.findAuthRecordByEmail('_pb_users_auth_', email)
    } catch (_) {
      console.log('Usuário não encontrado: ' + email)
      return
    }

    record.setPassword(newPassword)
    app.save(record)
    console.log('Senha redefinida com sucesso para: ' + email)
  },
  (app) => {
    // Sem rollback — não é possível reverter uma senha para um valor desconhecido
  },
)
