import { useState, useRef, useMemo } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import {
  Upload,
  FileSpreadsheet,
  FileText,
  Download,
  History,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Package,
  Eye,
} from "lucide-react"
import * as XLSX from "xlsx"
import { upsertProduct } from "@/lib/api/client"

// --- types ---
type ProductField = "product_name" | "sku" | "category" | "price" | "stock" | "brand" | "description" | "image_url" | "tags" | "shipping_note" | "return_note" | "warranty_note" | "ai_visibility" | "related_products" | "__ignore"
const REQUIRED: ProductField[] = [
  "product_name",
  "sku",
  "category",
  "price",
  "stock",
]
const ALL_FIELDS: { value: ProductField; label: string; required: boolean }[] = [
  { value: "product_name", label: "product name", required: true },
  { value: "sku", label: "SKU", required: true },
  { value: "category", label: "category", required: true },
  { value: "price", label: "price", required: true },
  { value: "stock", label: "stock", required: true },
  { value: "brand", label: "brand", required: false },
  { value: "description", label: "description", required: false },
  { value: "image_url", label: "images", required: false },
  { value: "tags", label: "tags", required: false },
  { value: "shipping_note", label: "shipping note", required: false },
  { value: "return_note", label: "return note", required: false },
  { value: "warranty_note", label: "warranty note", required: false },
  { value: "ai_visibility", label: "AI visibility", required: false },
  { value: "related_products", label: "related products", required: false },
  { value: "__ignore", label: "— ignore —", required: false },
]

type ParsedRow = { [key: string]: string | number; __row: number }
type Issue = { row: number; message: string; fix: string; field: string }

