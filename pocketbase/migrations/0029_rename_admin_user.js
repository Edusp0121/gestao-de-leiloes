migrate(
  (app) => {
    // Renomeia o usuário admin (edusp0121@hotmail.com, id vgjnrosut5cv1s0)
    // de "Investidor de Leilões" para "Eduardo Passos".
    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', 'edusp0121@hotmail.com')
      // Confirma o id esperado antes de alterar (segurança contra ambientes divergentes).
      if (record.id === 'vgjnrosut5cv1s0') {
        record.set('name', 'Eduardo Passos')
        app.save(record)
      }
    } catch (_) {
      // Usuário não encontrado — nada a fazer (migração idempotente).
    }
  },
  (app) => {
    // Reverte o nome para o valor anterior.
    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', 'edusp0121@hotmail.com')
      if (record.id === 'vgjnrosut5cv1s0') {
        record.set('name', 'Investidor de Leilões')
        app.save(record)
      }
    } catch (_) {}
  },
)
