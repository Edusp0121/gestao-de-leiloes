// 0046_add_imissao_posse_to_checklists.js
// Adiciona o campo `data_imissao_posse` na coleção `checklists` como data efetiva da imissão na posse.

migrate(
  (app) => {
    const checklistsCol = app.findCollectionByNameOrId('checklists')
    if (!checklistsCol.fields.getByName('data_imissao_posse')) {
      checklistsCol.fields.add(
        new DateField({
          name: 'data_imissao_posse',
          required: false,
        }),
      )
      app.save(checklistsCol)
    }
  },
  (app) => {
    try {
      const checklistsCol = app.findCollectionByNameOrId('checklists')
      const field = checklistsCol.fields.getByName('data_imissao_posse')
      if (field) {
        checklistsCol.fields.removeByName('data_imissao_posse')
        app.save(checklistsCol)
      }
    } catch (_) {}
  },
)
