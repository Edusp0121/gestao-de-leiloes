migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('oportunidades')

    if (!col.fields.getByName('prazo_financiamento')) {
      col.fields.add(new NumberField({ name: 'prazo_financiamento' }))
    }
    if (!col.fields.getByName('percentual_entrada')) {
      col.fields.add(new NumberField({ name: 'percentual_entrada' }))
    }
    if (!col.fields.getByName('taxa_avaliacao')) {
      col.fields.add(new NumberField({ name: 'taxa_avaliacao' }))
    }
    if (!col.fields.getByName('taxas_judiciais')) {
      col.fields.add(new NumberField({ name: 'taxas_judiciais' }))
    }
    if (!col.fields.getByName('acordo_desocupacao')) {
      col.fields.add(new NumberField({ name: 'acordo_desocupacao' }))
    }
    if (!col.fields.getByName('baixa_gravames')) {
      col.fields.add(new NumberField({ name: 'baixa_gravames' }))
    }
    if (!col.fields.getByName('foro')) {
      col.fields.add(new NumberField({ name: 'foro' }))
    }
    if (!col.fields.getByName('incluir_ir_despesas')) {
      col.fields.add(new BoolField({ name: 'incluir_ir_despesas' }))
    }

    app.save(col)

    try {
      const records = app.findRecordsByFilter('oportunidades', '1=1', '', 1000, 0)
      for (const record of records) {
        if (!record.get('incluir_ir_despesas')) {
          record.set('incluir_ir_despesas', true)
          app.saveNoValidate(record)
        }
      }
    } catch (err) {
      console.log('Migration 0019 seed error: ', err)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('oportunidades')
    col.fields.removeByName('prazo_financiamento')
    col.fields.removeByName('percentual_entrada')
    col.fields.removeByName('taxa_avaliacao')
    col.fields.removeByName('taxas_judiciais')
    col.fields.removeByName('acordo_desocupacao')
    col.fields.removeByName('baixa_gravames')
    col.fields.removeByName('foro')
    col.fields.removeByName('incluir_ir_despesas')
    app.save(col)
  },
)
