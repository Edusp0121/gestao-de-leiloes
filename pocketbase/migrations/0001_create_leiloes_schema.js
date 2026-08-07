migrate(
  (app) => {
    const oportunidades = new Collection({
      name: 'oportunidades',
      type: 'base',
      listRule: "@request.auth.id != '' && usuario = @request.auth.id",
      viewRule: "@request.auth.id != '' && usuario = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && usuario = @request.auth.id",
      deleteRule: "@request.auth.id != '' && usuario = @request.auth.id",
      fields: [
        {
          name: 'usuario',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'nome', type: 'text', required: true },
        { name: 'endereco', type: 'text', required: true },
        {
          name: 'tipo_leilao',
          type: 'select',
          values: ['Judicial', 'Extrajudicial'],
          maxSelect: 1,
        },
        { name: 'banco_selecionado', type: 'text' },
        { name: 'data_aquisicao', type: 'date' },
        {
          name: 'status',
          type: 'select',
          values: ['Em análise', 'Arrematada', 'Em andamento', 'Vendida'],
          maxSelect: 1,
        },
        { name: 'valor_arrematacao', type: 'number' },
        { name: 'valor_mercado', type: 'number' },
        { name: 'desagio_venda', type: 'number' },
        { name: 'tempo_estimado_venda_meses', type: 'number' },
        { name: 'indice_correcao_medio_mensal', type: 'number' },
        { name: 'itbi_percent', type: 'number' },
        { name: 'comissao_leiloeiro_percent', type: 'number' },
        { name: 'comissao_corretor_percent', type: 'number' },
        { name: 'escritura', type: 'number' },
        { name: 'registro', type: 'number' },
        { name: 'averbacao', type: 'number' },
        { name: 'reforma_prevista', type: 'number' },
        { name: 'assessoria_juridica', type: 'number' },
        { name: 'condominio_iptu_mensal', type: 'number' },
        {
          name: 'modalidade_financiamento',
          type: 'select',
          values: ['À Vista', 'SAC', 'PRICE'],
          maxSelect: 1,
        },
        { name: 'banco_responsavel_financiamento', type: 'text' },
        { name: 'taxa_juros_financiamento', type: 'number' },
        { name: 'aliquota_reajuste', type: 'number' },
        { name: 'valor_parcela_mensal', type: 'number' },
        { name: 'saldo_devedor', type: 'number' },
        { name: 'parcelas_pagas', type: 'number' },
        { name: 'capital_necessario', type: 'number' },
        { name: 'ganho_capital_base', type: 'number' },
        { name: 'ir_percent', type: 'number' },
        { name: 'ir_valor', type: 'number' },
        { name: 'valor_venda_com_desconto', type: 'number' },
        { name: 'maior_lucro_esperado', type: 'number' },
        { name: 'retorno_estimado', type: 'number' },
        { name: 'roi_esperado_periodo', type: 'number' },
        { name: 'roi_esperado_anualizado', type: 'number' },
        { name: 'lance_teto', type: 'number' },
        { name: 'relatorio_viabilidade', type: 'file', maxSelect: 1, maxSize: 10485760 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_oportunidades_usuario ON oportunidades (usuario)',
        'CREATE INDEX idx_oportunidades_status ON oportunidades (status)',
      ],
    })
    app.save(oportunidades)

    const oportunidadesCol = app.findCollectionByNameOrId('oportunidades')

    const lancamentos = new Collection({
      name: 'lancamentos',
      type: 'base',
      listRule: "@request.auth.id != '' && usuario = @request.auth.id",
      viewRule: "@request.auth.id != '' && usuario = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && usuario = @request.auth.id",
      deleteRule: "@request.auth.id != '' && usuario = @request.auth.id",
      fields: [
        {
          name: 'usuario',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
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
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: ['Despesa', 'Receita'],
          maxSelect: 1,
        },
        { name: 'descricao', type: 'text', required: true },
        { name: 'valor', type: 'number', required: true },
        { name: 'data', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_lancamentos_usuario ON lancamentos (usuario)',
        'CREATE INDEX idx_lancamentos_oportunidade ON lancamentos (oportunidade)',
        'CREATE INDEX idx_lancamentos_data ON lancamentos (data)',
      ],
    })
    app.save(lancamentos)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('lancamentos'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('oportunidades'))
    } catch (_) {}
  },
)
