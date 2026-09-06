import React, { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  Bot,
  User,
  ShoppingBag,
  Sun,
  Moon,
  RotateCcw,
  Sparkles,
  Zap,
  Search,
  Scale,
  ShieldCheck,
  Lock,
} from "lucide-react"
import { useTheme } from "@/state/useTheme"
import { useSettings } from "@/state/useSettings"
import { useCart } from "@/state/useCart"
import { useChatState } from "@/state/useChatState"
import { toast } from "sonner"
import {
  listProducts,
  trackOrder,
  upsertConversation,
} from "@/lib/api/client"
import { sanitizeUserChatInput } from "@/lib/protocol/regulatoryWrapper"
import type { Product } from "@/lib/types/product"
import {
  Conversation,
  ConversationContent,
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputSubmit,
  ToolCall,
  SuggestionList,
  Suggestion,
} from "@/components/ui/ai"
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
} from "@/components/ui/message"
import { Bubble } from "@/components/ui/bubble"
import { GenerativeProductCard } from "./GenerativeProductCard"
import { ProductDetailsModal } from "./ProductDetailsModal"
import { InvoiceModal, type InvoiceData } from "../StoreHome/InvoiceModal"

const QUICK_PROMPTS = [
  "Fresh fruits and whole wheat bread",
  "Organic vegetables in stock",
  "High protein snacks under ₹200",
  "Compare Greek yogurt and curd",
  "What is in my cart?",
  "Where is my last order?",
]

