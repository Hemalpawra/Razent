import { useState, useEffect, useRef } from "react"
import {
  XIcon,
  PackageIcon,
  Save,
  Plus,
  Trash2,
  Upload,
  Image as ImageIcon,
  Tag as TagIcon,
  ListPlus,
  Sliders,
  Check,
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
import { formatPrice, getProductStockStatus } from "@/lib/types/product"
import type { Product, ProductStatus } from "@/lib/types/product"
import { upsertProduct } from "@/lib/api/client"
import { useMerchant } from "@/state/useMerchant"
import { toast } from "sonner"

interface ProductDrawerProps {
  open: boolean
  onClose: () => void
  product: Product | null
  categories?: string[]
  onProductUpdated?: (updated: Product) => void
}

const DEFAULT_CATEGORIES = [
  "Fruits",
  "Vegetables",
  "Dairy & Bakery",
  "Snacks & Munchies",
  "Beverages",
  "Household",
  "Health & Nutrition",
]

export default function ProductDrawer({
  open,
  onClose,
  product,
  categories = [],
  onProductUpdated,
}: ProductDrawerProps) {
  const { hasPermission } = useMerchant()
  const canEdit = hasPermission("edit_products")
  const isCreating = !product

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Core Product Fields
  const [title, setTitle] = useState("")
  const [brand, setBrand] = useState("")
  const [category, setCategory] = useState("Fruits")
  const [isCustomCategory, setIsCustomCategory] = useState(false)
  const [customCategoryInput, setCustomCategoryInput] = useState("")
  const [stock, setStock] = useState<number>(50)
  const [stockThreshold, setStockThreshold] = useState<number>(10)
  const [status, setStatus] = useState<ProductStatus>("active")
  const [priceRupees, setPriceRupees] = useState<string>("99")
  const [description, setDescription] = useState<string>("")
  const [imageUrl, setImageUrl] = useState<string>("")
  const [unit, setUnit] = useState<string>("500g")
  const [isSaving, setIsSaving] = useState(false)

  // Tags State
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")

  // Features State (bullet points)
  const [features, setFeatures] = useState<string[]>([])
  const [featureInput, setFeatureInput] = useState("")

  // Specifications State (key-value)
  const [specifications, setSpecifications] = useState<Array<{ key: string; value: string }>>([])
  const [specKey, setSpecKey] = useState("")
  const [specVal, setSpecVal] = useState("")

  // Dynamic Categories Pool
  const allAvailableCategories = Array.from(
    new Set([...DEFAULT_CATEGORIES, ...categories].filter(Boolean))
  )

  useEffect(() => {
    if (product) {
      setTitle(product.title || "")
      setBrand(product.brand || "")
      const prodCat = product.category || "Fruits"
      setCategory(prodCat)
      setIsCustomCategory(!DEFAULT_CATEGORIES.includes(prodCat) && !categories.includes(prodCat))
      setCustomCategoryInput(prodCat)
      setStock(product.stock ?? 0)
      setStockThreshold(product.stock_threshold ?? 10)
      setStatus(product.status ?? "active")
      setPriceRupees((product.price_paise / 100).toString())
      setDescription(product.description || "")
      setImageUrl(product.image_url || "")
      setUnit(product.unit || "500g")
      setTags(product.tags || [])

      // Features initialization
      if (product.features && Array.isArray(product.features) && product.features.length > 0) {
        setFeatures(product.features)
      } else {
        setFeatures([
          "High quality inspected produce",
          "Hygienically sorted and packaged",
          "100% authentic guarantee",
        ])
      }

      // Specifications initialization
      if (product.specifications && typeof product.specifications === "object") {
        const list = Object.entries(product.specifications).map(([k, v]) => ({
          key: k,
          value: String(v),
        }))
        setSpecifications(list.length > 0 ? list : [
          { key: "Display Unit", value: product.unit || "500g" },
          { key: "Shelf Life", value: "3-6 months" },
        ])
      } else {
        setSpecifications([
          { key: "Display Unit", value: product.unit || "500g" },
          { key: "Shelf Life", value: "3-6 months" },
        ])
      }
    } else {
      // New Product Defaults
      setTitle("")
      setBrand("")
      setCategory("Fruits")
      setIsCustomCategory(false)
      setCustomCategoryInput("")
      setStock(50)
      setStockThreshold(10)
      setStatus("active")
      setPriceRupees("99")
      setDescription("")
      setImageUrl("https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=480")
      setUnit("500g")
      setTags(["fresh", "grocery"])
      setFeatures([
        "Premium quality selection",
        "Fast express store delivery",
      ])
      setSpecifications([
        { key: "Packaging", value: "Packaged pouch" },
        { key: "Origin", value: "India" },
      ])
    }
  }, [product, open])

  // Tag Handlers
  const handleAddTag = () => {
    const clean = tagInput.trim().toLowerCase().replace(/^[#,]/, "")
    if (!clean) return
    if (!tags.includes(clean)) {
      setTags([...tags, clean])
    }
    setTagInput("")
  }

  const handleRemoveTag = (indexToRemove: number) => {
    setTags(tags.filter((_, idx) => idx !== indexToRemove))
  }

  // Feature Handlers
  const handleAddFeature = () => {
    const clean = featureInput.trim()
    if (!clean) return
    setFeatures([...features, clean])
    setFeatureInput("")
  }

  const handleRemoveFeature = (indexToRemove: number) => {
    setFeatures(features.filter((_, idx) => idx !== indexToRemove))
  }

  // Specification Handlers
  const handleAddSpec = () => {
    const k = specKey.trim()
    const v = specVal.trim()
    if (!k || !v) return
    setSpecifications([...specifications, { key: k, value: v }])
    setSpecKey("")
    setSpecVal("")
  }

  const handleRemoveSpec = (indexToRemove: number) => {
    setSpecifications(specifications.filter((_, idx) => idx !== indexToRemove))
  }

  // Local Image Upload Handler
  const handleImageFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      if (dataUrl) {
        setImageUrl(dataUrl)
        toast.success("Image attached from device.")
      }
    }
    reader.readAsDataURL(file)
  }

  // Save Handler
  const handleSave = async () => {
    if (!canEdit) {
      toast.error("View-only accounts cannot modify products.")
      return
    }
    if (!title.trim()) {
      toast.error("Please enter a product title.")
      return
    }

    const finalCategory = (isCustomCategory ? customCategoryInput.trim() : category.trim()) || "Grocery"

    setIsSaving(true)
    try {
      const parsedPrice = parseFloat(priceRupees.replace(/[^0-9.]/g, ""))
      const pricePaise = isNaN(parsedPrice) ? 9900 : Math.round(parsedPrice * 100)
      const id = product ? product.id : `prod_${Date.now()}_${Math.floor(Math.random() * 10000)}`

      // Convert specs array back to Record
      const specObj: Record<string, string> = {}
      specifications.forEach((s) => {
        if (s.key.trim() && s.value.trim()) {
          specObj[s.key.trim()] = s.value.trim()
        }
      })

      const updated = await upsertProduct({
        id,
        title: title.trim(),
        brand: brand.trim(),
        description: description.trim() || `${title.trim()} from catalog`,
        category: finalCategory,
        price_paise: pricePaise,
        stock: Number(stock),
        stock_threshold: Number(stockThreshold) || 10,
        status,
        unit: unit.trim() || "500g",
        tags,
        features,
        specifications: specObj,
        image_url: imageUrl || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=240",
      })

      // Update RAG semantic vector engine in background
      try {
        const { semanticVectorEngine } = await import("@/lib/agent/vectorSearch")
        const { listProducts } = await import("@/lib/api/client")
        const fresh = await listProducts()
        await semanticVectorEngine.indexCatalog(fresh.filter((p) => p.status === "active"))
      } catch {}

      if (onProductUpdated) onProductUpdated(updated)
      toast.success(isCreating ? "Product created in database." : "Product details updated successfully.")
      onClose()
    } catch (err: any) {
      toast.error(`Failed to save: ${err?.message || "Unknown error"}`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="p-0 max-w-[560px] ml-auto h-full flex flex-col bg-card border-l border-border shadow-2xl">
        {/* Header */}
        <DrawerHeader className="relative p-4 border-b border-border/80 shrink-0 pr-12 bg-card/60 backdrop-blur-md">
          <DrawerTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <PackageIcon className="size-4 text-primary" />
            <span>{isCreating ? "Add New Product" : "Edit Product Details"}</span>
          </DrawerTitle>
          <DrawerDescription className="text-xs text-muted-foreground font-mono">
            {product ? product.id : "Add and publish item to live catalog"}
          </DrawerDescription>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 size-8 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={onClose}
            aria-label="Close"
          >
            <XIcon className="size-4" />
          </Button>
        </DrawerHeader>

        {/* Scrollable Form Body */}
        <DrawerBody className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* ── 1. Basic Information (Title, Brand, Image) ── */}
          <Card className="rounded-2xl border border-border/80 shadow-none bg-card">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                General Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-3.5">
              {/* Image Preview & URL/Upload */}
              <div className="flex items-center gap-4">
                <div className="relative size-20 rounded-xl bg-muted/40 border border-border/80 overflow-hidden shrink-0 flex items-center justify-center group">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={title || "Product"}
                      className="size-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="size-8 text-muted-foreground/40" />
                  )}
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[10px] font-medium transition-opacity cursor-pointer"
                    >
                      <Upload className="size-3.5 mb-0.5" /> Change
                    </button>
                  )}
                </div>

                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs text-foreground font-medium">Product Image</Label>
                  <div className="flex gap-2">
                    <Input
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="Paste image URL (https://...)"
                      disabled={!canEdit}
                      className="h-8 text-xs font-mono"
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageFilePick}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!canEdit}
                      onClick={() => fileInputRef.current?.click()}
                      className="h-8 px-2.5 text-xs shrink-0 cursor-pointer"
                      title="Upload image from device"
                    >
                      <Upload className="size-3.5 mr-1" /> Browse
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Upload from computer or paste direct image URL
                  </p>
                </div>
              </div>

              {/* Product Title (Always Editable!) */}
              <div className="space-y-1">
                <Label className="text-xs text-foreground font-medium">
                  Product Name / Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. True Elements Rolled Oats (1kg)"
                  disabled={!canEdit}
                  className="h-9 text-xs font-medium"
                />
              </div>

              {/* Brand Name */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-foreground font-medium">Brand Name</Label>
                  <Input
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g. True Elements, Amul, Nike"
                    disabled={!canEdit}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-foreground font-medium">Display Unit / Size</Label>
                  <Input
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="e.g. 500g, 1L, Pack of 6"
                    disabled={!canEdit}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <Label className="text-xs text-foreground font-medium">Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter detailed description of the product..."
                  disabled={!canEdit}
                  className="text-xs min-h-[70px] resize-y"
                />
              </div>
            </CardContent>
          </Card>

          {/* ── 2. Category & Dynamic Category Addition ── */}
          <Card className="rounded-2xl border border-border/80 shadow-none bg-card">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center justify-between">
                <span>Category</span>
                <button
                  type="button"
                  onClick={() => setIsCustomCategory(!isCustomCategory)}
                  className="text-[11px] text-primary hover:underline lowercase font-normal cursor-pointer"
                >
                  {isCustomCategory ? "Select from existing list" : "+ Add new category"}
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-2.5">
              {isCustomCategory ? (
                <div className="space-y-1">
                  <Label className="text-xs text-foreground font-medium">
                    New Category Name
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={customCategoryInput}
                      onChange={(e) => setCustomCategoryInput(e.target.value)}
                      placeholder="e.g. Organic Staples, Sports Nutrition, Pet Care"
                      disabled={!canEdit}
                      className="h-8 text-xs font-medium"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        if (customCategoryInput.trim()) {
                          setCategory(customCategoryInput.trim())
                          setIsCustomCategory(false)
                        }
                      }}
                      className="h-8 text-xs shrink-0 cursor-pointer"
                    >
                      Done
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Select
                    value={category}
                    onValueChange={(val) => {
                      if (val === "__new__") {
                        setIsCustomCategory(true)
                        setCustomCategoryInput("")
                      } else if (val) {
                        setCategory(val)
                      }
                    }}
                    disabled={!canEdit}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {allAvailableCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                      <SelectItem value="__new__" className="text-primary font-medium">
                        + Create New Category...
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Quick Category Badges */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {allAvailableCategories.slice(0, 6).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setCategory(cat)
                          setIsCustomCategory(false)
                        }}
                        className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                          category === cat && !isCustomCategory
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/40 hover:bg-muted text-muted-foreground border-border/60"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── 3. Pricing, Stock & Status ── */}
          <Card className="rounded-2xl border border-border/80 shadow-none bg-card">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Price, Stock & Visibility
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-3">
              <div className="grid grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-xs text-foreground font-medium">Price (₹ INR)</Label>
                  <Input
                    type="number"
                    value={priceRupees}
                    onChange={(e) => setPriceRupees(e.target.value)}
                    disabled={!canEdit}
                    placeholder="249"
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-foreground font-medium">Inventory Stock</Label>
                  <Input
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(parseInt(e.target.value, 10) || 0)}
                    disabled={!canEdit}
                    placeholder="50"
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-foreground font-medium flex items-center justify-between">
                    <span>Threshold</span>
                    <span className="text-[10px] text-muted-foreground font-normal">low alert</span>
                  </Label>
                  <Input
                    type="number"
                    value={stockThreshold}
                    onChange={(e) => setStockThreshold(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    disabled={!canEdit}
                    placeholder="10"
                    className="h-8 text-xs font-mono"
                    title="Minimum stock before product is marked as Low Stock"
                  />
                </div>
              </div>

              {/* Dynamic Live Inventory Status Indicator */}
              {(() => {
                const stockStatus = getProductStockStatus(stock, stockThreshold)
                return (
                  <div className={`p-3 rounded-xl border transition-colors ${stockStatus.badgeClass}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`size-2.5 rounded-full ${stockStatus.dotClass} animate-pulse`} />
                        <span className="text-xs font-bold uppercase tracking-wider">
                          {stockStatus.label}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-medium">
                        {stock === 0 ? "0 units" : `${stock} / ${stockThreshold} min`}
                      </span>
                    </div>
                    <p className="text-[11px] mt-1.5 opacity-90 leading-tight">
                      {stockStatus.description}
                    </p>
                  </div>
                )
              })()}

              <div className="space-y-1">
                <Label className="text-xs text-foreground font-medium">Status in Store</Label>
                <Select
                  value={status}
                  onValueChange={(val) => setStatus(val as ProductStatus)}
                  disabled={!canEdit}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active (Visible in Store & AI Chat)</SelectItem>
                    <SelectItem value="draft">Draft (Hidden)</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* ── 4. Tags Management ── */}
          <Card className="rounded-2xl border border-border/80 shadow-none bg-card">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <TagIcon className="size-3.5" /> Tags & Keywords
                </span>
                <span className="text-[11px] font-mono lowercase text-muted-foreground font-normal">
                  {tags.length} tags
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-2.5">
              {/* Tag Chips */}
              <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                {tags.map((tag, idx) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="text-[11px] font-mono px-2 py-0.5 gap-1 bg-muted text-foreground hover:bg-muted"
                  >
                    <span>#{tag}</span>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(idx)}
                        className="hover:text-destructive transition-colors ml-0.5 cursor-pointer"
                        title="Remove tag"
                      >
                        <XIcon className="size-3" />
                      </button>
                    )}
                  </Badge>
                ))}
                {tags.length === 0 && (
                  <span className="text-xs text-muted-foreground italic">No tags added yet</span>
                )}
              </div>

              {/* Add Tag Input */}
              {canEdit && (
                <div className="flex gap-2 pt-1">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleAddTag()
                      }
                    }}
                    placeholder="Type tag (e.g. organic, protein, sugarfree) and press enter"
                    className="h-8 text-xs font-mono"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddTag}
                    className="h-8 text-xs px-2.5 shrink-0 cursor-pointer"
                  >
                    <Plus className="size-3.5 mr-1" /> Add
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── 5. Features Editor (Key Highlights) ── */}
          <Card className="rounded-2xl border border-border/80 shadow-none bg-card">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                <ListPlus className="size-3.5" /> Product Features & Highlights
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-2.5">
              {/* Feature List */}
              <div className="space-y-1.5">
                {features.map((feat, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/30 border border-border/60 text-xs"
                  >
                    <div className="flex items-center gap-2 text-foreground min-w-0 flex-1">
                      <span className="size-1.5 rounded-full bg-primary shrink-0" />
                      <span className="truncate">{feat}</span>
                    </div>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleRemoveFeature(idx)}
                        className="text-muted-foreground hover:text-destructive transition-colors shrink-0 p-1 cursor-pointer"
                        title="Delete feature"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    )}
                  </div>
                ))}
                {features.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">No specific features listed</p>
                )}
              </div>

              {/* Add Feature */}
              {canEdit && (
                <div className="flex gap-2 pt-1">
                  <Input
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleAddFeature()
                      }
                    }}
                    placeholder="e.g. 100% Whole Grain, No Added Preservatives"
                    className="h-8 text-xs"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddFeature}
                    className="h-8 text-xs px-2.5 shrink-0 cursor-pointer"
                  >
                    <Plus className="size-3.5 mr-1" /> Add
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── 6. Specifications Editor (Key-Value Pairs) ── */}
          <Card className="rounded-2xl border border-border/80 shadow-none bg-card">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                <Sliders className="size-3.5" /> Specifications
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-2.5">
              {/* Specs Table */}
              <div className="rounded-lg border border-border/60 overflow-hidden divide-y divide-border/40 text-xs">
                {specifications.map((spec, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 hover:bg-muted/20 transition-colors"
                  >
                    <span className="font-medium text-muted-foreground w-1/3 truncate">
                      {spec.key}
                    </span>
                    <span className="text-foreground w-1/2 truncate font-mono">
                      {spec.value}
                    </span>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSpec(idx)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1 cursor-pointer"
                        title="Delete specification"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    )}
                  </div>
                ))}
                {specifications.length === 0 && (
                  <div className="p-3 text-center text-xs text-muted-foreground italic">
                    No specifications added
                  </div>
                )}
              </div>

              {/* Add Specification Inputs */}
              {canEdit && (
                <div className="flex gap-2 pt-1">
                  <Input
                    value={specKey}
                    onChange={(e) => setSpecKey(e.target.value)}
                    placeholder="Key (e.g. Weight)"
                    className="h-8 text-xs w-1/3"
                  />
                  <Input
                    value={specVal}
                    onChange={(e) => setSpecVal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleAddSpec()
                      }
                    }}
                    placeholder="Value (e.g. 500g)"
                    className="h-8 text-xs flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddSpec}
                    className="h-8 text-xs px-2.5 shrink-0 cursor-pointer"
                  >
                    <Plus className="size-3.5 mr-1" /> Add
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </DrawerBody>

        {/* Footer Actions */}
        <DrawerFooter className="p-4 border-t border-border/80 shrink-0 flex flex-row items-center justify-end gap-2 bg-card/90 backdrop-blur-md">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          {canEdit && (
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="gap-1.5 font-medium cursor-pointer"
            >
              <Save className="size-3.5" />
              {isSaving ? "Saving to Database…" : isCreating ? "Create Product" : "Save All Changes"}
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
