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
    if (state === "calling") return <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
    if (state === "error") return <AlertCircle className="size-3.5 text-destructive" />
    return <CheckCircle2 className="size-3.5 text-foreground" />
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
        "inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-medium transition-all select-none",
        state === "calling" && "bg-muted/70 border-border text-foreground animate-pulse",
        state === "result" && "bg-muted/50 border-border/70 text-muted-foreground",
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
