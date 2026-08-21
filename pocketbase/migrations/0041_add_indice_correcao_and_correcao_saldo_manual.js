migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('oportunidades')
    if (!col.fields.getByName('indice_correcao')) {
      col.fields.add(
        new SelectField({
          name: 'indice_correcao',
          values: ['IPCA', 'TR', 'IGPM', 'INPC', 'Manual'],
          maxSelect: 1,
        }),
      )
    }
    if (!col.fields.getByName('correcao_saldo_manual')) {
      col.fields.add(
        new NumberField({
          name: 'correcao_saldo_manual',
        }),
      )
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('oportunidades')
    if (col.fields.getByName('indice_correcao')) {
      col.fields.removeByName('indice_correcao')
    }
    if (col.fields.getByName('correcao_saldo_manual')) {
      col.fields.removeByName('correcao_saldo_manual')
    }
    app.save(col)
  },
)
