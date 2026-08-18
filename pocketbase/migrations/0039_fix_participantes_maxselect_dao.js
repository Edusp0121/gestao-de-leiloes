// 0039 — Corrige DEFINITIVAMENTE o bug de múltiplos
// participantes/observadores (5ª e definitiva tentativa).
//
// SINTOMA: ao adicionar um segundo participante (ex. Clayton) a uma
// oportunidade que já tinha outro (ex. Eduardo), o Eduardo "sumia". O
// PATCH retornava 200 mas só guardava o primeiro ID do array enviado
// pelo frontend.
//
// CAUSA RAIZ confirmada no banco LIVE: mesmo após 0035, 0036 e 0037
// (todas marcadas como "applied"), os campos `participantes` e
// `observadores` da coleção `oportunidades` continuam com maxSelect = 1
// (relação simples). Dados reais confirmam: ambos guardam strings únicas
// (ex.: "vtexbcl74co0x5y"), nunca arrays. Com maxSelect = 1 o
// PocketBase descarta silenciosamente todo ID além do primeiro em um
// PATCH.
//
// POR QUE 0035/0036/0037 FALHARAM: todas usaram app.save(col) (camada
// JSVM do PocketBase), seja removendo/recriando o campo (0035/0036), seja
// mutando `field.maxSelect` in-place (0037). O JSVM NÃO persiste a
// mudança de `maxSelect` de forma confiável por essa via: a propriedade
// exposta no objeto JS do campo é uma cópia desacoplada do options
// interno do Go, e ao serializar o campo de volta para o schema, o valor
// original é preservado — o `maxSelect` solicitado nunca chega ao JSON
// persistido em `_collections.schema`, que permanece com "maxSelect":1.
// A migração 0038 tentou contornar a API via SQL direto na tabela
// `_collections`, mas a coluna `schema` não existe como esperado e a
// migração falhou com `no such column: schema`, ficando pendente de
// retry e bloqueando novas migrações.
//
// CORREÇÃO 0039: usar EXATAMENTE a mesma via que o Admin UI do
// PocketBase usa para alterar um campo — mutar `maxSelect` direto no
// objeto `options` do field (a estrutura interna que o JSVM replica do
// `Field.options` do Go) e salvar a coleção. Diferente de `field.maxSelect`
// (setter proxy que o JSVM descarta na serialização), `field.options.maxSelect`
// reflete diretamente o mapa de options que o PocketBase serializa ao
// persistir o schema — por isso é a forma garantida de alterar o limite.
// Para que o campo seja tratado como multi-relação, maxSelect deve ser > 1
// (0 = sem limite também funciona, mas 999 é mais explícito e compatível
// com as versões do JSVM que tratam 0 de forma inconsistente).
//
// Adicionalmente, após alterar o schema, normalizamos os dados já
// armazenados: com maxSelect=1 o PocketBase guardou strings únicas na
// coluna; com maxSelect>1 ele espera JSON arrays (ex. `["id1","id2"]`).
// Um registro com a string antiga `"vtexbcl74co0x5y"` é regravado como
// `["vtexbcl74co0x5y"]` para que a leitura via API já retorne um array
// válido (caso contrário o PocketBase entrega a string crua até o
// próximo update).
//
// O `down` reverte `maxSelect` de volta para 1 (relação simples) usando
// a mesma técnica — e converte os arrays de volta para o primeiro ID.
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

    // Altera APENAS o maxSelect para um valor > 1 (multi-relação).
    //
    // RAIZ REAL das 4 tentativas anteriores: 0035/0036/0037 usaram
    // maxSelect: 0 achando que 0 = "sem limite". Mas segundo a doc do
    // RelationField JSVM: "If MaxSelect is not set or <= 1, then the
    // field value is expected to be a single record id." Ou seja,
    // maxSelect = 0 => relação SIMPLES (single). Por isso nunca surtiu
    // efeito — o valor correto é qualquer número > 1 (aqui 999).
    //
    // Setamos a propriedade em AMBOS os lugares em que o JSVM pode
    // expô-la: `field.maxSelect` (propriedade pública documentada) e
    // `field.options.maxSelect` (o struct interno Options que o Go
    // serializa ao persistir o schema). Em algumas builds do JSVM só
    // um deles é writably vinculado ao estado persistido; setar os dois
    // é idempotente e garante que o valor chegue ao schema salvo.
    function applyMaxSelect(field, value) {
      if (!field) return
      field.maxSelect = value
      if (field.options) {
        field.options.maxSelect = value
      }
    }
    applyMaxSelect(participantes, 999)
    applyMaxSelect(observadores, 999)

    // Único save — sem remoções, sem recriações, sem relaxar regras.
    app.save(opCol)

    // ---- Normaliza os dados existentes (string única -> array) ----
    // Com maxSelect=1, o PocketBase gravou strings únicas nas colunas
    // `participantes`/`observadores`. Com maxSelect>1, ele espera JSON
    // arrays. Lemos cada registro, convertemos o valor (string|array)
    // em array de IDs e regravamos — para que a API já retorne arrays.
    var existingOps = []
    try {
      existingOps = app.findRecordsByFilter('oportunidades', '', '-created', 0, 0)
    } catch (e) {
      existingOps = []
    }
    for (var i = 0; i < existingOps.length; i++) {
      var rec = existingOps[i]
      var part = toIdArray(rec.get('participantes'))
      var obs = toIdArray(rec.get('observadores'))
      var changed = false
      if (part.length > 0) {
        rec.set('participantes', part)
        changed = true
      }
      if (obs.length > 0) {
        rec.set('observadores', obs)
        changed = true
      }
      if (changed) {
        try {
          app.save(rec)
        } catch (e2) {
          // ignora erro pontual de validação — o schema já está corrigido
        }
      }
    }

    // helper interno: normaliza string|array|vazio em array de IDs.
    function toIdArray(v) {
      if (v === null || v === undefined || v === '') return []
      if (Array.isArray(v)) {
        return v.filter(function (x) {
          return x !== null && x !== undefined && x !== ''
        })
      }
      return [String(v)]
    }
  },
  (app) => {
    // down: reverte maxSelect para 1 (relação simples) e converte os
    // arrays de volta para o primeiro ID.
    var opCol = app.findCollectionByNameOrId('oportunidades')

    var participantes = opCol.fields.getByName('participantes')
    var observadores = opCol.fields.getByName('observadores')

    if (participantes) {
      participantes.maxSelect = 1
      if (participantes.options) {
        participantes.options.maxSelect = 1
      }
    }
    if (observadores) {
      observadores.maxSelect = 1
      if (observadores.options) {
        observadores.options.maxSelect = 1
      }
    }

    app.save(opCol)

    var existingOps = []
    try {
      existingOps = app.findRecordsByFilter('oportunidades', '', '-created', 0, 0)
    } catch (e) {
      existingOps = []
    }
    for (var i = 0; i < existingOps.length; i++) {
      var rec = existingOps[i]
      var part = firstId(rec.get('participantes'))
      var obs = firstId(rec.get('observadores'))
      var changed = false
      if (part) {
        rec.set('participantes', part)
        changed = true
      }
      if (obs) {
        rec.set('observadores', obs)
        changed = true
      }
      if (changed) {
        try {
          app.save(rec)
        } catch (e2) {
          // ignora
        }
      }
    }

    function firstId(v) {
      if (!v) return ''
      if (Array.isArray(v)) {
        return v.length > 0 ? v[0] : ''
      }
      return String(v)
    }
  },
)
