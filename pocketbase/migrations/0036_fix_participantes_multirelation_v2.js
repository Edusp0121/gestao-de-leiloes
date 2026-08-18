// 0036 — Corrige DEFINITIVAMENTE o bug de múltiplos participantes/observadores.
//
// SINTOMA: ao adicionar um segundo participante (ex. Clayton) a uma
// oportunidade que já tinha outro (ex. Eduardo), o Eduardo "sumia". O
// PATCH retornava 200 mas só guardava o primeiro ID do array enviado
// pelo frontend.
//
// CAUSA RAIZ: a migração 0035 está marcada como "applied" mas NÃO surtiu
// efeito no banco live. Os campos `participantes` e `observadores` da
// coleção `oportunidades` continuam como relação simples (maxSelect = 1).
// Dados reais confirmam: ambos guardam strings únicas, nunca arrays.
// Com maxSelect = 1 o PocketBase só persiste 1 ID por campo.
//
// Por que a 0035 falhou? Ela tentou remover e adicionar os campos no
// MESMO save. O PocketBase pode ignorar a troca de maxSelect quando o
// campo é removido e recriado no mesmo save, mantendo o metadata antigo.
//
// CORREÇÃO (0036): abordagem em DUAS etapas separadas de save:
//   1. remove os campos antigos + save (dropa as colunas)
//   2. adiciona os novos campos multi-relação + save (cria colunas novas)
//   3. restaura os IDs preservados como arrays
// O frontend já envia arrays corretamente — a correção é exclusivamente
// no banco.
migrate(
  (app) => {
    var opCol = app.findCollectionByNameOrId('oportunidades')

    // ---- 1. Backup dos dados atuais ----
    var backups = []
    var existingOps = []
    try {
      existingOps = app.findRecordsByFilter('oportunidades', '', '-created', 0, 0)
    } catch (e) {
      existingOps = []
    }
    for (var i = 0; i < existingOps.length; i++) {
      var op = existingOps[i]
      backups.push({
        id: op.id,
        participantes: toIdArray(op.get('participantes')),
        observadores: toIdArray(op.get('observadores')),
      })
    }

    // ---- 2. Relaxa temporariamente as regras ----
    // As regras atuais (0026/0031) referenciam `participantes`/`observadores`.
    // Enquanto esses campos não existirem (entre o 1º e o 2º save) a
    // validação falha com "unknown field". Guardamos as regras originais
    // e as relaxamos para auth-only neste intervalo.
    var savedRules = {
      list: opCol.listRule,
      view: opCol.viewRule,
      create: opCol.createRule,
      update: opCol.updateRule,
      del: opCol.deleteRule,
    }
    opCol.listRule = "@request.auth.id != ''"
    opCol.viewRule = "@request.auth.id != ''"
    opCol.updateRule = "@request.auth.id != ''"

    // ---- 3. Remove os campos antigos e SALVA ----
    // PRIMEIRO save isolado: dropa as colunas participantes/observadores.
    opCol.fields.removeByName('participantes')
    opCol.fields.removeByName('observadores')
    app.save(opCol)

    // ---- 4. Adiciona os novos campos multi-relação e SALVA ----
    // SEGUNDO save isolado: cria colunas novas com maxSelect: 0.
    opCol.fields.add(
      new RelationField({
        name: 'participantes',
        collectionId: '_pb_users_auth_',
        maxSelect: 0,
        cascadeDelete: false,
      }),
    )
    opCol.fields.add(
      new RelationField({
        name: 'observadores',
        collectionId: '_pb_users_auth_',
        maxSelect: 0,
        cascadeDelete: false,
      }),
    )
    // Restaura as regras originais agora que os campos existem novamente.
    opCol.listRule = savedRules.list
    opCol.viewRule = savedRules.view
    opCol.createRule = savedRules.create
    opCol.updateRule = savedRules.update
    opCol.deleteRule = savedRules.del
    app.save(opCol)

    // ---- 5. Restaura dados como arrays ----
    for (var j = 0; j < backups.length; j++) {
      var b = backups[j]
      try {
        var rec = app.findFirstRecordByData('oportunidades', 'id', b.id)
        if (b.participantes.length > 0) {
          rec.set('participantes', b.participantes)
        }
        if (b.observadores.length > 0) {
          rec.set('observadores', b.observadores)
        }
        app.save(rec)
      } catch (e2) {
        // registro não encontrado — ignora
      }
    }

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
    // down: reverte para maxSelect=1, preservando apenas o primeiro ID.
    var opCol = app.findCollectionByNameOrId('oportunidades')

    var backups = []
    var existingOps = []
    try {
      existingOps = app.findRecordsByFilter('oportunidades', '', '-created', 0, 0)
    } catch (e) {
      existingOps = []
    }
    for (var i = 0; i < existingOps.length; i++) {
      var op = existingOps[i]
      var part = op.get('participantes')
      var obs = op.get('observadores')
      backups.push({
        id: op.id,
        participantes: Array.isArray(part) ? part[0] || '' : String(part || ''),
        observadores: Array.isArray(obs) ? obs[0] || '' : String(obs || ''),
      })
    }

    var savedRules2 = {
      list: opCol.listRule,
      view: opCol.viewRule,
      create: opCol.createRule,
      update: opCol.updateRule,
      del: opCol.deleteRule,
    }
    opCol.listRule = "@request.auth.id != ''"
    opCol.viewRule = "@request.auth.id != ''"
    opCol.updateRule = "@request.auth.id != ''"

    opCol.fields.removeByName('participantes')
    opCol.fields.removeByName('observadores')
    app.save(opCol)

    opCol.fields.add(
      new RelationField({
        name: 'participantes',
        collectionId: '_pb_users_auth_',
        maxSelect: 1,
        cascadeDelete: false,
      }),
    )
    opCol.fields.add(
      new RelationField({
        name: 'observadores',
        collectionId: '_pb_users_auth_',
        maxSelect: 1,
        cascadeDelete: false,
      }),
    )
    opCol.listRule = savedRules2.list
    opCol.viewRule = savedRules2.view
    opCol.createRule = savedRules2.create
    opCol.updateRule = savedRules2.update
    opCol.deleteRule = savedRules2.del
    app.save(opCol)

    for (var j = 0; j < backups.length; j++) {
      var b = backups[j]
      try {
        var rec = app.findFirstRecordByData('oportunidades', 'id', b.id)
        if (b.participantes) rec.set('participantes', b.participantes)
        if (b.observadores) rec.set('observadores', b.observadores)
        app.save(rec)
      } catch (e2) {
        // ignora
      }
    }
  },
)
