import { useState, useEffect } from "react"
import {
  XIcon,
  PackageIcon,
  Save,
  Plus,
  Check,
  AlertCircle,
} from "lucide-react"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerBody,
  DrawerFooter,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useIsMobile } from "@/hooks/use-mobile"
import { formatPrice } from "@/lib/types/product"
import type { Product, ProductStatus } from "@/lib/types/product"
import { upsertProduct } from "@/lib/api/client"
import { useMerchant } from "@/state/useMerchant"
import { toast } from "sonner"

interface ProductDrawerProps {
  open: boolean
  onClose: () => void
  product: Product | null
  onProductUpdated?: (updated: Product) => void
}

function stockBadge(stock: number, status: string) {
  if (status === "archived") return { label: "Archived", variant: "secondary" as const }
  if (stock === 0) return { label: "Out of stock", variant: "destructive" as const }
  if (stock <= 10) return { label: "Low stock", variant: "warning" as const }
  if (status === "draft") return { label: "Draft", variant: "secondary" as const }
  return { label: "Active", variant: "success" as const }
}

export default function ProductDrawer({
  open,
  onClose,
  product,
  onProductUpdated,
}: ProductDrawerProps) {
  const isMobile = useIsMobile()
  const { hasPermission } = useMerchant()
  const canEdit = hasPermission("edit_products")

  const isCreating = !product

  // Form state
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("Fruits")
  const [stock, setStock] = useState<number>(50)
  const [status, setStatus] = useState<ProductStatus>("active")
  const [priceRupees, setPriceRupees] = useState<string>("99")
  const [description, setDescription] = useState<string>("")
  const [imageUrl, setImageUrl] = useState<string>("")
  const [unit, setUnit] = useState<string>("500g")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (product) {
      setTitle(product.title)
      setCategory(product.category || "General")
      setStock(product.stock ?? 0)
      setStatus(product.status ?? "active")
      setPriceRupees((product.price_paise / 100).toString())
      setDescription(product.description || "")
      setImageUrl(product.image_url || "")
      setUnit(product.unit || "500g")
    } else {
      setTitle("")
      setCategory("Fruits")
      setStock(50)
      setStatus("active")
      setPriceRupees("99")
      setDescription("")
      setImageUrl("https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=480")
      setUnit("500g")
    }
  }, [product, open])

  if (isMobile) return null

  const badge = stockBadge(stock, status)
  const features = (product?.tags || ["fresh", "farm produce"]).filter((t) => t.trim().length > 0)

  const handleSave = async () => {
    if (!canEdit) {
      toast.error("View-only accounts cannot modify products.")
      return
    }
    if (isCreating && !title.trim()) {
      toast.error("Please enter a product title.")
      return
    }

    setIsSaving(true)
    try {
      const parsedPrice = parseFloat(priceRupees)
      const pricePaise = isNaN(parsedPrice) ? 9900 : Math.round(parsedPrice * 100)
      const id = product ? product.id : `prod_${Date.now()}_${Math.floor(Math.random() * 1000)}`

      const updated = await upsertProduct({
        id,
        title: isCreating ? title.trim() : product.title,
        description: description.trim() || `${title} fresh from catalog`,
        category,
        price_paise: pricePaise,
        stock: Number(stock),
        status,
        tags: product?.tags || [category.toLowerCase(), "grocery"],
        image_url: imageUrl || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=240",
      })

      if (onProductUpdated) onProductUpdated(updated)
      toast.success(isCreating ? "Product created in database." : "Product details and stock updated in database.")
      onClose()
    } catch (err: any) {
      toast.error(`Failed to save: ${err?.message || "Unknown error"}`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="p-0 max-w-[540px] ml-auto h-full flex flex-col bg-card">
        {/* Header - EXACTLY ONE close icon */}
        <DrawerHeader className="relative p-4 border-b shrink-0 pr-12">
          <DrawerTitle className="text-base font-semibold text-foreground">
            {isCreating ? "Add New Product" : "Product Details"}
          </DrawerTitle>
          <DrawerDescription className="text-xs text-muted-foreground font-mono">
            {product ? product.id : "Create and publish item to live database"}
          </DrawerDescription>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 size-8 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
            onClick={onClose}
            aria-label="Close"
          >
            <XIcon className="size-4" />
          </Button>
        </DrawerHeader>

        <DrawerBody className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* Hero Section */}
          <div className="flex items-start gap-4">
            <img
              src={imageUrl || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=240"}
              alt={title || "Product"}
              className="size-20 rounded-xl object-cover ring-1 ring-border shrink-0 bg-muted"
            />
            <div className="min-w-0 flex-1 space-y-1.5">
              {isCreating ? (
                <div className="space-y-1">
                  <Label className="text-xs">Product Title</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Fresh Shimla Apple (4 pcs)"
                    className="h-8 text-xs font-medium"
                  />
                </div>
              ) : (
                <>
                  <h2 className="text-base font-semibold text-foreground leading-snug">
                    {product.title}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {product.category} · {product.unit || (product.tags?.[0] ? `#${product.tags[0]}` : "Item")}
                  </p>
                  <div className="flex items-center gap-2 pt-0.5">
                    <Badge variant={badge.variant} className="rounded-full px-2 py-0 text-[11px] capitalize">
                      {badge.label}
                    </Badge>
                    <span className="text-sm font-semibold text-foreground">
                      {formatPrice(product.price_paise)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Description Section (from DB) */}
          <Card className="rounded-xl border shadow-none bg-card">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Product Description
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {canEdit ? (
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter product description..."
                  className="text-xs min-h-[72px] resize-none"
                />
              ) : (
                <p className="text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                  {description || "No description provided in catalog."}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Inventory & Pricing Controls (Real working DB controls) */}
          <Card className="rounded-xl border shadow-none bg-card">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Price & Stock Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Price (₹ INR)</Label>
                  <Input
                    type="number"
                    value={priceRupees}
                    onChange={(e) => setPriceRupees(e.target.value)}
                    disabled={!canEdit}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Current Stock</Label>
                  <Input
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(parseInt(e.target.value, 10) || 0)}
                    disabled={!canEdit}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Category</Label>
                  <Select
                    value={category}
                    onValueChange={(val) => {
                      if (val) setCategory(val)
                    }}
                    disabled={!canEdit}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Fruits">Fruits</SelectItem>
                      <SelectItem value="Vegetables">Vegetables</SelectItem>
                      <SelectItem value="Dairy & Bakery">Dairy & Bakery</SelectItem>
                      <SelectItem value="Snacks & Munchies">Snacks & Munchies</SelectItem>
                      <SelectItem value="Beverages">Beverages</SelectItem>
                      <SelectItem value="Household">Household</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Listing Status</Label>
                  <Select
                    value={status}
                    onValueChange={(val) => setStatus(val as ProductStatus)}
                    disabled={!canEdit}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active (Visible in Store)</SelectItem>
                      <SelectItem value="draft">Draft (Hidden)</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Features (Text Only) */}
          <Card className="rounded-xl border shadow-none bg-card">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Features
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {features.length > 0 ? (
                <ul className="space-y-1.5 text-xs text-foreground list-disc list-inside">
                  {features.map((f, i) => (
                    <li key={i} className="leading-snug">
                      <span className="capitalize">{f.replace(/_/g, " ")}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  Standard farm-fresh quality. Inspected and hygienically packaged.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Specifications (Text Only) */}
          <Card className="rounded-xl border shadow-none bg-card">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Specifications
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Category</span>
                <span className="font-medium text-foreground">{category}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Display Unit</span>
                <span className="font-medium text-foreground">{unit}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Catalog ID</span>
                <span className="font-mono text-[11px] text-foreground">{product ? product.id : "Auto-generated"}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Database Sync</span>
                <span className="text-muted-foreground">Live Supabase Database</span>
              </div>
            </CardContent>
          </Card>
        </DrawerBody>

        {/* Footer Actions */}
        <DrawerFooter className="p-4 border-t shrink-0 flex flex-row items-center justify-end gap-2 bg-card">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          {canEdit && (
            <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-1.5">
              <Save className="size-3.5" />
              {isSaving ? "Saving to DB..." : isCreating ? "Create Product" : "Save Changes"}
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
