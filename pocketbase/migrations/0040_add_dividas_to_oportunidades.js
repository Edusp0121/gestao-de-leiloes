migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('oportunidades')
    if (!col.fields.getByName('dividas_condominio')) {
      col.fields.add(new NumberField({ name: 'dividas_condominio' }))
    }
    if (!col.fields.getByName('dividas_iptu')) {
      col.fields.add(new NumberField({ name: 'dividas_iptu' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('oportunidades')
    if (col.fields.getByName('dividas_condominio')) {
      col.fields.removeByName('dividas_condominio')
    }
    if (col.fields.getByName('dividas_iptu')) {
      col.fields.removeByName('dividas_iptu')
    }
    app.save(col)
  },
)
