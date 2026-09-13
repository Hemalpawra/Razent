/**
 * AIThinkingIndicator - Modern Thinking & Shimmer state for AI Assistant.
 * Used when the AI / n8n agentic workflow is executing, running tool calls, or reasoning.
 * 
 * Features:
 * - Pure monochrome styling (0 violet/purple gradients)
 * - Scanning shimmer light beam across reasoning bars
 * - Dynamic status for active tool calls & n8n workflow execution
 * - Smooth fade-in entrance
 */
import { Sparkles, Loader2, Wifi } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { isN8nAgentEnabled } from "@/lib/agent/n8nAgent"
import { cn } from "@/lib/utils"

interface AIThinkingIndicatorProps {
  activeToolCall?: string | null
  className?: string
}

const TOOL_DESCRIPTIONS: Record<string, string> = {
  search_catalog: "Searching product catalog...",
  query_store_data: "Querying store inventory & deals...",
  create_ap2_mandate: "Preparing UPI AutoPay mandate...",
  verify_mandate: "Verifying payment authorization...",
  create_order: "Assembling order details...",
  track_order: "Checking real-time delivery status...",
  log_audit_event: "Recording compliance audit trace...",
}

export function AIThinkingIndicator({
  activeToolCall,
  className,
}: AIThinkingIndicatorProps) {
  const toolText = activeToolCall
    ? TOOL_DESCRIPTIONS[activeToolCall] || "Finding the best options for you..."
    : "Thinking through your request..."

  return (
    <div
      className={cn(
        "flex gap-3 items-start w-full animate-in fade-in-0 slide-in-from-bottom-2 duration-200 ease-out",
        className
      )}
    >
      {/* Bot Avatar with subtle rotation in Brand Primary Blue */}
      <div className="size-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
        <Sparkles className="size-4 animate-spin [animation-duration:4s]" />
      </div>

      {/* Thinking Box with Shimmer Effect */}
      <div className="relative overflow-hidden rounded-2xl rounded-tl-xs border border-border/70 bg-card p-3.5 shadow-2xs max-w-[340px] sm:max-w-[400px] w-full flex flex-col gap-2.5">
        {/* Continuous Scanning Shimmer Beam */}
        <div
          className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-primary/10 to-transparent pointer-events-none z-10"
          aria-hidden="true"
        />

        {/* Header Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full size-2 bg-primary" />
            </span>
            <span className="text-xs font-semibold text-foreground tracking-tight">
              Thinking...
            </span>
          </div>
        </div>

        {/* Active Action Description */}
        <p className="text-[11px] text-muted-foreground font-medium truncate">
          {toolText}
        </p>

        {/* Shimmering Skeleton Bars */}
        <div className="flex flex-col gap-1.5 w-full pt-0.5">
          <div className="h-2 rounded-full bg-muted w-full" />
          <div className="h-2 rounded-full bg-muted/80 w-5/6" />
          <div className="h-2 rounded-full bg-muted/60 w-3/5" />
        </div>
      </div>
    </div>
  )
}
