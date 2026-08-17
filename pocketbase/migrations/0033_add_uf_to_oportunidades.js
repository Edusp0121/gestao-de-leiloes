migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('oportunidades')
    if (!col.fields.getByName('uf')) {
      col.fields.add(new TextField({ name: 'uf' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('oportunidades')
    if (col.fields.getByName('uf')) {
      col.fields.removeByName('uf')
    }
    app.save(col)
  },
)
