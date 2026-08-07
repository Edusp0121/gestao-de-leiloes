migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    let userRecord

    try {
      userRecord = app.findAuthRecordByEmail('_pb_users_auth_', 'edusp0121@hotmail.com')
    } catch (_) {
      userRecord = new Record(usersCol)
      userRecord.setEmail('edusp0121@hotmail.com')
      userRecord.setPassword('Skip@Pass')
      userRecord.setVerified(true)
      userRecord.set('name', 'Investidor de Leilões')
      app.save(userRecord)
    }
  },
  (app) => {},
)
