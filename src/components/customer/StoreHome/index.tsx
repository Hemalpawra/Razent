import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { Input } from "@/components/ui/input"

import { Badge } from "@/components/ui/badge"

import { Checkbox } from "@/components/ui/checkbox"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

import { Separator } from "@/components/ui/separator"

import { Skeleton } from "@/components/ui/skeleton"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageHeader,
} from "@/components/ui/message"

import { Bubble } from "@/components/ui/bubble"

import { Label } from "@/components/ui/label"

import { useSettings } from "@/state/useSettings"
import {
  trackOrder,
  executeAgentCheckout,
  logAuditEvent,
} from "@/lib/api/client"
import { orderStore } from "@/lib/storage/orderStore"

import { mockProducts } from "@/lib/mock/products"

import { formatPrice } from "@/lib/types/product"

import {
  Search,
  ShoppingCart,
  User,
  Menu,
  Sparkles,
  X,
  Star,
  Truck,
  ShieldCheck,
  RotateCcw,
  Headset,
  PackageCheck,
  ArrowRight,
  Home as HomeIcon,
  Headphones,
  Laptop,
  Gamepad2,
  Smartphone,
  Watch,
  Lamp,
  Speaker,
  Send,
  ChevronRight,
  Plus,
  Minus,
  Trash2,
  SlidersHorizontal,
  LayoutGrid,
  Rows3,
  Loader2,
  AlertCircle,
  RefreshCw,
  Tag,
  Zap,
  Truck as TruckIcon,
  Tag as TagIcon,
  Check,
  Eye,
  Heart,
  Share2,
  Maximize2,
  Image as ImageIcon,
  GalleryThumbnails,
  Download,
  Mail,
  Phone,
} from "lucide-react"

type StoreView = "home" | "listing" | "detail" | "track-order" | "cart" | "checkout" | "payment-failed" | "payment-success"

type CartItem = { id: string; qty: number }

type AIMsg = {
  role: "user" | "assistant"
  text: string
  products?: typeof mockProducts
}

const CATEGORY_DEFS: { name: string; icon: typeof HomeIcon; match: string[] }[] =
  [
    { name: "Electronics", icon: Smartphone, match: ["Home", "Security"] },

    { name: "Laptops", icon: Laptop, match: ["Computing"] },

    { name: "Audio", icon: Headphones, match: ["Audio"] },

    {
      name: "Accessories",
      icon: PackageCheck,
      match: ["Networking", "Lighting"],
    },

    { name: "Mobile", icon: Smartphone, match: ["Wearables"] },

    { name: "Gaming", icon: Gamepad2, match: ["Computing", "Audio"] },

    { name: "Office", icon: Lamp, match: ["Furniture", "Lighting"] },

    { name: "Wearables", icon: Watch, match: ["Wearables", "Fitness"] },
  ]

function categoryCount(match: string[]) {
  return mockProducts.filter(
    (p) => p.status === "active" && match.includes(p.category),
  ).length
}

const SAMPLE_PROMPTS = [
  "I need a laptop under ₹60,000",

  "Compare these headphones",

  "Show me the best option for office work",

  "Air purifier under ₹20,000",
]

// Deterministic pseudo-rating so cards display consistent stars without a real reviews field

function productRating(p: { id: string }): number {
  let h = 0

  for (let i = 0; i < p.id.length; i++) h = (h * 31 + p.id.charCodeAt(i)) | 0

  return 3.6 + (Math.abs(h) % 14) / 10 // 3.6 – 5.0
}

const ALL_BRANDS = [
  "Razent",
  "PureSense",
  "JBL",
  "Anker",
  "Boat",
  "Sony",
  "Apple",
  "Xiaomi",
  "LG",
]

const ALL_CATEGORIES = Array.from(
  new Set(mockProducts.map((p) => p.category)),
).sort()

