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

  const { messages, isLoading, activeToolCall, sendMessage, clearChat, stopGeneration, storeName } =
    useAIChat(products, conversationId)

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
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white shrink-0">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">{storeName} Assistant</p>
              <p className="text-[11px] text-white/70">Powered by AI • Real-time catalog</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                onClick={handleExpand}
                title="Open full screen"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                onClick={() => setIsOpen(false)}
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Messages area */}
          <Conversation className="flex-1 min-h-0 relative bg-background">
            <ConversationContent
              ref={scrollRef}
              onScroll={handleScroll}
              className="px-3 py-3 space-y-4"
            >
              {messages.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                    <Sparkles className="w-7 h-7 text-white" />
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
                    <AIMessageBubble key={msg.id} message={msg} storeName={storeName} />
                  ))}

                  {isLoading && activeToolCall && (
                    <div className="flex justify-start pl-11">
                      <ToolCall name={activeToolCall} state="calling" />
                    </div>
                  )}

                  {isLoading && !activeToolCall && (
                    <div className="flex gap-2 pl-0">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="flex items-center gap-1 px-3 py-2 rounded-xl rounded-tl-sm bg-muted/70 border border-border/40">
                        <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" />
                      </div>
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
                  className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
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
          "fixed bottom-5 right-5 z-50 flex items-center justify-center w-14 h-14 rounded-full shadow-lg shadow-violet-500/40 transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer select-none",
          "bg-gradient-to-br from-violet-500 to-indigo-600 text-white",
          isOpen && !isMobile && "rotate-180",
        )}
      >
        {isOpen && !isMobile ? (
          <ChevronDown className="w-6 h-6" />
        ) : (
          <Sparkles className="w-6 h-6" />
        )}

        {/* Pulse ring animation when there are new messages */}
        {messages.length > 0 && !isOpen && (
          <span className="absolute inset-0 rounded-full animate-ping bg-violet-400/40 pointer-events-none" />
        )}
      </button>
    </>
  )
}
