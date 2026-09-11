import { useState } from "react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ToolCall } from "@/components/ui/ai/tool-call"
import { Sparkles, User, ShoppingCart, ArrowRight, Check } from "lucide-react"
import type { ChatMessage } from "./useAIChat"
import type { Product } from "@/lib/types/product"
import { formatPrice } from "@/lib/types/product"
import { useCart } from "@/state/useCart"
import { toast } from "sonner"
import { ProductDetailsDialog } from "./ProductDetailsDialog"
import { AICheckoutConfirmationCard } from "./AICheckoutConfirmationCard"

interface AIMessageBubbleProps {
  message: ChatMessage
  storeName?: string
  customerName?: string | null
  customerEmail?: string | null
  customerPhone?: string | null
  onOpenTrackOrder?: (orderId: string) => void
}

function ProductCard({
  product,
  onOpenDetails,
}: {
  product: Product
  onOpenDetails: (p: Product) => void
}) {
  const [added, setAdded] = useState(false)
  const addToCart = useCart((s) => s.addToCart)

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    addToCart(product, 1)
    setAdded(true)
    toast.success(`Added ${product.title} to cart`)
    setTimeout(() => setAdded(false), 1800)
  }

  return (
    <div
      onClick={() => onOpenDetails(product)}
      className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-background/90 hover:border-primary/40 hover:bg-accent/15 transition-all cursor-pointer group shadow-sm text-left"
    >
      {product.image_url ? (
        <img
          src={product.image_url}
          alt={product.title}
          className="size-12 object-cover rounded-lg shrink-0 bg-muted border border-border/40 group-hover:scale-105 transition-transform"
        />
      ) : (
        <div className="size-12 rounded-lg bg-muted flex items-center justify-center shrink-0 border border-border/40">
          <ShoppingCart className="size-5 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
          {product.title}
        </p>
        <p className="text-[11px] text-muted-foreground truncate">{product.category || "General"}</p>
        <div className="flex items-baseline gap-2 mt-0.5">
          <span className="text-xs font-bold text-primary">
            {formatPrice(product.price_paise, product.currency)}
          </span>
          {product.mrp_paise && product.mrp_paise > product.price_paise && (
            <span className="text-[10px] text-muted-foreground line-through">
              {formatPrice(product.mrp_paise, product.currency)}
            </span>
          )}
        </div>
      </div>
      <Button
        size="sm"
        variant={added ? "secondary" : "outline"}
        className="shrink-0 text-xs h-8 gap-1 transition-all"
        onClick={handleAdd}
      >
        {added ? (
          <>
            <Check className="size-3.5 text-emerald-600" />
            <span className="text-emerald-600 font-medium">Added</span>
          </>
        ) : (
          <>
            <ShoppingCart className="size-3.5" />
            <span>Add</span>
          </>
        )}
      </Button>
    </div>
  )
}

function renderMarkdown(text: string) {
  const lines = text.split("\n")
  const result: React.ReactNode[] = []
  let listItems: string[] = []

  const flushList = () => {
    if (listItems.length > 0) {
      result.push(
        <ul key={`ul_${result.length}`} className="flex flex-col gap-1 my-2 list-none">
          {listItems.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="text-primary mt-1.5 shrink-0">•</span>
              <span dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
            </li>
          ))}
        </ul>,
      )
      listItems = []
    }
  }

  lines.forEach((line, i) => {
    if (line.startsWith("# ")) {
      flushList()
      result.push(<h3 key={i} className="font-bold text-sm mt-3 mb-1 text-foreground">{line.slice(2)}</h3>)
    } else if (line.startsWith("## ")) {
      flushList()
      result.push(<h4 key={i} className="font-semibold text-sm mt-2 mb-0.5 text-foreground">{line.slice(3)}</h4>)
    } else if (line.match(/^[-*]\s/)) {
      listItems.push(line.slice(2))
    } else if (line.match(/^\d+\.\s/)) {
      listItems.push(line.replace(/^\d+\.\s/, ""))
    } else if (line.trim() === "") {
      flushList()
      if (result.length > 0) result.push(<div key={i} className="h-1.5" />)
    } else if (line.includes("|") && line.trim().startsWith("|")) {
      flushList()
      const cells = line.split("|").filter((c) => c.trim() !== "")
      if (!line.includes("---")) {
        result.push(
          <div key={i} className={`grid text-xs py-1 ${cells.length <= 2 ? "grid-cols-2" : "grid-cols-3"}`}>
            {cells.map((cell, ci) => (
              <span
                key={ci}
                className={cn(
                  "px-2 py-1 border border-border/40",
                  i === 0 ? "font-semibold bg-muted/40" : "bg-background/60",
                )}
                dangerouslySetInnerHTML={{ __html: formatInline(cell.trim()) }}
              />
            ))}
          </div>,
        )
      }
    } else {
      flushList()
      result.push(
        <p
          key={i}
          className="text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: formatInline(line) }}
        />,
      )
    }
  })
  flushList()
  return result
}

