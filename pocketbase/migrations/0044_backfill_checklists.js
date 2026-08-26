// 0044_backfill_checklists.js
// Preenchimento retroativo dos checklists a partir dos lançamentos financeiros existentes

migrate(
  (app) => {
    const oportunidadesCol = app.findCollectionByNameOrId('oportunidades')
    const checklistsCol = app.findCollectionByNameOrId('checklists')

    // 1. Busca todas as oportunidades
    let oportunidades = []
    try {
      oportunidades = app.findRecordsByFilter('oportunidades', '', 'created', 0, 0)
    } catch (e) {
      console.log('Erro ao listar oportunidades:', e)
      return
    }

    console.log(`Iniciando backfill para ${oportunidades.length} oportunidades...`)

    for (let i = 0; i < oportunidades.length; i++) {
      const op = oportunidades[i]
      const opId = op.id

      // Busca os lançamentos da oportunidade ordenados cronologicamente
      let lancamentos = []
      try {
        lancamentos = app.findRecordsByFilter(
          'lancamentos',
          `oportunidade = '${opId}'`,
          'data,created',
          0,
          0,
        )
      } catch (e) {
        console.log(`Erro ao buscar lancamentos da oportunidade ${opId}:`, e)
        continue
      }

      // Busca checklist existente para esta oportunidade, se houver
      let checklistRecord = null
      try {
        checklistRecord = app.findFirstRecordByData('checklists', 'oportunidade', opId)
      } catch (_) {
        checklistRecord = null
      }

      // Se não existir, cria novo Record
      const isNew = !checklistRecord
      if (isNew) {
        checklistRecord = new Record(checklistsCol)
        checklistRecord.set('oportunidade', opId)
      }

      let modified = false

      // Percorre os lançamentos da oportunidade ordenados por data
      for (let j = 0; j < lancamentos.length; j++) {
        const l = lancamentos[j]
        const rawDate = l.getString('data')
        if (!rawDate) continue

        // Normaliza data para YYYY-MM-DD
        const dateStr = rawDate.slice(0, 10)
        const tipo = (l.getString('tipo') || 'Despesa').toLowerCase()
        const cat = (l.getString('categoria') || '').toLowerCase().trim()
        const desc = (l.getString('descricao') || '').toLowerCase().trim()

        let targetField = null
        let isReforma = false

        // Receita
        if (tipo === 'receita' || (cat === 'venda' && tipo === 'receita')) {
          if (desc.includes('sinal')) {
            targetField = 'data_recebimento_sinal'
          } else if (desc.includes('saldo')) {
            targetField = 'data_recebimento_saldo'
          }
        }
        // Despesa - Aquisição
        else if (cat.includes('aquisi') || cat.includes('aquisicao') || cat === '') {
          if (desc.includes('sinal')) {
            targetField = 'data_pagamento_lance'
          } else if (desc.includes('leiloeiro')) {
            targetField = 'data_pagamento_leiloeiro'
          }
        }
        // Despesa - Tributos
        else if (cat.includes('tributo')) {
          if (desc.includes('itbi')) {
            targetField = 'data_pagamento_itbi'
          } else if (desc.includes('escritura')) {
            targetField = 'data_pagamento_escritura'
          } else if (
            desc.includes('registro') ||
            desc.includes('averbação') ||
            desc.includes('averbacao') ||
            desc.includes('averbação af') ||
            desc.includes('averbacao af')
          ) {
            targetField = 'data_pagamento_registro_averbacao'
          }
        }
        // Despesa - Desocupação / Reforma
        else if (cat.includes('reforma') || cat.includes('desocupa') || desc.includes('reforma')) {
          if (desc.includes('reforma')) {
            isReforma = true
          }
        }
        // Despesa - Mensais
        else if (cat.includes('mensa')) {
          if (desc.includes('condomínio') || desc.includes('condominio')) {
            targetField = 'data_inicio_pagamento_condominio'
          } else if (desc.includes('iptu')) {
            targetField = 'data_inicio_pagamento_iptu'
          } else if (
            desc.includes('prestação') ||
            desc.includes('prestacao') ||
            desc.includes('financiamento')
          ) {
            targetField = 'data_pagamento_financiamento'
          }
        }

        // Fallbacks por descrição se a categoria não combinou perfeitamente
        if (!targetField && !isReforma) {
          if (desc.includes('itbi')) {
            targetField = 'data_pagamento_itbi'
          } else if (desc.includes('escritura')) {
            targetField = 'data_pagamento_escritura'
          } else if (
            desc.includes('registro') ||
            desc.includes('averbação') ||
            desc.includes('averbacao')
          ) {
            targetField = 'data_pagamento_registro_averbacao'
          } else if (desc.includes('condomínio') || desc.includes('condominio')) {
            targetField = 'data_inicio_pagamento_condominio'
          } else if (desc.includes('iptu')) {
            targetField = 'data_inicio_pagamento_iptu'
          } else if (desc.includes('prestação') || desc.includes('prestacao')) {
            targetField = 'data_pagamento_financiamento'
          } else if (desc.includes('leiloeiro')) {
            targetField = 'data_pagamento_leiloeiro'
          }
        }

        if (isReforma) {
          // Data início reforma: preenche apenas se estiver vazio
          const existingInicio = checklistRecord.getString('data_inicio_reforma')
          if (!existingInicio) {
            checklistRecord.set('data_inicio_reforma', dateStr)
            modified = true
          }
          // Data término reforma: sempre atualiza com o último lançamento de reforma
          const existingTermino = checklistRecord.getString('data_termino_reforma')
          const existingTerminoStr = existingTermino ? existingTermino.slice(0, 10) : ''
          if (!existingTerminoStr || dateStr >= existingTerminoStr) {
            checklistRecord.set('data_termino_reforma', dateStr)
            modified = true
          }
        } else if (targetField) {
          const existingVal = checklistRecord.getString(targetField)
          // Só preenche se o campo no checklist estiver vazio
          if (!existingVal) {
            checklistRecord.set(targetField, dateStr)
            modified = true
          }
        }
      }

      // Se foi criado um novo checklist ou se houve modificações, salva no banco
      if (modified || isNew) {
        try {
          app.save(checklistRecord)
          console.log(
            `Checklist atualizado com sucesso para oportunidade: ${op.getString('nome')} (${opId})`,
          )
        } catch (saveErr) {
          console.log(`Erro ao salvar checklist da oportunidade ${opId}:`, saveErr)
        }
      }
    }
  },
  (app) => {
    // Reversão não é necessária pois são dados incrementais de backfill
  },
)
