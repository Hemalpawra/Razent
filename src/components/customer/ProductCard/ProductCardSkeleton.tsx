import { cn } from "@/lib/utils"
import type { ProductCardSkeletonProps } from "./types"

export function ProductCardSkeleton({
  variant = "storefront",
  className,
}: ProductCardSkeletonProps) {
  if (variant === "ai-assistant") {
    return (
      <div
        data-slot="ai-product-card-skeleton"
        className={cn(
          "w-full sm:max-w-[340px] rounded-[12px] sm:rounded-[14px] border border-border/70 bg-card p-3 sm:p-3.5 shadow-xs flex flex-col justify-between animate-pulse",
          className
        )}
      >
        <div className="flex items-start gap-2.5 sm:gap-3">
          {/* Image skeleton */}
          <div className="size-[60px] sm:size-[72px] shrink-0 rounded-lg bg-muted" />

          {/* Details skeleton */}
          <div className="flex-1 flex flex-col gap-1.5 pt-0.5">
            <div className="h-2.5 w-16 rounded-md bg-muted" />
            <div className="h-3.5 w-full rounded-md bg-muted/80" />
            <div className="h-3.5 w-2/3 rounded-md bg-muted/60" />
            <div className="h-5 w-24 rounded-md bg-muted mt-1" />
          </div>
        </div>

        {/* Buttons skeleton */}
        <div className="pt-2.5 grid grid-cols-2 gap-2">
          <div className="h-[34px] sm:h-[36px] rounded-[8px] sm:rounded-[10px] bg-muted/60" />
          <div className="h-[34px] sm:h-[36px] rounded-[8px] sm:rounded-[10px] bg-muted" />
        </div>
      </div>
    )
  }

  return (
    <div
      data-slot="storefront-product-card-skeleton"
      className={cn(
        "w-full min-w-0 h-full rounded-[14px] sm:rounded-[16px] border border-border/70 bg-card p-2.5 sm:p-3.5 shadow-xs flex flex-col justify-between gap-2.5 animate-pulse",
        className
      )}
    >
      <div className="flex flex-col gap-2.5">
        {/* Image skeleton */}
        <div className="w-full h-[110px] min-[400px]:h-[125px] sm:h-[145px] rounded-[10px] sm:rounded-[12px] bg-muted" />

        {/* Text lines */}
        <div className="flex flex-col gap-2">
          <div className="h-4 w-full rounded-md bg-muted/80" />
          <div className="h-4 w-3/4 rounded-md bg-muted/60" />
          <div className="h-6 w-28 rounded-md bg-muted mt-1" />
        </div>
      </div>

      {/* Buttons skeleton */}
      <div className="pt-2 grid grid-cols-2 gap-1.5 sm:gap-2">
        <div className="h-[34px] sm:h-[38px] rounded-xl bg-muted/60" />
        <div className="h-[34px] sm:h-[38px] rounded-xl bg-muted" />
      </div>
    </div>
  )
}
