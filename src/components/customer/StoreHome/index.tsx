import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Message, MessageAvatar, MessageContent, MessageHeader } from "@/components/ui/message"
import { Bubble } from "@/components/ui/bubble"
import { Checkbox } from "@/components/ui/checkbox"
import { useSettings } from "@/state/useSettings"
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
} from "lucide-react"

type StoreView = "home" | "listing" | "detail"

type CartItem = { id: string; qty: number }

type AIMsg = { role: "user" | "assistant"; text: string; products?: typeof mockProducts }

const CATEGORY_DEFS: { name: string; icon: typeof HomeIcon; match: string[] }[] = [
  { name: "Electronics", icon: Smartphone, match: ["Home", "Security"] },
  { name: "Laptops", icon: Laptop, match: ["Computing"] },
  { name: "Audio", icon: Headphones, match: ["Audio"] },
  { name: "Accessories", icon: PackageCheck, match: ["Networking", "Lighting"] },
  { name: "Mobile", icon: Smartphone, match: ["Wearables"] },
  { name: "Gaming", icon: Gamepad2, match: ["Computing", "Audio"] },
  { name: "Office", icon: Lamp, match: ["Furniture", "Lighting"] },
  { name: "Wearables", icon: Watch, match: ["Wearables", "Fitness"] },
]

function categoryCount(match: string[]) {
  return mockProducts.filter((p) => p.status === "active" && match.includes(p.category)).length
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
  return 3.6 + ((Math.abs(h) % 14) / 10) // 3.6 – 5.0
}

