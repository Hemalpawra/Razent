import * as React from "react"
import { Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SuggestionListProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string
}

export function SuggestionList({ label = "Suggestions", className, children, ...props }: SuggestionListProps) {
  return (
    <div
      data-slot="ai-suggestion-list"
      className={cn("flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none", className)}
      {...props}
    >
      {label && (
        <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap flex items-center gap-1 shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-primary" /> {label}:
        </span>
      )}
      {children}
    </div>
  )
}

export interface SuggestionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export function Suggestion({ className, children, ...props }: SuggestionProps) {
  return (
    <button
      type="button"
      data-slot="ai-suggestion"
      className={cn(
        "text-xs px-3 py-1.5 rounded-full bg-muted/60 hover:bg-muted border border-border/70 hover:border-border text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors cursor-pointer disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
