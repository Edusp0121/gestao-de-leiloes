migrate(
  (app) => {
    // 1. Atualizar valores permitidos do SelectField 'categoria' na coleção 'lancamentos'
    // Mudando 'Tributos' para 'Encargos'
    const col = app.findCollectionByNameOrId('lancamentos')
    const field = col.fields.getByName('categoria')
    if (field) {
      field.values = ['Aquisição', 'Encargos', 'Desocupação', 'Mensais', 'Venda']
      col.fields.add(field)
      app.save(col)
    }

    // 2. Atualizar todos os registros de lancamentos onde categoria = 'Tributos' para 'Encargos'
    app
      .db()
      .newQuery("UPDATE lancamentos SET categoria = 'Encargos' WHERE categoria = 'Tributos'")
      .execute()

    // 3. Atualizar custos_estimados_planilha nas oportunidades que tiverem a chave 'Tributos'
    app
      .db()
      .newQuery(
        'UPDATE oportunidades SET custos_estimados_planilha = REPLACE(CAST(custos_estimados_planilha AS TEXT), \'"Tributos":\', \'"Encargos":\') WHERE custos_estimados_planilha LIKE \'%"Tributos":%\'',
      )
      .execute()
  },
  (app) => {
    // Reverter lancamentos: categoria 'Encargos' para 'Tributos'
    app
      .db()
      .newQuery("UPDATE lancamentos SET categoria = 'Tributos' WHERE categoria = 'Encargos'")
      .execute()

    // Reverter custos_estimados_planilha
    app
      .db()
      .newQuery(
        'UPDATE oportunidades SET custos_estimados_planilha = REPLACE(CAST(custos_estimados_planilha AS TEXT), \'"Encargos":\', \'"Tributos":\') WHERE custos_estimados_planilha LIKE \'%"Encargos":%\'',
      )
      .execute()

    // Reverter schema
    const col = app.findCollectionByNameOrId('lancamentos')
    const field = col.fields.getByName('categoria')
    if (field) {
      field.values = ['Aquisição', 'Tributos', 'Desocupação', 'Mensais', 'Venda']
      col.fields.add(field)
      app.save(col)
    }
  },
)
