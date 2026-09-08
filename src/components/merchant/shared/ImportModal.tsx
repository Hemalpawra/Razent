import { useState, useRef } from "react"
import {
  Upload,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Trash2,
  RefreshCw,
} from "lucide-react"
import * as XLSX from "xlsx"
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

interface ImportModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  sampleCsv?: string
  onImport: (rows: Record<string, string>[]) => Promise<{ success: number; errors: number }>
}

/**
 * Robust CSV parser supporting quoted cells and escaped quotes.
 */
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length < 2) return []

  function splitLine(line: string): string[] {
    const out: string[] = []
    let cur = ""
    let inQ = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQ = !inQ
        }
      } else if (c === "," && !inQ) {
        out.push(cur)
        cur = ""
      } else {
        cur += c
      }
    }
    out.push(cur)
    return out.map((s) => s.trim().replace(/^"(.*)"$/, "$1"))
  }

  const headers = splitLine(lines[0]).map((h) => h.trim().toLowerCase())
  const result: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = splitLine(lines[i])
    if (values.every((v) => !v.trim())) continue
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? ""
    })
    result.push(row)
  }

  return result
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}

export function ImportModal({
  open,
  onClose,
  title = "Import Data",
  description = "Upload CSV or Excel (.xlsx) file, or paste CSV text to import records.",
  sampleCsv,
  onImport,
}: ImportModalProps) {
  const [activeTab, setActiveTab] = useState<"file" | "paste">("file")
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(null)
  const [pastedText, setPastedText] = useState("")
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([])
  const [loading, setLoading] = useState(false)
  const [importResult, setImportResult] = useState<{ success: number; errors: number } | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setParseError(null)
    setFileInfo({ name: file.name, size: file.size })

    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls")
    if (isExcel) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const data = new Uint8Array(ev.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: "array" })
          const firstSheet = workbook.SheetNames[0]
          const sheet = workbook.Sheets[firstSheet]
          const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { raw: false, defval: "" })
          const normalized: Record<string, string>[] = rows.map((r) => {
            const obj: Record<string, string> = {}
            Object.entries(r).forEach(([k, v]) => {
              obj[k.trim().toLowerCase()] = String(v ?? "")
            })
            return obj
          })
          if (normalized.length === 0) {
            setParseError("No records found in the uploaded spreadsheet.")
          }
          setParsedRows(normalized)
        } catch (err: any) {
          console.error("Excel parse error:", err)
          setParseError("Failed to parse Excel file: " + (err?.message || "Invalid format"))
        }
      }
      reader.readAsArrayBuffer(file)
    } else {
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const text = ev.target?.result as string
          if (text) {
            // Note: DO NOT set pastedText so we do not dump raw text into the UI
            const rows = parseCSV(text)
            if (rows.length === 0) {
              setParseError("No valid records found in the uploaded CSV file.")
            }
            setParsedRows(rows)
          }
        } catch (err: any) {
          setParseError("Failed to parse CSV file: " + (err?.message || "Invalid format"))
        }
      }
      reader.readAsText(file)
    }
  }

  const handleTextChange = (text: string) => {
    setPastedText(text)
    setParseError(null)
    if (!text.trim()) {
      setParsedRows([])
      return
    }
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
    setFileInfo(null)
    setParsedRows([])
    setImportResult(null)
    setParseError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const previewHeaders = parsedRows.length > 0 ? Object.keys(parsedRows[0]).slice(0, 6) : []
  const previewRows = parsedRows.slice(0, 5)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[88vh] flex flex-col p-6 bg-card overflow-hidden shadow-2xl rounded-2xl">
        <DialogHeader className="shrink-0 pb-2 border-b border-border/60">
          <DialogTitle className="text-lg font-semibold flex items-center justify-between">
            <span>{title}</span>
            {parsedRows.length > 0 && !importResult && (
              <Badge variant="outline" className="font-mono text-xs bg-primary/10 text-primary border-primary/20">
                {parsedRows.length} items parsed
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>

        {importResult ? (
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="size-8" />
            </div>
            <div className="text-base font-semibold text-foreground">
              Import Completed Successfully
            </div>
            <div className="text-xs text-muted-foreground flex justify-center gap-4">
              <span className="text-emerald-600 font-medium">
                ✓ {importResult.success} records added to database
              </span>
              {importResult.errors > 0 && (
                <span className="text-destructive font-medium">
                  ✗ {importResult.errors} skipped / errors
                </span>
              )}
            </div>
            <div className="pt-4 flex justify-center gap-3">
              <Button size="sm" variant="outline" onClick={handleReset}>
                Import Another File
              </Button>
              <Button size="sm" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-1 space-y-4 py-3">
            <Tabs
              value={activeTab}
              onValueChange={(val) => {
                setActiveTab(val as "file" | "paste")
                handleReset()
              }}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 mb-3">
                <TabsTrigger value="file" className="text-xs">
                  <Upload className="size-3.5 mr-1.5" /> Upload File (.csv, .xlsx)
                </TabsTrigger>
                <TabsTrigger value="paste" className="text-xs">
                  <FileText className="size-3.5 mr-1.5" /> Paste Raw CSV
                </TabsTrigger>
              </TabsList>

              {/* ── Tab 1: Upload File ── */}
              <TabsContent value="file" className="space-y-3 mt-0">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {!fileInfo ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all group"
                  >
                    <div className="flex justify-center gap-3 mb-3 text-muted-foreground group-hover:text-primary transition-colors">
                      <Upload className="size-8" />
                      <FileSpreadsheet className="size-8 text-emerald-600" />
                    </div>
                    <div className="text-sm font-semibold text-foreground">
                      Click to choose or drag & drop CSV or Excel file
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                      Supports standard comma-separated values (.csv) and Microsoft Excel (.xlsx / .xls) with up to thousands of records.
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4 rounded-xl border border-border/80 bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                        {fileInfo.name.endsWith(".xlsx") || fileInfo.name.endsWith(".xls") ? (
                          <FileSpreadsheet className="size-5 text-emerald-600" />
                        ) : (
                          <FileText className="size-5 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground max-w-sm truncate">
                          {fileInfo.name}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <span>{formatBytes(fileInfo.size)}</span>
                          <span>•</span>
                          <span className="text-emerald-600 font-medium">
                            {parsedRows.length} rows detected
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs h-8"
                      >
                        <RefreshCw className="size-3.5 mr-1" /> Replace
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleReset}
                        className="text-xs h-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-3.5 mr-1" /> Remove
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* ── Tab 2: Paste Raw CSV ── */}
              <TabsContent value="paste" className="space-y-2 mt-0">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground">
                    Paste Comma-Separated Values:
                  </label>
                  {sampleCsv && (
                    <button
                      type="button"
                      onClick={() => handleTextChange(sampleCsv)}
                      className="text-[11px] text-primary hover:underline cursor-pointer"
                    >
                      Load Sample Template
                    </button>
                  )}
                </div>
                <Textarea
                  rows={5}
                  value={pastedText}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder="title,category,price,stock,sku&#10;Organic Rolled Oats,Health & Nutrition,249,50,SKU-OATS&#10;Yoga Bar Protein Bar,Snacks,299,80,SKU-YOGA"
                  className="font-mono text-xs max-h-40 min-h-[110px] overflow-y-auto bg-muted/20 resize-y"
                />
              </TabsContent>
            </Tabs>

            {/* Error Banner */}
            {parseError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-xs">
                <AlertCircle className="size-4 shrink-0" />
                <span>{parseError}</span>
              </div>
            )}

            {/* ── Clean Table Preview (Never dumps raw text wall) ── */}
            {parsedRows.length > 0 && (
              <div className="rounded-xl border border-border/80 overflow-hidden bg-background">
                <div className="px-3.5 py-2.5 bg-muted/40 border-b border-border/80 flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">
                    Data Preview (First {Math.min(5, parsedRows.length)} of {parsedRows.length} items)
                  </span>
                  <Badge variant="secondary" className="text-[11px] font-mono">
                    {Object.keys(parsedRows[0]).length} columns mapped
                  </Badge>
                </div>

                <div className="overflow-x-auto max-h-48 overflow-y-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="sticky top-0 bg-muted/60 text-muted-foreground border-b border-border/60 font-medium">
                      <tr>
                        <th className="p-2 w-10 text-center">#</th>
                        {previewHeaders.map((h) => (
                          <th key={h} className="p-2 capitalize font-semibold truncate max-w-[140px]">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {previewRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-muted/20 transition-colors">
                          <td className="p-2 text-center text-muted-foreground font-mono text-[11px]">
                            {idx + 1}
                          </td>
                          {previewHeaders.map((h) => (
                            <td key={h} className="p-2 truncate max-w-[160px] text-foreground">
                              {row[h] || <span className="text-muted-foreground italic">—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {parsedRows.length > 5 && (
                  <div className="px-3 py-1.5 bg-muted/20 border-t border-border/60 text-[11px] text-muted-foreground text-center">
                    + {parsedRows.length - 5} more records will be imported to the store database
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Modal Sticky Footer */}
        {!importResult && (
          <div className="shrink-0 flex items-center justify-between pt-3 border-t border-border/60">
            <div className="text-xs text-muted-foreground">
              {parsedRows.length > 0 ? (
                <span>Ready to import <strong className="text-foreground">{parsedRows.length}</strong> records</span>
              ) : (
                <span>Select or paste records to begin</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={parsedRows.length === 0 || loading}
                onClick={handleExecuteImport}
                className="font-medium"
              >
                {loading ? "Importing to DB…" : `Import ${parsedRows.length > 0 ? `(${parsedRows.length} items)` : ""}`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