const ALL_BRANDS = ["Razent", "PureSense", "JBL", "Anker", "Boat", "Sony", "Apple", "Xiaomi", "LG"]
const ALL_CATEGORIES = Array.from(new Set(mockProducts.map((p) => p.category))).sort()

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
  const [sort, setSort] = useState<"relevance" | "low" | "high" | "rating">("relevance")
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

  const activeProducts = useMemo(() => mockProducts.filter((p) => p.status === "active"), [])

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
    if (offerFilter) list = list.filter((p) => p.tags.includes("bestseller") || p.tags.includes("bundle") || p.tags.includes("new"))
    if (fastDelivery) list = list.filter((p) => p.stock > 5)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.tags.join(" ").toLowerCase().includes(q)
      )
    }
    if (sort === "low") list.sort((a, b) => a.price_paise - b.price_paise)
    if (sort === "high") list.sort((a, b) => b.price_paise - a.price_paise)
    if (sort === "rating") list.sort((a, b) => productRating(b) - productRating(a))
    return list
  }, [activeProducts, activeCat, search, sort, brandFilters, categoryFilters, priceMin, priceMax, minRating, stockOnly, offerFilter, fastDelivery])

  const selectedProduct = selectedId ? mockProducts.find((p) => p.id === selectedId) ?? null : null
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
    setError("Couldn't reach the storefront. Check your connection and try again.")
  }
  function openProduct(id: string) {
    setSelectedId(id)
    setView("detail")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }
  function addToCart(id: string) {
    setCart((prev) => {
      const f = prev.find((c) => c.id === id)
      if (f) return prev.map((c) => (c.id === id ? { ...c, qty: c.qty + 1 } : c))
      return [...prev, { id, qty: 1 }]
    })
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
      if (q.includes("laptop") || q.includes("60,000") || q.includes("60000")) recs = recs.filter((p) => p.category === "Computing")
      else if (q.includes("headphone") || q.includes("audio") || q.includes("5,000") || q.includes("5000")) recs = recs.filter((p) => p.category === "Audio")
      else if (q.includes("purifier") || q.includes("20,000") || q.includes("20000")) recs = recs.filter((p) => p.title.toLowerCase().includes("purifier"))
      else if (q.includes("office")) recs = recs.filter((p) => ["Furniture", "Lighting", "Computing"].includes(p.category))
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
              <Truck className="size-3.5" /> Free shipping on orders above ₹1,499
            </span>
            <span className="hidden items-center gap-1.5 sm:inline-flex">
              <RotateCcw className="size-3.5" /> 7 Days easy returns
            </span>
            <span className="hidden items-center gap-1.5 md:inline-flex">
              <ShieldCheck className="size-3.5" /> Secure payments powered by Razorpay
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5">
            <Truck className="size-3.5" /> Deliver to <span className="font-medium text-foreground">India</span>
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
                <img src={storeProfile.logo} alt="logo" className="size-9 rounded-lg object-cover" />
              ) : (
                <span className="text-xs font-bold">{initials}</span>
              )}
            </div>
            <span className="hidden text-sm font-semibold tracking-tight sm:inline">{storeProfile.storeName}</span>
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
            <Button variant="ghost" size="sm" className="hidden lg:inline-flex" onClick={() => setView("listing")}>
              <Menu className="size-4" /> Categories
            </Button>
            <Button variant="ghost" size="sm" onClick={goToListing}>
              Products
            </Button>
            <Button size="sm" onClick={() => setAiOpen((v) => !v)} className="hidden sm:inline-flex">
              <Sparkles className="size-4" /> Ask AI
            </Button>
            <Button variant="ghost" size="icon" className="relative" onClick={() => setCartOpen(true)}>
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
      <div className={aiOpen ? "mx-auto grid max-w-6xl grid-cols-1 gap-0 xl:grid-cols-[1fr_380px]" : "mx-auto max-w-6xl"}>
        {/* LEFT: store — stays visible and usable */}
        <div className={aiOpen ? "min-w-0 xl:h-[calc(100vh-56px)] xl:overflow-auto" : "min-w-0"}>
          {/* Breadcrumb when listing/detail */}
          {(view === "listing" || view === "detail") && (
            <div className="flex items-center gap-1.5 px-4 py-3 text-xs text-muted-foreground">
              <button onClick={() => setView("home")} className="hover:text-foreground">
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
                  <span className="font-medium text-foreground">{activeCat}</span>
                </>
              )}
              {view === "detail" && selectedProduct && (
                <>
                  <ChevronRight className="size-3" />
                  <span className="truncate font-medium text-foreground">{selectedProduct.title}</span>
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
                        Smart products for everyday use — curated, verified, and ready to compare with AI. Free delivery over ₹1,499.
                      </p>
                      <div className="mt-5 flex flex-wrap items-center gap-2">
                        <Button size="lg" onClick={() => setView("listing")}>
                          Shop Now <ArrowRight className="size-4" />
                        </Button>
                        <Button variant="outline" size="lg" onClick={() => setAiOpen(true)}>
                          <Sparkles className="size-4" /> Ask AI Assistant
                        </Button>
                      </div>
                      <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <ShieldCheck className="size-3.5 text-emerald-600" /> Razorpay Secure
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Star className="size-3.5 fill-amber-400 text-amber-400" /> 4.8 • 12k reviews
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {featured.slice(0, 6).map((p) => (
                        <button key={p.id} onClick={() => openProduct(p.id)} className="group overflow-hidden rounded-xl border bg-muted text-left">
                          <img src={p.image_url} alt={p.title} className="aspect-square w-full object-cover transition group-hover:scale-[1.02]" />
                          <div className="p-2">
                            <div className="truncate text-xs font-medium leading-tight">{p.title}</div>
                            <div className="text-xs font-semibold">{formatPrice(p.price_paise)}</div>
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
                  <h2 className="font-heading text-sm font-semibold tracking-tight">Browse by category</h2>
                  <Button variant="ghost" size="sm" onClick={() => setView("listing")}>
                    View all
                  </Button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
                  {CATEGORY_DEFS.map(({ name, icon: Icon, match }) => {
                    const n = categoryCount(match)
                    return (
                      <button key={name} onClick={() => openCategory(name)} className="text-left">
                        <Card className="group p-4 transition hover:shadow-sm hover:ring-1 hover:ring-primary/20">
                          <CardContent className="flex items-center gap-3 p-0">
                            <div className="grid size-10 place-items-center rounded-lg bg-muted group-hover:bg-primary/10">
                              <Icon className="size-5 text-muted-foreground group-hover:text-primary" />
                            </div>
                            <div>
                              <div className="text-sm font-medium leading-none">{name}</div>
                              <div className="mt-1 text-xs text-muted-foreground">{n} products</div>
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
                  <h2 className="font-heading text-sm font-semibold tracking-tight">Featured products</h2>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>Powered by {storeProfile.storeName}</span>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {featured.map((p) => (
                    <Card key={p.id} className="group flex flex-col overflow-hidden">
                      <button onClick={() => openProduct(p.id)} className="relative block overflow-hidden">
                        <img src={p.image_url} alt={p.title} className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
                        {p.stock === 0 ? (
                          <Badge variant="destructive" className="absolute left-2 top-2">
                            Out of stock
                          </Badge>
                        ) : p.stock < 10 ? (
                          <Badge className="absolute left-2 top-2 bg-amber-500 text-white hover:bg-amber-500">Low stock</Badge>
                        ) : null}
                      </button>
                      <CardContent className="flex flex-1 flex-col gap-2 p-3">
                        <div className="line-clamp-1 text-sm font-medium leading-tight">{p.title}</div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Star className="size-3 fill-amber-400 text-amber-400" /> 4.6 <span className="text-muted-foreground/60">· 124 reviews</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-sm font-semibold">{formatPrice(p.price_paise)}</span>
                          <Badge variant="outline" className="text-[11px]">
                            {p.category}
                          </Badge>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <Button variant="outline" size="sm" onClick={() => openProduct(p.id)}>
                            View details
                          </Button>
                          <Button size="sm" disabled={p.stock === 0} onClick={() => addToCart(p.id)}>
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
                    { icon: ShieldCheck, title: "Secure Payments", desc: "Razorpay" },
                    { icon: Truck, title: "Fast Delivery", desc: "3–5 days" },
                    { icon: RotateCcw, title: "Easy Returns", desc: "7 days" },
                    { icon: Headset, title: "24/7 Support", desc: storeProfile.supportEmail },
                    { icon: PackageCheck, title: "Order Tracking", desc: "Live updates" },
                  ].map(({ icon: Icon, title, desc }) => (
                    <Card key={title} className="p-3">
                      <CardContent className="flex items-center gap-2.5 p-0">
                        <div className="grid size-8 place-items-center rounded-md bg-muted">
                          <Icon className="size-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-medium leading-none">{title}</div>
                          <div className="truncate text-[11px] text-muted-foreground">{desc}</div>
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
                      <span className="font-semibold">{loading ? "…" : filtered.length}</span>{" "}
                      <span className="text-muted-foreground">results for</span>{" "}
                      <span className="font-medium">
                        {activeCat ?? (search ? `"${search}"` : "All products")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Mobile filter trigger */}
                      <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                        <SheetTrigger asChild>
                          <Button variant="outline" size="sm" className="lg:hidden">
                            <SlidersHorizontal className="size-4" /> Filters
                            {(brandFilters.length + categoryFilters.length + (priceMin ? 1 : 0) + (priceMax ? 1 : 0) + (minRating > 0 ? 1 : 0) + (stockOnly ? 1 : 0) + (offerFilter ? 1 : 0) + (fastDelivery ? 1 : 0)) > 0 && (
                              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                                {brandFilters.length + categoryFilters.length + (priceMin ? 1 : 0) + (priceMax ? 1 : 0) + (minRating > 0 ? 1 : 0) + (stockOnly ? 1 : 0) + (offerFilter ? 1 : 0) + (fastDelivery ? 1 : 0)}
                              </Badge>
                            )}
                          </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[320px] overflow-auto p-0 sm:w-[360px]">
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
                          className={"grid size-7 place-items-center rounded " + (layout === "grid" ? "bg-muted text-foreground" : "text-muted-foreground")}
                        >
                          <LayoutGrid className="size-3.5" />
                        </button>
                        <button
                          aria-label="List view"
                          onClick={() => setLayout("list")}
                          className={"grid size-7 place-items-center rounded " + (layout === "list" ? "bg-muted text-foreground" : "text-muted-foreground")}
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
                        <button onClick={() => setActiveCat(null)} aria-label="Remove">
                          <X className="size-3" />
                        </button>
                      </Badge>
                    )}
                    {categoryFilters.map((c) => (
                      <Badge key={c} variant="secondary" className="gap-1">
                        {c}{" "}
                        <button onClick={() => setCategoryFilters((s) => s.filter((x) => x !== c))}>
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                    {brandFilters.map((b) => (
                      <Badge key={b} variant="secondary" className="gap-1">
                        Brand: {b}{" "}
                        <button onClick={() => setBrandFilters((s) => s.filter((x) => x !== b))}>
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
                        <Card key={i} className={layout === "grid" ? "overflow-hidden" : "overflow-hidden"}>
                          <Skeleton className={layout === "grid" ? "aspect-[4/3] w-full" : "h-32 w-full"} />
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
                      <div className="mt-2 text-sm font-medium">Couldn't load products</div>
                      <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">{error}</p>
                      <div className="mt-3 flex justify-center gap-2">
                        <Button size="sm" variant="outline" onClick={simulateLoad}>
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
                      <div className="mt-2 text-sm font-medium">No products match your filters</div>
                      <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
                        Try removing filters or ask AI to find the right product for you.
                      </p>
                      <div className="mt-3 flex justify-center gap-2">
                        <Button size="sm" variant="outline" onClick={clearAllFilters}>
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
                        Showing {filtered.length} of {activeProducts.length} products
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={simulateLoad}>
                          <Loader2 className="size-4" /> Simulate loading
                        </Button>
                        <Button size="sm" variant="outline" onClick={simulateError}>
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
            <section className="px-4 py-4">
              <Card className="overflow-hidden">
                <CardContent className="grid gap-6 p-6 md:grid-cols-2">
                  <img src={selectedProduct.image_url} alt={selectedProduct.title} className="aspect-square w-full rounded-lg object-cover" />
                  <div>
                    <Badge variant="outline">{selectedProduct.category}</Badge>
                    <h1 className="mt-2 font-heading text-xl font-semibold leading-tight">{selectedProduct.title}</h1>
                    <p className="mt-1 text-sm text-muted-foreground">{selectedProduct.description}</p>
                    <div className="mt-3 flex items-center gap-2 text-sm">
                      <span className="text-lg font-semibold">{formatPrice(selectedProduct.price_paise)}</span>
                      <Badge variant={selectedProduct.stock > 0 ? "secondary" : "destructive"}>{selectedProduct.stock > 0 ? "In stock" : "Out of stock"}</Badge>
                    </div>
                    <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="size-3 fill-amber-400 text-amber-400" /> 4.7 · 86 reviews · SKU {selectedProduct.id.slice(0, 8)}
                    </div>
                    <Separator className="my-4" />
                    <div className="flex flex-wrap gap-2">
                      <Button size="lg" disabled={selectedProduct.stock === 0} onClick={() => addToCart(selectedProduct.id)}>
                        <ShoppingCart className="size-4" /> Add to cart
                      </Button>
                      <Button variant="outline" size="lg" onClick={() => { addToCart(selectedProduct.id); setCartOpen(true) }}>
                        Buy now
                      </Button>
                      <Button variant="ghost" size="lg" onClick={() => setView("listing")}>
                        Back to products
                      </Button>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-md bg-muted p-2">
                        <Truck className="mx-auto size-4" />
                        <div className="mt-1 font-medium">Fast delivery</div>
                      </div>
                      <div className="rounded-md bg-muted p-2">
                        <ShieldCheck className="mx-auto size-4" />
                        <div className="mt-1 font-medium">Razorpay secure</div>
                      </div>
                      <div className="rounded-md bg-muted p-2">
                        <RotateCcw className="mx-auto size-4" />
                        <div className="mt-1 font-medium">7-day returns</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Footer — hidden in Ask AI workspace so split stays clean */}
          {!aiOpen && (
            <footer className="mt-6 border-t bg-card px-4 py-6">
            <div className="grid gap-6 text-xs md:grid-cols-4">
              <div>
                <div className="text-sm font-semibold">{storeProfile.storeName}</div>
                <p className="mt-1 text-muted-foreground">Smart products for everyday use. {storeProfile.businessName}.</p>
                <p className="mt-2 text-muted-foreground">{storeProfile.supportEmail} · {storeProfile.supportPhone}</p>
              </div>
              <div>
                <div className="font-medium">Shop</div>
                <div className="mt-2 flex flex-col gap-1 text-muted-foreground">
                  <button onClick={() => setView("listing")} className="text-left hover:text-foreground">All products</button>
                  <button onClick={() => openCategory("Audio")} className="text-left hover:text-foreground">Audio</button>
                  <button onClick={() => openCategory("Electronics")} className="text-left hover:text-foreground">Electronics</button>
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
            <div className="mt-6 text-center text-[11px] text-muted-foreground">© 2026 {storeProfile.businessName} · Secure payments powered by Razorpay</div>
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
                  <div className="text-sm font-semibold leading-none">AI Assistant</div>
                  <div className="text-[11px] text-emerald-600">● Online · {storeProfile.storeName}</div>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setAiOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>

            <div className="flex-1 space-y-4 overflow-auto p-4">
              {aiMsgs.map((m, i) => (
                <div key={i}>
                  <Message align={m.role === "user" ? "end" : "start"}>
                    <MessageAvatar>
                      <Avatar className="size-7">
                        <AvatarFallback className={m.role === "assistant" ? "bg-primary text-primary-foreground" : "bg-muted"}>
                          {m.role === "assistant" ? <Sparkles className="size-3.5" /> : <User className="size-3.5" />}
                        </AvatarFallback>
                      </Avatar>
                    </MessageAvatar>
                    <MessageContent className={m.role === "user" ? "items-end" : "items-start"}>
                      <MessageHeader>{m.role === "assistant" ? "AI Assistant" : "You"}</MessageHeader>
                      <Bubble variant={m.role === "user" ? "default" : "muted"} align={m.role === "user" ? "end" : "start"}>
                        {m.text}
                      </Bubble>
                    </MessageContent>
                  </Message>

                  {m.products && (
                    <div className="mt-3 grid gap-2">
                      {m.products.map((p) => (
                        <Card key={p.id} className="overflow-hidden">
                          <CardContent className="flex gap-3 p-3">
                            <img src={p.image_url} alt={p.title} className="size-14 rounded-md object-cover" />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium leading-tight">{p.title}</div>
                              <div className="text-xs text-muted-foreground line-clamp-1">{p.description}</div>
                              <div className="mt-1 flex items-center justify-between">
                                <span className="text-sm font-semibold">{formatPrice(p.price_paise)}</span>
                                <Button size="sm" variant="outline" onClick={() => openProduct(p.id)}>
                                  View
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      <div className="flex flex-wrap gap-1.5">
                        <Button size="sm" onClick={() => handleAskAI("Compare these")}>Compare</Button>
                        <Button size="sm" variant="outline" onClick={() => handleAskAI("Cheaper alternative")}>Cheaper option</Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {aiMsgs.length === 1 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">Try asking:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {SAMPLE_PROMPTS.map((s) => (
                      <button key={s} onClick={() => handleAskAI(s)} className="rounded-full border bg-muted px-3 py-1.5 text-xs hover:bg-accent">
                        {s}
                      </button>
                    ))}
                  </div>
                  <Card className="bg-muted/50">
                    <CardContent className="p-3 text-xs leading-5 text-muted-foreground">
                      I can compare products, suggest a cheaper or better option, and narrow by budget or use-case — then add to cart for you.
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
                <Button size="icon" onClick={() => handleAskAI()} disabled={!aiInput.trim()}>
                  <Send className="size-4" />
                </Button>
              </div>
              <div className="mt-2 text-center text-[11px] text-muted-foreground">AI can help choose — checkout is still your tap.</div>
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
                <div className="mt-2 text-sm font-medium">Your cart is empty</div>
                <p className="mt-1 text-xs text-muted-foreground">Browse products or ask AI for recommendations.</p>
                <Button size="sm" className="mt-3" onClick={() => { setCartOpen(false); setView("listing") }}>
                  Shop products
                </Button>
              </Card>
            ) : (
              cart.map((c) => {
                const p = mockProducts.find((x) => x.id === c.id)!
                return (
                  <Card key={c.id} className="p-3">
                    <div className="flex gap-3">
                      <img src={p.image_url} alt={p.title} className="size-14 rounded-md object-cover" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{p.title}</div>
                        <div className="text-xs text-muted-foreground">{formatPrice(p.price_paise)}</div>
                        <div className="mt-1 flex items-center gap-1">
                          <Button size="icon" variant="outline" className="size-7" onClick={() => updateQty(c.id, -1)}>
                            {c.qty === 1 ? <Trash2 className="size-3" /> : <Minus className="size-3" />}
                          </Button>
                          <span className="w-6 text-center text-xs font-medium">{c.qty}</span>
                          <Button size="icon" variant="outline" className="size-7" onClick={() => updateQty(c.id, 1)}>
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
            const n = mockProducts.filter((x) => x.status === "active" && x.category === c).length
            return (
              <label key={c} className="flex cursor-pointer items-center gap-2 text-xs text-foreground">
                <Checkbox
                  checked={p.categoryFilters.includes(c)}
                  onCheckedChange={() => toggle(p.categoryFilters, c, p.setCategoryFilters)}
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
            <label key={b} className="flex cursor-pointer items-center gap-2 text-xs text-foreground">
              <Checkbox
                checked={p.brandFilters.includes(b)}
                onCheckedChange={() => toggle(p.brandFilters, b, p.setBrandFilters)}
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
            onChange={(e) => p.setPriceMin(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="Min ₹"
            inputMode="numeric"
            className="h-8 text-xs"
          />
          <Input
            value={p.priceMax}
            onChange={(e) => p.setPriceMax(e.target.value.replace(/[^0-9]/g, ""))}
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
            <label key={r} className="flex cursor-pointer items-center gap-2 text-xs text-foreground">
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
            <Checkbox checked={p.stockOnly} onCheckedChange={(v) => p.setStockOnly(!!v)} />
            <span className="flex-1">In stock only</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-xs">
            <Checkbox checked={p.fastDelivery} onCheckedChange={(v) => p.setFastDelivery(!!v)} />
            <span className="flex-1">Fast delivery</span>
          </label>
        </div>
      </FilterGroup>

      <FilterGroup title="Offers">
        <label className="flex cursor-pointer items-center gap-2 text-xs">
          <Checkbox checked={p.offerFilter} onCheckedChange={(v) => p.setOfferFilter(!!v)} />
          <span className="flex-1">Best deals & bundles</span>
        </label>
      </FilterGroup>

      <div className="flex gap-2 pt-1">
        <Button size="sm" variant="outline" className="flex-1" onClick={p.onClear}>
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

function FilterGroup({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(!!defaultOpen)
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {title}
        <ChevronRight className={"size-3.5 transition-transform " + (open ? "rotate-90" : "")} />
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                                Product UI                                  */
/* -------------------------------------------------------------------------- */

function ProductCard({ p, onOpen, onAdd }: { p: (typeof mockProducts)[number]; onOpen: () => void; onAdd: () => void }) {
  const r = productRating(p)
  const isNew = p.tags.includes("new")
  const isBest = p.tags.includes("bestseller") || p.tags.includes("bundle")
  return (
    <Card className="group flex flex-col overflow-hidden">
      <button onClick={onOpen} className="relative block overflow-hidden">
        <img src={p.image_url} alt={p.title} className="aspect-[4/3] w-full object-cover transition group-hover:scale-[1.02]" />
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {p.stock === 0 ? (
            <Badge variant="destructive">Out of stock</Badge>
          ) : p.stock < 10 ? (
            <Badge className="bg-amber-500 text-white hover:bg-amber-500">Low stock</Badge>
          ) : null}
          {isBest && <Badge className="bg-emerald-500 text-white hover:bg-emerald-500"><Tag className="mr-1 size-3" />Deal</Badge>}
          {isNew && <Badge variant="secondary">New</Badge>}
        </div>
      </button>
      <CardContent className="flex flex-1 flex-col gap-2 p-3">
        <div className="line-clamp-1 text-sm font-medium leading-tight">{p.title}</div>
        <div className="text-xs text-muted-foreground line-clamp-1">{p.description}</div>
        <div className="flex items-center justify-between text-xs">
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Star className="size-3 fill-amber-400 text-amber-400" /> {r.toFixed(1)}
            <span className="text-muted-foreground/60">· {Math.floor(p.id.length * 13) + 24} reviews</span>
          </span>
          <span className="text-[10px] text-muted-foreground">{p.stock > 0 ? `${p.stock} in stock` : "Out"}</span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-sm font-semibold">{formatPrice(p.price_paise)}</span>
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

function ListRow({ p, onOpen, onAdd, onBuy }: { p: (typeof mockProducts)[number]; onOpen: () => void; onAdd: () => void; onBuy: () => void }) {
  const r = productRating(p)
  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-[120px_1fr_auto] gap-3 p-3 sm:grid-cols-[160px_1fr_auto]">
        <button onClick={onOpen} className="block overflow-hidden rounded-md">
          <img src={p.image_url} alt={p.title} className="aspect-square w-full object-cover" />
        </button>
        <div className="min-w-0">
          <div className="flex items-start gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{p.title}</div>
              <div className="line-clamp-1 text-xs text-muted-foreground">{p.description}</div>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {p.stock === 0 ? (
              <Badge variant="destructive">Out of stock</Badge>
            ) : p.stock < 10 ? (
              <Badge className="bg-amber-500 text-white hover:bg-amber-500">Low stock</Badge>
            ) : (
              <Badge variant="secondary">{p.stock} in stock</Badge>
            )}
            {p.tags.includes("bestseller") && <Badge className="bg-emerald-500 text-white hover:bg-emerald-500">Bestseller</Badge>}
            {p.tags.includes("new") && <Badge variant="outline">New</Badge>}
            <Badge variant="outline" className="text-[11px]">
              {p.category}
            </Badge>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Star className="size-3 fill-amber-400 text-amber-400" /> {r.toFixed(1)} · {Math.floor(p.id.length * 13) + 24} reviews
          </div>
        </div>
        <div className="flex flex-col items-end justify-between gap-2 text-right">
          <div>
            <div className="text-base font-semibold">{formatPrice(p.price_paise)}</div>
            <div className="text-[11px] text-muted-foreground">inclusive of all taxes</div>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onOpen}>
              <Eye className="size-3.5" /> View
            </Button>
            <Button variant="outline" size="sm" disabled={p.stock === 0} onClick={onAdd}>
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
