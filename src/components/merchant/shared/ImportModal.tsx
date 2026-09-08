import { useState, useRef, useMemo, useEffect } from "react"
import {
  Upload,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertCircle,
  Trash2,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  SlidersHorizontal,
  Table as TableIcon,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { formatPrice, getProductStockStatus } from "@/lib/types/product"

export interface TargetFieldDef {
  key: string
  label: string
  required: boolean
  description: string
  aliases: string[]
  fallbackExample: string
}

export const RAZENT_PRODUCT_FIELDS: TargetFieldDef[] = [
  {
    key: "title",
    label: "Product Name / Title",
    required: true,
    description: "Main product name visible to customers and AI assistant",
    aliases: [
      "title",
      "product_name",
      "product",
      "name",
      "item",
      "item_name",
      "description_short",
      "item_desc",
    ],
    fallbackExample: "Organic Rolled Oats (1kg)",
  },
  {
    key: "price",
    label: "Selling Price (₹ INR)",
    required: true,
    description: "Retail selling price in Rupees",
    aliases: [
      "price",
      "mrp",
      "selling_price",
      "price_inr",
      "rate",
      "amount",
      "unit_price",
      "cost",
    ],
    fallbackExample: "249",
  },
  {
    key: "stock",
    label: "Inventory Stock",
    required: true,
    description: "Current physical units available on hand",
    aliases: [
      "stock",
      "quantity",
      "qty",
      "inventory",
      "units",
      "available_qty",
      "qty_available",
    ],
    fallbackExample: "50",
  },
  {
    key: "category",
    label: "Category",
    required: false,
    description: "Product category (new categories added dynamically)",
    aliases: [
      "category",
      "cat",
      "department",
      "dept",
      "group",
      "collection",
      "type",
    ],
    fallbackExample: "Dairy & Bakery",
  },
  {
    key: "brand",
    label: "Brand Name",
    required: false,
    description: "Manufacturer or brand name",
    aliases: [
      "brand",
      "brand_name",
      "make",
      "manufacturer",
      "vendor",
      "mfr",
    ],
    fallbackExample: "Country Delight",
  },
  {
    key: "stock_threshold",
    label: "Low Stock Alert Threshold",
    required: false,
    description: "Minimum units before Orange Low Stock alert (Default: 10)",
    aliases: [
      "stock_threshold",
      "threshold",
      "min_stock",
      "low_stock",
      "safety_stock",
      "reorder_level",
    ],
    fallbackExample: "10",
  },
  {
    key: "sku",
    label: "SKU / Item Code",
    required: false,
    description: "Unique product barcode, SKU or item reference",
    aliases: [
      "sku",
      "item_code",
      "code",
      "barcode",
      "upc",
      "ean",
      "id",
    ],
    fallbackExample: "SKU-EGG-001",
  },
  {
    key: "tags",
    label: "Tags & Keywords",
    required: false,
    description: "Semicolon or comma-separated tags (e.g. organic;fresh;high-protein)",
    aliases: ["tags", "tag", "keywords", "labels"],
    fallbackExample: "organic;fresh",
  },
  {
    key: "unit",
    label: "Display Unit / Size",
    required: false,
    description: "Packaging size specification (e.g. 500g, 1L, Pack of 6)",
    aliases: ["unit", "pack_size", "size", "weight", "net_quantity", "volume"],
    fallbackExample: "500g",
  },
  {
    key: "image_url",
    label: "Product Image URL",
    required: false,
    description: "Direct web link to product photography",
    aliases: ["image_url", "image", "photo", "pic", "picture", "thumbnail", "img"],
    fallbackExample: "https://...",
  },
  {
    key: "features",
    label: "Key Features & Highlights",
    required: false,
    description: "Bullet highlights separated by semicolon",
    aliases: ["features", "feature", "highlights", "key_features", "bullets"],
    fallbackExample: "100% Whole Grain;No Added Sugar",
  },
  {
    key: "description",
    label: "Detailed Description",
    required: false,
    description: "Long-form description of the product",
    aliases: ["description", "desc", "details", "about"],
    fallbackExample: "Freshly sorted and packaged...",
  },
]

interface ImportModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  sampleCsv?: string
  targetFields?: TargetFieldDef[]
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

  const rawHeaders = splitLine(lines[0])
  const cleanHeaders = rawHeaders.map((h) => h.trim().toLowerCase())
  const result: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = splitLine(lines[i])
    if (values.every((v) => !v.trim())) continue
    const row: Record<string, string> = {}
    cleanHeaders.forEach((h, idx) => {
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

/**
 * Smart fuzzy match to find best matching header for a target field.
 */
function findBestMatchingHeader(
  targetAliases: string[],
  detectedHeaders: string[],
): string | undefined {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "")

  // 1. Exact or normalized match
  for (const alias of targetAliases) {
    const normAlias = normalize(alias)
    for (const h of detectedHeaders) {
      if (normalize(h) === normAlias) return h
    }
  }

  // 2. Partial contains match
  for (const alias of targetAliases) {
    const normAlias = normalize(alias)
    if (normAlias.length < 3) continue
    for (const h of detectedHeaders) {
      const normH = normalize(h)
      if (normH.includes(normAlias) || normAlias.includes(normH)) return h
    }
  }

  return undefined
}

export function ImportModal({
  open,
  onClose,
  title = "Import Products",
  description = "Upload your spreadsheet or CSV and map columns to Razent's product catalog structure.",
  sampleCsv,
  targetFields = RAZENT_PRODUCT_FIELDS,
  onImport,
}: ImportModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [activeTab, setActiveTab] = useState<"file" | "paste">("file")
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(null)
  const [pastedText, setPastedText] = useState("")
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([])
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([])
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [importResult, setImportResult] = useState<{ success: number; errors: number } | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-detect and populate default mapping whenever new rows are parsed
  const runAutoMapping = (headers: string[]) => {
    const initialMapping: Record<string, string> = {}
    targetFields.forEach((field) => {
      const matched = findBestMatchingHeader(field.aliases, headers)
      initialMapping[field.key] = matched || "__skip__"
    })
    setColumnMapping(initialMapping)
  }

  const handleParsedData = (rows: Record<string, string>[]) => {
    if (rows.length === 0) {
      setParsedRows([])
      setDetectedHeaders([])
      setColumnMapping({})
      return
    }
    const headers = Object.keys(rows[0])
    setParsedRows(rows)
    setDetectedHeaders(headers)
    runAutoMapping(headers)
  }

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
          const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
            raw: false,
            defval: "",
          })
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
          handleParsedData(normalized)
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
            const rows = parseCSV(text)
            if (rows.length === 0) {
              setParseError("No valid records found in the uploaded CSV file.")
            }
            handleParsedData(rows)
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
      handleParsedData([])
      return
    }
    const rows = parseCSV(text)
    handleParsedData(rows)
  }

  // Generate mapped rows based on user column mapping
  const mappedRows = useMemo(() => {
    if (parsedRows.length === 0) return []
    return parsedRows.map((raw) => {
      const transformed: Record<string, string> = {}
      targetFields.forEach((field) => {
        const sourceHeader = columnMapping[field.key]
        if (sourceHeader && sourceHeader !== "__skip__") {
          transformed[field.key] = raw[sourceHeader] ?? ""
        }
      })
      // preserve raw attributes as fallback
      return { ...raw, ...transformed }
    })
  }, [parsedRows, columnMapping, targetFields])

  // Count mapped fields
  const mappedCount = useMemo(() => {
    return Object.values(columnMapping).filter((v) => v && v !== "__skip__").length
  }, [columnMapping])

  // Check required fields
  const missingRequired = useMemo(() => {
    const required = targetFields.filter((f) => f.required)
    return required.filter((f) => !columnMapping[f.key] || columnMapping[f.key] === "__skip__")
  }, [targetFields, columnMapping])

  const handleExecuteImport = async () => {
    if (mappedRows.length === 0) return
    setLoading(true)
    try {
      const res = await onImport(mappedRows)
      setImportResult(res)
    } catch {
      setImportResult({ success: 0, errors: mappedRows.length })
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setStep(1)
    setPastedText("")
    setFileInfo(null)
    setParsedRows([])
    setDetectedHeaders([])
    setColumnMapping({})
    setImportResult(null)
    setParseError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Sample values from the first row of uploaded file
  const firstRowSample = parsedRows[0] || {}

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-6 bg-card overflow-hidden shadow-2xl rounded-2xl">
        {/* Header */}
        <DialogHeader className="shrink-0 pb-3 border-b border-border/60">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <TableIcon className="size-5 text-primary" />
              <span>{title}</span>
            </DialogTitle>
            {parsedRows.length > 0 && !importResult && (
              <Badge variant="outline" className="font-mono text-xs bg-primary/10 text-primary border-primary/20">
                {parsedRows.length} rows loaded
              </Badge>
            )}
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            {description}
          </DialogDescription>

          {/* ── 3-Step Wizard Indicator ── */}
          {!importResult && (
            <div className="flex items-center justify-between pt-3 max-w-md">
              {/* Step 1 */}
              <div
                onClick={() => setStep(1)}
                className={cn(
                  "flex items-center gap-2 cursor-pointer select-none transition-colors",
                  step === 1
                    ? "text-primary font-semibold"
                    : step > 1
                    ? "text-foreground hover:text-primary"
                    : "text-muted-foreground",
                )}
              >
                <div
                  className={cn(
                    "size-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                    step === 1
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : step > 1
                      ? "bg-emerald-500 text-white"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {step > 1 ? <Check className="size-3.5" /> : "1"}
                </div>
                <span className="text-xs">1. Select File</span>
              </div>

              <div className="h-0.5 flex-1 mx-3 bg-border" />

              {/* Step 2 */}
              <div
                onClick={() => parsedRows.length > 0 && setStep(2)}
                className={cn(
                  "flex items-center gap-2 select-none transition-colors",
                  parsedRows.length > 0 ? "cursor-pointer" : "cursor-not-allowed opacity-50",
                  step === 2
                    ? "text-primary font-semibold"
                    : step > 2
                    ? "text-foreground hover:text-primary"
                    : "text-muted-foreground",
                )}
              >
                <div
                  className={cn(
                    "size-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                    step === 2
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : step > 2
                      ? "bg-emerald-500 text-white"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {step > 2 ? <Check className="size-3.5" /> : "2"}
                </div>
                <span className="text-xs">2. Map Columns</span>
              </div>

              <div className="h-0.5 flex-1 mx-3 bg-border" />

              {/* Step 3 */}
              <div
                onClick={() => parsedRows.length > 0 && missingRequired.length === 0 && setStep(3)}
                className={cn(
                  "flex items-center gap-2 select-none transition-colors",
                  parsedRows.length > 0 && missingRequired.length === 0
                    ? "cursor-pointer"
                    : "cursor-not-allowed opacity-50",
                  step === 3 ? "text-primary font-semibold" : "text-muted-foreground",
                )}
              >
                <div
                  className={cn(
                    "size-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                    step === 3
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  3
                </div>
                <span className="text-xs">3. Preview & Import</span>
              </div>
            </div>
          )}
        </DialogHeader>

        {/* Modal Body */}
        {importResult ? (
          /* ── Completion Screen ── */
          <div className="py-12 text-center space-y-4">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="size-8" />
            </div>
            <div className="text-base font-semibold text-foreground">
              Import Completed Successfully
            </div>
            <div className="text-xs text-muted-foreground flex justify-center gap-4">
              <span className="text-emerald-600 font-medium">
                ✓ {importResult.success} products saved to catalog
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
          <div className="flex-1 overflow-y-auto pr-1 py-3 space-y-4">
            {/* ════════════════════════════════════════════════════════════════
                STEP 1: UPLOAD / SOURCE FILE
            ════════════════════════════════════════════════════════════════ */}
            {step === 1 && (
              <div className="space-y-4">
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

                  {/* Tab 1: File Upload */}
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
                          Click to select or drag & drop CSV or Excel file
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                          Supports CSV, Excel (.xlsx, .xls) from Shopify, WooCommerce, suppliers, or custom spreadsheets.
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
                              <span>•</span>
                              <span>{detectedHeaders.length} columns</span>
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

                  {/* Tab 2: Paste Raw CSV */}
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
                      placeholder="title,category,brand,price,stock,stock_threshold,sku&#10;Organic Rolled Oats,Health & Nutrition,True Elements,249,50,10,SKU-OATS&#10;Yoga Bar Protein Bar,Snacks,Yogabar,299,80,15,SKU-YOGA"
                      className="font-mono text-xs max-h-40 min-h-[110px] overflow-y-auto bg-muted/20 resize-y"
                    />
                  </TabsContent>
                </Tabs>

                {parseError && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-xs">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>{parseError}</span>
                  </div>
                )}

                {parsedRows.length > 0 && (
                  <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-foreground">
                        Ready for Column Mapping
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Detected columns: {detectedHeaders.join(", ")}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setStep(2)}
                      className="text-xs font-medium gap-1.5"
                    >
                      <span>Proceed to Mapping</span>
                      <ArrowRight className="size-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                STEP 2: MAP COLUMNS (The Core Interactive Stage)
            ════════════════════════════════════════════════════════════════ */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/80">
                  <div>
                    <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <SlidersHorizontal className="size-3.5 text-primary" />
                      <span>Map Spreadsheet Columns to Razent Schema</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      We've automatically suggested mappings based on your column headers. Confirm or reassign fields below.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => runAutoMapping(detectedHeaders)}
                    className="text-xs h-7 gap-1 shrink-0"
                    title="Reset to automatic best guesses"
                  >
                    <Sparkles className="size-3 text-primary" />
                    Auto-Match
                  </Button>
                </div>

                {missingRequired.length > 0 && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>
                      Please map the required field(s):{" "}
                      <strong>{missingRequired.map((f) => f.label).join(", ")}</strong> to proceed.
                    </span>
                  </div>
                )}

                {/* Field Mapping Grid */}
                <div className="space-y-2.5 max-h-[48vh] overflow-y-auto pr-1">
                  {targetFields.map((field) => {
                    const currentMapping = columnMapping[field.key] || "__skip__"
                    const sampleValue =
                      currentMapping !== "__skip__" && firstRowSample[currentMapping]
                        ? firstRowSample[currentMapping]
                        : null

                    return (
                      <div
                        key={field.key}
                        className={cn(
                          "p-3 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                          currentMapping !== "__skip__"
                            ? "bg-card border-border/80"
                            : field.required
                            ? "bg-destructive/5 border-destructive/30"
                            : "bg-muted/10 border-border/50",
                        )}
                      >
                        {/* Field Label & Description */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-foreground">
                              {field.label}
                            </span>
                            {field.required ? (
                              <Badge variant="destructive" className="text-[9px] px-1.5 py-0">
                                Required
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 text-muted-foreground">
                                Optional
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                            {field.description}
                          </p>
                          {sampleValue && (
                            <div className="mt-1 text-[11px] text-primary/80 font-mono truncate">
                              Sample: &ldquo;{sampleValue}&rdquo;
                            </div>
                          )}
                        </div>

                        {/* Dropdown Selector */}
                        <div className="w-full sm:w-64 shrink-0">
                          <Select
                            value={currentMapping}
                            onValueChange={(val) => {
                              setColumnMapping((prev) => ({
                                ...prev,
                                [field.key]: val,
                              }))
                            }}
                          >
                            <SelectTrigger
                              className={cn(
                                "h-8 text-xs",
                                currentMapping !== "__skip__"
                                  ? "border-primary/40 font-medium"
                                  : field.required
                                  ? "border-destructive text-destructive font-medium"
                                  : "text-muted-foreground",
                              )}
                            >
                              <SelectValue placeholder="Select column..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__skip__" className="text-muted-foreground italic">
                                -- Do not import / Use default --
                              </SelectItem>
                              {detectedHeaders.map((header) => {
                                const sampleVal = firstRowSample[header]
                                return (
                                  <SelectItem key={header} value={header}>
                                    <span className="font-medium text-foreground">{header}</span>
                                    {sampleVal && (
                                      <span className="ml-1.5 text-muted-foreground text-[10px] font-mono">
                                        (&ldquo;{sampleVal.slice(0, 18)}&rdquo;)
                                      </span>
                                    )}
                                  </SelectItem>
                                )
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                STEP 3: PREVIEW MAPPED DATA & CONFIRM
            ════════════════════════════════════════════════════════════════ */}
            {step === 3 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div>
                    <div className="text-xs font-semibold text-foreground">
                      Review Mapped Products ({mappedRows.length} total)
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Here is how your rows map into Razent's store schema before saving.
                    </div>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                    {mappedCount} fields mapped
                  </Badge>
                </div>

                {/* Table Preview */}
                <div className="rounded-xl border border-border/80 overflow-hidden bg-background">
                  <div className="overflow-x-auto max-h-56 overflow-y-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="sticky top-0 bg-muted/60 text-muted-foreground border-b border-border/60 font-medium">
                        <tr>
                          <th className="p-2 w-10 text-center">#</th>
                          <th className="p-2 font-semibold min-w-[140px]">Product Name</th>
                          <th className="p-2 font-semibold min-w-[100px]">Brand</th>
                          <th className="p-2 font-semibold min-w-[100px]">Category</th>
                          <th className="p-2 font-semibold text-right min-w-[80px]">Price</th>
                          <th className="p-2 font-semibold text-center min-w-[120px]">Stock & Status</th>
                          <th className="p-2 font-semibold min-w-[90px]">SKU</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {mappedRows.slice(0, 5).map((row, idx) => {
                          const rawPrice = parseFloat(String(row.price || "100").replace(/[^0-9.]/g, "")) || 100
                          const pricePaise = Math.round(rawPrice * 100)
                          const stock = parseInt(String(row.stock || "50").replace(/[^0-9]/g, ""), 10)
                          const threshold = parseInt(String(row.stock_threshold || "10").replace(/[^0-9]/g, ""), 10)
                          const stockStatus = getProductStockStatus(stock, threshold)

                          return (
                            <tr key={idx} className="hover:bg-muted/20 transition-colors">
                              <td className="p-2 text-center text-muted-foreground font-mono text-[11px]">
                                {idx + 1}
                              </td>
                              <td className="p-2 font-medium text-foreground truncate max-w-[160px]">
                                {row.title || <span className="text-muted-foreground italic">—</span>}
                              </td>
                              <td className="p-2 text-muted-foreground truncate max-w-[110px]">
                                {row.brand ? (
                                  <span className="font-semibold text-primary">{row.brand}</span>
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td className="p-2 text-muted-foreground truncate max-w-[110px]">
                                {row.category || "Grocery"}
                              </td>
                              <td className="p-2 text-right font-semibold tabular-nums text-foreground">
                                {formatPrice(pricePaise)}
                              </td>
                              <td className="p-2 text-center">
                                <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border", stockStatus.badgeClass)}>
                                  <span className={cn("size-1.5 rounded-full", stockStatus.dotClass)} />
                                  {stock} ({stockStatus.label})
                                </span>
                              </td>
                              <td className="p-2 font-mono text-[11px] text-muted-foreground truncate max-w-[90px]">
                                {row.sku || "Auto"}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {mappedRows.length > 5 && (
                    <div className="px-3 py-1.5 bg-muted/20 border-t border-border/60 text-[11px] text-muted-foreground text-center">
                      + {mappedRows.length - 5} more records will be imported with this schema mapping
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Sticky Footer Navigation */}
        {!importResult && (
          <div className="shrink-0 flex items-center justify-between pt-3 border-t border-border/60">
            <div>
              {step === 1 && (
                <Button variant="outline" size="sm" onClick={onClose}>
                  Cancel
                </Button>
              )}
              {step === 2 && (
                <Button variant="outline" size="sm" onClick={() => setStep(1)} className="gap-1 text-xs">
                  <ArrowLeft className="size-3.5" /> Back to Upload
                </Button>
              )}
              {step === 3 && (
                <Button variant="outline" size="sm" onClick={() => setStep(2)} className="gap-1 text-xs">
                  <ArrowLeft className="size-3.5" /> Back to Mapping
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {step === 1 && (
                <Button
                  size="sm"
                  disabled={parsedRows.length === 0}
                  onClick={() => setStep(2)}
                  className="font-medium gap-1 text-xs"
                >
                  <span>Next: Map Columns</span>
                  <ArrowRight className="size-3.5" />
                </Button>
              )}

              {step === 2 && (
                <Button
                  size="sm"
                  disabled={missingRequired.length > 0}
                  onClick={() => setStep(3)}
                  className="font-medium gap-1 text-xs"
                >
                  <span>Next: Preview Data</span>
                  <ArrowRight className="size-3.5" />
                </Button>
              )}

              {step === 3 && (
                <Button
                  size="sm"
                  disabled={mappedRows.length === 0 || loading}
                  onClick={handleExecuteImport}
                  className="font-medium gap-1.5 text-xs"
                >
                  {loading ? (
                    "Importing to Database…"
                  ) : (
                    <>
                      <Check className="size-3.5" />
                      <span>Confirm & Import ({mappedRows.length} Products)</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
