migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('oportunidades')

    if (!col.fields.getByName('taxa_servico')) {
      col.fields.add(new NumberField({ name: 'taxa_servico' }))
    }
    if (!col.fields.getByName('emolumentos')) {
      col.fields.add(new NumberField({ name: 'emolumentos' }))
    }

    app.save(col)

    // Backfill existing records so the new optional fields default to 0
    try {
      const records = app.findRecordsByFilter('oportunidades', '1=1', '', 1000, 0)
      for (const record of records) {
        let changed = false
        if (record.get('taxa_servico') === null || record.get('taxa_servico') === '') {
          record.set('taxa_servico', 0)
          changed = true
        }
        if (record.get('emolumentos') === null || record.get('emolumentos') === '') {
          record.set('emolumentos', 0)
          changed = true
        }
        if (changed) {
          app.saveNoValidate(record)
        }
      }
    } catch (err) {
      console.log('Migration 0020 backfill error: ', err)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('oportunidades')
    col.fields.removeByName('taxa_servico')
    col.fields.removeByName('emolumentos')
    app.save(col)
  },
)
