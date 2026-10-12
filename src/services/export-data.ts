import pb from '@/lib/pocketbase/client'

export interface ExportProgress {
  collection: string
  label: string
  status: 'pending' | 'loading' | 'done' | 'error'
  count?: number
  error?: string
}

export interface ExportResultItem {
  filename: string
  count: number
}

export const EXPORT_COLLECTIONS_CONFIG = [
  {
    collection: 'oportunidades',
    filename: 'oportunidades.json',
    label: 'Oportunidades (Imóveis/Leilões)',
  },
  {
    collection: 'lancamentos',
    filename: 'lancamentos.json',
    label: 'Lançamentos (Financeiro)',
  },
  {
    collection: 'checklists',
    filename: 'checklists.json',
    label: 'Checklists (Pós-Arrematação)',
  },
  {
    collection: 'fechamentos',
    filename: 'fechamentos.json',
    label: 'Fechamentos (Relatórios Finais)',
  },
  {
    collection: 'fechamento_lancamentos',
    filename: 'fechamento_lancamentos.json',
    label: 'Fechamento Lançamentos',
  },
] as const

/**
 * Busca todos os registros de uma coleção de forma paginada para garantir que
 * mesmo coleções grandes (como `lancamentos` com centenas de registros) venham completas.
 */
export async function fetchAllRecordsFromCollection(
  collectionName: string,
  batchSize = 200,
): Promise<Record<string, unknown>[]> {
  const allRecords: Record<string, unknown>[] = []
  let page = 1

  while (true) {
    const res = await pb
      .collection(collectionName)
      .getList<Record<string, unknown>>(page, batchSize, {
        sort: '-created',
        requestKey: null, // Evita cancelamento de requisições paralelas
      })

    if (Array.isArray(res.items)) {
      allRecords.push(...res.items)
    }

    if (page >= res.totalPages || res.items.length === 0) {
      break
    }
    page++
  }

  return allRecords
}

/**
 * Dispara o download de um arquivo JSON no navegador a partir de uma string formatada.
 */
export function downloadJsonFile(filename: string, data: unknown): void {
  const jsonString = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Executa a exportação completa das 5 coleções definidas e baixa os 5 arquivos JSON.
 */
export async function exportAllDataBackup(
  onProgress?: (progressMap: Record<string, ExportProgress>) => void,
): Promise<ExportResultItem[]> {
  const progressMap: Record<string, ExportProgress> = {}

  for (const item of EXPORT_COLLECTIONS_CONFIG) {
    progressMap[item.collection] = {
      collection: item.collection,
      label: item.label,
      status: 'pending',
    }
  }
  onProgress?.({ ...progressMap })

  const results: ExportResultItem[] = []

  for (const item of EXPORT_COLLECTIONS_CONFIG) {
    progressMap[item.collection] = {
      ...progressMap[item.collection],
      status: 'loading',
    }
    onProgress?.({ ...progressMap })

    try {
      const records = await fetchAllRecordsFromCollection(item.collection)
      downloadJsonFile(item.filename, records)

      progressMap[item.collection] = {
        ...progressMap[item.collection],
        status: 'done',
        count: records.length,
      }
      results.push({
        filename: item.filename,
        count: records.length,
      })
      onProgress?.({ ...progressMap })

      // Pequeno delay entre downloads consecutivos para navegadores não bloquearem múltiplos downloads
      await new Promise((resolve) => setTimeout(resolve, 350))
    } catch (err: any) {
      console.error(`Erro ao exportar coleção ${item.collection}:`, err)
      progressMap[item.collection] = {
        ...progressMap[item.collection],
        status: 'error',
        error: err?.message || 'Falha ao buscar registros',
      }
      onProgress?.({ ...progressMap })
      throw err
    }
  }

  return results
}
