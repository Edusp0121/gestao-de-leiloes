migrate(
  (app) => {
    const lancamentosCol = app.findCollectionByNameOrId('lancamentos')

    if (!lancamentosCol.fields.getByName('categoria')) {
      lancamentosCol.fields.add(
        new SelectField({
          name: 'categoria',
          values: ['Aquisição', 'Tributos', 'Desocupação', 'Mensais', 'Venda'],
          maxSelect: 1,
        }),
      )
      app.save(lancamentosCol)
    }

    try {
      const allLancamentos = app.findRecordsByFilter('lancamentos', "id != ''", '-created', 0, 0)
      allLancamentos.forEach((record) => {
        if (!record.getString('categoria')) {
          var descricao = (record.getString('descricao') || '').toLowerCase()
          var categoria = 'Aquisição'
          var tipo = record.getString('tipo')

          if (tipo === 'Receita') {
            categoria = 'Venda'
          } else if (
            descricao.includes('itbi') ||
            descricao.includes('iptu') ||
            descricao.includes('imposto') ||
            descricao.includes('tributo') ||
            descricao.includes('escritura') ||
            descricao.includes('registro') ||
            descricao.includes('averbacao') ||
            descricao.includes('diversos')
          ) {
            categoria = 'Tributos'
          } else if (descricao.includes('desocupa') || descricao.includes('despejo')) {
            categoria = 'Desocupação'
          } else if (
            descricao.includes('condom') ||
            descricao.includes('mensal') ||
            descricao.includes('manuten') ||
            descricao.includes('reforma') ||
            descricao.includes('juridic') ||
            descricao.includes('advogad') ||
            descricao.includes('assessoria')
          ) {
            categoria = 'Mensais'
          } else if (descricao.includes('corretor') || descricao.includes('venda')) {
            categoria = 'Venda'
          } else if (
            descricao.includes('sinal') ||
            descricao.includes('comiss') ||
            descricao.includes('taxa') ||
            descricao.includes('servico')
          ) {
            categoria = 'Aquisição'
          }

          record.set('categoria', categoria)
          app.save(record)
        }
      })
    } catch (_) {}

    try {
      var allOportunidades = app.findRecordsByFilter('oportunidades', "id != ''", '-created', 0, 0)
      allOportunidades.forEach((record) => {
        var parcelasPagas = record.get('parcelas_pagas') || 0
        var valorParcela = record.get('valor_parcela_mensal') || 0
        var tempoMeses = record.get('tempo_estimado_venda_meses') || 1

        if (parcelasPagas > tempoMeses && valorParcela > 0) {
          var count = Math.round(parcelasPagas / valorParcela)
          record.set('parcelas_pagas', Math.min(Math.max(count, 0), tempoMeses))
          app.save(record)
        }
      })
    } catch (_) {}
  },
  (app) => {
    try {
      var col = app.findCollectionByNameOrId('lancamentos')
      var field = col.fields.getByName('categoria')
      if (field) {
        col.fields.remove(field)
        app.save(col)
      }
    } catch (_) {}
  },
)
