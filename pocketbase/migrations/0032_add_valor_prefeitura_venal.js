migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('oportunidades')
    if (!col.fields.getByName('valor_prefeitura_venal')) {
      col.fields.add(new NumberField({ name: 'valor_prefeitura_venal' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('oportunidades')
    const f = col.fields.getByName('valor_prefeitura_venal')
    if (f) {
      col.fields.remove(f)
      app.save(col)
    }
  },
)
