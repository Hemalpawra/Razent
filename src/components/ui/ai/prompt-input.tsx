import * as React from "react"
import { Send, Square, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export interface PromptInputProps extends React.FormHTMLAttributes<HTMLFormElement> {}

export function PromptInput({ className, children, ...props }: PromptInputProps) {
  return (
    <form
      data-slot="ai-prompt-input"
      className={cn(
        "relative flex flex-col gap-2 p-2 rounded-2xl border border-border/80 bg-background/95 backdrop-blur-md shadow-xs focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all",
        className
      )}
      {...props}
    >
      {children}
    </form>
  )
}

export interface PromptInputTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  maxHeight?: number
}

export const PromptInputTextarea = React.forwardRef<
  HTMLTextAreaElement,
  PromptInputTextareaProps
>(({ className, maxHeight = 160, value, onChange, onKeyDown, ...props }, ref) => {
  const internalRef = React.useRef<HTMLTextAreaElement | null>(null)

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const target = e.target
    target.style.height = "auto"
    target.style.height = `${Math.min(target.scrollHeight, maxHeight)}px`
    onChange?.(e)
  }

  return (
    <textarea
      ref={(el) => {
        internalRef.current = el
        if (typeof ref === "function") ref(el)
        else if (ref) ref.current = el
      }}
      data-slot="ai-prompt-input-textarea"
      rows={1}
      value={value}
      onChange={handleInput}
      onKeyDown={onKeyDown}
      className={cn(
        "w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 resize-none px-3 py-1.5 focus:outline-none scrollbar-none",
        className
      )}
      {...props}
    />
  )
})
PromptInputTextarea.displayName = "PromptInputTextarea"

export interface PromptInputActionsProps extends React.HTMLAttributes<HTMLDivElement> {}

export function PromptInputActions({ className, children, ...props }: PromptInputActionsProps) {
  return (
    <div
      data-slot="ai-prompt-input-actions"
      className={cn("flex items-center justify-between gap-2 px-1 pt-1", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export interface PromptInputSubmitProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean
  onStop?: () => void
}

export function PromptInputSubmit({
  isLoading = false,
  onStop,
  disabled,
  className,
  ...props
}: PromptInputSubmitProps) {
  if (isLoading && onStop) {
    return (
      <button
        type="button"
        data-slot="ai-prompt-input-stop"
        onClick={onStop}
        className={cn(
          "p-2 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all cursor-pointer shadow-xs",
          className
        )}
        title="Stop generating"
      >
        <Square className="w-4 h-4 fill-current" />
      </button>
    )
  }

  return (
    <button
      type="submit"
      data-slot="ai-prompt-input-submit"
      disabled={disabled || isLoading}
      className={cn(
        "p-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs",
        className
      )}
      title="Send message"
      {...props}
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
    </button>
  )
}
