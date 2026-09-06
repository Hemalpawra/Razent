import * as React from "react"
import { ArrowDown } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ConversationProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Conversation({ className, children, ...props }: ConversationProps) {
  return (
    <div
      data-slot="ai-conversation"
      className={cn("flex flex-col flex-1 h-full overflow-hidden bg-background", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export interface ConversationContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export function ConversationContent({ className, children, ...props }: ConversationContentProps) {
  return (
    <div
      data-slot="ai-conversation-content"
      className={cn("flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6 scroll-smooth", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export interface ConversationScrollButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  visible?: boolean
  onClick?: () => void
}

export function ConversationScrollButton({
  visible = false,
  className,
  onClick,
  ...props
}: ConversationScrollButtonProps) {
  if (!visible) return null

  return (
    <button
      type="button"
      data-slot="ai-conversation-scroll-button"
      onClick={onClick}
      className={cn(
        "absolute bottom-20 right-6 z-30 p-2.5 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer",
        className
      )}
      aria-label="Scroll to bottom"
      {...props}
    >
      <ArrowDown className="w-4 h-4" />
    </button>
  )
}
