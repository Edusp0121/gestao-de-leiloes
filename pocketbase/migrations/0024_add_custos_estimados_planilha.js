// Adiciona o campo JSON `custos_estimados_planilha` à coleção oportunidades,
// usado para armazenar os valores estimados por categoria conforme a planilha
// de viabilidade (Resultado_JF etc.), que servem como fonte autoritativa para
// o gráfico "Estimado vs Real por Categoria".
//
// Quando preenchido, getEstimatedCostsByCategory() utiliza esses valores no
// lugar do cálculo derivado dos campos individuais (que pode divergir da
// planilha quando campos foram migrados/zerados, ex.: percentual_entrada=0
// ou taxa_servico removido).
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('oportunidades')

    if (!col.fields.getByName('custos_estimados_planilha')) {
      col.fields.add(new JSONField({ name: 'custos_estimados_planilha' }))
      app.save(col)
    }

    // Popula o campo para a oportunidade Jardim do Forte com os valores
    // corretos da planilha Resultado_JF.
    try {
      var jf = app.findFirstRecordByData('oportunidades', 'nome', 'Jardim do Forte')
      jf.set(
        'custos_estimados_planilha',
        JSON.stringify({
          Aquisição: 16698.0,
          Tributos: 10135.0,
          Desocupação: 10626.0,
          Mensais: 19260.0,
        }),
      )
      app.save(jf)
    } catch (err) {
      console.log('0024: Jardim do Forte não encontrado — ', err)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('oportunidades')
    var field = col.fields.getByName('custos_estimados_planilha')
    if (field) {
      col.fields.remove(field)
      app.save(col)
    }
  },
)
