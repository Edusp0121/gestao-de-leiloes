// 0037 — Corrige DEFINITIVAMENTE o bug de múltiplos
// participantes/observadores (3ª tentativa, abordagem radicalmente
// diferente das migrações 0035 e 0036).
//
// SINTOMA: ao adicionar um segundo participante (ex. Clayton) a uma
// oportunidade que já tinha outro (ex. Eduardo), o Eduardo "sumia". O
// PATCH retornava 200 mas só guardava o primeiro ID do array enviado
// pelo frontend.
//
// CAUSA RAIZ confirmada no banco LIVE: mesmo após 0035 e 0036 (ambas
// marcadas como "applied"), os campos `participantes` e `observadores`
// da coleção `oportunidades` continuam com maxSelect = 1 (relação
// simples). Com maxSelect = 1 o PocketBase descarta silenciosamente
// todo ID além do primeiro em um PATCH.
//
// POR QUE 0035/0036 FALHARAM: ambas usaram removeByName + recriação do
// campo no mesmo app.save (ou em saves sequenciais). O PocketBase
// aparentemente preserva o metadata antigo do campo quando ele é
// removido e recriado com o mesmo nome nesta seqüência, de modo que o
// maxSelect solicitado nunca chega ao schema persistido.
//
// CORREÇÃO 0037: NÃO remover nem recriar campos. Apenas carregar os
// campos EXISTENTES via getByName e alterar a propriedade `maxSelect`
// de 1 para 0 (multi-relação sem limite), salvando a coleção uma única
// vez. Como nenhum campo é removido, as API rules (que referenciam
// `participantes`/`observadores`) continuam válidas no momento do
// save — nada precisa ser relaxado. Os dados já armazenados (string
// única para maxSelect=1) são automaticamente tratados pelo PocketBase
// como array de 1 elemento quando maxSelect passa a ser > 1, então
// nenhuma migração de dados é necessária.
//
// O `down` reverte `maxSelect` de volta para 1 (relação simples),
// usando a mesma técnica de mutação in-place — sem remover/recriar.
migrate(
  (app) => {
    var opCol = app.findCollectionByNameOrId('oportunidades')

    var participantes = opCol.fields.getByName('participantes')
    if (!participantes) {
      throw new Error('Campo "participantes" não encontrado na coleção oportunidades')
    }
    var observadores = opCol.fields.getByName('observadores')
    if (!observadores) {
      throw new Error('Campo "observadores" não encontrado na coleção oportunidades')
    }

    // Altera APENAS a propriedade maxSelect nos campos existentes.
    // 0 = multi-relação sem limite (múltipla seleção).
    participantes.maxSelect = 0
    observadores.maxSelect = 0

    // Único save — sem remoções, sem recriações, sem relaxar regras.
    app.save(opCol)
  },
  (app) => {
    var opCol = app.findCollectionByNameOrId('oportunidades')

    var participantes = opCol.fields.getByName('participantes')
    var observadores = opCol.fields.getByName('observadores')

    // Reverte para relação simples (maxSelect = 1).
    if (participantes) {
      participantes.maxSelect = 1
    }
    if (observadores) {
      observadores.maxSelect = 1
    }

    app.save(opCol)
  },
)
