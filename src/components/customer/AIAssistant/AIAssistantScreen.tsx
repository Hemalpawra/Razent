import React, { useState, useEffect, useRef, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  Send,
  Sparkles,
  Bot,
  User,
  ShoppingBag,
  Check,
  Plus,
  Zap,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Moon,
  RotateCcw,
  Clock,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  Loader2,
  PackageCheck,
  Lock,
  CreditCard,
  AlertTriangle,
} from "lucide-react"
import { useTheme } from "@/state/useTheme"
import { useSettings } from "@/state/useSettings"
import { toast } from "sonner"
import {
  listProducts,
  executeAgentCheckout,
  logAuditEvent,
  upsertConversation,
} from "@/lib/api/client"
import {
  getStoredNPCIConfig,
  createAP2CartMandate,
  createAP2CartMandateFromItems,
  createAP2PaymentMandate,
  verifyAP2IntentMandate,
} from "@/lib/protocol/agenticCommerce"
import {
  sanitizeUserChatInput,
  getActivePaymentSelection,
  getSavedTestCards,
} from "@/lib/protocol/regulatoryWrapper"
import type { Product } from "@/lib/types/product"
import type { NPCIMandateConfig, CartMandate, PaymentMandate } from "@/lib/protocol/ap2Types"
import WalletSettingsModal from "./WalletSettingsModal"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  text: string
  products?: Product[]
  orderPlaced?: {
    orderId: string
    totalRupees: string
    mandateChainId?: string
    cartHash?: string
    protocol: string
  }
  isStreaming?: boolean
  timestamp: string
}

interface CartItem {
  id: string
  product: Product
  qty: number
}

const QUICK_PROMPTS = [
  "Find fresh milk and whole wheat bread",
  "Show organic fruits and veggies",
  "High protein snacks under ₹200",
  "Where is my last order?",
]

