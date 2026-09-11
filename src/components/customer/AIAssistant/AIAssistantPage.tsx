/**
 * AIAssistantPage - Full-screen AI Shopping Assistant
 * Accessible at /assistant
 * Uses shadcn/ui AI primitives and design tokens
 */
import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ui/ai/conversation"
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputSubmit,
} from "@/components/ui/ai/prompt-input"
import { SuggestionList, Suggestion } from "@/components/ui/ai/suggestion"
import { ToolCall } from "@/components/ui/ai/tool-call"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/shared/ThemeToggle"
import { useAIChat, CHAT_SUGGESTIONS } from "./useAIChat"
import { AIMessageBubble } from "./AIMessageBubble"
import { useUser } from "@clerk/react"
import { useClerkCustomerProfile } from "@/state/useClerkCustomerProfile"
import { useSettings } from "@/state/useSettings"
import { useCart } from "@/state/useCart"
import { subscribeToProducts } from "@/lib/api/client"
import type { Product } from "@/lib/types/product"
import {
  ArrowLeft,
  Sparkles,
  Trash2,
  Bot,
  Wifi,
  WifiOff,
  Info,
  WalletCards,
  History,
  Plus,
  MessageSquare,
  ShoppingCart,
  Clock,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { isN8nAgentEnabled } from "@/lib/agent/n8nAgent"
import { isOpenRouterConfigured } from "@/lib/agent/chatAgent"
import { toast } from "sonner"
import { useAgentPurchase } from "@/state/useAgentPurchase"

export default function AIAssistantPage() {
  const navigate = useNavigate()
  const { user } = useUser()
  const { profile } = useClerkCustomerProfile()
  const { storeProfile } = useSettings()
  const cartCount = useCart((s) => s.getItemCount())
  const { agentPurchaseEnabled, toggle: toggleAgentPurchase } = useAgentPurchase()

  const [products, setProducts] = useState<Product[]>([])
  const [input, setInput] = useState("")
  const [historyOpen, setHistoryOpen] = useState(false)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const {
    messages,
    isLoading,
    activeToolCall,
    activeSessionId,
    conversationsHistory,
    isLoadingHistory,
    sendMessage,
    clearChat,
    startNewChat,
    loadConversation,
    stopGeneration,
    storeName,
    customerName,
    customerEmail,
  } = useAIChat(products)

  // Load real-time product catalog
  useEffect(() => {
    const refreshProducts = () =>
      import("@/lib/api/client").then(({ listProducts }) => {
        listProducts().then((list) => {
          if (list.length > 0) setProducts(list)
        })
      })
    const unsub = subscribeToProducts(refreshProducts)
    refreshProducts()
    return unsub
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current && !showScrollBtn) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading, showScrollBtn])

  const handleScroll = () => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 200)
  }

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || isLoading) return
    const text = input
    setInput("")
    await sendMessage(text)
    inputRef.current?.focus()
  }

  const handleSuggestion = async (suggestion: string) => {
    if (isLoading) return
    await sendMessage(suggestion)
  }

  const handleClear = () => {
    clearChat()
    toast.success("Chat cleared — new session started")
  }

  const engineBadge = isN8nAgentEnabled ? (
    <Badge
      variant="outline"
      className="gap-1 text-[10px] border-emerald-500/40 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
    >
      <Wifi className="size-2.5" /> n8n Live
    </Badge>
  ) : isOpenRouterConfigured ? (
    <Badge
      variant="outline"
      className="gap-1 text-[10px] border-border text-foreground bg-muted"
    >
      <Bot className="size-2.5" /> AI SDK
    </Badge>
  ) : (
    <Badge
      variant="outline"
      className="gap-1 text-[10px] border-amber-500/40 text-amber-600 bg-amber-50 dark:bg-amber-950/30"
    >
      <WifiOff className="size-2.5" /> Offline
    </Badge>
  )

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="relative flex items-center gap-2.5 px-4 py-2.5 border-b border-border/60 bg-background/95 backdrop-blur-sm sticky top-0 z-20 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="size-8 rounded-lg shrink-0"
          onClick={() => navigate("/")}
          title="Back to store"
        >
          <ArrowLeft className="size-4" />
        </Button>

        {/* Minimalist Monochrome Bot Avatar */}
        <div className="size-8 rounded-lg bg-foreground text-background dark:bg-primary dark:text-primary-foreground flex items-center justify-center shrink-0">
          <Sparkles className="size-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground leading-tight truncate">
              {storeName} Assistant
            </p>
            {engineBadge}
          </div>
          <p className="text-[11px] text-muted-foreground truncate">
            {user
              ? `Signed in as ${customerName}`
              : "Guest mode · Sign in to save chats"}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* New Chat Button */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs hidden sm:inline-flex"
            onClick={startNewChat}
            title="Start new chat"
          >
            <Plus className="size-3.5" data-icon="inline-start" />
            <span>New Chat</span>
          </Button>

          {/* Chat History Sheet Trigger */}
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg relative text-muted-foreground hover:text-foreground"
            onClick={() => setHistoryOpen(true)}
            title="Chat History"
          >
            <History className="size-4" />
            {conversationsHistory.length > 0 && (
              <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary" />
            )}
          </Button>

          {/* Cart Shortcut */}
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg relative text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/?view=checkout")}
            title="View Cart"
          >
            <ShoppingCart className="size-4" />
            {cartCount > 0 && (
              <Badge className="absolute -top-1 -right-1 size-4 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground rounded-full">
                {cartCount}
              </Badge>
            )}
          </Button>

          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg text-muted-foreground hover:text-destructive"
              onClick={handleClear}
              title="Clear current messages"
            >
              <Trash2 className="size-4" />
            </Button>
          )}

          <ThemeToggle />

          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/wallet")}
            title="Wallet & Payment Credentials"
          >
            <WalletCards className="size-4" />
          </Button>

          <Button
            variant={agentPurchaseEnabled ? "default" : "outline"}
            size="sm"
            className="text-[11px] h-8 hidden md:inline-flex"
            onClick={async () => {
              const next = await toggleAgentPurchase()
              toast(next ? "Agent purchases enabled" : "Agent purchases disabled", {
                description: next
                  ? "AI Assistant is authorized to place orders."
                  : "AI Assistant is blocked from placing orders.",
              })
            }}
            title="Toggle Agent Purchases (or manage in Wallet)"
          >
            Agent Purchases: {agentPurchaseEnabled ? "On" : "Off"}
          </Button>
        </div>
      </header>

      {/* Chat History Sheet */}
      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="left" className="w-[310px] sm:w-[360px] p-4 flex flex-col gap-3">
          <SheetHeader className="text-left gap-1">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-base font-semibold">
                Chat History
              </SheetTitle>
              <Badge variant="secondary" className="text-xs">
                {conversationsHistory.length} saved
              </Badge>
            </div>
            <SheetDescription className="text-xs text-muted-foreground">
              {user
                ? `Conversations for ${customerEmail}`
                : "Sign in to save and resume your shopping chats"}
            </SheetDescription>
          </SheetHeader>

          <Button
            type="button"
            size="sm"
            className="w-full gap-2 text-xs font-semibold"
            onClick={() => {
              startNewChat()
              setHistoryOpen(false)
              toast.success("Started new chat session")
            }}
          >
            <Plus className="size-3.5" />
            Start New Chat
          </Button>

          <Separator />

          {/* List of past conversations */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
                Loading chat history...
              </div>
            ) : conversationsHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                <MessageSquare className="size-8 text-muted-foreground/40" />
                <p className="text-xs font-medium text-foreground">No saved chats yet</p>
                <p className="text-[11px] text-muted-foreground max-w-[200px]">
                  Your previous conversation sessions will appear here automatically.
                </p>
              </div>
            ) : (
              conversationsHistory.map((conv) => {
                const isActive = (conv.id || (conv as any).external_id) === activeSessionId
                const lastMsg =
                  conv.last_message ||
                  (Array.isArray(conv.messages) && conv.messages.length > 0
                    ? conv.messages[conv.messages.length - 1].text
                    : "Shopping conversation")

                return (
                  <div
                    key={conv.id}
                    onClick={() => {
                      loadConversation(conv)
                      setHistoryOpen(false)
                      toast.success("Loaded previous conversation")
                    }}
                    className={cn(
                      "flex flex-col gap-1 p-2.5 rounded-xl border text-left cursor-pointer transition-all",
                      isActive
                        ? "border-primary bg-primary/10 shadow-xs"
                        : "border-border/60 bg-card hover:border-border hover:bg-accent/30"
                    )}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold text-foreground truncate max-w-[180px]">
                        {conv.customer_name || "Store Assistant"}
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1 shrink-0">
                        <Clock className="size-2.5" />
                        {new Date(conv.updated_at || conv.created_at).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-tight">
                      {lastMsg}
                    </p>
                    {conv.status && (
                      <div className="pt-0.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px] px-1.5 py-0 capitalize",
                            conv.status === "active" && "text-emerald-600 border-emerald-500/30",
                            conv.status === "paid" && "text-blue-600 border-blue-500/30"
                          )}
                        >
                          {conv.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Chat body */}
      <Conversation className="flex-1 relative">
        <ConversationContent
          ref={scrollRef}
          onScroll={handleScroll}
          className="px-4 sm:px-6 max-w-3xl mx-auto w-full"
        >
          {messages.length === 0 ? (
            /* Welcome screen - ChatGPT / assistant-ui style */
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 py-8">
              <div className="size-14 rounded-2xl bg-foreground text-background dark:bg-primary dark:text-primary-foreground flex items-center justify-center shadow-xs">
                <Sparkles className="size-7" />
              </div>
              <div className="text-center flex flex-col gap-1.5">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  {user && customerName ? `Hi ${customerName.split(" ")[0]}, how can I help?` : "How can I help you today?"}
                </h2>
                <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
                  I'm your AI shopping assistant for {storeName}. Discover products, check order status, or prepare instant checkout.
                </p>
              </div>

              {!user && (
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-muted/60 border border-border/60 text-muted-foreground text-xs max-w-md">
                  <Info className="size-4 shrink-0 text-foreground" />
                  <span>
                    <button
                      type="button"
                      className="underline underline-offset-2 font-medium text-foreground hover:opacity-80"
                      onClick={() => navigate("/login")}
                    >
                      Sign in
                    </button>{" "}
                    to save and access chat history across devices
                  </span>
                </div>
              )}

              <div className="w-full max-w-lg">
                <SuggestionList label="Suggestions">
                  {CHAT_SUGGESTIONS.map((s) => (
                    <Suggestion key={s} onClick={() => handleSuggestion(s)}>
                      {s}
                    </Suggestion>
                  ))}
                </SuggestionList>
              </div>
            </div>
          ) : (
            <div className="py-4 flex flex-col gap-5">
              {messages.map((msg) => (
                <AIMessageBubble
                  key={msg.id}
                  message={msg}
                  storeName={storeName}
                  customerName={customerName}
                  customerEmail={customerEmail}
                  customerPhone={profile?.phone}
                  onOpenTrackOrder={(orderId) => navigate(`/?track=${orderId}`)}
                />
              ))}

              {/* Live tool call indicator */}
              {isLoading && activeToolCall && (
                <div className="flex justify-start pl-11">
                  <ToolCall name={activeToolCall} state="calling" />
                </div>
              )}

              {/* Typing indicator */}
              {isLoading && !activeToolCall && (
                <div className="flex gap-3 pl-0 items-start">
                  <div className="size-7 rounded-full bg-foreground text-background dark:bg-primary dark:text-primary-foreground flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="size-3.5" />
                  </div>
                  <div className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl rounded-tl-xs bg-muted/60 border border-border/40">
                    <span className="size-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="size-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="size-1.5 bg-muted-foreground/60 rounded-full animate-bounce" />
                  </div>
                </div>
              )}
            </div>
          )}
        </ConversationContent>

        <ConversationScrollButton visible={showScrollBtn} onClick={scrollToBottom} />
      </Conversation>

      {/* Input area */}
      <div className="shrink-0 border-t border-border/60 bg-background/95 backdrop-blur-sm px-4 pb-4 pt-3 max-w-3xl mx-auto w-full">
        {messages.length > 0 && !isLoading && (
          <div className="mb-2">
            <SuggestionList label="">
              {CHAT_SUGGESTIONS.slice(0, 4).map((s) => (
                <Suggestion key={s} onClick={() => handleSuggestion(s)}>
                  {s}
                </Suggestion>
              ))}
            </SuggestionList>
          </div>
        )}

        <PromptInput onSubmit={handleSubmit}>
          <PromptInputTextarea
            ref={inputRef}
            id="ai-assistant-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
            placeholder="Ask about products, say 'prepare order', or track delivery..."
            disabled={isLoading}
            autoFocus
          />
          <PromptInputActions>
            <p className="text-[10px] text-muted-foreground/60 pl-2">
              {isN8nAgentEnabled ? "n8n Agentic Workflow" : "Autonomous Commerce"}
            </p>
            <PromptInputSubmit
              isLoading={isLoading}
              onStop={stopGeneration}
              disabled={!input.trim() && !isLoading}
            />
          </PromptInputActions>
        </PromptInput>
        <p className="text-center text-[10px] text-muted-foreground/60 mt-2">
          Razent AI Shopping Assistant · Autonomous Commerce with Human Verification
        </p>
      </div>
    </div>
  )
}
