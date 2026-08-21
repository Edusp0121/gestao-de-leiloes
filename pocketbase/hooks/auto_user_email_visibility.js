// auto_user_email_visibility.js
// Garante que todo novo usuário criado tenha emailVisibility = true por padrão
onRecordCreate((e) => {
  e.record.set('emailVisibility', true)
  return e.next()
}, 'users')