export const AIAssistantScreen: React.FC = () => {
  const navigate = useNavigate()
  const { mode, setMode } = useTheme()
  const { storeProfile, aiDefaults } = useSettings()

  // State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg_welcome",
      role: "assistant",
      text: `Hello! I'm Razent, your AI shopping assistant. I have live access to our grocery catalog. Ask me to find products, recommend items, or place delegated orders directly under your NPCI AutoPay spending cap.\n\n🔒 Security Notice: Please do not share any personal information, card numbers, CVV, or passwords in this chat. All payment methods and limits are securely configured in your Wallet Settings.`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [catalog, setCatalog] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false)
  const [npciConfig, setNpciConfig] = useState<NPCIMandateConfig>(getStoredNPCIConfig())
  const [convSessionId] = useState<string>(() => `conv_screen_${Date.now()}`)
  const [addedItemFeedback, setAddedItemFeedback] = useState<Record<string, boolean>>({})

  const chatEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  // Load live catalog on mount
  useEffect(() => {
    let alive = true
    listProducts()
      .then((data) => {
        if (alive && data && data.length > 0) {
          setCatalog(data.filter((p) => p.status === "active"))
        }
      })
      .catch(() => { })
    return () => {
      alive = false
    }
  }, [])

  // Update NPCI config from storage or modal callback
  const handleConfigUpdate = (newConfig: NPCIMandateConfig) => {
    setNpciConfig(newConfig)
  }

  // Cart helper calculations
  const cartTotalPaise = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.product.price_paise * item.qty, 0)
  }, [cart])

  const cartTotalCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.qty, 0)
  }, [cart])

  // Add to active cart
  const handleAddToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id)
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item,
        )
      }
      return [...prev, { id: product.id, product, qty: 1 }]
    })

    // Brief visual checkmark feedback
    setAddedItemFeedback((prev) => ({ ...prev, [product.id]: true }))
    setTimeout(() => {
      setAddedItemFeedback((prev) => ({ ...prev, [product.id]: false }))
    }, 1500)

    toast.success(`Added ${product.title} to cart`)
  }

  // 1-Click AI Purchase via Google AP2 & NPCI AutoPay
  const handle1ClickBuy = async (product: Product) => {
    if (npciConfig.mandate_status !== "active") {
      toast.warning("AutoPay mandate is paused or revoked. Please enable it in Wallet Settings.")
      setIsWalletModalOpen(true)
      return
    }

    const priceRupees = product.price_paise / 100
    if (priceRupees > npciConfig.user_delegated_limit_rupees) {
      toast.error(
        `Item price (₹${priceRupees}) exceeds your delegated cap of ₹${npciConfig.user_delegated_limit_rupees}. Please adjust in Wallet Settings.`,
      )
      setIsWalletModalOpen(true)
      return
    }

    setIsLoading(true)
    const orderId = `RAZ-${Date.now().toString(36).toUpperCase()}`

    try {
      // 1. Create AP2 Cart Mandate
      const cartMandate: CartMandate = createAP2CartMandateFromItems([
        {
          id: product.id,
          title: product.title,
          price_paise: product.price_paise,
          qty: 1,
          image_url: product.image_url,
        },
      ])

      // 2. Validate Intent Mandate
      const intentCheck = verifyAP2IntentMandate(
        {
          user_cart_confirmation_required: false,
          natural_language_description: `Order 1x ${product.title}`,
          price_cap_paise: npciConfig.user_delegated_limit_rupees * 100,
          intent_expiry: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        },
        cartMandate,
      )

      if (!intentCheck.ok) {
        throw new Error(intentCheck.reason || "AP2 Intent validation failed")
      }

      // 3. Create Payment Mandate
      const activePay = getActivePaymentSelection()
      const allCards = getSavedTestCards()
      const activeCard = allCards.find((c) => c.id === activePay.cardId)
      const paymentMethodAccount =
        activePay.type === "card" && activeCard
          ? `${activeCard.network} (${activeCard.maskedNumber})`
          : (activePay.upiVpa || npciConfig.upi_vpa)

      const paymentMandate: PaymentMandate = createAP2PaymentMandate(
        cartMandate,
        paymentMethodAccount,
      )

      // 4. Execute autonomous checkout
      const storedProfileStr = localStorage.getItem("razent_customer_profile")
      const customer = storedProfileStr
        ? JSON.parse(storedProfileStr)
        : {
          fullName: "Customer",
          email: "customer@razent.store",
          phone: "+91 98765 43210",
          addressLine: "Indiranagar 100ft Rd",
          city: "Bengaluru",
          postalCode: "560038",
        }

      const checkoutRes = await executeAgentCheckout({
        order: {
          id: orderId,
          razorpay_order_id: `rzp_order_${Date.now()}`,
          total_paise: product.price_paise,
          shipping_paise: 0,
          shipping_status: "pending",
          currency: "INR",
          status: "paid",
          items: [
            {
              product_id: product.id,
              title: product.title,
              image_url: product.image_url || "",
              qty: 1,
              unit_price_paise: product.price_paise,
            },
          ],
          shipping_address: {
            full_name: customer.fullName,
            phone: customer.phone,
            email: customer.email,
            line1: customer.addressLine,
            city: customer.city,
            state: "Karnataka",
            pincode: customer.postalCode,
            country: "India",
          },
          via_ai: true,
          commerce_protocol: "ap2",
          mandate_id: paymentMandate.mandate_chain_id,
          notes:
            activePay.type === "card" && activeCard
              ? `Charged via tokenized ${activeCard.network} ${activeCard.cardType} (${activeCard.maskedNumber})`
              : `Charged via UPI AutoPay (${activePay.upiVpa || npciConfig.upi_vpa})`,
          created_at: new Date().toISOString(),
        },
        mandate: {
          mandate_id: paymentMandate.mandate_chain_id,
          agent_name: "Razent Autonomous AI",
          delegated_limit_paise: npciConfig.user_delegated_limit_rupees * 100,
        },
        approvalThresholdRupees: npciConfig.max_recurring_limit_rupees,
      })

      // Add receipt message
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_order_${Date.now()}`,
          role: "assistant",
          text: `🎉 **Order Confirmed!** Your 1-click purchase of **${product.title}** has been autonomously placed via Google AP2 & NPCI AutoPay.`,
          orderPlaced: {
            orderId: checkoutRes.order.id,
            totalRupees: (product.price_paise / 100).toFixed(2),
            mandateChainId: paymentMandate.mandate_chain_id,
            cartHash: cartMandate.cart_hash,
            protocol: "Google AP2 (NPCI AutoPay)",
          },
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ])

      toast.success(`Order placed! Total: ₹${priceRupees}. Arriving in 10–15 mins.`)
    } catch (err: any) {
      toast.error(err.message || "Failed to execute 1-click checkout")
    } finally {
      setIsLoading(false)
    }
  }

  // Complete Order for entire Cart via in-chat AP2 checkout
  const handleCartCheckout = async () => {
    if (cart.length === 0) return
    const totalRupees = cartTotalPaise / 100

    if (npciConfig.mandate_status !== "active") {
      toast.warning("AutoPay mandate is paused or revoked. Please update Wallet Settings.")
      setIsWalletModalOpen(true)
      return
    }

    if (totalRupees > npciConfig.user_delegated_limit_rupees) {
      toast.error(
        `Cart total (₹${totalRupees}) exceeds your delegated cap of ₹${npciConfig.user_delegated_limit_rupees}. Please adjust your limit in Wallet Settings or reduce cart items.`,
      )
      setIsWalletModalOpen(true)
      return
    }

    setIsLoading(true)
    const orderId = `RAZ-${Date.now().toString(36).toUpperCase()}`

    try {
      const cartMandate: CartMandate = createAP2CartMandateFromItems(
        cart.map((item) => ({
          id: item.product.id,
          title: item.product.title,
          price_paise: item.product.price_paise,
          qty: item.qty,
          image_url: item.product.image_url,
        })),
      )

      const activePay = getActivePaymentSelection()
      const allCards = getSavedTestCards()
      const activeCard = allCards.find((c) => c.id === activePay.cardId)
      const paymentMethodAccount =
        activePay.type === "card" && activeCard
          ? `${activeCard.network} (${activeCard.maskedNumber})`
          : (activePay.upiVpa || npciConfig.upi_vpa)

      const paymentMandate = createAP2PaymentMandate(cartMandate, paymentMethodAccount)

      const storedProfileStr = localStorage.getItem("razent_customer_profile")
      const customer = storedProfileStr
        ? JSON.parse(storedProfileStr)
        : {
          fullName: "Customer",
          email: "customer@razent.store",
          phone: "+91 98765 43210",
          addressLine: "Indiranagar 100ft Rd",
          city: "Bengaluru",
          postalCode: "560038",
        }

      const checkoutRes = await executeAgentCheckout({
        order: {
          id: orderId,
          razorpay_order_id: `rzp_order_${Date.now()}`,
          total_paise: cartTotalPaise,
          shipping_paise: 0,
          shipping_status: "pending",
          currency: "INR",
          status: "paid",
          items: cart.map((item) => ({
            product_id: item.product.id,
            title: item.product.title,
            image_url: item.product.image_url || "",
            qty: item.qty,
            unit_price_paise: item.product.price_paise,
          })),
          shipping_address: {
            full_name: customer.fullName,
            phone: customer.phone,
            email: customer.email,
            line1: customer.addressLine,
            city: customer.city,
            state: "Karnataka",
            pincode: customer.postalCode,
            country: "India",
          },
          via_ai: true,
          commerce_protocol: "ap2",
          mandate_id: paymentMandate.mandate_chain_id,
          notes:
            activePay.type === "card" && activeCard
              ? `Charged via tokenized ${activeCard.network} ${activeCard.cardType} (${activeCard.maskedNumber})`
              : `Charged via UPI AutoPay (${activePay.upiVpa || npciConfig.upi_vpa})`,
          created_at: new Date().toISOString(),
        },
        mandate: {
          mandate_id: paymentMandate.mandate_chain_id,
          agent_name: "Razent Assistant In-Chat",
          delegated_limit_paise: npciConfig.user_delegated_limit_rupees * 100,
        },
        approvalThresholdRupees: npciConfig.max_recurring_limit_rupees,
      })

      setCart([]) // Clear cart after successful checkout

      setMessages((prev) => [
        ...prev,
        {
          id: `msg_order_${Date.now()}`,
          role: "assistant",
          text: `🎉 **Cart Order Placed Successfully!** Settled seamlessly via Google AP2 & NPCI UPI AutoPay (${npciConfig.upi_vpa}).`,
          orderPlaced: {
            orderId: checkoutRes.order.id,
            totalRupees: (cartTotalPaise / 100).toFixed(2),
            mandateChainId: paymentMandate.mandate_chain_id,
            cartHash: cartMandate.cart_hash,
            protocol: "Google AP2 (NPCI AutoPay)",
          },
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ])

      toast.success(`Order ${orderId} confirmed! Delivered in 10–15 mins.`)
    } catch (err: any) {
      toast.error(err.message || "Failed to complete cart checkout")
    } finally {
      setIsLoading(false)
    }
  }

  // Dynamic Catalog Search Fallback
  const generateDynamicSearch = (query: string): { text: string; products: Product[] } => {
    const q = query.toLowerCase().trim()

    // Domain Boundary Check
    const OFF_TOPIC = /\b(narendra|modi|bjp|congress|politics|election|prime minister|president|weather|homework|write code|who is|capital of)\b/i
    if (OFF_TOPIC.test(q)) {
      return {
        text: "I am Razent, your quick-commerce grocery shopping assistant. I can only help you find, compare, and order groceries from our store. What groceries would you like today?",
        products: [],
      }
    }

    const words = q.split(/\s+/).filter((w) => w.length > 2)
    const matches = catalog.filter((p) => {
      const title = p.title.toLowerCase()
      const desc = (p.description || "").toLowerCase()
      const cat = p.category.toLowerCase()
      if (title.includes(q) || desc.includes(q) || cat.includes(q)) return true
      return words.some((w) => title.includes(w) || cat.includes(w))
    })

    if (matches.length === 0) {
      return {
        text: `Sorry, we don't currently have items matching "${query}" in stock. We stock fresh fruits, vegetables, dairy & bakery, snacks, and household essentials. Can I help you find something else?`,
        products: [],
      }
    }

    return {
      text: `Found ${matches.length} matching item${matches.length > 1 ? "s" : ""} in our live catalog:`,
      products: matches.slice(0, 4),
    }
  }

  // Send message handler (Edge Function SSE stream + dynamic catalog extraction fallback)
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim()
    if (!query || isLoading) return

    setInput("")
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }

    // RBI Compliance: Scan and intercept any sensitive card credentials (PAN, CVV, OTP)
    const sanitization = sanitizeUserChatInput(query)
    if (sanitization.hasSensitiveData) {
      const userMessage: ChatMessage = {
        id: `msg_user_${Date.now()}`,
        role: "user",
        text: sanitization.sanitizedText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }
      const warningMessage: ChatMessage = {
        id: `msg_warn_${Date.now()}`,
        role: "assistant",
        text: `🛡️ ${sanitization.warningMessage}\n\n🔒 Please do not share any card numbers, CVVs, or OTPs in chat. Your payment credentials and AutoPay limits are securely configured in your Wallet Settings.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }
      setMessages((prev) => [...prev, userMessage, warningMessage])
      toast.warning("Sensitive financial data detected and redacted per RBI guidelines.")
      return
    }

    const userMessage: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      role: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }

    const assistantTempId = `msg_asst_${Date.now()}`
    const assistantMessage: ChatMessage = {
      id: assistantTempId,
      role: "assistant",
      text: "",
      isStreaming: true,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }

    const nextMessages = [...messages, userMessage, assistantMessage]
    setMessages(nextMessages)
    setIsLoading(true)

    // Persist conversation
    upsertConversation({
      external_id: convSessionId,
      customer_name: "Storefront Customer",
      last_message: query,
      status: "active",
      messages: nextMessages.map((m, idx) => ({
        id: `m_${idx + 1}`,
        role: m.role === "user" ? "customer" : "ai",
        text: m.text,
        at: new Date().toISOString(),
      })),
    }).catch(() => { })

    const anonKey =
      (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsc2poc25mdXJ4a3phd2RpbXlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2NzU4NDEsImV4cCI6MjEwMzI1MTg0MX0.0WWRzsUkp-KF_9e2Oq4gcLjToxwzQE3ht05yxrBRx_g"
    const chatUrl =
      "https://flsjhsnfurxkzawdimyi.supabase.co/functions/v1/ragent-chat?surface=store"

    let accumulatedText = ""
    let recProducts: Product[] = []

    try {
      const res = await fetch(chatUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          messages: nextMessages.slice(0, -1).map((m) => ({
            role: m.role,
            content: m.text,
          })),
          surface: "store",
        }),
      })

      if (!res.ok || !res.body) {
        throw new Error(`Edge function returned ${res.status}`)
      }

      const contentType = res.headers.get("content-type") || ""
      if (contentType.includes("application/json")) {
        const json = await res.json()
        accumulatedText = json.text || json.reply || json.message || ""
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantTempId
              ? { ...m, text: accumulatedText, isStreaming: false }
              : m,
          ),
        )
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith("data:")) continue
          const dataStr = trimmed.slice(5).trim()
          if (dataStr === "[DONE]") break

          try {
            const data = JSON.parse(dataStr)
            if (data.type === "text" && data.text) {
              accumulatedText += data.text
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantTempId
                    ? {
                      ...m,
                      text: accumulatedText,
                      products: recProducts.length > 0 ? recProducts : m.products,
                    }
                    : m,
                ),
              )
            } else if (data.type === "tool" && data.name === "add_to_cart" && data.args?.product_id) {
              const matched = catalog.find((p) => p.id === data.args.product_id)
              if (matched) handleAddToCart(matched)
            } else if (data.type === "tool-result" && data.name === "search_catalog" && data.result) {
              const items = Array.isArray(data.result)
                ? data.result
                : data.result.products || []
              if (items.length > 0) {
                const mapped = items
                  .map((it: any) => catalog.find((p) => p.id === it.id || p.id === it.external_id) || it)
                  .slice(0, 4)
                recProducts = mapped
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantTempId ? { ...m, products: mapped } : m,
                  ),
                )
              }
            }
          } catch { }
        }
      }

      // If stream didn't yield text, fall back gracefully to dynamic catalog extraction
      if (!accumulatedText.trim()) {
        const fallback = generateDynamicSearch(query)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantTempId
              ? {
                ...m,
                text: fallback.text,
                products: fallback.products,
                isStreaming: false,
              }
              : m,
          ),
        )
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantTempId ? { ...m, isStreaming: false } : m,
          ),
        )
      }
    } catch {
      // Fallback
      const fallback = generateDynamicSearch(query)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantTempId
            ? {
              ...m,
              text: fallback.text,
              products: fallback.products,
              isStreaming: false,
            }
            : m,
        ),
      )
    } finally {
      setIsLoading(false)
    }
  }

  // Clear chat
  const handleResetChat = () => {
    setMessages([
      {
        id: `msg_welcome_${Date.now()}`,
        role: "assistant",
        text: `Chat session reset. What groceries can I find or order for you today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ])
    toast.info("Conversation cleared.")
  }

  return (
    <div className="flex flex-col h-screen max-h-screen bg-background text-foreground overflow-hidden">
      {/* ── Top App Bar ────────────────────────────────────────── */}
      <header className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border bg-card/80 backdrop-blur-md z-20">
        {/* Left: Back to Store */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-muted/60 hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Store</span>
          </button>

          <div className="h-5 w-[1px] bg-border hidden sm:block" />

          {/* Identity & Status */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Bot className="w-5 h-5" />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-background animate-pulse" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-tight flex items-center gap-1.5">
                {storeProfile.storeName} AI Assistant
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary hidden md:inline-block">
                  ACP + Google AP2
                </span>
              </h1>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <span>Autonomous Grocery Agent</span>
                <span>•</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  ₹{npciConfig.user_delegated_limit_rupees.toLocaleString("en-IN")} AutoPay Cap
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Wallet & Mandate Settings Trigger */}
          <button
            type="button"
            onClick={() => setIsWalletModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-medium transition-all"
            title="Wallet & NPCI AutoPay Settings"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Wallet & Limits</span>
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={() => setMode(mode === "dark" ? "light" : "dark")}
            className="p-2 rounded-xl border border-border bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle theme"
          >
            {mode === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Reset Chat */}
          <button
            type="button"
            onClick={handleResetChat}
            className="p-2 rounded-xl border border-border bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Clear conversation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── Chat Messages Canvas ───────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* NPCI Trust & Security Notices */}
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-xl border border-border/80 bg-muted/30 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  Delegated purchasing active under <strong>NPCI UPI AutoPay</strong> guidelines. PIN-less orders allowed up to ₹{npciConfig.user_delegated_limit_rupees}.
                </span>
              </div>
              <button
                onClick={() => setIsWalletModalOpen(true)}
                className="text-primary hover:underline font-medium shrink-0 ml-2"
              >
                Configure
              </button>
            </div>

            {/* Privacy & Financial Security Banner */}
            <div className="flex items-start justify-between p-3 rounded-xl border border-blue-500/20 bg-blue-500/5 text-xs text-muted-foreground">
              <div className="flex items-start gap-2 text-muted-foreground">
                <Lock className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  <strong className="text-foreground">Security Notice:</strong> Please do <strong>not</strong> share any personal information, full card numbers, CVV, or passwords in chat. Payment credentials are encrypted in your <button onClick={() => setIsWalletModalOpen(true)} className="text-primary hover:underline font-semibold">Wallet Settings</button>.
                </span>
              </div>
            </div>
          </div>

          {/* Message List */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"
                }`}
            >
              {/* Bot Avatar */}
              {msg.role === "assistant" && (
                <div className="shrink-0 w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              {/* Message Content Container */}
              <div
                className={`max-w-[85%] sm:max-w-[75%] space-y-3 ${msg.role === "user" ? "items-end text-right" : "items-start text-left"
                  }`}
              >
                {/* Bubble */}
                <div
                  className={`inline-block px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm shadow-sm"
                      : "bg-card border border-border text-foreground rounded-tl-sm shadow-sm"
                    }`}
                >
                  {msg.text ? (
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  ) : msg.isStreaming ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                      <span>Searching live database & validating catalog...</span>
                    </div>
                  ) : null}
                </div>

                {/* Generative UI: Recommended Products Grid */}
                {msg.products && msg.products.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-left w-full">
                    {msg.products.map((prod) => (
                      <div
                        key={prod.id}
                        className="flex flex-col justify-between p-3 rounded-xl border border-border bg-card hover:border-primary/40 transition-all shadow-sm group"
                      >
                        <div className="flex gap-3">
                          {prod.image_url ? (
                            <img
                              src={prod.image_url}
                              alt={prod.title}
                              className="w-16 h-16 object-cover rounded-lg border border-border shrink-0"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                              <ShoppingBag className="w-6 h-6" />
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                              {prod.title}
                            </h4>
                            <p className="text-[11px] text-muted-foreground">
                              {prod.unit || prod.category}
                            </p>
                            <div className="mt-1 flex items-baseline gap-1.5">
                              <span className="text-sm font-bold text-foreground">
                                ₹{(prod.price_paise / 100).toFixed(2)}
                              </span>
                              {prod.mrp_paise && prod.mrp_paise > prod.price_paise && (
                                <span className="text-[10px] text-muted-foreground line-through">
                                  ₹{(prod.mrp_paise / 100).toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/60">
                          <button
                            type="button"
                            onClick={() => handleAddToCart(prod)}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg border border-border bg-muted/60 hover:bg-muted text-xs font-medium text-foreground transition-colors"
                          >
                            {addedItemFeedback[prod.id] ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                <span>Added</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add to Cart</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handle1ClickBuy(prod)}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-sm"
                            title={`Instant purchase via AP2 under ₹${npciConfig.user_delegated_limit_rupees}`}
                          >
                            <Zap className="w-3 h-3" />
                            <span>1-Click AI</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Generative UI: Order Placed Card */}
                {msg.orderPlaced && (
                  <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2.5 text-left w-full shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PackageCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        <div>
                          <p className="text-xs font-bold text-foreground">
                            Order {msg.orderPlaced.orderId} Confirmed
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Paid ₹{msg.orderPlaced.totalRupees} via {msg.orderPlaced.protocol}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        10-15 Min Delivery
                      </span>
                    </div>

                    {msg.orderPlaced.cartHash && (
                      <div className="text-[10px] font-mono text-muted-foreground bg-background/60 p-2 rounded border border-border truncate">
                        <span className="text-primary font-medium">SHA-256 Cart Hash: </span>
                        {msg.orderPlaced.cartHash}
                      </div>
                    )}
                  </div>
                )}

                {/* Timestamp */}
                <div className="text-[10px] text-muted-foreground font-mono">
                  {msg.timestamp}
                </div>
              </div>

              {/* User Avatar */}
              {msg.role === "user" && (
                <div className="shrink-0 w-8 h-8 rounded-xl bg-muted border border-border flex items-center justify-center mt-0.5 text-muted-foreground">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          <div ref={chatEndRef} />
        </div>
      </main>

      {/* ── In-Chat Pinned Cart Bar (if items in cart) ───────────── */}
      {cart.length > 0 && (
        <div className="shrink-0 px-4 sm:px-6 py-2 bg-muted/40 border-t border-border backdrop-blur-sm animate-in slide-in-from-bottom-2">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <ShoppingBag className="w-4 h-4 text-primary" />
              <span className="font-semibold text-foreground">
                {cartTotalCount} item{cartTotalCount > 1 ? "s" : ""} in cart:
              </span>
              <span className="font-bold text-primary">
                ₹{(cartTotalPaise / 100).toFixed(2)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCart([])}
                className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-1"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleCartCheckout}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50"
              >
                <Zap className="w-3 h-3" />
                <span>Order with AP2 AutoPay</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom Input Composer ──────────────────────────────── */}
      <footer className="shrink-0 px-4 sm:px-6 pb-4 pt-2 bg-background border-t border-border/60">
        <div className="max-w-3xl mx-auto space-y-2">
          {/* Quick Prompts */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => handleSendMessage(prompt)}
                className="shrink-0 px-3 py-1 rounded-full border border-border bg-card hover:border-primary/40 hover:text-primary text-muted-foreground transition-colors font-medium text-[11px]"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Composer Box */}
          <div className="relative flex items-center rounded-2xl border border-border bg-card shadow-sm focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              placeholder="Ask for anything "
              className="w-full py-3 pl-4 pr-12 text-sm bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none resize-none max-h-32"
            />

            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={!input.trim() || isLoading}
              className="absolute right-2.5 p-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 disabled:hover:bg-primary transition-all shadow-sm"
              aria-label="Send message"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Disclaimer */}
          <p className="text-[10px] text-center text-muted-foreground">
            Razent AI Assistant is still in development can make mistakes. (Do not share card details or CVV in chat)
          </p>
        </div>
      </footer>

      {/* ── Wallet & Settings Modal ────────────────────────────── */}
      <WalletSettingsModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        onUpdateConfig={handleConfigUpdate}
      />
    </div>
  )
}

export default AIAssistantScreen
