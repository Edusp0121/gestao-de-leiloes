migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('oportunidades')
    if (!col.fields.getByName('valor_venda_real')) {
      col.fields.add(new NumberField({ name: 'valor_venda_real' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('oportunidades')
    const f = col.fields.getByName('valor_venda_real')
    if (f) {
      col.fields.remove(f)
      app.save(col)
    }
  },
)
