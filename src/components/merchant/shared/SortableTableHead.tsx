import React from "react"
import { TableHead } from "@/components/ui/table"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SortableTableHeadProps {
  label: React.ReactNode
  sortKey: string
  currentSortKey: string | null
  sortDirection: "asc" | "desc" | null
  onSort: (key: string) => void
  align?: "left" | "center" | "right"
  className?: string
}

export function SortableTableHead({
  label,
  sortKey,
  currentSortKey,
  sortDirection,
  onSort,
  align = "left",
  className,
}: SortableTableHeadProps) {
  const isActive = currentSortKey === sortKey

  return (
    <TableHead
      className={cn(
        "px-2.5 py-2 select-none h-10",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className
      )}
      aria-sort={
        isActive
          ? sortDirection === "asc"
            ? "ascending"
            : "descending"
          : "none"
      }
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1 font-semibold text-xs transition-colors group cursor-pointer rounded py-0.5 outline-none focus-visible:ring-1 focus-visible:ring-ring",
          isActive
            ? "text-foreground font-bold"
            : "text-muted-foreground hover:text-foreground",
          align === "right" && "ml-auto justify-end",
          align === "center" && "mx-auto justify-center"
        )}
      >
        <span>{label}</span>
        {isActive ? (
          sortDirection === "asc" ? (
            <ArrowUp className="size-3 text-primary shrink-0" />
          ) : (
            <ArrowDown className="size-3 text-primary shrink-0" />
          )
        ) : (
          <ArrowUpDown className="size-3 opacity-30 group-hover:opacity-100 transition-opacity shrink-0" />
        )}
      </button>
    </TableHead>
  )
}
