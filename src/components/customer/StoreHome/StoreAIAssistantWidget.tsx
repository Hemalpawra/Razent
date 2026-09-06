import React, { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import {
  Sparkles,
  Bot,
  User,
  X,
  Maximize2,
  Minimize2,
  Sun,
  Moon,
  RotateCcw,
  ShoppingBag,
  Zap,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
} from "lucide-react"
import { useTheme } from "@/state/useTheme"
import { useSettings } from "@/state/useSettings"
import { useCart } from "@/state/useCart"
import { useChatState } from "@/state/useChatState"
import { toast } from "sonner"
import { listProducts, trackOrder, upsertConversation } from "@/lib/api/client"
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
import { GenerativeProductCard } from "../AIAssistant/GenerativeProductCard"
import { ProductDetailsModal } from "../AIAssistant/ProductDetailsModal"

const POPUP_SUGGESTIONS = [
  "Fresh fruits under ₹150",
  "High protein snacks",
  "What is in my cart?",
  "Where is my order?",
]

export const StoreAIAssistantWidget: React.FC = () => {
  const navigate = useNavigate()
  const { mode, setMode } = useTheme()
  const { storeProfile } = useSettings()

  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [input, setInput] = useState("")
  const [catalog, setCatalog] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [convSessionId] = useState<string>(() => `widget_conv_${Date.now()}`)

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

  const chatEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll on new messages
  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isLoading, isOpen, toolExecution])

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

  // Open handler (on mobile, direct to full /assistant screen)
  const handleToggleOpen = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      navigate("/assistant")
      return
    }
    setIsOpen((prev) => !prev)
  }

  // Add to cart from widget
  const handleAddToCart = (product: Product) => {
    addToCart(product, 1)
    toast.success(`Added ${product.title} to cart`)
    addMessage({
      id: `msg_widget_cart_${Date.now()}`,
      role: "assistant",
      text: `Added **${product.title}** to your cart. Total items: ${cartCount + 1}.`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    })
  }

  // Buy now from widget
  const handleBuyNow = (product: Product) => {
    prepareCheckout(product, 1)
    setIsOpen(false)
    navigate("/?view=checkout")
  }

  // Product click -> open modal
  const handleProductClick = (product: Product) => {
    setSelectedProduct(product)
    setIsProductModalOpen(true)
  }

  // Natural language query handler
  const processQuery = async (query: string) => {
    const q = query.toLowerCase().trim()
    setToolExecution("search_catalog")

    // Domain check
    const OFF_TOPIC = /\b(narendra|modi|bjp|congress|politics|election|prime minister|president|weather|homework|write code|who is|capital of)\b/i
    if (OFF_TOPIC.test(q)) {
      setToolExecution(null)
      return {
        text: `I am ${storeProfile.storeName}'s shopping assistant. What grocery products can I help you find today?`,
        products: [],
      }
    }

    // Cart commands
    if (/\b(cart|my cart|show cart|what is in my cart)\b/i.test(q)) {
      setToolExecution("retrieve_cart")
      if (cartItems.length === 0) {
        setToolExecution(null)
        return {
          text: "Your cart is empty. Would you like me to find some popular essentials?",
          products: catalog.slice(0, 3),
        }
      }
      const cartSummary = cartItems
        .map((i) => `• ${i.qty}× **${i.product.title}** (₹${(i.product.price_paise * i.qty) / 100})`)
        .join("\n")
      const totalRupees = cartItems.reduce((acc, i) => acc + i.product.price_paise * i.qty, 0) / 100
      setToolExecution(null)
      return {
        text: `You have ${cartItems.length} items in your cart (Total: **₹${totalRupees}**):\n\n${cartSummary}`,
        products: cartItems.map((i) => i.product).slice(0, 4),
      }
    }

    // Checkout intent
    if (/\b(checkout|place order|buy now)\b/i.test(q)) {
      setToolExecution(null)
      if (cartItems.length === 0) {
        return {
          text: "Please add some items to your cart first.",
          products: catalog.slice(0, 3),
        }
      }
      setTimeout(() => {
        setIsOpen(false)
        navigate("/?view=checkout")
      }, 400)
      return {
        text: "Taking you to checkout...",
        products: [],
      }
    }

    // Order tracking
    if (/\b(track|where is my order|order status)\b/i.test(q)) {
      setToolExecution("track_order")
      const orderMatch = query.match(/\b(RAZ-[A-Z0-9]+|ORD-[A-Z0-9]+)\b/i)
      if (orderMatch) {
        const res = await trackOrder({ orderId: orderMatch[1].toUpperCase(), mobile: "", email: "" })
        setToolExecution(null)
        if (res) {
          return {
            text: `📦 **Order ${res.id}** is **${res.shipping_status.toUpperCase()}**.\nStatus: ${res.status.toUpperCase()} • Total: ₹${res.total_paise / 100}`,
            products: [],
          }
        }
      }
      setToolExecution(null)
      return {
        text: "Please provide your Order ID (e.g. `RAZ-XXXX`) to track status.",
        products: [],
      }
    }

    // Dynamic catalog search
    setToolExecution("search_catalog")
    await new Promise((r) => setTimeout(r, 200))
    const words = q.split(/\s+/).filter((w) => w.length > 2)
    const matches = catalog.filter((p) => {
      const title = p.title.toLowerCase()
      const desc = (p.description || "").toLowerCase()
      const cat = p.category.toLowerCase()
      if (title.includes(q) || desc.includes(q) || cat.includes(q)) return true
      return words.some((w) => title.includes(w) || cat.includes(w))
    })

    setToolExecution(null)

    if (matches.length === 0) {
      return {
        text: `No exact matches for "${query}". Here are some popular products:`,
        products: catalog.slice(0, 4),
      }
    }

    return {
      text: `Found ${matches.length} matching item${matches.length > 1 ? "s" : ""}:`,
      products: matches.slice(0, 4),
    }
  }

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim()
    if (!query || isLoading) return

    setInput("")
    const sanitization = sanitizeUserChatInput(query)
    if (sanitization.hasSensitiveData) {
      addMessage({
        id: `msg_user_${Date.now()}`,
        role: "user",
        text: sanitization.sanitizedText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      })
      addMessage({
        id: `msg_warn_${Date.now()}`,
        role: "assistant",
        text: "🛡️ For your security, never share card details, PIN, or OTP in chat. Verified OTP is entered securely during checkout.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      })
      return
    }

    const userMsg = {
      id: `msg_user_${Date.now()}`,
      role: "user" as const,
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }

    const tempId = `msg_asst_${Date.now()}`
    const placeholderMsg = {
      id: tempId,
      role: "assistant" as const,
      text: "",
      isStreaming: true,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }

    addMessage(userMsg)
    addMessage(placeholderMsg)
    setIsLoading(true)

    try {
      const result = await processQuery(query)
      const fullText = result.text
      let currentText = ""
      const chunkWords = fullText.split(" ")

      for (let i = 0; i < chunkWords.length; i++) {
        currentText += (i === 0 ? "" : " ") + chunkWords[i]
        updateMessage(tempId, {
          text: currentText,
          products: result.products,
          isStreaming: i < chunkWords.length - 1,
        })
        if (i < chunkWords.length - 1 && i % 3 === 0) {
          await new Promise((r) => setTimeout(r, 20))
        }
      }

      updateMessage(tempId, {
        text: fullText,
        products: result.products,
        isStreaming: false,
      })
    } catch {
      updateMessage(tempId, {
        text: "Sorry, I had trouble searching the catalog. Please try again.",
        isStreaming: false,
      })
    } finally {
      setIsLoading(false)
      setToolExecution(null)
    }
  }

  return (
    <>
      {/* ── Floating Pop-Up Trigger Pill (Bottom-Right) ──────────── */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-40 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <button
            type="button"
            onClick={handleToggleOpen}
            className="group relative flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-primary via-emerald-600 to-teal-600 text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer border border-white/20 backdrop-blur-md"
            title="Open AI Shopping Assistant"
          >
            {/* Ambient Pulse Glow */}
            <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-primary to-teal-500 opacity-40 blur-md group-hover:opacity-75 animate-pulse transition-opacity -z-10" />

            <div className="relative flex items-center justify-center w-7 h-7 rounded-full bg-white/20 text-white shadow-inner">
              <Bot className="w-4 h-4" />
              <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-white animate-ping" />
            </div>

            <span className="text-xs sm:text-sm font-semibold tracking-tight">
              Ask Razent AI
            </span>

            <Sparkles className="w-4 h-4 text-emerald-200 animate-spin-slow" />
          </button>
        </div>
      )}

      {/* ── Floating AI Assistant Pop-Up Modal ──────────────────── */}
      {isOpen && (
        <div
          className={`fixed z-50 flex flex-col border border-border/80 bg-background/95 backdrop-blur-xl shadow-2xl transition-all duration-300 ease-out overflow-hidden ${
            isExpanded
              ? "inset-4 sm:inset-10 rounded-3xl"
              : "bottom-6 right-6 w-[92vw] sm:w-[420px] h-[600px] max-h-[85vh] rounded-3xl"
          }`}
        >
          {/* Pop-Up Header */}
          <header className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border/80 bg-card/60 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <div className="relative flex items-center justify-center w-7 h-7 rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Bot className="w-4 h-4" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-background animate-pulse" />
              </div>
              <div>
                <h3 className="text-xs font-bold leading-none flex items-center gap-1.5">
                  {storeProfile.storeName} AI Assistant
                </h3>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  Live Catalog · Fast Checkout
                </span>
              </div>
            </div>

            {/* Header Controls */}
            <div className="flex items-center gap-1">
              {/* Theme Toggle */}
              <button
                type="button"
                onClick={() => setMode(mode === "dark" ? "light" : "dark")}
                className="p-1.5 rounded-lg border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Toggle theme"
              >
                {mode === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </button>

              {/* Reset Conversation */}
              <button
                type="button"
                onClick={() => {
                  resetConversation()
                  toast.info("Conversation cleared.")
                }}
                className="p-1.5 rounded-lg border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Clear chat"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              {/* Expand / Minimize Toggle */}
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="p-1.5 rounded-lg border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer hidden sm:flex"
                title={isExpanded ? "Collapse" : "Expand to Full Screen"}
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>

              {/* Full Page Route Trigger */}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false)
                  navigate("/assistant")
                }}
                className="p-1.5 rounded-lg border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Open Dedicated Full Page"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </header>

          {/* Pop-Up Conversation Body */}
          <Conversation className="flex-1 overflow-hidden">
            <ConversationContent className="p-4 space-y-4">
              {/* Empty Greeting Hero */}
              {messages.length <= 1 && (
                <div className="text-center py-6 px-2 space-y-2">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary/20 via-emerald-500/20 to-teal-500/20 border border-primary/20 shadow-inner">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-foreground">
                    How Can I Assist You Today?
                  </h4>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    Ask about fresh groceries, compare items, check stock, or manage your cart.
                  </p>
                </div>
              )}

              {/* Message List */}
              {messages.map((msg) => (
                <Message
                  key={msg.id}
                  align={msg.role === "user" ? "end" : "start"}
                  className="gap-2"
                >
                  <MessageAvatar className="size-6 pt-0">
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] border ${
                        msg.role === "assistant"
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {msg.role === "assistant" ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                    </div>
                  </MessageAvatar>

                  <MessageContent>
                    <Bubble
                      variant={msg.role === "user" ? "default" : "outline"}
                      align={msg.role === "user" ? "end" : "start"}
                      className="p-3 text-xs sm:text-sm rounded-2xl"
                    >
                      <div className="whitespace-pre-line prose-xs">{msg.text}</div>
                      {msg.isStreaming && (
                        <span className="inline-block w-1.5 h-3.5 ml-1 bg-primary animate-pulse align-middle" />
                      )}
                    </Bubble>

                    {/* Product Cards in Pop-up */}
                    {msg.products && msg.products.length > 0 && (
                      <div className="w-full pt-1">
                        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
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

                    <MessageFooter className="text-[10px] text-muted-foreground">
                      {msg.timestamp}
                    </MessageFooter>
                  </MessageContent>
                </Message>
              ))}

              {/* Tool Execution Pill */}
              {toolExecution && (
                <div className="flex items-center gap-2 pl-8">
                  <ToolCall name={toolExecution} state="calling" />
                </div>
              )}

              <div ref={chatEndRef} />
            </ConversationContent>
          </Conversation>

          {/* Quick Suggestions Strip */}
          <div className="shrink-0 px-3 py-1.5 border-t border-border/50 bg-card/30">
            <SuggestionList label="Try">
              {POPUP_SUGGESTIONS.map((prompt, idx) => (
                <Suggestion
                  key={idx}
                  onClick={() => handleSendMessage(prompt)}
                  disabled={isLoading}
                  className="text-[11px] py-1 px-2.5"
                >
                  {prompt}
                </Suggestion>
              ))}
            </SuggestionList>
          </div>

          {/* Pop-Up Prompt Input Footer */}
          <footer className="shrink-0 p-3 border-t border-border bg-card/80 backdrop-blur-md">
            <PromptInput
              onSubmit={(e) => {
                e.preventDefault()
                handleSendMessage()
              }}
              className="p-1.5 rounded-2xl"
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
                placeholder="Ask about groceries or products..."
                className="text-xs py-1 px-2"
              />
              <PromptInputActions className="pt-0.5">
                <span className="text-[10px] text-muted-foreground">
                  OTP verified at checkout
                </span>
                <PromptInputSubmit
                  isLoading={isLoading}
                  disabled={!input.trim()}
                  className="p-1.5 rounded-lg"
                />
              </PromptInputActions>
            </PromptInput>
          </footer>
        </div>
      )}

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
    </>
  )
}

export default StoreAIAssistantWidget
