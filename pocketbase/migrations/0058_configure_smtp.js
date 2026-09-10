// 0058_configure_smtp.js
migrate(
  (app) => {
    const settings = app.settings()

    const envPass = $os.getenv('SMTP_PASSWORD') || ''
    const hardcodedPass = 'Doulhe@123#'
    const password = envPass || hardcodedPass

    settings.smtp.enabled = true
    settings.smtp.host = 'premium2.hospedameusite.net'
    settings.smtp.port = 465
    settings.smtp.username = 'atendimento@doulhetres.com.br'
    settings.smtp.password = password
    settings.smtp.tls = true
    settings.smtp.authMethod = 'PLAIN'

    settings.meta.senderName = 'Dou-lhe Tres Assessoria'
    settings.meta.senderAddress = 'atendimento@doulhetres.com.br'

    app.save(settings)
  },
  (app) => {},
)
