import { useState } from 'react'
import {
  Download,
  Database,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileJson,
  ShieldCheck,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  exportAllDataBackup,
  EXPORT_COLLECTIONS_CONFIG,
  ExportProgress,
  ExportResultItem,
} from '@/services/export-data'
import { useToast } from '@/hooks/use-toast'

interface ExportDataModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ExportDataModal({ open, onOpenChange }: ExportDataModalProps) {
  const { toast } = useToast()
  const [isExporting, setIsExporting] = useState(false)
  const [progress, setProgress] = useState<Record<string, ExportProgress>>({})
  const [results, setResults] = useState<ExportResultItem[] | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleStartExport = async () => {
    setIsExporting(true)
    setResults(null)
    setErrorMessage(null)

    try {
      const exportResults = await exportAllDataBackup((updatedProgress) => {
        setProgress({ ...updatedProgress })
      })
      setResults(exportResults)
      toast({
        title: 'Exportação concluída com sucesso',
        description: `${exportResults.length} arquivos JSON foram baixados para o seu dispositivo.`,
      })
    } catch (err: any) {
      console.error('Falha na exportação de dados:', err)
      setErrorMessage(
        err?.message || 'Ocorreu um erro durante a exportação dos dados. Tente novamente.',
      )
      toast({
        title: 'Erro na exportação',
        description: 'Não foi possível baixar todos os arquivos de backup.',
        variant: 'destructive',
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleClose = (newOpen: boolean) => {
    if (isExporting) return // Evita fechar durante exportação
    if (!newOpen) {
      // Resetar estado ao fechar
      setResults(null)
      setErrorMessage(null)
      setProgress({})
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg bg-white border-[#EDE4D8]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-[#F97316]">
            <Database className="w-5 h-5" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#F97316]">
              Painel Administrativo
            </span>
          </div>
          <DialogTitle className="text-lg font-bold text-[#2D1B0E] flex items-center gap-2">
            Exportar Backup dos Dados (JSON)
          </DialogTitle>
          <DialogDescription className="text-xs text-[#7A6A5A]">
            Baixa 5 arquivos JSON completos com todos os campos de sistema e relacionamentos do
            banco de dados.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-3">
          <div className="bg-[#FAF7F2] p-3 rounded-lg border border-[#EDE4D8] text-xs text-[#5C3A21] flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#F97316] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-[#2D1B0E]">Coleções inclusas no backup:</p>
              <ul className="list-disc list-inside space-y-0.5 text-[#7A6A5A]">
                <li>
                  <strong className="text-[#5C3A21]">oportunidades.json</strong>: Imóveis e
                  viabilidades
                </li>
                <li>
                  <strong className="text-[#5C3A21]">lancamentos.json</strong>: Despesas e receitas
                </li>
                <li>
                  <strong className="text-[#5C3A21]">checklists.json</strong>: Etapas pós-arremate
                </li>
                <li>
                  <strong className="text-[#5C3A21]">fechamentos.json</strong>: Relatórios de
                  fechamento
                </li>
                <li>
                  <strong className="text-[#5C3A21]">fechamento_lancamentos.json</strong>:
                  Desdobramentos
                </li>
              </ul>
            </div>
          </div>

          {/* Lista de progresso / status */}
          <div className="space-y-2 border border-[#EDE4D8] rounded-lg p-3 bg-white">
            <p className="text-[11px] font-semibold text-[#7A6A5A] uppercase tracking-wider">
              Status do Download
            </p>
            <div className="space-y-2">
              {EXPORT_COLLECTIONS_CONFIG.map((col) => {
                const itemProgress = progress[col.collection]
                const status = itemProgress?.status || 'pending'
                const count = itemProgress?.count

                return (
                  <div
                    key={col.collection}
                    className="flex items-center justify-between text-xs py-1.5 px-2 rounded-md bg-[#FAF7F2]/60 border border-[#EDE4D8]/60"
                  >
                    <div className="flex items-center gap-2">
                      <FileJson className="w-4 h-4 text-[#7A6A5A]" />
                      <span className="font-mono text-[#2D1B0E] font-medium">{col.filename}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {status === 'pending' && (
                        <span className="text-[11px] text-[#7A6A5A]">Aguardando</span>
                      )}
                      {status === 'loading' && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#F97316] font-medium">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Baixando...
                        </span>
                      )}
                      {status === 'done' && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-green-700 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                          {count !== undefined ? `${count} reg.` : 'Concluído'}
                        </span>
                      )}
                      {status === 'error' && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-red-600 font-semibold">
                          <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                          Erro
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 text-xs bg-red-50 text-red-800 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {results && (
            <div className="p-3 text-xs bg-green-50 text-green-900 border border-green-200 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
              <span>
                Download concluído com sucesso! Verifique a pasta de downloads do navegador.
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            disabled={isExporting}
            onClick={() => handleClose(false)}
            className="border-[#EDE4D8] text-[#5C3A21]"
          >
            {results ? 'Fechar' : 'Cancelar'}
          </Button>

          <Button
            type="button"
            onClick={handleStartExport}
            disabled={isExporting}
            className="bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold gap-2 shadow-sm"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Exportando dados...
              </>
            ) : results ? (
              <>
                <Download className="w-4 h-4" />
                Exportar Novamente
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Iniciar Exportação
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
