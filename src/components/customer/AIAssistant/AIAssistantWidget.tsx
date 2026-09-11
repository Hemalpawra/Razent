/**
 * AIAssistantWidget - Floating AI chat button + slide-up panel
 * 
 * Desktop: floating button bottom-right; click opens panel in-place
 * Mobile: floating button bottom-right; click navigates to /assistant (full-screen)
 *
 * Uses shadcn/ui AI primitives throughout.
 */
import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
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
import { AIMessageBubble } from "./AIMessageBubble"
import { AIThinkingIndicator } from "./AIThinkingIndicator"
import { useAIChat, CHAT_SUGGESTIONS } from "./useAIChat"
import type { Product } from "@/lib/types/product"
import {
  Sparkles,
  X,
  Maximize2,
  ChevronDown,
  Minimize2,
} from "lucide-react"

interface AIAssistantWidgetProps {
  products?: Product[]
  conversationId?: string
}

export function AIAssistantWidget({ products = [], conversationId }: AIAssistantWidgetProps) {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState("")
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const {
    messages,
    isLoading,
    activeToolCall,
    sendMessage,
    clearChat,
    stopGeneration,
    storeName,
    customerName,
    customerEmail,
  } = useAIChat(products, conversationId)

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current && isOpen && !showScrollBtn) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading, isOpen, showScrollBtn])

  const handleToggle = () => {
    if (isMobile && !isOpen) {
      navigate("/assistant")
    } else {
      setIsOpen((prev) => !prev)
    }
  }

  const handleExpand = () => navigate("/assistant")

  const handleScroll = () => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 100)
  }

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || isLoading) return
    const text = input
    setInput("")
    await sendMessage(text)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleSuggestion = async (suggestion: string) => {
    if (isLoading) return
    await sendMessage(suggestion)
  }

  return (
    <>
      {/* Panel (desktop only - mobile goes to /assistant) */}
      {!isMobile && (
        <div
          className={cn(
            "fixed bottom-24 right-5 z-50 w-[380px] sm:w-[420px] rounded-2xl border border-border/60 bg-background shadow-2xl shadow-black/20 dark:shadow-black/50 flex flex-col overflow-hidden transition-all duration-300 ease-out",
            isOpen
              ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
              : "opacity-0 scale-95 translate-y-4 pointer-events-none",
          )}
          style={{ maxHeight: "calc(100vh - 7rem)" }}
        >
          {/* Panel header */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/70 bg-card text-card-foreground shrink-0">
            <div className="size-8 rounded-lg bg-foreground text-background flex items-center justify-center shrink-0">
              <Sparkles className="size-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight text-foreground">{storeName} Assistant</p>
              <p className="text-[11px] text-muted-foreground">Autonomous AI · Real-time catalog</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                onClick={handleExpand}
                title="Open full screen"
              >
                <Maximize2 className="size-3.5" />
              </button>
              <button
                type="button"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                onClick={() => setIsOpen(false)}
                title="Close"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Messages area */}
          <Conversation className="flex-1 min-h-0 relative bg-background">
            <ConversationContent
              ref={scrollRef}
              onScroll={handleScroll}
              className="px-3 py-3 flex flex-col gap-4"
            >
              {messages.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-6 text-center">
                  <div className="size-12 rounded-2xl bg-foreground text-background dark:bg-primary dark:text-primary-foreground flex items-center justify-center shadow-xs">
                    <Sparkles className="size-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">How can I help?</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Find products, compare prices, or track orders.
                    </p>
                  </div>
                  <SuggestionList label="Try">
                    {CHAT_SUGGESTIONS.slice(0, 4).map((s) => (
                      <Suggestion key={s} onClick={() => handleSuggestion(s)}>
                        {s}
                      </Suggestion>
                    ))}
                  </SuggestionList>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <AIMessageBubble
                      key={msg.id}
                      message={msg}
                      storeName={storeName}
                      customerName={customerName}
                      customerEmail={customerEmail}
                    />
                  ))}

                  {/* Thinking & Shimmer state during execution */}
                  {isLoading && (
                    <div className="w-full">
                      <AIThinkingIndicator activeToolCall={activeToolCall} />
                    </div>
                  )}
                </>
              )}
            </ConversationContent>
            <ConversationScrollButton visible={showScrollBtn} onClick={scrollToBottom} />
          </Conversation>

          {/* Input */}
          <div className="p-3 border-t border-border/60 bg-background shrink-0">
            {messages.length > 0 && !isLoading && (
              <div className="mb-2">
                <SuggestionList label="">
                  {CHAT_SUGGESTIONS.slice(0, 3).map((s) => (
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
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit()
                  }
                }}
                placeholder="Ask anything..."
                disabled={isLoading}
                maxHeight={100}
              />
              <PromptInputActions>
                <button
                  type="button"
                  className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors cursor-pointer"
                  onClick={handleExpand}
                >
                  Full screen
                </button>
                <PromptInputSubmit
                  isLoading={isLoading}
                  onStop={stopGeneration}
                  disabled={!input.trim() && !isLoading}
                />
              </PromptInputActions>
            </PromptInput>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        type="button"
        id="ai-assistant-fab"
        onClick={handleToggle}
        aria-label={isOpen ? "Close AI Assistant" : "Open AI Assistant"}
        className={cn(
          "fixed bottom-5 right-5 z-50 flex items-center justify-center size-13 rounded-full shadow-lg shadow-black/15 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer select-none border border-border/60",
          "bg-foreground text-background dark:bg-primary dark:text-primary-foreground",
          isOpen && !isMobile && "rotate-180",
        )}
      >
        {isOpen && !isMobile ? (
          <ChevronDown className="size-5.5" />
        ) : (
          <Sparkles className="size-5.5" />
        )}

        {/* Pulse ring animation when there are new messages */}
        {messages.length > 0 && !isOpen && (
          <span className="absolute inset-0 rounded-full animate-ping bg-foreground/20 pointer-events-none" />
        )}
      </button>
    </>
  )
}
