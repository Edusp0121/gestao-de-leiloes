// 0053_create_fechamentos_schema.js
// Criação das coleções `fechamentos` e `fechamento_lancamentos` para o Relatório Final Estimado vs Real.

migrate(
  (app) => {
    const oportunidadesCol = app.findCollectionByNameOrId('oportunidades')

    // 1. Coleção `fechamentos`
    const fechamentos = new Collection({
      name: 'fechamentos',
      type: 'base',
      // Permissões: participantes (~) + dono + admin criam/editam/veem; observadores somente leitura; exclusão apenas dono + admin
      listRule:
        "@request.auth.id != '' && (oportunidade.usuario = @request.auth.id || oportunidade.participantes ~ @request.auth.id || oportunidade.observadores ~ @request.auth.id || @request.auth.admin = true)",
      viewRule:
        "@request.auth.id != '' && (oportunidade.usuario = @request.auth.id || oportunidade.participantes ~ @request.auth.id || oportunidade.observadores ~ @request.auth.id || @request.auth.admin = true)",
      createRule:
        "@request.auth.id != '' && (oportunidade.usuario = @request.auth.id || oportunidade.participantes ~ @request.auth.id || @request.auth.admin = true)",
      updateRule:
        "@request.auth.id != '' && (oportunidade.usuario = @request.auth.id || oportunidade.participantes ~ @request.auth.id || @request.auth.admin = true)",
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
        { name: 'data_venda', type: 'date', required: true },
        { name: 'valor_real_negociado', type: 'number', required: true },
        { name: 'desagio', type: 'number' },
        { name: 'custos_reais_categoria', type: 'json' },
        { name: 'observacoes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_fechamentos_oportunidade ON fechamentos (oportunidade)'],
    })
    app.save(fechamentos)

    const fechamentosCol = app.findCollectionByNameOrId('fechamentos')

    // 2. Coleção `fechamento_lancamentos`
    const fechamentoLancamentos = new Collection({
      name: 'fechamento_lancamentos',
      type: 'base',
      // Permissões via oportunidade relacionada:
      // participantes (~) + dono + admin criam/editam/veem; observadores somente leitura; exclusão apenas dono + admin
      listRule:
        "@request.auth.id != '' && (oportunidade.usuario = @request.auth.id || oportunidade.participantes ~ @request.auth.id || oportunidade.observadores ~ @request.auth.id || @request.auth.admin = true)",
      viewRule:
        "@request.auth.id != '' && (oportunidade.usuario = @request.auth.id || oportunidade.participantes ~ @request.auth.id || oportunidade.observadores ~ @request.auth.id || @request.auth.admin = true)",
      createRule:
        "@request.auth.id != '' && (oportunidade.usuario = @request.auth.id || oportunidade.participantes ~ @request.auth.id || @request.auth.admin = true)",
      updateRule:
        "@request.auth.id != '' && (oportunidade.usuario = @request.auth.id || oportunidade.participantes ~ @request.auth.id || @request.auth.admin = true)",
      deleteRule:
        "@request.auth.id != '' && (oportunidade.usuario = @request.auth.id || @request.auth.admin = true)",
      fields: [
        {
          name: 'fechamento',
          type: 'relation',
          required: true,
          collectionId: fechamentosCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'oportunidade',
          type: 'relation',
          required: true,
          collectionId: oportunidadesCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'data', type: 'date', required: true },
        { name: 'descricao', type: 'text', required: true },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: [
            'entrada',
            'parcela',
            'financiamento',
            'lance',
            'leiloeiro',
            'ITBI',
            'escritura',
            'registro',
            'contato ocupante',
            'desocupacao',
            'reforma',
            'venda',
            'outro',
          ],
          maxSelect: 1,
        },
        { name: 'valor', type: 'number', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_fechamento_lanc_fechamento ON fechamento_lancamentos (fechamento)',
        'CREATE INDEX idx_fechamento_lanc_oportunidade ON fechamento_lancamentos (oportunidade)',
      ],
    })
    app.save(fechamentoLancamentos)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('fechamento_lancamentos'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('fechamentos'))
    } catch (_) {}
  },
)
