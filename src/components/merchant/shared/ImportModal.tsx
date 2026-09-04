import { useState, useRef } from "react"
import { Upload, FileText, CheckCircle2, AlertCircle, X, Download } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

interface ImportModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  sampleCsv?: string
  onImport: (rows: Record<string, string>[]) => Promise<{ success: number; errors: number }>
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""))
  const result: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""))
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? ""
    })
    result.push(row)
  }
  return result
}

export function ImportModal({
  open,
  onClose,
  title = "Import Data",
  description = "Upload a CSV file or paste CSV text to bulk import records.",
  sampleCsv,
  onImport,
}: ImportModalProps) {
  const [pastedText, setPastedText] = useState("")
  const [fileName, setFileName] = useState<string | null>(null)
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([])
  const [loading, setLoading] = useState(false)
  const [importResult, setImportResult] = useState<{ success: number; errors: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      if (text) {
        setPastedText(text)
        const rows = parseCSV(text)
        setParsedRows(rows)
      }
    }
    reader.readAsText(file)
  }

  const handleTextChange = (text: string) => {
    setPastedText(text)
    const rows = parseCSV(text)
    setParsedRows(rows)
  }

  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) return
    setLoading(true)
    try {
      const res = await onImport(parsedRows)
      setImportResult(res)
    } catch {
      setImportResult({ success: 0, errors: parsedRows.length })
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setPastedText("")
    setFileName(null)
    setParsedRows([])
    setImportResult(null)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg p-6 bg-card">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>

        {importResult ? (
          <div className="py-6 text-center space-y-3">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="size-6" />
            </div>
            <div className="text-sm font-semibold text-foreground">
              Import Completed
            </div>
            <div className="text-xs text-muted-foreground flex justify-center gap-4">
              <span className="text-emerald-600 font-medium">
                {importResult.success} records imported
              </span>
              {importResult.errors > 0 && (
                <span className="text-destructive font-medium">
                  {importResult.errors} skipped/errors
                </span>
              )}
            </div>
            <div className="pt-3 flex justify-center gap-2">
              <Button size="sm" variant="outline" onClick={handleReset}>
                Import More
              </Button>
              <Button size="sm" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Upload Box */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <Upload className="size-8 mx-auto text-muted-foreground mb-2" />
              <div className="text-xs font-medium text-foreground">
                {fileName ? fileName : "Click to select or drop CSV file"}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Supports standard comma-separated values (.csv)
              </div>
            </div>

            {/* Paste alternative */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-foreground">
                  Or Paste CSV Text:
                </label>
                {sampleCsv && (
                  <button
                    type="button"
                    onClick={() => handleTextChange(sampleCsv)}
                    className="text-[11px] text-primary hover:underline"
                  >
                    Load Sample CSV
                  </button>
                )}
              </div>
              <Textarea
                rows={4}
                value={pastedText}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder="id,title,price,stock&#10;prod_1,Amul Milk,68,50"
                className="font-mono text-xs bg-muted/20"
              />
            </div>

            {parsedRows.length > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-muted/40 p-2.5 text-xs">
                <span className="font-medium text-foreground">
                  Ready to import:
                </span>
                <Badge variant="secondary" className="font-mono">
                  {parsedRows.length} valid rows found
                </Badge>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={parsedRows.length === 0 || loading}
                onClick={handleExecuteImport}
              >
                {loading ? "Importing…" : `Import ${parsedRows.length > 0 ? `(${parsedRows.length})` : ""}`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