function csvSplit(line: string): string[] {
  const out: string[] = []
  let cur = ""
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"'
        i++
      } else inQ = !inQ
    } else if (c === "," && !inQ) {
      out.push(cur)
      cur = ""
    } else cur += c
  }
  out.push(cur)
  return out.map((s) => s.trim().replace(/^"(.*)"$/, "$1"))
}
function parseCSV(text: string): { headers: string[]; rows: ParsedRow[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length)
  if (!lines.length) return { headers: [], rows: [] }
  const headers = csvSplit(lines[0]).map((h) => h.trim())
  const rows: ParsedRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const vals = csvSplit(lines[i])
    const r: ParsedRow = { __row: i + 1 } as ParsedRow
    headers.forEach((h, idx) => (r[h] = vals[idx] ?? ""))
    rows.push(r)
  }
  return { headers, rows }
}
function validate(
  rows: ParsedRow[],
  mapping: Record<string, ProductField>,
): Issue[] {
  const issues: Issue[] = []
  const seenSku = new Map<string, number>()
  rows.forEach((r) => {
    const get = (f: ProductField) => {
      const col = Object.entries(mapping).find(([, v]) => v === f)?.[0]
      return col ? String(r[col] ?? "").trim() : ""
    }
    const row = r.__row
    for (const f of REQUIRED) {
      if (!get(f))
        issues.push({
          row,
          field: f,
          message: `Missing required field: ${f}`,
          fix: `Fill ${f} in row ${row}`,
        })
    }
    const price = get("price")
    if (price && isNaN(Number(price.replace(/[,₹]/g, ""))))
      issues.push({
        row,
        field: "price",
        message: "Invalid price",
        fix: "Use number, e.g. 18999",
      })
    const stock = get("stock")
    if (stock && !/^\d+$/.test(stock))
      issues.push({
        row,
        field: "stock",
        message: "Invalid stock",
        fix: "Use integer ≥0",
      })
    const cat = get("category")
    if (cat === "" && REQUIRED.includes("category")) {
    } // already
    const sku = get("sku")
    if (sku) {
      if (seenSku.has(sku))
        issues.push({
          row,
          field: "sku",
          message: `Duplicate SKU: ${sku}`,
          fix: `Make SKU unique (first seen row ${seenSku.get(sku)})`,
        })
      else seenSku.set(sku, row)
    }
    const img = get("image_url")
    if (img && !/^https?:\/\//.test(img) && img.length)
      issues.push({
        row,
        field: "image_url",
        message: "Broken image URL",
        fix: "Use https:// URL",
      })
    const ai = get("ai_visibility")
    if (ai && !["visible", "hidden"].includes(ai.toLowerCase()))
      issues.push({
        row,
        field: "ai_visibility",
        message: "Invalid AI visibility",
        fix: `Use visible or hidden`,
      })
  })
  return issues
}

function UploadZone({
  accept,
  label,
  hint,
  onFile,
  fileName,
  progress,
}: {
  accept: string
  label: string
  hint: string
  onFile: (f: File) => void
  fileName?: string
  progress?: number
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  return (
    <Card className="rounded-xl bg-card border-dashed">
      <CardContent className="p-6">
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDrag(true)
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDrag(false)
            const f = e.dataTransfer.files?.[0]
            if (f) onFile(f)
          }}
          className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 text-center ${
            drag ? "border-primary bg-primary/5" : "border-border bg-muted/20"
          }`}
        >
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
            <Upload className="size-5" />
          </div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground mt-1">{hint}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 rounded-full bg-card"
            onClick={() => ref.current?.click()}
          >
            Choose file
          </Button>
          <input
            ref={ref}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onFile(f)
              e.currentTarget.value = ""
            }}
          />
          {fileName ? (
            <div className="mt-4 w-full rounded-lg bg-card border px-3 py-2 text-left">
              <div className="text-xs font-medium truncate">{fileName}</div>
              {typeof progress === "number" ? (
                <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

function ImportWorkspace({
  accept,
  label,
  hint,
  templateHref,
  templateLabel,
  note,
}: {
  accept: string
  label: string
  hint: string
  templateHref: string
  templateLabel: string
  note?: string
}) {
  const [fileName, setFileName] = useState<string>("")
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [mapping, setMapping] = useState<Record<string, ProductField>>({})
  const [issues, setIssues] = useState<Issue[]>([])
  const [progress, setProgress] = useState<number | undefined>(undefined)
  const [importedCount, setImportedCount] = useState(0)

  const handleFile = async (f: File) => {
    setFileName(f.name)
    setProgress(10)
    try {
      if (f.name.toLowerCase().endsWith(".csv")) {
        const text = await f.text()
        setProgress(60)
        const { headers: h, rows: r } = parseCSV(text)
        setHeaders(h)
        setRows(r)
        const m: Record<string, ProductField> = {}
        h.forEach((col) => {
          const lc = col.toLowerCase().replace(/\s+/g, "_")
          const match = ALL_FIELDS.find((af) => af.value === lc)
            ? lc as ProductField
            : (ALL_FIELDS.find((af) => af.label === col.toLowerCase())?.value ??
              "__ignore")
          // auto map if header equals field name, else try fuzzy
          if ((ALL_FIELDS as any).some((x: any) => x.value === lc))
            m[col] = (lc as ProductField)
          else m[col] = "__ignore"
          if (match && (ALL_FIELDS as any).some((x: any) => x.value === match))
            m[col] = (match as ProductField)
        })
        // second pass: if headers are exactly product_name etc, keep
        setMapping(m)
        setProgress(100)
      } else {
        const buf = await f.arrayBuffer()
        setProgress(40)
        const wb = XLSX.read(buf, { type: "array" })
        setProgress(70)
        const ws = wb.Sheets[wb.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws, {
          defval: "",
        })
        const h = json.length ? Object.keys(json[0]) : []
        const r: ParsedRow[] = json.map((o, idx) => ({ ...o, __row: idx + 2 }))
        setHeaders(h)
        setRows(r)
        const m: Record<string, ProductField> = {}
        h.forEach((col) => {
          const lc = col.toLowerCase().replace(/\s+/g, "_")
          const found = ALL_FIELDS.find((a) => a.value === lc)
          m[col] = found ? found.value : "__ignore"
        })
        setMapping(m)
        setProgress(100)
      }
      setTimeout(() => setProgress(undefined), 800)
    } catch (e) {
      setProgress(undefined)
      setIssues([
        { row: 0, field: "file", message: String(e), fix: "Check file format" },
      ])
    }
  }
  const doValidate = () => setIssues(validate(rows, mapping))
  const doReset = () => {
    setHeaders([])
    setRows([])
    setMapping({})
    setIssues([])
    setFileName("")
    setProgress(undefined)
    setImportedCount(0)
  }
  const doImport = async () => {
    doValidate()
    const errs = validate(rows, mapping)
    if (errs.length) {
      setIssues(errs)
      return
    }
    for (const r of rows) {
      try {
        await upsertProduct({
          id: r.sku ?? r.product_name,
          title: r.product_name,
          description: r.description ?? "",
          price_paise: Math.round(Number(r.price || 0) * 100),
          stock: Number(r.stock || 0),
          category: r.category ?? "General",
          status: "active",
          image_url: r.image_url ?? "https://picsum.photos/seed/" + (r.sku ?? r.product_name) + "/600/600",
          tags: r.tags ? String(r.tags).split(",") : [],
        } as any)
      } catch { /* ignore individual errors */ }
    }
    setImportedCount(rows.length)
  }

  const validCount = Math.max(
    0,
    rows.length - new Set(issues.map((i) => i.row)).size,
  )
  const dupCount = issues.filter((i) =>
    i.message.startsWith("Duplicate"),
  ).length
  const failCount = new Set(issues.map((i) => i.row)).size

  return (
    <div className="space-y-4">
      {note ? (
        <div className="rounded-lg bg-muted/40 border px-3 py-2 text-xs text-muted-foreground">
          {note}
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        {/* left */}
        <div className="space-y-4">
          <UploadZone
            accept={accept}
            label={label}
            hint={hint}
            onFile={handleFile}
            fileName={fileName}
            progress={progress}
          />
          <Card className="rounded-xl bg-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Sample template</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 rounded-full bg-card"
                  render={
                    <a href={templateHref} download>
                      <Download className="size-3.5" /> {templateLabel}
                    </a>
                  }
                />
              </div>
              <CardDescription className="text-xs">
                Required: product name, SKU, category, price, stock
              </CardDescription>
            </CardHeader>
          </Card>

          {headers.length ? (
            <Card className="rounded-xl bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Column mapping</CardTitle>
                <CardDescription className="text-xs">
                  Map file columns to product fields
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="text-xs">File column</TableHead>
                      <TableHead className="text-xs">Mapped field</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {headers.map((h) => (
                      <TableRow key={h}>
                        <TableCell className="text-xs font-mono truncate max-w-[160px]">
                          {h}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={mapping[h] ?? "__ignore"}
                            onValueChange={(v: string | null) =>
                              setMapping((prev) => ({
                                ...prev,
                                [h]: (v ?? "__ignore") as ProductField,
                              }))
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ALL_FIELDS.map((f) => (
                                <SelectItem
                                  key={f.value}
                                  value={f.value}
                                  className="text-xs"
                                >
                                  {f.label} {f.required ? "• required" : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {mapping[h] && mapping[h] !== "__ignore" ? (
                            <Badge
                              variant={
                                (REQUIRED as string[]).includes(mapping[h])
                                  ? "default"
                                  : "secondary"
                              }
                              className="rounded-full text-[11px]"
                            >
                              {(REQUIRED as string[]).includes(mapping[h])
                                ? "Required"
                                : "Optional"}
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="rounded-full text-[11px]"
                            >
                              Ignored
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* right */}
        <div className="space-y-4">
          <Card className="rounded-xl bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-600" /> Validation
              </CardTitle>
              <CardDescription className="text-xs">
                {issues.length
                  ? `${issues.length} issues found`
                  : rows.length
                    ? "No issues yet — click Validate"
                    : "Upload a file to validate"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[260px] overflow-auto">
              {issues.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {rows.length ? "Ready to validate." : "—"}
                </p>
              ) : (
                issues.slice(0, 20).map((iss, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border bg-amber-500/5 border-amber-500/20 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium">
                        Row {iss.row} · {iss.field}
                      </span>
                      <Badge
                        variant="destructive"
                        className="rounded-full text-[11px]"
                      >
                        Error
                      </Badge>
                    </div>
                    <div className="text-xs mt-1">{iss.message}</div>
                    <div className="text-[11px] text-muted-foreground mt-1">
                      Fix: {iss.fix}
                    </div>
                  </div>
                ))
              )}
              {issues.length > 20 ? (
                <div className="text-[11px] text-muted-foreground">
                  + {issues.length - 20} more
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="rounded-xl bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Preview</CardTitle>
              <CardDescription className="text-xs">
                {rows.length
                  ? `${rows.length} rows • ${validCount} valid • ${failCount} failed • ${dupCount} duplicates`
                  : "Parsed products will appear here"}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[320px] overflow-auto">
                <Table>
                  <TableHeader className="bg-muted/40 sticky top-0">
                    <TableRow>
                      <TableHead className="text-xs">#</TableHead>
                      <TableHead className="text-xs">Product</TableHead>
                      <TableHead className="text-xs">SKU</TableHead>
                      <TableHead className="text-xs">Category</TableHead>
                      <TableHead className="text-right text-xs">
                        Price
                      </TableHead>
                      <TableHead className="text-center text-xs">
                        Stock
                      </TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 50).map((r) => {
                      const skuCol = Object.entries(mapping).find(
                        ([, v]) => v === "sku",
                      )?.[0]
                      const nameCol = Object.entries(mapping).find(
                        ([, v]) => v === "product_name",
                      )?.[0]
                      const catCol = Object.entries(mapping).find(
                        ([, v]) => v === "category",
                      )?.[0]
                      const priceCol = Object.entries(mapping).find(
                        ([, v]) => v === "price",
                      )?.[0]
                      const stockCol = Object.entries(mapping).find(
                        ([, v]) => v === "stock",
                      )?.[0]
                      const sku = skuCol ? r[skuCol] : ""
                      const name = nameCol
                        ? r[nameCol]
                        : Object.values(r)[0] as string
                      const cat = catCol ? r[catCol] : ""
                      const price = priceCol ? r[priceCol] : ""
                      const stock = stockCol ? r[stockCol] : ""
                      const hasIssue = issues.some((i) => i.row === r.__row)
                      return (
                        <TableRow
                          key={r.__row}
                          className={
                            hasIssue
                              ? "bg-destructive/5 hover:bg-destructive/5"
                              : ""
                          }
                        >
                          <TableCell className="text-xs text-muted-foreground">
                            {r.__row}
                          </TableCell>
                          <TableCell className="text-xs font-medium truncate max-w-[160px]">
                            {name || "—"}
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {sku || "—"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {cat || "—"}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {price || "—"}
                          </TableCell>
                          <TableCell className="text-center text-xs">
                            {stock || "—"}
                          </TableCell>
                          <TableCell>
                            {hasIssue ? (
                              <Badge
                                variant="destructive"
                                className="rounded-full text-[11px]"
                              >
                                Failed
                              </Badge>
                            ) : (
                              <Badge
                                variant="success"
                                className="rounded-full text-[11px]"
                              >
                                Valid
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {!rows.length ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="py-10 text-center text-xs text-muted-foreground"
                        >
                          No rows yet
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="rounded-xl bg-card">
        <CardContent className="p-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="rounded-full bg-card"
            onClick={doValidate}
          >
            Validate
          </Button>
          <Button size="sm" className="rounded-full" onClick={doImport}>
            Import {label.includes("CSV") ? "CSV" : "Excel"}{" "}
            {rows.length ? `(${rows.length})` : ""}
          </Button>
          <Button size="sm" variant="ghost" onClick={doReset}>
            Reset
          </Button>
          <span className="ml-auto text-xs text-muted-foreground self-center">
            {importedCount ? (
              <>
                <CheckCircle2 className="inline size-3.5 text-emerald-600" />{" "}
                Imported {importedCount} products
              </>
            ) : null}
          </span>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ProductImportScreen() {
  const [tab, setTab] = useState<"csv" | "excel" | "manual">("csv")
  const [manual, setManual] = useState({
    product_name: "",
    sku: "",
    category: "",
    brand: "",
    product_type: "Physical",
    status: "active",
    price: "",
    compare_at: "",
    tax: "GST 18%",
    stock: "",
    low_threshold: "10",
    track: true,
    backorder: false,
    short_desc: "",
    long_desc: "",
    tags: "",
    features: "",
    use_cases: "",
    image_url: "",
    gallery: "",
    shipping_note: "Free delivery 3-5 days",
    return_note: "7-day returns",
    warranty_note: "1 year warranty",
    ai_visible: true,
    ai_searchable: true,
    ai_upsell: true,
    ai_crosssell: true,
    ai_related: true,
    related: "",
  })
  const [manualSaved, setManualSaved] = useState(0)
  const previewPrice = useMemo(() => {
    const p = Number(manual.price.replace(/[,₹]/g, ""))
    return isNaN(p)
      ? "—"
      : new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 0,
        }).format(p)
  }, [manual.price])

  // summary cards derived
  const summary = { total: 18, valid: 14, failed: 4, dup: 2 }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-heading text-[32px] font-semibold leading-[38px] tracking-tight text-foreground">
            Product Import
          </h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Bring products in quickly, validate, fix issues and publish for AI +
            human shopping.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-9 rounded-lg bg-card"
            render={
              <a href="/product-import-template.csv" download>
                <Download className="size-4" /> CSV template
              </a>
            }
          />
          <Button
            variant="outline"
            className="h-9 rounded-lg bg-card"
            render={
              <a href="/product-import-template.xlsx" download>
                <FileSpreadsheet className="size-4" /> Excel template
              </a>
            }
          />
          <Button
            variant="outline"
            className="h-9 rounded-lg bg-card"
            onClick={() =>
              alert("Import history — dummy: last 3 imports show 14/18 valid")
            }
          >
            <History className="size-4" /> Import history
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-xl bg-card p-5 shadow-sm">
          <div className="flex gap-3">
            <div className="hidden size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:flex">
              <Package className="size-4" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">
                Total Imported
              </div>
              <div className="text-2xl font-semibold">{summary.total}</div>
              <div className="text-[11px] text-muted-foreground">
                All rows processed
              </div>
            </div>
          </div>
        </Card>
        <Card className="rounded-xl bg-card p-5 shadow-sm">
          <div className="flex gap-3">
            <div className="hidden size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 sm:flex">
              <CheckCircle2 className="size-4" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">
                Valid Products
              </div>
              <div className="text-2xl font-semibold text-emerald-600">
                {summary.valid}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Ready to publish
              </div>
            </div>
          </div>
        </Card>
        <Card className="rounded-xl bg-card p-5 shadow-sm">
          <div className="flex gap-3">
            <div className="hidden size-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive sm:flex">
              <AlertTriangle className="size-4" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Failed Rows</div>
              <div className="text-2xl font-semibold text-destructive">
                {summary.failed}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Need fixes
              </div>
            </div>
          </div>
        </Card>
        <Card className="rounded-xl bg-card p-5 shadow-sm">
          <div className="flex gap-3">
            <div className="hidden size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 sm:flex">
              <Copy className="size-4" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">
                Duplicates Found
              </div>
              <div className="text-2xl font-semibold text-amber-600">
                {summary.dup}
              </div>
              <div className="text-[11px] text-muted-foreground">
                SKU collisions
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as any)}
        className="w-full"
      >
        <TabsList className="inline-flex h-9 rounded-lg bg-muted p-1">
          <TabsTrigger value="csv" className="rounded-md text-xs">
            <FileText className="size-3.5" /> CSV Import
          </TabsTrigger>
          <TabsTrigger value="excel" className="rounded-md text-xs">
            <FileSpreadsheet className="size-3.5" /> Excel Import
          </TabsTrigger>
          <TabsTrigger value="manual" className="rounded-md text-xs">
            <Package className="size-3.5" /> Manual Add
          </TabsTrigger>
        </TabsList>
        <Separator className="mt-3" />

        <TabsContent value="csv" className="mt-4">
          <ImportWorkspace
            accept=".csv"
            label="Drop CSV here or choose file"
            hint="Supported: .csv • Max 10MB • UTF-8"
            templateHref="/product-import-template.csv"
            templateLabel="Download CSV template"
          />
        </TabsContent>

        <TabsContent value="excel" className="mt-4">
          <ImportWorkspace
            accept=".xlsx,.xls"
            label="Drop Excel here or choose file"
            hint="Supported: .xls / .xlsx • Max 10MB"
            templateHref="/product-import-template.xlsx"
            templateLabel="Download Excel template"
            note="Excel files are best for larger catalogs and detailed product sheets."
          />
        </TabsContent>

        <TabsContent value="manual" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="space-y-4">
              <Card className="rounded-xl bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Basic Details</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Product name *</Label>
                    <Input
                      value={manual.product_name}
                      onChange={(e) =>
                        setManual({ ...manual, product_name: e.target.value })
                      }
                      placeholder="Air Purifier Pro"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">SKU *</Label>
                    <Input
                      value={manual.sku}
                      onChange={(e) =>
                        setManual({ ...manual, sku: e.target.value })
                      }
                      placeholder="SKU-APRO-001"
                      className="h-9 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Category *</Label>
                    <Select
                      value={manual.category}
                      onValueChange={(v: string | null) =>
                        setManual({ ...manual, category: v ?? "" })
                      }
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Home Appliance">
                          Home Appliance
                        </SelectItem>
                        <SelectItem value="Kitchen">Kitchen</SelectItem>
                        <SelectItem value="Electronics">Electronics</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Brand</Label>
                    <Input
                      value={manual.brand}
                      onChange={(e) =>
                        setManual({ ...manual, brand: e.target.value })
                      }
                      placeholder="Razent"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Product type</Label>
                    <Select
                      value={manual.product_type}
                      onValueChange={(v: string | null) =>
                        setManual({ ...manual, product_type: v ?? "" })
                      }
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Physical">Physical</SelectItem>
                        <SelectItem value="Digital">Digital</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Status</Label>
                    <Select
                      value={manual.status}
                      onValueChange={(v: string | null) => setManual({ ...manual, status: v ?? "" })}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-xl bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Pricing</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs">Price (INR) *</Label>
                    <Input
                      value={manual.price}
                      onChange={(e) =>
                        setManual({ ...manual, price: e.target.value })
                      }
                      placeholder="18999"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Compare-at price</Label>
                    <Input
                      value={manual.compare_at}
                      onChange={(e) =>
                        setManual({ ...manual, compare_at: e.target.value })
                      }
                      placeholder="22999"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Tax</Label>
                    <Select
                      value={manual.tax}
                      onValueChange={(v: string | null) => setManual({ ...manual, tax: v ?? "" })}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GST 18%">GST 18%</SelectItem>
                        <SelectItem value="GST 12%">GST 12%</SelectItem>
                        <SelectItem value="No tax">No tax</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Badge
                      variant="secondary"
                      className="rounded-full text-[11px]"
                    >
                      Discount auto-calculated
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-xl bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Inventory</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs">Stock quantity *</Label>
                      <Input
                        value={manual.stock}
                        onChange={(e) =>
                          setManual({ ...manual, stock: e.target.value })
                        }
                        placeholder="42"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Low stock threshold</Label>
                      <Input
                        value={manual.low_threshold}
                        onChange={(e) =>
                          setManual({
                            ...manual,
                            low_threshold: e.target.value,
                          })
                        }
                        placeholder="10"
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <div>
                      <div className="text-sm font-medium">Track inventory</div>
                      <div className="text-xs text-muted-foreground">
                        Deduct stock on order
                      </div>
                    </div>
                    <Switch
                      checked={manual.track}
                      onCheckedChange={(v) =>
                        setManual({ ...manual, track: v })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <div>
                      <div className="text-sm font-medium">Allow backorder</div>
                      <div className="text-xs text-muted-foreground">
                        Sell when out of stock
                      </div>
                    </div>
                    <Switch
                      checked={manual.backorder}
                      onCheckedChange={(v) =>
                        setManual({ ...manual, backorder: v })
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-xl bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Product Content</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs">Short description</Label>
                    <Textarea
                      value={manual.short_desc}
                      onChange={(e) =>
                        setManual({ ...manual, short_desc: e.target.value })
                      }
                      placeholder="One-line summary…"
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Long description</Label>
                    <Textarea
                      value={manual.long_desc}
                      onChange={(e) =>
                        setManual({ ...manual, long_desc: e.target.value })
                      }
                      placeholder="Full details, bullet points…"
                      rows={4}
                      className="text-sm"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs">Tags (comma separated)</Label>
                      <Input
                        value={manual.tags}
                        onChange={(e) =>
                          setManual({ ...manual, tags: e.target.value })
                        }
                        placeholder="purifier, hepa, smart"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Features</Label>
                      <Input
                        value={manual.features}
                        onChange={(e) =>
                          setManual({ ...manual, features: e.target.value })
                        }
                        placeholder="HEPA H13, AQI display"
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Use cases</Label>
                    <Input
                      value={manual.use_cases}
                      onChange={(e) =>
                        setManual({ ...manual, use_cases: e.target.value })
                      }
                      placeholder="bedroom, allergies, small rooms"
                      className="h-9 text-sm"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-xl bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Media</CardTitle>
                  <CardDescription className="text-xs">
                    Upload image file or paste URL — preview updates live
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs">Upload main image</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        className="h-9 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1 file:text-xs file:font-medium file:text-primary-foreground"
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (!f) return
                          const r = new FileReader()
                          r.onload = () =>
                            setManual((m) => ({
                              ...m,
                              image_url: String(r.result),
                            }))
                          r.readAsDataURL(f)
                        }}
                      />
                      <Badge
                        variant="secondary"
                        className="rounded-full text-[11px] shrink-0"
                      >
                        {manual.image_url ? "Ready" : "No file"}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Or image URL</Label>
                    <Input
                      value={
                        manual.image_url.startsWith("data:")
                          ? ""
                          : manual.image_url
                      }
                      onChange={(e) =>
                        setManual({ ...manual, image_url: e.target.value })
                      }
                      placeholder="https://…"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">
                      Gallery URLs (comma separated)
                    </Label>
                    <Input
                      value={manual.gallery}
                      onChange={(e) =>
                        setManual({ ...manual, gallery: e.target.value })
                      }
                      placeholder="https://… , https://…"
                      className="h-9 text-sm"
                    />
                  </div>
                  {manual.image_url ? (
                    <img
                      src={manual.image_url}
                      alt="preview"
                      className="h-32 w-full rounded-lg object-cover border"
                      onError={(e) =>
                        ((e.target as HTMLImageElement).style.display = "none")
                      }
                    />
                  ) : (
                    <div className="flex h-24 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
                      Thumbnail preview — upload or paste URL
                    </div>
                  )}
                  {manual.gallery ? (
                    <div className="grid grid-cols-4 gap-2">
                      {manual.gallery
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean)
                        .slice(0, 4)
                        .map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            alt=""
                            className="h-16 w-full rounded-md object-cover border"
                            onError={(e) =>
                              ((e.target as HTMLImageElement).style.display =
                                "none")
                            }
                          />
                        ))}
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="rounded-xl bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Shipping / Policy</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs">Shipping note</Label>
                    <Input
                      value={manual.shipping_note}
                      onChange={(e) =>
                        setManual({ ...manual, shipping_note: e.target.value })
                      }
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Return note</Label>
                    <Input
                      value={manual.return_note}
                      onChange={(e) =>
                        setManual({ ...manual, return_note: e.target.value })
                      }
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Warranty note</Label>
                    <Input
                      value={manual.warranty_note}
                      onChange={(e) =>
                        setManual({ ...manual, warranty_note: e.target.value })
                      }
                      className="h-9 text-sm"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-xl bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">AI Visibility</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <span className="text-sm">Visible to AI assistant</span>
                    <Switch
                      checked={manual.ai_visible}
                      onCheckedChange={(v) =>
                        setManual({ ...manual, ai_visible: v })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <span className="text-sm">Searchable by AI</span>
                    <Switch
                      checked={manual.ai_searchable}
                      onCheckedChange={(v) =>
                        setManual({ ...manual, ai_searchable: v })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <span className="text-sm">Use in upsell</span>
                    <Switch
                      checked={manual.ai_upsell}
                      onCheckedChange={(v) =>
                        setManual({ ...manual, ai_upsell: v })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <span className="text-sm">Use in cross-sell</span>
                    <Switch
                      checked={manual.ai_crosssell}
                      onCheckedChange={(v) =>
                        setManual({ ...manual, ai_crosssell: v })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <span className="text-sm">Include in related products</span>
                    <Switch
                      checked={manual.ai_related}
                      onCheckedChange={(v) =>
                        setManual({ ...manual, ai_related: v })
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-xl bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Related Products</CardTitle>
                  <CardDescription className="text-xs">
                    Comma-separated SKUs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Label className="text-xs">Related SKUs</Label>
                  <Input
                    value={manual.related}
                    onChange={(e) =>
                      setManual({ ...manual, related: e.target.value })
                    }
                    placeholder="SKU-X1-002, SKU-PS3-003"
                    className="h-9 text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground mt-2">
                    Will be used for compatible accessories, frequently bought
                    together, alternatives.
                  </p>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button
                  className="rounded-full"
                  onClick={() => setManualSaved((s) => s + 1)}
                >
                  Save Product
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full bg-card"
                  onClick={() => {
                    setManualSaved((s) => s + 1)
                    setManual((m) => ({ ...m, product_name: "", sku: "" }))
                  }}
                >
                  Save & Add Another
                </Button>
                <Button
                  variant="ghost"
                  onClick={() =>
                    setManual({
                      product_name: "",
                      sku: "",
                      category: "",
                      brand: "",
                      product_type: "Physical",
                      status: "active",
                      price: "",
                      compare_at: "",
                      tax: "GST 18%",
                      stock: "",
                      low_threshold: "10",
                      track: true,
                      backorder: false,
                      short_desc: "",
                      long_desc: "",
                      tags: "",
                      features: "",
                      use_cases: "",
                      image_url: "",
                      gallery: "",
                      shipping_note: "Free delivery 3-5 days",
                      return_note: "7-day returns",
                      warranty_note: "1 year warranty",
                      ai_visible: true,
                      ai_searchable: true,
                      ai_upsell: true,
                      ai_crosssell: true,
                      ai_related: true,
                      related: "",
                    })
                  }
                >
                  Reset Form
                </Button>
                {manualSaved ? (
                  <span className="text-xs text-emerald-600 self-center ml-auto flex items-center gap-1">
                    <CheckCircle2 className="size-3.5" /> Saved {manualSaved}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="space-y-4">
              <Card className="rounded-xl bg-card sticky top-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Eye className="size-4" /> Live preview
                  </CardTitle>
                  <CardDescription className="text-xs">
                    How it will appear in Products + AI
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="aspect-[4/3] overflow-hidden rounded-lg border bg-muted flex items-center justify-center">
                    {manual.image_url ? (
                      <img
                        src={manual.image_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        No image
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-semibold truncate">
                      {manual.product_name || "Product name"}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {manual.category || "Category"} ·{" "}
                      {manual.brand || "Brand"}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold">
                      {previewPrice}
                    </span>
                    <Badge
                      variant={
                        manual.status === "active" ? "success" : "secondary"
                      }
                      className="rounded-full text-[11px] capitalize"
                    >
                      {manual.status}
                    </Badge>
                  </div>
                  <Separator />
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">SKU</span>
                      <span className="font-mono">{manual.sku || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Stock</span>
                      <span>{manual.stock || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        AI visibility
                      </span>
                      <span>{manual.ai_visible ? "Visible" : "Hidden"}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(manual.tags
                      ? manual.tags
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean)
                      : ["tag1", "tag2"]
                    )
                      .slice(0, 4)
                      .map((t) => (
                        <Badge
                          key={t}
                          variant="secondary"
                          className="rounded-full text-[11px]"
                        >
                          {t}
                        </Badge>
                      ))}
                  </div>
                </CardContent>
              </Card>
              <Card className="rounded-xl bg-card border-primary/20">
                <CardContent className="p-4 text-xs leading-5 text-muted-foreground">
                  <p className="font-medium text-foreground">Tips</p>
                  <ul className="list-disc pl-4 mt-1 space-y-1">
                    <li>Keep SKU unique — used for AI related products.</li>
                    <li>Price is in INR, no symbols needed.</li>
                    <li>Use high-quality https image URLs.</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
