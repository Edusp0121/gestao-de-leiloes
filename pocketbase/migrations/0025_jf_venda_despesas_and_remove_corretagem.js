// Corrige a separação receitas × despesas na categoria Venda para a
// oportunidade "Jardim do Forte":
//
// 1. Atualiza `custos_estimados_planilha` para incluir os itens de DESPESA da
//    categoria Venda (Corretagem + Lucro Imobiliário + Saldo Devedor),
//    somando 2.834,28 aos 56.719,00 já existentes (Aquisição + Tributos +
//    Desocupação + Mensais), de modo que o total estimado bata com o total
//    real dos lançamentos (59.553,28).
//
//    Os itens de RECEITA da categoria Venda (Venda, Locação) NÃO entram no
//    `custos_estimados_planilha`, pois não são despesas.
//
// 2. Remove o lançamento indevido de R$ 11.700,00 com descrição "Corretagem"
//    na categoria Venda do Jardim do Forte, gerado automaticamente e que não
//    deveria estar lá.
migrate(
  (app) => {
    // 1. Atualiza custos_estimados_planilha do Jardim do Forte.
    try {
      var jf = app.findFirstRecordByData('oportunidades', 'nome', 'Jardim do Forte')

      // Total atual (somente 4 categorias) = 56.719,00.
      // Total real dos lançamentos (despesas)   = 59.553,28.
      // Despesas da categoria Venda = 59.553,28 - 56.719,00 = 2.834,28.
      var vendaDespesas = 2834.28

      jf.set(
        'custos_estimados_planilha',
        JSON.stringify({
          Aquisição: 16698.0,
          Tributos: 10135.0,
          Desocupação: 10626.0,
          Mensais: 19260.0,
          Venda: vendaDespesas,
        }),
      )
      app.save(jf)
    } catch (err) {
      console.log('0025: Jardim do Forte não encontrado — ', err)
    }

    // 2. Remove o lançamento indevido de R$ 11.700,00 (Corretagem) na
    //    categoria Venda do Jardim do Forte.
    try {
      var jf2 = app.findFirstRecordByData('oportunidades', 'nome', 'Jardim do Forte')
      var jfId = jf2.id

      var corretagemLancamentos = app.findRecordsByFilter(
        'lancamentos',
        'oportunidade = {:oppId} && valor = 11700 && descricao ~ "Corretagem"',
        '-created',
        100,
        0,
        { oppId: jfId },
      )

      corretagemLancamentos.forEach(function (record) {
        app.delete(record)
      })

      console.log(
        '0025: removidos ' + corretagemLancamentos.length + ' lançamento(s) de Corretagem 11.700',
      )
    } catch (err) {
      console.log('0025: erro ao remover lançamento de Corretagem — ', err)
    }
  },
  (app) => {
    // Reverte: volta custos_estimados_planilha ao estado da migração 0024
    // (sem a categoria Venda). O lançamento removido não é recriado.
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
    } catch (_) {}
  },
)
