import {
  XIcon,
  PencilIcon,
  CopyIcon,
  ArchiveIcon,
  ExternalLinkIcon,
  MoreHorizontalIcon,
  PackageIcon,
  TagIcon,
  TruckIcon,
  ShieldCheckIcon,
  BotIcon,
  SparklesIcon,
  EyeIcon,
  ShoppingCartIcon,
  TrendingUpIcon,
  ClockIcon,
  CheckIcon,
  CircleIcon,
  AlertTriangleIcon,
  BoxIcon,
  LayersIcon,
} from "lucide-react"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatPrice } from "@/lib/types/product"
import type { Product } from "@/lib/types/product"

interface ProductDrawerProps {
  open: boolean
  onClose: () => void
  product: Product | null
}

function getSku(p: Product): string {
  const any = p as unknown as Record<string, string>
  if (any.sku) return any.sku
  const raw = p.id.replace(/^prod_/, "").slice(0, 6).toUpperCase().padEnd(4, "0")
  return `SKU-${raw}`
}

function stockBadge(stock: number, status: string) {
  if (status === "archived") return { label: "Archived", variant: "secondary" as const }
  if (stock === 0) return { label: "Out of stock", variant: "destructive" as const }
  if (stock <= 10) return { label: "Low stock", variant: "warning" as const }
  if (status === "draft") return { label: "Draft", variant: "secondary" as const }
  return { label: "Active", variant: "success" as const }
}

