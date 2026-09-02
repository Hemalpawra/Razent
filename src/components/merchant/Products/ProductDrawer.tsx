"use client" // Mobile handling happens in ProductsScreen

// deterministic helpers
/* Header */ /* Tabs */ /* OVERVIEW */ /* INVENTORY */ /* AI & VISIBILITY */ /* ACTIVITY */ /* Bottom actions */

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
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useIsMobile } from "@/hooks/use-mobile"
import { formatPrice } from "@/lib/types/product"
import type { Product } from "@/lib/types/product"
import { useUI } from "@/state/useUI"

interface ProductDrawerProps {
  open: boolean
  onClose: () => void
  product: Product | null
}

function getSku(p: Product): string {
  const any = p as unknown as Record<string, string>
  if (any.sku) return any.sku
  const raw = p.id
    .replace(/^prod_/, "")
    .slice(0, 6)
    .toUpperCase()
    .padEnd(4, "0")
  return `SKU-${raw}`
}

function stockBadge(stock: number, status: string) {
  if (
    status ===
    "archived"
  )
    return { label: "Archived", variant: "secondary" as const }
  if (
    stock ===
    0
  )
    return { label: "Out of stock", variant: "destructive" as const }
  if (
    stock <=
    10
  )
    return { label: "Low stock", variant: "warning" as const }
  if (
    status ===
    "draft"
  )
    return { label: "Draft", variant: "secondary" as const }
  return { label: "Active", variant: "success" as const }
}

