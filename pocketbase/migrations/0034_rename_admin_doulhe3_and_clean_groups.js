migrate(
  (app) => {
    // 1. Atualizar nome do usuário Administrador para "Doulhe3"
    try {
      const adminUser = app.findFirstRecordByData('users', 'email', 'edusp0121@hotmail.com')
      if (adminUser) {
        adminUser.set('name', 'Doulhe3')
        app.save(adminUser)
      }
    } catch (err) {
      console.log('Admin user edusp0121@hotmail.com not found for rename:', err)
    }

    // Se houver algum outro usuário com admin = true
    try {
      const adminUsers = app.findRecordsByFilter('users', 'admin = true', '', 50, 0)
      adminUsers.forEach((u) => {
        u.set('name', 'Doulhe3')
        app.save(u)
      })
    } catch (err) {
      console.log('Error updating admin users:', err)
    }

    // 2. Remover o ID do usuário admin dos arrays de participantes e observadores de todas as oportunidades existentes
    try {
      const adminUser = app.findFirstRecordByData('users', 'email', 'edusp0121@hotmail.com')
      if (adminUser) {
        const adminId = adminUser.id
        const ops = app.findRecordsByFilter('oportunidades', '1 = 1', '', 500, 0)
        ops.forEach((op) => {
          let modified = false
          const parts = op.get('participantes')
          if (Array.isArray(parts) && parts.includes(adminId)) {
            op.set(
              'participantes',
              parts.filter((id) => id !== adminId),
            )
            modified = true
          }
          const obs = op.get('observadores')
          if (Array.isArray(obs) && obs.includes(adminId)) {
            op.set(
              'observadores',
              obs.filter((id) => id !== adminId),
            )
            modified = true
          }
          if (modified) {
            app.save(op)
          }
        })
      }
    } catch (err) {
      console.log('Error cleaning admin from oportunidades:', err)
    }
  },
  (app) => {
    try {
      const adminUser = app.findFirstRecordByData('users', 'email', 'edusp0121@hotmail.com')
      if (adminUser) {
        adminUser.set('name', 'Eduardo Passos')
        app.save(adminUser)
      }
    } catch (_) {}
  },
)