function formatInline(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, '<code class="bg-muted rounded px-1 py-0.5 text-xs font-mono">$1</code>')
    .replace(/₹(\d[\d,]*)/g, '<span class="font-semibold text-primary">₹$1</span>')
}

export function AIMessageBubble({
  message,
  customerName,
  customerEmail,
  customerPhone,
  onOpenTrackOrder,
}: AIMessageBubbleProps) {
  const isUser = message.role === "user"
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleOpenDetails = (product: Product) => {
    setSelectedProduct(product)
    setDialogOpen(true)
  }

  return (
    <>
      <div className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
        {/* Avatar */}
        <Avatar className="size-8 shrink-0 mt-1">
          {isUser ? (
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              <User className="size-4" />
            </AvatarFallback>
          ) : (
            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-xs">
              <Sparkles className="size-4" />
            </AvatarFallback>
          )}
        </Avatar>

        {/* Content */}
        <div className={cn("flex flex-col gap-2 max-w-[85%] sm:max-w-[78%]", isUser ? "items-end" : "items-start")}>
          {/* Tool calls */}
          {!isUser && message.toolCallsExecuted && message.toolCallsExecuted.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {message.toolCallsExecuted.map((tool, i) => (
                <ToolCall key={i} name={tool} state="result" />
              ))}
            </div>
          )}

          {/* Message bubble */}
          <div
            className={cn(
              "rounded-2xl px-4 py-3 text-sm leading-relaxed",
              isUser
                ? "bg-primary text-primary-foreground rounded-tr-sm shadow-sm"
                : "bg-muted/70 text-foreground rounded-tl-sm border border-border/40",
            )}
          >
            {isUser ? (
              <p>{message.content}</p>
            ) : (
              <div className="prose prose-sm max-w-none">{renderMarkdown(message.content)}</div>
            )}
          </div>

          {/* Product cards */}
          {!isUser && message.products && message.products.length > 0 && (
            <div className="w-full flex flex-col gap-2 mt-1">
              {message.products.slice(0, 4).map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onOpenDetails={handleOpenDetails}
                />
              ))}
            </div>
          )}

          {/* Autonomous Checkout / Order Confirmation Card */}
          {!isUser && message.orderCheckout && message.orderCheckout.products.length > 0 && (
            <div className="w-full mt-2">
              <AICheckoutConfirmationCard
                products={message.orderCheckout.products}
                customerName={customerName}
                customerEmail={customerEmail}
                customerPhone={customerPhone}
                onOpenTrackOrder={onOpenTrackOrder}
              />
            </div>
          )}

          {/* Timestamp */}
          <span className="text-[10px] text-muted-foreground/60 px-1">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>

      {/* Product Details Dialog */}
      <ProductDetailsDialog
        product={selectedProduct}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  )
}
