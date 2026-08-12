migrate(
  (app) => {
    try {
      var allLancamentos = app.findRecordsByFilter('lancamentos', "id != ''", '-created', 0, 0)

      var descToCategory = {
        // Aquisição
        sinal: 'Aquisição',
        leiloeiro: 'Aquisição',
        'taxa de serviço': 'Aquisição',
        'taxa de servico': 'Aquisição',
        // Tributos
        itbi: 'Tributos',
        escritura: 'Tributos',
        registro: 'Tributos',
        'averbação af': 'Tributos',
        'averbacao af': 'Tributos',
        averbação: 'Tributos',
        averbacao: 'Tributos',
        emolumentos: 'Tributos',
        // Desocupação
        acordo: 'Desocupação',
        reforma: 'Desocupação',
        honorários: 'Desocupação',
        honorarios: 'Desocupação',
        custas: 'Desocupação',
        // Mensais
        prestação: 'Mensais',
        prestacao: 'Mensais',
        condomínio: 'Mensais',
        condominio: 'Mensais',
        iptu: 'Mensais',
        // Venda
        corretagem: 'Venda',
        'lucro imobiliário': 'Venda',
        'lucro imobiliario': 'Venda',
        venda: 'Venda',
        locação: 'Venda',
        locacao: 'Venda',
      }

      allLancamentos.forEach(function (record) {
        var tipo = record.getString('tipo')
        var descricao = (record.getString('descricao') || '').toLowerCase().trim()

        var newCategoria = null

        if (tipo === 'Receita') {
          newCategoria = 'Venda'
        } else if (descToCategory[descricao]) {
          newCategoria = descToCategory[descricao]
        } else if (
          descricao.includes('sinal') ||
          descricao.includes('leiloeiro') ||
          descricao.includes('taxa de serviço') ||
          descricao.includes('taxa de servico')
        ) {
          newCategoria = 'Aquisição'
        } else if (
          descricao.includes('itbi') ||
          descricao.includes('escritura') ||
          descricao.includes('registro') ||
          descricao.includes('averbação') ||
          descricao.includes('averbacao') ||
          descricao.includes('emolumentos')
        ) {
          newCategoria = 'Tributos'
        } else if (
          descricao.includes('acordo') ||
          descricao.includes('reforma') ||
          descricao.includes('honorários') ||
          descricao.includes('honorarios') ||
          descricao.includes('custas')
        ) {
          newCategoria = 'Desocupação'
        } else if (
          descricao.includes('prestação') ||
          descricao.includes('prestacao') ||
          descricao.includes('condomínio') ||
          descricao.includes('condominio') ||
          descricao.includes('iptu')
        ) {
          newCategoria = 'Mensais'
        } else if (
          descricao.includes('corretagem') ||
          descricao.includes('corretor') ||
          descricao.includes('lucro imobiliário') ||
          descricao.includes('lucro imobiliario') ||
          descricao.includes('venda') ||
          descricao.includes('locação') ||
          descricao.includes('locacao')
        ) {
          newCategoria = 'Venda'
        } else {
          newCategoria = 'Aquisição'
        }

        var currentCategoria = record.getString('categoria')
        if (newCategoria && currentCategoria !== newCategoria) {
          record.set('categoria', newCategoria)
          app.save(record)
        }
      })
    } catch (err) {
      console.log('Migration 0017 error: ', err)
    }
  },
  (app) => {},
)