export default function ProductDrawer({ open, onClose, product }: ProductDrawerProps) {
  if (!product) {
    return (
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent showCloseButton={false} className="w-[560px] max-w-[96vw] overflow-y-auto p-0">
          <div className="flex items-center justify-between border-b px-6 py-5 sticky top-0 bg-popover z-10">
            <SheetTitle className="text-lg">Product Details</SheetTitle>
            <Button variant="outline" size="icon-sm" onClick={onClose} aria-label="Close">
              <XIcon className="size-4" />
            </Button>
          </div>
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">No product selected.</div>
        </SheetContent>
      </Sheet>
    )
  }

  const sku = getSku(product)
  const badge = stockBadge(product.stock, product.status)
  const updated = new Date(product.updated_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
  const brand = "Razent Labs"
  const compareAt = product.price_paise + Math.round(product.price_paise * 0.18)
  const discountPct = Math.round(((compareAt - product.price_paise) / compareAt) * 100)

  // deterministic helpers
  const hash = product.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0)
  const reserved = hash % 4
  const available = Math.max(0, product.stock - reserved)
  const weight = `${(0.6 + (hash % 7) * 0.2).toFixed(1)} kg`
  const size = `28 × 22 × 18 cm`
  const warehouse = `WH-BLR-0${1 + (hash % 3)} · Bangalore`

  const variants = [
    { name: `${product.title} — Standard`, sku: `${sku}-STD`, price: product.price_paise, stock: product.stock, status: product.status },
    { name: `${product.title} — Pro`, sku: `${sku}-PRO`, price: product.price_paise + 250000, stock: Math.max(0, product.stock - 5), status: product.status },
  ]

  const aiTags = [...product.tags, "home appliance", "budget-friendly", "energy efficient"].slice(0, 6)

  const activity = [
    { event: "Product created", time: "18 May 2025, 09:12 AM", actor: "merchant", note: "Imported via Product Import", icon: BoxIcon },
    { event: "Price changed", time: "20 May 2025, 02:30 PM", actor: "merchant", note: `${formatPrice(compareAt)} → ${formatPrice(product.price_paise)}`, icon: TagIcon },
    { event: "Stock changed", time: "22 May 2025, 11:05 AM", actor: "system", note: `Stock set to ${product.stock}`, icon: LayersIcon },
    { event: "AI recommended product", time: "27 May 2025, 10:24 AM", actor: "AI Assistant", note: "Shown in conversation #1024", icon: BotIcon, link: "View conversation" },
    { event: "Product added to cart", time: "27 May 2025, 10:25 AM", actor: "customer", note: "Ananya Rao · qty 1", icon: ShoppingCartIcon, link: "View order" },
    { event: "Order created", time: "27 May 2025, 10:28 AM", actor: "system", note: "Razorpay Order rzp_AB12CD", icon: CheckIcon, link: "View order" },
    { event: "Product purchased", time: "27 May 2025, 10:31 AM", actor: "customer", note: "Payment successful", icon: CheckIcon },
  ]

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[560px] max-w-[96vw] overflow-hidden p-0 flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b bg-popover px-6 py-5 shrink-0">
          <div className="flex gap-3 min-w-0">
            <img src={product.image_url} alt={product.title} className="size-11 rounded-lg object-cover ring-1 ring-border/50 shrink-0" />
            <div className="min-w-0">
              <SheetTitle className="text-base leading-tight truncate pr-2">{product.title}</SheetTitle>
              <p className="text-xs text-muted-foreground truncate">{product.category} · {product.description.slice(0, 36)}…</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <Badge variant={badge.variant} className="rounded-full px-2 py-0 text-[11px] capitalize">
                  {badge.label}
                </Badge>
                <span className="text-[11px] text-muted-foreground">Updated {updated}</span>
              </div>
            </div>
          </div>
          <Button variant="outline" size="icon-sm" onClick={onClose} aria-label="Close" className="shrink-0">
            <XIcon className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Top Summary */}
          <div className="px-6 py-4">
            <div className="flex gap-4">
              <img src={product.image_url} alt={product.title} className="size-[84px] rounded-xl object-cover ring-1 ring-border/40 shrink-0" />
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-foreground leading-tight">{product.title}</h3>
                <p className="mt-1 line-clamp-2 text-xs leading-4 text-muted-foreground">{product.description}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="rounded-full text-[11px] font-mono">{sku}</Badge>
                  <Badge variant="outline" className="rounded-full text-[11px]">{product.category}</Badge>
                  <Badge variant={product.stock === 0 ? "destructive" : product.stock <= 10 ? "warning" : "success"} className="rounded-full text-[11px]">
                    {product.stock} in stock
                  </Badge>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-lg font-semibold tabular-nums text-foreground">{formatPrice(product.price_paise)}</div>
                <div className="text-xs text-muted-foreground line-through">{formatPrice(compareAt)}</div>
                <Badge variant="success" className="mt-1 rounded-full text-[11px]">Visible</Badge>
              </div>
            </div>
          </div>

          {/* Quick Action Row */}
          <div className="flex flex-wrap gap-2 px-6 pb-4">
            <Button size="sm" className="h-8 rounded-lg">
              <PencilIcon className="size-3.5" /> Edit Product
            </Button>
            <Button variant="outline" size="sm" className="h-8 rounded-lg bg-card">
              <CopyIcon className="size-3.5" /> Duplicate
            </Button>
            <Button variant="outline" size="sm" className="h-8 rounded-lg bg-card">
              <ArchiveIcon className="size-3.5" /> Archive
            </Button>
            <Button variant="outline" size="sm" className="h-8 rounded-lg bg-card">
              <ExternalLinkIcon className="size-3.5" /> View on Store
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="h-8 rounded-lg bg-card" />}>
                <MoreHorizontalIcon className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(sku)}>Copy SKU</DropdownMenuItem>
                <DropdownMenuItem>Download images</DropdownMenuItem>
                <DropdownMenuItem variant="destructive">Delete product</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Separator />

          {/* Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <div className="sticky top-0 z-10 bg-popover border-b px-6">
              <TabsList className="w-full justify-start rounded-none border-0 bg-transparent p-0 h-auto gap-6">
                <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent bg-transparent px-0 py-3 text-sm font-medium shadow-none data-[selected]:border-primary data-[selected]:text-foreground data-[selected]:shadow-none aria-[selected=true]:border-primary aria-[selected=true]:text-foreground text-muted-foreground">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="inventory" className="rounded-none border-b-2 border-transparent bg-transparent px-0 py-3 text-sm font-medium shadow-none data-[selected]:border-primary data-[selected]:text-foreground data-[selected]:shadow-none aria-[selected=true]:border-primary aria-[selected=true]:text-foreground text-muted-foreground">
                  Inventory
                </TabsTrigger>
                <TabsTrigger value="ai" className="rounded-none border-b-2 border-transparent bg-transparent px-0 py-3 text-sm font-medium shadow-none data-[selected]:border-primary data-[selected]:text-foreground data-[selected]:shadow-none aria-[selected=true]:border-primary aria-[selected=true]:text-foreground text-muted-foreground">
                  AI & Visibility
                </TabsTrigger>
                <TabsTrigger value="activity" className="rounded-none border-b-2 border-transparent bg-transparent px-0 py-3 text-sm font-medium shadow-none data-[selected]:border-primary data-[selected]:text-foreground data-[selected]:shadow-none aria-[selected=true]:border-primary aria-[selected=true]:text-foreground text-muted-foreground">
                  Activity
                </TabsTrigger>
              </TabsList>
            </div>

            {/* OVERVIEW */}
            <TabsContent value="overview" className="mt-0 space-y-4 p-6">
              <Card className="rounded-xl bg-card shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Basic Details</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 text-xs">
                  <Field label="Product name" value={product.title} />
                  <Field label="SKU" value={sku} mono />
                  <Field label="Category" value={product.category} />
                  <Field label="Brand" value={brand} />
                  <Field label="Product type" value="Physical · Shippable" />
                  <Field label="Status" value={<Badge variant={badge.variant} className="rounded-full text-[11px] capitalize">{badge.label}</Badge>} />
                  <Field label="Visibility" value="Visible to customers" />
                  <Field label="Created" value={new Date(product.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} />
                </CardContent>
              </Card>

              <Card className="rounded-xl bg-card shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Pricing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Price</span><span className="font-semibold text-foreground">{formatPrice(product.price_paise)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Compare-at price</span><span className="font-medium text-muted-foreground line-through">{formatPrice(compareAt)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="font-medium text-emerald-600">{discountPct}% off · Save {formatPrice(compareAt - product.price_paise)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span className="font-medium">GST 18% · Inclusive</span></div>
                  <Separator />
                  <p className="text-[11px] text-muted-foreground">Razorpay will settle {formatPrice(product.price_paise)} per unit. Compare-at shown struck-through on store.</p>
                </CardContent>
              </Card>

              <Card className="rounded-xl bg-card shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Description</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs leading-5 text-muted-foreground">{product.description}</p>
                  <ul className="list-disc pl-5 text-xs leading-5 text-foreground space-y-1">
                    <li>Covers up to 450 sq. ft · HEPA H13 + carbon filter</li>
                    <li>Real-time AQI display · auto & sleep modes</li>
                    <li>App control · filter change alerts · 1-yr warranty</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="rounded-xl bg-card shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Product media</CardTitle>
                  <CardDescription className="text-xs">Main image + thumbnails</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <img src={product.image_url} alt={product.title} className="h-48 w-full rounded-lg object-cover ring-1 ring-border/40" />
                  <div className="flex gap-2">
                    {[0, 1, 2].map((i) => (
                      <img key={i} src={product.image_url} alt="" className={`size-14 rounded-md object-cover ring-1 ${i === 0 ? "ring-primary" : "ring-border/30 opacity-70"}`} />
                    ))}
                    <Button variant="outline" size="sm" className="h-14 rounded-md bg-card px-3 text-xs">
                      <EyeIcon className="size-3.5" /> View
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-xl bg-card shadow-none border-primary/20">
                <CardContent className="p-4 space-y-2 text-xs">
                  <div className="flex gap-2"><TruckIcon className="size-4 text-emerald-600 shrink-0 mt-0.5" /><span><b>Free delivery</b> · 3–5 days · COD available</span></div>
                  <div className="flex gap-2"><ShieldCheckIcon className="size-4 text-primary shrink-0 mt-0.5" /><span><b>1 year warranty</b> · easy 7-day returns</span></div>
                  <div className="flex gap-2"><PackageIcon className="size-4 text-muted-foreground shrink-0 mt-0.5" /><span>Support: help@merchant.store · 10am–6pm IST</span></div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* INVENTORY */}
            <TabsContent value="inventory" className="mt-0 space-y-4 p-6">
              <Card className="rounded-xl bg-card shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Inventory summary</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1"><div className="text-muted-foreground">Current stock</div><div className="text-lg font-semibold text-foreground">{product.stock}</div></div>
                  <div className="space-y-1"><div className="text-muted-foreground">Available</div><div className="text-lg font-semibold text-emerald-600">{available}</div></div>
                  <div className="space-y-1"><div className="text-muted-foreground">Reserved</div><div className="font-medium">{reserved}</div></div>
                  <div className="space-y-1"><div className="text-muted-foreground">Low stock threshold</div><div className="font-medium">10 units</div></div>
                  <div className="col-span-2 flex items-center gap-2 pt-1">
                    <Badge variant={badge.variant} className="rounded-full text-[11px]">{badge.label}</Badge>
                    <span className="text-muted-foreground">SKU {sku}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-xl bg-card shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Inventory controls</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div><div className="text-sm font-medium">In stock</div><div className="text-xs text-muted-foreground">Show as purchasable</div></div>
                    <Switch defaultChecked={product.stock > 0} />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div><div className="text-sm font-medium">Track inventory</div><div className="text-xs text-muted-foreground">Deduct on order</div></div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div><div className="text-sm font-medium">Allow backorder</div><div className="text-xs text-muted-foreground">Sell when out of stock</div></div>
                    <Switch />
                  </div>
                  <Button variant="outline" size="sm" className="w-full rounded-lg bg-card">Adjust stock</Button>
                </CardContent>
              </Card>

              <Card className="rounded-xl bg-card shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Variants</CardTitle>
                  <CardDescription className="text-xs">{variants.length} variants</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow className="hover:bg-muted/40">
                        <TableHead className="text-xs">Variant</TableHead>
                        <TableHead className="text-xs">SKU</TableHead>
                        <TableHead className="text-right text-xs">Price</TableHead>
                        <TableHead className="text-center text-xs">Stock</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {variants.map((v) => (
                        <TableRow key={v.sku} className="hover:bg-muted/30">
                          <TableCell className="text-xs font-medium max-w-[160px] truncate">{v.name}</TableCell>
                          <TableCell className="font-mono text-[11px] text-muted-foreground">{v.sku}</TableCell>
                          <TableCell className="text-right text-xs font-medium">{formatPrice(v.price)}</TableCell>
                          <TableCell className="text-center text-xs">{v.stock}</TableCell>
                          <TableCell><Badge variant={v.status === "active" ? "success" : "secondary"} className="rounded-full text-[11px] capitalize">{v.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className="rounded-xl bg-card shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Fulfillment notes</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 text-xs">
                  <Field label="Shipping weight" value={weight} />
                  <Field label="Package size" value={size} />
                  <Field label="Warehouse" value={warehouse} />
                  <Field label="HSN" value="8421.39.00" />
                </CardContent>
              </Card>
            </TabsContent>

            {/* AI & VISIBILITY */}
            <TabsContent value="ai" className="mt-0 space-y-4 p-6">
              <Card className="rounded-xl bg-card shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2"><SparklesIcon className="size-4 text-primary" /> AI Visibility</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between"><span className="text-sm">Visible to AI assistant</span><Switch defaultChecked /></div>
                  <div className="flex items-center justify-between"><span className="text-sm">Searchable by AI</span><Switch defaultChecked /></div>
                  <div className="flex items-center justify-between"><span className="text-sm">Recommended in upsell</span><Switch defaultChecked /></div>
                  <div className="flex items-center justify-between"><span className="text-sm">Used in cross-sell</span><Switch defaultChecked /></div>
                  <div className="flex items-center justify-between"><span className="text-sm">Hidden from AI</span><Switch /></div>
                </CardContent>
              </Card>

              <Card className="rounded-xl bg-card shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">AI Tags / Signals</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {aiTags.map((t) => (
                      <Badge key={t} variant="secondary" className="rounded-full text-[11px]">{t}</Badge>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Best for:</span> <span className="font-medium">bedroom · small rooms</span></div>
                    <div><span className="text-muted-foreground">Use cases:</span> <span className="font-medium">allergies · dust · AQI 150+</span></div>
                    <div className="col-span-2"><span className="text-muted-foreground">Related queries:</span> <span className="font-medium">“purifier under ₹20k”, “HEPA + carbon”</span></div>
                    <div className="col-span-2"><span className="text-muted-foreground">Compatible:</span> <span className="font-medium">HEPA Replacement · Carbon Filter · AQM</span></div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-xl bg-card shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Recommendation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div><span className="font-medium">Related products:</span> <span className="text-muted-foreground">CleanAir X1 · PureSense 300</span></div>
                  <div><span className="font-medium">Frequently bought together:</span> <span className="text-muted-foreground">HEPA Filter + Carbon Filter</span></div>
                  <div><span className="font-medium">Better alternative:</span> <span className="text-muted-foreground">CleanAir X1 (higher CADR)</span></div>
                  <div><span className="font-medium">Premium alternative:</span> <span className="text-muted-foreground">PureSense 300 · {formatPrice(product.price_paise + 800000)}</span></div>
                </CardContent>
              </Card>

              <Card className="rounded-xl bg-card shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">AI prompt examples</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div className="rounded-lg bg-muted/40 px-3 py-2">“Show me air purifiers under ₹20,000”</div>
                  <div className="rounded-lg bg-muted/40 px-3 py-2">“Compare this with other models”</div>
                  <div className="rounded-lg bg-muted/40 px-3 py-2">“What is the best option for small rooms?”</div>
                </CardContent>
              </Card>

              <Card className="rounded-xl bg-card shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">AI performance</CardTitle>
                  <CardDescription className="text-xs">Last 14 days · from AI conversations</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                  <KpiMini icon={<EyeIcon className="size-3.5" />} label="Views from AI" value={`${42 + (hash % 18)}`} sub="Impressions" />
                  <KpiMini icon={<ShoppingCartIcon className="size-3.5" />} label="Adds to cart" value={`${11 + (hash % 7)}`} sub="From AI" />
                  <KpiMini icon={<TrendingUpIcon className="size-3.5" />} label="Orders from AI" value={`${4 + (hash % 5)}`} sub={formatPrice(product.price_paise * (2 + (hash % 3)))} />
                  <KpiMini icon={<TrendingUpIcon className="size-3.5" />} label="Conversion" value={`${(8 + (hash % 9)).toFixed(1)}%`} sub="AI → order" />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ACTIVITY */}
            <TabsContent value="activity" className="mt-0 p-6">
              <Card className="rounded-xl bg-card shadow-none">
                <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm flex items-center gap-2"><ClockIcon className="size-4" /> Activity</CardTitle>
                  <Button variant="outline" size="sm" className="h-7 rounded-lg bg-card text-xs">View audit trail</Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="relative ml-6 border-l border-border/60 pl-6 py-2 space-y-5">
                    {activity.map((a) => (
                      <div key={a.event + a.time} className="relative">
                        <span className="absolute -left-[29px] top-0.5 flex size-5 items-center justify-center rounded-full bg-muted border border-border text-muted-foreground">
                          <a.icon className="size-3" />
                        </span>
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="text-sm font-medium text-foreground">{a.event}</span>
                          <span className="text-[11px] text-muted-foreground">{a.time}</span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs">
                          <Badge variant="outline" className="rounded-full text-[11px] capitalize">{a.actor}</Badge>
                          <span className="text-muted-foreground">{a.note}</span>
                        </div>
                        {a.link ? (
                          <button className="mt-1 text-xs font-medium text-primary hover:underline">{a.link} →</button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Bottom actions */}
        <div className="flex gap-2 border-t bg-popover px-6 py-4 shrink-0">
          <Button className="flex-1 rounded-lg">
            <PencilIcon className="size-4" /> Edit Product
          </Button>
          <Button variant="outline" className="rounded-lg bg-card" onClick={onClose}>
            Close
          </Button>
          <Button variant="outline" className="rounded-lg bg-card text-destructive hover:text-destructive">
            <ArchiveIcon className="size-4" /> Archive
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Field({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-sm ${mono ? "font-mono text-xs" : "font-medium"} text-foreground`}>{value}</div>
    </div>
  )
}

function KpiMini({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">{icon}</span>
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold leading-none text-foreground">{value}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>
    </div>
  )
}
