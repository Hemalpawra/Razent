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
  Search,
  Plus,
  Paperclip,
  Mic,
  Send,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
} from "lucide-react"
import { useTheme } from "@/state/useTheme"
import { useSettings } from "@/state/useSettings"
import { useCart } from "@/state/useCart"
import { useChatState } from "@/state/useChatState"
import { toast } from "sonner"
import { listProducts, trackOrder, upsertConversation } from "@/lib/api/client"
import { sanitizeUserChatInput } from "@/lib/protocol/regulatoryWrapper"
import { semanticVectorEngine } from "@/lib/agent/vectorSearch"
import type { Product } from "@/lib/types/product"
import {
  Conversation,
  ConversationContent,
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
import { executeChatAgentTurn } from "@/lib/agent/chatAgent"

const QUICK_PROMPTS = [
  "Show me healthy snacks under ₹500",
  "Find protein powder",
  "Laptops for students",
  "Home decor ideas",
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
  const [topSearch, setTopSearch] = useState("")
  const [catalog, setCatalog] = useState<Product[]>([])
  const [activeRecProducts, setActiveRecProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null)
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
  const [convSessionId] = useState<string>(() => `conv_${Date.now()}`)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll on new messages or loading state
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading, toolExecution])

  // Load live catalog and index into RAG vector engine
  useEffect(() => {
    let alive = true
    listProducts()
      .then((data) => {
        if (alive && data && data.length > 0) {
          const active = data.filter((p) => p.status === "active")
          setCatalog(active)
          semanticVectorEngine.indexCatalog(active).catch(() => {})
        }
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  // Product Click Handler -> Opens Product Details Modal
  const handleProductClick = (product: Product) => {
    setSelectedProduct(product)
    setIsProductModalOpen(true)
  }

  // Add to Cart from Product Card or Details Modal
  const handleAddToCart = (product: Product) => {
    addToCart(product, 1)
    toast.success(`Added ${product.title} to cart`)

    addMessage({
      id: `msg_asst_cart_${Date.now()}`,
      role: "assistant",
      text: `✅ **Done! ${product.title}** has been added to your cart.`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    })
  }

  // Buy Now Handler -> Prepares checkout, skips cart, navigates directly to Checkout
  const handleBuyNow = (product: Product) => {
    prepareCheckout(product, 1)
    toast.info(`Preparing checkout for ${product.title}...`)
    navigate("/?view=checkout")
  }

  // Send Message Handler
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim()
    if (!query || isLoading) return

    setInput("")
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }

    // Security check for financial / private credentials
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
        text: `🛡️ ${sanitization.warningMessage}\n\n🔒 For your security, please never share card numbers, CVVs, or OTPs in chat. You will confirm your phone number with a secure OTP during checkout before payment.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      })
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
      const conversationHistory = [...messages, userMsg].map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.text,
      }))

      const result = await executeChatAgentTurn({
        messages: conversationHistory,
        catalog,
        onToolCall: (tName) => setToolExecution(tName),
      })

      if (result.products && result.products.length > 0) {
        setActiveRecProducts(result.products)
      }

      // Stream text response smoothly
      const fullText = result.text || "I'm here to help you shop! What are you looking for?"
      let currentText = ""
      const chunkWords = fullText.split(" ")

      for (let i = 0; i < chunkWords.length; i++) {
        currentText += (i === 0 ? "" : " ") + chunkWords[i]
        updateMessage(tempAsstId, {
          text: currentText,
          products: result.products.length > 0 ? result.products : undefined,
          checkoutAction: result.checkoutAction,
          isStreaming: i < chunkWords.length - 1,
        })
        if (i < chunkWords.length - 1 && i % 3 === 0) {
          await new Promise((r) => setTimeout(r, 18))
        }
      }

      updateMessage(tempAsstId, {
        text: fullText,
        products: result.products.length > 0 ? result.products : undefined,
        checkoutAction: result.checkoutAction,
        isStreaming: false,
      })
    } catch {
      updateMessage(tempAsstId, {
        text: "I encountered an issue processing your request. Please ask again.",
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
    <div className="flex flex-col h-screen max-h-screen bg-[#f8fafc] dark:bg-background text-foreground overflow-hidden font-sans">
      {/* ── Top Navigation Bar (Matching Reference Image Header) ──── */}
      <header className="shrink-0 flex items-center justify-between px-4 sm:px-8 py-3 border-b border-border/70 bg-card/90 backdrop-blur-md z-20">
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer text-left"
          >
            <span className="text-xl sm:text-2xl font-black tracking-tight text-primary">
              {storeProfile.storeName || "Razent"}
            </span>
            <span className="hidden sm:inline-block text-xs font-medium text-muted-foreground border-l border-border pl-2">
              AI Shopping Assistant
            </span>
          </button>
        </div>

        {/* Center: Top Search Capsule Input */}
        <div className="flex-1 max-w-lg mx-4 hidden md:block">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-muted-foreground/70" />
            <input
              type="text"
              value={topSearch}
              onChange={(e) => setTopSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && topSearch.trim()) {
                  handleSendMessage(topSearch)
                  setTopSearch("")
                }
              }}
              placeholder='Ask anything... e.g. "find running shoes under ₹3000"'
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-border/80 bg-muted/40 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
        </div>

        {/* Right: Cart Counter & Actions */}
        <div className="flex items-center gap-2.5">
          {/* Cart Badge with Count */}
          <button
            type="button"
            onClick={() => navigate("/?view=cart")}
            className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-muted text-foreground transition-colors cursor-pointer"
            title="View Cart"
          >
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute 1 top-1 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={() => setMode(mode === "dark" ? "light" : "dark")}
            className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label="Toggle theme"
          >
            {mode === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User Profile Avatar */}
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted/80 text-muted-foreground border border-border">
            <User className="w-4 h-4" />
          </div>
        </div>
      </header>

      {/* ── Main Chat Conversation Flow ─────────────────────────── */}
      <Conversation className="flex-1 overflow-hidden">
        <ConversationContent className="px-4 sm:px-12 py-6 space-y-6 max-w-5xl mx-auto w-full">
          {messages.map((msg, index) => (
            <div key={msg.id} className="space-y-3">
              <Message
                align={msg.role === "user" ? "end" : "start"}
                className="gap-3 items-start"
              >
                {/* Assistant Robot Avatar on Left */}
                {msg.role === "assistant" && (
                  <MessageAvatar className="size-9 pt-0">
                    <div className="w-9 h-9 rounded-full bg-blue-500/10 text-primary border border-primary/20 flex items-center justify-center shadow-xs">
                      <Bot className="w-5 h-5 text-primary" />
                    </div>
                  </MessageAvatar>
                )}

                {/* Message Bubble Content */}
                <MessageContent className={msg.role === "user" ? "items-end" : "items-start"}>
                  <Bubble
                    variant={msg.role === "user" ? "default" : "outline"}
                    align={msg.role === "user" ? "end" : "start"}
                    className={`p-3.5 sm:p-4 text-xs sm:text-sm rounded-2xl shadow-xs leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-xs"
                        : "bg-card border-border/80 text-foreground rounded-tl-xs"
                    }`}
                  >
                    <div className="whitespace-pre-line">{msg.text}</div>
                    {msg.isStreaming && (
                      <span className="inline-block w-1.5 h-3.5 ml-1 bg-primary animate-pulse align-middle" />
                    )}
                  </Bubble>

                  {/* Timestamp Footer */}
                  <MessageFooter className="text-[10px] text-muted-foreground pt-0.5">
                    {msg.timestamp}
                  </MessageFooter>

                  {/* Suggestion Pills (Shown after Welcome message) */}
                  {index === 0 && msg.role === "assistant" && (
                    <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
                      {QUICK_PROMPTS.map((prompt, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendMessage(prompt)}
                          disabled={isLoading}
                          className="text-xs px-3.5 py-1.5 rounded-full bg-card hover:bg-muted border border-border/80 text-primary hover:text-primary/90 font-medium transition-colors cursor-pointer shadow-2xs"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Checkout Action CTA Bubble */}
                  {msg.checkoutAction && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (msg.checkoutAction?.product) {
                            prepareCheckout(msg.checkoutAction.product, 1)
                          }
                          navigate("/?view=checkout")
                        }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
                      >
                        {msg.checkoutAction.title || "Go to Checkout →"}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Horizontal Scrollable Row of Compact Product Cards */}
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

                {/* User Avatar on Right */}
                {msg.role === "user" && (
                  <MessageAvatar className="size-9 pt-0">
                    <div className="w-9 h-9 rounded-full bg-muted text-muted-foreground border border-border flex items-center justify-center shadow-xs">
                      <User className="w-5 h-5" />
                    </div>
                  </MessageAvatar>
                )}
              </Message>
            </div>
          ))}

          {/* Active Tool Call Indicator */}
          {toolExecution && (
            <div className="flex items-center gap-3 pl-12">
              <ToolCall name={toolExecution} state="calling" />
            </div>
          )}

          <div ref={chatEndRef} />
        </ConversationContent>
      </Conversation>

      {/* ── Modern Bottom Prompt Input Bar (Matching Reference Image) ── */}
      <footer className="shrink-0 p-4 sm:px-12 border-t border-border/70 bg-card/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          {/* Plus Circle Button */}
          <button
            type="button"
            onClick={() => handleSendMessage("Show all product categories")}
            className="w-10 h-10 rounded-full border border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center shrink-0 transition-colors cursor-pointer"
            title="Options"
          >
            <Plus className="w-5 h-5" />
          </button>

          {/* Main Capsule Text Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSendMessage()
            }}
            className="flex-1 relative flex items-center bg-background rounded-full border border-border/80 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 px-4 py-2 transition-all shadow-2xs"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none pr-16"
            />

            {/* Right Action Icons inside input (Attachment + Mic) */}
            <div className="absolute right-3 flex items-center gap-1.5 text-muted-foreground/70">
              <button
                type="button"
                className="p-1 hover:text-foreground transition-colors cursor-pointer"
                title="Attach file"
                onClick={() => toast.info("Visual product search active.")}
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="p-1 hover:text-foreground transition-colors cursor-pointer"
                title="Voice query"
                onClick={() => toast.info("Listening for voice query...")}
              >
                <Mic className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Circular Send Button */}
          <button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center shrink-0 shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Send"
          >
            <Send className="w-4 h-4 fill-current" />
          </button>
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