export default function ProductDrawer({
  open,
  onClose,
  product,
}: ProductDrawerProps) {
  const isMobile = useIsMobile()
  const setActiveScreen = useUI((s) => s.setActiveScreen)

  if (isMobile) {
    return null
  }

  if (!product) {
    return (
      <Drawer
        open={open}
        onOpenChange={(o) =>
          !o &&
          onClose()
        }
      >
        <DrawerContent className="p-6">
          <DrawerHeader>
            <DrawerTitle className="text-lg">Product Details</DrawerTitle>
            <DrawerDescription>No product selected.</DrawerDescription>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted/30"
              onClick={onClose}
              aria-label="Close"
            >
              <XIcon className="size-4" />
            </Button>
          </DrawerHeader>
        </DrawerContent>
      </Drawer>
    )
  }

  const sku = getSku(product)
  const badge = stockBadge(product.stock, product.status)
  const updated = new Date(product.updated_at).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  })
  const brand = "Razent Labs"
  const compareAt =
    product.price_paise +
    Math.round(
      product.price_paise *
        0.18,
    )
  const discountPct = Math.round(
    ((compareAt - product.price_paise) / compareAt) * 100,
  )
  const hash = product.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0)
  const reserved = hash % 4
  const available = Math.max(0, product.stock - reserved)
  const weight = `${(0.6 + (hash % 7) * 0.2).toFixed(1)} kg`
  const size = `28 × 22 × 18 cm`
  const warehouse = `WH-BLR-0${1 + (hash % 3)} · Bangalore`

  const variants = [
    {
      name: `${product.title} — Standard`,
      sku: `${sku}-STD`,
      price: product.price_paise,
      stock: product.stock,
      status: product.status,
    },
    {
      name: `${product.title} — Pro`,
      sku: `${sku}-PRO`,
      price: product.price_paise + 250000,
      stock: Math.max(0, product.stock - 5),
      status: product.status,
    },
  ]

  const aiTags = [
    ...product.tags,
    "home appliance",
    "budget-friendly",
    "energy efficient",
  ].slice(0, 6)

  const activity = [
    {
      event: "Product created",
      time: "18 May 2025, 09:12 AM",
      actor: "merchant",
      note: "Imported via Product Import",
      icon: BoxIcon,
    },
    {
      event: "Price changed",
      time: "20 May 2025, 02:30 PM",
      actor: "merchant",
      note: `${formatPrice(compareAt)} → ${formatPrice(product.price_paise)}`,
      icon: TagIcon,
    },
    {
      event: "Stock changed",
      time: "22 May 2025, 11:05 AM",
      actor: "system",
      note: `Stock set to ${product.stock}`,
      icon: LayersIcon,
    },
    {
      event: "AI recommended product",
      time: "27 May 2025, 10:24 AM",
      actor: "AI Assistant",
      note: "Shown in conversation #1024",
      icon: BotIcon,
      link: "View conversation",
    },
    {
      event: "Product added to cart",
      time: "27 May 2025, 10:25 AM",
      actor: "customer",
      note: "Ananya Rao · qty 1",
      icon: ShoppingCartIcon,
      link: "View order",
    },
    {
      event: "Order created",
      time: "27 May 2025, 10:28 AM",
      actor: "system",
      note: "Razorpay Order rzp_AB12CD",
      icon: CheckIcon,
      link: "View order",
    },
    {
      event: "Product purchased",
      time: "27 May 2025, 10:31 AM",
      actor: "customer",
      note: "Payment successful",
      icon: CheckIcon,
    },
  ]

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="p-6">
        <DrawerHeader>
          <DrawerTitle className="text-lg font-heading font-medium tracking-tight">
            Product Details
          </DrawerTitle>
          <DrawerDescription>Product #{product?.id}</DrawerDescription>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted/30"
            onClick={onClose}
            aria-label="Close"
          >
            <XIcon className="size-4" />
          </Button>
        </DrawerHeader>

        <div className="mt-6">
          {}
          <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-4">
            <div className="flex gap-3 min-w-0">
              <img
                src={product.image_url}
                alt={product.title}
                className="size-10 rounded-lg object-cover ring-1 ring-border/50 shrink-0"
              />
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-foreground truncate">
                  {product.title}
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  {product.category} · {product.description.slice(0, 36)}…
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Badge
                    variant={badge.variant}
                    className="rounded-full px-2 py-0 text-[11px] capitalize"
                  >
                    {badge.label}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">
                    Updated {updated}
                  </span>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="shrink-0 p-1 rounded-md hover:bg-muted/30"
            >
              <XIcon className="size-4" />
            </Button>
          </div>

          {}
          <div className="space-y-4">
            <Tabs defaultValue="overview" className="w-full">
              <div className="sticky top-0 z-10 bg-popover border-b px-4">
                <TabsList className="w-full justify-start rounded-none border-0 bg-transparent p-0 h-auto gap-4">
                  <TabsTrigger
                    value="overview"
                    className="rounded-none border-b-2 border-transparent bg-transparent px-0 py-2 text-sm font-medium shadow-none data-[selected]:border-primary data-[selected]:text-foreground data-[selected]:shadow-none aria-[selected=true]:border-primary aria-[selected=true]:text-foreground text-muted-foreground"
                  >
                    Overview
                  </TabsTrigger>
                  <TabsTrigger
                    value="inventory"
                    className="rounded-none border-b-2 border-transparent bg-transparent px-0 py-2 text-sm font-medium shadow-none data-[selected]:border-primary data-[selected]:text-foreground data-[selected]:shadow-none aria-[selected=true]:border-primary aria-[selected=true]:text-foreground text-muted-foreground"
                  >
                    Inventory
                  </TabsTrigger>
                  <TabsTrigger
                    value="ai"
                    className="rounded-none border-b-2 border-transparent bg-transparent px-0 py-2 text-sm font-medium shadow-none data-[selected]:border-primary data-[selected]:text-foreground data-[selected]:shadow-none aria-[selected=true]:border-primary aria-[selected=true]:text-foreground text-muted-foreground"
                  >
                    AI & Visibility
                  </TabsTrigger>
                  <TabsTrigger
                    value="activity"
                    className="rounded-none border-b-2 border-transparent bg-transparent px-0 py-2 text-sm font-medium shadow-none data-[selected]:border-primary data-[selected]:text-foreground data-[selected]:shadow-none aria-[selected=true]:border-primary aria-[selected=true]:text-foreground text-muted-foreground"
                  >
                    Activity
                  </TabsTrigger>
                </TabsList>
              </div>

              {}
              <TabsContent value="overview" className="mt-0 space-y-6 p-4">
                <Card className="rounded-xl bg-card shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Basic Details</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Product name</div>
                      <div className="text-sm font-medium">{product.title}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">SKU</div>
                      <div className="font-mono text-xs">{sku}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Category</div>
                      <div className="text-xs">{product.category}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Brand</div>
                      <div className="text-xs">{brand}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Product type</div>
                      <div className="text-xs">Physical · Shippable</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Status</div>
                      <Badge
                        variant={badge.variant}
                        className="rounded-full text-[11px] capitalize"
                      >
                        {badge.label}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Visibility</div>
                      <div className="text-xs">Visible to customers</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Created</div>
                      <div className="text-xs">
                        {new Date(product.created_at).toLocaleDateString(
                          "en-IN",
                          { day: "2-digit", month: "short", year: "numeric" },
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-xl bg-card shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Pricing</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Price</span>
                      <span className="font-semibold text-foreground">
                        {formatPrice(product.price_paise)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Compare-at price
                      </span>
                      <span className="font-medium text-muted-foreground line-through">
                        {formatPrice(compareAt)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Discount</span>
                      <span className="font-medium text-emerald-600">
                        {discountPct}% off · Save{" "}
                        {formatPrice(compareAt - product.price_paise)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax</span>
                      <span className="font-medium">GST 18% · Inclusive</span>
                    </div>
                    <Separator />
                    <p className="text-[11px] text-muted-foreground">
                      Razorpay will settle {formatPrice(product.price_paise)}{" "}
                      per unit. Compare-at shown struck-through on store.
                    </p>
                  </CardContent>
                </Card>

                <Card className="rounded-xl bg-card shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Description</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-xs leading-5 text-muted-foreground">
                      {product.description}
                    </p>
                    <ul className="list-disc pl-5 text-xs leading-5 text-foreground space-y-1">
                      <li>
                        Covers up to 450 sq. ft · HEPA H13 + carbon filter
                      </li>
                      <li>Real-time AQI display · auto & sleep modes</li>
                      <li>
                        App control · filter change alerts · 1-yr warranty
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="rounded-xl bg-card shadow-none border-primary/20">
                  <CardContent className="p-4 space-y-2 text-xs">
                    <div className="flex gap-2">
                      <TruckIcon className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>
                        <b>Free delivery</b> · 3–5 days · COD available
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <ShieldCheckIcon className="size-4 text-primary shrink-0 mt-0.5" />
                      <span>
                        <b>1 year warranty</b> · easy 7-day returns
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <PackageIcon className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span>Support: help@merchant.store · 10am–6pm IST</span>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {}
              <TabsContent value="inventory" className="mt-0 space-y-6 p-4">
                <Card className="rounded-xl bg-card shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Inventory summary</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Current stock</div>
                      <div className="text-lg font-semibold text-foreground">
                        {product.stock}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Available</div>
                      <div className="text-lg font-semibold text-emerald-600">
                        {available}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Reserved</div>
                      <div className="font-medium">{reserved}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">
                        Low stock threshold
                      </div>
                      <div className="font-medium">10 units</div>
                    </div>
                    <div className="col-span-2 flex items-center gap-2 pt-1">
                      <Badge
                        variant={badge.variant}
                        className="rounded-full text-[11px]"
                      >
                        {badge.label}
                      </Badge>
                      <span className="text-muted-foreground">SKU {sku}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-xl bg-card shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      Inventory controls
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">In stock</div>
                        <div className="text-xs text-muted-foreground">
                          Show as purchasable
                        </div>
                      </div>
                      <Switch defaultChecked={product.stock > 0} />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">
                          Track inventory
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Deduct on order
                        </div>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">
                          Allow backorder
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Sell when out of stock
                        </div>
                      </div>
                      <Switch />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full rounded-lg bg-card"
                    >
                      Adjust stock
                    </Button>
                  </CardContent>
                </Card>

                <Card className="rounded-xl bg-card shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Variants</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow className="hover:bg-muted/40">
                          <TableHead className="text-xs">Variant</TableHead>
                          <TableHead className="text-xs">SKU</TableHead>
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
                        {variants.map((v) => (
                          <TableRow key={v.sku} className="hover:bg-muted/30">
                            <TableCell className="text-xs font-medium max-w-[160px] truncate">
                              {v.name}
                            </TableCell>
                            <TableCell className="font-mono text-[11px] text-muted-foreground">
                              {v.sku}
                            </TableCell>
                            <TableCell className="text-right text-xs font-medium">
                              {formatPrice(v.price)}
                            </TableCell>
                            <TableCell className="text-center text-xs">
                              {v.stock}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  v.status === "active"
                                    ? "success"
                                    : "secondary"
                                }
                                className="rounded-full text-[11px] capitalize"
                              >
                                {v.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card className="rounded-xl bg-card shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Fulfillment notes</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="text-muted-foreground">
                        Shipping weight
                      </div>
                      <div className="text-sm">{weight}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Package size</div>
                      <div className="text-sm">{size}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Warehouse</div>
                      <div className="text-sm">{warehouse}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">HSN</div>
                      <div className="text-sm">8421.39.00</div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {}
              <TabsContent value="ai" className="mt-0 space-y-6 p-4">
                <Card className="rounded-xl bg-card shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <SparklesIcon className="size-4 text-primary" /> AI
                      Visibility
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Visible to AI assistant</span>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Searchable by AI</span>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Recommended in upsell</span>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Used in cross-sell</span>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Hidden from AI</span>
                      <Switch />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-xl bg-card shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">AI Tags / Signals</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      {aiTags.map((t) => (
                        <Badge
                          key={t}
                          variant="secondary"
                          className="rounded-full text-[11px]"
                        >
                          {t}
                        </Badge>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Best for:</span>{" "}
                        <span className="font-medium">
                          bedroom · small rooms
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Use cases:
                        </span>{" "}
                        <span className="font-medium">
                          allergies · dust · AQI 150+
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">
                          Related queries:
                        </span>{" "}
                        <span className="font-medium">
                          “purifier under ₹20k”, “HEPA + carbon”
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">
                          Compatible:
                        </span>{" "}
                        <span className="font-medium">
                          HEPA Replacement · Carbon Filter · AQM
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-xl bg-card shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      AI prompt examples
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <div className="rounded-lg bg-muted/40 px-3 py-2">
                      “Show me air purifiers under ₹20,000”
                    </div>
                    <div className="rounded-lg bg-muted/40 px-3 py-2">
                      “Compare this with other models”
                    </div>
                    <div className="rounded-lg bg-muted/40 px-3 py-2">
                      “What is the best option for small rooms?”
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-xl bg-card shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">AI performance</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border bg-card p-3">
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                        <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <EyeIcon className="size-3.5" />
                        </span>
                        Views from AI
                        <div className="mt-2 text-lg font-semibold leading-none text-foreground">
                          ${42 + (hash % 18)}
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          Impressions
                        </div>
                      </div>
                    </div>
                    <div className="rounded-lg border bg-card p-3">
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                        <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <ShoppingCartIcon className="size-3.5" />
                        </span>
                        Adds to cart
                        <div className="mt-2 text-lg font-semibold leading-none text-foreground">
                          ${11 + (hash % 7)}
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          From AI
                        </div>
                      </div>
                    </div>
                    <div className="rounded-lg border bg-card p-3">
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                        <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <TrendingUpIcon className="size-3.5" />
                        </span>
                        Orders from AI
                        <div className="mt-2 text-lg font-semibold leading-none text-foreground">
                          ${formatPrice(product.price_paise * (2 + (hash % 3)))}
                        </div>
                        <div className="mt-1 text-[11px] text-lg font-semibold leading-none text-foreground">
                          ${4 + (hash % 5)}
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          AI → order
                        </div>
                      </div>
                    </div>
                    <div className="rounded-lg border bg-card p-3">
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                        <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <TrendingUpIcon className="size-3.5" />
                        </span>
                        Conversion
                        <div className="mt-2 text-lg font-semibold leading-none text-foreground">
                          ${(8 + (hash % 9)).toFixed(1)}%
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          AI → order
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {}
              <TabsContent value="activity" className="mt-0 p-4">
                <Card className="rounded-xl bg-card shadow-none">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ClockIcon className="size-4" /> Activity
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 rounded-lg bg-card text-xs"
                    >
                      View audit trail
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="relative ml-4 border-l-2 border-border/60 pl-4 py-2 space-y-4">
                      {activity.map((a) => (
                        <div key={a.event + a.time} className="relative">
                          <span className="absolute -left-[29px] top-0.5 flex size-4 items-center justify-center rounded-full bg-muted border border-border text-muted-foreground">
                            <a.icon className="size-2" />
                          </span>
                          <div className="flex flex-wrap items-baseline justify-between gap-1">
                            <span className="text-sm font-medium text-foreground">
                              {a.event}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {a.time}
                            </span>
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1 text-xs">
                            <Badge
                              variant="outline"
                              className="rounded-full text-[11px] capitalize"
                            >
                              {a.actor}
                            </Badge>
                            <span className="text-muted-foreground">
                              {a.note}
                            </span>
                          </div>
                          {a.link ? (
                            <button className="mt-1 text-xs font-medium text-primary hover:underline">
                              {a.link} →
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {}
          <div className="mt-6 flex gap-2 border-t border-border/60 pt-4">
            <Button className="flex-1 rounded-lg">
              <PencilIcon className="size-4" /> Edit Product
            </Button>
            <Button
              variant="outline"
              className="rounded-lg bg-card"
              onClick={onClose}
            >
              Close
            </Button>
            <Button
              variant="outline"
              className="rounded-lg bg-card text-destructive hover:text-destructive"
            >
              <ArchiveIcon className="size-4" /> Archive
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
