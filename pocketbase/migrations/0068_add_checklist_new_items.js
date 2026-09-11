// 0068_add_checklist_new_items.js
// Adiciona os 4 novos campos de data no checklist pós-arrematação:
// - data_quitacao_divida_condominio
// - data_quitacao_divida_iptu
// - data_escritura_lavratura
// - data_matricula_registrada

migrate(
  (app) => {
    const checklistsCol = app.findCollectionByNameOrId('checklists')

    const newDateFields = [
      'data_quitacao_divida_condominio',
      'data_quitacao_divida_iptu',
      'data_escritura_lavratura',
      'data_matricula_registrada',
    ]

    let modified = false
    for (const fieldName of newDateFields) {
      if (!checklistsCol.fields.getByName(fieldName)) {
        checklistsCol.fields.add(
          new DateField({
            name: fieldName,
            required: false,
          }),
        )
        modified = true
      }
    }

    if (modified) {
      app.save(checklistsCol)
    }
  },
  (app) => {
    try {
      const checklistsCol = app.findCollectionByNameOrId('checklists')
      const fieldsToRemove = [
        'data_quitacao_divida_condominio',
        'data_quitacao_divida_iptu',
        'data_escritura_lavratura',
        'data_matricula_registrada',
      ]

      let modified = false
      for (const fieldName of fieldsToRemove) {
        if (checklistsCol.fields.getByName(fieldName)) {
          checklistsCol.fields.removeByName(fieldName)
          modified = true
        }
      }

      if (modified) {
        app.save(checklistsCol)
      }
    } catch (_) {}
  },
)
