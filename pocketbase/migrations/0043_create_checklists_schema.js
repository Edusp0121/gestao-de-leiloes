// 0043_create_checklists_schema.js
// Criação da coleção `checklists` para o Checklist Pós-Arrematação vinculado individualmente a cada oportunidade.

migrate(
  (app) => {
    const oportunidadesCol = app.findCollectionByNameOrId('oportunidades')

    const checklists = new Collection({
      name: 'checklists',
      type: 'base',
      // Permissões alinhadas com a oportunidade relacionada:
      // list/view: criador OU participante OU observador OU admin
      listRule:
        "@request.auth.id != '' && (oportunidade.usuario = @request.auth.id || oportunidade.participantes = @request.auth.id || oportunidade.observadores = @request.auth.id || @request.auth.admin = true)",
      viewRule:
        "@request.auth.id != '' && (oportunidade.usuario = @request.auth.id || oportunidade.participantes = @request.auth.id || oportunidade.observadores = @request.auth.id || @request.auth.admin = true)",
      // create: criador da oportunidade OU participante OU admin (observadores não criam)
      createRule:
        "@request.auth.id != '' && (oportunidade.usuario = @request.auth.id || oportunidade.participantes = @request.auth.id || @request.auth.admin = true)",
      // update: criador da oportunidade OU participante OU admin
      updateRule:
        "@request.auth.id != '' && (oportunidade.usuario = @request.auth.id || oportunidade.participantes = @request.auth.id || @request.auth.admin = true)",
      // delete: criador da oportunidade OU admin
      deleteRule:
        "@request.auth.id != '' && (oportunidade.usuario = @request.auth.id || @request.auth.admin = true)",
      fields: [
        {
          name: 'oportunidade',
          type: 'relation',
          required: true,
          collectionId: oportunidadesCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        // 22 itens do tipo DATA (nullable, sem valor padrão)
        { name: 'data_arremate', type: 'date' },
        { name: 'data_pagamento_lance', type: 'date' },
        { name: 'data_pagamento_leiloeiro', type: 'date' },
        { name: 'data_auto_arrematacao', type: 'date' },
        { name: 'data_carta_arrematacao', type: 'date' },
        { name: 'data_pagamento_itbi', type: 'date' },
        { name: 'data_pagamento_escritura', type: 'date' },
        { name: 'data_pagamento_registro_averbacao', type: 'date' },
        { name: 'data_alteracao_dados_prefeitura', type: 'date' },
        { name: 'data_alteracao_dados_condominio', type: 'date' },
        { name: 'data_inicio_pagamento_condominio', type: 'date' },
        { name: 'data_inicio_pagamento_iptu', type: 'date' },
        { name: 'data_notificacao_ocupante', type: 'date' },
        { name: 'data_contato_ocupante', type: 'date' },
        { name: 'data_processo_imissao_posse', type: 'date' },
        { name: 'data_inicio_reforma', type: 'date' },
        { name: 'data_termino_reforma', type: 'date' },
        { name: 'data_divulgacao_venda', type: 'date' },
        { name: 'data_contrato_compra_venda', type: 'date' },
        { name: 'data_recebimento_sinal', type: 'date' },
        { name: 'data_pagamento_financiamento', type: 'date' },
        { name: 'data_recebimento_saldo', type: 'date' },

        // 2 itens do tipo SIM/NÃO (booleans - NÃO obrigatórios para permitir false)
        { name: 'desocupacao_amigavel', type: 'bool' },
        { name: 'ocupante_interesse_compra', type: 'bool' },

        // Observações gerais opcionais para o checklist
        { name: 'observacoes', type: 'text' },

        // Timestamps padrão
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_checklists_oportunidade ON checklists (oportunidade)'],
    })
    app.save(checklists)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('checklists'))
    } catch (_) {}
  },
)
