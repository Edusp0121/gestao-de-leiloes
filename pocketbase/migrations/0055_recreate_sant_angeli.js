// 0055 — Recriar a oportunidade "Sant Angeli" excluída por engano e seus lançamentos
migrate(
  (app) => {
    // 1. Localizar o usuário Eduardo Passos (edusp0121.ep@gmail.com)
    let eduUser = null
    try {
      eduUser = app.findFirstRecordByData('users', 'email', 'edusp0121.ep@gmail.com')
    } catch (_) {
      try {
        eduUser = app.findAuthRecordByEmail('users', 'edusp0121.ep@gmail.com')
      } catch (_) {}
    }

    if (!eduUser) {
      throw new Error('Usuário Eduardo Passos (edusp0121.ep@gmail.com) não foi encontrado.')
    }

    const eduUserId = eduUser.id

    // 2. Verificar se a oportunidade Sant Angeli já existe
    const oportCol = app.findCollectionByNameOrId('oportunidades')
    let opSantAngeli = null
    try {
      opSantAngeli = app.findFirstRecordByData('oportunidades', 'nome', 'Sant Angeli')
    } catch (_) {}

    if (!opSantAngeli) {
      opSantAngeli = new Record(oportCol)
      // Tentar manter o ID antigo se possível ou gerar novo
      try {
        opSantAngeli.set('id', 'wiabmkqe31nfvc7')
      } catch (_) {}

      opSantAngeli.set('usuario', eduUserId)
      opSantAngeli.set('nome', 'Sant Angeli')
      opSantAngeli.set('endereco', 'Sant Angeli')
      opSantAngeli.set('tipo_leilao', 'Extrajudicial')
      opSantAngeli.set('status', 'Em andamento')
      opSantAngeli.set('data_aquisicao', '2026-01-01 00:00:00.000Z')
      opSantAngeli.set('participantes', [eduUserId])
      opSantAngeli.set('observadores', [])

      // Deixar campos financeiros/estimados zerados/vazios para preenchimento na tela
      opSantAngeli.set('valor_arrematacao', 0)
      opSantAngeli.set('valor_mercado', 0)
      opSantAngeli.set('desagio_venda', 0)
      opSantAngeli.set('tempo_estimado_venda_meses', 0)
      opSantAngeli.set('indice_correcao_medio_mensal', 0)
      opSantAngeli.set('itbi_percent', 0)
      opSantAngeli.set('comissao_leiloeiro_percent', 0)
      opSantAngeli.set('comissao_corretor_percent', 0)
      opSantAngeli.set('escritura', 0)
      opSantAngeli.set('registro', 0)
      opSantAngeli.set('averbacao', 0)
      opSantAngeli.set('reforma_prevista', 0)
      opSantAngeli.set('assessoria_juridica', 0)
      opSantAngeli.set('condominio_iptu_mensal', 0)
      opSantAngeli.set('valor_parcela_mensal', 0)
      opSantAngeli.set('saldo_devedor', 0)
      opSantAngeli.set('parcelas_pagas', 0)
      opSantAngeli.set('capital_necessario', 0)
      opSantAngeli.set('ganho_capital_base', 0)
      opSantAngeli.set('ir_percent', 0)
      opSantAngeli.set('ir_valor', 0)
      opSantAngeli.set('valor_venda_com_desconto', 0)
      opSantAngeli.set('maior_lucro_esperado', 0)
      opSantAngeli.set('retorno_estimado', 0)
      opSantAngeli.set('roi_esperado_periodo', 0)
      opSantAngeli.set('roi_esperado_anualizado', 0)
      opSantAngeli.set('lance_teto', 0)
      opSantAngeli.set('prazo_financiamento', 0)
      opSantAngeli.set('percentual_entrada', 0)
      opSantAngeli.set('taxa_avaliacao', 0)
      opSantAngeli.set('taxas_judiciais', 0)
      opSantAngeli.set('acordo_desocupacao', 0)
      opSantAngeli.set('baixa_gravames', 0)
      opSantAngeli.set('foro', 0)
      opSantAngeli.set('valor_prefeitura_venal', 0)
      opSantAngeli.set('dividas_condominio', 0)
      opSantAngeli.set('dividas_iptu', 0)
      opSantAngeli.set('correcao_saldo_manual', 0)
      opSantAngeli.set('valor_venda_real', null)

      app.save(opSantAngeli)
    }

    const opId = opSantAngeli.id
    const currentYear = new Date().getFullYear()

    // 3. Criar os dois lançamentos recuperáveis pagos por Eduardo Passos
    const lancCol = app.findCollectionByNameOrId('lancamentos')

    // Lançamento 1: "Reforma" — R$ 500,00 — data 31/08 do ano corrente
    const dataReforma = currentYear + '-08-31 00:00:00.000Z'
    let l1Existe = false
    try {
      const existing = app.findRecordsByFilter(
        'lancamentos',
        'oportunidade = {:op} && descricao = "Reforma" && valor = 500',
        '',
        1,
        0,
        { op: opId },
      )
      if (existing && existing.length > 0) l1Existe = true
    } catch (_) {}

    if (!l1Existe) {
      const l1 = new Record(lancCol)
      try {
        l1.set('id', 'ys8kcklqpu0wol1')
      } catch (_) {}
      l1.set('usuario', eduUserId)
      l1.set('oportunidade', opId)
      l1.set('tipo', 'Despesa')
      l1.set('descricao', 'Reforma')
      l1.set('valor', 500)
      l1.set('data', dataReforma)
      l1.set('categoria', 'Desocupação')
      l1.set('quem_pagou', 'E')
      app.save(l1)
    }

    // Lançamento 2: "Custas" — R$ 200,00 — data 01/09 do ano corrente
    const dataCustas = currentYear + '-09-01 00:00:00.000Z'
    let l2Existe = false
    try {
      const existing = app.findRecordsByFilter(
        'lancamentos',
        'oportunidade = {:op} && descricao = "Custas" && valor = 200',
        '',
        1,
        0,
        { op: opId },
      )
      if (existing && existing.length > 0) l2Existe = true
    } catch (_) {}

    if (!l2Existe) {
      const l2 = new Record(lancCol)
      try {
        l2.set('id', 'r2gbh7pk4jewc44')
      } catch (_) {}
      l2.set('usuario', eduUserId)
      l2.set('oportunidade', opId)
      l2.set('tipo', 'Despesa')
      l2.set('descricao', 'Custas')
      l2.set('valor', 200)
      l2.set('data', dataCustas)
      l2.set('categoria', 'Desocupação')
      l2.set('quem_pagou', 'E')
      app.save(l2)
    }
  },
  (app) => {
    try {
      const op = app.findFirstRecordByData('oportunidades', 'nome', 'Sant Angeli')
      if (op) {
        app.delete(op)
      }
    } catch (_) {}
  },
)
