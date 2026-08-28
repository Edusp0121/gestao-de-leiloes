// checklist_notifications.js
// Hook para disparo de e-mail ao completar 100% dos 22 itens de data do Checklist Pós-Arrematação

onRecordUpdate((e) => {
  const dateFields = [
    'data_arremate',
    'data_pagamento_lance',
    'data_pagamento_leiloeiro',
    'data_auto_arrematacao',
    'data_carta_arrematacao',
    'data_pagamento_itbi',
    'data_pagamento_escritura',
    'data_pagamento_registro_averbacao',
    'data_alteracao_dados_prefeitura',
    'data_alteracao_dados_condominio',
    'data_inicio_pagamento_condominio',
    'data_inicio_pagamento_iptu',
    'data_notificacao_ocupante',
    'data_contato_ocupante',
    'data_processo_imissao_posse',
    'data_inicio_reforma',
    'data_termino_reforma',
    'data_divulgacao_venda',
    'data_contrato_compra_venda',
    'data_recebimento_sinal',
    'data_pagamento_financiamento',
    'data_recebimento_saldo',
  ]

  // Verifica se o e-mail já foi notificado
  const alreadyNotified = e.record.getBool('email_notificado')
  if (alreadyNotified) {
    return e.next()
  }

  // Verifica se todos os 22 campos de data estão preenchidos
  let allFilled = true
  for (let i = 0; i < dateFields.length; i++) {
    const val = e.record.get(dateFields[i])
    if (!val || val === '' || String(val).trim() === '') {
      allFilled = false
      break
    }
  }

  if (!allFilled) {
    return e.next()
  }

  // Se todos os campos estiverem preenchidos e ainda não foi notificado:
  try {
    const oportunidadeId = e.record.getString('oportunidade')
    if (!oportunidadeId) {
      return e.next()
    }

    const opRecord = $app.findRecordById('oportunidades', oportunidadeId)
    const opNome = opRecord.getString('nome') || 'Oportunidade de Leilão'
    const usuarioId = opRecord.getString('usuario')

    if (!usuarioId) {
      return e.next()
    }

    const userRecord = $app.findRecordById('users', usuarioId)
    const userEmail = userRecord.getString('email')
    const userName = userRecord.getString('name') || 'Arrematante'

    if (userEmail) {
      const settings = $app.settings()
      const senderAddress =
        settings.smtp.username || settings.meta.senderAddress || 'atendimento@doulhetres.com.br'
      const senderName = settings.meta.senderName || 'Dou-lhe Tres Assessoria'

      const subject = 'Checklist Pós-Arrematação Concluído: ' + opNome

      const htmlBody =
        '<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ede4d8; border-radius: 8px; overflow: hidden;">' +
        '<div style="background-color: #5c3a21; color: #ffffff; padding: 20px; text-align: center;">' +
        '<h1 style="margin: 0; font-size: 20px;">' +
        senderName +
        '</h1>' +
        '<p style="margin: 5px 0 0; font-size: 14px; opacity: 0.9;">Gestão de Leilões Imobiliários</p>' +
        '</div>' +
        '<div style="padding: 24px; background-color: #ffffff;">' +
        '<h2 style="color: #5c3a21; font-size: 18px; margin-top: 0;">Parabéns, ' +
        userName +
        '!</h2>' +
        '<p>Informamos que todas as <strong>22 etapas</strong> do Checklist Pós-Arrematação da oportunidade <strong>' +
        opNome +
        '</strong> foram concluídas com sucesso!</p>' +
        '<div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 16px; margin: 20px 0;">' +
        '<p style="margin: 0; color: #166534; font-weight: bold;">✔ 100% dos marcos pós-arrematação registrados e finalizados.</p>' +
        '<p style="margin: 8px 0 0; font-size: 13px; color: #166534;">O ciclo completo desde a arrematação, regularização documental, reforma até a venda e recebimento do saldo foi concluído.</p>' +
        '</div>' +
        '<p style="font-size: 14px; color: #666;">Você pode consultar o histórico detalhado, relatórios e exportar o PDF do checklist diretamente na plataforma Gestão de Leilões.</p>' +
        '</div>' +
        '<div style="background-color: #faf6f0; padding: 14px; text-align: center; font-size: 12px; color: #7a6a5a; border-top: 1px solid #ede4d8;">' +
        senderName +
        ' • Atendimento ao Cliente' +
        '</div>' +
        '</div>'

      try {
        const mailClient = $app.newMailClient()
        const message = new MailerMessage({
          from: {
            address: senderAddress,
            name: senderName,
          },
          to: [{ address: userEmail, name: userName }],
          subject: subject,
          html: htmlBody,
        })

        mailClient.send(message)
      } catch (mailErr) {
        console.log('Erro ao enviar e-mail de notificação de checklist:', mailErr)
      }
    }

    // Marca o checklist como notificado
    e.record.set('email_notificado', true)
  } catch (err) {
    console.log('Erro no processamento do hook de checklist:', err)
  }

  return e.next()
}, 'checklists')
