migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('oportunidades')
    if (!col.fields.getByName('roi_alvo')) {
      col.fields.add(new NumberField({ name: 'roi_alvo' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('oportunidades')
    const f = col.fields.getByName('roi_alvo')
    if (f) {
      col.fields.remove(f)
      app.save(col)
    }
  },
)
