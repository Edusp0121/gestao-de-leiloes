migrate(
  (app) => {
    try {
      var allLancamentos = app.findRecordsByFilter('lancamentos', "id != ''", '-created', 0, 0)

      allLancamentos.forEach(function (record) {
        var descricao = (record.getString('descricao') || '').toLowerCase().trim()

        if (descricao.includes('saldo devedor')) {
          var currentCategoria = record.getString('categoria')
          if (currentCategoria !== 'Venda') {
            record.set('categoria', 'Venda')
            app.save(record)
          }
        }
      })
    } catch (err) {
      console.log('Migration 0018 error: ', err)
    }
  },
  (app) => {},
)
