import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
} from "@/components/ui/message"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { ToolCall } from "@/components/ui/ai/tool-call"
import {
  Sparkles,
  User,
  ShoppingCart,
  Check,
  Copy,
  CheckCheck,
  RotateCw,
  Zap,
  ArrowRight,
} from "lucide-react"
import type { ChatMessage } from "./useAIChat"
import type { Product } from "@/lib/types/product"
import { formatPrice } from "@/lib/types/product"
import { useCart } from "@/state/useCart"
import { toast } from "sonner"
import { ProductDetailsDialog } from "./ProductDetailsDialog"

interface AIMessageBubbleProps {
  message: ChatMessage
  storeName?: string
  customerName?: string | null
  customerEmail?: string | null
  customerPhone?: string | null
  onOpenTrackOrder?: (orderId: string) => void
  onRetry?: () => void
}

function ProductCard({
  product,
  index = 0,
  onOpenDetails,
  onBuyNow,
}: {
  product: Product
  index?: number
  onOpenDetails: (p: Product) => void
  onBuyNow: (p: Product) => void
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

  const handleBuyNow = (e: React.MouseEvent) => {
    e.stopPropagation()
    onBuyNow(product)
  }

  return (
    <Card
      style={{
        animationDelay: `${index * 60}ms`,
        animationFillMode: "both",
      }}
      className="flex items-center gap-3 p-2.5 rounded-xl border border-border/70 bg-card hover:border-foreground/20 hover:bg-accent/10 transition-all text-left shadow-2xs group animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200"
    >
      {/* Product Image - Click opens Details */}
      <div
        onClick={() => onOpenDetails(product)}
        className="size-13 sm:size-14 rounded-lg overflow-hidden shrink-0 bg-muted border border-border/40 cursor-pointer flex items-center justify-center relative group-hover:opacity-95 transition-opacity"
      >
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.title}
            className="size-full object-cover group-hover:scale-105 transition-transform duration-200"
            loading="lazy"
          />
        ) : (
          <ShoppingCart className="size-5 text-muted-foreground" />
        )}
      </div>

      {/* Product Title & Price - Click title opens Details */}
      <div className="flex-1 min-w-0 pr-1">
        <h4
          onClick={() => onOpenDetails(product)}
          className="text-xs font-semibold text-foreground truncate cursor-pointer hover:text-primary transition-colors leading-tight"
          title={product.title}
        >
          {product.title}
        </h4>
        <div className="flex items-baseline gap-1.5 mt-1">
          <span className="text-xs font-bold text-foreground">
            {formatPrice(product.price_paise, product.currency)}
          </span>
          {product.mrp_paise && product.mrp_paise > product.price_paise && (
            <span className="text-[10px] text-muted-foreground line-through">
              {formatPrice(product.mrp_paise, product.currency)}
            </span>
          )}
        </div>
      </div>

      {/* Compact Action Buttons: Add to Cart + Buy Now */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          size="sm"
          variant={added ? "secondary" : "outline"}
          className="h-7 px-2 text-[11px] font-medium transition-all"
          onClick={handleAdd}
          title="Add to Cart"
        >
          {added ? (
            <>
              <Check className="size-3 text-emerald-600 dark:text-emerald-400 mr-1" />
              <span className="text-emerald-600 dark:text-emerald-400">Added</span>
            </>
          ) : (
            <>
              <ShoppingCart className="size-3 mr-1" />
              <span>Add</span>
            </>
          )}
        </Button>
        <Button
          size="sm"
          className="h-7 px-2.5 text-[11px] font-semibold transition-all shadow-2xs"
          onClick={handleBuyNow}
          title="Buy Now - Proceed to Checkout"
        >
          <Zap className="size-3 mr-1" />
          <span>Buy Now</span>
        </Button>
      </div>
    </Card>
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
            <li
              key={i}
              className="flex items-start gap-2 text-sm animate-text-reveal"
              style={{ animationDelay: `${Math.min(i * 30, 200)}ms` }}
            >
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
    const delayStyle = { animationDelay: `${Math.min(i * 25, 250)}ms` }

    if (line.startsWith("# ")) {
      flushList()
      result.push(
        <h3
          key={i}
          className="font-bold text-sm mt-3 mb-1 text-foreground animate-text-reveal"
          style={delayStyle}
        >
          {line.slice(2)}
        </h3>
      )
    } else if (line.startsWith("## ")) {
      flushList()
      result.push(
        <h4
          key={i}
          className="font-semibold text-sm mt-2 mb-0.5 text-foreground animate-text-reveal"
          style={delayStyle}
        >
          {line.slice(3)}
        </h4>
      )
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
          <div
            key={i}
            className={`grid text-xs py-1 animate-text-reveal ${cells.length <= 2 ? "grid-cols-2" : "grid-cols-3"}`}
            style={delayStyle}
          >
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
          className="text-sm leading-relaxed animate-text-reveal"
          style={delayStyle}
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
    .replace(/`(.+?)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">$1</code>')
    .replace(/₹(\d[\d,]*)/g, '<span class="font-semibold text-foreground">₹$1</span>')
}

export function AIMessageBubble({
  message,
  customerName,
  customerEmail,
  customerPhone,
  onOpenTrackOrder,
  onRetry,
}: AIMessageBubbleProps) {
  const navigate = useNavigate()
  const isUser = message.role === "user"
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const prepareCheckout = useCart((s) => s.prepareCheckout)

  const handleOpenDetails = (product: Product) => {
    setSelectedProduct(product)
    setDialogOpen(true)
  }

  const handleBuyNow = (product: Product) => {
    prepareCheckout(product, 1)
    toast.success(`Prepared checkout for ${product.title}`)
    navigate("/?view=checkout")
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true)
      toast.success("Copied message to clipboard")
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <>
      <Message align={isUser ? "end" : "start"} className="group w-full">
        {/* Avatar */}
        <MessageAvatar>
          <Avatar className="size-8 shrink-0">
            {isUser ? (
              <AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium border border-border/60">
                <User className="size-4" />
              </AvatarFallback>
            ) : (
              <AvatarFallback className="bg-foreground text-background dark:bg-primary dark:text-primary-foreground text-xs font-semibold shadow-xs">
                <Sparkles className="size-4" />
              </AvatarFallback>
            )}
          </Avatar>
        </MessageAvatar>

        {/* Content Column */}
        <MessageContent className={cn("max-w-[88%] sm:max-w-[80%]", isUser ? "items-end" : "items-start")}>
          {/* Tool calls */}
          {!isUser && message.toolCallsExecuted && message.toolCallsExecuted.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-1">
              {message.toolCallsExecuted.map((tool, i) => (
                <ToolCall key={i} name={tool} state="result" />
              ))}
            </div>
          )}

          {/* Bubble Surface */}
          <Bubble
            variant={isUser ? "secondary" : "outline"}
            align={isUser ? "end" : "start"}
            className={cn(
              "text-sm leading-relaxed break-words shadow-xs",
              isUser
                ? "bg-secondary text-secondary-foreground border-border/40 font-medium px-4 py-2.5 max-w-full"
                : "bg-card text-foreground border-border/70 px-4 py-3.5 max-w-full animate-in fade-in-0 slide-in-from-bottom-1 duration-200 ease-out",
            )}
          >
            <BubbleContent>
              {isUser ? (
                <p className="whitespace-pre-wrap">{message.content}</p>
              ) : (
                <div className="flex flex-col gap-1">{renderMarkdown(message.content)}</div>
              )}
            </BubbleContent>
          </Bubble>

          {/* Product cards */}
          {!isUser && message.products && message.products.length > 0 && (
            <div className="w-full flex flex-col gap-2 mt-2">
              {message.products.slice(0, 4).map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={index}
                  onOpenDetails={handleOpenDetails}
                  onBuyNow={handleBuyNow}
                />
              ))}
            </div>
          )}

          {/* Proceed to Checkout Action Banner (AP2/ACP Compliant Gated Checkout) */}
          {!isUser && (message.checkoutAction || message.orderCheckout) && (
            <div className="w-full mt-2.5 p-3 rounded-xl border border-primary/40 bg-card shadow-xs flex items-center justify-between gap-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <ShoppingCart className="size-4" />
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-xs font-semibold text-foreground truncate">
                    Ready to complete your order?
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {message.orderCheckout?.products
                      ? `${message.orderCheckout.products.length} item(s) prepared · Secure gated checkout`
                      : "Review items and address on the checkout screen"}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                className="shrink-0 text-xs font-semibold h-8 gap-1.5 shadow-2xs"
                onClick={() => navigate("/?view=checkout")}
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="size-3.5" />
              </Button>
            </div>
          )}

          {/* Action Toolbar & Footer */}
          <MessageFooter className="flex items-center gap-2 pt-0.5 text-[11px] text-muted-foreground select-none">
            <span>
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>

            {!isUser && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 text-muted-foreground hover:text-foreground rounded-md"
                  onClick={handleCopy}
                  title="Copy message"
                >
                  {copied ? (
                    <CheckCheck className="size-3.5 text-foreground" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </Button>
                {onRetry && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 text-muted-foreground hover:text-foreground rounded-md"
                    onClick={onRetry}
                    title="Regenerate response"
                  >
                    <RotateCw className="size-3.5" />
                  </Button>
                )}
              </div>
            )}
          </MessageFooter>
        </MessageContent>
      </Message>

      {/* Product Details Dialog */}
      <ProductDetailsDialog
        product={selectedProduct}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  )
}