export default function StoreHome() {
  const { storeProfile } = useSettings()

  const [view, setView] = useState<StoreView>("home")

  const [activeCat, setActiveCat] = useState<string | null>(null)

  const [search, setSearch] = useState("")

  const [selectedId, setSelectedId] = useState<string | null>(null)

  const [aiOpen, setAiOpen] = useState(false)

  const [aiInput, setAiInput] = useState("")

  const [aiMsgs, setAiMsgs] = useState<AIMsg[]>([
    {
      role: "assistant",

      text: `Hi! I'm your shopping assistant from ${storeProfile.storeName}. Ask me to find, compare, or pick the right product for you.`,
    },
  ])

  const [cart, setCart] = useState<CartItem[]>([])

  const [cartOpen, setCartOpen] = useState(false)

  const [sort, setSort] = useState<"relevance" | "low" | "high" | "rating">(
    "relevance",
  )

  const [layout, setLayout] = useState<"grid" | "list">("grid")

  const [brandFilters, setBrandFilters] = useState<string[]>([])

  const [categoryFilters, setCategoryFilters] = useState<string[]>([])

  const [priceMin, setPriceMin] = useState<string>("")

  const [priceMax, setPriceMax] = useState<string>("")

  const [minRating, setMinRating] = useState<number>(0)

  const [stockOnly, setStockOnly] = useState(false)

  const [offerFilter, setOfferFilter] = useState(false)

  const [fastDelivery, setFastDelivery] = useState(false)

  const [loading, setLoading] = useState(false)

  const [error, setError] = useState<string | null>(null)

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const [failedOrderId, setFailedOrderId] = useState<string | null>(null)

  const [lastPaymentId, setLastPaymentId] = useState<string | null>(null)
  const [lastOrderId, setLastOrderId] = useState<string | null>(null)
  const [trackPrefill, setTrackPrefill] = useState<{ orderId?: string; mobile?: string; email?: string } | null>(null)

  const [lastInvoiceNo, setLastInvoiceNo] = useState<string | null>(null)

  const [lastOrderSnapshot, setLastOrderSnapshot] = useState<CartItem[] | null>(
    null,
  )

  const activeProducts = useMemo(
    () => mockProducts.filter((p) => p.status === "active"),
    [],
  )

  const featured = useMemo(() => activeProducts.slice(0, 8), [activeProducts])

  const filtered = useMemo(() => {
    let list = [...activeProducts]

    if (activeCat) {
      const def = CATEGORY_DEFS.find((c) => c.name === activeCat)

      if (def) list = list.filter((p) => def.match.includes(p.category))
      else list = list.filter((p) => p.category === activeCat)
    }

    if (categoryFilters.length > 0) {
      list = list.filter((p) => categoryFilters.includes(p.category))
    }

    if (brandFilters.length > 0) {
      list = list.filter((p) => {
        const tag = p.tags.find((t) => t.startsWith("brand:"))

        return tag ? brandFilters.includes(tag.replace("brand:", "")) : false
      })
    }

    const pmin = priceMin ? Number(priceMin) : null

    const pmax = priceMax ? Number(priceMax) : null

    if (pmin !== null) list = list.filter((p) => p.price_paise / 100 >= pmin)

    if (pmax !== null) list = list.filter((p) => p.price_paise / 100 <= pmax)

    if (minRating > 0) list = list.filter((p) => productRating(p) >= minRating)

    if (stockOnly) list = list.filter((p) => p.stock > 0)

    if (offerFilter)
      list = list.filter(
        (p) =>
          p.tags.includes("bestseller") ||
          p.tags.includes("bundle") ||
          p.tags.includes("new"),
      )

    if (fastDelivery) list = list.filter((p) => p.stock > 5)

    if (search.trim()) {
      const q = search.toLowerCase()

      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.tags.join(" ").toLowerCase().includes(q),
      )
    }

    if (sort === "low") list.sort((a, b) => a.price_paise - b.price_paise)

    if (sort === "high") list.sort((a, b) => b.price_paise - a.price_paise)

    if (sort === "rating")
      list.sort((a, b) => productRating(b) - productRating(a))

    return list
  }, [
    activeProducts,
    activeCat,
    search,
    sort,
    brandFilters,
    categoryFilters,
    priceMin,
    priceMax,
    minRating,
    stockOnly,
    offerFilter,
    fastDelivery,
  ])

  const selectedProduct = selectedId
    ? (mockProducts.find((p) => p.id === selectedId) ?? null)
    : null

  const cartCount = cart.reduce((s, c) => s + c.qty, 0)

  const cartTotal = cart.reduce((s, c) => {
    const p = mockProducts.find((x) => x.id === c.id)

    return s + (p ? p.price_paise * c.qty : 0)
  }, 0)

  function openCategory(name: string) {
    setActiveCat(name)

    setView("listing")

    setCategoryFilters([])

    setBrandFilters([])

    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function clearAllFilters() {
    setActiveCat(null)

    setCategoryFilters([])

    setBrandFilters([])

    setPriceMin("")

    setPriceMax("")

    setMinRating(0)

    setStockOnly(false)

    setOfferFilter(false)

    setFastDelivery(false)

    setSearch("")

    setSort("relevance")
  }

  function goToListing() {
    setActiveCat(null)

    setCategoryFilters([])

    setBrandFilters([])

    setView("listing")

    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function simulateLoad() {
    setError(null)

    setLoading(true)

    setTimeout(() => setLoading(false), 1100)
  }

  function simulateError() {
    setError(
      "Couldn't reach the storefront. Check your connection and try again.",
    )
  }

  function openProduct(id: string) {
    setSelectedId(id)

    setView("detail")

    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function addToCart(id: string) {
    setCart((prev) => {
      const f = prev.find((c) => c.id === id)
      if (f)
        return prev.map((c) => (c.id === id ? { ...c, qty: c.qty + 1 } : c))
      return [...prev, { id, qty: 1 }]
    })
    // Audit event: product added to cart (real persistence via client.ts).
    logAuditEvent({
      event: {
        id: `audit-cart-add-${id}-${Date.now()}`,
        type: "checkout_initiated",
        timestamp: new Date().toISOString(),
        actor: "customer",
        source: "store",
        result: "Success",
        reason: `Added product ${id} to cart`,
        payload_summary: `action=add_to_cart product_id=${id}`,
      },
    }).catch(() => {})
  }

  function updateQty(id: string, d: number) {
    setCart((prev) => {
      const next = prev

        .map((c) => (c.id === id ? { ...c, qty: c.qty + d } : c))

        .filter((c) => c.qty > 0)

      return next
    })
  }

  function handleAskAI(prompt?: string) {
    const text = (prompt ?? aiInput).trim()

    if (!text) return

    const userMsg: AIMsg = { role: "user", text }

    setAiMsgs((m) => [...m, userMsg])

    setAiInput("")

    if (!aiOpen) setAiOpen(true)

    // simple recommendation logic

    setTimeout(() => {
      const q = text.toLowerCase()

      let recs = [...activeProducts]

      if (q.includes("laptop") || q.includes("60,000") || q.includes("60000"))
        recs = recs.filter((p) => p.category === "Computing")
      else if (
        q.includes("headphone") ||
        q.includes("audio") ||
        q.includes("5,000") ||
        q.includes("5000")
      )
        recs = recs.filter((p) => p.category === "Audio")
      else if (
        q.includes("purifier") ||
        q.includes("20,000") ||
        q.includes("20000")
      )
        recs = recs.filter((p) => p.title.toLowerCase().includes("purifier"))
      else if (q.includes("office"))
        recs = recs.filter((p) =>
          ["Furniture", "Lighting", "Computing"].includes(p.category),
        )

      recs = recs.slice(0, 3)

      if (recs.length === 0) recs = activeProducts.slice(0, 3)

      const reply: AIMsg = {
        role: "assistant",

        text: `Here are ${recs.length} options that match "${text}". Tap a card to view details or I can compare them for you.`,

        products: recs,
      }

      setAiMsgs((m) => [...m, reply])
    }, 450)
  }

  const initials = storeProfile.storeName

    .split(" ")

    .map((w) => w[0])

    .join("")

    .slice(0, 2)

    .toUpperCase()

  return (
    <div className="min-h-screen bg-background">
      {/* Top utility strip */}
      <div className="border-b bg-muted/40">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-[12px] text-muted-foreground">
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <Truck className="size-3.5" /> Free shipping on orders above
              ₹1,499
            </span>
            <span className="hidden items-center gap-1.5 sm:inline-flex">
              <RotateCcw className="size-3.5" /> 7 Days easy returns
            </span>
            <span className="hidden items-center gap-1.5 md:inline-flex">
              <ShieldCheck className="size-3.5" /> Secure payments powered by
              Razorpay
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5">
            <Truck className="size-3.5" /> Deliver to{" "}
            <span className="font-medium text-foreground">India</span>
          </span>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          {/* logo + name */}
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              {storeProfile.logo ? (
                <img
                  src={storeProfile.logo}
                  alt="logo"
                  className="size-9 rounded-lg object-cover"
                />
              ) : (
                <span className="text-xs font-bold">{initials}</span>
              )}
            </div>
            <span className="hidden text-sm font-semibold tracking-tight sm:inline">
              {storeProfile.storeName}
            </span>
          </div>

          {/* search */}
          <div className="relative hidden flex-1 items-center md:flex md:max-w-xl">
            <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setActiveCat(null)

                  setView("listing")
                }
              }}
              placeholder="Search for products, categories or brands"
              className="h-9 bg-muted/40 pl-9 text-sm"
            />
          </div>

          {/* nav */}
          <nav className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="hidden lg:inline-flex"
              onClick={() => setView("listing")}
            >
              <Menu className="size-4" /> Categories
            </Button>
            <Button variant="ghost" size="sm" onClick={goToListing}>
              Products
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView("track-order")}
              className="hidden lg:inline-flex"
            >
              <PackageCheck className="size-4 mr-1" /> Track Order
            </Button>
            <Button
              size="sm"
              onClick={() => setAiOpen((v) => !v)}
              className="hidden sm:inline-flex"
            >
              <Sparkles className="size-4" /> Ask AI
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setView("cart")}
            >
              <ShoppingCart className="size-5" />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                  {cartCount}
                </span>
              )}
            </Button>
            <Button variant="ghost" size="icon">
              <User className="size-5" />
            </Button>
          </nav>
        </div>
        {/* mobile search */}
        <div className="border-t bg-card px-4 py-2 md:hidden">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setView("listing")}
              placeholder="Search for products, categories or brands"
              className="h-9 bg-muted/40 pl-9"
            />
          </div>
        </div>
      </header>

      {/* Split layout when AI open — workspace mode: no footer, full-height 2-column */}
      <div
        className={
          aiOpen
            ? "mx-auto grid max-w-6xl grid-cols-1 gap-0 xl:grid-cols-[1fr_380px]"
            : "mx-auto max-w-6xl"
        }
      >
        {/* LEFT: store — stays visible and usable */}
        <div
          className={
            aiOpen
              ? "min-w-0 xl:h-[calc(100vh-56px)] xl:overflow-auto"
              : "min-w-0"
          }
        >
          {/* Breadcrumb when listing/detail */}
          {(view === "listing" || view === "detail") && (
            <div className="flex items-center gap-1.5 px-4 py-3 text-xs text-muted-foreground">
              <button
                onClick={() => setView("home")}
                className="hover:text-foreground"
              >
                Home
              </button>
              <ChevronRight className="size-3" />
              {activeCat ? (
                <button onClick={goToListing} className="hover:text-foreground">
                  Products
                </button>
              ) : (
                <span className="font-medium text-foreground">Products</span>
              )}
              {activeCat && (
                <>
                  <ChevronRight className="size-3" />
                  <span className="font-medium text-foreground">
                    {activeCat}
                  </span>
                </>
              )}
              {view === "detail" && selectedProduct && (
                <>
                  <ChevronRight className="size-3" />
                  <span className="truncate font-medium text-foreground">
                    {selectedProduct.title}
                  </span>
                </>
              )}
            </div>
          )}

          {view === "home" && (
            <>
              {/* Hero */}
              <section className="px-4 py-6">
                <Card className="overflow-hidden border-0 bg-card shadow-sm ring-1 ring-border">
                  <CardContent className="grid gap-6 p-6 md:grid-cols-2 md:p-8">
                    <div className="flex flex-col justify-center">
                      <Badge variant="secondary" className="w-fit">
                        New · AI shopping assistant live
                      </Badge>
                      <h1 className="mt-3 font-heading text-2xl font-semibold leading-tight tracking-tight md:text-[30px]">
                        Technology that moves with you
                      </h1>
                      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                        Smart products for everyday use — curated, verified, and
                        ready to compare with AI. Free delivery over ₹1,499.
                      </p>
                      <div className="mt-5 flex flex-wrap items-center gap-2">
                        <Button size="lg" onClick={() => setView("listing")}>
                          Shop Now <ArrowRight className="size-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={() => setAiOpen(true)}
                        >
                          <Sparkles className="size-4" /> Ask AI Assistant
                        </Button>
                      </div>
                      <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <ShieldCheck className="size-3.5 text-emerald-600" />{" "}
                          Razorpay Secure
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Star className="size-3.5 fill-amber-400 text-amber-400" />{" "}
                          4.8 • 12k reviews
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {featured.slice(0, 6).map((p) => (
                        <button
                          key={p.id}
                          onClick={() => openProduct(p.id)}
                          className="group overflow-hidden rounded-xl border bg-muted text-left"
                        >
                          <img
                            src={p.image_url}
                            alt={p.title}
                            className="aspect-square w-full object-cover transition group-hover:scale-[1.02]"
                          />
                          <div className="p-2">
                            <div className="truncate text-xs font-medium leading-tight">
                              {p.title}
                            </div>
                            <div className="text-xs font-semibold">
                              {formatPrice(p.price_paise)}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* Category section */}
              <section className="px-4 py-2">
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-sm font-semibold tracking-tight">
                    Browse by category
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setView("listing")}
                  >
                    View all
                  </Button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
                  {CATEGORY_DEFS.map(({ name, icon: Icon, match }) => {
                    const n = categoryCount(match)

                    return (
                      <button
                        key={name}
                        onClick={() => openCategory(name)}
                        className="text-left"
                      >
                        <Card className="group p-4 transition hover:shadow-sm hover:ring-1 hover:ring-primary/20">
                          <CardContent className="flex items-center gap-3 p-0">
                            <div className="grid size-10 place-items-center rounded-lg bg-muted group-hover:bg-primary/10">
                              <Icon className="size-5 text-muted-foreground group-hover:text-primary" />
                            </div>
                            <div>
                              <div className="text-sm font-medium leading-none">
                                {name}
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                {n} products
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </button>
                    )
                  })}
                </div>
              </section>

              {/* Featured products */}
              <section className="px-4 py-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-sm font-semibold tracking-tight">
                    Featured products
                  </h2>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>Powered by {storeProfile.storeName}</span>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {featured.map((p) => (
                    <Card
                      key={p.id}
                      className="group flex flex-col overflow-hidden"
                    >
                      <button
                        onClick={() => openProduct(p.id)}
                        className="relative block overflow-hidden"
                      >
                        <img
                          src={p.image_url}
                          alt={p.title}
                          className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                        />
                        {p.stock === 0 ? (
                          <Badge
                            variant="destructive"
                            className="absolute left-2 top-2"
                          >
                            Out of stock
                          </Badge>
                        ) : p.stock < 10 ? (
                          <Badge className="absolute left-2 top-2 bg-amber-500 text-white hover:bg-amber-500">
                            Low stock
                          </Badge>
                        ) : null}
                      </button>
                      <CardContent className="flex flex-1 flex-col gap-2 p-3">
                        <div className="line-clamp-1 text-sm font-medium leading-tight">
                          {p.title}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Star className="size-3 fill-amber-400 text-amber-400" />{" "}
                          4.6{" "}
                          <span className="text-muted-foreground/60">
                            · 124 reviews
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-sm font-semibold">
                            {formatPrice(p.price_paise)}
                          </span>
                          <Badge variant="outline" className="text-[11px]">
                            {p.category}
                          </Badge>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openProduct(p.id)}
                          >
                            View details
                          </Button>
                          <Button
                            size="sm"
                            disabled={p.stock === 0}
                            onClick={() => addToCart(p.id)}
                          >
                            Add to cart
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>

              {/* Trust strip tiny */}
              <section className="px-4 pb-6">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                  {[
                    {
                      icon: ShieldCheck,
                      title: "Secure Payments",
                      desc: "Razorpay",
                    },

                    { icon: Truck, title: "Fast Delivery", desc: "3–5 days" },

                    { icon: RotateCcw, title: "Easy Returns", desc: "7 days" },

                    {
                      icon: Headset,
                      title: "24/7 Support",
                      desc: storeProfile.supportEmail,
                    },

                    {
                      icon: PackageCheck,
                      title: "Order Tracking",
                      desc: "Live updates",
                    },
                  ].map(({ icon: Icon, title, desc }) => (
                    <Card key={title} className="p-3">
                      <CardContent className="flex items-center gap-2.5 p-0">
                        <div className="grid size-8 place-items-center rounded-md bg-muted">
                          <Icon className="size-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-medium leading-none">
                            {title}
                          </div>
                          <div className="truncate text-[11px] text-muted-foreground">
                            {desc}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            </>
          )}

          {view === "listing" && (
            <section className="px-4 pb-8 pt-2">
              <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
                {/* Filter sidebar — desktop */}
                <FilterSidebar
                  categoryFilters={categoryFilters}
                  setCategoryFilters={setCategoryFilters}
                  brandFilters={brandFilters}
                  setBrandFilters={setBrandFilters}
                  priceMin={priceMin}
                  setPriceMin={setPriceMin}
                  priceMax={priceMax}
                  setPriceMax={setPriceMax}
                  minRating={minRating}
                  setMinRating={setMinRating}
                  stockOnly={stockOnly}
                  setStockOnly={setStockOnly}
                  offerFilter={offerFilter}
                  setOfferFilter={setOfferFilter}
                  fastDelivery={fastDelivery}
                  setFastDelivery={setFastDelivery}
                  onClear={clearAllFilters}
                  variant="desktop"
                />

                {/* Right column */}
                <div className="min-w-0">
                  {/* Results bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm">
                      <span className="font-semibold">
                        {loading ? "…" : filtered.length}
                      </span>{" "}
                      <span className="text-muted-foreground">results for</span>{" "}
                      <span className="font-medium">
                        {activeCat ?? (search ? `"${search}"` : "All products")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Mobile filter trigger */}
                      <Sheet
                        open={mobileFiltersOpen}
                        onOpenChange={setMobileFiltersOpen}
                      >
                        <SheetTrigger render={<Button variant="outline" size="sm" className="lg:hidden" />}>
                          <SlidersHorizontal className="size-4" /> Filters
                            {brandFilters.length +
                              categoryFilters.length +
                              (priceMin ? 1 : 0) +
                              (priceMax ? 1 : 0) +
                              (minRating > 0 ? 1 : 0) +
                              (stockOnly ? 1 : 0) +
                              (offerFilter ? 1 : 0) +
                              (fastDelivery ? 1 : 0) >
                              0 && (
                              <Badge
                                variant="secondary"
                                className="ml-1 h-4 px-1 text-[10px]"
                              >
                                {brandFilters.length +
                                  categoryFilters.length +
                                  (priceMin ? 1 : 0) +
                                  (priceMax ? 1 : 0) +
                                  (minRating > 0 ? 1 : 0) +
                                  (stockOnly ? 1 : 0) +
                                  (offerFilter ? 1 : 0) +
                                  (fastDelivery ? 1 : 0)}
                              </Badge>
                            )}
                        </SheetTrigger>
                        <SheetContent
                          side="left"
                          className="w-[320px] overflow-auto p-0 sm:w-[360px]"
                        >
                          <SheetHeader className="border-b px-4 py-3">
                            <SheetTitle>Filters</SheetTitle>
                          </SheetHeader>
                          <FilterSidebar
                            categoryFilters={categoryFilters}
                            setCategoryFilters={setCategoryFilters}
                            brandFilters={brandFilters}
                            setBrandFilters={setBrandFilters}
                            priceMin={priceMin}
                            setPriceMin={setPriceMin}
                            priceMax={priceMax}
                            setPriceMax={setPriceMax}
                            minRating={minRating}
                            setMinRating={setMinRating}
                            stockOnly={stockOnly}
                            setStockOnly={setStockOnly}
                            offerFilter={offerFilter}
                            setOfferFilter={setOfferFilter}
                            fastDelivery={fastDelivery}
                            setFastDelivery={setFastDelivery}
                            onClear={clearAllFilters}
                            onClose={() => setMobileFiltersOpen(false)}
                            variant="mobile"
                          />
                        </SheetContent>
                      </Sheet>

                      <select
                        value={sort}
                        onChange={(e) => setSort(e.target.value as never)}
                        className="h-9 rounded-md border bg-card px-2 text-xs"
                      >
                        <option value="relevance">Sort: Relevance</option>
                        <option value="low">Price: Low to High</option>
                        <option value="high">Price: High to Low</option>
                        <option value="rating">Top Rated</option>
                      </select>

                      <div className="hidden items-center rounded-md border bg-card p-0.5 sm:flex">
                        <button
                          aria-label="Grid view"
                          onClick={() => setLayout("grid")}
                          className={
                            "grid size-7 place-items-center rounded " +
                            (layout === "grid"
                              ? "bg-muted text-foreground"
                              : "text-muted-foreground")
                          }
                        >
                          <LayoutGrid className="size-3.5" />
                        </button>
                        <button
                          aria-label="List view"
                          onClick={() => setLayout("list")}
                          className={
                            "grid size-7 place-items-center rounded " +
                            (layout === "list"
                              ? "bg-muted text-foreground"
                              : "text-muted-foreground")
                          }
                        >
                          <Rows3 className="size-3.5" />
                        </button>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="hidden lg:inline-flex"
                        onClick={clearAllFilters}
                      >
                        Clear filters
                      </Button>
                    </div>
                  </div>

                  {/* Active filter chips */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {activeCat && (
                      <Badge variant="secondary" className="gap-1">
                        Category: {activeCat}{" "}
                        <button
                          onClick={() => setActiveCat(null)}
                          aria-label="Remove"
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    )}
                    {categoryFilters.map((c) => (
                      <Badge key={c} variant="secondary" className="gap-1">
                        {c}{" "}
                        <button
                          onClick={() =>
                            setCategoryFilters((s) => s.filter((x) => x !== c))
                          }
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                    {brandFilters.map((b) => (
                      <Badge key={b} variant="secondary" className="gap-1">
                        Brand: {b}{" "}
                        <button
                          onClick={() =>
                            setBrandFilters((s) => s.filter((x) => x !== b))
                          }
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                    {priceMin && (
                      <Badge variant="secondary" className="gap-1">
                        Min ₹{priceMin}{" "}
                        <button onClick={() => setPriceMin("")}>
                          <X className="size-3" />
                        </button>
                      </Badge>
                    )}
                    {priceMax && (
                      <Badge variant="secondary" className="gap-1">
                        Max ₹{priceMax}{" "}
                        <button onClick={() => setPriceMax("")}>
                          <X className="size-3" />
                        </button>
                      </Badge>
                    )}
                    {minRating > 0 && (
                      <Badge variant="secondary" className="gap-1">
                        {minRating}★ & up{" "}
                        <button onClick={() => setMinRating(0)}>
                          <X className="size-3" />
                        </button>
                      </Badge>
                    )}
                    {stockOnly && (
                      <Badge variant="secondary" className="gap-1">
                        In stock only{" "}
                        <button onClick={() => setStockOnly(false)}>
                          <X className="size-3" />
                        </button>
                      </Badge>
                    )}
                    {offerFilter && (
                      <Badge variant="secondary" className="gap-1">
                        Offers{" "}
                        <button onClick={() => setOfferFilter(false)}>
                          <X className="size-3" />
                        </button>
                      </Badge>
                    )}
                    {fastDelivery && (
                      <Badge variant="secondary" className="gap-1">
                        Fast delivery{" "}
                        <button onClick={() => setFastDelivery(false)}>
                          <X className="size-3" />
                        </button>
                      </Badge>
                    )}
                    {search && (
                      <Badge variant="secondary" className="gap-1">
                        “{search}”{" "}
                        <button onClick={() => setSearch("")}>
                          <X className="size-3" />
                        </button>
                      </Badge>
                    )}
                  </div>

                  <Separator className="my-4" />

                  {/* State branch — skeleton / error / empty / grid */}
                  {loading ? (
                    <div
                      className={
                        layout === "grid"
                          ? "grid grid-cols-2 gap-3 sm:grid-cols-3"
                          : "space-y-3"
                      }
                    >
                      {Array.from({ length: 6 }).map((_, i) => (
                        <Card
                          key={i}
                          className={
                            layout === "grid"
                              ? "overflow-hidden"
                              : "overflow-hidden"
                          }
                        >
                          <Skeleton
                            className={
                              layout === "grid"
                                ? "aspect-[4/3] w-full"
                                : "h-32 w-full"
                            }
                          />
                          <CardContent className="space-y-2 p-3">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                            <Skeleton className="h-4 w-1/3" />
                            <div className="mt-2 flex gap-2">
                              <Skeleton className="h-8 flex-1" />
                              <Skeleton className="h-8 flex-1" />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : error ? (
                    <Card className="p-8 text-center">
                      <AlertCircle className="mx-auto size-7 text-destructive" />
                      <div className="mt-2 text-sm font-medium">
                        Couldn't load products
                      </div>
                      <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
                        {error}
                      </p>
                      <div className="mt-3 flex justify-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={simulateLoad}
                        >
                          <RefreshCw className="size-4" /> Retry
                        </Button>
                        <Button size="sm" onClick={goToListing}>
                          Reset filters
                        </Button>
                      </div>
                    </Card>
                  ) : filtered.length === 0 ? (
                    <Card className="p-10 text-center">
                      <Search className="mx-auto size-7 text-muted-foreground" />
                      <div className="mt-2 text-sm font-medium">
                        No products match your filters
                      </div>
                      <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
                        Try removing filters or ask AI to find the right product
                        for you.
                      </p>
                      <div className="mt-3 flex justify-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={clearAllFilters}
                        >
                          Reset filters
                        </Button>
                        <Button size="sm" onClick={() => setAiOpen(true)}>
                          <Sparkles className="size-4" /> Ask AI
                        </Button>
                      </div>
                    </Card>
                  ) : layout === "grid" ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-3">
                      {filtered.map((p) => (
                        <ProductCard
                          key={p.id}
                          p={p}
                          onOpen={() => openProduct(p.id)}
                          onAdd={() => addToCart(p.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filtered.map((p) => (
                        <ListRow
                          key={p.id}
                          p={p}
                          onOpen={() => openProduct(p.id)}
                          onAdd={() => addToCart(p.id)}
                          onBuy={() => {
                            addToCart(p.id)

                            setCartOpen(true)
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Footer-of-listing: load more + state demo */}
                  {!loading && !error && filtered.length > 0 && (
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        Showing {filtered.length} of {activeProducts.length}{" "}
                        products
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={simulateLoad}
                        >
                          <Loader2 className="size-4" /> Simulate loading
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={simulateError}
                        >
                          <AlertCircle className="size-4" /> Simulate error
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {view === "detail" && selectedProduct && (
            <ProductDetail
              product={selectedProduct}
              onClose={() => setView("listing")}
              onAddToCart={addToCart}
              onBuyNow={(id) => {
                addToCart(id)
                setCartOpen(true)
              }}
              onOpenAI={() => setAiOpen(true)}
              onOpenRelated={openProduct}
              loading={false}
              error={null}
            />
          )}

          {view === "track-order" && (
            <TrackOrder
              onClose={() => setView("home")}
              onOpenAI={() => setAiOpen(true)}
              initialValues={trackPrefill}
            />
          )}

          {view === "cart" && (
            <CartView
              cart={cart}
              onClose={() => setView("home")}
              onUpdateQty={updateQty}
              onRemove={(id) => updateQty(id, -999)}
              onApplyCoupon={() => {}}
              onCheckout={() => setView("checkout")}
              onOpenProduct={openProduct}
              cartTotal={cartTotal}
            />
          )}

          {view === "checkout" && (
            <CheckoutView
              cart={cart}
              cartTotal={cartTotal}
              onClose={() => setView("cart")}
              onBackToCart={() => setView("cart")}
              onPaymentSuccess={(orderId, paymentId, invoiceNo) => {
                setLastOrderId(orderId)
                setFailedOrderId(orderId)
                setLastPaymentId(paymentId)
                setLastInvoiceNo(invoiceNo)
                setLastOrderSnapshot([...cart])
                setView("payment-success")
              }}
              onPaymentFailed={(orderId) => {
                setView("payment-failed")
                setFailedOrderId(orderId)
              }}
              onOpenProduct={openProduct}
            />
          )}

          {view === "payment-failed" && (
            <PaymentFailedView
              orderId={failedOrderId || "ORD-123456"}
              onRetry={() => setView("checkout")}
              onChangeMethod={() => {}}
              onBackToCart={() => setView("cart")}
              onOpenAI={() => setAiOpen(true)}
            />
          )}

          {view === "payment-success" && (
            <PaymentSuccessView
              orderId={
                failedOrderId ||
                `ORD-${Math.floor(100000 + Math.random() * 900000)}`
              }
              paymentId={
                lastPaymentId ||
                `pay_${Math.random().toString(36).slice(2, 6).toUpperCase()}1234`
              }
              invoiceNo={
                lastInvoiceNo ||
                `INV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`
              }
              cartSnapshot={lastOrderSnapshot || cart}
              cartTotal={cartTotal}
              onTrackOrder={() => {
                // Section 4: Pass the real order info to the tracking screen
                // using the last known successful payment info from executeAgentCheckout.
                setTrackPrefill({
                  orderId: lastOrderId ?? lastPaymentId ?? failedOrderId ?? `ORD-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
                  mobile: SAVED_ADDRESSES[0]?.phone ?? "",
                  email: SAVED_ADDRESSES[0]?.email ?? "",
                })
                setView("track-order")
              }}
              onViewInvoice={() => setView("track-order")}
              onDownloadInvoice={() => {}}
              onContinueShopping={() => {
                setCart([])
                setView("listing")
              }}
              onAskAI={() => setAiOpen(true)}
            />
          )}

          {/* Footer — hidden in Ask AI workspace so split stays clean, and no footer on cart/checkout/payment */}
          {!aiOpen &&
            !["cart", "checkout", "payment-failed", "payment-success"].includes(
              view,
            ) && (
              <footer className="mt-6 border-t bg-card px-4 py-6">
                <div className="grid gap-6 text-xs md:grid-cols-4">
                  <div>
                    <div className="text-sm font-semibold">
                      {storeProfile.storeName}
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      Smart products for everyday use.{" "}
                      {storeProfile.businessName}.
                    </p>
                    <p className="mt-2 text-muted-foreground">
                      {storeProfile.supportEmail} · {storeProfile.supportPhone}
                    </p>
                  </div>
                  <div>
                    <div className="font-medium">Shop</div>
                    <div className="mt-2 flex flex-col gap-1 text-muted-foreground">
                      <button
                        onClick={() => setView("listing")}
                        className="text-left hover:text-foreground"
                      >
                        All products
                      </button>
                      <button
                        onClick={() => openCategory("Audio")}
                        className="text-left hover:text-foreground"
                      >
                        Audio
                      </button>
                      <button
                        onClick={() => openCategory("Electronics")}
                        className="text-left hover:text-foreground"
                      >
                        Electronics
                      </button>
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Help</div>
                    <div className="mt-2 flex flex-col gap-1 text-muted-foreground">
                      <span>Shipping</span>
                      <span>Returns</span>
                      <span>Policies</span>
                      <span>Contact</span>
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Payments</div>
                    <div className="mt-2 flex gap-2">
                      <Badge variant="outline">Razorpay</Badge>
                      <Badge variant="outline">UPI</Badge>
                      <Badge variant="outline">Cards</Badge>
                    </div>
                  </div>
                </div>
                <div className="mt-6 text-center text-[11px] text-muted-foreground">
                  © 2026 {storeProfile.businessName} · Secure payments powered
                  by Razorpay
                </div>
              </footer>
            )}
        </div>

        {/* RIGHT: AI Assistant — full-height panel, not a drawer/overlay */}
        {aiOpen && (
          <div className="flex min-h-[520px] flex-col border bg-card xl:sticky xl:top-0 xl:h-[calc(100vh-56px)] xl:border-l xl:border-t-0">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Sparkles className="size-4" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-sm font-semibold leading-none">
                    AI Assistant
                  </div>
                  <div className="text-[11px] text-emerald-600">
                    ● Online · {storeProfile.storeName}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setAiOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="flex-1 space-y-4 overflow-auto p-4">
              {aiMsgs.map((m, i) => (
                <div key={i}>
                  <Message align={m.role === "user" ? "end" : "start"}>
                    <MessageAvatar>
                      <Avatar className="size-7">
                        <AvatarFallback
                          className={
                            m.role === "assistant"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }
                        >
                          {m.role === "assistant" ? (
                            <Sparkles className="size-3.5" />
                          ) : (
                            <User className="size-3.5" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                    </MessageAvatar>
                    <MessageContent
                      className={
                        m.role === "user" ? "items-end" : "items-start"
                      }
                    >
                      <MessageHeader>
                        {m.role === "assistant" ? "AI Assistant" : "You"}
                      </MessageHeader>
                      <Bubble
                        variant={m.role === "user" ? "default" : "muted"}
                        align={m.role === "user" ? "end" : "start"}
                      >
                        {m.text}
                      </Bubble>
                    </MessageContent>
                  </Message>

                  {m.products && (
                    <div className="mt-3 grid gap-2">
                      {m.products.map((p) => (
                        <Card key={p.id} className="overflow-hidden">
                          <CardContent className="flex gap-3 p-3">
                            <img
                              src={p.image_url}
                              alt={p.title}
                              className="size-14 rounded-md object-cover"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium leading-tight">
                                {p.title}
                              </div>
                              <div className="text-xs text-muted-foreground line-clamp-1">
                                {p.description}
                              </div>
                              <div className="mt-1 flex items-center justify-between">
                                <span className="text-sm font-semibold">
                                  {formatPrice(p.price_paise)}
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openProduct(p.id)}
                                >
                                  View
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      <div className="flex flex-wrap gap-1.5">
                        <Button
                          size="sm"
                          onClick={() => handleAskAI("Compare these")}
                        >
                          Compare
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAskAI("Cheaper alternative")}
                        >
                          Cheaper option
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {aiMsgs.length === 1 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">
                    Try asking:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {SAMPLE_PROMPTS.map((s) => (
                      <button
                        key={s}
                        onClick={() => handleAskAI(s)}
                        className="rounded-full border bg-muted px-3 py-1.5 text-xs hover:bg-accent"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <Card className="bg-muted/50">
                    <CardContent className="p-3 text-xs leading-5 text-muted-foreground">
                      I can compare products, suggest a cheaper or better
                      option, and narrow by budget or use-case — then add to
                      cart for you.
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>

            <div className="border-t p-3">
              <div className="flex gap-2">
                <Input
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAskAI()}
                  placeholder="Ask for products, compare, or set a budget…"
                  className="h-9"
                />
                <Button
                  size="icon"
                  onClick={() => handleAskAI()}
                  disabled={!aiInput.trim()}
                >
                  <Send className="size-4" />
                </Button>
              </div>
              <div className="mt-2 text-center text-[11px] text-muted-foreground">
                AI can help choose — checkout is still your tap.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating AI button when closed */}
      {!aiOpen && (
        <button
          onClick={() => setAiOpen(true)}
          className="fixed bottom-5 right-5 z-40 grid size-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg ring-1 ring-primary/20 hover:bg-primary/90"
          aria-label="Ask AI Assistant"
        >
          <Sparkles className="size-5" />
        </button>
      )}

      {/* Cart Sheet */}
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent className="flex w-[380px] flex-col sm:w-[420px]">
          <SheetHeader>
            <SheetTitle>Cart · {cartCount} items</SheetTitle>
          </SheetHeader>
          <div className="flex-1 space-y-3 overflow-auto py-4">
            {cart.length === 0 ? (
              <Card className="p-8 text-center">
                <ShoppingCart className="mx-auto size-6 text-muted-foreground" />
                <div className="mt-2 text-sm font-medium">
                  Your cart is empty
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Browse products or ask AI for recommendations.
                </p>
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    setCartOpen(false)
                    setView("listing")
                  }}
                >
                  Shop products
                </Button>
              </Card>
            ) : (
              cart.map((c) => {
                const p = mockProducts.find((x) => x.id === c.id)!

                return (
                  <Card key={c.id} className="p-3">
                    <div className="flex gap-3">
                      <img
                        src={p.image_url}
                        alt={p.title}
                        className="size-14 rounded-md object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">
                          {p.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatPrice(p.price_paise)}
                        </div>
                        <div className="mt-1 flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="outline"
                            className="size-7"
                            onClick={() => updateQty(c.id, -1)}
                          >
                            {c.qty === 1 ? (
                              <Trash2 className="size-3" />
                            ) : (
                              <Minus className="size-3" />
                            )}
                          </Button>
                          <span className="w-6 text-center text-xs font-medium">
                            {c.qty}
                          </span>
                          <Button
                            size="icon"
                            variant="outline"
                            className="size-7"
                            onClick={() => updateQty(c.id, 1)}
                          >
                            <Plus className="size-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              })
            )}
          </div>
          {cart.length > 0 && (
            <div className="border-t pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold">{formatPrice(cartTotal)}</span>
              </div>
              <Button
                className="mt-3 w-full"
                onClick={() => {
                  setCartOpen(false)
                }}
              >
                Checkout · {formatPrice(cartTotal)}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

/* -------------------------------------------------------------------------- */

/*                                  Filter                                    */

/* -------------------------------------------------------------------------- */

type FilterProps = {
  categoryFilters: string[]

  setCategoryFilters: (v: string[]) => void

  brandFilters: string[]

  setBrandFilters: (v: string[]) => void

  priceMin: string

  setPriceMin: (v: string) => void

  priceMax: string

  setPriceMax: (v: string) => void

  minRating: number

  setMinRating: (v: number) => void

  stockOnly: boolean

  setStockOnly: (v: boolean) => void

  offerFilter: boolean

  setOfferFilter: (v: boolean) => void

  fastDelivery: boolean

  setFastDelivery: (v: boolean) => void

  onClear: () => void

  onClose?: () => void

  variant: "desktop" | "mobile"
}

function FilterSidebar(p: FilterProps) {
  function toggle<T>(arr: T[], v: T, set: (a: T[]) => void) {
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])
  }

  const body = (
    <div className="space-y-5 text-sm">
      <FilterGroup title="Category" defaultOpen>
        <div className="space-y-1.5">
          {ALL_CATEGORIES.map((c) => {
            const n = mockProducts.filter(
              (x) => x.status === "active" && x.category === c,
            ).length

            return (
              <label
                key={c}
                className="flex cursor-pointer items-center gap-2 text-xs text-foreground"
              >
                <Checkbox
                  checked={p.categoryFilters.includes(c)}
                  onCheckedChange={() =>
                    toggle(p.categoryFilters, c, p.setCategoryFilters)
                  }
                />
                <span className="flex-1 truncate">{c}</span>
                <span className="text-[10px] text-muted-foreground">{n}</span>
              </label>
            )
          })}
        </div>
      </FilterGroup>

      <FilterGroup title="Brand" defaultOpen>
        <div className="space-y-1.5">
          {ALL_BRANDS.map((b) => (
            <label
              key={b}
              className="flex cursor-pointer items-center gap-2 text-xs text-foreground"
            >
              <Checkbox
                checked={p.brandFilters.includes(b)}
                onCheckedChange={() =>
                  toggle(p.brandFilters, b, p.setBrandFilters)
                }
              />
              <span className="flex-1">{b}</span>
            </label>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Price range" defaultOpen>
        <div className="grid grid-cols-2 gap-2">
          <Input
            value={p.priceMin}
            onChange={(e) =>
              p.setPriceMin(e.target.value.replace(/[^0-9]/g, ""))
            }
            placeholder="Min ₹"
            inputMode="numeric"
            className="h-8 text-xs"
          />
          <Input
            value={p.priceMax}
            onChange={(e) =>
              p.setPriceMax(e.target.value.replace(/[^0-9]/g, ""))
            }
            placeholder="Max ₹"
            inputMode="numeric"
            className="h-8 text-xs"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[
            { label: "Under ₹5K", max: 5000 },

            { label: "₹5K–20K", min: 5000, max: 20000 },

            { label: "₹20K+", min: 20000 },
          ].map((r) => (
            <button
              key={r.label}
              onClick={() => {
                p.setPriceMin(r.min ? String(r.min) : "")

                p.setPriceMax(r.max ? String(r.max) : "")
              }}
              className="rounded-full border bg-card px-2.5 py-0.5 text-[11px] hover:bg-muted"
            >
              {r.label}
            </button>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Rating" defaultOpen>
        <div className="space-y-1.5">
          {[4, 3, 2, 0].map((r) => (
            <label
              key={r}
              className="flex cursor-pointer items-center gap-2 text-xs text-foreground"
            >
              <input
                type="radio"
                name="rating"
                checked={p.minRating === r}
                onChange={() => p.setMinRating(r)}
                className="size-3.5 accent-primary"
              />
              <span className="flex-1">
                {r === 0 ? "All ratings" : `${r}★ & up`}
              </span>
            </label>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Availability">
        <div className="space-y-1.5">
          <label className="flex cursor-pointer items-center gap-2 text-xs">
            <Checkbox
              checked={p.stockOnly}
              onCheckedChange={(v: boolean | "indeterminate") => p.setStockOnly(!!v)}
            />
            <span className="flex-1">In stock only</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-xs">
            <Checkbox
              checked={p.fastDelivery}
              onCheckedChange={(v: boolean | "indeterminate") => p.setFastDelivery(!!v)}
            />
            <span className="flex-1">Fast delivery</span>
          </label>
        </div>
      </FilterGroup>

      <FilterGroup title="Offers">
        <label className="flex cursor-pointer items-center gap-2 text-xs">
          <Checkbox
            checked={p.offerFilter}
            onCheckedChange={(v: boolean | "indeterminate") => p.setOfferFilter(!!v)}
          />
          <span className="flex-1">Best deals & bundles</span>
        </label>
      </FilterGroup>

      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={p.onClear}
        >
          Clear all
        </Button>
        {p.onClose && (
          <Button size="sm" className="flex-1" onClick={p.onClose}>
            Apply
          </Button>
        )}
      </div>
    </div>
  )

  if (p.variant === "desktop") {
    return <aside className="hidden lg:block">{body}</aside>
  }

  return <div className="p-4">{body}</div>
}

function FilterGroup({
  title,
  defaultOpen,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(!!defaultOpen)

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {title}
        <ChevronRight
          className={
            "size-3.5 transition-transform " + (open ? "rotate-90" : "")
          }
        />
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  )
}

/* -------------------------------------------------------------------------- */

/*                                Product UI                                  */

/* -------------------------------------------------------------------------- */

function ProductCard({
  p,
  onOpen,
  onAdd,
}: {
  p: typeof mockProducts[number]
  onOpen: () => void
  onAdd: () => void
}) {
  const r = productRating(p)

  const isNew = p.tags.includes("new")

  const isBest = p.tags.includes("bestseller") || p.tags.includes("bundle")

  return (
    <Card className="group flex flex-col overflow-hidden">
      <button onClick={onOpen} className="relative block overflow-hidden">
        <img
          src={p.image_url}
          alt={p.title}
          className="aspect-[4/3] w-full object-cover transition group-hover:scale-[1.02]"
        />
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {p.stock === 0 ? (
            <Badge variant="destructive">Out of stock</Badge>
          ) : p.stock < 10 ? (
            <Badge className="bg-amber-500 text-white hover:bg-amber-500">
              Low stock
            </Badge>
          ) : null}
          {isBest && (
            <Badge className="bg-emerald-500 text-white hover:bg-emerald-500">
              <Tag className="mr-1 size-3" />
              Deal
            </Badge>
          )}
          {isNew && <Badge variant="secondary">New</Badge>}
        </div>
      </button>
      <CardContent className="flex flex-1 flex-col gap-2 p-3">
        <div className="line-clamp-1 text-sm font-medium leading-tight">
          {p.title}
        </div>
        <div className="text-xs text-muted-foreground line-clamp-1">
          {p.description}
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Star className="size-3 fill-amber-400 text-amber-400" />{" "}
            {r.toFixed(1)}
            <span className="text-muted-foreground/60">
              · {Math.floor(p.id.length * 13) + 24} reviews
            </span>
          </span>
          <span className="text-[10px] text-muted-foreground">
            {p.stock > 0 ? `${p.stock} in stock` : "Out"}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-sm font-semibold">
            {formatPrice(p.price_paise)}
          </span>
          <Badge variant="outline" className="text-[11px]">
            {p.category}
          </Badge>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={onOpen}>
            <Eye className="size-3.5" /> View
          </Button>
          <Button size="sm" disabled={p.stock === 0} onClick={onAdd}>
            Add to cart
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ListRow({
  p,
  onOpen,
  onAdd,
  onBuy,
}: {
  p: typeof mockProducts[number]
  onOpen: () => void
  onAdd: () => void
  onBuy: () => void
}) {
  const r = productRating(p)

  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-[120px_1fr_auto] gap-3 p-3 sm:grid-cols-[160px_1fr_auto]">
        <button onClick={onOpen} className="block overflow-hidden rounded-md">
          <img
            src={p.image_url}
            alt={p.title}
            className="aspect-square w-full object-cover"
          />
        </button>
        <div className="min-w-0">
          <div className="flex items-start gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{p.title}</div>
              <div className="line-clamp-1 text-xs text-muted-foreground">
                {p.description}
              </div>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {p.stock === 0 ? (
              <Badge variant="destructive">Out of stock</Badge>
            ) : p.stock < 10 ? (
              <Badge className="bg-amber-500 text-white hover:bg-amber-500">
                Low stock
              </Badge>
            ) : (
              <Badge variant="secondary">{p.stock} in stock</Badge>
            )}
            {p.tags.includes("bestseller") && (
              <Badge className="bg-emerald-500 text-white hover:bg-emerald-500">
                Bestseller
              </Badge>
            )}
            {p.tags.includes("new") && <Badge variant="outline">New</Badge>}
            <Badge variant="outline" className="text-[11px]">
              {p.category}
            </Badge>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Star className="size-3 fill-amber-400 text-amber-400" />{" "}
            {r.toFixed(1)} · {Math.floor(p.id.length * 13) + 24} reviews
          </div>
        </div>
        <div className="flex flex-col items-end justify-between gap-2 text-right">
          <div>
            <div className="text-base font-semibold">
              {formatPrice(p.price_paise)}
            </div>
            <div className="text-[11px] text-muted-foreground">
              inclusive of all taxes
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onOpen}>
              <Eye className="size-3.5" /> View
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={p.stock === 0}
              onClick={onAdd}
            >
              Add to cart
            </Button>
            <Button size="sm" disabled={p.stock === 0} onClick={onBuy}>
              <Zap className="size-3.5" /> Buy now
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */

/*                              Product Detail                                */

/* -------------------------------------------------------------------------- */

interface ProductDetailProps {
  product: typeof mockProducts[number]

  onClose: () => void

  onAddToCart: (id: string) => void

  onBuyNow: (id: string) => void

  onOpenAI: () => void

  onOpenRelated: (id: string) => void

  loading?: boolean

  error?: string | null
}

// Generate deterministic product-specific data

function generateSpecs(p: typeof mockProducts[number]) {
  const base = {
    "Home Security": [
      "Resolution",
      "Night Vision",
      "Field of View",
      "Storage",
      "Connectivity",
    ],

    Computing: ["Processor", "RAM", "Storage", "Display", "Graphics"],

    Audio: [
      "Driver Size",
      "Frequency Response",
      "Battery Life",
      "Connectivity",
      "Noise Cancellation",
    ],

    Networking: ["Standard", "Speed", "Bands", "Ports", "Coverage"],

    Lighting: [
      "Brightness",
      "Color Temp",
      "Smart Protocol",
      "Dimmable",
      "Lifespan",
    ],

    Furniture: [
      "Material",
      "Dimensions",
      "Weight Capacity",
      "Finish",
      "Assembly",
    ],

    Wearables: [
      "Display",
      "Sensors",
      "Battery",
      "Water Resistance",
      "Compatibility",
    ],

    Fitness: [
      "Metrics",
      "Battery",
      "Water Resistance",
      "Connectivity",
      "App Support",
    ],
  }

  const keys = base[(p.category as keyof typeof base)] || [
    "Feature 1",
    "Feature 2",
    "Feature 3",
    "Feature 4",
    "Feature 5",
  ]

  const vals = p.id.split("").map((c, i) => {
    const opts = [
      ["1080p", "4K", "2K", "720p"],

      ["30m", "50m", "100m"],

      ["110°", "130°", "160°", "180°"],

      ["Cloud", "Local SD", "NVR"],

      ["Wi-Fi 6", "Wi-Fi 5", "Ethernet"],

      ["Intel i5", "Intel i7", "AMD Ryzen 5", "Apple M2"],

      ["8GB", "16GB", "32GB"],

      ["256GB SSD", "512GB SSD", "1TB SSD"],

      ['14" FHD', '15.6" 4K', '13.3" Retina'],

      ["Integrated", "RTX 3050", "RTX 4060"],

      ["40mm", "50mm", "10mm dynamic"],

      ["20Hz-20kHz", "10Hz-40kHz"],

      ["20h", "30h", "50h", "60h"],

      ["Bluetooth 5.3", "Bluetooth 5.0", "Wireless 2.4GHz"],

      ["ANC", "ENC", "Passive"],

      ["Wi-Fi 6", "Wi-Fi 6E", "Wi-Fi 7"],

      ["AX3000", "AX5400", "BE11000"],

      ["Dual-band", "Tri-band"],

      ["4× Gigabit", "2.5G WAN"],

      ["2500 sq ft", "3500 sq ft"],

      ["800 lm", "1200 lm", "1600 lm"],

      ["2700K-6500K", "RGBIC"],

      ["Matter", "Zigbee", "Wi-Fi"],

      ["Yes", "No"],

      ["25,000h", "50,000h"],

      ["Engineered wood", "Solid wood", "Metal"],

      ["120×60×75cm", "80×80×75cm"],

      ["100kg", "150kg"],

      ["Matte", "Gloss", "Natural"],

      ["Required", "Tool-free"],

      ['1.4" AMOLED', '1.8" LTPO', '1.3" LCD'],

      ["HR, SpO2, GPS", "HR, Sleep, Stress"],

      ["7 days", "14 days", "30 days"],

      ["5ATM", "IP68", "IP67"],

      ["iOS/Android", "Wear OS", "watchOS"],

      ["Steps, HR, Sleep", "VO2, Recovery, ECG"],

      ["10 days", "21 days"],

      ["5ATM", "IP68"],

      ["Bluetooth", "ANT+"],

      ["App A", "App B", "Native"],
    ]

    return opts[i % opts.length][c.charCodeAt(0) % opts[i % opts.length].length]
  })

  return keys.map((k, i) => ({ key: k, value: vals[i % vals.length] }))
}

function productDescription(p: typeof mockProducts[number]) {
  const descs: Record<string, string> = {
    "Home Security":
      "Keep your home safe with intelligent monitoring. This smart camera combines AI-powered motion detection with crystal-clear video, so you never miss a moment — day or night.",

    Computing:
      "Built for performance and portability. Whether you're creating, coding, or streaming, this laptop delivers the speed and reliability you need in a premium design.",

    Audio:
      "Experience sound the way it was meant to be heard. Premium drivers, adaptive noise cancellation, and all-day battery life make this your perfect audio companion.",

    Networking:
      "Eliminate dead zones and buffer-free streaming. Next-generation Wi-Fi with intelligent mesh technology covers every corner of your home.",

    Lighting:
      "Transform any space with millions of colors and tunable white. Voice control, schedules, and scenes — all without a hub.",

    Furniture:
      "Thoughtfully designed for modern living. Durable materials, ergonomic comfort, and timeless style that fits your space.",

    Wearables:
      "Stay connected and informed at a glance. Health tracking, notifications, and apps — all on your wrist.",

    Fitness:
      "Your personal coach on your wrist. Advanced metrics, guided workouts, and recovery insights help you train smarter.",
  }

  return (
    descs[p.category] ||
    "Premium quality product designed for everyday use. Reliable performance meets thoughtful design."
  )
}

function productFeatures(p: typeof mockProducts[number]) {
  const feats: Record<string, string[]> = {
    "Home Security": [
      "AI person/vehicle/package detection reduces false alerts",

      "Color night vision up to 30 meters",

      "Two-way audio with noise cancellation",

      "Local storage (microSD up to 256GB) + optional cloud",

      "Weatherproof IP66 — works in rain, heat, and cold",

      "Works with Alexa, Google Assistant, and Matter",
    ],

    Computing: [
      "Latest-generation processor for seamless multitasking",

      "High-refresh display with factory color calibration",

      "All-day battery with fast charge (0-50% in 30 min)",

      "Precision keyboard with per-key RGB",

      "Thunderbolt 4, USB-C, HDMI — all the ports you need",

      "Military-grade durability (MIL-STD-810H)",
    ],

    Audio: [
      "Hi-Res Audio certified with LDAC support",

      "Adaptive ANC adjusts to your environment in real-time",

      "Multipoint Bluetooth — connect two devices at once",

      "Speak-to-chat auto-pauses when you start talking",

      "Quick charge: 5 min = 60 min playback",

      "Comfortable for all-day wear with memory-foam tips",
    ],

    Networking: [
      "Wi-Fi 7 / 6E ready for future-proof speed",

      "Dedicated gaming port prioritizes traffic automatically",

      "AiMesh compatible — add nodes for whole-home coverage",

      "Commercial-grade security with AiProtection Pro",

      "Easy setup and management via mobile app",

      "VPN server/client built-in for secure remote access",
    ],

    Lighting: [
      "16 million colors + tunable white (2200K-6500K)",

      "Matter over Thread — no hub, instant response",

      "Music sync and dynamic scenes",

      "Circadian lighting follows your sleep schedule",

      "Group control and per-bulb customization",

      "Energy Star certified, 25,000-hour lifespan",
    ],

    Furniture: [
      "Sustainably sourced FSC-certified materials",

      "Ergonomic design tested for 8+ hour comfort",

      "Cable management built into the frame",

      "Adjustable height / recline / lumbar",

      "Easy 15-minute assembly with included tools",

      "10-year warranty on frame, 5-year on mechanisms",
    ],

    Wearables: [
      "Always-on display with 1000 nits brightness",

      "Comprehensive health: HR, SpO2, stress, sleep stages",

      "Built-in GPS + GLONASS + Galileo",

      "Contactless payments and transit",

      "100+ workout modes with auto-detection",

      "Water resistant to 50m — swim ready",
    ],

    Fitness: [
      "Advanced training metrics: VO2 max, recovery, load",

      "Built-in maps and turn-by-turn navigation",

      "Solar charging extends battery indefinitely",

      "Grade-adjusted pace for trail running",

      "Dive computer mode to 40m",

      "Garmin Connect ecosystem with challenges",
    ],
  }

  return (
    feats[p.category] || [
      "Premium build quality with attention to detail",

      "Designed for reliability and long-term use",

      "Easy setup and intuitive controls",

      "Backed by comprehensive warranty",
    ]
  )
}

function productShipping(p: typeof mockProducts[number]) {
  return [
    {
      title: "Standard Delivery",
      desc: "3–5 business days",
      price: "Free over ₹1,499",
    },

    { title: "Express Delivery", desc: "1–2 business days", price: "₹199" },

    {
      title: "Same Day (select cities)",
      desc: "Order before 12 PM",
      price: "₹399",
    },

    {
      title: "Installation Available",
      desc: "For appliances & furniture",
      price: "From ₹499",
    },
  ]
}

function productReturns() {
  return [
    "7-day easy returns — no questions asked",

    "Free return pickup for eligible items",

    "Refund to original payment method within 5–7 days",

    "Items must be unused with original packaging",

    "Extended 30-day returns for members",
  ]
}

function productWarranty(p: typeof mockProducts[number]) {
  const base: Record<string, string> = {
    "Home Security":
      "2-year manufacturer warranty + 1-year extended on registration",

    Computing:
      "1-year international warranty + accidental damage protection optional",

    Audio: "1-year warranty + 6-month cable replacement",

    Networking: "3-year warranty with 24/7 technical support",

    Lighting: "2-year warranty on electronics, 1-year on bulbs",

    Furniture: "10-year structural warranty, 5-year mechanisms, 1-year fabric",

    Wearables: "1-year international warranty",

    Fitness: "2-year warranty + 1-year battery guarantee",
  }

  return base[p.category] || "1-year standard manufacturer warranty"
}

function productReviews(p: typeof mockProducts[number]) {
  const r = productRating(p)

  const count = Math.floor(p.id.length * 13) + 24

  const reviews = [
    {
      name: "Rahul S.",
      rating: Math.min(5, Math.ceil(r)),
      date: "2 days ago",
      text: "Exactly what I needed. Setup was breeze and performance is solid.",
      verified: true,
    },

    {
      name: "Priya M.",
      rating: Math.min(5, Math.ceil(r + 0.3)),
      date: "1 week ago",
      text: "Great value for money. The AI features actually work well.",
      verified: true,
    },

    {
      name: "Amit K.",
      rating: Math.max(3, Math.floor(r - 0.5)),
      date: "2 weeks ago",
      text: "Good product but delivery took a day longer than promised.",
      verified: true,
    },

    {
      name: "Sneha R.",
      rating: 5,
      date: "3 weeks ago",
      text: "Love it! The build quality feels premium. Highly recommend.",
      verified: true,
    },

    {
      name: "Vikram T.",
      rating: Math.min(5, Math.ceil(r - 0.2)),
      date: "1 month ago",
      text: "Works as advertised. Customer support was helpful when I had a query.",
      verified: false,
    },
  ]

  return { rating: r, count, reviews }
}

function relatedProducts(p: typeof mockProducts[number]) {
  // Same category, different products

  const sameCat = mockProducts
    .filter(
      (x) =>
        x.status === "active" && x.category === p.category && x.id !== p.id,
    )
    .slice(0, 8)

  if (sameCat.length >= 4) return sameCat

  // Fallback: other categories

  return mockProducts
    .filter((x) => x.status === "active" && x.id !== p.id)
    .slice(0, 8)
}

function ProductSkeleton() {
  return (
    <div className="space-y-6 px-4">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-4 w-1/2" />
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="aspect-square w-full rounded-lg" />
        <div className="space-y-4">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-10 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  )
}

function ProductError({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <Card className="border-destructive/50 mx-4 mt-4">
      <CardContent className="p-8 text-center">
        <AlertCircle className="mx-auto size-12 text-destructive" />
        <h3 className="mt-3 font-semibold">Unable to load product</h3>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        <Button className="mt-4" onClick={onRetry}>
          <RefreshCw className="size-4 mr-2" /> Try again
        </Button>
      </CardContent>
    </Card>
  )
}

function ProductEmpty({ onBack }: { onBack: () => void }) {
  return (
    <Card className="border-destructive/50 mx-4 mt-4">
      <CardContent className="p-8 text-center">
        <PackageCheck className="mx-auto size-12 text-muted-foreground" />
        <h3 className="mt-3 font-semibold">Product unavailable</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          This product is no longer available or has been removed.
        </p>
        <Button className="mt-4" variant="outline" onClick={onBack}>
          <ArrowRight className="size-4 mr-2" /> Back to products
        </Button>
      </CardContent>
    </Card>
  )
}

function ProductDetail({
  product,
  onClose,
  onAddToCart,
  onBuyNow,
  onOpenAI,
  onOpenRelated,
  loading = false,
  error = null,
}: ProductDetailProps) {
  const [qty, setQty] = useState(1)

  const [activeThumb, setActiveThumb] = useState(0)

  const [activeTab, setActiveTab] = useState<string>("description")

  const specs = generateSpecs(product)

  const desc = productDescription(product)

  const feats = productFeatures(product)

  const shipping = productShipping(product)

  const returns = productReturns()

  const warranty = productWarranty(product)

  const { rating, count, reviews } = productReviews(product)

  const related = relatedProducts(product)

  if (loading) return <ProductSkeleton />

  if (error)
    return (
      <ProductError message={error} onRetry={() => window.location.reload()} />
    )

  if (!product) return <ProductEmpty onBack={onClose} />

  const thumbs = [
    product.image_url,
    ...(product.tags.includes("bundle")
      ? [
          "https://picsum.photos/seed/thumb1/400/400",
          "https://picsum.photos/seed/thumb2/400/400",
        ]
      : []),
  ]

  return (
    <section className="px-4 pb-12">
      {/* Breadcrumb handled by parent */}

      {/* Main content grid */}
      <div className="mx-auto max-w-[1280px]">
        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
          {/* LEFT: Image + Detail Tabs */}
          <div className="space-y-6">
            {/* Image Gallery */}
            <Card className="overflow-hidden">
              <div className="aspect-square relative overflow-hidden">
                <img
                  src={thumbs[activeThumb]}
                  alt={product.title}
                  className="w-full h-full object-cover transition-opacity duration-300"
                />
                {thumbs.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {thumbs.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveThumb(i)}
                        className={`size-2 rounded-full transition ${
                          i === activeThumb
                            ? "bg-white"
                            : "bg-white/50 hover:bg-white"
                        }`}
                        aria-label={`View image ${i + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
              {thumbs.length > 1 && (
                <div className="p-3 border-t flex gap-2 overflow-x-auto">
                  {thumbs.map((t, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveThumb(i)}
                      className={`flex-shrink-0 size-16 rounded-md overflow-hidden border-2 transition ${
                        i === activeThumb
                          ? "border-primary"
                          : "border-transparent hover:border-muted"
                      }`}
                    >
                      <img
                        src={t}
                        alt={`Thumb ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </Card>

            {/* Key Highlights */}
            <Card>
              <CardContent className="pt-4">
                <h3 className="font-semibold text-sm">Why buy from us</h3>
                <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
                  {[
                    {
                      icon: Truck,
                      label: "Free delivery",
                      desc: "Over ₹1,499",
                    },

                    {
                      icon: RotateCcw,
                      label: "7-day returns",
                      desc: "No questions",
                    },

                    {
                      icon: ShieldCheck,
                      label: "Razorpay secure",
                      desc: "Protected payments",
                    },

                    {
                      icon: PackageCheck,
                      label: "Original product",
                      desc: "Brand authorized",
                    },

                    {
                      icon: Headset,
                      label: "24/7 support",
                      desc: "Chat & call",
                    },
                  ].map((h, i) => (
                    <div key={i} className="text-center text-xs">
                      <div className="mx-auto size-8 flex items-center justify-center rounded-full bg-muted">
                        <h.icon className="size-4 text-primary" />
                      </div>
                      <div className="mt-1 font-medium">{h.label}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {h.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Detail Tabs */}
            <Card>
              <CardContent className="pt-4">
                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
                    <TabsTrigger value="description">Description</TabsTrigger>
                    <TabsTrigger value="features">Features</TabsTrigger>
                    <TabsTrigger value="specs">Specifications</TabsTrigger>
                    <TabsTrigger value="shipping">Shipping</TabsTrigger>
                    <TabsTrigger value="returns">Returns</TabsTrigger>
                    <TabsTrigger value="warranty">Warranty</TabsTrigger>
                    <TabsTrigger value="reviews">Reviews ({count})</TabsTrigger>
                  </TabsList>

                  <TabsContent
                    value="description"
                    className="prose prose-sm max-w-none text-muted-foreground mt-4"
                  >
                    <p>{desc}</p>
                    <p className="mt-4">Key benefits:</p>
                    <ul className="mt-2 list-disc pl-5 space-y-1">
                      {feats.slice(0, 4).map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </TabsContent>

                  <TabsContent value="features" className="mt-4 space-y-2">
                    {feats.map((f, i) => (
                      <div key={i} className="flex gap-3 text-sm">
                        <Check className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="specs" className="mt-4">
                    <table className="w-full text-sm">
                      <tbody>
                        {specs.map((s, i) => (
                          <tr key={i} className="border-t last:border-b">
                            <td className="py-2 text-muted-foreground">
                              {s.key}
                            </td>
                            <td className="py-2 text-right font-medium">
                              {s.value}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </TabsContent>

                  <TabsContent value="shipping" className="mt-4 space-y-3">
                    {shipping.map((s, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                      >
                        <div>
                          <div className="font-medium">{s.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {s.desc}
                          </div>
                        </div>
                        <span className="font-medium text-primary">
                          {s.price}
                        </span>
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="returns" className="mt-4 space-y-2">
                    {returns.map((r, i) => (
                      <div key={i} className="flex gap-2 text-sm">
                        <RotateCcw className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{r}</span>
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent
                    value="warranty"
                    className="mt-4 text-sm text-muted-foreground"
                  >
                    <p>{warranty}</p>
                    <p className="mt-2">
                      Warranty covers manufacturing defects. Register your
                      product within 30 days to activate extended coverage.
                    </p>
                  </TabsContent>

                  <TabsContent value="reviews" className="mt-4 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="text-4xl font-bold">
                        {rating.toFixed(1)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`size-4 ${
                                  i < Math.round(rating)
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-muted-foreground"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {count} reviews
                          </span>
                        </div>
                        <div className="mt-2 h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500"
                            style={{ width: `${(rating / 5) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <Separator />
                    {reviews.map((rev, i) => (
                      <Card key={i} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="font-medium">{rev.name}</div>
                            {rev.verified && (
                              <Badge
                                variant="secondary"
                                className="text-[10px]"
                              >
                                Verified
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <span>{rev.date}</span>
                            <div className="flex">
                              {[...Array(5)].map((_, j) => (
                                <Star
                                  key={j}
                                  className={`size-3 ${
                                    j < rev.rating
                                      ? "fill-amber-400 text-amber-400"
                                      : "text-muted-foreground"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        <p className="mt-2 text-sm">{rev.text}</p>
                      </Card>
                    ))}
                    <Button variant="outline" className="w-full">
                      View all reviews
                    </Button>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Related Products */}
            {related.length > 0 && (
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">You may also like</h3>
                    <Button variant="ghost" size="sm" onClick={() => onClose()}>
                      View all
                    </Button>
                  </div>
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    {related.map((rp) => (
                      <Card key={rp.id} className="overflow-hidden">
                        <button
                          onClick={() => onOpenRelated(rp.id)}
                          className="block overflow-hidden"
                        >
                          <img
                            src={rp.image_url}
                            alt={rp.title}
                            className="aspect-[4/3] w-full object-cover transition hover:scale-[1.02]"
                          />
                        </button>
                        <CardContent className="p-3 space-y-2">
                          <div className="truncate text-sm font-medium">
                            {rp.title}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold">
                              {formatPrice(rp.price_paise)}
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              {rp.category}
                            </Badge>
                          </div>
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={(e) => {
                              e.stopPropagation()
                              onAddToCart(rp.id)
                            }}
                          >
                            Add to cart
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* RIGHT: Summary Panel — sticky */}
          <div className="hidden lg:block lg:sticky lg:top-24 lg:self-start space-y-4">
            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Badge variant="outline">{product.category}</Badge>
                    <h1 className="mt-2 font-heading text-lg font-semibold leading-tight">
                      {product.title}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {product.description}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <Heart className="size-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Star className="size-3.5 fill-amber-400 text-amber-400" />{" "}
                  {rating.toFixed(1)} · {count} reviews
                </div>

                <div className="flex items-baseline gap-3">
                  <span className="text-2xl font-semibold">
                    {formatPrice(product.price_paise)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    inclusive of all taxes
                  </span>
                </div>

                <Badge
                  variant={product.stock > 0 ? "secondary" : "destructive"}
                  className="text-sm"
                >
                  {product.stock > 0
                    ? `In stock · ${product.stock} available`
                    : "Out of stock"}
                </Badge>

                <Separator />

                {/* Qty selector */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Quantity
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQty((v) => Math.max(1, v - 1))}
                      disabled={qty <= 1}
                    >
                      <Minus className="size-4" />
                    </Button>
                    <Input
                      type="number"
                      value={qty}
                      onChange={(e) =>
                        setQty(Math.max(1, parseInt(e.target.value) || 1))
                      }
                      className="w-16 text-center"
                      min={1}
                      max={product.stock}
                      inputMode="numeric"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setQty((v) => Math.min(product.stock, v + 1))
                      }
                      disabled={qty >= product.stock}
                    >
                      <Plus className="size-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground ml-2">
                      Max {product.stock}
                    </span>
                  </div>
                </div>

                <Separator />

                {/* Action buttons */}
                <div className="space-y-2">
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={() => onAddToCart(product.id)}
                    disabled={product.stock === 0}
                  >
                    <ShoppingCart className="size-4 mr-2" /> Add to cart
                  </Button>
                  <Button
                    variant="default"
                    size="lg"
                    className="w-full bg-primary"
                    onClick={() => onBuyNow(product.id)}
                    disabled={product.stock === 0}
                  >
                    <Zap className="size-4 mr-2" /> Buy now
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full"
                    onClick={onOpenAI}
                  >
                    <Sparkles className="size-4 mr-2" /> Ask AI
                  </Button>
                </div>

                <Separator />

                {/* Share */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Share:</span>
                  <Button variant="ghost" size="icon" className="size-8">
                    <Share2 className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-8">
                    <ImageIcon className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-8">
                    <GalleryThumbnails className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Trust badges sticky card */}
            <Card>
              <CardContent className="p-4 space-y-3 text-xs">
                {[
                  {
                    icon: Truck,
                    title: "Fast delivery",
                    desc: "Arrives in 1–3 days",
                  },

                  {
                    icon: ShieldCheck,
                    title: "Secure payment",
                    desc: "Powered by Razorpay",
                  },

                  {
                    icon: RotateCcw,
                    title: "Easy returns",
                    desc: "7-day no-questions",
                  },

                  {
                    icon: Headset,
                    title: "24/7 support",
                    desc: "Chat, email, call",
                  },
                ].map((t, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="grid size-8 place-items-center rounded-lg bg-muted">
                      <t.icon className="size-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">{t.title}</div>
                      <div className="text-muted-foreground">{t.desc}</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */

/*                              Track Order                                   */

/* -------------------------------------------------------------------------- */

interface TrackOrderProps {
  onClose: () => void
  onOpenAI: () => void
  initialValues?: { orderId?: string; mobile?: string; email?: string } | null
}

const TRACKING_STAGES = [
  { key: "preparing", label: "Preparing", desc: "Order received & confirmed" },

  { key: "packed", label: "Packed", desc: "Items packed & labelled" },

  { key: "shipped", label: "Shipped", desc: "Handed to carrier" },

  {
    key: "out-for-delivery",
    label: "Out for Delivery",
    desc: "On the way to you",
  },

  { key: "delivered", label: "Delivered", desc: "Delivered to your door" },
] as const

type TrackStageKey = typeof TRACKING_STAGES[number]["key"]

interface OrderData {
  orderId: string

  customerName: string

  productName: string

  amount: number

  paymentMethod: string

  orderStatus: "processing" | "confirmed" | "shipped" | "out-for-delivery" | "delivered" | "cancelled"

  paymentStatus: "paid" | "pending" | "failed"

  invoiceNumber: string

  invoiceDate: string

  trackingStage: TrackStageKey

  attemptTime: string

  paymentReason?: string
}

function generateMockOrder(
  orderId: string,
  mobile: string,
  email: string,
): any | null {
  // Section 4: Real tracking backed by the API seam.
  // The async path uses trackOrder (from client.ts); this sync wrapper
  // is kept for compatibility with the existing component contract.
  try {
    const order = orderStore.get(orderId)
    if (!order) return null
    const cleanMobile = mobile.replace(/\D/g, "")
    const cleanEmail = email.trim().toLowerCase()
    if (cleanMobile.length < 10 || !cleanEmail.includes("@")) return null
    // Derive display fields from real order data
    const primaryItem = order.items?.[0]
    const trackingStage = order.tracking?.events?.[0]?.status ?? "pending"
    const paymentStatus = order.status === "paid" ? "paid" : (order.status === "failed" ? "failed" : "pending")
    const invoiceNo = `INV-${order.id.slice(-6)}`
    const invoiceDate = new Date(order.created_at ?? Date.now()).toLocaleDateString("en-IN")
    return {
      orderId: order.id,
      customerName: email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      productName: primaryItem?.title ?? "Unknown product",
      amount: order.total_paise,
      paymentMethod: order.via_ai ? "UPI" : (primaryItem ? "Card" : "UPI"),
      orderStatus: order.shipping_status ?? "confirmed",
      paymentStatus,
      invoiceNumber: invoiceNo,
      invoiceDate,
      trackingStage: trackingStage.toLowerCase().replace(/\s+/g, "-"),
      attemptTime: new Date().toLocaleString("en-IN"),
      paymentReason: paymentStatus === "failed" ? "Transaction declined by bank" : undefined,
    }
  } catch {
    return null
  }
}

function TrackOrderSkeleton() {
  return (
    <div className="space-y-4 px-4">
      <Skeleton className="h-8 w-1/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  )
}

function TrackOrderError({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <Card className="border-destructive/50">
      <CardContent className="p-8 text-center">
        <AlertCircle className="mx-auto size-12 text-destructive" />
        <h3 className="mt-3 font-semibold">Unable to track order</h3>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        <Button className="mt-4" onClick={onRetry}>
          <RefreshCw className="size-4 mr-2" /> Try again
        </Button>
      </CardContent>
    </Card>
  )
}

function TrackOrderEmpty({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="p-8 text-center">
      <PackageCheck className="mx-auto size-12 text-muted-foreground" />
      <h3 className="mt-3 font-semibold">No order found</h3>
      <p className="mt-1 max-w-md mx-auto text-sm text-muted-foreground">
        We couldn't find an order matching those details. Please check your
        Order ID, mobile number, and email address.
      </p>
      <Button className="mt-4" onClick={onRetry}>
        <RefreshCw className="size-4 mr-2" /> Try again
      </Button>
    </Card>
  )
}

function PaymentStatusBadge({
  status,
}: {
  status: OrderData["paymentStatus"]
}) {
  const config = {
    paid: {
      variant: "secondary" as const,
      icon: <PackageCheck className="size-3.5 text-emerald-600" />,
      label: "Paid",
    },

    pending: {
      variant: "default" as const,
      icon: <Loader2 className="size-3.5 animate-spin text-amber-600" />,
      label: "Pending",
    },

    failed: {
      variant: "destructive" as const,
      icon: <AlertCircle className="size-3.5" />,
      label: "Failed",
    },
  }

  const c = config[status]

  return (
    <Badge variant={c.variant} className="gap-1.5 text-sm">
      {c.icon} {c.label}
    </Badge>
  )
}

function OrderTimeline({ currentStage }: { currentStage: TrackStageKey }) {
  const idx = TRACKING_STAGES.findIndex((s) => s.key === currentStage)

  return (
    <div className="space-y-4">
      {TRACKING_STAGES.map((stage, i) => {
        const isActive = i <= idx

        const isCurrent = i === idx

        return (
          <div key={stage.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`relative size-8 rounded-full flex items-center justify-center border-2 transition-all ${
                  isActive
                    ? "bg-primary border-primary text-primary-foreground"
                    : "bg-background border-muted"
                }`}
              >
                {isActive ? (
                  <Check className="size-4" />
                ) : (
                  <div className="size-2 rounded-full bg-muted" />
                )}
              </div>
              {i < TRACKING_STAGES.length - 1 && (
                <div
                  className={`mt-1 size-0.5 flex-1 ${
                    isActive ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
            <div className="flex-1 pt-1">
              <div
                className={`font-medium text-sm ${
                  isActive ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {stage.label}
                {isCurrent && (
                  <span className="ml-2 text-xs bg-primary/10 text-primary px-1.5 rounded">
                    Current
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">{stage.desc}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TrackOrder({ onClose, onOpenAI, initialValues }: TrackOrderProps) {
  const { storeProfile } = useSettings()

  const [orderId, setOrderId] = useState(initialValues?.orderId ?? "")
  const [mobile, setMobile] = useState(initialValues?.mobile ?? "")
  const [email, setEmail] = useState(initialValues?.email ?? "")

  const [submitted, setSubmitted] = useState(false)

  const [loading, setLoading] = useState(false)

  const [error, setError] = useState<string | null>(null)

  const [orderData, setOrderData] = useState<OrderData | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitted(true)
    setLoading(true)

    try {
      // Section 4: Real order lookup through the API seam instead of synthetic generation.
      const result = await trackOrder({
        orderId: orderId.trim(),
        mobile: mobile.trim(),
        email: email.trim(),
      })
      if (result) {
        const primaryItem = result.items?.[0]
        const data: OrderData = {
          orderId: result.id,
          customerName: result.shipping_address?.full_name ?? email.trim().split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          productName: primaryItem?.title ?? "Unknown product",
          amount: result.total_paise,
          paymentMethod: result.via_ai ? "UPI" : (primaryItem ? "Card" : "UPI"),
          orderStatus: result.shipping_status === "delivered"
            ? "delivered"
            : result.shipping_status === "shipped"
              ? "shipped"
              : result.status === "failed"
                ? "cancelled"
                : "processing",
          paymentStatus: result.status === "paid" ? "paid" : (result.status === "failed" ? "failed" : "pending"),
          invoiceNumber: `INV-${result.id.slice(-6)}`,
          invoiceDate: new Date(result.created_at ?? Date.now()).toLocaleDateString("en-IN"),
          trackingStage: result.shipping_status === "delivered"
            ? "delivered"
            : result.shipping_status === "shipped"
              ? "shipped"
              : result.shipping_status === "packed"
                ? "packed"
                : "preparing",
          attemptTime: new Date(result.created_at ?? Date.now()).toLocaleString("en-IN"),
          paymentReason: result.status === "failed" ? "Transaction declined by bank" : undefined,
        }
        setOrderData(data)
      } else {
        setOrderData(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      setOrderData(null)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    if (loading) return <TrackOrderSkeleton />

    if (error)
      return (
        <TrackOrderError
          message={error}
          onRetry={() => {
            setSubmitted(false)
            setError(null)
            setLoading(false)
          }}
        />
      )

    if (!orderData)
      return (
        <TrackOrderEmpty
          onRetry={() => {
            setSubmitted(false)
            setError(null)
          }}
        />
      )
  }

  if (!submitted) {
    return (
      <section className="px-4 py-6">
        <div className="mx-auto max-w-[600px] space-y-6">
          <div className="text-center">
            <h1 className="font-heading text-2xl font-semibold">Track Order</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your order details to view payment, invoice, and delivery
              status.
            </p>
          </div>

          <Card>
            <CardContent className="p-6 space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="orderId">Order ID</Label>
                  <Input
                    id="orderId"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    placeholder="ORD-123456"
                    required
                    className="h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mobile">Mobile Number</Label>
                  <Input
                    id="mobile"
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="+91 98765 43210"
                    required
                    className="h-10"
                    inputMode="tel"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="h-10"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  ) : (
                    "Track Order"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-muted/50">
            <CardContent className="p-4 text-center text-sm text-muted-foreground">
              <div className="flex items-center justify-center gap-2 text-xs mb-2">
                <ShieldCheck className="size-3.5 text-emerald-600" /> Secure
                payments powered by Razorpay
              </div>
              <div>
                Need help?{" "}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onOpenAI}
                  className="p-0 h-auto"
                >
                  <Sparkles className="size-3.5 mr-1" /> Ask AI
                </Button>
              </div>
              <div className="mt-2">support@razent.com · +91 80 1234 5678</div>
            </CardContent>
          </Card>
        </div>
      </section>
    )
  }

  const {
    orderId: oid,
    customerName,
    productName,
    amount,
    paymentMethod,
    orderStatus,
    paymentStatus,
    invoiceNumber,
    invoiceDate,
    trackingStage,
    attemptTime,
    paymentReason,
  } = orderData!

  return (
    <section className="px-4 py-6">
      <div className="mx-auto max-w-[900px] space-y-6">
        {/* Failure summary if payment failed */}
        {paymentStatus === "failed" && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <AlertCircle className="size-6 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h2 className="font-semibold text-destructive">
                    Payment Failed
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your payment could not be completed.
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
                    <span>
                      <span className="font-medium">Order ID:</span> {oid}
                    </span>
                    <span>
                      <span className="font-medium">Amount:</span>{" "}
                      {formatPrice(amount)}
                    </span>
                    {paymentReason && (
                      <span className="text-destructive/80">
                        {paymentReason}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Result card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Order Details
                <Badge variant="outline" className="text-xs capitalize">
                  {orderStatus}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Order ID:</span>{" "}
                  <span className="ml-2 font-mono">{oid}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Customer:</span>{" "}
                  <span className="ml-2">{customerName}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground">Product:</span>{" "}
                  <span className="ml-2">{productName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Amount:</span>{" "}
                  <span className="ml-2 font-semibold">
                    {formatPrice(amount)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Payment method:</span>{" "}
                  <span className="ml-2">{paymentMethod}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Order status:</span>{" "}
                  <span className="ml-2 capitalize">{orderStatus}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment status card */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <PaymentStatusBadge status={paymentStatus} />
              {paymentStatus === "paid" && (
                <div className="text-sm text-emerald-600">
                  Payment confirmed on {attemptTime}
                </div>
              )}
              {paymentStatus === "pending" && (
                <div className="text-sm text-amber-600">
                  Payment is being processed. Check back in a few minutes.
                </div>
              )}
              {paymentStatus === "failed" && (
                <div className="text-sm text-destructive">
                  {paymentReason ||
                    "Payment was declined. Please try again or use a different method."}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Invoice card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Invoice
              <Badge variant="secondary" className="text-xs">
                Available
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2 text-sm">
              <div>
                <span className="text-muted-foreground">Invoice number:</span>{" "}
                <span className="ml-2 font-mono">{invoiceNumber}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Date:</span>{" "}
                <span className="ml-2">{invoiceDate}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>{" "}
                <span className="ml-2">
                  {paymentStatus === "paid" ? "Paid" : "Pending payment"}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm">
                <Download className="size-3.5 mr-1.5" /> Download Invoice
              </Button>
              <Button variant="outline" size="sm">
                <Eye className="size-3.5 mr-1.5" /> View Invoice
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Dummy tracking card */}
        <Card>
          <CardHeader>
            <CardTitle>Delivery Tracking</CardTitle>
          </CardHeader>
          <CardContent>
            <OrderTimeline currentStage={trackingStage} />
          </CardContent>
        </Card>

        {/* Support card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Headset className="size-4 text-primary" /> Need help?
            </h3>
            <div className="grid gap-2 sm:grid-cols-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-3.5" /> Secure payments via
                Razorpay
              </div>
              <div className="flex items-center gap-2">
                <RotateCcw className="size-3.5" /> 7-day easy returns
              </div>
              <div className="flex items-center gap-2">
                <Mail className="size-3.5" /> {storeProfile.supportEmail}
              </div>
              <div className="flex items-center gap-2">
                <Phone className="size-3.5" /> {storeProfile.supportPhone}
              </div>
            </div>
            <Button
              variant="outline"
              onClick={onOpenAI}
              className="w-full sm:w-auto"
            >
              <Sparkles className="size-3.5 mr-2" /> Ask AI Assistant
            </Button>
          </CardContent>
        </Card>

        {/* Back button */}
        <div className="text-center">
          <Button variant="ghost" onClick={onClose}>
            <ArrowRight className="size-4 mr-1" /> Back to Home
          </Button>
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */

/*                                  Cart                                      */

/* -------------------------------------------------------------------------- */

interface CartViewProps {
  cart: CartItem[]

  onClose: () => void

  onUpdateQty: (id: string, delta: number) => void

  onRemove: (id: string) => void

  onApplyCoupon: () => void

  onCheckout: () => void

  onOpenProduct: (id: string) => void

  cartTotal: number
}

function CartSkeleton() {
  return (
    <div className="space-y-4 px-4">
      <Skeleton className="h-8 w-1/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  )
}

function CartEmpty({ onClose }: { onClose: () => void }) {
  return (
    <Card className="p-10 text-center">
      <ShoppingCart className="mx-auto size-12 text-muted-foreground" />
      <h3 className="mt-3 font-semibold">Your cart is empty</h3>
      <p className="mt-1 max-w-md mx-auto text-sm text-muted-foreground">
        Looks like you haven't added any products yet.
      </p>
      <Button className="mt-4" onClick={onClose}>
        <ArrowRight className="size-4 mr-2" /> Browse products
      </Button>
    </Card>
  )
}

function CartView({
  cart,
  onClose,
  onUpdateQty,
  onRemove,
  onApplyCoupon,
  onCheckout,
  onOpenProduct,
  cartTotal,
}: CartViewProps) {
  const [coupon, setCoupon] = useState("")

  const [couponApplied, setCouponApplied] = useState(false)

  const [discount, setDiscount] = useState(0)

  const shipping = cartTotal > 149900 ? 0 : 9900 // Free over ₹1,499

  const tax = Math.round((cartTotal - discount + shipping) * 0.18)

  const total = cartTotal - discount + shipping + tax

  const handleApplyCoupon = () => {
    if (!coupon.trim()) return

    const code = coupon.trim().toUpperCase()

    if (code === "SAVE100") {
      setDiscount(10000)

      setCouponApplied(true)
    } else if (code === "WELCOME50") {
      setDiscount(5000)

      setCouponApplied(true)
    } else {
      setDiscount(0)

      setCouponApplied(false)
    }

    onApplyCoupon()
  }

  if (cart.length === 0) return <CartEmpty onClose={onClose} />

  return (
    <section className="px-4 pb-12">
      <div className="mx-auto max-w-[1000px] space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-semibold">Your Cart</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Review your items and proceed to checkout.
            </p>
          </div>
          <Button variant="ghost" onClick={onClose}>
            <ArrowRight className="size-4 mr-1" /> Continue shopping
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* LEFT: Cart items */}
          <div className="space-y-4">
            {cart.map((c) => {
              const p = mockProducts.find((x) => x.id === c.id)!

              const itemTotal = p.price_paise * c.qty

              return (
                <Card key={c.id} className="p-3">
                  <div className="flex gap-4">
                    <button
                      onClick={() => onOpenProduct(p.id)}
                      className="block overflow-hidden rounded-md"
                    >
                      <img
                        src={p.image_url}
                        alt={p.title}
                        className="size-20 object-cover"
                      />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <button
                            onClick={() => onOpenProduct(p.id)}
                            className="truncate font-medium hover:underline"
                          >
                            {p.title}
                          </button>
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                            {p.description}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onRemove(p.id)}
                        >
                          <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        {p.stock === 0 ? (
                          <Badge variant="destructive">Out of stock</Badge>
                        ) : p.stock < 10 ? (
                          <Badge className="bg-amber-500 text-white hover:bg-amber-500">
                            Low stock
                          </Badge>
                        ) : (
                          <Badge variant="secondary">{p.stock} in stock</Badge>
                        )}
                        {p.tags.includes("bestseller") && (
                          <Badge className="bg-emerald-500 text-white">
                            Bestseller
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[11px]">
                          {p.category}
                        </Badge>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 border rounded-md">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => onUpdateQty(p.id, -1)}
                            disabled={c.qty <= 1}
                          >
                            <Minus className="size-3.5" />
                          </Button>
                          <Input
                            type="number"
                            value={c.qty}
                            onChange={(e) => {
                              const v = Math.max(
                                1,
                                Math.min(
                                  p.stock,
                                  parseInt(e.target.value) || 1,
                                ),
                              )

                              onUpdateQty(p.id, v - c.qty)
                            }}
                            className="w-12 text-center h-8"
                            min={1}
                            max={p.stock}
                            inputMode="numeric"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => onUpdateQty(p.id, 1)}
                            disabled={c.qty >= p.stock}
                          >
                            <Plus className="size-3.5" />
                          </Button>
                        </div>
                        <span className="text-lg font-semibold">
                          {formatPrice(itemTotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>

          {/* RIGHT: Order summary */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Subtotal ({cart.reduce((s, c) => s + c.qty, 0)} items)
                    </span>
                    <span className="font-medium">
                      {formatPrice(cartTotal)}
                    </span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount</span>
                      <span className="font-medium">
                        -{formatPrice(discount)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="font-medium">
                      {shipping === 0 ? "Free" : formatPrice(shipping)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax (18% GST)</span>
                    <span className="font-medium">{formatPrice(tax)}</span>
                  </div>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Inclusive of all taxes. Shipping calculated at checkout.
                </p>

                {/* Coupon */}
                <div className="space-y-2">
                  <Label htmlFor="coupon" className="text-sm font-medium">
                    Coupon code
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="coupon"
                      value={coupon}
                      onChange={(e) => setCoupon(e.target.value)}
                      placeholder="SAVE100"
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={handleApplyCoupon}
                      disabled={couponApplied}
                    >
                      Apply
                    </Button>
                  </div>
                  {couponApplied && (
                    <p className="text-xs text-emerald-600">
                      Coupon applied! Saved {formatPrice(discount)}
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    Try: SAVE100 (₹100 off) or WELCOME50 (₹50 off)
                  </p>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={onCheckout}
                  disabled={cart.length === 0}
                >
                  Proceed to Checkout · {formatPrice(total)}
                </Button>

                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="size-3.5 text-emerald-600" /> Secure
                  checkout powered by Razorpay
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */

/*                                Checkout                                    */

/* -------------------------------------------------------------------------- */

interface CheckoutViewProps {
  cart: CartItem[]

  cartTotal: number

  onClose: () => void

  onBackToCart: () => void

  onPaymentSuccess: (
    orderId: string,
    paymentId: string,
    invoiceNo: string,
  ) => void

  onPaymentFailed: (orderId: string) => void

  onOpenProduct: (id: string) => void
}

function CheckoutSkeleton() {
  return (
    <div className="space-y-4 px-4">
      <Skeleton className="h-8 w-1/4" />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-3">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  )
}

function CheckoutEmpty({ onAddAddress }: { onAddAddress: () => void }) {
  return (
    <Card className="p-8 text-center">
      <AlertCircle className="mx-auto size-10 text-muted-foreground" />
      <h3 className="mt-2 font-semibold">No delivery address</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Add an address to continue to payment.
      </p>
      <Button className="mt-4" onClick={onAddAddress}>
        Add new address
      </Button>
    </Card>
  )
}

type Address = {
  id: string

  label: string

  name: string

  phone: string

  email: string

  line1: string

  city: string

  state: string

  pincode: string
}

const SAVED_ADDRESSES: Address[] = [
  {
    id: "addr1",

    label: "Home",

    name: "Ananya Rao",

    phone: "98765 43210",

    email: "ananya.rao@example.com",

    line1: "12 4th Block, Koramangala",

    city: "Bengaluru",

    state: "KA",

    pincode: "560034",
  },

  {
    id: "addr2",

    label: "Office",

    name: "Ananya Rao",

    phone: "98765 43210",

    email: "ananya.rao@example.com",

    line1: "B-204, Hiranandani Estate",

    city: "Thane",

    state: "MH",

    pincode: "400607",
  },
]

function CheckoutView({
  cart,
  cartTotal,
  onClose: _onClose,
  onBackToCart,
  onPaymentSuccess,
  onPaymentFailed,
}: CheckoutViewProps) {
  const [selectedAddr, setSelectedAddr] = useState<string>(
    SAVED_ADDRESSES[0].id,
  )

  const [shippingMethod, setShippingMethod] = useState<"standard" | "express">(
    "standard",
  )

  const [showNewAddr, setShowNewAddr] = useState(false)

  const [newAddr, setNewAddr] = useState<Partial<Address>>({})

  const [paying, setPaying] = useState(false)

  const [addrError, setAddrError] = useState<string | null>(null)

  const shippingCost =
    shippingMethod === "express" ? 9900 : cartTotal > 149900 ? 0 : 4900

  const tax = Math.round((cartTotal + shippingCost) * 0.18)

  const total = cartTotal + shippingCost + tax

  const handlePay = async () => {
    if (!selectedAddr && !showNewAddr) {
      setAddrError("Select a delivery address")
      return
    }
    setAddrError(null)
    setPaying(true)

    // Build a real Order shape from cart + selected/new address + shipping.
    const address = showNewAddr
      ? (newAddr as { full_name?: string; phone?: string; line1?: string; city?: string; state?: string; pincode?: string; email?: string })
      : SAVED_ADDRESSES.find((a) => a.id === selectedAddr)
    const items = cart.map((c) => {
      const p = mockProducts.find((x) => x.id === c.id)
      return {
        product_id: c.id,
        title: p?.title ?? c.id,
        image_url: p?.image_url ?? "",
        qty: c.qty,
        unit_price_paise: p?.price_paise ?? 0,
      }
    })
    const rawAddr = address as (Address & { full_name?: string; country?: string; line2?: string }) | null
    const shippingAddress: import("@/lib/types/order").Address = rawAddr
      ? {
        full_name: rawAddr.full_name ?? rawAddr.name ?? "Customer",
        phone: rawAddr.phone ?? "0000000000",
        email: rawAddr.email ?? "customer@example.com",
        line1: rawAddr.line1 ?? "",
        line2: rawAddr.line2,
        city: rawAddr.city ?? "",
        state: rawAddr.state ?? "",
        pincode: rawAddr.pincode ?? "",
        country: rawAddr.country ?? "IN",
      }
      : {
        full_name: SAVED_ADDRESSES[0]?.name ?? "Customer",
        phone: SAVED_ADDRESSES[0]?.phone ?? "0000000000",
        email: SAVED_ADDRESSES[0]?.email ?? "customer@example.com",
        line1: SAVED_ADDRESSES[0]?.line1 ?? "",
        city: SAVED_ADDRESSES[0]?.city ?? "",
        state: SAVED_ADDRESSES[0]?.state ?? "",
        pincode: SAVED_ADDRESSES[0]?.pincode ?? "",
        country: "IN",
      }
    const orderId = `ORD-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`
    const order: import("@/lib/types/order").Order = {
      id: orderId,
      razorpay_order_id: `rzp_order_${Date.now()}`,
      status: "created",
      shipping_status: "pending",
      currency: "INR",
      total_paise: total,
      shipping_paise: shippingCost,
      items: items as import("@/lib/types/order").OrderItem[],
      shipping_address: shippingAddress,
      via_ai: false,
      notes: "Created via storefront checkout (Section 4)",
      created_at: new Date().toISOString(),
    }

    try {
      const settings = useSettings.getState()
      const result = await executeAgentCheckout({
        order,
        mandate: undefined,
        approvalThresholdRupees: settings.aiDefaults?.approvalThreshold ?? 15000,
        protocol: "ncpi_uap",
      })
      if (result.settlement === "auto") {
        onPaymentSuccess(
          result.order.id,
          result.order.razorpay_payment_id ?? `pay_${Date.now()}`,
          `INV-${new Date().getFullYear()}-${orderId.slice(-6)}`,
        )
      } else {
        // Step-up / 402 challenge: treat as a failure for this MVP (Section 4 scope).
        onPaymentFailed(order.id)
      }
    } catch {
      // Any unexpected error falls back to simulated failure.
      onPaymentFailed(order.id)
    } finally {
      setPaying(false)
    }
  }

  if (cart.length === 0) {
    return (
      <section className="px-4 pb-12">
        <div className="mx-auto max-w-[1000px]">
          <CheckoutEmpty onAddAddress={() => setShowNewAddr(true)} />
        </div>
      </section>
    )
  }

  return (
    <section className="px-4 pb-12">
      <div className="mx-auto max-w-[1000px] space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Checkout</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter delivery details and complete payment with Razorpay.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* LEFT */}
          <div className="space-y-6">
            {/* Address */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Delivery address</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewAddr((v) => !v)}
                >
                  {showNewAddr ? "Cancel" : "Add new address"}
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {addrError && (
                  <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    {addrError}
                  </div>
                )}
                {!showNewAddr ? (
                  <div className="grid gap-3">
                    {SAVED_ADDRESSES.map((a) => (
                      <label
                        key={a.id}
                        className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${
                          selectedAddr === a.id
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted/40"
                        }`}
                      >
                        <input
                          type="radio"
                          name="addr"
                          checked={selectedAddr === a.id}
                          onChange={() => setSelectedAddr(a.id)}
                          className="mt-1"
                        />
                        <div className="min-w-0 flex-1 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{a.label}</span>
                            <Badge variant="outline" className="text-[11px]">
                              {a.pincode}
                            </Badge>
                          </div>
                          <div className="mt-1 font-medium">
                            {a.name} · {a.phone}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {a.email}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {a.line1}, {a.city}, {a.state} — {a.pincode}
                          </div>
                          <div className="mt-2 flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-destructive"
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Full name</Label>
                      <Input
                        placeholder="Ananya Rao"
                        value={newAddr.name || ""}
                        onChange={(e) =>
                          setNewAddr((s) => ({ ...s, name: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Mobile</Label>
                      <Input
                        placeholder="98765 43210"
                        value={newAddr.phone || ""}
                        onChange={(e) =>
                          setNewAddr((s) => ({ ...s, phone: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs">Email</Label>
                      <Input
                        placeholder="you@example.com"
                        value={newAddr.email || ""}
                        onChange={(e) =>
                          setNewAddr((s) => ({ ...s, email: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs">Address</Label>
                      <Input
                        placeholder="House, street, area"
                        value={newAddr.line1 || ""}
                        onChange={(e) =>
                          setNewAddr((s) => ({ ...s, line1: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">City</Label>
                      <Input
                        placeholder="Bengaluru"
                        value={newAddr.city || ""}
                        onChange={(e) =>
                          setNewAddr((s) => ({ ...s, city: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">State</Label>
                      <Input
                        placeholder="KA"
                        value={newAddr.state || ""}
                        onChange={(e) =>
                          setNewAddr((s) => ({ ...s, state: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Pincode</Label>
                      <Input
                        placeholder="560034"
                        value={newAddr.pincode || ""}
                        onChange={(e) =>
                          setNewAddr((s) => ({ ...s, pincode: e.target.value }))
                        }
                      />
                    </div>
                    <div className="sm:col-span-2 flex gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedAddr("new")
                          setShowNewAddr(false)
                        }}
                      >
                        Save address
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowNewAddr(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Shipping */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Shipping method</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {[
                  {
                    id: "standard",
                    title: "Standard delivery",
                    eta: "3–5 days",
                    cost: cartTotal > 149900 ? 0 : 4900,
                  },

                  {
                    id: "express",
                    title: "Express delivery",
                    eta: "1–2 days",
                    cost: 9900,
                  },
                ].map((m) => (
                  <label
                    key={m.id}
                    className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 ${
                      shippingMethod === m.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="ship"
                        checked={shippingMethod === m.id}
                        onChange={() => setShippingMethod(m.id as any)}
                      />
                      <div>
                        <div className="text-sm font-medium">{m.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {m.eta} ·{" "}
                          {m.cost === 0 ? "Free" : formatPrice(m.cost)}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={shippingMethod === m.id ? "default" : "outline"}
                    >
                      {m.cost === 0 ? "Free" : formatPrice(m.cost)}
                    </Badge>
                  </label>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT */}
          <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Order summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 max-h-40 overflow-auto pr-1">
                  {cart.map((c) => {
                    const p = mockProducts.find((x) => x.id === c.id)!

                    return (
                      <div key={c.id} className="flex justify-between text-xs">
                        <span className="truncate pr-2 text-muted-foreground">
                          {p.title} × {c.qty}
                        </span>
                        <span className="font-medium">
                          {formatPrice(p.price_paise * c.qty)}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <Separator />
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(cartTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>
                      {shippingCost === 0 ? "Free" : formatPrice(shippingCost)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax (18% GST)</span>
                    <span>{formatPrice(tax)}</span>
                  </div>
                </div>
                <Separator />
                <div className="flex justify-between text-base font-semibold">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handlePay}
                  disabled={paying}
                >
                  {paying ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Processing…
                    </>
                  ) : (
                    <>Pay with Razorpay · {formatPrice(total)}</>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={onBackToCart}
                >
                  Back to cart
                </Button>
                <p className="text-center text-[11px] text-muted-foreground">
                  Razorpay handles the payment securely — no card data stored
                  here.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-muted/40">
              <CardContent className="p-4 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-medium">
                  <ShieldCheck className="size-4 text-emerald-600" /> Secure
                  payment
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="size-3.5 text-muted-foreground" /> Fast
                  delivery · 1–5 days
                </div>
                <div className="flex items-center gap-2">
                  <RotateCcw className="size-3.5 text-muted-foreground" /> 7-day
                  easy returns
                </div>
                <div className="flex items-center gap-2">
                  <Headset className="size-3.5 text-muted-foreground" />{" "}
                  Support: support@razent.store · +91 80 1234 5678
                </div>
                <div className="flex items-center gap-2">
                  <PackageCheck className="size-3.5 text-muted-foreground" />{" "}
                  Track order anytime
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */

/*                             Payment Failed                                 */

/* -------------------------------------------------------------------------- */

interface PaymentFailedViewProps {
  orderId: string

  onRetry: () => void

  onChangeMethod: () => void

  onBackToCart: () => void

  onOpenAI: () => void
}

function PaymentFailedView({
  orderId,
  onRetry,
  onChangeMethod,
  onBackToCart,
  onOpenAI,
}: PaymentFailedViewProps) {
  const amount = formatPrice(2499900)

  const reason = "Payment declined by bank — insufficient funds or timeout."

  const now = new Date().toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  })

  return (
    <section className="px-4 pb-12">
      <div className="mx-auto max-w-[1000px] space-y-6">
        {/* Failure summary */}
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-6 text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-destructive text-destructive-foreground">
              <X className="size-7" />
            </div>
            <h1 className="mt-3 font-heading text-xl font-semibold text-destructive">
              Payment Failed
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your payment could not be completed.
            </p>
            <div className="mt-3 inline-flex flex-wrap items-center justify-center gap-2 text-xs">
              <Badge variant="destructive">Failed</Badge>
              <span className="font-mono">{orderId}</span>
              <span>·</span>
              <span className="font-semibold">{amount}</span>
            </div>
            <p className="mx-auto mt-2 max-w-md text-xs text-muted-foreground">
              {reason}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button size="lg" onClick={onRetry}>
                <RefreshCw className="size-4" /> Retry Payment
              </Button>
              <Button size="lg" variant="outline" onClick={onChangeMethod}>
                Change Payment Method
              </Button>
              <Button size="lg" variant="ghost" onClick={onBackToCart}>
                Go Back to Cart
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* LEFT */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Order details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order ID</span>
                  <span className="font-mono">{orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-semibold">{amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Method tried</span>
                  <span>UPI / Card via Razorpay</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time</span>
                  <span>{now}</span>
                </div>
                <Separator className="my-2" />
                <div className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                  Invoice pending · No tracking started — payment must succeed
                  first.
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">What happened?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs leading-5 text-muted-foreground">
                <p>
                  Your payment may have timed out, been declined by the bank, or
                  been cancelled. No money was charged.
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Check your bank balance and daily limit.</li>
                  <li>Try a different UPI ID or card.</li>
                  <li>Retry — Razorpay will create a fresh attempt safely.</li>
                </ul>
                <p className="pt-1 font-medium text-foreground">
                  You can retry safely — duplicate charges are prevented by
                  Razorpay order ID.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT — support */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Need help?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-emerald-600" /> Secure
                  payment · Razorpay
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="size-4 text-muted-foreground" />{" "}
                  support@razent.store
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="size-4 text-muted-foreground" /> +91 80 1234
                  5678
                </div>
                <Separator />
                <Button size="sm" className="w-full" onClick={onOpenAI}>
                  <Sparkles className="size-4" /> Ask AI for help
                </Button>
                <p className="text-center text-[11px] text-muted-foreground">
                  AI can check order, suggest alternate payment, or contact
                  support.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-muted/40">
              <CardContent className="p-4 text-xs leading-5 text-muted-foreground">
                Order not completed · Invoice will generate only after
                successful payment · Tracking begins after shipment.
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}

function PaymentSuccessView({
  orderId,
  paymentId,
  invoiceNo,
  cartSnapshot,
  cartTotal,
  onTrackOrder,
  onViewInvoice,
  onDownloadInvoice,
  onContinueShopping,
  onAskAI,
}: {
  orderId: string
  paymentId: string
  invoiceNo: string
  cartSnapshot: CartItem[]
  cartTotal: number
  onTrackOrder: () => void
  onViewInvoice: () => void
  onDownloadInvoice: () => void
  onContinueShopping: () => void
  onAskAI: () => void
}) {
  const now = new Date().toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  })

  const invoiceDate = new Date().toLocaleDateString("en-IN", {
    dateStyle: "medium",
  })

  const displayItems = (
    cartSnapshot.length > 0
      ? cartSnapshot
      : [{ id: mockProducts[0].id, qty: 1 } as CartItem]
  ).slice(0, 4)

  const shippingCost = cartTotal > 149900 ? 0 : 4900

  const tax = Math.round((cartTotal + shippingCost) * 0.18)

  const totalPaid =
    cartSnapshot.length > 0 ? cartTotal + shippingCost + tax : 2499900

  const steps = [
    "Preparing",
    "Packed",
    "Shipped",
    "Out for Delivery",
    "Delivered",
  ] as const

  const currentStep = 0 // dummy: just placed → Preparing

  return (
    <section className="px-4 pb-12">
      <div className="mx-auto max-w-[1000px] space-y-6">
        {/* Success summary — green */}
        <Card className="border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20">
          <CardContent className="p-6 text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-600 text-white shadow-sm">
              <Check className="size-7" />
            </div>
            <h1 className="mt-3 font-heading text-xl font-semibold text-emerald-700 dark:text-emerald-300">
              Payment Successful
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your payment was completed successfully.
            </p>
            <div className="mt-3 inline-flex flex-wrap items-center justify-center gap-2 text-xs">
              <Badge className="bg-emerald-600 hover:bg-emerald-600">
                Paid
              </Badge>
              <span className="font-mono font-medium">{orderId}</span>
              <span className="text-muted-foreground">·</span>
              <span className="font-semibold">{formatPrice(totalPaid)}</span>
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground">
              Payment ID{" "}
              <span className="font-mono text-foreground">{paymentId}</span> ·
              Razorpay
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button size="lg" onClick={onTrackOrder}>
                <PackageCheck className="size-4" /> Track Order
              </Button>
              <Button size="lg" variant="outline" onClick={onViewInvoice}>
                <Eye className="size-4" /> View Invoice
              </Button>
              <Button size="lg" variant="ghost" onClick={onContinueShopping}>
                Continue Shopping
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* LEFT */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Order details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Order ID</span>
                    <span className="font-mono font-medium">{orderId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment ID</span>
                    <span className="font-mono text-xs">{paymentId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Payment method
                    </span>
                    <span>UPI / Card via Razorpay</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Paid at</span>
                    <span>{now}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Customer</span>
                    <span>Ananya Rao · 98765 43210</span>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  {displayItems.map((c) => {
                    const p = mockProducts.find((x) => x.id === c.id)

                    if (!p) return null

                    return (
                      <div
                        key={c.id}
                        className="flex items-center gap-3 text-sm"
                      >
                        <img
                          src={p.image_url}
                          alt={p.title}
                          className="size-10 rounded-md object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{p.title}</div>
                          <div className="text-xs text-muted-foreground">
                            Qty {c.qty} · {p.category}
                          </div>
                        </div>
                        <span className="font-medium">
                          {formatPrice(p.price_paise * c.qty)}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <Separator />
                <div className="flex justify-between text-sm font-semibold">
                  <span>Amount paid</span>
                  <span className="text-emerald-600">
                    {formatPrice(totalPaid)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground text-center">
                  Inclusive of all taxes · Shipping{" "}
                  {shippingCost === 0 ? "Free" : formatPrice(shippingCost)} ·
                  GST {formatPrice(tax)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Dummy shipping progress
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Simulated — test mode, no carrier yet.
                </p>
              </CardHeader>
              <CardContent>
                <div className="relative pl-6">
                  <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
                  {steps.map((s, i) => {
                    const isDone = i < currentStep

                    const isCurrent = i === currentStep

                    return (
                      <div
                        key={s}
                        className="relative flex gap-3 pb-5 last:pb-0"
                      >
                        <div
                          className={`relative z-10 grid size-6 place-items-center rounded-full border-2 ${
                            isCurrent
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : isDone
                                ? "border-emerald-600 bg-emerald-600 text-white"
                                : "border-muted-foreground/30 bg-card text-muted-foreground"
                          }`}
                        >
                          {isDone || isCurrent ? (
                            <Check className="size-3.5" />
                          ) : (
                            <span className="size-2 rounded-full bg-muted-foreground/30" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <div
                            className={`text-sm ${
                              isCurrent
                                ? "font-semibold text-emerald-700 dark:text-emerald-300"
                                : isDone
                                  ? "font-medium"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {s}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {isCurrent
                              ? "Order confirmed — preparing for shipment"
                              : isDone
                                ? "Completed"
                                : "Pending"}
                          </div>
                        </div>
                        {isCurrent && (
                          <Badge className="h-5 bg-emerald-600 text-[11px]">
                            Current
                          </Badge>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Invoice</CardTitle>
                  <Badge className="bg-emerald-600 hover:bg-emerald-600">
                    Generated
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {invoiceNo} · {invoiceDate}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-md bg-muted/50 px-3 py-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Invoice no.</span>
                    <span className="font-mono font-medium">{invoiceNo}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-medium text-emerald-600">
                      Generated
                    </span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-muted-foreground">Date</span>
                    <span>{invoiceDate}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-semibold">
                      {formatPrice(totalPaid)}
                    </span>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Button size="sm" onClick={onDownloadInvoice}>
                    <Download className="size-4" /> Download invoice
                  </Button>
                  <Button size="sm" variant="outline" onClick={onViewInvoice}>
                    <Eye className="size-4" /> View invoice
                  </Button>
                  <Button size="sm" variant="ghost" onClick={onViewInvoice}>
                    <Mail className="size-4" /> Resend invoice
                  </Button>
                </div>
                <p className="text-center text-[11px] text-muted-foreground">
                  PDF sent to ananya.rao@example.com
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Next actions</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                <Button size="sm" onClick={onTrackOrder}>
                  <PackageCheck className="size-4" /> Track Order
                </Button>
                <Button size="sm" variant="outline" onClick={onViewInvoice}>
                  <Eye className="size-4" /> View Invoice
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onContinueShopping}
                >
                  <ArrowRight className="size-4" /> Continue Shopping
                </Button>
                <Button size="sm" variant="ghost" onClick={onAskAI}>
                  <Sparkles className="size-4" /> Ask AI about this order
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-muted/40">
              <CardContent className="p-4 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-medium">
                  <ShieldCheck className="size-4 text-emerald-600" /> Secure
                  payment · Razorpay
                </div>
                <div className="flex items-center gap-2">
                  <RotateCcw className="size-3.5 text-muted-foreground" /> 7-day
                  easy returns
                </div>
                <div className="flex items-center gap-2">
                  <Headset className="size-3.5 text-muted-foreground" />{" "}
                  Support: support@razent.store · +91 80 1234 5678
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="size-3.5 text-muted-foreground" /> Track
                  order anytime
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}
