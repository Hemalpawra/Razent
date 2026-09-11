/**
 * AIAssistantPage - Full-screen AI Shopping Assistant
 * Accessible at /assistant
 * Uses shadcn/ui AI primitives: Conversation, PromptInput, SuggestionList, ToolCall
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
import { ThemeToggle } from "@/components/shared/ThemeToggle"
import { useAIChat, CHAT_SUGGESTIONS } from "./useAIChat"
import { AIMessageBubble } from "./AIMessageBubble"
import { useUser } from "@clerk/react"
import { useClerkCustomerProfile } from "@/state/useClerkCustomerProfile"
import { useSettings } from "@/state/useSettings"
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
} from "lucide-react"
import { cn } from "@/lib/utils"
import { isN8nAgentEnabled } from "@/lib/agent/n8nAgent"
import { isOpenRouterConfigured } from "@/lib/agent/chatAgent"
import { toast } from "sonner"
import { DEFAULT_TEST_UPI_METHODS, getSavedTestCards } from "@/lib/protocol/regulatoryWrapper"

export default function AIAssistantPage() {
  const navigate = useNavigate()
  const { user } = useUser()
  const { profile, updateProfile } = useClerkCustomerProfile()
  const { storeProfile } = useSettings()
  const [products, setProducts] = useState<Product[]>([])
  const [input, setInput] = useState("")
  const agentPurchaseEnabled = Boolean(profile?.metadata?.agentPurchaseEnabled)
  const [showWallet, setShowWallet] = useState(false)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const { messages, isLoading, activeToolCall, sendMessage, clearChat, stopGeneration, storeName } =
    useAIChat(products)

  // Load real-time product catalog
  useEffect(() => {
    const refreshProducts = () => import("@/lib/api/client").then(({ listProducts }) => {
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

  const handleAgentPurchaseToggle = async () => {
    if (!user) {
      navigate("/signup")
      return
    }
    const { error } = await updateProfile({
      metadata: {
        ...(profile?.metadata || {}),
        agentPurchaseEnabled: !agentPurchaseEnabled,
      },
    })
    if (error) {
      toast.error("Could not update agent purchase permission", { description: error.message })
      return
    }
    toast.success(!agentPurchaseEnabled ? "Agent purchases enabled" : "Agent purchases disabled")
  }

  const handleSuggestion = async (suggestion: string) => {
    if (isLoading) return
    await sendMessage(suggestion)
  }

  const handleClear = () => {
    clearChat()
    toast.success("Chat cleared")
  }

  const engineBadge = isN8nAgentEnabled ? (
    <Badge variant="outline" className="gap-1 text-[10px] border-emerald-500/40 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30">
      <Wifi className="w-2.5 h-2.5" /> n8n Live
    </Badge>
  ) : isOpenRouterConfigured ? (
    <Badge variant="outline" className="gap-1 text-[10px] border-violet-500/40 text-violet-600 bg-violet-50 dark:bg-violet-950/30">
      <Bot className="w-2.5 h-2.5" /> AI SDK
    </Badge>
  ) : (
    <Badge variant="outline" className="gap-1 text-[10px] border-amber-500/40 text-amber-600 bg-amber-50 dark:bg-amber-950/30">
      <WifiOff className="w-2.5 h-2.5" /> Offline
    </Badge>
  )

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="relative flex items-center gap-3 px-4 py-3 border-b border-border/60 bg-background/95 backdrop-blur-sm sticky top-0 z-20 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full shrink-0"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>

        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
          <Sparkles className="w-4 h-4 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground leading-tight truncate">
              {storeName} AI Assistant
            </p>
            {engineBadge}
          </div>
          <p className="text-[11px] text-muted-foreground truncate">
            {user
              ? `Signed in as ${profile?.full_name || user.primaryEmailAddress?.emailAddress || user.fullName || "Customer"}`
              : "Guest mode — sign in to save chats"}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full text-muted-foreground hover:text-destructive"
              onClick={handleClear}
              title="Clear chat"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={() => setShowWallet((visible) => !visible)}
            title="Test wallet"
          >
            <WalletCards className="w-4 h-4" />
          </Button>
          <Button
            variant={agentPurchaseEnabled ? "default" : "outline"}
            size="sm"
            className="text-[11px]"
            onClick={handleAgentPurchaseToggle}
          >
            Agent purchases {agentPurchaseEnabled ? "On" : "Off"}
          </Button>
        </div>
        {showWallet && (
          <div className="absolute right-4 top-14 z-40 w-72 rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-xl">
            <p className="text-xs font-semibold">Razorpay test wallet</p>
            <p className="mt-1 text-[10px] text-muted-foreground">Sandbox methods only. No real payment credentials are stored.</p>
            <div className="mt-3 space-y-2">
              {DEFAULT_TEST_UPI_METHODS.map((method) => (
                <div key={method.id} className="flex items-center justify-between rounded-md bg-muted px-2 py-1.5 text-xs">
                  <span>{method.label}</span>
                  <span className="font-mono text-[10px]">{method.vpa}</span>
                </div>
              ))}
              {getSavedTestCards().map((card) => (
                <div key={card.id} className="flex items-center justify-between rounded-md bg-muted px-2 py-1.5 text-xs">
                  <span>{card.network} {card.cardType}</span>
                  <span className="font-mono text-[10px]">{card.maskedNumber}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Chat body */}
      <Conversation className="flex-1 relative">
        <ConversationContent
          ref={scrollRef}
          onScroll={handleScroll}
          className="px-4 sm:px-6 max-w-3xl mx-auto w-full"
        >
          {messages.length === 0 ? (
            /* Welcome screen */
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 py-8">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 via-indigo-500 to-blue-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-foreground">
                  Hi{user && profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}! 👋
                </h2>
                <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
                  I'm your AI shopping assistant for {storeName}. Ask me anything — products, prices,
                  recommendations, or order tracking.
                </p>
              </div>
              {!user && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-amber-700 dark:text-amber-400 text-xs">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>
                    <button
                      className="underline underline-offset-2 font-medium hover:text-amber-900 dark:hover:text-amber-200"
                      onClick={() => navigate("/login")}
                    >
                      Sign in
                    </button>{" "}
                    to save your chat history
                  </span>
                </div>
              )}
              <div className="w-full max-w-md">
                <SuggestionList label="Try asking">
                  {CHAT_SUGGESTIONS.map((s) => (
                    <Suggestion key={s} onClick={() => handleSuggestion(s)}>
                      {s}
                    </Suggestion>
                  ))}
                </SuggestionList>
              </div>
            </div>
          ) : (
            <div className="py-4 space-y-6">
              {messages.map((msg) => (
                <AIMessageBubble key={msg.id} message={msg} storeName={storeName} />
              ))}

              {/* Live tool call indicator */}
              {isLoading && activeToolCall && (
                <div className="flex justify-start pl-11">
                  <ToolCall name={activeToolCall} state="calling" />
                </div>
              )}

              {/* Typing dots */}
              {isLoading && !activeToolCall && (
                <div className="flex gap-3 pl-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex items-center gap-1.5 px-4 py-3 rounded-2xl rounded-tl-sm bg-muted/70 border border-border/40">
                    <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" />
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
        {/* Suggestions when chat has messages */}
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
            placeholder="Ask about products, prices, or track your order..."
            disabled={isLoading}
            autoFocus
          />
          <PromptInputActions>
            <p className="text-[10px] text-muted-foreground/50 pl-2">
              {isN8nAgentEnabled ? "Powered by n8n + AI" : "Powered by AI"}
            </p>
            <PromptInputSubmit
              isLoading={isLoading}
              onStop={stopGeneration}
              disabled={!input.trim() && !isLoading}
            />
          </PromptInputActions>
        </PromptInput>
        <p className="text-center text-[10px] text-muted-foreground/50 mt-2">
          AI may make mistakes. Verify pricing before ordering.
        </p>
      </div>
    </div>
  )
}
