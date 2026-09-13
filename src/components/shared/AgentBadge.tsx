import React from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { AgentSourceInfo } from "@/lib/utils/agentSource"

export function AgentBadge({
  source,
  size = "default",
  showDot = true,
  className,
}: {
  source: AgentSourceInfo
  size?: "sm" | "default"
  showDot?: boolean
  className?: string
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1.5 font-medium transition-colors select-none",
        size === "sm" ? "px-1.5 py-0 text-[10px] h-4.5" : "px-2 py-0.5 text-xs h-6",
        source.badgeClass,
        className
      )}
    >
      {showDot && (
        <span
          className={cn(
            "rounded-full shrink-0",
            size === "sm" ? "size-1.5" : "size-2",
            source.dotClass
          )}
        />
      )}
      <span className="truncate max-w-[160px]">{source.name}</span>
    </Badge>
  )
}
