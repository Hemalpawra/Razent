import * as React from "react"
import { Loader2, CheckCircle2, AlertCircle, Wrench } from "lucide-react"
import { cn } from "@/lib/utils"

export type ToolCallState = "calling" | "result" | "error"

export interface ToolCallProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string
  state?: ToolCallState
  resultSummary?: string
}

export function ToolCall({
  name,
  state = "calling",
  resultSummary,
  className,
  ...props
}: ToolCallProps) {
  const getIcon = () => {
    if (state === "calling") return <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
    if (state === "error") return <AlertCircle className="w-3.5 h-3.5 text-destructive" />
    return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
  }

  const formatToolName = (raw: string) => {
    return raw
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }

  return (
    <div
      data-slot="ai-tool-call"
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all",
        state === "calling" && "bg-primary/10 border-primary/20 text-primary animate-pulse",
        state === "result" && "bg-muted/60 border-border text-muted-foreground",
        state === "error" && "bg-destructive/10 border-destructive/20 text-destructive",
        className
      )}
      {...props}
    >
      {getIcon()}
      <span>
        {formatToolName(name)}
        {state === "calling" ? "..." : ""}
      </span>
      {resultSummary && (
        <span className="text-[10px] text-muted-foreground/80 font-mono">
          ({resultSummary})
        </span>
      )}
    </div>
  )
}
