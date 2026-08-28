// 0045_setup_smtp.js
// Configuração de SMTP do PocketBase e adição do campo email_notificado na coleção checklists

migrate(
  (app) => {
    // 1. Configuração do SMTP e Meta do PocketBase
    try {
      const settings = app.settings()

      // Configuração SMTP
      settings.smtp.enabled = true
      settings.smtp.host = 'premium2.hospedameusite.net'
      settings.smtp.port = 465
      settings.smtp.username = 'atendimento@doulhetres.com.br'
      settings.smtp.tls = true

      // Senha: tenta ler do env/secret ou mantém a existente caso já configurada
      const smtpPass =
        $os.getenv('SMTP_PASSWORD') ||
        ($secrets.has('SMTP_PASSWORD') ? $secrets.get('SMTP_PASSWORD') : '') ||
        settings.smtp.password ||
        ''
      if (smtpPass) {
        settings.smtp.password = smtpPass
      }

      // Remetente padrão
      settings.meta.senderName = 'Dou-lhe Tres Assessoria'
      settings.meta.senderAddress = 'atendimento@doulhetres.com.br'

      app.save(settings)
    } catch (err) {
      console.log('Erro ao aplicar configurações de SMTP:', err)
    }

    // 2. Adição do campo email_notificado na coleção checklists
    const checklistsCol = app.findCollectionByNameOrId('checklists')
    if (!checklistsCol.fields.getByName('email_notificado')) {
      checklistsCol.fields.add(
        new BoolField({
          name: 'email_notificado',
          required: false,
        }),
      )
      app.save(checklistsCol)
    }
  },
  (app) => {
    try {
      const checklistsCol = app.findCollectionByNameOrId('checklists')
      const field = checklistsCol.fields.getByName('email_notificado')
      if (field) {
        checklistsCol.fields.removeByName('email_notificado')
        app.save(checklistsCol)
      }
    } catch (_) {}
  },
)
