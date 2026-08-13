migrate(
  (app) => {
    // Reverte a migração 0020: remove os campos taxa_servico e emolumentos
    // adicionados à coleção oportunidades.
    const col = app.findCollectionByNameOrId('oportunidades')

    if (col.fields.getByName('taxa_servico')) {
      col.fields.removeByName('taxa_servico')
    }
    if (col.fields.getByName('emolumentos')) {
      col.fields.removeByName('emolumentos')
    }

    app.save(col)
  },
  (app) => {
    // Reaplica os campos caso a migração seja desfeita
    const col = app.findCollectionByNameOrId('oportunidades')

    if (!col.fields.getByName('taxa_servico')) {
      col.fields.add(new NumberField({ name: 'taxa_servico' }))
    }
    if (!col.fields.getByName('emolumentos')) {
      col.fields.add(new NumberField({ name: 'emolumentos' }))
    }

    app.save(col)
  },
)
