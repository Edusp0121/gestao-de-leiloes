migrate(
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('oportunidades')
      const records = app.findRecordsByFilter('oportunidades', '1=1', '', 100, 0)
      for (const record of records) {
        record.set('modalidade_financiamento', 'PRICE')
        record.set('taxa_juros_financiamento', 8)

        const arrem = record.get('valor_arrematacao') || 101200
        const financed = arrem * 0.9
        const rate = 8 / 100 / 12
        const factor = Math.pow(1 + rate, 120)
        const pmt = Math.round(((financed * (rate * factor)) / (factor - 1)) * 100) / 100
        record.set('valor_parcela_mensal', pmt)

        const paymentsMade = record.get('parcelas_pagas') || 3
        const paidFactor = Math.pow(1 + rate, paymentsMade)
        const saldo = Math.round(((financed * (factor - paidFactor)) / (factor - 1)) * 100) / 100
        record.set('saldo_devedor', saldo)

        app.save(record)
      }
    } catch (err) {
      console.log('Migration 0015 error: ', err)
    }
  },
  (app) => {},
)
