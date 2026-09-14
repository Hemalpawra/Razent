import React from "react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface KpiCardProps {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  delta?: string
  valueIsAmount?: boolean
  tone?: "default" | "success" | "destructive"
  className?: string
}

export function KpiCard({
  icon,
  label,
  value,
  sub,
  delta,
  valueIsAmount,
  tone,
  className,
}: KpiCardProps) {
  const isPositive = delta?.startsWith("+") || delta?.startsWith("↑")
  const isNegative = delta?.startsWith("-") || delta?.startsWith("↓")

  return (
    <Card className={cn("rounded-xl bg-card p-2.5 sm:p-3 shadow-sm border transition-colors", className)}>
      <div className="flex items-center justify-between gap-1.5">
        <span className="text-xs font-medium text-muted-foreground truncate">
          {label}
        </span>
        <div className="flex size-6 sm:size-6.5 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0 [&>svg]:size-3.5">
          {icon}
        </div>
      </div>

      <div
        className={cn(
          "mt-1 font-semibold tracking-tight tabular-nums truncate",
          tone === "success"
            ? "text-emerald-600 dark:text-emerald-400"
            : tone === "destructive"
            ? "text-destructive"
            : "text-foreground",
          valueIsAmount || value.startsWith("₹")
            ? "text-lg sm:text-xl"
            : "font-heading text-lg sm:text-xl"
        )}
      >
        {value}
      </div>

      {(sub || delta) && (
        <div className="mt-0.5 flex items-center gap-1.5 text-[10px] sm:text-[11px] leading-tight text-muted-foreground truncate">
          {delta ? (
            <>
              <span
                className={cn(
                  "font-medium tabular-nums shrink-0",
                  isPositive && "text-emerald-600 dark:text-emerald-400",
                  isNegative && "text-rose-600 dark:text-rose-400",
                  !isPositive && !isNegative && "text-foreground"
                )}
              >
                {delta.includes(" vs ") ? delta.split(" vs ")[0] : delta}
              </span>
              {delta.includes(" vs ") && (
                <span className="text-muted-foreground truncate">
                  vs {delta.split(" vs ")[1]}
                </span>
              )}
            </>
          ) : (
            <span className="truncate">{sub}</span>
          )}
        </div>
      )}
    </Card>
  )
}