export const AIAssistantScreen: React.FC = () => {
  const navigate = useNavigate()
  const { mode, setMode } = useTheme()
  const { storeProfile } = useSettings()

  // Shared Cart State
  const cartItems = useCart((s) => s.items)
  const cartCount = useCart((s) => s.getItemCount())
  const addToCart = useCart((s) => s.addToCart)
  const clearCart = useCart((s) => s.clearCart)
  const prepareCheckout = useCart((s) => s.prepareCheckout)

  // Persistent Chat State
  const {
    messages,
    toolExecution,
    isLoading,
    setToolExecution,
    setIsLoading,
    addMessage,
    updateMessage,
    resetConversation,
  } = useChatState()

  // Local State
  const [input, setInput] = useState("")
  const [catalog, setCatalog] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null)
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
  const [convSessionId] = useState<string>(() => `conv_${Date.now()}`)

  const chatEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll on new messages or loading state
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading, toolExecution])

  // Load live catalog on mount
  useEffect(() => {
    let alive = true
    listProducts()
      .then((data) => {
        if (alive && data && data.length > 0) {
          setCatalog(data.filter((p) => p.status === "active"))
        }
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  // Product Click Handler -> Opens Product Details Modal (preserves conversation)
  const handleProductClick = (product: Product) => {
    setSelectedProduct(product)
    setIsProductModalOpen(true)
  }

  // Add to Cart from Product Card or Details Modal
  const handleAddToCart = (product: Product) => {
    addToCart(product, 1)
    toast.success(`Added ${product.title} to cart`)

    // AI confirmation in conversation
    addMessage({
      id: `msg_asst_cart_${Date.now()}`,
      role: "assistant",
      text: `Added **${product.title}** to your cart. You have ${cartCount + 1} item(s) in your cart. Would you like to keep shopping or proceed to checkout?`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    })
  }

  // Buy Now Handler -> Prepares checkout, skips cart, navigates directly to Checkout
  const handleBuyNow = (product: Product) => {
    prepareCheckout(product, 1)
    toast.info(`Preparing checkout for ${product.title}...`)
    navigate("/?view=checkout")
  }

  // Assistant Query Processing
  const processAssistantQuery = async (query: string) => {
    const q = query.toLowerCase().trim()
    setToolExecution("search_catalog")

    // 1. Off-topic domain check
    const OFF_TOPIC = /\b(narendra|modi|bjp|congress|politics|election|prime minister|president|weather|homework|write code|who is|capital of)\b/i
    if (OFF_TOPIC.test(q)) {
      setToolExecution(null)
      return {
        text: `I am ${storeProfile.storeName}'s AI shopping assistant. I can only assist with product recommendations, catalog search, order tracking, and cart management. What products are you looking for today?`,
        products: [],
      }
    }

    // 2. Cart Inquiries
    if (/\b(what is in my cart|show cart|view cart|my cart|cart items)\b/i.test(q)) {
      setToolExecution("retrieve_cart")
      if (cartItems.length === 0) {
        setToolExecution(null)
        return {
          text: "Your cart is currently empty. Would you like me to recommend some fresh essentials or bestsellers?",
          products: catalog.slice(0, 3),
        }
      }
      const cartSummary = cartItems
        .map((i) => `• ${i.qty}× **${i.product.title}** (₹${(i.product.price_paise * i.qty) / 100})`)
        .join("\n")
      const totalRupees = cartItems.reduce((acc, i) => acc + i.product.price_paise * i.qty, 0) / 100
      setToolExecution(null)
      return {
        text: `Here is what is in your cart (${cartItems.length} items, Total: **₹${totalRupees}**):\n\n${cartSummary}\n\nReady to complete your order? Click below or say "checkout".`,
        products: cartItems.map((i) => i.product).slice(0, 4),
      }
    }

    // 3. Clear Cart Command
    if (/\b(clear cart|empty cart|delete cart|remove all)\b/i.test(q)) {
      clearCart()
      setToolExecution(null)
      return {
        text: "I have cleared your cart. Let me know what you'd like to find next!",
        products: [],
      }
    }

    // 4. Checkout Intent
    if (/\b(checkout|proceed to checkout|buy now|place order|pay now)\b/i.test(q)) {
      if (cartItems.length === 0) {
        setToolExecution(null)
        return {
          text: "Your cart is empty. Please add some items to your cart first before proceeding to checkout.",
          products: catalog.slice(0, 3),
        }
      }
      setToolExecution(null)
      setTimeout(() => navigate("/?view=checkout"), 500)
      return {
        text: "Taking you to the secure checkout page now to verify your phone number and delivery address...",
        products: [],
      }
    }

    // 5. Order Tracking Request
    if (/\b(track|where is my order|order status|track order)\b/i.test(q)) {
      setToolExecution("track_order")
      const orderMatch = query.match(/\b(RAZ-[A-Z0-9]+|ORD-[A-Z0-9]+)\b/i)
      if (orderMatch) {
        const orderId = orderMatch[1].toUpperCase()
        try {
          const res = await trackOrder({ orderId, mobile: "", email: "" })
          setToolExecution(null)
          if (res) {
            return {
              text: `📦 **Order ${res.id}** is currently **${res.shipping_status.toUpperCase()}**.\n• Status: ${res.status.toUpperCase()}\n• Total: ₹${res.total_paise / 100}\n• Items: ${res.items.map((i) => `${i.qty}× ${i.title}`).join(", ")}`,
              products: [],
            }
          }
        } catch {}
      }
      setToolExecution(null)
      return {
        text: "To track your order, please provide your **Order ID** (e.g. `RAZ-ABC123`), or visit the **Track Order** tab with your registered phone number and email.",
        products: [],
      }
    }

    // 6. Product Comparison
    if (/\b(compare|difference between|vs|versus)\b/i.test(q)) {
      setToolExecution("compare_products")
      const words = q.split(/\s+/).filter((w) => w.length > 2)
      const matched = catalog.filter((p) => {
        const t = p.title.toLowerCase()
        return words.some((w) => t.includes(w))
      }).slice(0, 2)

      setToolExecution(null)
      if (matched.length >= 2) {
        return {
          text: `Here is a side-by-side comparison:\n\n1. **${matched[0].title}**: ₹${matched[0].price_paise / 100} • ${matched[0].description || "Fresh quality"}\n2. **${matched[1].title}**: ₹${matched[1].price_paise / 100} • ${matched[1].description || "Fresh quality"}\n\nWhich one would you like to add to your cart?`,
          products: matched,
        }
      }
    }

    // 7. Dynamic Catalog Search
    setToolExecution("search_catalog")
    await new Promise((r) => setTimeout(r, 200))

    const words = q.split(/\s+/).filter((w) => w.length > 2)
    const matches = catalog.filter((p) => {
      const title = p.title.toLowerCase()
      const desc = (p.description || "").toLowerCase()
      const cat = p.category.toLowerCase()
      const tags = (p.tags || []).map((t) => t.toLowerCase())
      if (title.includes(q) || desc.includes(q) || cat.includes(q)) return true
      return words.some((w) => title.includes(w) || cat.includes(w) || tags.includes(w))
    })

    setToolExecution(null)

    if (matches.length === 0) {
      return {
        text: `We don't currently have items matching "${query}" in stock. Here are some popular essentials from our store:`,
        products: catalog.slice(0, 4),
      }
    }

    return {
      text: `Found ${matches.length} matching item${matches.length > 1 ? "s" : ""} in our live catalog:`,
      products: matches.slice(0, 6),
    }
  }

  // Send Message Handler
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim()
    if (!query || isLoading) return

    setInput("")

    // Security & Compliance Check
    const sanitization = sanitizeUserChatInput(query)
    if (sanitization.hasSensitiveData) {
      const userMsg = {
        id: `msg_user_${Date.now()}`,
        role: "user" as const,
        text: sanitization.sanitizedText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }
      const warnMsg = {
        id: `msg_warn_${Date.now()}`,
        role: "assistant" as const,
        text: `🛡️ ${sanitization.warningMessage}\n\n🔒 For your security, please never share card numbers, CVVs, or OTPs in chat. You will confirm your phone number with a secure OTP during the checkout step before payment.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }
      addMessage(userMsg)
      addMessage(warnMsg)
      toast.warning("Sensitive financial data intercepted and protected.")
      return
    }

    const userMsg = {
      id: `msg_user_${Date.now()}`,
      role: "user" as const,
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }

    const tempAsstId = `msg_asst_${Date.now()}`
    const placeholderAsstMsg = {
      id: tempAsstId,
      role: "assistant" as const,
      text: "",
      isStreaming: true,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }

    addMessage(userMsg)
    addMessage(placeholderAsstMsg)
    setIsLoading(true)

    // Persist conversation
    upsertConversation({
      external_id: convSessionId,
      customer_name: "Customer",
      last_message: query,
      status: "active",
      messages: [...messages, userMsg].map((m, idx) => ({
        id: `m_${idx + 1}`,
        role: m.role === "user" ? "customer" : "ai",
        text: m.text,
        at: new Date().toISOString(),
      })),
    }).catch(() => {})

    try {
      const result = await processAssistantQuery(query)

      // Token streaming typewriter simulation
      const fullText = result.text
      let currentText = ""
      const chunkWords = fullText.split(" ")

      for (let i = 0; i < chunkWords.length; i++) {
        currentText += (i === 0 ? "" : " ") + chunkWords[i]
        updateMessage(tempAsstId, {
          text: currentText,
          products: result.products,
          isStreaming: i < chunkWords.length - 1,
        })
        if (i < chunkWords.length - 1 && i % 3 === 0) {
          await new Promise((r) => setTimeout(r, 20))
        }
      }

      updateMessage(tempAsstId, {
        text: fullText,
        products: result.products,
        isStreaming: false,
      })
    } catch {
      updateMessage(tempAsstId, {
        text: "I encountered an issue searching the catalog. Please try again or browse products directly in the store.",
        isStreaming: false,
      })
    } finally {
      setIsLoading(false)
      setToolExecution(null)
    }
  }

  // Clear Chat Handler
  const handleResetChat = () => {
    resetConversation()
    toast.info("Conversation cleared.")
  }

  return (
    <div className="relative flex flex-col h-screen max-h-screen bg-background text-foreground overflow-hidden">
      {/* ── Ambient Background Glow (Inspired by Reference Images 3 & 4) ── */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-primary/15 via-emerald-500/10 to-teal-500/15 blur-3xl opacity-70 dark:opacity-40" />
      </div>

      {/* ── Top Navigation Bar ─────────────────────────────────── */}
      <header className="shrink-0 flex items-center justify-between px-4 sm:px-8 py-3.5 border-b border-border/80 bg-card/60 backdrop-blur-xl z-20">
        {/* Left: Back to Store & Brand Identity */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/80 bg-muted/60 hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-all cursor-pointer hover:shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Store</span>
            <span className="sm:hidden">Store</span>
          </button>

          <div className="h-5 w-[1px] bg-border/80" />

          {/* Assistant Identity */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-primary/20 to-teal-500/20 text-primary border border-primary/30 shadow-xs">
              <Bot className="w-4 h-4" />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-background animate-pulse" />
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-bold leading-tight flex items-center gap-1.5">
                {storeProfile.storeName} AI Assistant
              </h1>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Live Catalog</span>
                <span>•</span>
                <span>Instant Checkout</span>
              </p>
            </div>
          </div>
        </div>

        {/* Right: Cart Badge & Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/?view=cart")}
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-semibold transition-all cursor-pointer hover:scale-105 active:scale-95"
            title="View Cart"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden sm:inline">Cart</span>
            {cartCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                {cartCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setMode(mode === "dark" ? "light" : "dark")}
            className="p-2 rounded-xl border border-border/80 bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label="Toggle theme"
          >
            {mode === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={handleResetChat}
            className="p-2 rounded-xl border border-border/80 bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Clear conversation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── Vercel AI SDK Conversation Container ────────────────── */}
      <Conversation className="flex-1 overflow-hidden">
        <ConversationContent className="px-4 sm:px-8 py-6 space-y-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Empty Greeting Hero (Inspired by Images 1, 2, 4) */}
            {messages.length <= 1 && (
              <div className="text-center py-10 sm:py-14 space-y-4 animate-in fade-in zoom-in-95 duration-500">
                {/* Floating Ambient Glowing Orb */}
                <div className="relative inline-flex items-center justify-center">
                  <div className="absolute -inset-4 rounded-full bg-gradient-to-tr from-primary/30 via-emerald-400/30 to-teal-400/30 blur-xl animate-pulse" />
                  <div className="relative flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-primary via-emerald-600 to-teal-500 text-white shadow-xl">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                    How Can I <span className="bg-gradient-to-r from-primary to-teal-500 bg-clip-text text-transparent">Assist You</span> Today?
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
                    Ask anything about fresh produce, compare items, check stock, or manage your cart.
                  </p>
                </div>

                {/* Ambient Mode Action Pills */}
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary">
                    <Zap className="w-3.5 h-3.5 fill-current" /> Instant Catalog Search
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/80 border border-border text-xs font-medium text-muted-foreground">
                    <Scale className="w-3.5 h-3.5" /> Product Comparisons
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/80 border border-border text-xs font-medium text-muted-foreground">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> OTP Verified Checkout
                  </span>
                </div>
              </div>
            )}

            {/* AI Messages Stream using Vercel AI Elements */}
            {messages.map((msg) => (
              <Message
                key={msg.id}
                align={msg.role === "user" ? "end" : "start"}
              >
                {/* Avatar */}
                <MessageAvatar>
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center border text-xs ${
                      msg.role === "assistant"
                        ? "bg-primary/10 text-primary border-primary/20 shadow-xs"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {msg.role === "assistant" ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>
                </MessageAvatar>

                {/* Message Content & Bubble */}
                <MessageContent>
                  <Bubble
                    variant={msg.role === "user" ? "default" : "outline"}
                    align={msg.role === "user" ? "end" : "start"}
                    className="p-4 rounded-3xl shadow-xs"
                  >
                    <div className="whitespace-pre-line prose-sm leading-relaxed">{msg.text}</div>
                    {msg.isStreaming && (
                      <span className="inline-block w-1.5 h-4 ml-1 bg-primary animate-pulse align-middle" />
                    )}
                  </Bubble>

                  {/* Timestamp Footer */}
                  <MessageFooter className={msg.role === "user" ? "text-right" : "text-left"}>
                    {msg.timestamp}
                  </MessageFooter>

                  {/* Generative Visual Product Cards */}
                  {msg.products && msg.products.length > 0 && (
                    <div className="w-full pt-2">
                      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
                        {msg.products.map((product) => (
                          <GenerativeProductCard
                            key={product.id}
                            product={product}
                            onProductClick={handleProductClick}
                            onAddToCart={handleAddToCart}
                            onBuyNow={handleBuyNow}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </MessageContent>
              </Message>
            ))}

            {/* Active Tool Call Element */}
            {toolExecution && (
              <div className="flex items-center gap-3 pl-10">
                <ToolCall name={toolExecution} state="calling" />
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        </ConversationContent>
      </Conversation>

      {/* ── Vercel AI SDK Suggestions Strip ─────────────────────── */}
      <div className="shrink-0 px-4 sm:px-8 py-2 border-t border-border/50 bg-card/30 backdrop-blur-md">
        <div className="max-w-3xl mx-auto">
          <SuggestionList label="Suggestions">
            {QUICK_PROMPTS.map((prompt, idx) => (
              <Suggestion
                key={idx}
                onClick={() => handleSendMessage(prompt)}
                disabled={isLoading}
              >
                {prompt}
              </Suggestion>
            ))}
          </SuggestionList>
        </div>
      </div>

      {/* ── Vercel AI SDK Floating Capsule PromptInput (Inspired by Image 3 & 4) ── */}
      <footer className="shrink-0 p-4 sm:px-8 border-t border-border bg-card/80 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto">
          <PromptInput
            onSubmit={(e) => {
              e.preventDefault()
              handleSendMessage()
            }}
            className="p-2.5 rounded-3xl border-border/80 shadow-md bg-background/90"
          >
            <PromptInputTextarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              placeholder="Ask anything or request products (e.g. 'Show dairy & bakery items')..."
              className="text-sm px-3 py-1.5"
            />
            <PromptInputActions className="pt-1 border-t border-border/40">
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="hidden sm:inline">Press <kbd className="px-1 py-0.5 rounded border border-border bg-muted/60 text-[10px]">Enter ↵</kbd></span>
                <span>•</span>
                <span>Phone OTP verification before payment</span>
              </div>
              <PromptInputSubmit
                isLoading={isLoading}
                disabled={!input.trim()}
                className="p-2 rounded-xl"
              />
            </PromptInputActions>
          </PromptInput>
        </div>
      </footer>

      {/* ── Product Details Modal ──────────────────────────────── */}
      <ProductDetailsModal
        product={selectedProduct}
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false)
          setSelectedProduct(null)
        }}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
      />

      {/* ── Invoice Modal ──────────────────────────────────────── */}
      {invoiceData && (
        <InvoiceModal
          isOpen={isInvoiceModalOpen}
          onClose={() => {
            setIsInvoiceModalOpen(false)
            setInvoiceData(null)
          }}
          data={invoiceData}
        />
      )}
    </div>
  )
}

export default AIAssistantScreen
