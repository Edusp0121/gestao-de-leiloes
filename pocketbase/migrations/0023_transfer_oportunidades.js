/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const OLD_USER = 'a3czep32xcv5rj0'
    const NEW_USER = 'vgjnrosut5cv1s0'

    // 1. Localiza as duas oportunidades pelo nome.
    let oportunidades = []
    try {
      oportunidades = app.findRecordsByFilter(
        'oportunidades',
        "nome = 'Cachoeirinha' || nome = 'Jardim do Forte'",
        '',
        0,
        0,
      )
    } catch (_) {
      console.log('0023: nenhuma oportunidade encontrada')
      return
    }

    if (oportunidades.length === 0) {
      console.log('0023: nenhuma oportunidade encontrada')
      return
    }

    // 2. Atualiza o owner (usuario) das oportunidades para o novo usuário.
    for (const opp of oportunidades) {
      if (opp.getString('usuario') !== OLD_USER) {
        continue
      }
      opp.set('usuario', NEW_USER)
      app.save(opp)
    }

    // 3. Transfere os lançamentos associados a essas oportunidades
    //    que ainda pertençam ao usuário antigo.
    for (const opp of oportunidades) {
      const oppId = opp.id
      let lancamentos = []
      try {
        lancamentos = app.findRecordsByFilter(
          'lancamentos',
          'oportunidade = {:oppId} && usuario = {:oldUser}',
          '',
          0,
          0,
          { oppId: oppId, oldUser: OLD_USER },
        )
      } catch (_) {
        continue
      }

      for (const lan of lancamentos) {
        lan.set('usuario', NEW_USER)
        app.save(lan)
      }
    }

    console.log(
      '0023: transferência concluída — ' +
        oportunidades.length +
        ' oportunidade(s) para ' +
        NEW_USER,
    )
  },
  (app) => {
    const OLD_USER = 'a3czep32xcv5rj0'
    const NEW_USER = 'vgjnrosut5cv1s0'

    let oportunidades = []
    try {
      oportunidades = app.findRecordsByFilter(
        'oportunidades',
        "nome = 'Cachoeirinha' || nome = 'Jardim do Forte'",
        '',
        0,
        0,
      )
    } catch (_) {
      return
    }

    for (const opp of oportunidades) {
      if (opp.getString('usuario') !== NEW_USER) {
        continue
      }
      opp.set('usuario', OLD_USER)
      app.save(opp)
    }

    for (const opp of oportunidades) {
      const oppId = opp.id
      let lancamentos = []
      try {
        lancamentos = app.findRecordsByFilter(
          'lancamentos',
          'oportunidade = {:oppId} && usuario = {:newUser}',
          '',
          0,
          0,
          { oppId: oppId, newUser: NEW_USER },
        )
      } catch (_) {
        continue
      }

      for (const lan of lancamentos) {
        lan.set('usuario', OLD_USER)
        app.save(lan)
      }
    }
  },
)
