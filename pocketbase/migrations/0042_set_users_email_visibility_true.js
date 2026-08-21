migrate(
  (app) => {
    // 1. Atualizar todos os usuários existentes para emailVisibility = true
    app.db().newQuery('UPDATE users SET emailVisibility = 1').execute()
  },
  (app) => {
    // Revert: restaurar emailVisibility = 0 se necessário
    app.db().newQuery('UPDATE users SET emailVisibility = 0').execute()
  },
)
