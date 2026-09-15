migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const oportunidades = app.findCollectionByNameOrId('oportunidades')
    const lancamentos = app.findCollectionByNameOrId('lancamentos')

    // Procura oportunidade Gama
    let gama
    try {
      gama = app.findFirstRecordByData('oportunidades', 'nome', 'Gama')
    } catch (_) {
      // Se não encontrar por nome exato, pega a primeira oportunidade com valor_arrematacao > 0
      const ops = app.findRecordsByFilter(
        'oportunidades',
        'valor_arrematacao > 0',
        '-created',
        1,
        0,
      )
      if (ops.length > 0) gama = ops[0]
    }

    if (!gama) return

    const user = app.findFirstRecordByData('_pb_users_auth_', 'email', 'edusp0121@hotmail.com')
    if (!user) return

    // Verifica se já existe um lançamento de Consultoria para o Gama
    const existing = app.findRecordsByFilter(
      'lancamentos',
      `oportunidade = "${gama.id}" && descricao = "Consultoria"`,
      '-created',
      1,
      0,
    )

    if (existing.length === 0) {
      const valorArrematacao = Number(gama.get('valor_arrematacao')) || 0
      const valorConsultoria = Math.round(valorArrematacao * 0.05 * 100) / 100

      const record = new Record(lancamentos)
      record.set('usuario', user.id)
      record.set('oportunidade', gama.id)
      record.set('tipo', 'Despesa')
      record.set('categoria', 'Aquisição')
      record.set('descricao', 'Consultoria')
      record.set('valor', valorConsultoria)
      record.set('data', new Date().toISOString())
      record.set('quem_pagou', 'C')
      app.save(record)
    }
  },
  (app) => {
    try {
      const recs = app.findRecordsByFilter('lancamentos', 'descricao = "Consultoria"', '', 50, 0)
      for (const r of recs) {
        app.delete(r)
      }
    } catch (_) {}
  },
)
