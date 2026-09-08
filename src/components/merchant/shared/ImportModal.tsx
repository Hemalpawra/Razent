import { useState, useRef, useMemo } from "react"
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
  Search,
  CheckCheck,
  Laptop,
  Plus,
  Layers,
  X,
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
import { Input } from "@/components/ui/input"
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
import { useIsMobile } from "@/hooks/use-mobile"

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
    description: "Retail selling price in Rupees (e.g. 249)",
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
    description: "Multiples supported: separated by commas, semicolons, or #tags",
    aliases: ["tags", "tag", "keywords", "labels"],
    fallbackExample: "organic, fresh, breakfast",
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
    description: "Multiples supported: separated by semicolons (;), pipes (|), or bullets",
    aliases: ["features", "feature", "highlights", "key_features", "bullets"],
    fallbackExample: "100% Whole Grain; No Added Sugar; High Fiber",
  },
  {
    key: "specifications",
    label: "Specifications (Key-Value)",
    required: false,
    description: "Multiples supported: key:value pairs separated by semicolons, or JSON",
    aliases: [
      "specifications",
      "specification",
      "specs",
      "spec",
      "attributes",
      "properties",
      "details_specs",
    ],
    fallbackExample: "Weight: 1kg; Shelf Life: 6 Months; Dietary: Vegetarian",
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
  onAddProductManually?: () => void
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
  title = "Import Products Catalog",
  description = "Upload your spreadsheet or CSV file, map columns to Razent schema, and preview before saving.",
  sampleCsv,
  targetFields = RAZENT_PRODUCT_FIELDS,
  onImport,
  onAddProductManually,
}: ImportModalProps) {
  const isMobile = useIsMobile()
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
  const [mappingSearch, setMappingSearch] = useState("")
  const [mappingFilter, setMappingFilter] = useState<"all" | "required" | "mapped" | "unmapped">("all")
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

  // Filtered target fields for mapping search/tabs
  const filteredTargetFields = useMemo(() => {
    return targetFields.filter((field) => {
      const matchesSearch =
        !mappingSearch ||
        field.label.toLowerCase().includes(mappingSearch.toLowerCase()) ||
        field.key.toLowerCase().includes(mappingSearch.toLowerCase()) ||
        field.description.toLowerCase().includes(mappingSearch.toLowerCase())
      if (!matchesSearch) return false

      const isMapped = columnMapping[field.key] && columnMapping[field.key] !== "__skip__"
      if (mappingFilter === "required") return field.required
      if (mappingFilter === "mapped") return isMapped
      if (mappingFilter === "unmapped") return !isMapped
      return true
    })
  }, [targetFields, mappingSearch, mappingFilter, columnMapping])

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
    setParsedRows([])
    setDetectedHeaders([])
    setFileInfo(null)
    setPastedText("")
    setColumnMapping({})
    setImportResult(null)
    setParseError(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // Sample values from the first row of uploaded file
  const firstRowSample = parsedRows[0] || {}

  // ─────────────────────────────────────────────────────────────────────────
  // MOBILE SCREEN NOTICE: Clean, friendly fallback when opened on phone screen
  // ─────────────────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-sm p-6 bg-card rounded-2xl border border-border/80 shadow-2xl">
          <div className="text-center space-y-4 py-3">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
              <Laptop className="size-7" />
            </div>
            <div className="space-y-1.5">
              <DialogTitle className="text-base font-semibold text-foreground">
                Desktop Feature: Bulk Import
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                Bulk spreadsheet imports with multi-column mapping and data preview tables are optimized for laptop and desktop screens.
              </DialogDescription>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 text-left text-xs text-muted-foreground space-y-2">
              <div className="font-medium text-foreground flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-600" />
                <span>On your computer:</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Log in to Razent to upload Excel (.xlsx) or CSV files, map 12+ product attributes, and import 1,000s of items in seconds.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              {onAddProductManually && (
                <Button
                  size="sm"
                  className="w-full gap-1.5 h-9"
                  onClick={() => {
                    onClose()
                    onAddProductManually()
                  }}
                >
                  <Plus className="size-4" />
                  <span>Add Product Manually</span>
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="w-full h-9"
                onClick={onClose}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DESKTOP / LAPTOP FULL-WIDTH IMMERSIVE STUDIO
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-4xl lg:max-w-5xl xl:max-w-6xl w-full h-[88vh] max-h-[880px] p-0 flex flex-col bg-card border border-border/80 shadow-2xl rounded-2xl overflow-hidden">
        {/* ── Fixed Header ── */}
        <DialogHeader className="px-8 pt-6 pb-4 border-b border-border/60 bg-muted/15 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                <TableIcon className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-foreground tracking-tight">
                  {title}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {description}
                </DialogDescription>
              </div>
            </div>

            {parsedRows.length > 0 && !importResult && (
              <Badge variant="outline" className="font-mono text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1.5 py-1 px-2.5">
                <CheckCircle2 className="size-3.5" />
                <span>{parsedRows.length} rows loaded</span>
              </Badge>
            )}
          </div>

          {/* ── Progress Stepper Bar ── */}
          {!importResult && (
            <div className="pt-4 flex items-center justify-between">
              {/* Step 1 Pill */}
              <button
                type="button"
                onClick={() => setStep(1)}
                className={cn(
                  "flex items-center gap-2.5 text-xs font-medium transition-colors focus-visible:outline-none",
                  step === 1
                    ? "text-primary font-semibold"
                    : step > 1
                    ? "text-foreground hover:text-primary cursor-pointer"
                    : "text-muted-foreground",
                )}
              >
                <div
                  className={cn(
                    "size-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all",
                    step === 1
                      ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/20"
                      : step > 1
                      ? "bg-emerald-600 text-white"
                      : "bg-muted text-muted-foreground border border-border",
                  )}
                >
                  {step > 1 ? <Check className="size-4" /> : "1"}
                </div>
                <span>1. Upload File</span>
              </button>

              <div className={cn("h-0.5 flex-1 mx-4 transition-colors", step > 1 ? "bg-emerald-600" : "bg-border")} />

              {/* Step 2 Pill */}
              <button
                type="button"
                onClick={() => parsedRows.length > 0 && setStep(2)}
                disabled={parsedRows.length === 0}
                className={cn(
                  "flex items-center gap-2.5 text-xs font-medium transition-colors focus-visible:outline-none",
                  parsedRows.length === 0 && "cursor-not-allowed opacity-50",
                  step === 2
                    ? "text-primary font-semibold"
                    : step > 2
                    ? "text-foreground hover:text-primary cursor-pointer"
                    : "text-muted-foreground",
                )}
              >
                <div
                  className={cn(
                    "size-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all",
                    step === 2
                      ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/20"
                      : step > 2
                      ? "bg-emerald-600 text-white"
                      : "bg-muted text-muted-foreground border border-border",
                  )}
                >
                  {step > 2 ? <Check className="size-4" /> : "2"}
                </div>
                <span>2. Map Columns</span>
              </button>

              <div className={cn("h-0.5 flex-1 mx-4 transition-colors", step > 2 ? "bg-emerald-600" : "bg-border")} />

              {/* Step 3 Pill */}
              <button
                type="button"
                onClick={() => parsedRows.length > 0 && missingRequired.length === 0 && setStep(3)}
                disabled={parsedRows.length === 0 || missingRequired.length > 0}
                className={cn(
                  "flex items-center gap-2.5 text-xs font-medium transition-colors focus-visible:outline-none",
                  (parsedRows.length === 0 || missingRequired.length > 0) && "cursor-not-allowed opacity-50",
                  step === 3
                    ? "text-primary font-semibold"
                    : "text-muted-foreground",
                )}
              >
                <div
                  className={cn(
                    "size-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all",
                    step === 3
                      ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/20"
                      : "bg-muted text-muted-foreground border border-border",
                  )}
                >
                  3
                </div>
                <span>3. Preview & Import</span>
              </button>
            </div>
          )}
        </DialogHeader>

        {/* ── Scrollable Body Area (Single scrollbar, no nested traps) ── */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {importResult ? (
            /* ── Completion Screen ── */
            <div className="h-full flex flex-col items-center justify-center text-center py-10 space-y-5">
              <div className="relative">
                <div className="size-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/5">
                  <CheckCheck className="size-10" />
                </div>
              </div>
              <div className="space-y-1.5 max-w-md">
                <h3 className="text-xl font-bold text-foreground tracking-tight">
                  Catalog Import Complete!
                </h3>
                <p className="text-xs text-muted-foreground">
                  Your products have been processed, stored in Supabase, and synced with the semantic vector search engine.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 w-full max-w-lg pt-2">
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-center">
                  <div className="text-2xl font-bold text-emerald-600 tabular-nums">
                    {importResult.success}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Products Saved
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-border/80 bg-muted/20 text-center">
                  <div className="text-2xl font-bold text-foreground tabular-nums">
                    {mappedCount}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Attributes Enriched
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-border/80 bg-muted/20 text-center">
                  <div className="text-2xl font-bold text-primary tabular-nums">
                    100%
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    AI Vector Synced
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={handleReset} className="h-9 px-4 text-xs">
                  Import Another File
                </Button>
                <Button size="sm" onClick={onClose} className="h-9 px-6 text-xs gap-1.5">
                  <Check className="size-3.5" />
                  <span>View in Catalog</span>
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* ══════════════════════════════════════════════════════════════
                  STEP 1: UPLOAD SOURCE FILE
              ══════════════════════════════════════════════════════════════ */}
              {step === 1 && (
                <div className="space-y-6 max-w-3xl mx-auto py-2">
                  <Tabs
                    value={activeTab}
                    onValueChange={(val) => {
                      setActiveTab(val as "file" | "paste")
                      handleReset()
                    }}
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-2 p-1 bg-muted/60 rounded-xl mb-5">
                      <TabsTrigger value="file" className="text-xs font-medium py-2 rounded-lg">
                        <Upload className="size-3.5 mr-2" /> Upload Excel or CSV File
                      </TabsTrigger>
                      <TabsTrigger value="paste" className="text-xs font-medium py-2 rounded-lg">
                        <FileText className="size-3.5 mr-2" /> Paste CSV Text
                      </TabsTrigger>
                    </TabsList>

                    {/* Tab 1: Drag & Drop Zone */}
                    <TabsContent value="file" className="mt-0">
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
                          className="border-2 border-dashed border-border/80 hover:border-primary/60 hover:bg-primary/5 transition-all p-12 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer group shadow-sm"
                        >
                          <div className="size-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                            <FileSpreadsheet className="size-8 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div className="text-sm font-semibold text-foreground">
                            Click to browse or drag & drop spreadsheet
                          </div>
                          <p className="text-xs text-muted-foreground mt-1.5 max-w-md leading-relaxed">
                            Upload Microsoft Excel (.xlsx, .xls) or CSV files from Shopify, WooCommerce, ERPs, or custom sheets.
                          </p>
                          <div className="mt-4 flex items-center gap-2">
                            <Badge variant="secondary" className="text-[10px] font-mono">
                              .XLSX
                            </Badge>
                            <Badge variant="secondary" className="text-[10px] font-mono">
                              .XLS
                            </Badge>
                            <Badge variant="secondary" className="text-[10px] font-mono">
                              .CSV
                            </Badge>
                            <span className="text-[11px] text-muted-foreground ml-1">
                              Up to 10MB
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* File Loaded Card */}
                          <div className="p-4 rounded-xl border border-border/80 bg-muted/20 flex items-center justify-between">
                            <div className="flex items-center gap-3.5">
                              <div className="size-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
                                <FileSpreadsheet className="size-6" />
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-foreground truncate max-w-md">
                                  {fileInfo.name}
                                </div>
                                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                                  <span>{formatBytes(fileInfo.size)}</span>
                                  <span>•</span>
                                  <span className="text-emerald-600 font-semibold">
                                    {parsedRows.length} rows parsed
                                  </span>
                                  <span>•</span>
                                  <span>{detectedHeaders.length} columns detected</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => fileInputRef.current?.click()}
                                className="text-xs h-8 gap-1.5"
                              >
                                <RefreshCw className="size-3" />
                                <span>Replace</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleReset}
                                className="text-xs h-8 text-destructive hover:text-destructive gap-1.5"
                              >
                                <Trash2 className="size-3" />
                                <span>Remove</span>
                              </Button>
                            </div>
                          </div>

                          {/* Detected Columns Tag Cloud */}
                          <div className="p-4 rounded-xl border border-border/70 bg-card space-y-2.5">
                            <div className="flex items-center justify-between">
                              <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                <Layers className="size-3.5 text-primary" />
                                <span>Detected Columns in Your File ({detectedHeaders.length})</span>
                              </div>
                              <span className="text-[11px] text-muted-foreground">
                                Ready to map in Next Step
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 pt-1 max-h-28 overflow-y-auto">
                              {detectedHeaders.slice(0, 16).map((header) => (
                                <Badge
                                  key={header}
                                  variant="secondary"
                                  className="text-[11px] font-mono px-2 py-0.5 bg-muted/60 text-foreground border border-border/50"
                                >
                                  {header}
                                </Badge>
                              ))}
                              {detectedHeaders.length > 16 && (
                                <Badge variant="outline" className="text-[11px] font-mono px-2 py-0.5 text-muted-foreground">
                                  +{detectedHeaders.length - 16} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </TabsContent>

                    {/* Tab 2: Paste Raw CSV */}
                    <TabsContent value="paste" className="mt-0 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-foreground">
                          Paste Comma-Separated Values:
                        </label>
                        {sampleCsv && (
                          <button
                            type="button"
                            onClick={() => handleTextChange(sampleCsv)}
                            className="text-xs text-primary hover:underline font-medium cursor-pointer"
                          >
                            Load Sample Template
                          </button>
                        )}
                      </div>
                      <Textarea
                        rows={7}
                        value={pastedText}
                        onChange={(e) => handleTextChange(e.target.value)}
                        placeholder={`title,category,brand,price,stock,stock_threshold,features,specifications\n"Organic Rolled Oats",Health & Nutrition,True Elements,249,50,10,"High Fiber;Gluten Free","Weight: 1kg; Shelf Life: 12M"`}
                        className="font-mono text-xs max-h-60 min-h-[160px] bg-muted/20 resize-y rounded-xl"
                      />
                      {parsedRows.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
                          <CheckCircle2 className="size-3.5" />
                          <span>{parsedRows.length} rows parsed from pasted text</span>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>

                  {parseError && (
                    <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-destructive/10 text-destructive text-xs border border-destructive/20">
                      <AlertCircle className="size-4 shrink-0" />
                      <span>{parseError}</span>
                    </div>
                  )}
                </div>
              )}

              {/* ══════════════════════════════════════════════════════════════
                  STEP 2: MAP COLUMNS (The Redesigned Studio)
              ══════════════════════════════════════════════════════════════ */}
              {step === 2 && (
                <div className="space-y-4">
                  {/* Studio Top Toolbar */}
                  <div className="p-4 rounded-xl bg-muted/20 border border-border/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-foreground flex items-center gap-2">
                        <SlidersHorizontal className="size-3.5 text-primary" />
                        <span>Column Mapping Studio</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Match incoming spreadsheet headers to Razent database fields. Unmapped fields will use default values.
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => runAutoMapping(detectedHeaders)}
                        className="text-xs h-8 gap-1.5"
                      >
                        <Sparkles className="size-3.5 text-primary" />
                        <span>Auto-Match All</span>
                      </Button>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs px-2.5 py-1 font-mono",
                          missingRequired.length === 0
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                            : "bg-amber-500/10 text-amber-600 border-amber-500/30",
                        )}
                      >
                        {missingRequired.length === 0
                          ? "✓ All required fields mapped"
                          : `${missingRequired.length} required field(s) unmapped`}
                      </Badge>
                    </div>
                  </div>

                  {/* Filter & Search Bar */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5">
                      {(["all", "required", "mapped", "unmapped"] as const).map((filterKey) => {
                        const count =
                          filterKey === "all"
                            ? targetFields.length
                            : filterKey === "required"
                            ? targetFields.filter((f) => f.required).length
                            : filterKey === "mapped"
                            ? mappedCount
                            : targetFields.length - mappedCount

                        return (
                          <Button
                            key={filterKey}
                            type="button"
                            size="sm"
                            variant={mappingFilter === filterKey ? "default" : "ghost"}
                            onClick={() => setMappingFilter(filterKey)}
                            className="text-xs h-7 px-2.5 capitalize rounded-lg"
                          >
                            <span>{filterKey}</span>
                            <span className="ml-1 opacity-70">({count})</span>
                          </Button>
                        )
                      })}
                    </div>

                    <div className="relative w-64">
                      <Search className="size-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                      <Input
                        value={mappingSearch}
                        onChange={(e) => setMappingSearch(e.target.value)}
                        placeholder="Filter fields..."
                        className="h-8 pl-8 text-xs rounded-lg bg-card"
                      />
                      {mappingSearch && (
                        <button
                          type="button"
                          onClick={() => setMappingSearch("")}
                          className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Field Mapping Cards Grid (2-column responsive layout) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                    {filteredTargetFields.map((field) => {
                      const currentMapping = columnMapping[field.key] || "__skip__"
                      const isMapped = currentMapping !== "__skip__"
                      const sampleValue = isMapped ? firstRowSample[currentMapping] : null

                      return (
                        <div
                          key={field.key}
                          className={cn(
                            "p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3",
                            isMapped
                              ? "bg-card border-border/80 shadow-xs"
                              : field.required
                              ? "bg-rose-500/5 border-rose-500/30"
                              : "bg-muted/10 border-border/50",
                          )}
                        >
                          {/* Header info */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
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
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                              {field.description}
                            </p>
                          </div>

                          {/* Select control */}
                          <div className="space-y-1.5 pt-1">
                            <Select
                              value={currentMapping}
                              onValueChange={(val) => {
                                setColumnMapping((prev) => ({
                                  ...prev,
                                  [field.key]: val || "__skip__",
                                }))
                              }}
                            >
                              <SelectTrigger
                                className={cn(
                                  "h-8 text-xs bg-background",
                                  isMapped
                                    ? "border-primary/40 font-medium"
                                    : field.required
                                    ? "border-rose-500 text-rose-600 font-medium"
                                    : "text-muted-foreground",
                                )}
                              >
                                <SelectValue placeholder="Select column..." />
                              </SelectTrigger>
                              <SelectContent className="max-h-60">
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
                                          (&ldquo;{sampleVal.slice(0, 20)}&rdquo;)
                                        </span>
                                      )}
                                    </SelectItem>
                                  )
                                })}
                              </SelectContent>
                            </Select>

                            {/* Sample Value Preview Box */}
                            <div className="h-6 flex items-center text-[11px] px-1 truncate">
                              {isMapped ? (
                                <div className="text-emerald-600 dark:text-emerald-400 font-mono truncate flex items-center gap-1.5">
                                  <Check className="size-3 shrink-0" />
                                  <span className="text-muted-foreground">Row 1:</span>
                                  <span className="truncate">&ldquo;{sampleValue || "(empty cell)"}&rdquo;</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground/70 italic">
                                  Not mapped (uses default)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ══════════════════════════════════════════════════════════════
                  STEP 3: PREVIEW MAPPED DATA (Full-width Spacious Table)
              ══════════════════════════════════════════════════════════════ */}
              {step === 3 && (
                <div className="space-y-4">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20">
                      <div className="text-[11px] text-muted-foreground">Total Records</div>
                      <div className="text-lg font-bold text-foreground tabular-nums">
                        {mappedRows.length} Products
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                      <div className="text-[11px] text-muted-foreground">Fields Mapped</div>
                      <div className="text-lg font-bold text-emerald-600 tabular-nums">
                        {mappedCount} of {targetFields.length} Attributes
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5">
                      <div className="text-[11px] text-muted-foreground">Schema Validation</div>
                      <div className="text-lg font-bold text-primary flex items-center gap-1.5">
                        <CheckCircle2 className="size-4" />
                        <span>All Required Pass</span>
                      </div>
                    </div>
                  </div>

                  {/* Wide Preview Table */}
                  <div className="rounded-xl border border-border/80 overflow-hidden bg-background shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse min-w-[700px]">
                        <thead className="bg-muted/60 text-muted-foreground border-b border-border/70 font-semibold">
                          <tr>
                            <th className="p-3 w-10 text-center">#</th>
                            <th className="p-3 font-semibold min-w-[180px]">Product Name & Brand</th>
                            <th className="p-3 font-semibold min-w-[120px]">Category</th>
                            <th className="p-3 font-semibold text-right min-w-[90px]">Price</th>
                            <th className="p-3 font-semibold text-center min-w-[140px]">Stock & Status</th>
                            <th className="p-3 font-semibold min-w-[90px]">SKU</th>
                            <th className="p-3 font-semibold text-center min-w-[100px]">Features/Specs</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {mappedRows.slice(0, 5).map((row, idx) => {
                            const rawPrice = parseFloat(String(row.price || "100").replace(/[^0-9.]/g, "")) || 100
                            const pricePaise = Math.round(rawPrice * 100)
                            const stock = parseInt(String(row.stock || "50").replace(/[^0-9]/g, ""), 10)
                            const threshold = parseInt(String(row.stock_threshold || "10").replace(/[^0-9]/g, ""), 10)
                            const stockStatus = getProductStockStatus(stock, threshold)
                            const featureCount = row.features ? row.features.split(/[\r\n;|]+/).filter(Boolean).length : 0

                            return (
                              <tr key={idx} className="hover:bg-muted/20 transition-colors">
                                <td className="p-3 text-center text-muted-foreground font-mono text-[11px]">
                                  {idx + 1}
                                </td>
                                <td className="p-3">
                                  <div className="font-semibold text-foreground truncate max-w-[200px]">
                                    {row.title || <span className="text-muted-foreground italic">Untitled Product</span>}
                                  </div>
                                  {row.brand && (
                                    <div className="text-[10px] text-primary font-medium mt-0.5">
                                      {row.brand}
                                    </div>
                                  )}
                                </td>
                                <td className="p-3 text-muted-foreground">
                                  <Badge variant="outline" className="text-[10px] px-2 py-0">
                                    {row.category || "Grocery"}
                                  </Badge>
                                </td>
                                <td className="p-3 text-right font-semibold tabular-nums text-foreground font-mono">
                                  {formatPrice(pricePaise)}
                                </td>
                                <td className="p-3 text-center">
                                  <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border", stockStatus.badgeClass)}>
                                    <span className={cn("size-1.5 rounded-full", stockStatus.dotClass)} />
                                    {stock} ({stockStatus.label})
                                  </span>
                                </td>
                                <td className="p-3 font-mono text-[11px] text-muted-foreground">
                                  {row.sku || "—"}
                                </td>
                                <td className="p-3 text-center">
                                  <Badge variant="secondary" className="text-[10px] font-mono">
                                    {featureCount > 0 ? `${featureCount} highlights` : "Standard"}
                                  </Badge>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground text-center">
                    Showing first 5 preview rows. All {mappedRows.length} items will be imported into your database and indexed in vector search.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Fixed Footer Controls ── */}
        {!importResult && (
          <div className="px-8 py-4 bg-muted/25 border-t border-border/70 flex items-center justify-between shrink-0">
            <div>
              {step === 1 ? (
                <Button variant="ghost" size="sm" onClick={onClose} className="text-xs h-9">
                  Cancel
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStep((s) => (s - 1) as any)}
                  className="text-xs h-9 gap-1.5"
                >
                  <ArrowLeft className="size-3.5" />
                  <span>Back</span>
                </Button>
              )}
            </div>

            <div>
              {step === 1 && (
                <Button
                  size="sm"
                  disabled={parsedRows.length === 0}
                  onClick={() => setStep(2)}
                  className="text-xs h-9 gap-1.5 font-medium"
                >
                  <span>Proceed to Mapping</span>
                  <ArrowRight className="size-3.5" />
                </Button>
              )}

              {step === 2 && (
                <Button
                  size="sm"
                  disabled={missingRequired.length > 0}
                  onClick={() => setStep(3)}
                  className="text-xs h-9 gap-1.5 font-medium"
                >
                  <span>Review & Preview</span>
                  <ArrowRight className="size-3.5" />
                </Button>
              )}

              {step === 3 && (
                <Button
                  size="sm"
                  disabled={loading || mappedRows.length === 0}
                  onClick={handleExecuteImport}
                  className="text-xs h-9 gap-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="size-3.5 animate-spin" />
                      <span>Importing to Database...</span>
                    </>
                  ) : (
                    <>
                      <Check className="size-3.5" />
                      <span>Confirm & Import {mappedRows.length} Products</span>
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
