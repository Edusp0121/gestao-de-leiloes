// 0035 — Corrige o bug de múltiplos participantes/observadores.
//
// SINTOMA: ao adicionar um segundo participante (ex. Clayton) a uma
// oportunidade que já tinha outro (ex. Eduardo), o Eduardo "sumia". O
// PATCH retornava 200 mas só guardava o primeiro ID do array enviado
// pelo frontend.
//
// CAUSA: os campos `participantes` e `observadores` da coleção
// `oportunidades` acabaram como relação simples (maxSelect = 1) no banco
// live — embora as migrações 0026/0031 tenham pedido maxSelect: 0. Com
// maxSelect = 1 o PocketBase só persiste 1 ID por campo, descartando os
// demais. Dados reais confirmam: ambos os campos guardam strings únicas,
// nunca arrays.
//
// CORREÇÃO: recriar `participantes` e `observadores` como relação
// multi-valor (maxSelect: 0, sem limite), preservando os IDs já
// armazenados (convertidos em array de 1 elemento). O frontend já envia
// arrays corretamente — a correção é exclusivamente no banco.
//
// Nota: maxSelect é metadado do schema do PocketBase, não uma constraint
// de coluna — raw SQL nas tabelas de dados não o altera. A correção vai
// pela API de coleção (new RelationField + app.save), conforme exigido
// pelas convenções do Skip Cloud. app.db().newQuery é usado apenas para
// preservar/normalizar os dados existentes durante a recriação.
migrate(
  (app) => {
    const opCol = app.findCollectionByNameOrId('oportunidades')

    // ---- 1. Backup dos IDs atuais (antes de recriar os campos) ----
    // Os campos estão como relação simples, então get() devolve string
    // (ou vazio). Guardamos tudo em memória para re-semear depois.
    const backups = []
    let existingOps = []
    try {
      existingOps = app.findRecordsByFilter('oportunidades', '', '-created', 0, 0)
    } catch (_) {
      existingOps = []
    }
    for (const op of existingOps) {
      const part = op.get('participantes')
      const obs = op.get('observadores')
      backups.push({
        id: op.id,
        // normaliza string|array|vazio -> array de IDs
        participantes: toIdArray(part),
        observadores: toIdArray(obs),
      })
    }

    // ---- 2. Recria `participantes` como multi-relação (maxSelect: 0) ----
    opCol.fields.removeByName('participantes')
    opCol.fields.add(
      new RelationField({
        name: 'participantes',
        collectionId: '_pb_users_auth_',
        maxSelect: 0, // múltipla seleção (sem limite)
        cascadeDelete: false,
      }),
    )

    // ---- 3. Recria `observadores` como multi-relação (maxSelect: 0) ----
    opCol.fields.removeByName('observadores')
    opCol.fields.add(
      new RelationField({
        name: 'observadores',
        collectionId: '_pb_users_auth_',
        maxSelect: 0, // múltipla seleção (sem limite)
        cascadeDelete: false,
      }),
    )

    // As API rules de oportunidades (0026/0031) continuam válidas e
    // referenciam participantes/observadores — como os campos já existem
    // novamente no momento do save, a validação não falha.
    app.save(opCol)

    // ---- 4. Re-semeia os IDs preservados (agora como arrays) ----
    for (const b of backups) {
      try {
        const rec = app.findFirstRecordByData('oportunidades', 'id', b.id)
        if (b.participantes.length > 0) {
          rec.set('participantes', b.participantes)
        }
        if (b.observadores.length > 0) {
          rec.set('observadores', b.observadores)
        }
        app.save(rec)
      } catch (_) {
        // registro não encontrado — ignora
      }
    }

    // helper interno: normaliza o valor lido de um campo de relação
    // (string para maxSelect=1, array para maxSelect>1, ou vazio) em um
    // array de IDs não-vazio.
    function toIdArray(v) {
      if (v === null || v === undefined || v === '') return []
      if (Array.isArray(v)) {
        return v.filter((x) => x !== null && x !== undefined && x !== '')
      }
      return [v]
    }
  },
  (app) => {
    // Reverte: volta participantes/observadores para relação simples
    // (maxSelect = 1), preservando apenas o primeiro ID de cada array.
    const opCol = app.findCollectionByNameOrId('oportunidades')

    const backups = []
    let existingOps = []
    try {
      existingOps = app.findRecordsByFilter('oportunidades', '', '-created', 0, 0)
    } catch (_) {
      existingOps = []
    }
    for (const op of existingOps) {
      backups.push({
        id: op.id,
        participantes: firstId(op.get('participantes')),
        observadores: firstId(op.get('observadores')),
      })
    }

    const oldPart = opCol.fields.getByName('participantes')
    if (oldPart) {
      opCol.fields.remove(oldPart)
    }
    opCol.fields.add(
      new RelationField({
        name: 'participantes',
        collectionId: '_pb_users_auth_',
        maxSelect: 1,
        cascadeDelete: false,
      }),
    )

    const oldObs = opCol.fields.getByName('observadores')
    if (oldObs) {
      opCol.fields.remove(oldObs)
    }
    opCol.fields.add(
      new RelationField({
        name: 'observadores',
        collectionId: '_pb_users_auth_',
        maxSelect: 1,
        cascadeDelete: false,
      }),
    )

    app.save(opCol)

    for (const b of backups) {
      try {
        const rec = app.findFirstRecordByData('oportunidades', 'id', b.id)
        if (b.participantes) {
          rec.set('participantes', b.participantes)
        }
        if (b.observadores) {
          rec.set('observadores', b.observadores)
        }
        app.save(rec)
      } catch (_) {
        // ignora
      }
    }

    function firstId(v) {
      if (!v) return ''
      if (Array.isArray(v)) {
        return v.length > 0 ? v[0] : ''
      }
      return v
    }
  },
)
