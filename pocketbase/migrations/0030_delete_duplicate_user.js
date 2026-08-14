migrate(
  (app) => {
    // Exclui a conta duplicada (edusp0121.ep@gmail.com, id a3czep32xcv5rj0).
    // Esta conta não possui oportunidades nem lançamentos próprios, então não há
    // risco de perder dados.
    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', 'edusp0121.ep@gmail.com')
      if (record.id === 'a3czep32xcv5rj0') {
        app.delete(record)
      }
    } catch (_) {
      // Conta já não existe — nada a fazer (migração idempotente).
    }
  },
  (app) => {
    // down: não é possível restaurar uma conta excluída (senha hasheada);
    // ressemeada apenas recriaria o registro sem credenciais válidas.
  },
)
