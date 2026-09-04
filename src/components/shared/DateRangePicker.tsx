import { useState, useEffect } from "react"
import { Calendar as CalendarIcon, ChevronDown, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export type DateRangePreset =
  | "all"
  | "today"
  | "yesterday"
  | "7d"
  | "30d"
  | "custom"

export interface DateRangeValue {
  preset: DateRangePreset
  label: string
  startDate: string | null // YYYY-MM-DD
  endDate: string | null   // YYYY-MM-DD
}

interface DateRangePickerProps {
  value?: DateRangeValue
  onChange?: (val: DateRangeValue) => void
  className?: string
  align?: "start" | "center" | "end"
}

const PRESETS: { key: DateRangePreset; label: string }[] = [
  { key: "all", label: "All Time" },
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "Last 7 Days" },
  { key: "30d", label: "Last 30 Days" },
  { key: "custom", label: "Custom Range" },
]

export function computeRangeFromPreset(preset: DateRangePreset): {
  startDate: string | null
  endDate: string | null
  label: string
} {
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)

  if (preset === "all") {
    return { startDate: null, endDate: null, label: "All Time" }
  }

  if (preset === "today") {
    return { startDate: todayStr, endDate: todayStr, label: "Today" }
  }

  if (preset === "yesterday") {
    const y = new Date(now.getTime() - 86400000).toISOString().slice(0, 10)
    return { startDate: y, endDate: y, label: "Yesterday" }
  }

  if (preset === "7d") {
    const start = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10)
    return { startDate: start, endDate: todayStr, label: "Last 7 Days" }
  }

  if (preset === "30d") {
    const start = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10)
    return { startDate: start, endDate: todayStr, label: "Last 30 Days" }
  }

  return { startDate: null, endDate: null, label: "Custom Range" }
}

export function DateRangePicker({
  value,
  onChange,
  className,
  align = "end",
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [activePreset, setActivePreset] = useState<DateRangePreset>(
    value?.preset ?? "all",
  )
  const [customStart, setCustomStart] = useState<string>(
    value?.startDate ?? "",
  )
  const [customEnd, setCustomEnd] = useState<string>(
    value?.endDate ?? "",
  )

  useEffect(() => {
    if (value) {
      setActivePreset(value.preset)
      if (value.startDate) setCustomStart(value.startDate)
      if (value.endDate) setCustomEnd(value.endDate)
    }
  }, [value])

  const currentLabel =
    activePreset === "custom" && (customStart || customEnd)
      ? `${customStart || "Start"} → ${customEnd || "End"}`
      : PRESETS.find((p) => p.key === activePreset)?.label ?? "Date Range"

  const handleSelectPreset = (preset: DateRangePreset) => {
    setActivePreset(preset)
    if (preset !== "custom") {
      const computed = computeRangeFromPreset(preset)
      onChange?.({
        preset,
        label: computed.label,
        startDate: computed.startDate,
        endDate: computed.endDate,
      })
      setOpen(false)
    }
  }

  const handleApplyCustom = () => {
    if (!customStart && !customEnd) return
    const label = `${customStart || "..."} - ${customEnd || "..."}`
    onChange?.({
      preset: "custom",
      label,
      startDate: customStart || null,
      endDate: customEnd || null,
    })
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className={cn(
              "h-9 justify-between rounded-lg bg-card px-3 text-xs font-medium text-foreground hover:bg-muted/50",
              className,
            )}
          >
            <div className="flex items-center gap-2">
              <CalendarIcon className="size-3.5 text-muted-foreground" />
              <span>{currentLabel}</span>
            </div>
            <ChevronDown className="ml-2 size-3.5 opacity-60" />
          </Button>
        }
      />
      <PopoverContent
        align={align}
        className="w-72 p-3 shadow-lg rounded-xl border bg-popover"
      >
        <div className="space-y-3">
          <div className="text-xs font-semibold text-foreground px-1">
            Select Date Range
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {PRESETS.map((p) => {
              const selected = activePreset === p.key
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => handleSelectPreset(p.key)}
                  className={cn(
                    "flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs transition-colors",
                    selected
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <span>{p.label}</span>
                  {selected && <Check className="size-3" />}
                </button>
              )
            })}
          </div>

          {activePreset === "custom" && (
            <div className="border-t pt-3 space-y-2.5">
              <div className="text-[11px] font-medium text-muted-foreground">
                Custom Start & End Dates:
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-1">
                    From
                  </label>
                  <Input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="h-8 text-xs bg-card"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-1">
                    To
                  </label>
                  <Input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="h-8 text-xs bg-card"
                  />
                </div>
              </div>
              <Button
                size="sm"
                className="w-full h-8 text-xs mt-1"
                onClick={handleApplyCustom}
              >
                Apply Range
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
